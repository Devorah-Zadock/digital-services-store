#!/usr/bin/env python3
"""DeskKit backups, used only by .github/workflows/backup.yml.

Encrypted copies of the whole database and of every Storage file
(site-images, logos) go to a private Cloudflare R2 bucket; a separate job
restores the latest copy into a throwaway local database and checks it.

This repository is public, so this script prints counts and statuses
only — never emails, names, file paths, row contents or secrets.
Every query against the live database runs read-only.

  backup_tool.py check                       secrets present, R2 reachable
  backup_tool.py counts <out.json>           live row counts (read-only)
  backup_tool.py db-upload <dir>             encrypt + upload dump files
  backup_tool.py db-prune                    keep 14 daily + 6 monthly
  backup_tool.py files-backup                copy new/changed Storage files
  backup_tool.py db-download-latest <dir>    download + decrypt newest dump
  backup_tool.py restore <dir> <db-url>      load the dump into <db-url>
  backup_tool.py restore-compare <dir> <db-url>
  backup_tool.py files-verify                every file present, sample opens
  backup_tool.py alert <message>             email the owner (Resend)
"""
import datetime
import hashlib
import json
import os
import random
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request

PROJECT_REF = os.environ.get("PROJECT_REF", "")
SUPABASE_URL = f"https://{PROJECT_REF}.supabase.co"
STORAGE_BUCKETS = ["site-images", "logos"]
DUMP_FILES = ["roles.sql", "schema.sql", "data.sql", "counts.json"]
KEEP_DAILY = 14
KEEP_MONTHLY = 6
KEEP_FILE_VERSIONS_DAYS = 190
# Allowed drift between the counts taken just before the dump and the
# restored rows (rows can be added in the seconds between the two).
COUNT_TOLERANCE_ABS = 5
COUNT_TOLERANCE_REL = 0.02

PASSFILE = None


def fail(msg):
    print(f"::error::{msg}")
    sys.exit(1)


def scrub(text):
    """Strip anything personal from a message before it reaches the log."""
    text = re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "<email>", str(text))
    text = re.sub(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", "<id>", text)
    text = re.sub(r"postgres(ql)?://\S+", "<db-url>", text)
    text = re.sub(r"\b\d{1,3}(\.\d{1,3}){3}\b", "<ip>", text)
    return text[:300]


# ---------------------------------------------------------------- R2 + gpg

def r2():
    import boto3
    from botocore.config import Config
    raw = os.environ.get("R2_ENDPOINT", "").strip()
    parts = urllib.parse.urlsplit(raw)
    if not parts.scheme or not parts.netloc:
        fail("R2_ENDPOINT secret is missing or not a URL.")
    return boto3.client(
        "s3",
        endpoint_url=f"{parts.scheme}://{parts.netloc}",
        aws_access_key_id=os.environ.get("R2_ACCESS_KEY_ID", "").strip(),
        aws_secret_access_key=os.environ.get("R2_SECRET_ACCESS_KEY", "").strip(),
        region_name="auto",
        config=Config(signature_version="s3v4", request_checksum_calculation="when_required",
                      response_checksum_validation="when_required", retries={"max_attempts": 5}),
    )


def bucket_name():
    # The "S3 API" URL Cloudflare shows sometimes already ends in /<bucket>.
    path = urllib.parse.urlsplit(os.environ.get("R2_ENDPOINT", "").strip()).path.strip("/")
    return path.split("/")[0] if path else os.environ.get("R2_BUCKET", "deskkit-backups")


def list_keys(client, prefix):
    keys = {}
    for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket_name(), Prefix=prefix):
        for obj in page.get("Contents", []):
            keys[obj["Key"]] = obj
    return keys


def passfile():
    global PASSFILE
    if PASSFILE:
        return PASSFILE
    phrase = os.environ.get("BACKUP_PASSPHRASE", "")
    if len(phrase) < 16:
        fail("BACKUP_PASSPHRASE secret is missing or shorter than 16 characters.")
    fd, PASSFILE = tempfile.mkstemp(prefix="pp-")
    os.fchmod(fd, 0o600)
    os.write(fd, phrase.encode())
    os.close(fd)
    return PASSFILE


def gpg(args):
    res = subprocess.run(["gpg", "--batch", "--yes", "--quiet", "--pinentry-mode", "loopback",
                          "--passphrase-file", passfile()] + args, capture_output=True)
    if res.returncode != 0:
        fail("gpg failed: " + scrub(res.stderr.decode(errors="replace")))


def encrypt(src, dst):
    gpg(["--symmetric", "--cipher-algo", "AES256", "-o", dst, src])


def decrypt(src, dst):
    gpg(["-o", dst, "--decrypt", src])


def put_encrypted_bytes(client, key, data):
    with tempfile.TemporaryDirectory() as tmp:
        plain, enc = os.path.join(tmp, "p"), os.path.join(tmp, "e")
        with open(plain, "wb") as f:
            f.write(data)
        encrypt(plain, enc)
        client.upload_file(enc, bucket_name(), key)


def get_decrypted_bytes(client, key):
    with tempfile.TemporaryDirectory() as tmp:
        enc, plain = os.path.join(tmp, "e"), os.path.join(tmp, "p")
        client.download_file(bucket_name(), key, enc)
        decrypt(enc, plain)
        with open(plain, "rb") as f:
            return f.read()


# ---------------------------------------------------------------- database

def psql_json(db_url, query, read_only=True):
    env = dict(os.environ)
    if read_only:
        env["PGOPTIONS"] = "-c default_transaction_read_only=on"
    res = subprocess.run(["psql", db_url, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", query],
                         capture_output=True, text=True, env=env)
    if res.returncode != 0:
        fail("database query failed: " + scrub(res.stderr))
    out = res.stdout.strip()
    return json.loads(out) if out else None


# Tables whose row counts prove a restore is complete. Session/token/log
# tables change by the second and say nothing about customer data.
COUNT_QUERY = """
select coalesce(json_object_agg(t, n), '{}'::json) from (
  select format('%I.%I', n.nspname, c.relname) as t,
         (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint as n
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and (
        n.nspname = 'public'
     or (n.nspname = 'auth' and c.relname in ('users', 'identities'))
     or (n.nspname = 'storage' and c.relname in ('buckets', 'objects')))
) s
"""


def live_db():
    url = os.environ.get("SUPABASE_DB_URL", "").strip()
    if not url.startswith("postgres"):
        fail("SUPABASE_DB_URL secret is missing or not a postgresql:// URL.")
    return url


def cmd_check():
    live_db()
    passfile()
    client = r2()
    try:
        client.head_bucket(Bucket=bucket_name())
    except Exception as e:  # noqa: BLE001
        fail("cannot reach the R2 bucket (check R2_ENDPOINT / keys / bucket name): " + scrub(type(e).__name__))
    version = psql_json(live_db(), "select to_json(current_setting('server_version_num')::int / 10000)")
    print(f"secrets OK, R2 bucket reachable, database reachable (Postgres {version})")


def cmd_counts(out_path):
    counts = psql_json(live_db(), COUNT_QUERY)
    counts["_server_major"] = psql_json(live_db(), "select to_json(current_setting('server_version_num')::int / 10000)")
    with open(out_path, "w") as f:
        json.dump(counts, f)
    print(f"counted {len(counts) - 1} tables")


def today():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")


def cmd_db_upload(folder):
    client = r2()
    date = today()
    total = 0
    for name in DUMP_FILES:
        src = os.path.join(folder, name)
        if not os.path.exists(src) or os.path.getsize(src) == 0:
            fail(f"{name} is missing or empty — the dump did not complete.")
        enc = src + ".gpg"
        encrypt(src, enc)
        size = os.path.getsize(enc)
        total += size
        client.upload_file(enc, bucket_name(), f"db/{date}/{name}.gpg")
        os.remove(enc)
        print(f"uploaded {name}: {size / 1024:.0f} KB (encrypted)")
    print(f"database backup {date}: {total / 1024 / 1024:.1f} MB")


def backup_dates(client):
    dates = set()
    for key in list_keys(client, "db/"):
        parts = key.split("/")
        if len(parts) >= 3 and re.fullmatch(r"\d{4}-\d{2}-\d{2}", parts[1]):
            dates.add(parts[1])
    return sorted(dates)


def cmd_db_prune():
    client = r2()
    dates = backup_dates(client)
    keep = set(dates[-KEEP_DAILY:])
    months = {}
    for d in dates:
        months.setdefault(d[:7], d)  # first backup of each month
    keep |= set(sorted(months.values())[-KEEP_MONTHLY:])
    removed = 0
    for key in list_keys(client, "db/"):
        parts = key.split("/")
        if len(parts) >= 3 and parts[1] in dates and parts[1] not in keep:
            client.delete_object(Bucket=bucket_name(), Key=key)
            removed += 1
    print(f"database backups kept: {len(keep)}; old files removed: {removed}")


# ---------------------------------------------------------------- files

def storage_objects():
    buckets = ",".join(f"'{b}'" for b in STORAGE_BUCKETS)
    rows = psql_json(live_db(), f"""
      select coalesce(json_agg(json_build_object('b', bucket_id, 'n', name,
             'u', coalesce(updated_at, created_at)::text, 's', coalesce((metadata->>'size')::bigint, 0))), '[]'::json)
      from storage.objects where bucket_id in ({buckets}) and name not like '%/.emptyFolderPlaceholder'
    """)
    return rows or []


def version_key(obj):
    digest = hashlib.sha256(f"{obj['b']}/{obj['n']}@{obj['u']}".encode()).hexdigest()
    return f"files/v/{digest}.gpg"


def cmd_files_backup():
    client = r2()
    existing = list_keys(client, "files/v/")
    objects = storage_objects()
    manifest, uploaded, failed, total_bytes = {}, 0, 0, 0
    for obj in objects:
        key = version_key(obj)
        manifest[f"{obj['b']}/{obj['n']}"] = {"k": key, "u": obj["u"], "s": obj["s"]}
        total_bytes += obj["s"] or 0
        if key in existing:
            continue
        url = f"{SUPABASE_URL}/storage/v1/object/public/{obj['b']}/{urllib.parse.quote(obj['n'], safe='/')}"
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "deskkit-backup"}), timeout=120) as res:
                data = res.read()
        except Exception:  # noqa: BLE001 — a file deleted mid-run is not a failure of the backup
            failed += 1
            continue
        put_encrypted_bytes(client, key, data)
        uploaded += 1
    body = json.dumps(manifest).encode()
    put_encrypted_bytes(client, "files/manifest.json.gpg", body)
    put_encrypted_bytes(client, f"files/manifests/{today()}.json.gpg", body)
    print(f"files: {len(objects)} in Storage ({total_bytes / 1024 / 1024:.1f} MB); new or changed copied: {uploaded}; unreadable: {failed}")

    # Old versions: keep anything referenced by a manifest from the last
    # ~6 months, delete the rest. Manifests themselves age out the same way.
    cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=KEEP_FILE_VERSIONS_DAYS)).strftime("%Y-%m-%d")
    referenced = {v["k"] for v in manifest.values()}
    for mkey in sorted(list_keys(client, "files/manifests/")):
        mdate = mkey.rsplit("/", 1)[-1].split(".")[0]
        if mdate < cutoff:
            client.delete_object(Bucket=bucket_name(), Key=mkey)
            continue
        if mkey.endswith(f"/{today()}.json.gpg"):
            continue
        referenced |= {v["k"] for v in json.loads(get_decrypted_bytes(client, mkey)).values()}
    pruned = 0
    for key in existing:
        if key not in referenced:
            client.delete_object(Bucket=bucket_name(), Key=key)
            pruned += 1
    print(f"file versions older than {KEEP_FILE_VERSIONS_DAYS} days removed: {pruned}")
    if objects and failed > max(2, len(objects) * 0.02):
        fail(f"{failed} files could not be read from Storage.")


IMAGE_MAGIC = [b"\xff\xd8\xff", b"\x89PNG", b"GIF8", b"RIFF", b"<svg", b"<?xml"]


def looks_like_image(data):
    head = data[:64].lstrip()
    return any(head.startswith(m) for m in IMAGE_MAGIC) or b"ftypavif" in data[:32] or b"ftyp" in data[:16]


def cmd_files_verify():
    client = r2()
    manifest = json.loads(get_decrypted_bytes(client, "files/manifest.json.gpg"))
    present = list_keys(client, "files/v/")
    missing = [v for v in manifest.values() if v["k"] not in present]
    sample = random.sample(list(manifest.values()), min(20, len(manifest)))
    bad = sum(1 for v in sample if not looks_like_image(get_decrypted_bytes(client, v["k"])))
    print(f"files in last backup: {len(manifest)}; missing copies: {len(missing)}; sample opened: {len(sample)}, unreadable: {bad}")
    if missing or bad:
        fail("file backup check failed.")


# ---------------------------------------------------------------- restore

def cmd_db_download_latest(folder):
    client = r2()
    dates = backup_dates(client)
    if not dates:
        fail("no database backup found in R2.")
    date = dates[-1]
    os.makedirs(folder, exist_ok=True)
    for name in DUMP_FILES:
        enc = os.path.join(folder, name + ".gpg")
        client.download_file(bucket_name(), f"db/{date}/{name}.gpg", enc)
        decrypt(enc, os.path.join(folder, name))
        os.remove(enc)
    with open(os.path.join(folder, "counts.json")) as f:
        major = json.load(f).get("_server_major")
    with open(os.path.join(folder, "server_major"), "w") as f:
        f.write(str(major or ""))
    print(f"downloaded and decrypted the backup from {date} (Postgres {major})")


def cmd_restore(folder, db_url):
    # Same order Supabase documents for restoring into a fresh project.
    args = ["psql", db_url, "-X", "-q", "-v", "ON_ERROR_STOP=1", "--single-transaction",
            "--file", os.path.join(folder, "roles.sql"),
            "--file", os.path.join(folder, "schema.sql"),
            "--command", "SET session_replication_role = replica",
            "--file", os.path.join(folder, "data.sql")]
    res = subprocess.run(args, capture_output=True, text=True)
    if res.returncode != 0:
        errors = [scrub(line) for line in res.stderr.splitlines() if "ERROR" in line][:5]
        for line in errors:
            print(line)
        fail("restore into the test database failed.")
    print("backup restored into the empty test database")


def cmd_restore_compare(folder, db_url):
    with open(os.path.join(folder, "counts.json")) as f:
        expected = json.load(f)
    expected.pop("_server_major", None)
    restored = psql_json(db_url, COUNT_QUERY, read_only=False)
    problems = 0
    for table in sorted(expected):
        want, got = expected[table], restored.get(table)
        tol = max(COUNT_TOLERANCE_ABS, int(want * COUNT_TOLERANCE_REL))
        ok = got is not None and abs(got - want) <= tol
        if not ok:
            problems += 1
        print(f"{'OK      ' if ok else 'MISMATCH'} {table}")
    print(f"tables checked: {len(expected)}; mismatches: {problems}")
    if problems:
        fail("restored data does not match the backup.")


# ---------------------------------------------------------------- alert

def cmd_alert(message):
    key = os.environ.get("RESEND_API_KEY", "").strip()
    if not key or not os.environ.get("SUPABASE_DB_URL"):
        print("alert not sent (no Resend key or database URL)")
        return
    owners = psql_json(live_db(), "select coalesce(json_agg(email), '[]'::json) from public.admin_users where role = 'owner'") or []
    if not owners:
        print("alert not sent (no owner email)")
        return
    run = f"{os.environ.get('GITHUB_SERVER_URL', '')}/{os.environ.get('GITHUB_REPOSITORY', '')}/actions/runs/{os.environ.get('GITHUB_RUN_ID', '')}"
    html = (f'<div dir="rtl" style="font-family:Arial,sans-serif">{message}<br><br>'
            f'האתר עצמו לא הושפע — רק הגיבוי. פרטים: <a href="{run}">{run}</a></div>')
    req = urllib.request.Request("https://api.resend.com/emails", method="POST",
                                 data=json.dumps({"from": "DeskKit <security@deskkit.co.il>", "to": owners,
                                                  "subject": "⚠️ גיבוי DeskKit נכשל", "html": html}).encode(),
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                                          "User-Agent": "deskkit-backup"})
    try:
        urllib.request.urlopen(req, timeout=30).read()
        print("alert email sent to the owner")
    except Exception as e:  # noqa: BLE001
        print("alert email failed: " + scrub(type(e).__name__))


def main():
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else ""), sys.argv[2:]
    table = {
        "check": cmd_check, "counts": cmd_counts, "db-upload": cmd_db_upload, "db-prune": cmd_db_prune,
        "files-backup": cmd_files_backup, "files-verify": cmd_files_verify,
        "db-download-latest": cmd_db_download_latest, "restore": cmd_restore,
        "restore-compare": cmd_restore_compare, "alert": lambda *a: cmd_alert(" ".join(a)),
    }
    if cmd not in table:
        sys.exit(__doc__)
    try:
        table[cmd](*args)
    finally:
        if PASSFILE and os.path.exists(PASSFILE):
            os.remove(PASSFILE)


if __name__ == "__main__":
    main()
