# v4.267：运行代码不再改写编辑器里的源码

## 结论

`Code` 是舞台上的全局列表，既是编辑器显示/编辑的文本，又被 `Interpreter` 当成可变的解析缓冲区。运行前 `splitlines` / `joinlines` / `expandlines` 会清空并重填它，`dqPrep263` 和 `evalCtx828` 会向它追加 `deque` / `gxN` 辅助代码，`execute` 会就地替换装饰器行——于是“运行”把用户的源码改了。

v4.267 给解释器一张独立的本地工作副本 `Src267`：

- RUN 广播的第一个动作由 warp 过程 `srccopy267` 把 `Code` 逐行复制到 `Src267`；
- 解释器内 153 处 `Code` 列表引用全部改指向 `Src267`；
- 编辑器仍然独占 `Code`，运行期间和运行之后都不会被解释器写。

同时保留“当前执行行”标记：三个改行过程在重建工作副本时同步重建 `SrcMap267`（`Src267` 行 → 原始 `Code` 行），`TextRenderer` 用 `SrcMap267[pc]` 而不是 `pc` 去比较。

## 为什么 `SrcMap267` 在舞台上

Scratch VM 的 `lookupVariableById` 只查“本精灵 → 舞台”，不查其他精灵的本地列表。`TextRenderer` 要读映射，所以映射必须放在舞台；工作副本 `Src267` 只有解释器用，放在 `Interpreter` 本地即可。

## 改动清单

| 位置 | 改动 |
|---|---|
| `Interpreter` | 新增列表 `Src267`、`TmpMap267`，变量 `srcI267`、`xgm267` |
| `Interpreter` | 153 处 `LIST: ["Code", ...]` → `["Src267", ...]`（仅保留 `srccopy267` 里 2 处读 `Code`） |
| `Interpreter` | 新增 warp 过程 `srccopy267`，RUN hat 首块调用 |
| `Interpreter` | `splitlines` / `joinlines` / `expandlines` 内联维护 `TmpMap267` → `SrcMap267` |
| `Stage` | 新增全局列表 `SrcMap267` |
| `TextRenderer` | 标记比较 `rline == pc` → `rline == SrcMap267[pc]` |

解释器的词法/语法/执行逻辑未改；`dqPrep263`/`evalCtx828` 仍在工作副本上追加辅助代码，只是不再进入编辑器。

## 验证

```powershell
node _work/v41/v267/build.cjs MiniPy_v4.267.sb3
node _work/v41/check41.cjs MiniPy_v4.267.sb3          # 76,179 blocks, 0 errors
node _work/v41/v267/one_side.cjs MiniPy_v4.266.sb3 _work/v41/v267/side_266.json 1
node _work/v41/v267/one_side.cjs MiniPy_v4.267.sb3 _work/v41/v267/side_267.json 2
node _work/v41/v267/compare_sides.cjs _work/v41/v267/side_266.json _work/v41/v267/side_267.json
node _work/v41/v267/map_check.cjs MiniPy_v4.267.sb3 _work/v41/v267/sample.py
$env:MINIPY_VM = "C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test/node_modules/scratch-vm/dist/node/scratch-vm.js"
node _work/v41/v259/replay-cases.cjs MiniPy_v4.267.sb3 _work/v41/v259/edge-cases.json
node _work/v41/v259/replay-cases.cjs MiniPy_v4.267.sb3 _work/v41/v258/edge-cases.json
node _work/v41/v259/replay-cases.cjs MiniPy_v4.267.sb3 _work/v41/v253/report-cases.json
```

结果：

- 18 段差异用例：输出/错误 18/18 相同；v4.266 有 8 段改写代码，v4.267 0 段；连续两次运行结果一致；
- 行号映射：示例 21 个 `pc` 采样，0 失配；
- v4.259 专项 33/33、v4.258 专项 9/9、v4.253 反馈 79/79；
- 真实 CCW（`ccw.site/gandi`）导入无造型报错，运行示例 `Finished`、输出一致、`Code` 前后相同；
- 800 行程序 4.1s（v4.266 4.4s）。

产物：`MiniPy_v4.267.sb3`，2,393,292 字节，SHA-256
`d8c00d30a80e351a7caab8da304b1e1d3ce00e4fc5e5b84018f13a01bc370341`。

## 已知边界

- `deque` / 生成器辅助行没有原始行号，运行时“当前执行行”标记不会画到用户行上（它们不属于用户源码）。
- 错误信息里的 `Line N` 仍按工作副本行号报告，与 v4.266 相同（v4.266 的工作副本就是被改写后的 `Code`）。
- `Src267` / `SrcMap267` 会保留上次运行的内容并随作品保存；下次 RUN 会先整体覆盖，不影响行为。
