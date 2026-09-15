# CleverNasUtility

TrueNAS utility for safe, append-only folder migrations. It runs `rsync -a --partial --append-verify --ignore-existing --stats`, never deletes source data and never overwrites existing destination files. The web UI starts copies and shows history; rerunning the same pair resumes missing items.

Run with `/mnt` bind-mounted read-write and `/data` persistent. Restrict network access to trusted users before exposing it.
