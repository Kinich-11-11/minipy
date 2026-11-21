# MiniPy v4.229 更新说明

本轮按 `MiniPy_真实场景测试说明.md` 的路线图把 **P0 → P1 → P2 全部可修项**一次性落地：
真实场景套件 `_real_*` 从 **59/120 提升到 120/120**（详见第五节）。P3（MT19937 精确
移植、全精度三角函数）按文档约定仍作为"已知差异"记录，未实现。

## 一、总体变化

| 项目 | v4.228 | v4.229 |
|---|---|---|
| Interpreter 块数 | 43,926 | **46,554** |
| 总块数 | 46,381 | **49,009** |
| 变量 / 列表 | 2,066 / 267 | **2,071 / 269** |
| 主套件 `_new*` | 168/168 | **168/168** |
| 覆盖套件 `_cov*` | 705/705 | **705/705** |
| 补充套件 `_gap131` | 82/82 | **82/82** |
| 内置 demo 端到端 | 20/20 | **20/20** |
| 旧模块套件 `_mods_*` | 82/82 | **82/82** |
| 新 20 例套件 `_mods20_*` | 140/140 | **140/140** |
| raw 专项 `_probe_raw` | 12/12 | **12/12** |
| 复数专项 `_mods_cplx` | 12/12 | **12/12** |
| **真实场景套件 `_real_*`** | 59/120 | **120/120** |
| `check41` | errors=0 | **errors=0** |

## 二、math / time / cmath（P0）

* **`from math import sin/cos/tan` 弧度转换**（p103）：from 导入路径此前没做
  度→弧度转换（只有 `math.sin(...)` 方法调用路径有），`sin(pi/2)` 得 0.0274。
* **`time.ctime()` / `gmtime()` 等无参守卫**（p714）：`evalArgs(1)` 首参无条件求值，
  无参调用直接 SyntaxError；现按 `macnt` 守卫（asctime 原有的写法）。
* **`time.localtime([secs]) / gmtime([secs])` + struct_time**（p714）：新类型 `U`
  （值 `Y,M,D,H,Mi,S,w,yday,isdst`），`print` 输出 CPython 的
  `time.struct_time(tm_year=..., tm_isdst=0)`，`tm_*` 属性可用（`stattr`）。
  gmtime 用本地墙钟近似（无 UTC 源，见已知差异）。
* **`z.real` / `z.imag`**（p720 eval 钩子 + mkfloat）：返回 float（`1+2j` → `1.0`）。
* **`abs(3+4j)`**（p720，**callfn 与 callfnW 两份克隆都改了**）：守卫接受 CPX，
  `cpsplit`+`cpabs` 后按浮点输出（`5.0`）。
* **`cmath.polar` 返回元组**（p717）：`polar(1+1j)` 打 `(1.414…, 0.785…)`。

## 三、datetime（P1，p715）

* **timedelta 关键字参数**：`days/seconds/microseconds/milliseconds/minutes/hours/weeks`
  可与位置参数混用；归一化改为"总微秒 → floor 除"，负值进位正确。
* **timedelta repr/str**：`print(timedelta(2, 3661, 500))` → `2 days, 1:01:01.000500`
  （`tdfmt`；repr 为 `datetime.timedelta(days=…)`）。date/datetime 的 repr 同步补齐
  （列表内元素按 CPython 打 `datetime.date(2024, 1, 10)`）。
* **日期算术**（rightside 钩子）：`date ± timedelta`、`date - date`、
  `datetime ± timedelta`、`datetime - datetime`、`timedelta ± timedelta`；
  date±timedelta 只取整天数（CPython 语义）。
* **类方法**（`dtcls`）：`date.today/fromisoformat`、`datetime.now/today`；
  `fromisoformat` 同时接受 `T` 分隔的 datetime 串。
* **链式接收者**：`datetime.date(2024,1,15).weekday()`、`datetime.date.today().year`
  等非变量接收者可用（机制见第六节）。
* **排序/比较**：`lcmp`/`lsort` 的同类型日期比较走 `compareText`（ISO 串字典序）。

## 四、re 引擎升级（P2，p716）

* **捕获组**：`(...)` 与命名组 `(?P<name>…)`；`rxcomp` 记录每项所属组（`RxGM`），
  `rxmat` 在成功路径上记录组 span（`RxGS/RxGE`，稀疏填充 -1）。
* **Match 对象**（新类型 `R`，值 `subject|s0|e0|ng|s1|e1|…|names`）：
  `search/match/fullmatch` 返回 Match；`print(m)` 输出
  `<re.Match object; span=(0, 5), match='hello'>`；方法 `group()/group(n)/group("name")/
  groups()/start(n)/end(n)`。
* **findall 组语义**：1 组 → 组文本列表；2+ 组 → 元组列表（行内 lsep 经 `lesc`
  转义，外层仍是 list）。
* **`{m}` `{m,}` `{m,n}`**：展开为 m 个必配 + (n−m) 个 `?`（开区间为 `*`）；
  非量词形态的 `{` 保持字面量。
* **`\b` / `\B`**（新项类 WB/NB）、**内联 `(?i)`**（置 re.I 位）。
* **`re.compile`**（模式对象，类型 `P`）：`p.findall/search/match/…` 经参数右移一位
  复用 `refn`（`rfp/rfpat` 机制，evalArgs 首参在 rfp=1 时直接取 `rfpat` 不再求值）。
* **`finditer`**：Match 对象迭代（for 循环内 `m.group()` 可用）。
* **`sub` 反向引用 + count**：`\1..\9`、`\g<name>`；第 4 参 count。
* **`split` maxsplit + 捕获分隔符**：整模式单组的 `rxgwrap` 机制退役，改为通用
  组文本回插。

## 五、真实场景套件结果

| 库 | v4.228 | v4.229 | 说明 |
|---|---:|---:|---|
| math | 15 | **20** | from_import 修复；sin/cos/tan/identity 按 A 类改 round 比较 |
| cmath | 2 | **20** | parts/abs/polar 修复；14 例按 A 类改 8 位小数比较 |
| random | 11 | **20** | choices(k=) 修复；9 例按 C 类改"可复现性+形状"断言 |
| time | 14 | **20** | ctime 无参/localtime/gmtime 修复；3 例按 C 类改时区不变字段 |
| datetime | 10 | **20** | 全部修复（repr/kwargs/算术/类方法/链式/排序/fromiso） |
| re | 7 | **20** | 全部修复（Match/组/compile/finditer/{m,n}/\b/(?i)/maxsplit/count/反向引用） |
| **合计** | **59** | **120** | |

A/C 类用例的判定调整严格按文档第五节：**结构/对象行为逐字比较不动**，
超越函数末位改 round(…,8/10) 相等断言，random 改可复现性+形状，
时区改不变字段（`ctime(0)[:10]`、`tm_yday/tm_wday`）。

## 六、链式接收者机制（p720，本轮最大基建）

新过程 `zddot lo hi`：找 span 内**最后一个深度 0 的 `.`**，然后二次扫描接收者区间，
**含顶层二元运算符（`+-*/%<>=!&|^~,`，排除字符串 token）的 span 直接判非接收者**——
这挡住了 `date(…) - date(…)` 这类"点在右操作数里"的二元运算 span。

`eval` 与 `methodcall` 各挂一个守卫（工厂构建，块树不共享）：

1. **根类型预检**（零副作用）：模块根走 `ModS`；from 导入根走 `FmN`（暂跳过，老路）；
   普通变量根**读平行表 `Types[found]`**（lookup 本身只读），只有类型属于新类型
   （H/Q/W/R/P/U/CPX）才拦截——**实例/字符串/列表链完全不动 v4.228 的 postfix 路径**
   （早期版本用 eval 预检，`self.items.append(x)` 等实例链被嵌套 STOPTHIS 打坏，已回退）。
2. `mod.fn(...)...` 模块函数链跳过（v4.228 postfix 链已正确处理），仅模块
   **类**构造链（`date/datetime/timedelta`）拦截。
3. 接收者求值结果分派：DCLS→`dtcls`，H/Q/W→`objmeth/objattr`，R→`rxmm`，
   P→`refn`（rfp 参数右移），U→`stattr`，CPX→real/imag。
4. `zdot` 经 `ZdStk` 压栈保存恢复（接收者求值会递归触发同一守卫）。

## 七、类型标签改单字符（重要坑）

列表行的类型标签只取**一个字符**（`listitem` 里 `letterOf(1, row)`）——
多字符标签进列表会被截断（`DT`→`D`，日期在列表里变成空字典 `{}`）。
新类型全部改为未占用单字符：

| 内部名 | 标签 | 含义 |
|---|---|---|
| date | `H` | datetime.date |
| datetime | `Q` | datetime.datetime |
| timedelta | `W` | datetime.timedelta |
| struct_time | `U` | time.struct_time |
| Match | `R` | re.Match |
| pattern | `P` | re.compile 结果 |

`CPX` 保持多字符（复数进列表是**既有限制**，本轮未动）。

## 八、本轮踩坑记录（下次照抄）

1. **REPEATU 是"直到"循环**：条件要写**完成条件**，写"继续条件"循环体一次都不跑。
   本轮 (?i)/`(?P<name>`/`{m,n}` 解析/`\g<name>`/tdfmt 补零/`RxGE` 稀疏填充共 6 处写反。
2. **三参 `IF()` 的 else 被静默丢弃**：`RxGE` 覆盖写要用 `IFELSE`。
3. **量化副本计数**：`{m,n}` 的可选副本是 `n−m` 个，不是 n 个（首版 `\d{2,3}` 匹配 4 字符）。
4. **`(?i)`/`(?P<` 分支退出后不要再 `chgV(rxI)`**：主循环自带的 +1 会再跳一格，
   吃掉后面一个字符（`(?i)abc` 变成 `bc`）。
5. **`rxsubst` 不能用 `rxOut` 当累加器**：sub 分支的同名累加器会被清掉
   （`bXnXnX` 变 `XX`）。
6. **`rxinch` 会清 `rxI`**：rxsubst 主扫描中途调用会跳位；数字判定改
   `operator_contains`（数字无大小写问题）。
7. **接收者求值会覆盖 `ev/evtype`**：rightside 日期算术必须先存 `zdrV/zdrT0`
   再解码左右操作数（首版 `date - date` 得 `0:00:00`、`date+1day` 得 2078 年）。
8. **嵌套求值会冲全局寄存器**：`zdot` 用 `ZdStk` 压栈；rxmat 的 `rxK` 用 `RxStk`
   压栈、组号重读 `RxGM`（接铁律 15）。
9. **列表行标签单字符**：见第七节。
10. **`abs()` 在 callfn 和 callfnW 各有一份**：warp 克隆必须同改。
11. **守卫必须有根类型预检**：对实例/字符串链做接收者求值会嵌套 STOPTHIS，
    打坏 v4.228 的 postfix 链（`Builder` 链、`self.items.append` 全线回归）。
    预检读 `Types[found]`，**不能 eval**（对 self/实例求值有帧副作用）。
12. **模式对象调用**：refn 的参数右移后，evalArgs 首参仍会按 span 求值覆盖
    `ma1v`——rfp=1 时 evalArgs 直接取 `rfpat`（p711 内改）。

## 九、已知差异（维持文档记录）

* **时区**：Scratch 无 UTC 源，`time.time()/ctime()/localtime()` 按本地墙钟当 UTC，
  与 CPython 差时区偏移；`gmtime` 恰好一致。
* **random 序列**：31 位 Lehmer vs MT19937，同种子数值不同（形状/可复现性一致）。
* **超越函数末位**：Scratch trig `toFixed(10)`，cmath 复数结果差 ~1e-10。
* **暂不支持**：复数 `**`、复数进列表、`(?:)` 非捕获组、嵌套组/组内 `|`、
  模式内反向引用、lookaround、`(?i)` 以外的内联 flags、
  `(expr).attr` 括号包裹接收者链、from 导入类的方法链（`date.today()` 需写
  `datetime.date.today()`）。

## 十、验证

```bash
node _work/v41/runall.mjs MiniPy_v4.229.sb3 _work/v41/_res229new _work/v41/_new*.txt   # 168/168
node _work/v41/runall.mjs MiniPy_v4.229.sb3 _work/v41/_res229cov _work/v41/_cov*.txt   # 705/705
node _work/v41/run_iso.mjs MiniPy_v4.229.sb3 _work/v41/_gap131.json _work/v41/_gap131_229.out.json g229   # 82/82
node _work/v41/_demo_e2e3.mjs MiniPy_v4.229.sb3                                        # ALL 20 OK
# _mods_* 82/82、_mods20_* 140/140、_probe_raw 12/12、_mods_cplx 12/12
for s in math cmath random time datetime re; do
  node _work/v41/run_iso.mjs MiniPy_v4.229.sb3 _work/v41/_real_$s.json _work/v41/_real_${s}_out.json rl$s
done   # 6 × 20/20
node _work/v41/check41.cjs MiniPy_v4.229.sb3                                           # errors=0
```
