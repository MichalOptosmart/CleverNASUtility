import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
const PORT=Number(process.env.PORT||8787), HOST=process.env.HOST||'0.0.0.0', DATA=process.env.DATA_DIR||'/data';
const historyFile=join(DATA,'history.json'); let jobs=new Map();
await mkdir(DATA,{recursive:true});
async function history(){try{return JSON.parse(await readFile(historyFile,'utf8'))}catch{return[]}}
async function save(h){await writeFile(historyFile,JSON.stringify(h,null,2))}
function safe(p){const x=resolve(p); if(!x.startsWith('/mnt/')) throw Error('Paths must be under /mnt'); return x}
function json(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*'});res.end(JSON.stringify(body))}
async function body(req){let s='';for await(const c of req)s+=c;return s?JSON.parse(s):{}}
async function runCopy(id,source,target){const started=new Date().toISOString();const args=['-a','--partial','--append-verify','--ignore-existing','--stats',source.endsWith('/')?source:source+'/',target.endsWith('/')?target:target+'/'];const p=spawn('rsync',args);let out='';p.stdout.on('data',d=>{out+=d});p.stderr.on('data',d=>{out+=d});p.on('close',async code=>{const h=await history();const j=h.find(x=>x.id===id);Object.assign(j,{status:code===0?'completed':'failed',finished:new Date().toISOString(),exitCode:code,output:out.slice(-20000)});await save(h);jobs.delete(id)});}
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost'); if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type'});return res.end()}
if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{status:'ok'});
if(req.method==='GET'&&u.pathname==='/api/history')return json(res,200,await history());
if(req.method==='POST'&&u.pathname==='/api/copy'){const x=await body(req),source=safe(x.source),target=safe(x.target);if(!existsSync(source))return json(res,400,{error:'source does not exist'});if(source===target||target.startsWith(source+'/'))return json(res,400,{error:'target must not be inside source'});const id=crypto.randomUUID();const h=await history();h.unshift({id,source,target,status:'running',started:new Date().toISOString(),options:'append-only'});await save(h);jobs.set(id,{source,target});runCopy(id,source,target);return json(res,202,{id})}
if(req.method==='GET'&&u.pathname.startsWith('/api/copy/')){const id=u.pathname.split('/').pop();const h=await history();const j=h.find(x=>x.id===id);return j?json(res,200,j):json(res,404,{error:'not found'})}
if(req.method==='GET'){let f=u.pathname==='/'?'/index.html':u.pathname;try{const data=await readFile(join(process.cwd(),'public',f));res.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'text/plain'});return res.end(data)}catch{} }
json(res,404,{error:'not found'});}catch(e){json(res,400,{error:e.message})}});server.listen(PORT,HOST,()=>console.log(`CleverNasUtility listening on ${HOST}:${PORT}`));
