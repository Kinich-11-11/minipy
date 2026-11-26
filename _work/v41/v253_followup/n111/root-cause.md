# N111 diagnosis — v4.252 baseline

Scope: nested closures / generator return unpack only. No SB3 or interpreter patch was made.
Runtime: `_work/vm5300/node_modules/scratch-vm` 5.0.300, runner `_work/v41/runrepair.mjs`.
Baseline: `_work/v41/MiniPy_v4.252.sb3` (SHA-256 matches root `MiniPy_v4.252.sb3`).

## Layer 1: exact reported case

`N111` fails before generator resume:

- expected: `1 [2]`
- actual: `ValueError: not enough values to unpack (expected 2, got 0)`
- completed: yes; executed: 2; pc: 9

The failure is not an unpack-count implementation defect by itself. The returned value from `outer()` is an empty generator, so unpack sees zero values.

## Layer 2: minimal probes

The full probe source is `probes.txt`; raw runs are `isolated.log` and `shared.log`.

Baseline isolated run (`N111` + P01–P24): **2/25 pass** (the runner's final count includes N111 and all probes; P01/P02 are the two passes).

Important baseline observations:

- P01 module-level generator + unpack: pass (`1 []`).
- P02 nested ordinary function call + unpack: pass (`1 [2]`).
- P03 ordinary closure escapes, then mutates captured list: fail (`1 []`, expected `1 [2]`).
- P04/P05/P06/P07 nested generator with no free vars: fail; bare `next()` gives `StopIteration`, tuple return is seen as empty / wrong shape.
- P08/P09/P12 reproduce N111's nested-generator return/unpack failure with progressively simpler closures.
- P13/P14 nested generator returned without tuple: fail with `StopIteration`.
- P15/P16/P22: a nested generator definition incorrectly turns the enclosing ordinary function into a generator; `outer()` prints a generator object instead of `9`.
- P17/P24: returned captured list and the list exported from the factory are not the same live object (`[2] [] False` / `[] [2] False`). This reproduces independently of generators.
- P18 scalar nonlocal closure: pass (`1 2`).
- P20/P21: an enclosing function's own `yield` still works; nested child yields should not contaminate it.

## Layer 3: controlled scanner experiment

`vm-trace.cjs` is an in-memory diagnostic wrapper. With `N111_SKIP_NESTED=1`, it skips nested `def`/`class` bodies only while the `regdef` line scanner searches for `yield`; it does not alter the SB3 file.

Controlled shared run (`N111` + P01–P24): **17/25 pass**. The remaining failures are all the mutable-list alias family (P03, P08, P10, P12, P17, P23, P24) plus N111's expected exported-list mismatch. Crucially, the nested-generator/unpack family passes:

- N111 now reaches `next()` and produces `1 []` rather than unpacking zero values.
- P04–P07, P09, P11, P13–P16, P19–P22 pass.
- P19 (`next(outer())` with a captured scalar) passes, proving generator resume itself is viable after classification is fixed.

The controlled run is diagnostic only; it is not a proposed patch.

## Root-cause pointers

### A. Primary N111 failure: recursive yield detection in `regdef`

In the `regdef` procedure, the `gk` loop scans from the current function body start to `Ends[function]` and sets `gy=1` whenever any token equals `yield`. It does not exclude nested `def`/`class` suites. For N111 the scan sees `yield len(a)` inside nested `g`, then changes the enclosing `outer` `FnKind` from `D` to `G`.

Trace evidence is in `trace-n111.jsonl`:

- `outer` is registered with `FnKind` initially `D`.
- The scan visits nested `g`'s `yield` line.
- `FnKind` is replaced with `G`.
- `calluser outer` creates a generator handle (`GHFn`/`GHGen`), and the outer call returns before executing its body.
- The subsequent `unpackto` therefore sees zero yielded items.

Action: make yield detection lexical to the current function body. When the scanner encounters a nested `def` or `class`, skip that suite (including nested suites) while preserving default/decorator expression handling as required. Existing indentation/depth bookkeeping in `regdef` is the natural place to implement this. Do not globally suppress nested scanning: P20/P21 show that a real yield in the current function must remain visible.

### B. Secondary N111 failure after A: mutable closure cell is not an object-identity alias

After the scanner experiment fixes A, N111 resumes and `f()` correctly appends through the captured cell, but the list returned separately as `a` remains empty. P23 reports:

- first line: `1 [2] []`
- second line: `2 [2, 2] []`

P17/P24 isolate the same issue without a generator. Scalar cells work (P18), so this is specifically mutable list/object storage and alias propagation, not general nonlocal lookup.

Relevant existing architecture:

- `p763.txt`: `cellNew763`, `cellRead763`, `cellWrite763` and `CellV`/`CellT` storage.
- `p767.txt`: `aliasCell767`, `aliasDrop767`, `aliasSync767` for local-to-local aliasing.
- `v252_runtime.txt`: `ref*826` view/object records, which are separate from this N111 failure.

Trace evidence (`skip-p03.jsonl` and `skip-nested.jsonl`) shows `a` is created as an `L` cell and closure writes replace `CellV` with the list handle/value, but the factory's returned `a` binding is not linked to that same live mutable object. The observable symptom is identity false even when the closure can read the updated list.

Action: preserve one heap/list identity for a captured mutable local and every exported alias. A closure capture should retain a reference/cell to the list object, not merely copy or reconstruct the serialized list value into `CellV`; return/unpack and alias paths must keep that same reference. Audit the interaction between `cellNew763`/`cellWrite763` and the `alrec`/`aliasSync767` path. Avoid replaying list mutations from strings; the live receiver should be updated once.

## Bottom line

N111 has two stacked defects:

1. **Classification defect (blocking unpack):** nested `yield` contaminates the enclosing function's generator flag. Fix the lexical scanner first.
2. **Closure identity defect (blocking expected `[2]` result):** captured mutable list and factory-exported list do not share identity. Fix cell/alias heap identity second.

No dictionary or N105 work was performed.
