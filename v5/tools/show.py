"""Read a procedure (or RUN/HALT hat) as Scratch opcodes with named inputs."""

import argparse
import json
from zipfile import ZipFile


def show(archive, target, proc, depth):
    with ZipFile(archive) as z:
        p = json.loads(z.read("project.json"))
    blocks = next(t["blocks"] for t in p["targets"] if t["name"] == target)

    def display(value):
        if isinstance(value, list):
            return str(value[1]) if value[0] in (12, 13) else repr(value[1])
        return expression(blocks[value])

    def expression(b):
        name = b.get("mutation", {}).get("proccode", b["opcode"])
        fields = ", ".join(str(v[0]) for v in b["fields"].values())
        inputs = ", ".join(display(v[1]) for k, v in b["inputs"].items() if not k.startswith("SUBSTACK"))
        return f"{name}({', '.join(filter(None, [fields, inputs]))})"

    def stack(key, indent=0):
        while key:
            b = blocks[key]
            print("  " * indent + expression(b))
            if indent < depth:
                for slot in ("SUBSTACK", "SUBSTACK2"):
                    if slot in b["inputs"] and isinstance(b["inputs"][slot][1], str):
                        if slot == "SUBSTACK2":
                            print("  " * indent + "else:")
                        stack(b["inputs"][slot][1], indent + 1)
            key = b["next"]

    for b in blocks.values():
        if b["opcode"] == "procedures_definition":
            name = blocks[b["inputs"]["custom_block"][1]]["mutation"]["proccode"]
        elif b["opcode"] == "event_whenbroadcastreceived":
            name = b["fields"]["BROADCAST_OPTION"][0]
        else:
            continue
        if proc == name:
            stack(b["next"])
            return
    raise SystemExit(f"{target}: no such script: {proc}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive")
    parser.add_argument("procedure")
    parser.add_argument("--target", default="Interpreter")
    parser.add_argument("--depth", type=int, default=2)
    args = parser.parse_args()
    show(args.archive, args.target, args.procedure, args.depth)
