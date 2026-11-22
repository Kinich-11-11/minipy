#!/usr/bin/env bash
# Portable current regression lanes; never silently skip TurboWarp.
set -u
cd "$(dirname "$0")/../.." || exit 1
project=${1:-MiniPy_v4.245.sb3}
out=${2:-_work/v41/current-regression}
mkdir -p "$out"
export MINIPY_MAX_MS=${MINIPY_MAX_MS:-120000}
export MINIPY_MAX_STEPS=${MINIPY_MAX_STEPS:-12000}
fail=0
run() {
  local lane=$1 suite=$2
  shift 2
  local name
  name=$(basename "$suite")
  printf '%s %s\n' "$lane" "$name"
  node _work/v41/runrepair.mjs "$project" "$suite" "$@" > "$out/$lane-$name.log" 2> "$out/$lane-$name.stderr" || fail=1
  tail -1 "$out/$lane-$name.log"
}
run scratch-isolated _work/v41/_reg232.json --known-differences _work/v41/_reg232_known_differences.json
run scratch-shared _work/v41/_reg232.json --shared --known-differences _work/v41/_reg232_known_differences.json
for module in math cmath datetime random statistics re time; do
  run scratch-isolated "_work/v41/_mods20_$module.json"
  run scratch-shared "_work/v41/_mods20_$module.json" --shared
done
for suite in _work/v41/_cov205b.txt _work/v41/_runhat_state.json _work/v41/_gap131.json _work/v41/_probe230.json _work/v41/_v244_repairs.json _work/v41/_v245_probe.txt; do
  run scratch-isolated "$suite"
  run scratch-shared "$suite" --shared
done
coverage=(_work/v41/_new*.txt _work/v41/_cov*.txt)
extra=()
for suite in "${coverage[@]:1}"; do extra+=(--suite "$suite"); done
run scratch-shared "${coverage[0]}" --shared "${extra[@]}"
if [[ -z ${MINIPY_TW_VM:-} ]]; then
  echo 'TurboWarp not run: set MINIPY_TW_VM to the installed VM module.' >&2
  fail=1
else
  for suite in _work/v41/_runhat_state.json _work/v41/_gap131.json _work/v41/_probe230.json _work/v41/_cov205b.txt _work/v41/cases_demo.json _work/v41/_v244_repairs.json _work/v41/_v245_probe.txt; do
    MINIPY_VM="$MINIPY_TW_VM" run tw-shared "$suite" --shared
  done
  MINIPY_VM="$MINIPY_TW_VM" run tw-shared _work/v41/_reg232.json --shared --known-differences _work/v41/_reg232_known_differences.json
fi
exit "$fail"
