# MiniPy v4.18 更新说明

本轮修 **`math.*` 的返回值类型**（A22 收尾）与两处报错文案。产物 `MiniPy_v4.18.sb3`
（Interpreter 7,639 → 7,649 块，共 8,984 块）。

## 0. 效果（真实 scratch-vm 5.0.300 无头 + CPython 3.14 真值）

| 用例集 | v4.10 | v4.11 | v4.12 | v4.13 | v4.14 | v4.15 | v4.16 | v4.17 | **v4.18** |
|---|---|---|---|---|---|---|---|---|---|
| 缺口清单（39 条） | 16 | 18 | 22 | 23 | 24 | 27 | 28 | 30/39 | **30/39** |
| `math.json`（10 条） | — | — | — | — | — | 1/10 | 1/10 | 1/10 | **7/10** |
| 其余专项（函数/字符串/链/f-string/%/位运算/推导式/布尔/浮点/回归/元组） | — | — | — | — | — | — | — | 全绿 | **全绿** |
| 结构体检 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 err | **0 err** |

## 1. math.* 的返回类型（本轮主线）

CPython 里 `math` 的函数分两类返回值：

* **返回 int**：`floor` `ceil` `trunc` —— `math.floor(1.5)` → `1`；
* **返回 float**：`sqrt` `pow` `exp` `log` `log10` `sin` `cos` `tan` `fabs` `fmod`
  —— `math.sqrt(16)` → `4.0`、`math.pow(2, 10)` → `1024.0`。

v4.15 的 math 分支把两者都当成整数文本输出（`4`），本轮在这 9 个分支的
"赋值 `ev`/`evtype`" 之后补一次 `mkfloat`（P27 里那个"确保文本带小数点"的过程），
`floor`/`ceil`/`trunc` 保持整数不动。

## 2. 报错文案对齐 CPython

* 未 import 就用 `math`：`NameError: name math is not defined`
  → `NameError: name 'math' is not defined. Did you forget to import 'math'?`
* 用了不存在的成员：`AttributeError: math has no nope`
  → `AttributeError: module 'math' has no attribute 'nope'`

## 3. math.json 剩下 3 条为什么还是红的

不是 MiniPy 的行为问题，而是"CPython 真值"这个判据本身的边界：

| 用例 | CPython | MiniPy | 说明 |
|---|---|---|---|
| `import os` + `print(1)` | 打印 `1` | `ImportError: no module named os` | MiniPy 只实现 math，标准库不可能齐 |
| `math.nope(1)` | 抛异常（无输出） | 抛同义异常 | 判据要求"CPython 无 stdout"即算失败 |
| 未 import 使用 `math.floor` | 抛异常（无输出） | 抛同义异常 | 同上 |

## 4. 仍然缺的（下一轮候选）

* A13 嵌套容器：`[[1, 2], [3, 4]]` 仍报 `SyntaxError: parentheses`，`(1, (2, 3))` 打印成 `(1, (), 2, 3)`。
  根因是列表/元组编码不是自描述的（元素里再出现 `lsep` 就分不清层次），
  要改成"长度前缀 + 负载"的自描述编码，是后面字典、嵌套字面量的前置工作。
* A12 字典、A4 类、A5 `try/except`、A8 生成器、A20 单行复合语句、A21 括号续行、B5 列表别名语义。

## 5. 工程笔记

* `mkfloat` 只在"文本里没有小数点"时补 `.0`，所以对已带小数点的浮点结果是幂等的，
  插在 math 分支末尾不会破坏 `math.pi` 这类常量。
* 本轮只改了 `methodcall` 内 math 分支的尾部与两条消息，Interpreter 只增加 10 个方块，
  全量回归（13 个用例集）无回退。
