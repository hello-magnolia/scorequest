#!/usr/bin/env python3
"""
Mirror data/waypoints.js into the Supabase waypoints table (supabase_setup.sql, section 8).

    SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=... python3 tools/seed_waypoints.py

The service role key is read from the environment only: never pass it on the command
line or commit it. Upserts by id, so re-running after editing data/waypoints.js is safe.
Standard library only. Run from the scorequest folder.
"""
import json, os, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_rows():
    """Evaluate data/waypoints.js and data/lessons.js with node (they are plain assignments)."""
    import subprocess
    js = ("global.window={};require(process.argv[1]);require(process.argv[2]);"
          "process.stdout.write(JSON.stringify({w:window.SQ_WAYPOINTS,l:window.SQ_LESSONS}))")
    try:
        out = subprocess.run(["node", "-e", js, str(ROOT / "data" / "waypoints.js"), str(ROOT / "data" / "lessons.js")],
                             capture_output=True, text=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError) as e:
        raise SystemExit(f"node is needed to read data/waypoints.js: {e}")
    d = json.loads(out)
    return d["w"], d["l"]


def rest(url, key, path, method="GET", body=None, prefer=None):
    req = urllib.request.Request(url.rstrip("/") + "/rest/v1/" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("apikey", key)
    req.add_header("Authorization", "Bearer " + key)
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else None
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Supabase {method} {path} failed: {e.code} {e.read().decode()[:400]}")


def main():
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise SystemExit("set SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment (service role key)")
    rows, lessons = load_rows()
    out = [{"id": r["id"], "realm": r["realm"], "position": r["position"], "mode": r["mode"],
            "skill": r.get("skill"), "title": r.get("title"), "rounds": r.get("rounds", 1),
            "also": r.get("also"), "tier": r.get("tier"), "lesson": lessons.get(r.get("skill")) if r["mode"] == "lesson" else None}
           for r in rows]
    rest(url, key, "waypoints", "POST", out, "resolution=merge-duplicates,return=minimal")
    print(f"upserted {len(out)} waypoints")


if __name__ == "__main__":
    main()
