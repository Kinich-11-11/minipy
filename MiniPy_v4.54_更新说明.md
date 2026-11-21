# MiniPy v4.54 更新说明

本轮清掉清单 §3 末尾的 **`super()` 与类属性继承 → 多重继承**，也就是继承这条线的最后一块：
`super().m()` / `super().__init__(x)`、父类类属性继承（`class B(A): pass` 后 `B.n`）、多父类
（`class C(A, B):`，方法按 MRO 从左到右、属性从左到右）、以及 `A.m(self)` 这种"通过类名显式调用"。

动手期间撞到三个**既有 bug**，一并修在本轮（不修的话继承根本走不通）：

1. **自定义积木的实参在第二次调用时不更新**（scratch-vm 层）：同一个 VM 里跑第二个用例时，
   `clssplit`/`clscopy` 读到的还是第一次调用的实参 → `class C(A, B)` 什么都不复制；
2. **`self.m()` 报 `AttributeError: only lists have methods`**：`self` 是 callmeth/callcls 写的
   Scratch 变量而不是 MiniPy 变量，methodcall 求接收者得到 `0`/类型 `N`，在实例分派之前就被类型守卫挡下；
3. **P90 的类体 `name = value` 处理器会踩类体扫描的循环计数器 `ck`**：带属性的第二个类会**死循环**
   （第一个类碰巧无害）。

补丁 **P127**：探针 `t144.json`（16 条类探针）**16/16**、`d156.json`（`self.m()` 5 条）**5/5**、
`d149`/`d154`（同 VM 两个用例的串台）**2/2**；既有回归**零退化**，`t115c` 的 Y3 与 featprobe3 的
"类里用其他方法"还会跟着翻绿。

产物 `MiniPy_v4.54.sb3`：Interpreter 15,999 块，合计 **17,428**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 三个既有 bug 的现场

### 1.1 实参不更新（"跨用例串台"）

`super()` 的第一版在**单独跑**时全对，一旦同一个 VM 里先跑过另一个带父类的用例就全错。用
`dbgmulti.mjs` 打印中间量（`split-raw:` 后面直接放原始实参）看到：

```
X1（第一个用例，class R(QQ)）   split-raw: QQ    len 2   n=1     ← 对
X2（第二个用例，class C(A, B)） split-raw: QQ    len 2   n=0     ← 实参是上一个用例的 QQ
调用方那边 ctmp = 'A,B' 明明是对的
```

再往 `eval` 里加"条件值"日志，看到更硬的一条：同一次循环里 **`cond=true` 但走了 else 分支**——
即 `IFELSE` 读到的 `CONDITION` 是旧值。翻 scratch-vm 源码（`src/blocks/scratch3_procedures.js` +
`src/engine/thread.js`）可以逐行对上：

* `util.initParams()` 只在 `frame.params === null` 时才建对象，`pushParam` 写的是"当前栈帧"；
* `_StackFrame.reuse()` / `reset()` **不会清 `executed`**，帧还会被回收复用；
* `BlockCached` 的 `_argValues` 是"每个块一个对象，所有执行共用"（execute.js 注释原文）。

于是同一个自定义积木块的第二次调用可能既没重设参数、又照旧执行。**修法**：本轮新增的所有内部过程
（`clssplit`/`clscopy`/`clscopyattr`/`clspar`/`iscls`/`callcls`）一律**用全局变量传参**
（`cspec`/`cpar2`/`cname`/`cinst`/`cmeth`/`clo`/`chi`），过程本身不带形参——全局量每次读都是当前值，
彻底绕开这条路径。这也是为什么清单里以前有些用例"偶尔红偶尔绿"。

### 1.2 `self.m()` 到不了实例分派

`class A: def one(self): return 1` + `def two(self): return self.one() + 1` 在 v4.53 报
`AttributeError: only lists have methods`。在 methodcall 的实例分派前打一行日志：

```
mc 1/O      ← A().two() 的接收者：1 号实例，类型 O
mc 0/N      ← self.one() 的接收者：0，类型 N
```

`self` 是 callmeth/callcls 用 `assign self <iid> O` 写的 Scratch 变量，MiniPy 的**变量查表里没有
`self`**（`s = self` 会报 `NameError: self`），所以 methodcall 求接收者拿不到实例。而 methodcall 的
语句顺序是：**先求接收者 → 再跑 D/E/"只认列表"三道类型守卫 → 最后才赋值 `lmeth` → 分派**。
所以哪怕事后把 `xa/xb` 改回来也没用（守卫已经先开火了）。

**修法**：`eval` 在调用 methodcall 之前把接收者 token 记进 `cselfr`（嵌套调用可能重排 `Tok`，
所以必须提前记），methodcall 在**三道守卫之前**补一段"`cselfr == 'self'` ⇒ `xa = self`、
`xb = 'O'`"。继承来的方法同样能命中，因为 P106 的方法表复制已经把父类方法挂到了子类名下
（`callmeth` 是按 `InstCls[inst] + '.' + 方法名` 查表的）。

### 1.3 P90 的类体处理器踩 `ck`

`class A: n = 1` 单独用没事，**第二个带类属性的类**会让解释器转不出来（`d145.json` 的 V1/V4 挂死）。
P90 处理类体里的 `name = value` 时用 `ck` 当属性查找计数器，而 `ck` 同时是**类体扫描的循环计数器**：
第一个类的行数正好把扫描推过末尾，第二个类就退回去重扫。修法是在处理器前后用 `VStack` 存/取 `ck`。
（`cax`/`ccls` 的保存恢复也在同一处。）

## 2. 补丁清单（P127）

| 段 | 做法 |
|---|---|
| **(a) `clscopy`** | 按父类名前缀扫 `FnName`，把父类方法整行（`FnName/FnPN/FnPO/FnPar/FnDef/FnStart/FnEnd/FnKind/FnLine/FnTlo/FnThi` 十一张表）复制到子类名下。父类名从全局 `cpar2` 读 |
| **(b) `clscopyattr`** | 同一套做法复制 `IAttrId/IAttrName/IAttrVal/IAttrType`，父类名同样走 `cpar2` |
| **(b2/b3) `clssplit` / `clspar`** | `"A,B"` ↔ `CQ2` 列表；`clspar` 反查某类的父类串（供 `super()` 找父类） |
| **(c) `callcls`** | `callmeth` 的显式类版本：`ccls/cinst/cmeth/clo/chi` 五个全局进来，`cmet` 用 `VStack` 压/弹，方法返回后恢复 `self` |
| **(c2) `ck` 存取** | 1.3 的修复：P90 类体处理器前后保存恢复 `ck` |
| **(d) 类语句** | 类头 `class Name(P1, P2, …):`：把 `Tok[4..count-2]` 拼成父类串（逗号也是 token）存进新的 `ClsPar`，再 ①**从右到左**复制方法（`calluser` 从 `FnName` 末尾往前找，最左的父类必须最后复制）②**从左到右**复制类属性（`IAttr` 是正序扫描，最左的父类优先命中） |
| **(d) 形状守卫** | 原来的 `class Name(Parent):` 只在 `Tok[3]=='(' && Tok[count-1]==')' && Tok[count]==':'` 时放行，改成"任意个父类" |
| **(d2) `iscls`** | 大小写敏感的"这是类名吗"（`contains` 在 Scratch 里不区分大小写，`b.dbl()` 会被误当成类调用） |
| **(e) `super()`** | `eval` 入口：`super ( ) . 方法 ( 参数… )` ⇒ 用 `cmet`（正在执行的方法所属类）反查父类，调 `callcls(self, 父类, 方法, lo+6, hi-1)`；没有父类时报 `TypeError: super() outside a class` |
| **(e) `Class.m(inst)`** | `eval` 的 methodcall 分支前：`类名 . 方法 ( … )` ⇒ 取第一个实参当实例；**先扫深度 0 的逗号再求值**，只求值到逗号为止那一段（把整段实参交给 `eval` 会把后面的实参一起打包进接收者值，`self` 就成了串） |
| **(f) `self.m()`** | 1.2 的修复 |
| **(g) 运行初始化** | `ClsPar`/`CQ2` 随 `ClsName` 一起清空 |

新增变量：`cmet cps csi cai cch cpiece cup ctmp cpv cspec cpar2 cname cinst cmeth clo chi cselfr`；
新增列表：`ClsPar`、`CQ2`。

## 3. 实测

| 套件 | v4.53 | **v4.54** |
|---|---|---|
| `t144.json`（本轮新写：super / 类属性 / 多继承 / `A.hi(self)` / `self.m()` 16 条） | 2/16 | **16/16** |
| `d156.json`（`self.m()` 5 条） | 1/5 | **5/5** |
| `d158.json`（本文 §4 的 8 个例子：类属性继承 / `super()` / 多继承 / 覆盖 / 三级传递） | — | **8/8** |
| `d160.json` + `d161.json`（显式父类调用 12 条：字面量/表达式/形参/局部变量实参、带属性写回） | — | **9/12**（余下 3 条见 §4.1） |
| `d149`/`d154`/`d155`（同一 VM 两个用例的串台） | 6/8 | **全绿** |
| `t133` 60/60 · `t139` 31/31 · `t123` 29/29 · `t141` 18/18 · `t143` 7/7 · `t134` 7/9 | 全绿 | **全绿** |
| `t115c.json`（33 条） | 31/33 | **32/33**（Y3「yield 元组 for 解包」跟着翻绿；只剩 S8 的 `split('\n')`，属 ASCII 显示限制） |
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6） |
| 62 套快照（`demos`/`scope`/`d1`/`pan`/battery 23 套 + 全部 `t*`/`gaps*`） | — | **逐例相同**：59 套 diff=0，3 套差异全部是**噪声或变好**——`t113` F6 是 CPython 字符串集合哈希序（清单 §3 第 9 条注明的噪声），`t115c` Y3、`featprobe3`「类里用其他方法」是**变好** |
| 6 个 featprobe（259 条） | 242/259 | **243/259**（+1） |
| `check41.cjs` | 17,017 块 errors=0 | **17,428 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.53 共 44 版全 MATCH | **v4.10…v4.54 共 45 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
class A:
    def hi(self): return "A"
class B(A):
    pass
print(B().hi())                     v4.53: 3 行都对（P106 已通）        => A

class A:
    n = 7
class B(A):
    pass
print(B.n)                          v4.53: AttributeError: n            => 7

class A:
    def __init__(self, v): self.v = v
class B(A):
    def __init__(self, v):
        super().__init__(v * 2)
print(B(3).v)                       v4.53: SyntaxError: missing expr    => 6

class A:
    def hi(self): return "A"
class B:
    def yo(self): return "B"
class C(A, B):
    pass
c = C(); print(c.hi(), c.yo())      v4.53: SyntaxError: class Name:     => A B

class A:
    def hi(self): return "A"
class B(A):
    def hi2(self): return A.hi(self) + "B"
print(B().hi2())                    v4.53: AttributeError: only lists…  => AB

class A:
    def one(self): return 1
    def two(self): return self.one() + 1
print(A().two())                    v4.53: AttributeError: only lists…  => 2
```

另外：`class C(A, B)` 的属性继承是**从左到右**（`IAttr` 正序），方法表复制是**从右到左**
（`calluser` 倒序查 `FnName`），所以 `C` 覆盖 `A`/`B` 的同名方法、`A` 覆盖 `B` —— 与 Python 的 MRO
在这两个父类没有冲突时的结果一致。

### 4.1 仍未做的边界（本轮实测，写在这里免得下轮重复踩）

| 探针 | 现象 | 说明 |
|---|---|---|
| `d159.json` E1 | `isinstance(A(), A)` → `NameError: name isinstance is not defined` | 内建 `isinstance` 还没有 |
| `d159.json` E2 | `class MyErr(Exception)` → `NameError: name Exception` | 自定义异常类还没有 |
| `d159.json` E4 | 菱形继承 `class D(B, C)` + 各层 `super().hi()` → `AttributeError` | 没有 C3 线性化，`super()` 只按"第一个父类"往上走；CPython 是 `DBCA` |
| `d160.json` F6 / `d161.json` G2·G3 | 子类 `__init__` 里 `r = v + 1` 后 `super().__init__(r)`（或 `A.__init__(self, r)`）→ `NameError: v` | 父类 `__init__` 的实参在"子类局部变量"这一种情况下绑不上；传形参（`super().__init__(v)`）、传表达式（`super().__init__(v * 2)`）、传字面量、以及**普通方法**里传局部变量（`A.setv(self, r)`）都正常 |

这些都是"继承线的边角"，不影响本轮的核心路径（`super().__init__(v * 2)`、类属性继承、多继承、
`A.hi(self)`、`self.m()` 全部通过）。

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.54.sb3
node _work/v41/run.mjs MiniPy_v4.54.sb3 _work/cmp47/t144.json  # 本轮 16 条类探针
node _work/v41/run.mjs MiniPy_v4.54.sb3 _work/cmp47/d156.json  # self.m() 5 条
node _work/v41/run.mjs MiniPy_v4.54.sb3 _work/cmp47/d158.json  # §4 的 8 个例子
node _work/v41/run.mjs MiniPy_v4.54.sb3 _work/cmp47/d149.json  # 串台（P5 -> P6）
node _work/v41/run.mjs MiniPy_v4.54.sb3 _work/cmp47/d154.json  # 串台（X1 -> X2）
node _work/v41/run.mjs MiniPy_v4.54.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps453_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.54.sb3 -out _work/v41/battery_v454.txt
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.54.sb3 -tag v454          # 62 套快照
pwsh -NoProfile -File _work/v41/sweepcmp.ps1                                        # 与 _v453 逐例对比
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.54.sb3 -tag v454
node _work/v41/check41.cjs MiniPy_v4.54.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.53 还原： $env:V41_SKIP='P127'; $env:V41_OUT='…/MiniPy_v4.53.sb3'; node _work/v41/build41.js
```

## 6. 下一轮（v4.55）候选，按清单顺序

1. 继承线剩下的边角：父类 `__init__` 的"子类局部变量实参"（`d161.json` G2/G3）、菱形继承的 C3 顺序
2. `class MyErr(Exception)` 自定义异常类 / `isinstance`
3. `sorted(x, key=lambda …)`（featprobe3 的既有缺口，`key=` 关键字还没接上）
4. 集合元素顺序（不保证项）/ `set()` 无参 / `issubset`（`t134.json` 7/9 的两条）
5. `split('\n')` 这类含控制字符的字符串（环境层 ASCII 显示限制，优先级最低）

