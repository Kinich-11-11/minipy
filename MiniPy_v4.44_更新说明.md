# MiniPy v4.44 更新说明

本轮补"函数形参收集"和"类继承"两件事：**`*args` / `**kwargs`**（E28、E29）和
**`class B(A)` 继承**（E46）。两个补丁（P105、P106），`gaps433.json` 从 **55/63** 推到 **58/63**
（E 51/55、F 2/2、G 5/6），23 套既有回归**逐字节零退化**。

产物 `MiniPy_v4.44.sb3`：Interpreter 13,458 块，合计 **14,887**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P105** | **E28** `*args`、**E29** `**kwargs` | `regdef` 原本按名字建形参表，`*name`/`**name` 的名字部分之外那个星号会被当成普通名字。修法：① `regdef` **原样保留**星号（`FnPar` 里存的就是 `*a`/`**k`）；② `calluser` 在绑定形参**之前**先扫一遍 `FnPar[fpo..fpo+fpn-1]`，看到以 `*` 开头的形参就置 `fhas=1`，并把 `EQ(fhas,0)` AND 进"实参过多"和"未知关键字实参"**两道**守卫——否则 `def f(*a)` 调 `f(1,2,3)` 会先被守卫拦下；③ 绑定循环体改成按形参首字符分派：`*a` 收成 `L` 列表、`**k` 收成 `D` 字典（把剩余的 `UArgN` 条目即 P100 的 `名字#值` 逐条落进去），然后 `change fj by 1` **继续循环**，所以 `def f(*a, **k)` 两个都能收；④ 非星号形参走原来的 P100 绑定体 |
| **P106** | **E46** 继承 `class B(A)` | `class` 的形状守卫原本要求 `Tok[3]` 必须是那个"def 形状"，`class B(A):` 直接被拒（报 SyntaxError）。修法：① 把守卫放松成 `NOT(OR(旧判据, AND(Tok[3]=='(' , AND(Tok[5]==')', Tok[6]==':'))))`；② 扫类体**之前**先用 `compareText`（**大小写敏感**）核对父类名确实在 `ClsName` 里；③ 把 `Parent.m` 名下 `FnName` 的每一条连同平行表 `FnPN/FnPO/FnPar/FnDef/FnStart/FnEnd/FnKind/FnLine/FnTlo/FnThi` **一起复制**到 `Child.m` 名下。复制放在扫类体**之前**，覆盖（override）才能赢——`calluser` 找一个类的方法是**从后往前**搜 `FnName` 的 |

## 2. 本轮踩实的五条（都写进 README 了）

* **星号形参不参与"实参个数"守卫**：`def f(*a)` 的 `fpn` 是 1，位置实参却可能有 3 个，原来的
  "实参过多"守卫会先报错，根本走不到绑定循环。必须把 `fhas` 判据 AND 进**两道**守卫
  （个数守卫 + 未知关键字守卫），只改绑定循环是没用的。`def f(a, *b)` 的 `FKIND` 推导同理。
* **`**k` 收的正好是 P100 留下的那批条目**：`UArgN` 已经是 `名字#值` 形状的列表，剩余的未绑定关键字
  实参直接逐条建成 `D` 字典即可，顺序就是调用的书写顺序，不需要另排。
* **继承必须在扫类体之前复制**：`FnName` 的查找语义是"后写的赢"，先复制父类条目、再扫子类类体，
  子类的同名方法自然覆盖父类；反过来做就得手动去重。
* **父类名核对要大小写敏感**：用 `compareText`，不要用 `data_listcontainsitem`——后者会把 `Z` 和 `z`
  混成一个名字（P90 的老坑），`class B(z)` 会误判成找到了 `Z`。
* **锚点一定要"唯一"**：P105 的 `kwFail` 锚点在"外层链"里能匹配到**两个**块，必须再加一条
  "这条 fail 是所在守卫子栈的**第一条**语句"才唯一。P95 的共享 reporter 是同一类问题的另一种表现。

## 3. 实测

| 套件 | v4.43 | **v4.44** |
|---|---|---|
| `gaps433.json`（63 条） | 55/63 | **58/63**（E 51/55、F 2/2、G 5/6） |
| 局部套件 `t105b.json`（14 条 `*args`/`**kwargs`） | — | **12/14**（另 2 条异常类型对、文案不同） |
| 局部套件 `t106b.json`（10 条继承） | — | **9/10**（同上） |
| 边界探针 `t106c.json` + `t106d.json`（15 条） | — | **7 绿 / 8 红**，红的全部是 §4 列出的"明确不支持"（用来把边界钉死，不是回归） |
| 23 套 battery | math 7/10 · dict 9/10 | **逐字节相同**（无退化） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| featprobe 1/2/3/4/5/6 | 72 · 102 · 26 · 14 · 10 · 8 | **74 · 104 · 26 · 14 · 10 · 8** |
| `check41.cjs` | 14,707 块 errors=0 | **14,887 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.43 全 MATCH | **v4.10…v4.44 共 35 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

那 3 条"文案不同"的用例（A13 `f(1,2)`、A14 `f(z=1)`、I6 `class B(Z)`）在 CPython 里抛的是
`TypeError: f() takes 1 positional argument but 2 were given` / `f() got an unexpected keyword argument 'z'` /
`NameError: name 'Z' is not defined`；MiniPy 抛的是同一**类型**、不同**文案**（`too many arguments` /
`unexpected keyword argument z` / `name Z`），所以比对结果里算失败。这类差异从 v4.33 起就是已知项。

## 4. 本轮明确不支持（用 `t106c.json` / `t106d.json` 实测过）

继承这件事本轮只做到"**方法复用**"，下面这些**都不支持**：

* **`super()`**：`SyntaxError: missing expression`。
* **用父类名显式调父类方法** `A.hi(self)` / `A.__init__(self, x)`：`AttributeError: only lists have methods`
  或 `NameError: A`。**所以子类一旦覆盖了父类方法，就再也拿不到父类那份实现了**——继承在本轮是
  **只复用、不能 `super` 回调**的形态（`class C(B)` 两级链可以，因为复制是可传递的，实测 `C().hi()` 得 `'A'`）。
* **类属性不继承**：`class A: n = 7` 之后 `B.n`（`B` 继承自 `A`）读不到，报 `AttributeError: n`；
  `A.n` 直接读是可以的（P90 的能力，与继承无关）。
* **多继承** `class C(A, B)`：`SyntaxError: class Name:`（被守卫挡住）。
* **调用侧的星号展开** `f(*xs)`：`SyntaxError: missing expression`（本轮只做了"定义侧"收 `*args`/`**kwargs`）。
* 其他老限制未变：`from os import path` 这类非 `math` 模块仍不可用。

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.44.sb3
node _work/v41/run.mjs MiniPy_v4.44.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps444_out.json
node _work/v41/run.mjs MiniPy_v4.44.sb3 _work/cmp47/t105b.json
node _work/v41/run.mjs MiniPy_v4.44.sb3 _work/cmp47/t106b.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.44.sb3 -out _work/v41/battery_v444.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.44.sb3 -tag v444f
node _work/v41/check41.cjs MiniPy_v4.44.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.43 还原： $env:V41_SKIP='P105,P106'; $env:V41_OUT='…/MiniPy_v4.43.sb3'; node _work/v41/build41.js
```

## 6. 下一版（v4.45）建议

1. **E43** 字典推导式（`{k: k * 2 for k in range(3)}`）
2. **E44** 集合 `{1, 2, 3}`（要一个新类型标记 + repr/len/in 的最小支持）
3. **E49** `try/finally`（P88 的正常完成路径可以复用）
4. **G5** 默认参数只求值一次（要让形参**别名**到那份默认值）
5. 双 `for` 推导式
6. `yield i, i + 1`
7. `'hello'.split()` 无参按空白切
8. 浮点 repr（`1e+16`/`1e-05`/`-0.0`/大浮点）
9. **E50** `with`：CPython 自己会抛 `FileNotFoundError`，实际无法对齐，暂不列入目标
