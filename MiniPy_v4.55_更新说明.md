# MiniPy v4.55 更新说明

本轮收尾清单 §3 里最后一批"小而明确"的缺口，补丁 **P128** 三件：

* **`set()` 无参**：v4.54 报 `SyntaxError: missing expression`（P124 的 `set(x)` 处理器在 `callfn`
  里面读的是**已经求值过的实参**，空实参区间根本走不到那里）；
* **`issubset` / `issuperset`**：`{1}.issubset({1, 2})` 原来报 `AttributeError: set has no method issubset`；
* **`isinstance(x, T)`**：两个实参的调用（和 `sorted(x, reverse=…)` 一样永远到不了 `callfn`），
  支持 `bool`/`int`/`float`/`str`/`list`/`tuple`/`dict`/`set`/`object` 与**用户类（含多级父类链）**。

顺带把三个**新写的代码自己的坑**挖出来并修掉（第 2 节），产物 `MiniPy_v4.55.sb3`：
Interpreter 16,172 块，合计 **17,601**，`check41` errors=0；`frames.mjs fib16` 仍是 **6388**
interpSteps；46 个历史版本全部可复现（v4.10…v4.55 MATCH）。

## 1. 补丁清单（P128）

| 段 | 做法 |
|---|---|
| **(a) `set()`** | 在 `eval` 的 **narg 分派之前**加一条：token 正好是 `set ( )`（`hi == lo + 2`，避免把 `set() + 1` 也吞掉）⇒ `ev = ''`、`evtype = 'E'`，然后 `chgV(fnlimit,-1)` + `stop this script`。与 P127 处理 `super()` 的方式一致 |
| **(b) `issubset` / `issuperset`** | 加进 P124 的 `setmeth`（插在末尾那个 `FAILB` 之前）：`a ⊆ b` ⇔ 用 `setfilter(a, b, keep=1)` 过滤后**编码字符串不变**——集合编码是规范序（`setnorm`），所以没丢元素时两个串逐字符相等。`issuperset` 就是把两个集合对调 |
| **(b2) `isanc`** | 新过程（输入走全局量 `p2c1`/`p2c2`，见 p127.txt 的说明）：沿 `ClsPar` 往上走，最多 24 层，问"`p2c1` 或其某个祖先是不是 `p2c2`" |
| **(c) `isinstance(x, T)`** | 同样在 narg 分派之前：`hascomma` 找顶层逗号 ⇒ 先**读出类名 token**，再 `eval` 第一个实参，然后查类型表（P76 的 `type()` 用的同一套标签：`B/Z/L/T/D/S/O/F/E`，数字再看值里有没有小数点区分 int/float；`int` 也接受 `bool`）。是实例（`O`）且内建没命中时，取 `InstCls[值]` 与类名交给 `isanc` 走父类链 |

新增变量：`p2sh1 p2sh2 p2v p2t p2n p2r p2c1 p2c2 p2cur p2cnt`（统一 `p2` 前缀，避免与既有全局量撞名）。

## 2. 本轮踩到并修掉的三个坑

1. **`issubset` 里第二个 `listlen` 读到了实参而不是接收者**：第一版用"两侧元素个数相等"判断，
   于是 `{1,2}.issubset({1})` 返回 True（`len(rec)` 拿到的是实参的 1）。这正是 p127.txt 记的
   "同一个块的值会串"那类问题（`listlen` 被反复调用，参数读旧值）。**修法**：干脆不用计数——
   `setfilter` 的结果与接收者**串相等**即可（规范序保证这一点），一次 `eval` + 一次 `setfilter` + 一次比较。
2. **`isanc` 把结果放在 `ev` 里 ⇒ 只爬一层**：`clspar` 也是用 `ev` 回话的（父类串），
   于是"还没命中"的守卫 `ev == 0` 在第一次 `clspar` 之后就再也不成立，循环空转到计数器上限，
   结果是 `isinstance(C(), A)`（C→B→A）判 False。**修法**：结果独立放 `p2r`。
   日志证据：`climb C->A ev=0` → `par=B` → `climb B->A ev=B`（此后 24 次全在空转）。
3. **`Tok[tqcpz+1]` 不能在 `eval` 之后读**：`isinstance((1, 2), tuple)` 判 False，因为
   求值 `(1, 2)` 这个字面量会让解释器**重新切词**（p90.txt 里就有这条警告），
   于是按旧下标读到的"类名"是 `2`。**修法**：动手求值之前先把类名 token 存进 `p2n`。
   日志证据：`cpz=10 t0=( tc=,` 之后 `nm=[2]`（本该是 `tuple`）。

## 3. 实测

| 套件 | v4.54 | **v4.55** |
|---|---|---|
| `t134.json`（集合面 9 条） | 7/9 | **9/9**（G1「无参 set()」、G3「issubset」翻绿） |
| `d162.json`（本轮新写 8 条） | — | **8/8** |
| `d163.json`（len/子集 5 条） | — | **5/5** |
| `d164.json`（isinstance 5 条，含内联元组） | — | **5/5** |
| `t133` 60/60 · `t139` 31/31 · `t123` 29/29 · `t141` 18/18 · `t143` 7/7 · `t144` 16/16 | 全绿 | **全绿** |
| `t115c.json`（33 条） | 32/33 | **32/33**（只剩 S8 的 `split('\n')`，ASCII 显示限制） |
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6） |
| 62 套快照（`demos`/`scope`/`d1`/`pan`/battery 23 套 + 全部 `t*`/`gaps*`） | — | **59 套逐例相同**，3 套差异全部是**噪声或变好**：`t113` F6 是 CPython 字符串集合哈希序（清单 §3 第 9 条注明的噪声）、`t134` 是本轮 +2 翻绿、`featprobe3` 是 `enumerate`/`zip` 打印内存地址 |
| 6 个 featprobe（259 条） | 243/259 | **243/259**（本轮三项都不在探针里） |
| `check41.cjs` | 17,428 块 errors=0 | **17,601 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.54 共 45 版全 MATCH | **v4.10…v4.55 共 46 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
set()                                     v4.54: SyntaxError: missing expression  => set()  (len 0)
s = set(); s.add(1); print(s)                                                     => {1}
print({1}.issubset({1, 2}))               v4.54: AttributeError: set has no method => True
print({1, 2}.issubset({1}))                                                       => False
print(set().issubset({1}))                                                        => True
print({1, 2}.issuperset({1})) · print({1}.issuperset({1, 2}))                     => True · False
print(isinstance(1, int)) · print(isinstance(1.5, float))                         => True · True
print(isinstance(True, int)) · print(isinstance(1.5, int))                        => True · False
print(isinstance((1, 2), tuple)) · print(isinstance({1}, set))                    => True · True
class A: pass
class B(A): pass
class C(B): pass
print(isinstance(C(), A))                 v4.54: NameError: name isinstance …      => True
print(isinstance(A(), B))                                                         => False
# 主动的边界（与 CPython 的差异）：
#   isinstance(x, (int, str))   元组形式的类型表还不支持（判 False）
#   issubclass / frozenset / set 的元素顺序（插入序）仍缺
```

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.55.sb3
node _work/v41/run.mjs MiniPy_v4.55.sb3 _work/cmp47/t134.json  # 集合面 9 条
node _work/v41/run.mjs MiniPy_v4.55.sb3 _work/cmp47/d162.json  # set()/子集/isinstance 8 条
node _work/v41/run.mjs MiniPy_v4.55.sb3 _work/cmp47/d163.json  # len 与子集 5 条
node _work/v41/run.mjs MiniPy_v4.55.sb3 _work/cmp47/d164.json  # isinstance 5 条
node _work/v41/run.mjs MiniPy_v4.55.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps453_out.json
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.55.sb3 -tag v455 -ref v454   # 62 套快照
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v455 -ref v454                      # 与 v4.54 逐例对比
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.55.sb3 -tag v455
node _work/v41/check41.cjs MiniPy_v4.55.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.54 还原： $env:V41_SKIP='P128'; $env:V41_OUT='…/MiniPy_v4.54.sb3'; node _work/v41/build41.js
```

## 6. 下一轮（v4.56）候选，按清单顺序

1. `sorted(x, key=lambda …)`（featprobe3 的既有缺口）——需要"把一个**值**当函数调用"的管线
   （现有的 `calluser`/`callfn` 都按 token 区间取实参），先查 P85 的"函数当值"是怎么挂的
2. `class MyErr(Exception)`（featprobe2 的 J）：`raise`/`except` 认自定义异常类
3. `isinstance(x, (int, str))` 与 `issubclass`
4. 继承线的边角（v4.54 留的）：菱形继承的 C3 顺序、子类 `__init__` 用局部变量给父类 `__init__` 传参
5. `split('\n')` 这类含控制字符的字符串（环境层 ASCII 显示限制，优先级最低）
