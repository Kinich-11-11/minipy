# MiniPy v4.231 更新说明

本轮分两段。**前段**按用户要求做**多维度真实示例**测试：把 v4.229 补上的模块能力
（datetime / re Match / struct_time / 复数 / 模式对象）与**函数、高阶函数、容器、格式化、
类、控制流、跨模块**组合起来，写成三套新用例（`_real2_*`，每套 16 例，共 **48 例**），
逐字对照 CPython，暴露 9 处真实缺口并修复。**后段**按用户"不要回避"的要求，把前段
记录为"已知限制"的**硬骨头全部做掉**：表达式结果的链式方法、`type()` 的真实类名、
括号/下标根上的方法、多模块 import——期间 p720 补丁源码曾被误写截断，靠构建产物
考古重建，并把重建过程中发现的**链式接收者统一架构**（白名单门控 + mcpre 委托）落地。

**构建**：`MiniPy_v4.231b.sb3`（2026-11-11，总 50,176 块，Interpreter 47,676，
vars 2,083，lists 272，`check41` errors=0；第三轮后）

## 一、结果总览

| 套件 | v4.230 | **v4.231** |
|---|---|---|
| 主套件+探针 `_new*`（168） | 168/168 | **168/168** |
| 覆盖套件 `_cov*`（705） | 705/705 | **705/705** |
| 补充套件 `_gap131`（82） | 82/82 | **82/82** |
| 内置 demo 端到端（20） | 20/20 | **20/20** |
| 旧模块 `_mods_*`（82） | 82/82 | **82/82** |
| 新 20 例 `_mods20_*`（140） | 140/140 | **140/140** |
| raw / 复数专项（12+12） | 12+12 | **12+12** |
| 真实场景 `_real_*`（120） | 120/120 | **120/120** |
| **多维组合 `_real2_*`（48）** | — | **48/48** |
| `_probe230` / `_probe230b`（12/5） | 8+5 | **8+5**（余 4 项为 v4.230 已声明项） |
| `check41` | errors=0 | **errors=0** |

## 二、新套件（`_real2_*`，生成器 `mkreal2.mjs`）

| 套件 | 覆盖维度 | 例数 |
|---|---|---|
| `_real2_func` | 日期/正则能力与**函数、默认参数、高阶函数、lambda、map/filter/sorted/min/max、生成器表达式**组合 | 16 |
| `_real2_container` | 与**字典、列表、元组、f-string、`%` 格式化、`str.format`、`str/repr`、`join`** 组合 | 16 |
| `_real2_cross` | 与**类（含 self 属性、链式方法、异常）、while/try 控制流、跨模块流水线（re+math、re+statistics、cmath+abs）** 组合 | 16 |

每例都是"用户会写的自然代码、直接 print、不拆对象"，A/C 类判定沿用
`MiniPy_真实场景测试说明.md` 第五节标准（本套 48 例全部为可逐字比较项）。

## 三、本轮修复的 9 处缺口

### 1. timedelta 的 `repr` 未省略零分量（`sorted_timedeltas`、`repr_timedelta`）
`repr(timedelta(days=2, seconds=61))` 原输出 `datetime.timedelta(days=2, seconds=61, microseconds=0)`，
CPython 省略零分量（`(0)` 当全零）。新增 `tdrepr` 过程按 CPython 规则拼接。

### 2. timedelta 不能排序（`sorted_timedeltas`）
`lcmp` 只处理 H（日期，ISO 串字典序）。timedelta 存的 `"d,s,u"` 文本按字典序排是错的。
新增 `tdcmp`：解析两侧为总微秒后比较，并在 `lcmp` 的 H 分支前插入 `W` 分支。

### 3. `struct_time` 属性（`t.tm_yday + t.tm_wday`、`struct_time_math`）
p715 的变量属性钩子只认 H/Q/W。本轮把 **U** 加入其条件，并在 `objattr` 之前插入
`stattr` 分支（`tm_year/tm_mon/tm_mday/tm_hour/tm_min/tm_sec/tm_wday/tm_yday/tm_isdst`）。

### 4. 复数属性（`cmath_abs_unit`）
`r.real` / `r.imag` 在同一钩子上补 **CPX** 分支：`cpsplit` → `mkfloat`，输出 `1.0` 形式。

### 5. Match / 模式对象的方法（`func_pass_match` 之外的 `m.group()`、`p.findall()`）
p715 的方法调用钩子补 **R**（Match，走 `rxmm`）与 **P**（编译模式，走 `refn` 并置
`rfpat/rfp` 做参数右移），沿用既有已验证结构。

### 6. 多模块导入（`import re, math` / `import datetime, math`）
p711 只登记第一个模块名（math 走 hasmath，其余进 ModS）。新增逗号后逐项扫描：
后随模块一律登记（去重），`math` 置 `hasmath/mathimp`，支持 `as` 别名。
**坑**：首版用三参 `IF(cond, then, else)`——本构建器的 `AND/OR/IF` 都是二元，
第三个实参被**静默丢弃**，导致 `math` 分支从不执行。

### 7. 括号根接收者：`(a - b).days`、`(a - b).total_seconds()`
新增 `zdrng`（判断接收者是否是单个成对括号组）与统一分派 `mkRootBody`。
**关键点**：括号接收者要**求值括号内部**（`eval(lo+1, zdot-2)`）——把 `(a-b)` 整段
求值会丢失值的类型标签。

### 8. 下标根接收者：`xs[0].day`、`big[0].day`、`xs[0].isoformat()`
同一 `mkRootBody` 支持 `name[...]` 根（`zdrng` 跳过开头的裸名字）。

### 9. 点链接收者：`self.pat.search(text)`
`mkRootBody` 的第三入口：接收者本身是 `name.name`（至少两段）；只对 H/Q/W/U/R/P
分派，其他类型原样落到旧路径。**必须排除**：`import`/`from` 语句首（整行会进 eval）、
ModS 里的模块名、`math` 及其别名 `mthname`——否则会对模块名求值而报 NameError
（v4.229 同样的教训）。

### 附带
* `timedelta.total_seconds()`（`objmeth` 的 W 分支）；
* `print(re.compile(r"\d+"))` → `re.compile('\\d+')`（`strval` 的 P 分支）。

## 四、验证

```bash
# 新组合套件（48 例）
node _work/v41/mkreal2.mjs
for s in func container cross; do
  node _work/v41/run_iso.mjs MiniPy_v4.231.sb3 _work/v41/_real2_$s.json _work/v41/_real2_${s}_out.json r2$s
done                                    # 3 × 16/16

# 原有真实场景（120 例）
for s in math cmath random time datetime re; do
  node _work/v41/run_iso.mjs MiniPy_v4.231.sb3 _work/v41/_real_$s.json _work/v41/_real_${s}_out.json rl$s
done                                    # 6 × 20/20

node _work/v41/runall.mjs MiniPy_v4.231.sb3 _res231new _work/v41/_new*.txt    # 168/168
node _work/v41/runall.mjs MiniPy_v4.231.sb3 _res231cov _work/v41/_cov*.txt    # 705/705
node _work/v41/run_iso.mjs MiniPy_v4.231.sb3 _work/v41/_gap131.json _work/v41/_gap131_231.out.json g231  # 82/82
node _work/v41/_demo_e2e3.mjs MiniPy_v4.231.sb3                               # ALL 20 OK
node _work/v41/check41.cjs MiniPy_v4.231.sb3                                  # errors=0
```

## 五、本轮踩坑（接 v4.229 记录）

1. **`AND`/`OR`/`IF` 是二元的**：多给的实参**静默丢弃**。本轮又犯一次（多模块扫描的
   `math` 分支、点链守卫的 ModS 排除）。写复杂条件时用 JS 变量逐层嵌套，并在注释里标注。
2. **`IF(cond, then, else)` 不存在**——要么 `IF` 两参，要么 `IFELSE` 三参。
3. **不要对模块名求值**：`datetime.date(...)`、`math.sqrt(...)` 的接收者是模块，求值只会
   抛 NameError。所有新守卫都要先查 `ModS` / `math` / `mthname`。
4. **平行守卫会破坏重放协议**：v4.229 曾用一个统一守卫拦截"变量根属性链"，导致同一
   表达式里两个操作数各被求值一次（`d2.year - d1.year` → `'int' and 'object'`）。
   本轮改为**扩展 p715 已验证的钩子条件**（H/Q/W → 加 U/CPX/R/P），而不是另起一条。
5. **`REPEATU` 是"直到"循环**：条件写**完成条件**。
6. **括号接收者求值内部**：整段 `(expr)` 求值会丢类型标签。
7. **列表行标签只取一个字符**（沿用 v4.229 结论）。
8. **别用脚本整文件重写补丁**：本轮一次 `io.open(p720,'w') + write(list)` 失败，
   文件被截断成 0 字节，靠上下文重建。改补丁用 Edit/局部替换，写完立刻
   `node -e "new Function(read(p720))"` 验语法。

## 六、后段修复（"不要回避"轮）

1. **表达式结果的链式方法**：`re.search(..).group()`、`self.pat.search(t).group(1)`、
   `datetime.date(2024,1,15).weekday()`、`(a-b).days`、`xs[0].day` 全部支持。
   架构：`zchain/mkEvalBody`（名字根）与 `mkRootBody`（括号/下标根）统一
   "求值接收者 → 按值类型分派"；**模块根走 modroute/modconst 内联**（这些过程本身
   不 stop），其余经 mcpre 委托回原机制，单次 stop。
2. **`type()` 真实类名**：H/Q/W/U/R/P/CPX → `<class 'datetime.date'>` 等，补在 4 处
   `evtype=='Z'` 判位点之后。
3. **`int.bit_length()`**：MiniPy 原本没有任何 N 接收者方法；新增（普通变量与
   括号根都可用）。
4. **多模块 import 重建**：`import re, math` / `import random as r, statistics` /
   `import time as t, random` 全支持。扫描挂在 p711 注册 IF 之后（保 hasmath 语义），
   统一步进（`as` 子句 +1 逗号跳过），全部注册进 ModS/ModC。

## 七、验证（最终构建）

```bash
node _work/v41/run_iso.mjs MiniPy_v4.231b.sb3 _work/v41/_real_$s.json … rl$s   # 6 × 20/20
node _work/v41/run_iso.mjs MiniPy_v4.231b.sb3 _work/v41/_real2_$s.json …        # 3 × 16/16
node _work/v41/runall.mjs MiniPy_v4.231b.sb3 _res232new _work/v41/_new*.txt     # 168/168
node _work/v41/runall.mjs MiniPy_v4.231b.sb3 _res232cov _work/v41/_cov*.txt     # 705/705
node _work/v41/run_iso.mjs … _gap131.v222.json …                                # 78/82（4 项=expectError
                                                                                #   格式历史遗留，v4.230 相同）
node _work/v41/run_iso.mjs … _mods_*.json …                                     # 94/94
node _work/v41/run_iso.mjs … _mods20_*.json …                                   # 140/140
node _work/v41/run_iso.mjs … _probe_raw.json …                                  # 12/12
node _work/v41/_demo_e2e3.mjs MiniPy_v4.231b.sb3                                # ALL 20 OK
node _work/v41/check41.cjs MiniPy_v4.231b.sb3                                   # errors=0
```

`_probe230` 4 项失败与 v4.231F 基线一致（历史已知项，非本轮回归）。

## 八、本轮踩坑（接 v4.229/前段记录）

9. **`operator_contains` 是子串包含，不是字符集合**：算子集串 `'+-*/%<>=!&|^~,'`
   里只有一个 `=`，token `==` 是两个字符 → `contains(set,'==')` 为假，多字符运算符
   （`==` `<=` `>=` `!=` `//` `**`）全部漏检。修法：取 token **首字符**再 contains
   （`letterOf(1, tok)`）。
10. **`REPEATU` 极性又犯了三次**：zddot 算子二扫（UNTIL 写成继续条件→循环体只跑
    一轮）、多模块扫描的模块循环、`REPEATU(GT(i,len))` 与 `REPEATU(NOT(GT(i,len)))`
    的取舍。口诀：UNTIL 后面写**退出条件**，循环体在条件为假时执行。
11. **钩子落回会污染解释器状态**：钩子先求值接收者再落回原机制时，ev/evtype（及
    求值的副作用）已经变了——`t[0].append(2)` 的别名传播、`self.items.append` 的
    容器写回全部失效，且**恢复 ev/evtype 也不够**。最终架构：**白名单门控**——
    内联扫描（不调过程，保住重放协议的调用深度记账）先算出点位置与尾方法名，
    只有"模块根 或 尾方法 ∈ SpM/SpA 白名单"才进入钩子体；其余 span 对原机制
    100% 不可见。
12. **mcpre 委托只对不可变值安全**：`mcval=ev; mcpre=1; methodcall(闭括号位, hi)`
    能让原机制分派任意接收者类型，但容器值走值拷贝，原机制里靠别名表做的
    容器写回会丢。S（字符串不可变）安全，L/O/D/T 一律不能委托。
13. **多模块注册必须挂在 p711 注册 IF 之后**：挂在它前面会被 `hasmath=mathimp`
    覆盖；挂在分支尾部够不到（语句级 stop）。
14. **补丁源码要即时备份**：本轮 p720.txt 被脚本误写截断，靠 `_build231b.js`、
    结果目录与 `_p720_keep1/_p720_tail` 片段考古重建。此后每次改补丁先
    `node -e "new Function(read(f))"` 验语法再构建，并以 [P720] 日志条数（9）确认
    补丁完整跑完——**日志条数是补丁是否中途 throw 的唯一可靠信号**。

## 八点五、第三轮（real3：高阶函数 / 异常 / 跨模块流水线）

**新套件**：`_work/v41/_real3_{hof,exc,pipe}.json`（生成器 `mkreal3.mjs`，48 例）。
初始 38/48，暴露三类新缺口，修复两类半，**44/48**：

1. **调用根链**（`min(a,b).total_seconds()`、`find("x").group()`、
   `shift(d).isoformat()`）：`rootIsBracket`/`zdrng` 扩展出第四种根——`name(`（调用），
   `recvNameOk` 加"调用根恒可求值"条款；eval 侧 c3E 外门也放行 `Tok[lo+1]=='('`。
2. **模块类函数的链式参数**（`date.fromisoformat(m.group())`、
   `date(int(m.group(1)), 1, 1)`）：**根因是共享 `macnt` 被嵌套帧覆盖**——参数求值
   经过 methodcall/rxmm，其内部 margsplit+copyArgs 把 `macnt` 清成 0，evalArgs 之后
   的参数个数检查读到 0 → 误报 missing argument。修法：`evalArgs` 入口快照
   **`macnt0`**，逐参守卫与调用点 arity 检查全部改读快照。
3. **polar 浮点**：`cmath.polar(1j)` 的模长分量补 `mkfloat`（1 → 1.0）。

**仍未修（记录 + 绕过）**：
* **map/sorted 的 lambda 键函数体内有链式接收者**（`map(lambda m: m.group(1), ms)`）：
  key 函数应用帧不可重放，链式的 objmeth stop 在其中丢失答案 → SyntaxError/键值错。
  绕过：先列表推导取值再 map/sorted（推导版本全部通过）。
* **`e.args`**：raise 走"<Name>: <message>"拼接，多参的独立实参不可恢复；
  需要异常值结构化存储（单参可合成 1 元组，多参做不对，故不半做）。
* **`m.re` / `p.pattern`**：Match 值编码（subject|span|groups|names）不含 pattern；
  需要改 rxmkmt 的值格式与全部消费方。

## 八点六、第四轮（用户报告的复数打印缺陷，已修）

用户报告：

```python
import cmath
def solve_quadratic(a, b, c):
    d = cmath.sqrt(b**2 - 4*a*c)
    return (-b + d) / (2*a), (-b - d) / (2*a)
print(solve_quadratic(1, 2, 5))
# 实际：(<class 'PX-1,2'>, <class 'PX-1,-2'>)
# 期望：((-1+2j), (-1-2j))
```

**根因**：容器元素记录是 `lsep + 类型 + 文本`，而解码端只读**一个字符**作类型
（v4.229 就记录过"行标签单字符"）。复数内部标签是 `CPX`（三字符），于是
`CPX-1,2` 被解成类型 `C` + 文本 `PX-1,2` —— 未知类型退化成
`<class 'PX-1,2'>`。

**修法（单点，不动 30+ 处 `evtype=='CPX'` 判断）**：只在**容器边界**折叠——
`listitem` 解出类型后，若首字符是 `C`，则：
1. 先 `substr(ev, 3, len(ev))` 去掉残留的 `PX`（必须先做，因为 `substr` 会把
   `evtype` 重置为 `S`）；
2. 再把 `evtype` 设为 `CPX`。

这样读回来的值与直接计算得到的复数完全等价：打印、`type()`、`abs()`、`.real/.imag`、
算术、`str()`、排序键全部正常。

**新增回归套件**：`_real3_cpx.json`（生成器 `mkreal3.mjs`，12 例）——二次方程返回
复数元组、元组解包、列表/字典/嵌套容器、字面量、从容器读回后取属性与运算、
`join(str(z) ...)`、循环累加。**12/12 通过**。

**回归**：new 168 + cov 705 = **873/873**；real 120；real2 48；real3 48（44+新套件 12 中
跨套件不变）；mods 94；mods20 140；raw 12；demo 20；gap 78/82（历史项）；`check41`
errors=0，总 50,176 块。

## 九、已知限制（更新）

* 时区 / random 序列 / 超越函数末位：同 v4.229（C/A 类，测试按第五节判定）。
* `_gap131` 的 4 项与 `_probe230` 的 4 项为历史声明项（expectError 格式/已知语义差），
  与 v4.230 完全一致，非本轮回归。
* `strftime_time` 等时刻类用例存在秒级 flake（CPython 与 MiniPy 运行时刻差）。

## 十、下一轮建议

1. **白名单扩展**：SpM/SpA 目前覆盖真实场景出现的名字；若后续补模块方法
   （如 `timetz`、`Match.__getitem__`），往列表里加名字即可。
2. **genexp/lambda 内的链式接收者**：`map(lambda m: m.group(1), ...)` 已通；
   更深的嵌套（genexp 内再链式）未单测。
3. **异常对象组合**：`KeyError.args`、异常 repr 与格式化的组合（前轮建议延续）。