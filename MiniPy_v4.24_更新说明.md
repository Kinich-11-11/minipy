# MiniPy v4.24 更新说明

本轮把缺口清单里的 **A13 嵌套容器字面量**整条关掉（`gaps` 33/39 → **34/39**）。
这条从第 20 轮起追了十余轮，最后确认它不是一个 bug，而是**三个互相独立的根因**叠在一起：

| # | 根因 | 典型症状 | 补丁 |
|---|---|---|---|
| ① | `listlit` 不可重入（共享暂存表 + 全局临时变量被内层覆盖） | `x = [[1], 2]` → `SyntaxError: parentheses` | **P46** |
| ② | P34 的元素转义不可叠加（单层 ESC 编码无法表达多层嵌套） | `print([1, [2, [3, 4]]])` → `[1, [2, [], 3, 4]]`，`len(a[1])` = 4 | **P47** |
| ③ | `indexget` 只支持单记号基址 | `a[0][1]` 失败（链式下标） | **P49** |

产物 `MiniPy_v4.24.sb3`：Interpreter 8,041 → **8,193** 块，合计 **9,528**，`check41` errors=0。

## 0. 效果

| 用例集 | v4.23 | **v4.24** |
|---|---|---|
| 缺口清单 `gaps`（39 条） | 33/39 | **34/39**（A13 关闭）|
| 嵌套 `nested2` / `nested` | 7/10 · 8/8 | **10/10 · 8/8** |
| 元组 `tuple` | 17/20 | **20/20** |
| 推导 `comp` | 10/10 | 10/10 |
| 续行 `cont` | 11/12 | **12/12** |
| 回归 `regress` / 函数 `func` | 15/15 · 31/31 | 15/15 · 31/31 |
| 其余套件 | — | 无回退 |

（其余：`one` 10/10、`str` 12/12、`fstr` 8/8、`pct` 8/8、`bit` 10/10、`booljson` 4/4、`float` 10/10、`b2` 13/13；
`math` 7/10、`one2` 11/12、`dict` 0/10 与 v4.23 相同，原因见第 5 节。）

## 1. 根因①：listlit 不可重入（P46）

`listlit`（列表字面量）把「元素边界表」`LComm` 和「已求值元素表」`LOut` 存在**全局**列表里，循环变量
`lpi`/`lplo`/`lphi`/`lacc` 也是全局变量。元素求值时如果又遇到 `[`，`eval` 会再次调用 `listlit`，
而内层开头就是 `clear(LComm)` / `clear(LOut)` —— 外层的状态当场被抹掉。

P44 探针（在 `tokenize` 与 `listlit` 入口/出口打印）跑 `x = [[1], 2]` 拿到确凿证据：

```
TOK pc=1 src=x = [[1], 2]
LITIN  lo=4 hi=8 LComm=0 LOut=0     ← 外层开始，元素区 4..8
LITIN  lo=5 hi=5 LComm=1 LOut=0     ← 外层已记录 1 个顶层逗号，然后递归求值元素 [1]
LITOUT LComm=0 LOut=1 ev=<lsep>N1   ← 内层返回，LComm 被清成 0
Line 1: SyntaxError: parentheses
```

外层随后 `lplo = item lpi of LComm + 1` 在空表上取到空串 → `lplo = 1` → 尾段发出 `eval(1, 8)`，
括号深度从 1 起算 → `SyntaxError: parentheses`。

**修法**：仿已经可重入的 `tuplelit`，在两个递归 `eval` 前后用 `VStack` 保存/恢复外层仍需的状态
（`lpi`、`lplo`、`LComm`、`LOut`），并且**无条件**在 `eval` 返回后立即恢复——
`ev`/`evtype`/`error` 三个输出通道不在保存集合里，所以元素值不会丢。

### 为什么 P42 / P43 / P45 三次都失败

三次都用了同一种写法：**先压长度，再逐项压元素**，恢复时却用 `n = item last of VStack` 读长度。
栈顶是**最后一个元素**而不是长度（只有空表时才碰巧正确），接着 `repeat n: del VStack[last]` 把栈切错，
于是连 `a = [1, 2]` 都跑不动（P45 的 `nested2` 只有 1/10）。
本仓库里可用的写法只有两种：逐个变量压/弹（`tuplelit`）或用 `FrVBase`/`FrLBase` 记基址（`fpush`/`fpop`）。

另一个坑：Scratch 的 `control_repeat_until` 是「条件为**假**时继续」。倒计数循环的判据必须写 `NOT(i > 0)`；
写成 `i > 0` 就一次都不执行（本轮 P46 第一版就踩了这个坑，表现为整张 VStack 被读错位、连普通列表都失败）。

## 2. 根因②：元素转义不可叠加（P47）

P34 把元素文本里的分隔符 `lsep` 换写成 ESC+1 两个字符，`listitem` 每次只还原一层。
问题在于**嵌列表的内层分隔符本身就长这样**：外层再转义时不会再处理它们，于是外层还原一次就
把深层分隔符全部还原成 `lsep`，中层看起来就多出了深层的元素：

```
a = [1, [2, [3, 4]]]   →   [1, [2, [], 3, 4]]      （len(a[1]) 是 4，应为 2）
b = [3, 4]
a = [1, [2, b]]        →   同样错（内层用预算好的列表也一样）
```
第二条很关键：它说明这与 P46 的递归无关，是**编码格式本身**的问题。

**修法**：转义时把转义符自己也转义（ESC → ESC+0），还原时识别 ESC+0 → ESC。
这样深层分隔符在两层里分别是 ESC+1 与 ESC+0+1，每层还原一次，层层可逆。
顺带修掉了「字符串里本来就有 ESC 字符」时会被误还原的老毛病。

## 3. 根因③：链式下标（P49）

`indexget` 用 `eval(lo, lo)` 求基址，只对「基址是单个记号」成立。`a[0][1]` 的基址是 `a[0]`，
于是它拿整张表去索引区间 `0][1`。

**修法**：从末尾的 `]` 反向扫描找到配对的 `[`（记作 `xbr`，深度计数，遇到 `]`/`)` 加一、`[`/`(` 减一），
基址改为 `eval(lo, xbr - 1)`，下标/切片区间从 `xbr + 1` 起算。单层时 `xbr = lo + 1`，与原行为完全一致。

两个实现坑（都踩过）：

1. 扫描必须插在**基址 eval 之前**——基址 eval 本身要用 `xbr`；
2. 链式下标的基址求值会**再次进入 `indexget`**，把 `xbr` 覆盖掉，所以 `xbr` 要先压 `VStack`、基址求值后再弹回。

## 4. 定位手段与协作者

* 探针：`tokenize` 入口打印 pc+源串，`listlit` 入口/出口打印区间与两张表的长度（P44），
  这是把三个根因区分开的关键证据。
* 本轮把全部相关代码（`listlit`/`tuplelit`/`fpush`/`fpop`/`calluser`/`indexget` 反编译、三次失败补丁、
  构建与验证命令）整理成 `_work/v41/A13_context.md`，交给协作者模型（`codemirror/gpt-6-astra`）审核。
  它确认了因果链与失败归因，并补充了两点被采纳的建议：恢复应**无条件**紧跟 `eval`；
  只需保存 `lpi/lplo/LComm/LOut`（`lphi/lacc/ed/ek/eop` 不必保存）。
  它给出的 `fpush/fpop` 备选方案分析也被采纳为「可行但不用」（会回滚 137 个变量、每元素复制多张表）。

## 5. 仍未完成 / 已知限制

* `print([[1, 2], [3, 4]][0][1])`（**字面量直接接下标**）仍失败：`eval` 的分派先把它当成列表字面量。
  修法方向：给字面量分支补一条「`Tok[lo]` 的配对括号就是 `Tok[hi]`」的判断。
* `one2` 的「嵌套单行 if」（`if True: if True: print(9)`）仍失败，属 P30 单行展开的限制。
* `math` 3 条失败是测试台边界（CPython 抛异常时没有 stdout / `import os` 不可实现）。
* 缺口清单剩余 5 条：A4 类、A5 `try/except`、A8 生成器、A12 字典、B5 别名语义；
  字典补丁 `_work/v41/p33.txt` 已写好（A13 修好后即可启用），另有 `p48.txt` 负责嵌套字典的重入保护。

## 6. 复现

```
node _work/v41/assemble.cjs        # head.txt + p13..p38 + p46 + p47 + p49 + tail.txt -> build41.js
node _work/v41/build41.js         # -> MiniPy_v4.24.sb3（同时写 _work/v41/project.json）
node _work/v41/check41.cjs MiniPy_v4.24.sb3
node _work/v41/run.mjs MiniPy_v4.24.sb3 _work/v41/nested2.json
pwsh -NoProfile -File _work/v41/battery.ps1        # 19 个套件顺序跑，结果写 _work/v41/battery_v424_final.txt
pwsh -NoProfile -File _work/v41/rebuild-old.ps1     # 重建 v4.10..v4.23 并与出货件逐字节比对
```
