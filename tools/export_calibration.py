#!/usr/bin/env python3
"""
Load the official SAT banks (College Board items, source "calibration-only") into
the Supabase table public.calibration_questions, for TESTING AND CALIBRATION ONLY.

    SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=... \
    python3 pipeline/export_calibration.py

Run from the research folder. The table is locked (RLS on, no policies, no client
grants), so only the service role can read it; nothing in the app touches it.
The key is read from the environment only: never pass it on the command line or
commit it. Upserts by id, so re-running is safe. Standard library only.

Options:
    --bank DSAT_04 --bank QB_MATH    load only these banks (default: every non-original bank)
    --dry-run                        count and size the rows without sending
"""
import argparse, glob, json, os, sys, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEEP = ("id", "test_id", "number", "section", "legacy_section", "legacy_domain", "module", "calculator",
        "type", "stem", "implicit_stem", "choices", "answer", "figure", "table", "mark", "skill",
        "difficulty_official", "difficulty_authored", "explanation", "status", "source")


def rows_for(bank_path):
    b = json.loads(Path(bank_path).read_text())
    st = {s["id"]: s for s in b.get("stimuli", [])}
    out = []
    for it in b["items"]:
        if it.get("source") == "scorequest-original":
            continue                                   # originals live in public.questions
        item = {k: it[k] for k in KEEP if it.get(k) not in (None, "", [], {})}
        s = st.get(it.get("stimulus"))
        if s:
            item["passage"] = {k: s[k] for k in ("kind", "title", "intro", "parts", "figures", "credit", "notes") if s.get(k)}
        out.append({
            "id": it["id"], "bank": it.get("test_id") or Path(bank_path).parent.name,
            "section": it["section"], "domain": it.get("legacy_domain") or it.get("legacy_section"),
            "skill": it.get("skill"), "difficulty": it.get("difficulty_official") or it.get("difficulty_authored"),
            "type": it["type"], "status": it.get("status", "imported"), "item": item,
        })
    return out


def rest(url, key, path, method="GET", body=None, prefer=None):
    req = urllib.request.Request(url.rstrip("/") + "/rest/v1/" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("apikey", key)
    req.add_header("Authorization", "Bearer " + key)
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Supabase {method} {path} failed: {e.code} {e.read().decode()[:400]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bank", action="append", help="bank folder name under bank/ (repeatable)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    paths = sorted(glob.glob(str(ROOT / "bank" / "*" / "test.json")))
    if a.bank:
        paths = [p for p in paths if Path(p).parent.name in a.bank]
    rows = []
    for p in paths:
        r = rows_for(p)
        print(f"{Path(p).parent.name}: {len(r)} items")
        rows += r
    print(f"{len(rows)} rows, {sum(len(json.dumps(r)) for r in rows) / 1e6:.1f} MB")
    if a.dry_run:
        return
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise SystemExit("set SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment (service role key, Settings > API)")
    if key.startswith("sb_publishable"):
        raise SystemExit("that is the publishable key; the loader needs the service role key")
    for i in range(0, len(rows), 100):
        rest(url, key, "calibration_questions", "POST", rows[i:i + 100], "resolution=merge-duplicates,return=minimal")
        print(f"  sent {min(i + 100, len(rows))}/{len(rows)}", end="\r", flush=True)
    counts = rest(url, key, "calibration_questions?select=bank") or []
    tally = {}
    for r in counts:
        tally[r["bank"]] = tally.get(r["bank"], 0) + 1
    print(f"\ncalibration_questions now holds {len(counts)} rows: {tally}")


if __name__ == "__main__":
    main()
