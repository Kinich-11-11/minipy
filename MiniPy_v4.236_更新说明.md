# MiniPy v4.236 更新说明

本轮按 v4.235「下一轮建议」第 2/3/4/5 条，**完成 4 大类**（第 1 条异常组继续留作
单独一轮）：

1. **键函数帧的正则值**（P739）：`Match`（R）与编译 pattern（P）值按引用过
   `map`/`sorted`/`filter`/`min`/`max` 的键函数帧——`map(lambda m: m.group(2), ms)`
   可用；
2. **f-string / str.format 的 `__format__` 分派**（P740）：`f'{p:x}'`、
   `'{0:x}'.format(p)` 走对象自定义 `__format__`；无 `__format__` 且非空 spec 报
   CPython 的 TypeError；
3. **float() 溢出形态**（P741）：`float('1e309')` → `inf`（含 `-inf` 与后续算术）；
4. **括号根赋值**（P742）：`(f()).v = 3`、`(f()).nx.v = 7`、`(x) = 5` 可用。

**构建**：`MiniPy_v4.236.sb3`（2026-11-21，总 **53,393** 块，Interpreter 50,729，
vars 2,207，lists 289，`check41 errors=0`）。组装管线 **assemble236.cjs →
build236.js**（调试变体 assemble236dbg.cjs → build236dbg.js）。

## 一、结果总览

| 套件 | v4.235 | **v4.236** |
|---|---|---|
| 新套件 `_v236_hof`（9） | — | **9/9** |
| 新套件 `_v236_fmt`（9） | — | **9/9** |
| 新套件 `_v236_num`（8） | — | **8/8** |
| 新套件 `_v236_chain`（7） | — | **7/7** |
| 主套件+探针 `_new*`+`_cov*`（873） | 872/873 | **872/873**（同一历史项 `_cov205b`） |
| `_reg232`（593） | 582/593 | **584/593**（real3_hof 两项被本轮修复，其余逐项一致） |
| mods / real / real2 / **real3_hof 14→16** / raw / gap / exc / edges / validation / `_v233_*` / demo / check41 | 同基线 | 同基线（39 套逐项对比：仅 real3_hof 两项修复，零新增失败） |

## 二、行为对照（4 大类）

```python
# 1. 正则值过键函数帧（P739）
import re
ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'ab-12 cd-34'))
print(list(map(lambda m: m.group(2), ms)))   # ['12', '34']（原 missing expression）
print([m.group(1) for m in sorted(ms, key=lambda m: m.group(1))])
print(min(ms, key=lambda m: m.group(2)).group(1))   # 'ab'
# 编译 pattern 同样按引用：
pats = [re.compile(r'a+'), re.compile(r'b+')]

# 2. f-string / str.format 的 __format__（P740）
class P:
    def __format__(self, spec):
        return '[' + spec + ']'
p = P()
print(f'{p:x}')            # [x]（原 ValueError: Unknown format code 'x'）
print('{0:x}'.format(p))   # [x]
class Q:
    def __str__(self): return 'S'
q = Q()
print(f'{q:x}')            # TypeError: unsupported format string passed to Q.__format__
                           # （对齐 CPython；原静默按 __str__ 渲染）

# 3. float() 溢出（P741）
print(float('1e309'))      # inf（原 Infinity.0）
print(float('-1e309'))     # -inf
x = float('1e309')
print(x + 1)               # inf（原 1.0）

# 4. 括号根赋值（P742）
class N:
    def __init__(self, v, nx=None):
        self.v = v
        self.nx = nx
ns = [N(1)]
def f():
    return ns[0]
(f()).v = 3                # 原 ValueError: not enough values to unpack
print(ns[0].v)             # 3
n = N(1, N(2))
def g():
    return n
(g()).nx.v = 7             # 深链
print(n.nx.v)              # 7
x = 1
(x) = 5                    # 纯括号名赋值（原 not enough values to unpack）
print(x)                   # 5
a, b = 1, 2                # 元组解包不受影响
```

## 三、实现（P739–P742）

### P739 正则值按引用
* 根因：P735 的按引用名单是 O/F/C——Match（R）仍走 repr 回放，而 Match 的源形
  `"ab-12|0|5|2|0|2|3|5|"` 被 tokenize 成 **18 个表达式记号**（`ab-12` 里的 `-` 是
  运算符），lambda 参数绑定到该表达式的求值垃圾而非 Match。
* 修法：callval 按引用 IFELSE 的条件**直接写槽**扩展 `R/P`。曾用 replaceExpr——
  refOf 命中**孤儿 guard IF**（它仍引用着复用的条件块），补丁落进死链（探针当场
  抓住）→ 改为对 IFELSE 的 CONDITION 槽直接赋值。

### P740 f-string / str.format 的 `__format__`
* 根因：f-string 管线把**格式码放进 pctitem 的 conv 槽**（`f'{p:x}'` → conv='x'），
  conv-'' 分派永不命中；"Unknown format code" 校验先于一切。
* 修法：分派上移到 **flditem**——conv 臂之后、spec 机器之前：`fwt=='O'` 且
  `FnName` 含 `InstCls+'.__format__'` 时：stash 接收者（z736fi，**tokenize 冲 ev**）→
  剥掉 spec 的前导冒号（flditem 见到的 fwspec 是 `':x'`）→ reprval 成带引号字面量
  → tokenize → `callmeth(z736fi, '__format__', 1, llen(Tok))` → 结果落 fwv/ev，置
  `z736fd=1` 跳过 spec 机器。`!s`/`!r` 转换后 fwt 已是 'S'，自然排除（CPython 对
  转换结果应用 spec）。
* **z736fd 必须在 flditem 头部复位**——首轮漏了，首次 `__format__` 分派后所有后续
  f-string 的 spec 机器被跳过（跨用例污染，坑 22 类；`f'{"ab":>6}'` 丢宽度当场
  抓住）。
* 无 `__format__` 且非空 spec：ELSE 臂报 `TypeError: unsupported format string
  passed to X.__format__`（对齐 CPython；原静默按 `__str__` 渲染或 Unknown format
  code）。空 spec 无 `__format__` 等价 `str()`，走原路径。

### P741 float() 溢出
* float 分支的强转值（JS Infinity）在 mkfloat 门（P227 的 infnan 门）之前归一：
  `ev > 1.7976931348623157e308` → `'inf'`、`< -MAX` → `'-inf'`，置 `infnan=1` 跳过
  mkfloat（floatfmt 不认 "Infinity"）。`float('inf')` 文本路径（P227）不受影响。
* **首轮回归抓到自伤**：归一化的 GT 对 P227 文本路径的 ev（'nan' 字符串）走
  **字典序比较**（'nan' > '1.79…' 为真）误触发——float('nan') 变 'inf'。修法：
  归一化加 `infnan==0` 守卫（P227 已处理的文本路径跳过；真数值 JS Infinity 才归一）。

### P742 括号根赋值
* 根因：`(` 起始的语句全部落入**三条解包路径**——两条 eqi/assignlist 克隆 +
  一条 **beqi 直调 unpackto** 的门（`beqi > 2`）——`(f()).v = 3` 被当元组解包，
  "not enough values to unpack (expected 1, got 0)"。
* 修法（预扫描 z736pc + 四处门）：
  1. **预扫描**在 execute 头部 count 初始化之后：`Tok[1]=='('` 时扫一遍记号——
     括号组**内**有逗号 → 解包目标（z736pc=0）；否则存在顶层 `=`/aug 记号 →
     单目标属性链（z736pc=1）。**必须放在 execute 头部**——插在解包分支之前会落
     进死链（陈旧 `.next`），z736pc 恒 0（探针抓住）；
  2. 三条解包路径的门全部 AND `z736pc==0`；
  3. P732 aug 扫描与通用赋值分支的 gate 扩展 `OR(Kind[1]=='I', paren&&pc)`——
     预扫描的 e 判定同时认 `=` 与 aug 记号（P732 isAug 同款）；
  4. pvok2 支持前导括号组（组后必须跟路径）；通用分支的 `w6cap>1` 门对括号根
     放行 cap≥1；
  5. pathset 裸根写回三态：普通名根照旧；**`(ident)` 纯括号名**写内层名
     （`(x)=5`）；其余（调用根/垃圾）跳过（v4.235 防腐守卫保持）。
* **aug 变体 `(f()).v += 5` 仍未通**（见七）——预扫描/门/扫描臂全部到位
  （augev/rsev 追踪确认求值正确），卡在重写后通用分支未被到达，原因未明。

## 四、新测试套件（`_work/v41/_v236_*.json`，33 例）

| 套件 | 例数 | 通过 | 覆盖 |
|---|---|---|---|
| `_v236_hof` | 9 | **9/9** | map/sorted/filter/min 键函数收 Match：group(2)、span、链上 upper、replace/join 带参方法、Pattern 值 |
| `_v236_fmt` | 9 | **9/9** | f'{p:x}'、'{0:x}'.format(p)、!s/!r 后 spec、无 __format__ 报错、f'{"ab":>6}'/f'{42:06d}' 回归、stdin é 的 ascii/%a/!a、引号转义 |
| `_v236_num` | 8 | **8/8** | float('±1e309')、溢出算术/比较、float('inf')、1e-320、4.35e18、5e-324 |
| `_v236_chain` | 7 | **7/7** | (f()).v 赋值/字面串/深链/双目标、(x)=5、元组解包回归 |

## 五、验证

```bash
node _work/v41/assemble236.cjs
V41_OUT=MiniPy_v4.236.sb3 V41_JSON=_work/v41/project236.json \
  V41_STAMP='MiniPy v4.236 - built 2026-11-21' node _work/v41/build236.js

node _work/v41/run_iso.mjs MiniPy_v4.236.sb3 _work/v41/_v236_hof.json  …   # 9/9
node _work/v41/run_iso.mjs MiniPy_v4.236.sb3 _work/v41/_v236_fmt.json  …   # 9/9
node _work/v41/run_iso.mjs MiniPy_v4.236.sb3 _work/v41/_v236_num.json  …   # 8/8
node _work/v41/run_iso.mjs MiniPy_v4.236.sb3 _work/v41/_v236_chain.json …  # 7/7
bash _work/v41/_reg236_all.sh        # 全量回归，结果写入 _work/v41/_reg236.log
node _work/v41/check41.cjs MiniPy_v4.236.sb3                                 # errors=0
```

## 六、本轮踩坑（接 v4.235 记录）

1. **refOf/replaceExpr 会命中孤儿引用**——P735 复用的条件块同时被孤儿 guard IF
   引用，replaceExpr 落进死链。改条件一律**直接写 CONDITION 槽**
   （`BL()[if].inputs.CONDITION = B.BOOL(fresh)` + parent 回填）。
2. **同形分支有克隆**：解包分类有**三条**路径（eqi 克隆 ×2 + beqi 直调 unpackto），
   只堵两条漏第三条——错误消息相同、追踪才可见。top-level 分类图（unpackto/
   assignlist/augscan/pathset 的位置表）是定位神器。
3. **语句级插桩必须插在活链上**：insertBeforeStmt 对老块（解包分支）会被陈旧
   `.next` 带进死链——预扫描改插 execute 头部 count 初始化之后。
4. **新全局标志必须复位**（坑 22 再演）：z736fd 首轮未复位，首个 `__format__`
   分派后所有 f-string spec 全部失效——`f'{"ab":>6}'` 丢宽度当场抓住。
5. **调试用的 trace 谓词自己也会踩坑 1**（ID-only stringify）——deep 式是唯一写法。
6. **探针生成器一律走文件**（mk_*.mjs）——bash 内联 node -e 的模板字面量/引号
   本轮又咬了三次。

## 七、已知限制（更新）

* **`(f()).v += 5`（括号根自增）未通**：预扫描/门/扫描臂/求值全部到位
  （augev/rsev 追踪确认 1+5=6 正确），卡在重写后通用分支未被到达，原因未明。
  括号根**普通赋值**已通。
* **`(f())['k'] = 9`**：静默丢写（容器经调用根的写回需值身份机器，v4.235 声明
  延续；守卫保证不写坏）。
* **`f'{p}'`（空 spec）不分派 `__format__('')`**：空 spec 的 f-string 不经 flditem
  的 spec 路径；`f'{p:x}'` 与 `format(p, 'x')` 已通。
* **`format(str, 'a')` 不报错**：CPython ValueError，MiniPy 静默格式化。
* **`p.pattern` / `m.re`**：Match/Pattern 值编码不含 pattern（v4.231 声明延续）。
* **转义范围 / 源码字符集 / map-lambda 带参方法调用**：同 v4.235 声明。
* **未做**：异常组 `ExceptionGroup`/`except*`。

## 八、下一轮建议

1. **异常组**：`ExceptionGroup` / `except*`（三轮延续；需新的异常容器值与展开
   语义，建议单独一轮）。
2. **括号根自增**：`(f()).v += 5`——重写后通用分支未被到达，需插桩到分支 37 的
   gate 求值（本轮的 w5gate 追踪谓词已就位，注意 deep-stringify）。
3. **`f'{p}'` 空 spec 分派**：fstr 的无 spec 路径挂 `__format__('')`。
4. **`format(str, 'a')` 报错**：str 的非法 format code 校验。
5. **`p.pattern` / `m.re`**：Match/Pattern 值编码补 pattern 字段（改 rxmkmt 与
   全部消费方）。

## 九、交接信息

**本轮新增文件**

| 文件 | 用途 |
|---|---|
| `_work/v41/p739.txt` … `p742.txt` | 四类补丁（assemble236 的 parts 尾部） |
| `_work/v41/assemble236.cjs` → `build236.js` | 408 段组装 + 构建 |
| `_work/v41/assemble236dbg.cjs` → `build236dbg.js` + `p738dbg.txt` | **仅调试**：Dbg 插桩 |
| `MiniPy_v4.236.sb3` / `_work/v41/project236.json` | 发布产物 |
| `_work/v41/_v236_hof/_fmt/_num/_chain.json` + `mk_v236_suites.mjs` | 新套件（33 例）+ 生成器 |
| `_work/v41/_reg236_all.sh` / `_reg236.log` | 一键回归 |
| `_work/v41/_probe_[a-l]236*.json` / `mk_a236.mjs` / `mk_dbg236.mjs` | 摸底探针 |

**新增全局变量**：`z736fd/z736sp`（P740）、`z736pc/z736d/z736j/z736c/z736e`（P742）
（z736fi/z736cv/z736inf/z7ai* 等沿自 v4.235）；新列表无（CharLo/CharUp 沿用）；
新过程无（pvok2/z736asc 沿用）。

**构建命令**（与历史轮次一致）：

```bash
node _work/v41/assemble236.cjs
V41_OUT=MiniPy_v4.236.sb3 V41_JSON=_work/v41/project236.json \
  V41_STAMP='MiniPy v4.236 - built 2026-11-21' node _work/v41/build236.js
```

**块手术铁律**见 `minipy-test-harness.md`（25–33 条）；本轮坑 1/2/4 建议并入：
条件改写一律直接写 CONDITION 槽（refOf 有孤儿风险）；同形分支有克隆（三条解包
路径）；新全局标志必须在宿主过程头部复位。
