# MiniPy v4.10 更新说明

本轮依据 `_work/cmp47/v4_缺失清单.md`，在 **MiniPy_v4.sb3** 的基础上逐条补功能，产物是
`MiniPy_v4.10.sb3`（Interpreter 3,247 → 4,211 块，变量 87 → 150，列表 10 → 13）。

“v4.1x”是 v4 线的增量迭代编号：不动外壳（Stage / Controller / TextRenderer 逐字节沿用），
只改 Interpreter；每一版都由 `_work/v41/build41.js` 从 v4 重新生成（**sb3 是产物，脚本才是真源**）。

## 0. 效果（真实 scratch-vm 5.0.300 无头实测）

| 用例集 | 文件 | v4 | v4.10 |
|---|---|---|---|
| 缺失清单缺口用例 | `_work/v41/gaps.json`（39 条，真值取自 CPython） | **0/39** | **16/39** |
| 原有功能回归 | `_work/v41/regress.json`（15 条） | 11/15 | **14/15** |
| 结构体检 | `_work/v41/check41.cjs` | 0 error | 0 error |

回归集剩下 1 条是 `float('1.5')*2` 打印 `3` 而非 `3.0`（B2，float 独立 repr），
属于值模型层面的改造，留到后续版本。

## 1. 本轮新增（缺口清单 A/B 编号）

| # | 能力 | 例子 → 结果 |
|---|---|---|
| A11 | `True`/`False`/`None` 变成真值（类型 B/Z） | `print(True, False, None)` → `True False None` |
| A17 | `is` / `is not` | `a = None` + `a is None` → `True` |
| A15 | 三元表达式 | `print('big' if x > 3 else 'small')` → `big` |
| A19 | `print(sep=, end=)` | `print('a','b',sep='-')` → `a-b`；`end=''` 不换行 |
| A22 | 列表切片读 | `a[1:3]` → `[2, 3]`（含 `a[:2]` `a[2:]` `a[-2:]`，修掉了原来打印编码串 `N1` 的错答） |
| A22b | 切片赋值 | `a[0:1] = [9]` → `[9, 2, 3]` |
| A22c | 切片删除 | `del a[1:3]` → `[1, 4]` |
| A23 | 列表方法 | `sort / reverse / index / count / insert / remove` |
| A24 | 新增内置（部分） | `sorted([3,1,2])` → `[1, 2, 3]`；`repr('a')` → `'a'`（`divmod` 需元组，未做） |
| A25 | `max/min` 任意参数 | `max(1,5,2)` → `5`（原来泄漏内部错误名 `boperat_...`） |
| A26 | `in`/`not in` 支持列表 | `2 in [1,2]` → `True` |
| A27 | `**=`（顺带修好 `//=`，v4 原本就报错） | `a **= 3` → `8` |
| A28 | 字符串转义 `\" \\` | `print("q\"q")` → `q"q` |
| A29(部分) | — | 未做，见下 |
| B1 | `round()` 改为银行家舍入 | `round(0.5), round(2.5)` → `0 2` |
| B3 | 列表 repr 给字符串加引号 | `print([1, "a"])` → `[1, 'a']` |
| B6 | `str(True)`、比较结果按 True/False 打印 | `str(True), True+True` → `True 2` |
| B7 | `int()`/`float()` 容忍两侧空白 | `int(' 12 ')` → `12`（`int('1 2')` 仍报 ValueError） |

## 2. 本轮踩到的真实坑（给后续维护）

1. **A28 的根因是数据不是代码**：`slash` 变量的初值被写成了两个字符 `"' `，
   于是 `letter = slash` 永远不成立、转义分支形同虚设 → 改成一个反斜杠即可。
2. **递归 eval 会覆盖全局临时量**：三元表达式的 `tif/tel` 被内层 `eval` 重置，
   必须先把分支边界存进 `tifs/tels` 再递归。
3. **参数是只读的**：Scratch 过程参数不能赋值，所以 `rightside` 里的 `lefttype`
   要先拷到变量 `lt2` 再做 "bool 当数字" 的归一化（14 处引用一起重写）。
4. **临时列表会互踩**：`minmax` 曾复用 `Comma`，把 `printargs` 的参数分隔表冲掉，
   导致 `print(max(...), min(...))` 第二个结果错；现在用私有列表 `MComma`。
   `listitem` 内部会写 `lacc`，所以 `listfmt` 必须用自己的累加器。
5. **失败信息别用 `fail` 拼块**：`fail` 的分支里把「块 id 字符串」当成了消息，
   实测错误信息直接打印出 `boperat_sz9akool` → 新增 `FAILB` 明确区分。
6. **补丁锚点要靠结构而不是 JSON 文本**：`JSON.stringify(inputs)` 看不到被引用块的内容，
   凡是「消息在 JOIN 里」的定位都要顺着 `parent` 往上找。
7. 新加的块要挂在链尾之前时，注意 `prependStack`/`insertBeforeStmt` 必须**接整条链**，
   否则链内 `next` 被覆盖、后续块变成孤儿被清理掉（表现为改了半天“没生效”）。

## 3. 还未做（v4.11 候选，按性价比排序）

* **`def` / `return` / 递归 / 局部作用域**（A1、A2、A8 的调用栈部分）——需要帧栈与作用域链，
  是清单里最大的一块。
* `try/except/raise`（A5）、`class`（A4）、`lambda`（A3）——都依赖 A1 的调用栈。
* dict / tuple / set 字面量与下标链（A12、A12b、A13）、推导式（A14）、f-string（A9）。
* 字符串方法（A10）、`%-格式化`（A18）、位运算（A16，Scratch 无位运算块，需手写位循环）。
* 单行复合语句（A20）、括号续行（A21）、`for/while … else`（A29）。
* `float` 独立 repr（B2）、列表别名语义（B5，值语义 vs 引用语义）。

## 4. 复现方式

```powershell
# 1) 从 v4 重新生成 v4.10（真源是补丁脚本，不手改 project.json）
node _work/v41/build41.js                     # -> MiniPy_v4.10.sb3

# 2) 无头跑用例（真实 scratch-vm 5.0.300，真值来自本机 CPython 3.14）
node _work/v41/run.mjs MiniPy_v4.10.sb3 _work/v41/gaps.json    _work/v41/g10.json
node _work/v41/run.mjs MiniPy_v4.10.sb3 _work/v41/regress.json _work/v41/r10.json

# 3) 结构体检（悬空引用 / 孤儿块 / 未定义过程 / 未声明变量）
node _work/v41/check41.cjs MiniPy_v4.10.sb3
```

文件清单：`MiniPy_v4.10.sb3`（交付物）、`_work/v41/build41.js`（生成器）、
`_work/v41/run.mjs`（无头用例跑法）、`_work/v41/gaps.json` / `regress.json`（用例）、
`_work/v41/check41.cjs`（结构体检）、`_work/v41/g10.json` / `r10.json`（本次结果）、
`_work/v41/decomp41.txt`（反编译视图，便于对照阅读）。
