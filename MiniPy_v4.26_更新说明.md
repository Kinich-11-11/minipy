# MiniPy v4.26 更新说明

本轮补上缺口清单第 5 行「`try/except/else/finally`、`raise`」的核心部分：**`try` + 多个 `except` + 裸 `except` + `raise`**
（`gaps` 35/39 → **36/39**）。

产物 `MiniPy_v4.26.sb3`：Interpreter 8,511 → **8,668** 块，合计 **10,003**，`check41` errors=0。

## 0. 效果

| 用例集 | v4.25 | **v4.26** |
|---|---|---|
| 缺口清单 `gaps`（39 条） | 35/39 | **36/39**（A5 关闭）|
| 异常 `try`（新套件，12 条） | — | **12/12** |
| 其余 19 个套件 | — | 无回退 |

## 1. 实现要点（P51）

* `prepare()` 把 `try` / `except` 纳入「块头」集合（4 条头判断链），并把 `except` / `finally` 纳入 `Elses` 检测——
  这样 `Elses[try 行]` 就是 `except` 行的行号，`Ends[except 行]` 是处理块之后的那一行。
* `execute()` 新增三条语句分支：
  - `try:` 压入一个捕获帧：处理块首行 `TryHand`、处理块之后 `TryEnd`、异常名 `TryName`、
    进入时的循环深度 `TryLoop`、进入时的函数深度 `TryC`；
  - `except` 行在**正常路径**上弹出帧并跳到 `TryEnd`（顺带跳过后面所有 `except` 子句；
    对后面的子句则各自跳到自己的 `Ends`，等于整段跳过）；
  - `raise Name(msg)` / `raise Name` 通过 `fail` 设置 `error`，裸 `raise` 重抛上一次捕获的消息。
* 新增 `trycatch` 过程，插在**两个驱动循环**（主 RUN 循环与 `calluser` 的函数体循环）的 `execute()` 之后：
  `error` 非空时从栈顶向外走帧，名字匹配（用 `startswith`，因为 `ZeroDivisionError` 这类消息**没有冒号**）
  就清错、把 `pc` 指到处理块首行并弹帧；不匹配的帧直接丢弃（它的处理块永远不会执行），于是外层 `try` 有机会接住。
* 帧里记 `cdepth`：**函数体内出错时，外层（cdepth 更浅）的 `try` 必须等函数返回后再接住**，
  不能当场把 `pc` 改到处理块——否则函数体会从处理块那一行继续往下跑。
  因此 catch 只在 `cdepth` 与帧记录一致时生效。

## 2. 踩到的三个坑（都值得记进 README）

1. **`IF()` 没有 else 分支**：本仓库的 `IF(c, ids)` 只接受两个参数；写成 `IF(c, a, b)` 时第三个参数被**静默忽略**。
   处理块匹配、`raise` 语句、`except` 跳转三处都因此「看起来装了但其实没装」，全部改 `IFELSE` 后通过。
2. **别把包装加到外层条件上**：给 `prepare` 的头判断链补 `try/except` 时，按「包含 `prevhead=="def"` 的最外层 OR」来选，
   结果包到了 `not(A) or not(链)` 这一层，`try` 反而被判成 `IndentationError: unexpected indent`；
   改成「只选不含 `not` 的那条链」才对。
3. **两套字面量编码 + find 回调签名**：`[1,[10,"def"]]` 与裸的 `[10,"def"]` 在项目里都存在，比较操作数两种都得认；
   另外 `find(set, pred)` 的回调是 `(block, id)`，把 block 对象传给需要 id 的辅助函数会**静默匹配 0 处**。

## 3. 仍未支持 / 限制

* `finally`、`try/except/else` 的 `else`、`except (A, B):` 元组捕获、以及 `except ... as e:` 的绑定变量都还没有；
  本轮只做 `try` + 单个/多个 `except` + 裸 `except` + `raise`。
* 缺口清单剩余 3 条：A4 类、A8 生成器、B5 别名语义。

## 4. 复现

```
node _work/v41/assemble.cjs        # ... + p34 + p38 + p46..p49 + p51 + tail.txt -> build41.js
node _work/v41/build41.js         # -> MiniPy_v4.26.sb3
node _work/v41/check41.cjs MiniPy_v4.26.sb3
node _work/v41/run.mjs MiniPy_v4.26.sb3 _work/v41/try.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.26.sb3 -out _work/v41/battery_v426_final.txt
pwsh -NoProfile -File _work/v41/rebuild-old.ps1     # v4.10..v4.25 逐字节比对
```
