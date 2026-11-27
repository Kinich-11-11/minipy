# MiniPy v5 核心基座（验收候选）

可编辑的工程在本目录的 **MiniPy_v5-core.sb3**。用兼容 Scratch 3 的编辑器打开，绿旗启动，保留原编辑器的 RUN / STEP / HALT，以及输出、变量和导出面板。无需 Node、Python、自定义扩展或外部服务来解释用户程序；这些工具只在构建与测试时使用。根目录中历史同名 v5/v6/v7 的文件或备份均不是输入。

## 从哪里开始

- `baseline.json`：唯一迁移输入。本地冻结标签 `minipy/v4.267-frozen`。Git 提交 `f7d7835c81cbbcf8ab04c5e0e0798c0cff8381dd` 内根目录的 `MiniPy_v4.267.sb3` 是冻结作品本身。原 HEAD `b26ebc11388137289b17dcfb7e59756363d291a2` 只发布到 v4.259，不能冒充 v4.267 的提交。
- `core-lock.json`：已构建的新基座、校验和、迁移补丁列表。此文件不是自动更新的金样，只有复核报告并决定提升基座时再更新。
- `FEATURES.md`：按语法、运算、内置名、类型/用户方法和模块关联具体回放的功能索引，不以 AST 出现次数冒充覆盖率。
- `ARCHITECTURE.md`：基线能力、数据布局、机制变更、权衡和剩余迁移边界。
- `REPORT.md`：本轮实测、静态统计、基线差异、未达到的标准。`reports/` 含逐例结果和两个版本完整静态目录；静态目录按精灵/过程列出读写、调用、分支深度和规模。

## 构建与增量开发

以下命令从仓库根目录执行。完整重跑两侧测试、生成差分审计与五轮性能报告：`node v5/tests/verify.cjs --bench`。验证环境为 Node 22.19.0；无新增 npm 依赖。用 `git rev-parse f7d7835c:MiniPy_v4.267.sb3` 与 `git hash-object MiniPy_v4.267.sb3` 可单独核对 Git 对象。迁移构建按 SHA-256 核对 SB3 的实际字节，不接受文件名相同的替代输入。

```powershell
node v5/build.cjs
node --test v5/tests/build.test.cjs
node _work/v41/check41.cjs v5/MiniPy_v5-core.sb3
# 指定子系统及其前置依赖（不能写回核心检查点）
node v5/build.cjs --only layout --out layout-test.sb3
# 从新基座开始：不加载旧 SB3，不重放 v4 历史生成脚本
node v5/build.cjs --from-core --out rebuilt.sb3
node v5/build.cjs --from-core --patch ./my-change.cjs --out candidate.sb3
```

每个补丁是普通 CommonJS 模块：`{id, after, writes, apply(project)}`。`after` 列出本次集合里的补丁名；新基座已经包含迁移结果，后续增量无需、也不应依赖它们的名字。`writes` 是有语义的所有权声明，不能用换一个名字来绕过冲突：两个补丁要改同一职责，应合成一个或重新划界。构建器拒绝重复 ID、缺失前置、环和重复职责。声明并不是可以拦截任意 JS 写内存的隔离机制；新增补丁仍须审查和独测。

`apply` 只改内存中的 Scratch 工程。用 `Graph` 和 v4 的 `makeBuilder` 生成标准积木，补丁自己的确定性 ID 流不篡改全局随机函数。每个匹配旧图形状的变换都应断言其前置条件。构建后校验双向所有权、可达性、变量/列表引用、参数签名、资源摘要等，再原子替换目标。无新补丁时可直接复制已经校验哈希的基座，不重新压缩资源。跨 zlib 版本不保证压缩字节相同；使用上述实测工具链验证锁文件。

## 测试与定位

```powershell
# 直接使用仓库中的 stock VM；可用 MINIPY_VM 指向另一个 scratch-vm 入口
node v5/tests/run.cjs MiniPy_v4.267.sb3 v5/reports/baseline.json
node v5/tests/run.cjs v5/MiniPy_v5-core.sb3 v5/reports/candidate.json
# 下面每组对两个作品各跑一次，输出对应的 baseline/candidate 报告
node v5/tests/run.cjs v5/MiniPy_v5-core.sb3 v5/reports/candidate-objects.json objects
node v5/tests/run.cjs v5/MiniPy_v5-core.sb3 v5/reports/candidate-aliases.json aliases
node v5/tests/run.cjs v5/MiniPy_v5-core.sb3 v5/reports/candidate-coverage.json coverage
node v5/tests/run.cjs v5/MiniPy_v5-core.sb3 v5/reports/candidate-extended.json archive,apps
node v5/tests/run.cjs v5/MiniPy_v5-core.sb3 v5/reports/candidate-rest.json archive-rest
node v5/tests/lifecycle.cjs v5/MiniPy_v5-core.sb3 v5/reports/candidate-lifecycle.json
node v5/tests/compare.cjs
node v5/tests/bench.cjs MiniPy_v4.267.sb3 v5/MiniPy_v5-core.sb3 v5/reports/benchmark.json 5
python v5/tools/audit.py v5/MiniPy_v5-core.sb3 v5/reports/candidate-inventory.json
python v5/tools/show.py v5/MiniPy_v5-core.sb3 "dispatch callable %s %s %s %s" --depth 1
node v5/tools/inspect-run.cjs v5/MiniPy_v5-core.sb3 _work/v41/v267/sample.py SrcMap267 Ends Elses FnStack VSave LSave
```

- `run.cjs` 的退出码 **1** 表示至少一项未符合严格 oracle（包括已有差异），**2** 是运行器失败或 RUN 未完成。不能把 1 当作全绿。`compare.cjs` 区分新增回归、修复、两侧仍不符但输出改变；它不替代绝对正确性审查。`PYEXE` 选择实时 CPython；`MINIPY_MAX_MS` 设每次 RUN 的时间上限；`MINIPY_PROFILE=1` 才在 VM 测试侧计数，正式计时不要开启。
- `archive,apps` 是无交互正常路径档案及五个实际程序；`archive-rest` 补齐异常与输入，合计覆盖 593 条档案。`coverage` 是独立的 873 条历史语料。复用的是测试输入/参考输出，不是别的 MiniPy 实现。
- `tests/workspace.cjs` 通过 stock VM 为四个精灵生成并解析实际积木工作区 XML，核对顶层/自定义过程数；这不是可视网页交互测试。
- `tests/lifecycle.cjs` 在一个 VM 内不清理解释器状态，覆盖暂停/HALT、两种输入传输、连续异常/恢复/递归以及超限后的新 RUN。单元测试不修改正式产物。
- 调试不改变发行作品。`show.py` 只反汇编指定过程，`inspect-run.cjs` 观察真实 RUN 结束后的指定列表，`audit.py` 不运行用户代码。宿主只用 `_step` 驱动测试，解释器不依赖这个私有接口。
