# MiniPy v4.221 更新说明

**构建**：`MiniPy_v4.221.sb3`（2026-11-08，41,531 块，check41 errors=0）
**主题**：**TurboWarp 兼容修复（P709）**——v4.220 收到用户报告：TurboWarp 下运行报
`SyntaxError: missing expression`。本轮定位到根因并用一个补丁修掉，解释器语义在两个
VM 下完全一致。

## 一、根因（TurboWarp 把 '\t' 当数字 0）

TurboWarp 的 `Cast.compare` 把 vanilla scratch-vm 的空白特判：

```js
if (n1 === 0 && Cast.isWhiteSpace(v1)) n1 = NaN;   // vanilla
```

换成了自己的 `isNotActuallyZero`：

```js
if (n1 === 0 && isNotActuallyZero(v1)) n1 = NaN;   // TurboWarp
```

`isNotActuallyZero` 对**逐字符**扫描，串里含 `'0'`(code 48) 或 `'\t'`(code 9) 才视作
真零——TurboWarp 出于兼容 scratch-www 老版 `trim()` polyfill（官方 issue #115）**故意把
tab 当作数字 0**。于是 TurboWarp 下：

- `'0' == '\t'` → `0 == 0` → **真**（vanilla 为假）
- `' ' == '\t'` → `0 == 0` → **真**

MiniPy 有 12 处 `单字符 == '\t'` 的字面量比较（tokenize / ssplitw / srsplitw / trimsp /
checkASCII / prepare / stabs / reprval）。tokenize 判空白时，源码里的**字符 '0'** 命中
`ec == '\t'` 被当空白吞掉：`x[0]` 变 `x[]`、`total(1, 2, 3, 4)` 的记号流错乱 →
eval 报 "SyntaxError: missing expression"。vanilla 一切正常，所以 931 例套件从未暴露。

**排查路径**（复用价值）：浏览器 turbowarp.org 页内 `window.vm.loadProject()` 复现 →
排除编译器（弃编栈溢出，本就跑解释模式）、排除 warpTimer、排除时序（手动 `_step()` 确定性
失败）、排除块图差异（9 处 next 共享块 TW 原样保留）→ 块级逐块 trace（钩
`execute.js`，TW 签名 `(sequencer, thread)`）→ 第一个分歧 = tokenize 里
`ec==' ' or ec=='\t'` 的 IFELSE 两 VM 走了不同分支 → 块级探针（THEN 头插
`add Dbg (ec)`）证实 TW 以 `ec="0"` 进入空白分支 → 对比 cast.js 源码定位。

## 二、P709 修法（p709.txt）

把 `X == '\t'` 全部改写为 `join('x', X) == join('x', '\t')`：两侧都带前缀 `'x'`，
`Number()` 恒为 NaN，两个 VM 都退化为**纯字符串比较**，语义完全一致
（`'x\t'=='x\t'` 真；`'x0'`/`'x '`/`'x'` 假）。12 处全部改写，补丁内置 `expect 12` 守卫。

剩余理论风险（已评估、套件兜底）：`=='0'` 共 38 处，若被比较值含 `'\t'` 在 TW 下会误判；
但 tokenize 的 3 处在 prepare 把 tab 归一化后安全，数值解析/格式化处（floatfmt/bgops 等）
输入不会有 tab。**TurboWarp VM 下 681 例 cov 全过**即为实证。

## 三、验证矩阵

| 环境 | 套件 | 结果 |
|---|---|---|
| vanilla 5.0.300（本地 runner） | 主 168 + cov 681 + gap 82 | **全绿** |
| TurboWarp VM 2.1.46（本地 src） | demo 20/20、主 168、gap 82、cov 681 | **全绿** |
| turbowarp.org 真实站点 | demo1 完整输出 `12/Hello, MiniPy/Yo, Py/10`，Finished | **通过** |

## 四、新增调试基建（_work/v41/）

- `_tw_cases.cjs <sb3> <cases.json> [out]`：**TurboWarp VM 批量 runner**（本地 TW 源码
  require + 手动 `_step()`，与 run_iso 同款对比逻辑）。
- `_tw_trace.cjs <tw|van>`：块级执行 trace（钩 `engine/execute.js`），两 VM 对比找分歧。
- `_tw_probe.cjs <tw|van> <sb3> [case]`：单例运行 + Dbg 列表 dump（配合块级探针 sb3）。
- `_serve_cors.cjs [port]`：CORS 静态服务，供 turbowarp.org 页内 fetch sb3。

**注意**：TurboWarp 是第三方运行环境，`Cast` 层还有其他微调（isInt 用 Math.floor 而非
parseInt 等）；今后在 TW 下遇到"vanilla 全绿但 TW 报错"的问题，优先怀疑 cast/compare
语义差异，用 `_tw_trace.cjs` 直接对比。

## 五、复跑命令

```
cd _work/v41
node assemble219.cjs
V41_OUT=../../MiniPy_v4.221.sb3 V41_STAMP="MiniPy v4.221 - built 2026-11-08" node build41.js
node check41.cjs ../../MiniPy_v4.221.sb3
node runall.mjs ../../MiniPy_v4.221.sb3 _res221main _new*.txt          # vanilla 主套件
node run_iso.mjs ../../MiniPy_v4.221.sb3 _gap131.json _gap131.v221.json g221
node _tw_cases.cjs ../../MiniPy_v4.221.sb3 demos_v4220.json            # TW demo
node _tw_cases.cjs ../../MiniPy_v4.221.sb3 _new_all.json               # TW 主套件
```

## 六、下一轮建议

沿 v4.219 §七不变；另可考虑把 `isNotActuallyZero` 相关的 TW 差异写成一份
"TurboWarp 语义差异清单"（含本例），随 README 归档。
