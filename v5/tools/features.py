"""Static feature mentions crossed with actual whole-program results; no execution of test source."""

import ast
import builtins
import collections
import json
import pathlib
import subprocess
from collections.abc import Iterable

ROOT = pathlib.Path(__file__).resolve().parents[1]
SUITES = {
    "": "report,protocols,main,edge,editor,semantic",
    "-objects": "objects",
    "-aliases": "aliases",
    "-coverage": "coverage",
    "-extended": "archive,apps",
    "-rest": "archive-rest",
    "-ascii": "ascii",
    "-dictviews": "dictviews",
    "-dictviews-boundaries": "dictviews-boundaries",
}


def tags(code: str) -> Iterable[tuple[str, str]]:
    try:
        tree = ast.parse(code)
    except SyntaxError:
        yield "syntax", "(CPython 编译时拒绝)"
        return
    for n in ast.walk(tree):
        if isinstance(
            n, (ast.stmt, ast.expr, ast.operator, ast.cmpop, ast.unaryop, ast.boolop)
        ) and not isinstance(n, (ast.Name, ast.Constant)):
            yield "syntax", type(n).__name__
        if isinstance(n, ast.Call):
            if isinstance(n.func, ast.Name) and hasattr(builtins, n.func.id):
                yield "builtins", n.func.id
            if isinstance(n.func, ast.Attribute):
                yield "attributes", n.func.attr
        if isinstance(n, ast.Import):
            for a in n.names:
                yield "imports", a.name
        if isinstance(n, ast.ImportFrom):
            yield "imports", n.module or "(relative)"


def main():
    # Use the very same suite loader as run.cjs, including archived case names and inputs.
    script = "const {cases}=require('./tests/run.cjs'); const suites=JSON.parse(process.argv[1]); process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(suites).map(([s,groups])=>[s,groups.split(',').flatMap(g=>cases(g).map(c=>[g,c.name,c.code]))]))));"
    source = json.loads(subprocess.check_output(["node", "-e", script, json.dumps(SUITES)], cwd=ROOT))
    matrix = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0, 0, None, None]))
    totals = 0
    for s, programs in source.items():
        a, b = [
            json.loads((ROOT / "reports" / f"{v}{s}.json").read_text(encoding="utf8"))["runs"]
            for v in ["baseline", "candidate"]
        ]
        for (group, name, code), before, after in zip(programs, a, b, strict=True):
            assert (group, name) == (before["group"], before["name"]) == (after["group"], after["name"])
            totals += 1
            for section, tag in set(tags(code)):
                row = matrix[section][tag]
                row[0] += 1
                row[1] += before["pass"]
                row[2] += after["pass"]
                idx = 3 if after["pass"] else 4
                if row[idx] is None:
                    row[idx] = f"{group}:{name}"
    labels = {
        "syntax": "语法与运算",
        "builtins": "内置名字的直接调用",
        "imports": "导入模块",
        "attributes": "属性调用（含类型方法和用户方法）",
    }
    md = [
        "# 基线功能与回放覆盖索引",
        "",
        f"对 {totals} 项回放做 CPython AST 静态标注，再关联同一程序的真实两侧结果。表中“通过”是**含该构造的整个程序**通过；不是构造的实现覆盖率，也不是将失败归因给该构造。不同特征的计数重叠；名字可能被用户遮蔽，未出现在语料不等于作品不支持。完整 Scratch 脚本、路由候选和调用图另见 `reports/*-inventory.json`。",
    ]
    for sec, label in labels.items():
        md += [
            "",
            f"## {label}（{len(matrix[sec])} 种）",
            "",
            "| 特征 | 涉及程序 | v4.267 通过 | v5 通过 | 一个 v5 未通过的关联程序 |",
            "|---|---:|---:|---:|---|",
        ]
        for name, (count, ap, bp, ok, fail) in sorted(matrix[sec].items()):
            md.append(f"| `{name}` | {count} | {ap} | {bp} | {fail or '—'} |")
    (ROOT / "FEATURES.md").write_text("\n".join(md) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
