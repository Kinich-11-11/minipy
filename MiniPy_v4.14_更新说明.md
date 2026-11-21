# MiniPy v4.14 更新说明

本轮补上 **f-string**（A9）。另外把"单行复合语句"（A20）的补丁写完并实测，但它在循环上引入了不稳定，
**本轮先不启用**（细节见 §3）。产物 `MiniPy_v4.14.sb3`（Interpreter 6,116 → 6,220 块，共 7,626 块）。

## 0. 效果（真实 scratch-vm 5.0.300 无头 + CPython 3.14 真值）

| 用例集 | v4 | v4.10 | v4.11 | v4.12 | v4.13 | **v4.14** |
|---|---|---|---|---|---|---|
| 缺口清单（39 条） | 0/39 | 16/39 | 18/39 | 22/39 | 23/39 | **24/39** |
| f-string 专项 `fstr.json`（8 条） | 0/8 | — | — | 0/8 | 0/8 | **8/8** |
| 字符串方法 `str.json`（12） | — | — | — | 0/12 | 12/12 | 12/12 |
| 方法链 `chain.json`（4） | — | — | — | 0/4 | 4/4 | 4/4 |
| 函数/语句 `func.json`（31） | — | 0/31 | 20/20 | 31/31 | 31/31 | 31/31 |
| 原有回归（15） | 11/15 | 14/15 | 14/15 | 14/15 | 14/15 | 14/15 |
| 结构体检 | 0 err | 0 err | 0 err | 0 err | 0 err | **0 err** |

## 1. f-string（A9）

| 例子 | 结果 |
|---|---|
| `x = 3` + `print(f"v={x}")` | `v=3` |
| `a=2; b=5` + `f"{a}+{b}={a+b}"` | `2+5=7` |
| `f"hi {name}!"`（字符串插值） | `hi bob!` |
| `f"{1 > 2} {2 > 1}"`（布尔按 Python 打印） | `False True` |
| 出现在列表、函数体内、作为实参 | 都可用 |

实现：
* 分词器里，标识符分支在读完 `f` 之后若紧跟引号，就把整段字符串读成一个记号，
  并把刚 append 的 `Tok`/`Kind` 就地改写成"内容"+"类型 F"。
* 新增自制积木 `fstr %s`：逐字符扫描（`{{` 转义成 `{`），遇到 `{...}` 就取里面的表达式文本，
  `tokenize` → `eval(1, len(Tok))` → `strval`，把结果拼进输出串。
* 因为内层 `tokenize` 会冲掉当前行的记号，`atom` 处理完 f-string 后立刻 `tokenize(Code[pc])` 复原。

## 2. 本轮踩坑

* 内层表达式求值会让 `Tok` 变成"内层表达式的记号"——必须在 `atom` 里显式复原，否则同一行后续的
  运算符扫描会读到错误的记号。
* 判断字符串内容时要小心 Scratch 的 `contains`（大小写不敏感）——f-string 的扫描是逐字符比较，不受影响。

## 3. 单行复合语句（A20）：补丁已写，暂不启用

`_work/v41/p22.txt` 已经实现了 `if x: y` / `while x: y` / `for i in ...: y` 需要的全部部件：

* `prepare` 里增加 `SCut` 列表（该行顶层 `:` 的位置），并放宽"必须有缩进块"、"冒号必须在行尾"的校验；
* `execute` 开头把这种行**先截断成头部**（`toksrc` + `tokenize`）再交给原有逻辑，于是 `conditional`/`forloop` 无需改地址判断；
* 新增 `runtail` 过程：把 `:` 之后的记号重建成一行、`tokenize` 后递归 `execute`，最后复原原行记号；
* `boundary` 的循环续行改成"单行循环时跑 `runtail` 而不是跳到下一行"。

把它加进 `assemble.cjs` 的 parts 列表即可启用——但实测在**块状循环**（`while x:\n    ...`）上会丢迭代，
且单行循环会挂死解释器，所以本轮不发布，留作 v4.15 的第一件事（需要一个更干净的方案：
要么给"单行体"一个虚拟行号，要么把 `boundary` 的循环推进逻辑整段重写）。

## 4. 仍未做（v4.15 候选）

* 单行复合语句（A20，见上）、括号续行（A21）。
* `try/except/raise`（A5，异常类名已就位）、`class`（A4）、`import math`（A7）、`yield`（A8）。
* 位运算（A16）、`%` 格式化（A18）、dict / tuple / set 与嵌套列表（A12/A12b/A13）、推导式（A14）。
* `float` 独立 repr（B2）、列表别名语义（B5）、`divmod`（A24，需要元组）。

## 5. 复现

```powershell
node _work/v41/assemble.cjs && node _work/v41/build41.js      # -> MiniPy_v4.14.sb3
$env:V41_SKIP='P21 f-strings'; node _work/v41/build41.js      # 重建 v4.13

node _work/v41/check41.cjs MiniPy_v4.14.sb3
node _work/v41/run.mjs MiniPy_v4.14.sb3 _work/v41/fstr.json     # 8/8
node _work/v41/run.mjs MiniPy_v4.14.sb3 _work/v41/gaps.json     # 24/39
node _work/v41/run.mjs MiniPy_v4.14.sb3 _work/v41/regress.json  # 14/15
```
