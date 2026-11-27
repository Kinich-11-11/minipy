"""Deterministic, static inventory of the serialized project (not runtime coverage)."""

import argparse, collections as C, hashlib, json, pathlib, zipfile


def run(archive):
    path = pathlib.Path(archive)
    with zipfile.ZipFile(path) as z:
        data = z.read("project.json")
        assets = {n: hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n != "project.json"}
    p = json.loads(data)
    targets = {}
    totals = C.Counter()
    lexical = C.defaultdict(set)
    for t in p["targets"]:
        b = t["blocks"]
        incoming = C.Counter()
        broken = missing = 0
        procedures = {}

        def children(x):
            for s in x["inputs"].values():
                for y in s[1:]:
                    if isinstance(y, str):
                        yield y
            if x["next"]:
                yield x["next"]

        for k, x in b.items():
            for n in children(x):
                incoming[n] += 1
                if n not in b:
                    missing += 1
                elif b[n]["parent"] != k:
                    broken += 1
        byop = C.Counter(x["opcode"] for x in b.values())
        roots = {k: x for k, x in b.items() if x["topLevel"]}
        call_edges = 0
        for k, x in roots.items():
            name = (
                b[x["inputs"]["custom_block"][1]]["mutation"]["proccode"]
                if x["opcode"] == "procedures_definition"
                else x["opcode"] + ":" + str(x["fields"]) + ":" + k
            )
            todo = [(k, 0)]
            seen = set()
            calls = C.Counter()
            reads = set()
            writes = set()
            depth = 0
            while todo:
                n, d = todo.pop()
                if n not in b or n in seen:
                    continue
                seen.add(n)
                y = b[n]
                depth = max(depth, d)
                if y["next"]:
                    todo.append((y["next"], d))
                if y["opcode"] == "procedures_call":
                    calls[y["mutation"]["proccode"]] += 1
                for f, v in y["fields"].items():
                    if f in ("LIST", "VARIABLE"):
                        (
                            writes
                            if y["opcode"].startswith(
                                (
                                    "data_add",
                                    "data_change",
                                    "data_set",
                                    "data_delete",
                                    "data_insert",
                                    "data_replace",
                                )
                            )
                            else reads
                        ).add(v[0])
                for slot, v in y["inputs"].items():
                    for child in v[1:]:
                        if isinstance(child, str):
                            todo.append((child, d + int(slot.startswith("SUBSTACK"))))
                        elif isinstance(child, list) and child[0] in (12, 13):
                            reads.add(child[1])
                # Static dispatch candidates, not a claim that every combination works.
                if y["opcode"] == "operator_equals":
                    a, z = (y["inputs"].get(s, [None, None])[1] for s in ("OPERAND1", "OPERAND2"))
                    for r, l in [(a, z), (z, a)]:
                        if not (
                            isinstance(l, list)
                            and l[0] == 10
                            and isinstance(l[1], str)
                            and l[1].isascii()
                            and l[1].isidentifier()
                        ):
                            continue
                        key = (
                            b.get(r, {}).get("fields", {}).get("VALUE", [None])[0]
                            if isinstance(r, str)
                            else r[1]
                            if isinstance(r, list) and r[0] == 12
                            else None
                        )
                        if key in ("fn", "meth", "method", "mod", "module", "mmod", "mrfnn", "head"):
                            lexical[key].add(l[1])
            call_edges += len(calls)
            procedures[name] = {
                "blocks": len(seen),
                "maxBranchDepth": depth,
                "calls": dict(sorted(calls.items())),
                "reads": sorted(reads),
                "writes": sorted(writes),
            }
        metric = {
            "blocks": len(b),
            "procedures": byop["procedures_definition"],
            "variables": len(t["variables"]),
            "lists": len(t["lists"]),
            "branches": byop["control_if"] + byop["control_if_else"],
            "callSites": byop["procedures_call"],
            "distinctCallEdges": call_edges,
            "costumeEntries": len(t["costumes"]),
            "brokenParents": broken,
            "sharedNodes": sum(v > 1 for v in incoming.values()),
            "danglingSlots": missing,
            "detachedNodes": sum(not x["topLevel"] and k not in incoming for k, x in b.items()),
        }
        totals.update(metric)
        targets[t["name"]] = {
            "metrics": metric,
            "opcodes": dict(sorted(byop.items())),
            "scripts": procedures,
            "lists": sorted(v[0] for v in t["lists"].values()),
        }
    return {
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "bytes": path.stat().st_size,
        "jsonBytes": len(data),
        "assets": len(assets),
        "assetSetSHA256": hashlib.sha256(json.dumps(sorted(assets.items())).encode()).hexdigest(),
        "extensions": p["extensions"],
        "metrics": dict(totals),
        "lexicalCandidates": {k: sorted(v) for k, v in lexical.items()},
        "targets": targets,
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("archive")
    ap.add_argument("output")
    a = ap.parse_args()
    pathlib.Path(a.output).write_text(
        json.dumps(run(a.archive), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
    )
