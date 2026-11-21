# 第 38 轮：多行字符串（joinlines 三引号续行）——补丁已成型但尚未生效

## 目标

用户第一个程序里的**多行 docstring**：

```python
def make_student(name, *scores, city="Beijing", **extra):
    """Build a student record.

    name: student name
    ...
    """
```

单行 `"""doc"""` 已在 v4.152 修好；多行仍报 `SyntaxError: unclosed string`。

## 已经查清的结构

程序在进入解释器前是**按行**处理的（`Code` 每条一行），`joinlines` 负责把"没结束的行"并起来：

```
for xgi in 1..len(Code):
    xgc = Code[xgi] ; xgj = 0
    repeat until xgj == 1:
        <扫 xgc：xgd = 括号深度，xgs = 当前字符串引号（空=不在字符串里），xgk = 字符位置>
        if <行尾是反斜杠>:            xgb = 1        # 显式续行
        if NOT(xgs == ""):            xgb = 0        # ← 字符串没闭合就**取消**续行
        if xgd > 0 or xgb == 1:
            if xgb == 1: <剪掉行尾一个字符>
            xgi += 1 ; xgc = xgc & (" " & trimsp(Code[xgi]))
        else: xgj = 1
```

**病根就是那句 `if NOT(xgs == ""): xgb = 0`** —— 它把"行末在字符串里"一律当成"不续行"，
而三引号字符串恰恰需要续行。

## P246（已写好、能干净地打上，但**尚未生效**）

在 `joinlines` 的扫描里区分单引号 / 三引号（新增 `xgt`/`xgsep`）：

1. 打开字符串时若后面两个字符也是同一引号 → `xgt = 1` 并跳过这两个引号；
2. 闭合判定：三引号串要求接下来三个字符都是该引号（闭合后跳过两个）；
3. 行末仍在字符串里：**三引号 → `xgb = 1`（续行）+ 分隔符换行**；单引号 → 维持原行为；
4. 并的时候只有行尾**确实是反斜杠**才剪掉它（三引号续行没有反斜杠），并用 `xgsep` 连接。

构建日志确认 `[P246] triple-quote tracking installed in joinlines`，且**无回归**
（`_paren2` 15/15、`_setflt` 15/15、`_nest` 24/24、`_comp` 12/12、`_fstring` 17/18 全部不变），
但 `_orig`/`_orig2` 的多行用例**没有变化**（仍 3/4、6/8）——说明续行没有真正发生。

**踩坑记录（三个 matcher 错误，逐个修好）**：
* `xgs = ""` 有两处赋值（行首复位 + 闭合），要按"父块是 `control_if`"取闭合那处；
* `xgb = 0` 同样有两处，要取"在 `NOT(xgs=="")` 守卫里"的那处；
* Scratch 里 `parent` 对**链上的后续语句**指向的是**前一条语句**，不是容器 —— 判断"最近的
  enclosing `control_if`"必须沿 `parent` 一路向上走（`nearestIf`），不能用 `BL()[id].parent`。

## 下一步（第 39 轮）

不要继续盲改，先**打点**：在 `joinlines` 每行结束时把 `xgi / xgs / xgt / xgb / len(xgc)` 记到一个
字符串里，并在 `xgj = 1`（决定不再续行）处或 `New2` 追加后 `fail` 出来，看多行 docstring 那一行
到底走了哪条分支、`xgt` 有没有被置 1（怀疑点：`xgch` 与 `xgs` 的取值时序，或 `joinlines`
在 `prepare` 里根本没被调用到那条路径上）。
另外要确认 `joinlines` 是否真的在 `prepare` 流程里被调用（`callers.cjs joinlines`），
若调用点存在但顺序在 `splitlines` 之后，三引号续行也会被 `splitlines` 破坏。
