#!/usr/bin/env bash
# ScoreQuest gate runner. Usage: bash gate.sh [suite ...]   (no args = all eight)
# Prints one line per suite; exits nonzero if any suite fails.
cd "$(dirname "$0")"
(setsid python3 -m http.server 8000 >/dev/null 2>&1 < /dev/null &)
sleep 1
suites="${*:-verify_realm verify_boss verify_hub verify_map verify verify_auth verify_payment verify_parents}"
fail=0
for s in $suites; do
  if out=$(node "$s.js" 2>&1); then ok="green"; else ok="RED"; fail=1; fi
  line=$(printf '%s\n' "$out" | grep -E 'checks passed' | tail -1)
  echo "== $s: ${line:-no summary} [$ok]"
done
exit $fail
