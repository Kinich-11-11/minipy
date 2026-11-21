# MiniPy v4.15 更新说明

> 补记：本文件是 v4.15 一路重建验证时补齐的说明（v4.15 的产物本身早已随包发布，
> 本轮用 `V41_SKIP='P26,P27,P28'` 重建，与随包文件逐 opcode 直方图 + 变量/列表清单 + 过程名集合
> 完全一致，见 `_work/v41/rebuild-old.ps1` 与 `compare.cjs` 的 `MATCH`）。

v4.15 合并了三个补丁：**math 模块（A7 / A22）**、**% 字符串格式化（A15）**、**位运算（A16）**。
产物 `MiniPy_v4.15.sb3`（Interpreter 6,781 → 6,956 块，共 8,291 块，
其中位运算补丁在 v4.15 内已经落地，v4.16 的说明里也覆盖了同一批用例）。

## 0. 效果

| 用例集 | v4.15 |
|---|---|
| 缺口清单（39 条） | 27/39 |
| math `math.json`（10 条） | 1/10（`math.*` 返回值显示成整数，见下） |
| % 格式化 `pct.json`（8 条） | 8/8 |
| 位运算 `bit.json`（10 条） | 10/10 |
| 回归 `regress.json` | 全部通过 |
| 结构体检 | 0 err |

## 1. math 模块

`import math` 之后 `math.sqrt(16)` / `math.floor(1.5)` / `math.pow(2, 10)` / `math.log(1)` /
`math.sin(0)` / `math.fmod(7, 3)` 等可用；未 import 就调用报 `NameError: name math is not defined`，
用了不存在的成员报 `AttributeError: math has no nope`，`import os` 报 `ImportError: no module named os`。

实现：`execute` 的 import 分支只认 `math`（置 `hasmath`），`methodcall` 开头做 `math.*` 分派。

**已知问题**：`math.*` 的返回值类型标记是整数，`print(math.ceil(3.2))` 输出 `4`（CPython 是 `4.0`），
math.json 的 9 条失败全是这一类；v4.17 仍未修，列在下一轮。

## 2. % 字符串格式化

`'%s-%d' % (a, b)`、`'%05.2f' % x`、`'%r'` 等可用。
实现：`rightside` 在求值右操作数**之前**拦截（运算符为 `%` 且左值是字符串），转交 `pctfmt`。
坑：分段哨兵必须用右括号的位置（不是 `hi-1`，否则最后一个值会被漏掉），
并且"取参数"和"扫描格式串"必须用两个游标。

## 3. 位运算

`6 & 3` → 2、`6 | 3` → 7、`6 ^ 3` → 5、`1 << 4` → 16、`16 >> 2` → 4，可用于条件。
要求非负整数（负数报 `ValueError: bitwise needs non-negative integers`）。
实现：分词器合并 `<<` / `>>`，`rank` 按 Python 优先级重建（or < and < 比较 < `|` < `^` < `&` < 移位 < `+-` < `*//% ` < `**`），
`& | ^` 由新过程 `bitop` 逐位计算，移位用 2 的幂循环。
