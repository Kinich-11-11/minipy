# MiniPy v4.233 更新说明

本轮按 v4.231「下一轮建议」第 1/2 条与 v4.232「下一轮建议」第 1/2/3 条，**完成 5 大类**：

1. **异常链**（P727）：`raise X from Y` + `__cause__`/`__context__`/`__suppress_context__`/`__traceback__`；
2. **f-string 转换标志**（P728）：`!s`/`!r`/`!a` 修通（根因 = P288 包装读陈旧全局）；
3. **银行家舍入 + `type(x).__name__`**（P729）：bignum 精确十进制展开 + C/S 接收者早退；
4. **datetime 扩展**（P730）：`timetz`/`time`/`replace`(含 kwargs)/`isoweekday`/`ctime`/`timetuple`/`isocalendar` + `datetime.time` 构造器；
5. **Match 补全**（P731）：`span`/`pos`/`endpos`/负组号/下标 `m[i]`/属性 `string`/`lastindex`/`lastgroup`。

**构建**：`MiniPy_v4.233.sb3`（2026-11-20，总 **52,657** 块，Interpreter **49,9xx**，
vars 2,179，lists 285，`check41` **errors=0**）

## 一、结果总览

| 套件 | v4.232 | **v4.233** |
|---|---|---|
| 主套件+探针 `_new*`+`_cov*`（873） | 873/873 | **873/873** |
| 跨模块回归 `_reg232`（593） | 582/593 | **582/593**（11 项失败清单与 v4.232 完全一致） |
| 异常专项 `_exc232`/`_edges`/`_probe232` | 60+25+10 | **60/60、25/25、10/10** |
| `_exc232_validation` | 9/12 | **11/12**（+2：`custom_exception_str_repr`、`format_primitives` 本轮修好） |
| mods 20 例 ×7（140） | 140/140 | **140/140** |
| 真实场景 `_real_*`（120） | 120/120 | **120/120** |
| `_real2_*`（48） | 48/48 | **48/48** |
| `_real3_*` | 68+12 | **同基线**（hof 14/16、pipe 15/16、exc 16/16、cpx 12/12，失败项=历史声明项） |
| raw / gap131 | 12 / 78 | **12/12 / 78/82**（4 项历史声明项） |
| 内置 demo 端到端 | 20/20 | **ALL 20 OK** |
| **新套件 `_v233_*`（5 类，84 例）** | — | **15/16 + 16/16 + 19/19 + 18/18 + 16/16** |
| `check41` | errors=0 | **errors=0** |

## 二、行为对照（5 大类）

```python
# 1. 异常链
try:
    try:
        raise ValueError('inner')
    except ValueError as e:
        raise TypeError('outer') from e
except TypeError as out:
    print(type(out.__cause__).__name__)   # ValueError
    print(out.__cause__.args)             # ('inner',)
    print(out.__suppress_context__)       # True
try:
    try:
        raise ValueError('v')
    except ValueError:
        raise KeyError('k')               # 隐式链
except KeyError as k:
    print(type(k.__context__).__name__)   # ValueError
e = ValueError('plain')
print(e.__cause__, e.__suppress_context__)  # None False

# 2. 转换标志
class P:
    def __str__(self): return 'STR'
    def __repr__(self): return 'REPR'
p = P()
print(f'{p!s}|{p!r}')                     # STR|REPR
print(format(p, ''))                      # STR
e = MyErr('payload')                      # 自定义 __str__/__repr__ 的异常
print(f'{e!s}|{e!r}')                     # cs|cr

# 3. 舍入（bignum 精确展开：2.675 的精确值 < 2.675）
print(f'{2.675:.2f}')                     # 2.67（原 2.68）
print(f'{3.25:.1f}')                      # 3.2（原 3.3，平局取偶）
print(round(0.135, 2))                    # 0.14（原 0.13）
print(round(2.675, 2))                    # 2.67
print(type(d).__name__)                   # Dog / ValueError / date（原 AttributeError）

# 4. datetime
import datetime
dt = datetime.datetime(2024, 1, 15, 10, 30, 45)
print(dt.timetz(), dt.time())             # 10:30:45 10:30:45
print(datetime.date(2024, 1, 15).replace(year=2025))   # 2025-01-15
print(datetime.date(2024, 1, 15).ctime())              # Mon Jan 15 00:00:00 2024
print(datetime.date(2024, 1, 15).isocalendar())        # ...IsoCalendarDate(year=2024, week=3, weekday=1)
print(datetime.time(10, 30, 45))          # 10:30:45

# 5. Match
m = re.search(r'(\w+)@(\w+)', 'user@site')
print(m[1], m[-1])                        # user site（下标，含负数）
print(m.span(), m.string, m.lastindex)    # (0, 9) user@site 2
```

## 三、实现（P727–P731）

### P727 异常链
* raise 分支头部做 **深度 0 的 `from` 扫描**（ex727f），异常表达式取 `2..from-1`、
  cause 取 `from+1..count`（CPython 求值顺序：先异常后 cause）；
* cause 是异常类 → 零参实例化（CPython 行为）；不是异常/None → `TypeError: exceptions
  must derive from BaseException`——**isanc 吃类名**，实例 id 要先过 `InstCls` 映射
  （P724 同款）；
* raise 时写 4 属性：`__cause__`（有 from → cause 值；无 → None）、`__context__`
  （ExActiveId 栈顶，空则 None）、`__suppress_context__`（有 from → True）、
  `__traceback__`（None）；
* fail 合成路径（ex25implicit）与 KeyError 站点（ex25key）补 `__context__`=活动异常
  + 默认值；构造路径（callfn/callfnW/callcls）补 4 默认值；
* 属性读走既有 IAttr 实例属性表，无新钩子；裸 raise 重抛同一实例，属性自然保留。

### P728 转换标志
* 根因：P288 在 pctitem 里的 dunder 包装检查**全局 evtype/ev**，flditem 的 spec 路径
  先调 fldspec→substr 把全局 evtype 重置成 'S' → 包装条件恒假 → `!s`/`!r` 全落默认渲染。
* 修法（三层）：(a) pctitem 的 dunder 守卫改读参数 vt/vv；(a2) flditem 的 conv 分派
  （strval/reprval on fwv/fwt）包 dunder 包装；(b) format() 路由（P725 的 callfn/
  callfnW/builtin2b）与 strfmt 的 strval 调用补包装。
* conv `'a'`/`'r'` → reprval。**实测否决了一个方案**：在 strval/reprval 入口加 dunder
  分派会劫持 repr 的 strval 兜底路径（repr(p) 回归成 'STR'），已回退。

### P729 舍入 + type().__name__
* **zfexact v n**：倍乘循环找 v = m/2^k（m 整数化，全部精确）→ A = digits(m)+'0'*n →
  bgdv(A, 2^k)（bignum 长除，除数倍加构造）→ 2R vs 2^k 决定进位（> up，= 平局取偶，
  < down）；k > 53+4n 时 2^k > A 恒成立 → 直接判下。整值文本含 '.'（'14.0'）时取
  FLOOR 的纯数字面；含 e/n（指数形/Infinity/NaN）落回原路径。
* 挂点 1：pctitem 的 %f 分支整体重构（精确成功 → pin/pfs 从 zfeD 切片；失败 → 原路径）；
  挂点 2：round(x, n) 正 ndigits 臂（P550 锚点，整臂挪进 IFELSE），n 从 qpow 逐次 /10
  还原，结果 ADD(…,0) 归一化。
* type().__name__：P265 快速通道改 zddot 版（print 实参里 hi 停在 ')'，原 hi-at-attr
  条件永不触发）+ zf729nm 剥壳（`<class '…'>`/`__main__.`/模块限定名）；链式分派两份
  副本 + objattr 宿主前插 C/S 接收者早退；F 接收者走 FnName 索引。

### P730 datetime
* objmeth 新分支：isoweekday/ctime/timetuple(zcmkst 复用)/isocalendar（**周四算法**：
  ISO 年 = 该周周四所在年，跨年周归属正确）/replace（位置+kwargs 扫描器仿 timedelta
  构造器）/timetz+time（"HH:MM:SS"）；dtfn 补 `datetime.time([hour[, minute[, second[,
  microsecond]]]])`（含 kwargs），unknown-guard 放行 'time'；SpM 补名。
* 坑：`substr` 是**闭区间**（ctime 的 day/month 片段按长度传参全错）；zdpad 后要立刻
  捕获 ev（mkTime 初版三段共用一个 zpadv → 10:10:10）。

### P731 Match
* rxmm 加 span/pos/endpos + 负组号（m[-1] = 组数+下标+1，越界 IndexError）；
* objattr 头部加 R 分派（rxattr：string/lastindex/lastgroup/pos/endpos）——**必须插在
  setV(mraf,0) 之后**（插在前面会被清零重置，failb 恒触发）；objattr 宿主条件放行 R
  （只扩"顶层链含 objattr 且不含 objmeth"的纯属性宿主，9 处）；
* indexget 加 R 分派：m[0]/m[1]/m[-1] → rxmm('group', iglo, ighi)；
* SpA 补名 string/lastindex/lastgroup/pos/endpos。

## 四、新测试套件（`_work/v41/_v233_*.json`，84 例）

| 套件 | 例数 | 通过 |
|---|---|---|
| `_v233_exchain` | 16 | 15/16（`nested_two_levels` = 已知缺口，见七） |
| `_v233_conv` | 16 | 16/16 |
| `_v233_round_type` | 19 | 19/19 |
| `_v233_dt_match` | 18 | 18/18 |
| `_v233_genexp` | 16 | 16/16 |

## 五、验证

```bash
node _work/v41/run_iso.mjs MiniPy_v4.233.sb3 _work/v41/_v233_*.json …   # 见上表
node _work/v41/runall.mjs MiniPy_v4.233.sb3 _work/v41/_res233all _work/v41/_new*.txt _work/v41/_cov*.txt
# TOTAL total=873 pass=873 fail=0
node _work/v41/run_iso.mjs MiniPy_v4.233.sb3 _work/v41/_reg232.json …   # 582/593（=v4.232 基线）
node _work/v41/_demo_e2e3.mjs MiniPy_v4.233.sb3                          # ALL 20 OK
node _work/v41/check41.cjs MiniPy_v4.233.sb3                             # errors=0
```

## 六、本轮踩坑（接 v4.232 记录）

1. **REPEATU 极性第三次**：zfexact 半化循环、补零循环、round 的 nFromQpow 全写成了
   "继续条件"——半化循环导致 zfexact 恒 bail（舍入看似修好其实是 P550 在撑），
   nFromQpow 导致 n≥1 精确臂从不运行、n=0 死循环。口诀不变：**UNTIL 后写退出条件**。
2. **replaceStmt 只挂头块**（铁律 1 再犯）：__name__ 快速通道重建时 IF 链尾被丢，
   改手工接线（pred→head…tail→nx）。
3. **find 回调第一参是块对象、第二参才是 id**：`predecessorOf(b)` 用了对象 → 恒空。
4. **`I('operator_contains')` ≠ `data_listcontainsitem`**：dunder 包装的列表包含写成了
   字符串包含+列表字段（畸形块恒真）→ callmeth 无守护执行 → `Q has no attribute
   __str__`。
5. **链式手术要克隆公共块**：pctitem %f 分支重构时新旧链共用 signIf 等块，`.next`
   单亲被新链改写 → legacy 臂绕回新链 → 死循环。臂内公共块必须 cloneTree。
6. **setStack 吃数组**：传了 chain() 的返回 id 会按字符拆链（`t.blocks['z']` 崩）。
7. **mraf 清零顺序**：objattr 的 R 分派插在 `setV(mraf,0)` 之前 → rxattr 的 mraf=1
   被重置 → failb 恒触发。插在后。
8. **argumentids 是块 id 不是参数名**：按位置映射（rxmm 名在第 2 位、refn 在第 1 位）。
9. **strval/reprval 入口 dunder 分派方案否决**：repr 的 strval 兜底路径被劫持
   （repr(p)→'STR'），改为修 P288 包装的条件来源。
10. **lmeth 实验否决**：methodcall 的 R/P 钩子改读 lmeth 会让 m.group() 全坏（该执行点
    lmeth 未赋值，得到 'undefined0'），回退 Tok[lo+2]。
11. **reach 返回 Set**：`[...reach(x)].has(i)` 是数组没有 has，直接 `reach(x).has(i)`。
12. **基座 proc 可能被克隆**：type() 的插入要同时进 callfn 与 callfnW；flditem/pctitem
    已被后续补丁重构过（fwv/fwt、P151 替换），锚点前先 dump 现状。
13. **整值浮点的值文本带点**：'14.0' 直传 JOIN 会把 '.' 带进数字串——A 构造含点时取
    FLOOR 的字面。

## 七、已知限制（更新）

* **异常链**：`nested_two_levels`（两层 cause 链的中间层读取为 None）未修；uncaught
  场景 cause 校验失败时 ErrV 会被被 raise 的实例覆盖（bad_cause_type 显示 ValueError
  而非 TypeError）；`__traceback__` 恒 None（CPython 为 traceback 对象）。
* **转换标志**：`!a` 非 ASCII 转义为 repr 现状（与 CPython \xXX 形式有差异）；无
  `__str__` 只有 `__repr__` 的对象 `{q!s}` 走默认渲染（v4.232 同）；`'%r' % p` 走
  strval 兜底（v4.232 同，`f'{p!r}'` 与 `repr(p)` 正确）。
* **舍入**：%e/.ne 格式仍走原舍入（本轮只修 f 族与 round）；值文本 ≥1e21 的指数形落回
  原路径；ndigits<0 的 round 维持原路径。
* **type**：`type(类值).__name__` 仍为 int（CPython 'type'）；`type(x)` 返回 C 型值，
  len(x)/x+'!' 等按 'object' 报错（v4.232 同）。
* **datetime**：`datetime.time`/`timetz` 返回 S 型字符串（print 与 CPython 一致，
  type() 为 str）；`isocalendar()` 返回 IsoCalendarDate repr 字符串（不可解包）；
  timetuple 的 tm_isdst=0（CPython date.timetuple 为 -1）。
* **Match**：`m.re` 未实现（需改 Match 值编码）；map/filter 的 lambda 体内链式接收者
  （`map(lambda m: m.group(2), it)`）仍不可用（v4.231 已声明；推导式全部可用）。
* **kwargs**：内建调用的关键字参数（`int('ff', base=16)`）不支持（v4.232 同，本轮
  datetime.replace/time 的 kwargs 为 objmeth/dtfn 内部扫描，非通用机制）。

## 八、下一轮建议

1. **嵌套 cause 链**：nested_two_levels 的中间层 `__cause__` 读取（排查 exrefsync 对
   '__cause__' 属性的干扰）。
2. **map/filter lambda 的链式体内建**：v4.231 遗留的"键函数应用帧不可重放"。
3. **%e/.ne 的精确舍入**：复用 zfexact（需先算 10 冪对齐首数位）。
4. **`%r` 的 pctfmt 路径**：conv-'r' 分支的外层守卫同样改读参数（本轮外层修复引入
   NameError 已回退，需查 JOIN 描述符构形）。
5. **异常组**：ExceptionGroup / except*（单独一轮）。
