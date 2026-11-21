# MiniPy v4.235 更新说明

本轮按 v4.234「下一轮建议」第 2/3/4/5 条，**完成 4 大类**（第 1 条异常组按原计划单独一轮）：

1. **键函数应用帧按引用**（P735）：`map`/`filter`/`sorted`/`min`/`max` 的键函数可以
   接收对象/函数/类值（此前 `sorted() key function cannot receive this value`）；
2. **浮点字面量解析对齐 CPython**（P736）：`4.35e18` 末位偏差、次正规数下溢、
   `1e309` 溢出（`inf`）全部修复；
3. **`%a`/`ascii()`/`__format__`**（P737）：`%a` 格式化、`ascii()` 内建、`!a` 转义
   （含经 `input()` 进入的非 ASCII 值）、`format(obj, spec)` 的 `__format__` 分派、
   `input()` 放行非 ASCII 字符；
4. **调用结果属性链赋值**（P738）：`f().a = 1`、`f().a.b = 1`、`f().a += 1`、
   `f()['k'].a = 1` 等"调用根为对象的属性写/自增写"全部可用。

**构建**：`MiniPy_v4.235.sb3`（2026-11-21，总 **53,184** 块，Interpreter 50,709，
vars 2,202，lists 287，`check41 errors=0`）。组装管线本轮为 **assemble235b.cjs →
build235b.js**（assemble235.cjs 是 v4.234 的调试变体，沿用 v4.231b 的绕名惯例）。

## 一、结果总览

| 套件 | v4.234 | **v4.235** |
|---|---|---|
| 新套件 `_v235_hof`（12） | — | **12/12** |
| 新套件 `_v235_fmt`（20） | — | **20/20** |
| 新套件 `_v235_num`（16） | — | **16/16** |
| 新套件 `_v235_chain`（10） | — | **10/10** |
| 主套件+探针 `_new*`+`_cov*`（873） | 872/873 | **872/873**（同一失败项，见五） |
| 跨模块回归 `_reg232`（593） | 582/593 | **582/593**（失败清单逐项一致=零回归） |
| 异常专项/edges/validation | 60/60、25/25、11/12 | 同基线 |
| `_v233_*` 五套（84） | 84/84 中 15+16+19+18+16 | 同基线 |
| mods20（cmath/re 20/20；datetime/math/random 18/20；statistics 18/20；time 19/20） | 同基线 | 同基线 |
| `_real*` 120 + `_real2` 48 + `_real3` 60 | 同基线（real3_hof 14/16、pipe 15/16 为声明项） | 同基线 |
| raw3 / gap131 | 11/12、78/82 | 同基线 |
| 内置 demo / `check41` | ALL 20 OK、errors=0 | **ALL 20 OK、errors=0** |

`_reg232` 的 11 个失败项与 v4.234 **逐项一致**（gap131×4 历史格式项、probe230×4
历史声明项、real3_hof×2 与 real3_pipe×1 声明项）——零回归。

## 二、行为对照（4 大类）

```python
# 1. 键函数应用帧按引用（P735）
class P:
    def __init__(self, v):
        self.v = v
ps = [P(2), P(1), P(3)]
print([q.v for q in sorted(ps, key=lambda p: p.v)])   # [1, 2, 3]（原 TypeError）
print(list(map(lambda p: p.v, ps)))                    # [2, 1, 3]
def a(): return 1
def b(): return 2
print([g() for g in sorted([b, a], key=lambda f: f())])  # [1, 2]（函数值可过键函数）

# 2. 浮点字面量解析（P736）
print(4.35e18)            # 4.35e+18（原 4.3499999999999995e+18）
print(int(4.35e18))       # 4350000000000000000（原 4349999999999999500）
print(4.35e18 == 4350000000000000000)   # True（原 False）
print(1e-320)             # 1e-320（原 0.0）
print(5e-324, 2.5e-324)   # 5e-324 5e-324（原 0.0 0.0）
print(1e309)              # inf（原 SyntaxError: invalid number）
print(3.14159e-10)        # 3.14159e-10（原 3.1415899999999997e-10）

# 3. %a / ascii() / __format__（P737）
print('%a' % 'a\nb')      # 'a\nb'（原 ValueError: unsupported format character 'a'）
print('%a' % 255)         # 255
class P:
    def __repr__(self): return 'R'
    def __str__(self): return 'S'
print('%a' % P())         # R（%a 走 repr，不吃 __str__）
print(ascii('a\nb'))      # 'a\nb'（ascii 内建为本轮新增）
v = 'a\nb'
print(f'{v!a}')           # 'a\nb'
class F:
    def __format__(self, spec): return '[' + spec + ']'
print(format(F(), 'x'))   # [x]（原 TypeError）
print(format(F()))        # []（空 spec 也分派 __format__('')）
print('%A' % 'x')         # ValueError: unsupported format character 'A'（对齐 CPython）
s = input()               # 输入 héllo（input() 放行非 ASCII，原 SyntaxError）
print(ascii(s))           # 'h\xe9llo'（\xHH 转义，大小写精确）

# 4. 调用结果属性链赋值（P738）
class N:
    def __init__(self, v, nx=None):
        self.v = v
        self.nx = nx
ns = [N(1)]
def f():
    return ns[0]
f().v = 3                 # 原 SyntaxError: expression
print(ns[0].v)            # 3
f().v += 5                # 自增赋值同样可用
print(ns[0].v)            # 8
n = N(1, N(2))
def g():
    return n
g().nx.v = 7              # 深链
print(n.nx.v)             # 7
d = {'k': N(1)}
def h():
    return d
h()['k'].v = 9            # 下标读 + 属性写
print(d['k'].v)           # 9
```

## 三、实现（P735–P738）

### P735 键函数应用帧按引用
* 根因：callval（P130）把元素渲染成**源码字面量**（reprval → tokenize → calluser）
  回放，对象/函数/类没有字面量形态，守卫直接 TypeError。这就是 v4.231 遗留的
  "键函数应用帧不可重放"。
* 修法：O/F/C 元素改走**按引用**——`assign __p4v`（dunder 保留名，与 methodcall2 的
  `__recv` 同惯例）后 `tokenize('__p4v')`，合成标识符记号求值即得对象，帧正常重放。
  消费方（map/filter/sorted/min/max 的 callval 全部调用点）自动受益。
* S/N/B/K 等可回放类型仍走原 reprval 路径（873 套件的容器回放语义不变）。

### P736 浮点字面量解析
* 根因：numlit 把记号拆成"尾数 × 10^exp"（`"4.35" × 10^18`）——已舍入的尾数双精度
  值乘幂后丢末位；`Math.pow(10,309) = Infinity` 使 `1/10^320 = 0`（次正规数全灭）；
  随后 atom 的 numbercheck 拒绝 Infinity（`invalid number`）。
* 修法：带指数的记号改为**整串一次性强转** `nres = 0 + 源文本`（JS `Number(string)`
  即正确舍入的双精度，输出端最短往返）；溢出（> 1.7976931348623157e308）置
  `z736inf` 并把 nres 改写为 P227 的文本形态 `'inf'`，numlit 尾部的 mkfloat 与 atom
  的 numbercheck 都按该标志跳过。整数/0x/0o/0b 路径不动。

### P737 %a / ascii() / __format__
* `%a`：pctfmt 的合法 conv 集是字面量 `"diouxXeEfFgGrcs"`（operator_contains，不分
  大小写）——扩入 `'a'`；pctfmt 在调 pctitem 前**大小写敏感地**（compareText）把
  `'a'` 改写为 `'r'` 走既有 %r 机器（repr + `__repr__` 分派 + 精度），返回后对结果
  跑 `z736asc` 转义。`%A` 在路由处显式拒绝（`ValueError: unsupported format
  character 'A' (0x41)`），对齐 CPython。
* `z736asc %s`：新过程。构建期生成两张字符表 **CharLo**（0x7F–0xBF、0xDF、
  0xE0–0xFF）与 **CharUp**（0xC0–0xDE）——必须按大小写**折半拆表**：Scratch 的
  itemnum/contains/EQ 全部不分大小写，单表里 é 会命中 É（\xc9 而非 \xe9）。命中的
  表内位置换算码点输出 `\xHH`（HexD 小写十六进制）。可打印 ASCII 与 repr 的反斜杠
  序列原样通过；超出 Latin-1 的字符无法取码点（无 ord 算子），原样通过（声明限制）。
* `ascii()` 内建：callfn/callfnW 各加一臂（reprval + z736asc，pending=1 + STOPTHIS，
  P286 同款）。
* `!a`：flditem 的 conv 分派对非 `'s'` 一律走 repr 包装（P728），在其后按
  `letterOf(fwspec, 2) == 'a'`（**letterOf(位数, 串)——参数顺序曾装反**）补 z736asc。
* `format(obj, spec)`：callfn/callfnW format 分支的"`O 且非空 spec → fail`"改为
  IFELSE——`FnName` 含 `InstCls + '.__format__'` 时：**先 stash 接收者**（tokenize
  会冲掉 ev）→ reprval(spec) 成带引号字面量 → tokenize → `callmeth(z736fi,
  '__format__', 1, llen(Tok))`。空 spec 分派 `__format__('')`（CPython 语义：
  object.__format__('') 即 str，故无自定义方法时旧路径等价）。无 `__format__` 且
  非空 spec 仍 TypeError。
* `input()`：callfnW/callfn 三处 `checkASCII` 调用移除——源码仍限 printable ASCII，
  但 stdin 进入的值不再被拒。

### P738 调用根属性链赋值
* 根因：execute 通用赋值分支用 **pvok** 校验目标 span，其遍历只认根标识符后的
  `[...]` 组与 `.name` 对——`f().v = 3` 得 w6ok=0，语句落空后被兜底表达式求值判
  `SyntaxError: expression`。pathset 本身没有问题：属性分支用 `eval(lo, hi-2)` 求
  接收者，而 eval 的调用根链 v4.231 已放行。
* 修法：新过程 **pvok2 %s %s** = pvok 遍历 + 任意位置的深度匹配 `(..)` 组跳过
  （`f().a`、`obj.f(x).a`、`f()['k'].a` 都合法）；仅把**通用赋值分支**的 pvok 调用
  重定向到 pvok2（methodcall2 的接收者校验与 P557 的 RHS 校验保持原 pvok）。
* 配套两处守卫：
  1. 重定向要**同时接出链**（fresh.next = 旧 next）——首轮只接入链导致 pvok2 之后
     的 gate-IF 全部孤立，多段属性赋值整体回归（探针当场抓住）；
  2. pathset 的裸根写回（`assign(Tok[lo]) + publish`）对调用根会**改写函数名**——
     `Tok[lo+1] == '('` 时跳过 assign/publish（变异经 `__pw` 已发生，传播需要值
     身份机器，声明为限制；重要的是不再写坏 `f`）。
* **连带修复 P732 的共享寄存器坑**：aug 臂在 `eval(1, k-1)` **之后**读 `z7augk`/
  `z7augop`，而调用根目标的 eval 会 calluser → execute → 函数体语句**重跑 aug 扫
  描**，把这对全局寄存器清零——rightside 拿到 lo=1（整行）→ `SyntaxError:
  expression`（v4.231 铁律 7"全局寄存器在同帧嵌套求值里会被冲"的实例）。修法：
  eval 前快照 `z7augks/z7augops`、eval 后恢复。

## 四、新测试套件（`_work/v41/_v235_*.json`，58 例）

| 套件 | 例数 | 通过 | 覆盖 |
|---|---|---|---|
| `_v235_hof` | 12 | **12/12** | map/sorted/filter/min/max 接对象属性、对象深链键、函数值过键函数、类容器下标元素、无参方法链 |
| `_v235_fmt` | 20 | **20/20** | %a 字符串/控制符/数值/对象/宽度、%A 拒绝、ascii()、!a（f-string 与 str.format）、format 自定义/空 spec/无方法报错、input 的 repr/ascii/%a/!a（é 经 stdin） |
| `_v235_num` | 16 | **16/16** | 4.35e18 三态、次正规 1e-320/5e-324/2.5e-324、1e309→inf 及其算术、max 边界、3.14159e-10、长尾数、1e-5/1e21 回归、float('1e-320') |
| `_v235_chain` | 10 | **10/10** | f().a 赋值/深链/自增/深链自增、f()['k'].a、容器属性元素写、双对象分写、字符串值 |

> 非 ASCII 值一律经 `inputs`（stdin）通道进入——源码仍是 printable ASCII（checkASCII
> 服装表机制未动）。含源码 é 的探针用例只用于确认"源码拒绝"行为本身。

## 五、验证

```bash
node _work/v41/assemble235b.cjs
V41_OUT=MiniPy_v4.235.sb3 V41_JSON=_work/v41/project235b.json \
  V41_STAMP='MiniPy v4.235 - built 2026-11-21' node _work/v41/build235b.js

node _work/v41/run_iso.mjs MiniPy_v4.235.sb3 _work/v41/_v235_hof.json  …   # 12/12
node _work/v41/run_iso.mjs MiniPy_v4.235.sb3 _work/v41/_v235_fmt.json  …   # 20/20
node _work/v41/run_iso.mjs MiniPy_v4.235.sb3 _work/v41/_v235_num.json  …   # 16/16
node _work/v41/run_iso.mjs MiniPy_v4.235.sb3 _work/v41/_v235_chain.json …  # 10/10
bash _work/v41/_reg235_all.sh        # 全量回归，结果写入 _work/v41/_reg235.log
node _work/v41/check41.cjs MiniPy_v4.235.sb3                                 # errors=0
```

`_reg235.log` 的 `_reg232` 失败清单与 `_reg232_234.json` **逐项一致**（脚本内置
对比）：gap131×4、probe230×4、real3_hof×2（finditer_map_group、
sort_key_lambda_group）、real3_pipe×1（m.re）——全部为历史声明项。

## 六、本轮踩坑（接 v4.234 记录）

1. **`JSON.stringify([...reach(id)])` 只 stringify 了 id 数组**——要逐块
   `reach().map(x => JSON.stringify(BL()[x])).join(' ')`（deep 式）。谓词静默
   假阴性的首选原因。
2. **`letterOf(位数, 串)` 参数顺序**——装反时 `letter_of(LETTER=fwspec, STRING=2)`
   静默返回空串，条件恒假（!a 转义半轮不触发的原因）。
3. **JOIN/裸字符串进 B.REP 会变成悬空块 id**（`B.REP('lit')` 把 'lit' 当块 id）→
   webfix `already has dangling block references` → **构建不写 sb3 且 exit code
   仍为 0**——旧 sb3 残留，跑批结果全部来自旧文件。每次构建后必须确认 `total=`
   行存在（本轮 map_regex_groups 的假信号即由此来）。
4. **replaceStmt 式重定向必须同时接出链**：`fresh.next = 旧.next`。首轮只接了
   SUBSTACK 入链，pvok2 之后的 w6ok/w6cap gate-IF 整体孤立——多段属性赋值当场
   全灭（探针抓住后二分定位）。
5. **insertBeforeStmt 收数组、spliceAfter 收单 id**——给 insertBeforeStmt 传
   chain() 的返回值（字符串 id）会被 `slice()` 按字符拆开再 chain。
6. **全局寄存器被函数体执行冲掉**（铁律 7 的实例）：P732 aug 臂在
   `eval(1, k-1)` 之后读 `z7augk/z7augop`，调用根目标的 eval → calluser →
   execute → 函数体语句重跑 aug 扫描把寄存器清零 → rightside 拿 lo=1。
   修法 = eval 前后快照/恢复（`z7augks/z7augops`）。
7. **大小写折叠三连**：itemnum、contains、EQ 全部不分大小写（v4.223 坑再现）——
   é 在 CharHi 里命中 É（\xc9）；`%A` 折叠进扩展后的 `'a'`。修法 = CharLo/CharUp
   按"同一折叠类不共表"拆表 + 路由处 compareText（真大小写敏感）。
8. **tokenize 冲掉 ev**——callmeth 的接收者必须在 tokenize 前 stash（`z736fi`），
   否则 InstCls 查空 → `NameError: name '.__format__' is not defined`。
9. **fail 的插桩**要 `spliceAfter(def hat)`——body head 的 predecessorOf 有陈旧
   `.next` 指针（铁律 1 的另一面）。
10. **调试通道定型**：`Dbg` 列表 + `run_dbg235.mjs`（run_iso 的变体，多 dump 一列）。
    注意 addTo 的 JOIN 实参必须 `txt()`——裸字符串经 B.REP 变悬空块 id（见坑 3）。
11. **探针 JSON 必须用 node/python 写**（坑 19 重演两次：bash 单引号 heredoc 仍会
    吃反斜杠）。
12. **`%a` 的正确路径是 pctfmt 层改写 conv**：pctitem 自己的 conv-'a' 臂（P728 建）
    在 % 路径的循环门内**不可达**——!'a' 能通是因为 flditem 自己的 repr 包装，不是
    那条臂。"臂存在"≠"臂可达"，插桩确认运行时路径是唯一可靠手段。

## 七、已知限制（更新）

* **f-string / str.format 的 `__format__` 分派未做**：`f'{p:>8}'`（自定义
  `__format__`）仍走默认对象渲染。`format()` 内建的完整分派（含空 spec）已通；
  pctitem 层的 conv-'' 分派臂在 f-string 路径的循环门内不可达，需先摸清那条运行
  时路径（见坑 12）。
* **map/sorted 的 lambda 体内带参数的方法调用**（`m.group(1)`）仍
  `missing expression`；无参方法链（`s.strip().lower()`）与属性读取已通。
  v4.231 所记"已通"实为假阴性——其用例的正则模式含双反斜杠，finditer 无匹配，
  lambda 体从未执行。本轮已把该边界写进套件（`_v235_hof` 用推导式覆盖 group(2)）。
* **顶层容器下标写**：`f()['k'] = 1`、`f()[0] = 1` 静默丢失写回（字符串模型的
  容器变异需写回属主；调用根无属主）。守卫保证不写坏 `f`；`f()['k'].a = 1`
  （属性写）与 `f().items[0] = 1`（对象属性持有的容器）不受影响。
* **括号根赋值目标**：`(f()).v = 3` 仍被解包分类器吞掉（v4.234 同）。
* **float() 溢出形态**：`float('1e309')` → `Infinity.0`（字面量 `1e309` 已是
  `inf`，float() 内建的强转值未走 P227 文本形态）。
* **format(str, 'a')**：MiniPy 按未知 spec 静默格式化，CPython 报
  `ValueError: Unknown format code 'a'`。
* **转义范围**：z736asc 只覆盖 U+007F–U+00FF（两张查表）；更高码点无 ord 算子，
  原样通过。`%a` 的宽度按转义前文本计算在非 ASCII + 宽度组合下与 CPython 有偏差。
* **源码字符集**：仍为 printable ASCII + `\n`/`\t`（checkASCII 服装表机制不变）；
  非 ASCII 值只能经 input()/stdin 进入。
* **未做**：异常组 `ExceptionGroup`/`except*`（单独一轮）。

## 八、下一轮建议

1. **异常组**：`ExceptionGroup` / `except*`（延续 v4.234 建议；需新的异常容器值
   与展开语义）。
2. **键函数帧的方法实参**：`map(lambda m: m.group(1), ms)`——lambda 体里带参数的
   方法调用在 callval 帧内 `missing expression`（先弄清 methodcall 实参 span 在该
   帧内的 Tok 依赖）。
3. **f-string / str.format 的 `__format__` 分派**：摸清 pctitem 循环门在
   flditem 路径下的运行时形态后，把 conv-'' + spec 分派臂放进可达位置。
4. **float() 溢出形态**：float('1e309') → `inf`（强转后按 z736inf 同款归一）。
5. **括号根赋值**：`(f()).a = 1`——解包分类器与属性目标的歧义消除。
6. **format(str, 'a') 报错对齐**：str 的非法 format spec 校验。

## 九、交接信息

**本轮新增文件**

| 文件 | 用途 |
|---|---|
| `_work/v41/p735.txt` … `p738.txt` | 四类补丁（assemble235b 的 parts 尾部） |
| `_work/v41/p738dbg.txt` + `assemble235dbg.cjs` → `build235dbg.js` | **仅调试**：Dbg 插桩（发布构建不加载） |
| `_work/v41/assemble235b.cjs` → `build235b.js` | 404 段组装 + 构建 |
| `MiniPy_v4.235.sb3` / `_work/v41/project235b.json` | 发布产物 |
| `_work/v41/_v235_hof/_fmt/_num/_chain.json` | 新套件（58 例） |
| `_work/v41/mk_v235_suites.mjs` | 套件生成器（JSON 必须由 node 写） |
| `_work/v41/_reg235_all.sh` / `_reg235.log` | 一键回归（结果见第五节） |
| `_work/v41/run_dbg235.mjs` | run_iso 变体：额外 dump Dbg 列表 |
| `_work/v41/inspect235.cjs` / `skel235.cjs` / `_skelgen.js` | 过程体/骨架 dumper（考古工具） |
| `_work/v41/_probe_[a-k]235*.json` 及输出 | 四类缺口定位探针（摸底记录） |

**新增全局变量**：`__p4v`（P735）、`z736inf`（P736）、`z7ai/z7ac/z7ao/z7ap/z7ah/
z7al/z736cv/z736fi`（P737）、`z7augks/z7augops`（P738）；新列表 `CharLo`/`CharUp`；
新过程 `z736asc %s`（P737）、`pvok2 %s %s`（P738）。

**构建命令**（与历史轮次一致）：

```bash
node _work/v41/assemble235b.cjs
V41_OUT=MiniPy_v4.235.sb3 V41_JSON=_work/v41/project235b.json \
  V41_STAMP='MiniPy v4.235 - built 2026-11-21' node _work/v41/build235b.js
```

**块手术铁律**见 `minipy-test-harness.md`；本轮坑 3/4/5/6/7/8/10 建议并入其清单
（尤其坑 3：webfix ERROR 后 exit=0 + 旧 sb3 残留，是"跑批结果来自旧文件"的新形态）。
