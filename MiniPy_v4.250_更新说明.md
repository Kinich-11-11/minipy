# MiniPy v4.250：合并云端 v4.249 与本地 P819 生成器异常修复

## 版本关系

本版本不是简单改名，而是以云端另一套 v4.249 为基线，再叠加本地 v4.249-P819 的生成器异常修复链；两个来源版本均保留。

- **云端基线**：GitHub `origin/fix/v4.249-regression`，commit `5df38fe4`
  - P790：链式调用普通值后的 `TypeError`
  - P791：数值等价字典键
  - P792：字符串键查找性能优化
  - 本地保留副本：`MiniPy_v4.249-cloud.sb3`
- **本地修复来源**：本地 P819 生成器异常修复版
  - P801：缓存已处理的 `generator.throw`，抑制重复注入
  - late list-alias restore：恢复嵌套生成器异常处理后的共享列表副作用
  - 本地保留副本：`MiniPy_v4.249-local-p819.sb3`
- **合并产物**：`MiniPy_v4.250.sb3`
- **可重建脚本**：`_work/v41/build250merge.cjs`

历史文件 `MiniPy_v4.249.sb3` 与 `MiniPy_v4.248.sb3` 未覆盖。

## 结构检查

使用：

```bash
node _work/v41/check41.cjs MiniPy_v4.250.sb3
```

结果：

- Stage：24 blocks
- Controller：2,197 blocks
- TextRenderer：234 blocks
- Interpreter：61,447 blocks
- 合计：**63,902 blocks，0 errors**

## 回归验证

测试环境：Scratch VM `5.0.300`，真实 `RUN` 广播入口，Turbo，共享 VM 连续执行；CPython 参考解释器为本机 `Python 3.14.10`。输出与异常采用差分 oracle；没有断言 traceback 行号、内存地址、对象 id、哈希顺序或 GC 时机。

### 云端 v4.249 回归组

使用云端提交附带的 `_v249_probe.txt`：

- J01–J22：22/22
- 新增边界与压力用例：12/12
- 合计：**34/34 PASS**
- 其中 Tdict500 字符串键：输出 `500 41541750`

### 收尾定向组

使用 `_work/v41/_closeout_v248_seed.json`，共享 VM：

- **12/16 PASS**
- 通过：`gen-L3-02`、`gen-L3-03`、`gen-L3-04`、`gen-L4-01`、`with-L4-01`、closure/object/iterator/control/eval/sort/genexp 定向用例
- `gen-L4-01` 已验证：`sub-caught → throw-return(2) → sub-finally → outer-finally → done`

## XFAIL / 已知限制

以下不作为本次合并失败处理，均保留为已知限制：

1. **`gen-L3-01`：首次 `send(non-None)` 的副作用顺序仍不一致**
   - 当前实际缺少 `entered` 事件；异常类型与后续 `next()` 结果正确。
   - 标记：**XFAIL；需人工确认**（依赖异常/生成器入口模拟）。
2. **`dict-L3-01`：动态 `dict.keys()/values()/items()` view 尚未实现为实时视图**
   - 当前仍返回修改前快照。
   - 标记：**XFAIL；需人工确认**（能力缺口，不是本轮合并回归引入）。
3. **`stress-L5-01`、`stress-L5-02`：12 秒预算内未完成**
   - 标记：**XFAIL；Scratch 风险**（依赖执行步数、Turbo、重绘/调度与机器负载）；不据此断言 Python 语义错误。

本轮未宣称完整 Python 兼容率，也未重跑全部历史 345 项报告用例。

## SHA-256

- `MiniPy_v4.250.sb3`：`E3B80DB5B63A619C750BBA15FF4A9CA360C8B453508C4A03613C6462075BA5FD`
- `MiniPy_v4.249-cloud.sb3`：`DD1D4DE816CBB292C8FEEE63AE268042CE924DBA4DBE588D7FA47C165AAAB5E8`
- `MiniPy_v4.249-local-p819.sb3`：`139147246D0B2E9A81FF6E3DA58B1215E6A34C7345E22CE84C846D73014DFA12`

## 复现

```powershell
$env:V41_SRC = "$pwd\MiniPy_v4.249-cloud.sb3"
$env:V41_OUT = "$pwd\MiniPy_v4.250.sb3"
$env:V41_JSON = "$pwd\_work\v41\project250-merge.json"
$env:V41_STAMP = 'MiniPy v4.250 merged cloud v4.249 + local P819'
node _work/v41/build250merge.cjs
node _work/v41/check41.cjs MiniPy_v4.250.sb3

$env:MINIPY_VM = "$pwd\_work\vm5300\node_modules\scratch-vm"
$env:PYEXE = 'python'
$env:MINIPY_TURBO = '1'
$env:MINIPY_MAX_MS = '12000'
$env:MINIPY_MAX_STEPS = '20000'
node _work/v41/runrepair.mjs MiniPy_v4.250.sb3 _work/v41/_v249_probe.txt --shared
node _work/v41/runrepair.mjs MiniPy_v4.250.sb3 _work/v41/_closeout_v248_seed.json --shared
```
