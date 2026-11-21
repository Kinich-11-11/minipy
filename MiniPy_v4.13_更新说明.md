# MiniPy v4.13 更新说明

本轮补上教学代码里最常用的 **字符串方法**（A10），顺带修掉两个 v4 老问题
（字符串字面量 `'-'` 被当成一元负号、方法链不支持）。产物 `MiniPy_v4.13.sb3`
（Interpreter 5,705 → 6,116 块，共 7,522 块）。

## 0. 效果（真实 scratch-vm 5.0.300 无头 + CPython 3.14 真值）

| 用例集 | v4 | v4.10 | v4.11 | v4.12 | **v4.13** |
|---|---|---|---|---|---|
| 缺口清单（39 条） | 0/39 | 16/39 | 18/39 | 22/39 | **23/39** |
| 字符串方法专项 `str.json`（12 条） | 0/12 | 0/12 | 0/12 | 0/12 | **12/12** |
| 方法链专项 `chain.json`（4 条） | 0/4 | 0/4 | 0/4 | 0/4 | **4/4** |
| 函数/语句专项 `func.json`（31 条） | — | 0/31 | 20/20 | 31/31 | **31/31** |
| 原有回归（15 条） | 11/15 | 14/15 | 14/15 | 14/15 | 14/15 |
| 结构体检 | 0 err | 0 err | 0 err | 0 err | **0 err** |

## 1. 本轮新增

| 能力 | 例子 → 结果 |
|---|---|
| `upper` / `lower` | `'Hello World'.upper()` → `HELLO WORLD` |
| `strip` | `'  hi  '.strip()` → `hi` |
| `find` / `count` | `'banana'.count('na')` → `2`；找不到返回 `-1` |
| `replace` | `'a-b-c'.replace('-', '+')` → `a+b+c` |
| `startswith` / `endswith` | 返回布尔（可与 `if` 直接用） |
| `split` / `join` | `'a,b,c'.split(',')` → `['a', 'b', 'c']`；`'-'.join(['x','y'])` → `x-y` |
| **方法链** | `s.strip().lower().replace(' ', '_')`、`'a-b'.replace('-', '+').upper()` |
| 顺带修好 | `'-'.join(a)`：`'-'` 曾被当成一元负号（v4 旧疾，见下） |

## 2. 实现要点与坑

* 字符串方法都写成独立过程（`scase/sfind/scount/srep/sprefix/ssplit/sjoin`），
  `methodcall` 在**接收者是字符串**时走这条分支；参数区间是 `lo+4 .. hi-1`。
* **踩坑 1（Scratch 语义）**：`contains` 是**大小写不敏感**的，用它判断"这个字符是不是小写"
  在 `'o'` 上会命中 `'O'`。改成用 `cs`（ASCII 32..126 表）里的**下标**判断范围
  （a..z 是 66..91，A..Z 是 34..59），索引扫描本身是逐字符比较（大小写敏感）。
* **踩坑 2（老 bug）**：eval 的一元运算符判断只看记号文本，`'-'` 这种字符串字面量会被当成负号，
  于是 `'-'.join(a)` 报 `SyntaxError: expression`。新增 P19 给两处一元判断加了
  "记号类型不是 S" 的前置条件（这两处的 if 里有一个是 `if/else`，定位时别只找 `control_if`）。
* **踩坑 3（嵌套调用踩全局量）**：字符串方法的参数里如果又调方法（`'|'.join(s.split(' '))`），
  内层会改写全局的 `xa/lmeth`。现在**先把参数全部求值完再做分派**，并把接收者/方法名
  压进私有栈（`MRStack/MMStack`）。
* **方法链**用递归实现：`methodcall` 先扫出"第一个不属于本段的右括号"，把整串切成
  `第一段` + `其余`，递归求第一段，再把结果作为接收者（`mcpre` 标志）递归求其余。
  注意两个细节：切点必须满足 `位置 < hi`（否则自我递归死循环，实测会把 node 内存打爆），
  以及递归会复用 `mccut`，外层要先存一份（`mccut2`）。
* 工程教训：**别用 read + write 回写大文件**。本轮 build41.js 一度被截断（读取工具对大文件有上限），
  现在生成器按补丁拆成 `head.txt / p13 / p14 / p15 / p17 / p18 / p19 / p20 / tail.txt`，
  用 `node _work/v41/assemble.cjs` 拼装，单块改动只动相应的小文件。

## 3. 仍未做（v4.14 候选）

* **f-string**（A9）、`try/except/raise`（A5，异常类名已就位）、`class`（A4）、
  `import math`（A7）、`yield`（A8）。
* 单行复合语句 `if x: y`（A20）、括号续行（A21）、位运算（A16）、`%` 格式化（A18）。
* dict / tuple / set 与嵌套列表（A12/A12b/A13）、推导式（A14）——需要新的值类型编码。
* `float` 独立 repr（B2）、列表别名语义（B5）。
* 已知限制：只能对"名字或字面量"取方法/调用（`(lambda x: x)(5)`、`fs[0](7)` 仍不支持）。

## 4. 复现

```powershell
node _work/v41/assemble.cjs        # 由补丁片段拼出 build41.js
node _work/v41/build41.js          # -> MiniPy_v4.13.sb3
$env:V41_SKIP='P18 string methods,P19 kind guards,P20 method chains'; node _work/v41/build41.js   # 重建 v4.12

node _work/v41/check41.cjs MiniPy_v4.13.sb3
node _work/v41/run.mjs MiniPy_v4.13.sb3 _work/v41/str.json     # 12/12
node _work/v41/run.mjs MiniPy_v4.13.sb3 _work/v41/chain.json   # 4/4
node _work/v41/run.mjs MiniPy_v4.13.sb3 _work/v41/func.json    # 31/31
node _work/v41/run.mjs MiniPy_v4.13.sb3 _work/v41/gaps.json    # 23/39
node _work/v41/run.mjs MiniPy_v4.13.sb3 _work/v41/regress.json # 14/15
```
