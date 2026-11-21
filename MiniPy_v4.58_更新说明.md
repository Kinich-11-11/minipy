# MiniPy v4.58 更新说明

本轮补上**类型元组**（`isinstance(x, (int, str))`）与 **`issubclass`**，补丁 **P131**。
动手期间被回归套件逮到**一个 v4.56 引入的退化**，顺着它又挖出**一个从 v4.54 就存在、影响面很大的既存 bug**——
两件都在本轮修掉：**方法体里的局部赋值被当作类属性在"定义类的时候"求值了**。

产物 `MiniPy_v4.58.sb3`：Interpreter 16,787 块，合计 **18,216**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；49 个历史版本全部可复现（v4.10…v4.58 MATCH）。

## 1. 本轮新做（P131 前三段）

| 段 | 做法 |
|---|---|
| **(a) `isname`** | 把 P128 的"名字 → 类型标签"那条链抽成过程（读的还是 P128 的全局量 `p2v`/`p2t`/`p2n`，答在 `p2r`），于是元组里的每个名字都能单独跑一遍 |
| **(b) `issub`** | 两个**类名**之间的判断：同名 ✓、`object` 是万能基类 ✓、`bool` ⊂ `int` ✓、13 个内建异常名都 ⊂ `Exception` ✓，用户类则交给 P128 的 `isanc` 沿 `ClsPar` 爬（读全局量 `p5a`/`p5b`，答在 `ev`） |
| **(c) `eval` 钩子** | ①`issubclass(A, B)` / `issubclass(A, (B, C))`；②`isinstance(x, (int, str))`。**名字在求值之前先收集**（`P5Names` 列表）——嵌套 `eval` 会重新切词（p90.txt 的警告），token 下标只有在求值前才可靠。两个钩子都插在 P128 的 `isinstance` 钩子**之前**并 `stop this script`，所以单名形式仍走 P128 的老路（不重复实现） |

## 2. 两个 bug

### 2.1（退化，v4.56 引入）atom 的类名判定踩了 `ctmp`

P129 让"类名当值"可用时，在 `atom` 里给每个标识符加了一次 P127 的 `iscls` 调用；而 `iscls` 用 `ctmp`
当循环计数器，**P127 的显式父类调用钩子（`A.m(inst, args)`）恰恰把"逗号位置"存在 `ctmp` 里、
并且要跨过"求值实例表达式"这一步**。于是：

```
class A:
    def setv(self, x): self.v = x
class C(A):
    def go(self, v):
        A.setv(self, v)      # v4.56/v4.57: SyntaxError: parentheses
print(C().go(5))             # v4.54/v4.55: 5
```

求值 `self` 时 `atom` → `iscls` 把 `ctmp` 从 6 改成 3，方法实参区间随之错位 → 括号深度不平 →
`SyntaxError: parentheses`。**修法**：在 P131 里给 P129 那段 `atom` 插入套上
`ctmp`/`evtype` 的存/取（用 `ownerProc` 区分 P129 在 `atom` 与 `strval` 两处的同形插入）。
这正是 `_work/cmp47/d181.json`（4 条）与 `d160`/`d161` 的失败原因。

### 2.2（既存，v4.54 起）方法体里的 `局部 = 表达式` 在"定义类"时就被求值了

P90 的类体 `name = value` 处理器的条件是"第 2 个 token 是 `=`"——**不管缩进**。类体扫描会走遍
`class` 下面所有行，包括方法体：

```
class D:
    def go(self, v):
        r = v        # 定义类时就被求值 → NameError: v
        return r
print(D().go(7))
```

行号报的是第 1 行（`class D:`）——因为那是我在"定义类"，症状因此一直像"参数丢了"。只有 RHS
不提到名字的写法才侥幸活着（`r = 5` 静默变成**类属性**）。**探针证据**：`d184`（4/6 → 6/6）、
`d185`（0/3 → 3/3）、`d182`（1/4 → 4/4）、`d186`（2/4 → 4/4）；`_work/v41/rebuild/MiniPy_v4.53.sb3`
上更差（2/6），v4.54–v4.57 都是 4/6，所以是**既存**而非本轮引入。
**修法**：类体属性行必须**恰好缩进 4 个空格**（`Code[ck]` 第 4 个字符是空格、第 5 个不是）。
顺带把 v4.54 更新说明里记的"子类 `__init__` 用局部变量给父类 `__init__` 传参"也一起治好了
（`d161` 4/6 → **6/6**、`d160` 5/6 → **6/6**）。

## 3. 实测

| 套件 | v4.57 | **v4.58** |
|---|---|---|
| `d179.json`（类型元组 + issubclass 6 条） | 0/6 | **6/6** |
| `d180.json`（空元组/容器类型/用户异常层次 5 条） | — | **5/5** |
| `d181.json`（显式父类调用 4 条：表达式/变量实参） | 0/4 | **4/4** |
| `d182.json`（`__init__` 里用局部变量做嵌套调用 4 条） | 1/4 | **4/4** |
| `d183.json`（`__init__` 里传形参/字面量/内建 6 条） | 5/6 | **6/6** |
| `d184.json`（方法的局部赋值 6 条） | 4/6 | **6/6** |
| `d185.json`（局部赋值前后读形参 3 条） | 0/3 | **3/3** |
| `d186.json`（普通函数 vs 方法 4 条） | 2/4 | **4/4** |
| `d159.json`（类边角 5 条） | 3/5 | **4/5**（只剩菱形继承的 C3 顺序） |
| `d160` 6/6 · `d161` 6/6 · `d144`/`t144` 16/16 · `d158` 8/8 · `d156` 5/5 · `d165` 5/5 · `d166` 8/8 · `d174` 8/8 · `d178` 3/3 · `d173` 4/4 | — | **全绿** |
| `t133` 60/60 · `t139` 31/31 · `t123` 29/29 · `t141` 18/18 · `t143` 7/7 · `t134` 9/9 · `t115c` 32/33 | 全绿 | **全绿** |
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6） |
| 73 套快照（`demos`/`scope`/`d1`/`pan`/battery + 全部 `t*`/`gaps*`） | — | **73 套逐例相同**；差异只有 `t111h` 的 CPython 集合哈希序与 featprobe3 的 `enumerate`/`zip` 内存地址 |
| 6 个 featprobe（259 条） | 246/259 | **246/259** |
| `check41.cjs` | 17,963 块 errors=0 | **18,216 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.57 共 48 版全 MATCH | **v4.10…v4.58 共 49 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
print(isinstance(1, (int, str)))            v4.57: False（元组没实现）      => True
print(isinstance([1], (int, str)))                                            => False
print(isinstance(B(), (A, int)))            （B 继承 A）                      => True
print(issubclass(bool, int))                v4.57: NameError: issubclass     => True
print(issubclass(int, object))                                                => True
print(issubclass(C, A))                     （C→B→A）                         => True
print(issubclass(ValueError, Exception))                                      => True
print(issubclass(MyErr, (ValueError, Exception)))                             => True

class D:
    def go(self, v):
        r = v                               v4.57: NameError: v（定义类时就求值）  => 7
        return r
print(D().go(7))

class A:
    def setv(self, x): self.v = x
class C(A):
    def go(self, v):
        A.setv(self, v)                     v4.56/v4.57: SyntaxError: parentheses   => 5
print(C().go(5))
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| 菱形继承的 C3 顺序 | `class D(B, C)` 里 `super().hi()` 仍只走一个父类（`d159` E4） |
| `isinstance` / `issubclass` 的元组**嵌套**、`except (A, B)` | 前者没实现（`(int, (str,))` 不是合法 Python，影响小）；后者仍缺 |
| 多个 `except` 子句 | 只按名字匹配**第一个**子句（P51 的既有形状） |
| `ZeroDivisionError` 的消息 | 仍是裸类名（CPython 是 `division by zero`） |
| 嵌套"带关键字 sorted" | `sorted(sorted(xs, key=…), reverse=…)` 报 `SyntaxError: parentheses`（P101 遗留的状态覆盖） |
| `key='upper'`（字符串名） | 报错文案与 CPython 不同 |
| 实例/函数/类作为 `sorted(key=)` 的元素 | 没有字面量形式，报 TypeError |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.58.sb3
node _work/v41/run.mjs MiniPy_v4.58.sb3 _work/cmp47/d179.json  # 类型元组 + issubclass
node _work/v41/run.mjs MiniPy_v4.58.sb3 _work/cmp47/d184.json  # 方法的局部赋值
node _work/v41/run.mjs MiniPy_v4.58.sb3 _work/cmp47/d161.json  # 显式父类调用（含局部变量实参）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.58.sb3 -tag v459 -ref v458
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.58.sb3 -tag v458
node _work/v41/check41.cjs MiniPy_v4.58.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.57 还原： $env:V41_SKIP='P131'; $env:V41_OUT='…/MiniPy_v4.57.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.59）候选，按清单顺序

1. 菱形继承的 C3 顺序（`d159` E4 是现成反例）
2. 多个 `except` 子句的依次匹配 + `except (A, B)` 元组子句（同一套子句解析）
3. `ZeroDivisionError` 等内建异常的消息文案（`division by zero` / `integer division or modulo by zero`）
4. 嵌套 `sorted` 的状态栈（把 `tqcpz`/`p4*` 换成栈，修掉 P101 遗留的 `SyntaxError: parentheses`）
