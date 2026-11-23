# MiniPy 网页版 `print` 卡死 — 诊断与修复报告

对象作品：https://world.xiaomawang.com/community/main/compose/yvF6J66J
最后更新：2026-10-25（第二轮：补充 shadow 隐患分析，重建 v4.198）

## 一句话结论

**不是 `print` 的解释逻辑坏了。是作品上传到小码王社区后，平台的「sb3 → project.json」导入流程（等于 scratch-vm 载入后重新 `toJSON()`）把一个积木删掉了，留下 5 个悬空引用；网页播放器的 VM 一执行到 print 的必经路径就每帧抛异常，解释器卡死。**

- 出问题的积木：`data_variable`（读变量 `ev`，id `5743ff04c60047908f44`），在 sb3 里被 **6 个 input 同时引用**（多父级，非法积木图）。
- 平台的序列化器会把 `data_variable` / `data_listcontents` 压成基本类型（`[12,...]` / `[13,...]`）并从积木表里删掉；`compressInputTree` 只在**第一个**引用处完成替换，其余引用直接悬空。
- 网页播放器 VM 的积木缓存读到 null → `TypeError: Cannot read properties of null (reading '_isHat')`，反复抛错 → `pc=6 / steps=4` 卡在 `print(area(3, 4))`，CONSOLE 永远空白。
- 本地播放器不删积木、也不因共享积木抛错，所以「本地正常、网页卡死」。

## 平台导入流程（已定位到具体代码）

平台播放器 bundle `xmscp.3.ab95dc7c6ad9b9f048c1.js` 里就是 scratch-vm 的 sb3 序列化器：

- `serializePrimitiveBlock`：`data_variable` / `data_listcontents` 一律序列化成 `[12, name, id]` / `[13, name, listId]`（不管被引用几次）；
- `compressInputTree`：遍历每个积木的 inputs，遇到指向「基本类型积木」的引用就替换成基本类型并 `delete blocks[id]`；
- 因为删除后后面再遇到同一积木的引用时 `blocks[id]` 已经是 `undefined`，那些引用就被原样留下 → **悬空引用**。

用本地同版本 scratch-vm（5.0.300，`run.mjs` 用的那个）对原版 v4.197 做「载入 → `toJSON()`」，得到的结果和线上实际下发的 project.json **逐 id 一致**：

| | 原版 v4.197 载入后再序列化 | 线上实际文件 |
|---|---|---|
| 被内联删除 | 112 个（data_variable / data_listcontents） | 112 个 ✅ |
| 悬空引用 | 5 个，全部指向 `5743ff04…` | 5 个，id/槽位完全相同 ✅ |
| 另删除 | — | 7 个 argument reporter（见下） |
| 另新增 | — | 2 个（平台加的 `enhance_setFramerate` + 绿旗帽） |

## 网页端复现与对照实验（browser-use 实测）

1. 打开作品页 → 绿旗 → RUN（DEMO「# Functions」，第 6 行 `print(area(3, 4))`）。
2. 状态 `Running`，但 `pc=6 / steps=4` 不再前进，CONSOLE 空白。
3. 捕获异常：`Cannot read properties of null (reading '_isHat')`，栈在 `xmscp.3.*.js` 的 `getCached`（scratch-vm 的 BlockCached）。
4. **只把那一个缺失积木补回页面 VM**（其余不动）→ 立刻 `status=Finished, steps=8, Output="12,Hello, MiniPy,Yo, Py"`。

## 隐患二：2043 个 `argument_reporter` 被错标成 shadow

线上文件比「载入后再序列化」的结果**还少了 7 个** `argument_reporter_string_number`，它们的输入被折叠成 shadow 字面量：

- `scrollone %s %s` 的 `zone` ×3、`dir` ×3 → 输入变成 `[1,[4,"0"]]`
- `loadCode %s` 的 `source` ×1 → 输入变成 `[1,[10,""]]`

原因：这些「函数体里正常使用的参数积木」在 sb3 里被 `sb3lib.js` 的 `argReporter()` 标成了 `shadow: true`。全项目这类积木共 **2043 个**（Controller 15 + Interpreter 2028），其中 7 个在导入时被折叠成常量，其余 2036 个却保留——**平台的确切判定规则尚未还原**，但「身体里用的积木不该带 shadow 标记」本身是错的，且是唯一能把 7 个异常挑出来的共同特征。

后果：网页端 `scrollone`（变量面板滚动）和 `loadCode`（导入代码）实际拿到的是 `0` / `""`，行为与本地不一致。

**修复**：`webfix` 现在默认把所有「被类型 2/3 输入引用、却标记 shadow:true」的积木改成 `shadow: false`（原型上的 shadow 参数积木用类型 1 引用，不受影响）。v4.198 中该计数为 **0**。

## 隐患三：7 处 `next` 共享积木（保留，无害）

Interpreter 里还有 7 个积木同时是两条语句链的 `next`（结构非法，是构建器历史补丁留下的）。已核查：全部可达、链很短（最多 23 块），本地与线上执行结果一致，平台导入也原样保留，不影响运行。为避免无谓改动块数，本次**不修改**，仅记录。

## 修复实现

1. `_work/v41/webfix.cjs`（后处理，三步）
   - 被多处引用的 `data_variable` / `data_listcontents` → 在每个引用处内联成基本类型并删除积木；
   - 其它多输入引用的积木 → 深克隆，保证每个引用各有一个积木（本次 6 个，+27 块）；
   - 被类型 2/3 引用却标 `shadow:true` 的积木 → 改 `shadow:false`（本次 2043 个）；
   - 最后再做一次悬空引用校验。
2. `_work/v41/build41.js`：构建末尾自动调用，日志
   `[webfix] multi-owned reporters inlined=1 cloned=6 shadow-flag-fixed=2043 dangling=0 (next-shared blocks left as-is: 7)`，有悬空引用即构建失败。
3. **重建产物 `MiniPy_v4.198.sb3`**（896,685 B，元信息 `MiniPy v4.198 - built 2026-10-25`）。
   另外把同一套修复应用到已发布的 v4.197：`MiniPy_v4.197_webfix.sb3`（二者 Python 语义完全相同，任选其一上传）。

## 验证结果

| 检查 | v4.197 原版 | v4.198 |
|---|---|---|
| `validate_web.cjs`：悬空引用 | 0 | 0 |
| 多引用可内联报告器 | 1 | **0** |
| 被当作真实积木使用的 shadow 标记块 | **2043** | **0** |
| 7 个 next 共享块 | 7 | 7（保留） |
| 模拟平台导入（内联规则）后悬空引用 | **5**（与线上一致） | **0** |
| scratch-vm 载入→`toJSON()`（平台同款逻辑）后悬空引用 | **5** | **0** |
| 本地回归 `_cov1.._covZ` 581 例 | 508 pass / 73 fail | 508 pass / 73 fail |
| 581 例逐例输出对比 | — | 仅 3 例不同，且差异只是 CPython 内存地址 / 耗时字段，MiniPy 输出完全一致 |
| DEMO（functions / print / dict / str）4 例 | 4/4 | 4/4 |

## 仍然存在的未知 / 复验建议

1. 平台把那 7 个 shadow 积木折叠成常量的**确切规则没有确认**（同为 `shadow:true` 的另外 2036 个被保留）。`shadow:false` 是基于「正确标记 + 唯一共同特征」的防御性修复，**上传后请复验**：VARIABLES 面板滚动是否正常、IMPORT 导入代码是否正常。
2. v4.198 只在本地同款 scratch-vm 上验证过「导入后无悬空、行为与 v4.197 一致」；线上验证需要重新上传一次（平台服务端不可本地调用）。
3. **v4.190 ~ v4.197 都有同样的两个隐患**，重传任何旧版前先跑：
   `node _work/v41/webfix.cjs 旧.sb3 新.sb3`。
4. v5 / v6 / v7 目前检查是干净的（`validate_web.cjs` 三项全 0）。

## 复现 / 验证命令

```bash
# 结构体检（悬空引用 / 多引用报告器 / shadow 误标）
node _work/v41/validate_web.cjs MiniPy_v4.198.sb3

# 模拟社区导入器（只会内联简单报告器）
node _work/v41/sim_importer.cjs MiniPy_v4.197.sb3     # -> dangling 5

# 走一遍和平台等价的 scratch-vm 载入→toJSON
node _work/v41/roundtrip_vm.mjs MiniPy_v4.198.sb3 out.json

# 修复 + 重新打包
node _work/v41/webfix.cjs MiniPy_v4.197.sb3 MiniPy_v4.197_webfix.sb3

# 重新构建（已内置修复）
node _work/v41/build41.js          # -> MiniPy_v4.198.sb3

# 本地回归
node _work/v41/runall.mjs MiniPy_v4.198.sb3 _out _cov1.txt ... _covZ.txt
```

诊断用的平台原始文件：`_work/web/deployed.sb3`（线上实际下发的 project.json）。
