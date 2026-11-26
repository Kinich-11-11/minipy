# N106/N107 diagnosis — v4.252, scratch-vm 5.0.300

## Reproduction baseline

- Project: `_work/v41/MiniPy_v4.252.sb3`
- Project SHA-256: `e8633f497337273b22ee21fafbe56914578f87cc83581d4d87ae29b40962ff89`
- VM: `5.0.300`
- Formal baseline: `_work/v41/v253_followup/n-cases.json`
- Baseline focused run: N106 actual `['a']`, expected `['a', 'b']`; N107 actual `[('a', 1)]`, expected `[('a', 7)]`.
- Probe source and raw traces are in this directory: `probe.mjs`, `trace.jsonl`, `matrix.jsonl`, `paths-dump.txt`, `critical-dump.txt`.

## Core invariant

A dict is a mutable heap object with one stable owner/id. Every value that denotes that dict — a local/global binding, an instance attribute, a tuple element, and a dict view/iterator — must resolve to the same owner/id. A serialized dict string is only the representation of the current object; it must not become a new owner merely because it crossed an attribute-read, tuple-return, or unpack boundary.

For views, the view stores the owner/id, not a copied dict record. For an alias operation, the destination binding must be linked to the source owner after the source has been resolved, including source paths such as `a.d`, tuple element `t[0]`, and a return/unpack payload. Rebinding a destination must remove only that destination's binding link; it must not delete the owner or break other links.

## N106: instance-attribute path loses the owner link

The class constructor correctly creates `IAttrId=1`, `IAttrName=['d']`, `IAttrType=['D']`, and `IAttrVal=['\\x1fSa\\x1fN1']`. The first `a.d.keys()` call records a view as `RefKeys826=['0|__recv']`, `RefIds826=[1]`, `RefData826=['\\x1fSa\\x1fN1']`.

The subsequent `a.d['b']=2` path does mutate the instance attribute: trace shows `pathset(... vt=D, vv='\\x1fSa\\x1fN1\\x1fSb\\x1fN2')`, then `aset(iid=1,nm='d',vt=D,vv=...)`, and `IAttrVal` is replaced with the new record. But the view still projects `RefData826[1]`, which remains the old record. Thus the missing operation is not dict index mutation; it is owner publication from an attribute slot to the existing owner/id (or, equivalently, making the attribute slot itself the canonical owner).

Important discriminator: `attr-direct-reread` passes (`list(a.d.keys())` sees `a,b`) while the pre-existing view remains stale. This proves the attribute value is updated, but the view's owner/reference is not connected to the attribute slot. `attr-alias-var` passes because ordinary binding aliasing reaches the current dict value. `attr-alias-instance`, two-instance isolation, and shared assignment fail, all consistent with path/slot identity being absent rather than with dict mutation encoding being broken.

### Required N106 design

When an attribute holding a D/L object is created or replaced, resolve/link its value to a stable owner id. The slot's owner link must be retained by `(instance id, attribute name)` (or an equivalent canonical object slot key), and reads of `a.d` must return/link that owner rather than only returning the serialized record. Attribute mutation must publish the new serialized record to that owner id, so all existing views and aliases observe it. A fresh read may still return the current record, but it must not be the only path that sees the update.

Do not key this by attribute name alone: `a.d` and `b.d` must be distinct owners unless they explicitly share the same dict value. Do not key it by serialized value alone: two equal dict literals are distinct objects.

## N107: tuple return/unpack materializes a stale view owner

Inside `f`, the dict gets record `\\x1fSa\\x1fN1`; `d.items()` creates `RefKeys826=['1|d']`, `RefIds826=[1]`, and `RefData826=['\\x1fSa\\x1fN1']`. The return tuple is encoded as `\\x1fD...\\x1f1Sa\\x1e1N1\\x1fI1`, i.e. a D record plus an item-view id. After `fpop`, unpack assigns `d` the D record and `i` the I id, but the existing item-view owner remains backed by the old `RefData826[1]`. The later `d['a']=7` writes a new record to the destination binding; it does not publish to the owner that `i` uses. N107 therefore returns `[('a',1)]` instead of `[('a',7)]`.

The broader matrix confirms the boundary: tuple-local unpack, parenthesized return, tuple indexing, reverse tuple order, and reused unpack all fail. `tuple-double-dict` shows both D values are independent after unpack (`y['a']` stays 1), so this is not just a view-formatting issue; D alias identity itself is lost across tuple transport. A control with `d` and `x=d` in the same ordinary scope passes, so the ordinary binding link path is healthy.

### Required N107 design

Treat tuple transport as an alias-preserving graph copy, not as string concatenation. While constructing a tuple, retain each component's owner token/id (D/L) and each view's owner id. On tuple indexing/unpack/return, restore/link the destination binding to the retained owner id. For a tuple containing `(d, d.items())`, the D destination and I destination must converge on one owner id before any later mutation. The link must survive `fpop` and caller-frame unpack; frame-local spelling (`d`) is not sufficient.

If the implementation keeps the current serialized encoding, add an explicit owner reference alongside each D/L component and a view-owner reference alongside each K/V/I component; never infer aliasing by comparing the serialized record. Equal values remain distinct when created separately, while true aliases remain shared.

## Recommended implementation checkpoints

1. Add/verify a canonical `ownerId` for every mutable D/L instance, including an attribute slot.
2. At `a.d` read, return both current record and owner token; at `aset`, update the owner record and preserve the slot link.
3. At tuple literal/return encoding, emit owner tokens for mutable components and owner ids for views.
4. At tuple indexing and `assignlist`/unpack, invoke the same alias-link primitive used by ordinary `x = y`; do not call plain `assign` with only the serialized value.
5. Ensure `aldrop` removes a binding edge, not the owner record; owner lifetime should cover views/attributes/aliases.
6. Add regression probes for: two instances (`a.d` vs `b.d`), explicit shared assignment (`a.d=d; d['b']=2`), tuple indexing, tuple double-alias (`x,y,i=f()`), and rebinding after view creation.

## What not to change in this task

N105 membership/iteration and N111 closure/generator behavior are intentionally out of scope. The observations above use only N106/N107 plus isolated controls to avoid attributing their failures to those areas.
