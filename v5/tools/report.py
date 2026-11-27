"""Render the human report from measured artifacts, refusing mixed candidate hashes."""

import json, pathlib, statistics as st, collections as C

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load(n):
    return json.loads((ROOT / "reports" / f"{n}.json").read_text(encoding="utf8"))


def delta(a, b):
    return f"{(b / a - 1) * 100:+.2f}%" if a else "—"


def f(x):
    return f"{x:,.2f}"


def main():
    a, b = [load(k + "-inventory") for k in ("baseline", "candidate")]
    comp = load("comparison")
    bench = load("benchmark")
    live = load("live-diff")
    pa, pb = [load(k + "-profile") for k in ("baseline", "candidate")]
    assert (
        b["sha256"]
        == json.loads((ROOT / "core-lock.json").read_text())["sha256"]
        == pb["sha256"]
        == live["sha256"]
    )
    work_a, work_b = [load(k + "-workspace") for k in ("baseline", "candidate")]
    assert work_a["sha256"] == a["sha256"] and work_b["sha256"] == b["sha256"]
    assert all(t["pass"] for t in work_b["targets"])
    assert a["sha256"] == pa["sha256"]
    assert a["assetSetSHA256"] == b["assetSetSHA256"]
    assert all(x["sha256"] == (a if x["key"] == "baseline" else b)["sha256"] for x in bench["samples"])
    assert len(bench["samples"]) == 10
    out = []
    w = out.append
    w("# v4.267 → v5 核心候选：量化验收记录\n")
    w(
        f"冻结提交 `{json.loads((ROOT / 'baseline.json').read_text())['commit']}`。候选 SB3 SHA-256 `{b['sha256']}`。所有数字只适用于所列作品、工具和输入；不将候选称为已全面验收的 Python 实现。\n"
    )
    w("## 1. 真实执行：正确性、组合与回归\n")
    w(
        "| 语料（计回放项，不按源码去重） | 项数 | v4.267 严格通过 | v5 严格通过 | 通过→失败 |\n|---|---:|---:|---:|---:|"
    )
    for k, x in comp.items():
        w(
            f"| {k} | {x['total']} | {x['baselinePassed']} | {x['candidatePassed']} | {len(x['regressions'])} |"
        )
    n, ap, bp = [
        sum(x[k] for x in comp.values()) for k in ("total", "baselinePassed", "candidatePassed")
    ]
    w(
        f"| **合计** | **{n}** | **{ap} ({100 * ap / n:.2f}%)** | **{bp} ({100 * bp / n:.2f}%)** | **{sum(len(x['regressions']) for x in comp.values())}** |\n"
    )
    w(
        "默认用真实 RUN 帽，不直接调用解释器内部某个返回结果的函数。校验结束、源码不变、关键帧列表平衡、输出行（含 26 字符显示折行）及异常文本。绝对正确性与相对兼容性分开判定；两者同时失败不等于两者都正确。main 含 79 项报告、协议专项、main/global、33 项边界、18 项编辑器和新增组合语义；extended 含档案与 5 个实际应用，含迷宫。\n"
    )
    w(
        "由严格失败变为通过："
        + "、".join("`" + y + "`" for x in comp.values() for y in x["fixes"])
        + "。\n"
    )
    w(
        f"**剩余 {n - bp} 项不符**。对这些条目另用 {live['python']} 重跑参考程序；不修改原 oracle 或原评分。按二次核验分类："
        + "；".join(f"{k}：{v}" for k, v in C.Counter(x["reason"] for x in live["rows"]).items())
        + "。逐项参考值、MiniPy 输出和异常见 `reports/live-diff.json`。时钟环境并未冻结，对象 repr 的地址也不是跨进程常数。仍失败行之间输出发生改变的名字见 `reports/comparison.json`。\n"
    )
    w(
        "未闭合的例子：`exec` 在基线即未实现；矩阵行乘法产生的共享子列表、递归排列、组合 map/filter、字典视图与推导式，还有部分异常类型或消息。不能从 0 项新增失败推断全语言无回归。历史记录中的“873/873”来自另一版本、另一比较器，不是本次 v4.267 的实测结果。\n"
    )
    w("## 2. 静态体积与图质量\n")
    w("| 指标 | v4.267 | v5 | 相对变化 |\n|---|---:|---:|---:|")
    for name, k, top in [
        ("SB3 字节", "bytes", 1),
        ("project.json 字节", "jsonBytes", 1),
        ("归档资源文件", "assets", 1),
        ("积木（含定义/原型）", "blocks", 0),
        ("自定义过程", "procedures", 0),
        ("变量", "variables", 0),
        ("列表", "lists", 0),
        ("if/if_else 分支", "branches", 0),
        ("静态调用点", "callSites", 0),
        ("不同脚本→过程调用边", "distinctCallEdges", 0),
        ("造型条目", "costumeEntries", 0),
        ("与前向拥有者不一致的 parent 边", "brokenParents", 0),
        ("多父块", "sharedNodes", 0),
        ("缺失的输入/next 引用", "danglingSlots", 0),
        ("无前向拥有者的非顶层块", "detachedNodes", 0),
    ]:
        x, y = (a[k], b[k]) if top else (a["metrics"][k], b["metrics"][k])
        w(f"| {name} | {x:,} | {y:,} | {delta(x, y)} |")
    w(
        "\n真实 VM 的积木工作区 XML 也已逐个解析：基线 Interpreter 序列化栈溢出；候选四个精灵均通过，Interpreter 的 620 个自定义过程均出现在 XML 中。这验证了编辑器的数据入口，不等于浏览器渲染验收。全部资源文件内容与基线一致。修复树所有权需要复制部分共用尾链，不是每项变换都减少块数。解释器首访结构最大分支嵌套仍为 24；静态调用图含递归，不以虚假的“最大调用深度”打分。\n"
    )
    w("## 3. 性能、延迟及空间\n")
    w(
        f"环境：{bench['platform']}，{bench['cpu'].strip()}，Node {bench['node']}，zlib {bench['zlib']}，stock scratch-vm 5.0.300，无渲染器。每个样本创建新 VM，加载并绿旗后手动推进 30 步，再运行一次空程序预热；同一 Node 进程内按 AB/BA 交错，基线与候选各 5 次。boot 不等于首次可见画面的时间。以下单位为 ms，括号为最小–最大；尾端即本次样本最坏值。不推断统计显著性。\n"
    )
    w("| 工作负载 | v4.267 中位数（区间） | v5 中位数（区间） | 中位数变化 |\n|---|---:|---:|---:|")
    for k in ["bootMs", "warmupMs", *bench["samples"][0]["ms"]]:
        times = [
            [s[k] if k in s else s["ms"][k] for s in bench["samples"] if s["key"] == side]
            for side in ["baseline", "candidate"]
        ]
        x, y = times
        w(
            f"| {k} | {f(st.median(x))} ({f(min(x))}–{f(max(x))}) | {f(st.median(y))} ({f(min(y))}–{f(max(y))}) | {delta(st.median(x), st.median(y))} |"
        )
    w(
        "\n`physical-800` 是 799 行注释加一次输出，不代表 800 行密集计算；`calls-30` 是函数调用循环，`branch-loop` 是解释循环，`sample_matmul` 同时涵盖函数、容器、生成器与格式化。boot 和文件首轮 JIT 对热身敏感。退步项目不可用另一负载的收益抵消。\n"
    )
    m4, m5 = [next(row for row in side["runs"] if row["name"] == "sample_matmul") for side in [pa, pb]]
    counters = [dict(x["topCalls"]) for x in (m4, m5)]
    common = [
        n
        for n in ("nameEq776 %s %s", "compareText %s %s", "cellResolve763 %s %s")
        if all(n in c for c in counters)
    ]
    w(
        "矩阵样例中的实际过程调度计数（基线 → 候选）："
        + "；".join(f"`{n}` {counters[0][n]:,} → {counters[1][n]:,}" for n in common)
        + "。这说明标识符/作用域处理仍是高频工作，不证明该过程占用了相同比例的 CPU 时间。对首轮 RUN 的波动，应将反序列化、VM 执行缓存准备和 MiniPy 初始化分段测量；对矩阵计算，应分开计量索引、方法绑定和帧复制，再选择下一项优化。\n"
    )
    w("| 分析工作负载 | 基线观测列表单元峰值 | 候选 | 变化 |\n|---|---:|---:|---:|")
    for x, y in zip(pa["runs"], pb["runs"], strict=True):
        w(
            f"| {x['name']} | {x['peakCells']:,} | {y['peakCells']:,} | {delta(x['peakCells'], y['peakCells'])} |"
        )
    w(
        "\n以上是**单独开启分析时，每次 `_step` 返回后能看见的 Interpreter 本地列表单元总数的最大值**，含常驻表，不含 stage、字符串容量和步内瞬时分配，不是内存字节或真正堆峰值。过程调用前 16 名见 profile 原始 JSON；不拿插桩耗时和无插桩计时混算。\n"
    )
    w("## 4. 十二维验收及剩余工作\n")
    w("| 原则 | 证据与边界 |\n|---|---|")
    items = [
        ("正确性", "严格回放及二次 CPython 对照如上；剩余失败保留在清单。"),
        ("简洁性", "块数、分支、调用点见上；去除 132 个单写单读暂存中转。"),
        (
            "一致性",
            "RUN/STEP 共用一个内置执行体；一套帧布局生成入栈/出栈；模块级与局部可变别名共用作用域单元。值堆仍有多种协议。",
        ),
        (
            "高效性",
            "同机多轮耗时和波动如上；布局配对消除逐行向后找结束行。单项退步或波动大的负载应扩大样本再定论。",
        ),
        ("轻量性", "归档、JSON、变量/列表均静态实测；资源哈希不变。暂存单元是采样下界，未精测宿主堆。"),
        (
            "稳定性",
            "两侧均执行 60 次不复位连续 RUN；暂停/HALT 后新 RUN、输入、超限恢复见 lifecycle 原始检查。未做数小时浸泡。",
        ),
        ("可维护性", "静态调用边见上；增加帧字段只改 frames 的一份声明。未对人类修复工时作虚假估算。"),
        ("可扩展性", "8 个迁移补丁职责显式；后续补丁直接读 v5 锁定核心。未为测行数而扩大语言范围。"),
        (
            "可测试性",
            "四项构建单元测试、真实 VM 集成、冻结和实时 oracle、故障恢复、双 VM 与性能套件可分别执行。不是逐积木路径覆盖率。",
        ),
        (
            "可调试性",
            "错误行和 `Code`/映射有断言；可离线反汇编和读取真实运行后的状态；核心不挂调试监听。",
        ),
        ("可预测性", "同工具链字节级重建、原始分布、超限与恢复均有检查；不固定 Python 允许随机的行为。"),
        (
            "可移植性",
            "另在仓库 scratch-vm 2.1.46 源码入口运行 21 项组合（基线 14/21、候选 21/21）；5.0.300 是主验收环境。未实测新版在可视 Scratch/CCW 编辑器的导入及交互，不以静态资源验证替代。",
        ),
    ]
    for n, s in items:
        w(f"| {n} | {s} |")
    w(
        "\n**判定：交付新核心候选，不宣布全量重写验收完成。** 优先处理共享子容器与绑定/视图剩余差异，再拆解大表达式和语句分派过程；发布前需真实编辑器交互、长时压力及更精确的内存测量。后续不能以删除基线可用特性或放宽 oracle 来关单。"
    )
    (ROOT / "REPORT.md").write_text("\n".join(out) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
