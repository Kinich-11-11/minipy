# MiniPy v4.223 更新说明

本轮新增六个标准库模块：`cmath`、`random`、`statistics`、`time`、`datetime`、`re`。
全部通过新的模块分派基础设施 P711 接入，模块实现为补丁 P712–P717。

## 一、总体变化

| 项目 | v4.222 | v4.223 |
|---|---|---|
| Interpreter 块数 | 41,507 总 | 45,704 总（Interpreter 43,249） |
| 主套件 `_new*` | 168/168 | **168/168** |
| 覆盖套件 `_cov*` | 705/705 | **705/705** |
| 补充套件 `_gap131` | 82/82 | **82/82** |
| 内置 demo | 20/20 | **20/20** |
| 新模块套件 `_mods_*` | — | **71/71** |
| `check41` | errors=0 | **errors=0** |

## 二、新基础设施（P711）

之前解释器只认识 `math` 一个模块（P23 在 methodcall 里按 `mthname` 分派、P87 处理
`math.pi`/别名、P103 处理 `from math import`），新增模块无从挂载。P711 建立模块表：

* **列表** `ModS`（写的别名）/`ModC`（规范名）：`import X`、`import X as m` 时追加；
  `math` 仍走旧的 `hasmath`/`mthname` 通道（`mathimp` 记录「有没有导入过 math」，
  避免导入 random 时把 hasmath 清零）。
* **`from X import a, b`**：名字进 `FmN`/`FmM`，裸调用（`randint(1, 6)`）直接路由到模块。
* **三个分派过程**，各带「未命中」兜底（`mrfn`/`mrcf`/`mraf` 旗标）：
  * `modroute 函数名 lo hi` —— 模块函数调用；
  * `modconst 模块 属性` —— `cmath.pi`、`re.I`、`datetime.date` 这类属性；
  * `modattr 类型 名字` / `objmeth …` —— 实例属性与方法（P715/P717 用）。
* **`margsplit lo hi`**：按顶层逗号切参数，写 `MArP`（各参数起始位置 + 哨兵）。
  逗号若属于字符串字面量（`Kind == 'S'`）不算分隔符——否则 `re.split(',', s)` 会炸。
  配套 `copyArgs/evalArgs` 把边界拷进 `maKa/maKb` 再求值，避免嵌套模块调用冲掉 `MArP`。

## 三、各模块

### statistics（P712）
`mean fmean geometric_mean harmonic_mean median median_low median_high mode multimode
pvariance variance pstdev stdev`。求和用 Neumaier 补偿；全整数数据走整数除法，
自然得到 CPython 的 `mean([1,3]) == 2`（而非 `2.0`）。空数据/样本数不足的
`StatisticsError` 文案对齐 CPython。

### random（P713）
`seed random uniform randint randrange choice choices sample shuffle getrandbits gauss`。

> **注意**：CPython 用 Mersenne Twister，其 32 位乘法在 Scratch 的 53 位双精度里会溢出，
> 无法位级复刻。这里改用 31 位 Lehmer（`state = 48271*state mod 2^31-1`）。
> 因此**同种子的数值与 CPython 不同**，但可复现、范围/数量/形状全部一致。
> 测试只断言可复现性与范围，不断言具体数值。
> `choices` 的 `k` 只能按位置传（关键字参数未支持）。`shuffle` 仅在实参是裸变量名时原地改。

### time（P714）
`time time_ns perf_counter perf_counter_ns monotonic monotonic_ns process_time
process_time_ns sleep ctime asctime strftime`，用 Hinnant 的 civil-days 算法做日期换算。

> **注意**：Scratch 的 `current [year/month/…]` 只有本地时间、没有时区偏移，
> 所以 `time.time()` 把本地时间当 UTC 处理（月/日/时/分/秒各分量精确，整值差一个时区）。
> `strftime` 支持 `%Y %y %m %d %H %M %S %j %A %a %B %b %p %I %F %T %%`。

### datetime（P715）
`datetime.date(y,m,d)`、`datetime.datetime(y,m,d[,h,mi,s])`、`datetime.timedelta([d[,s[,us]]])`、
`datetime.now()`、`datetime.today()`；属性 `.year .month .day .hour .minute .second`
与 timedelta 的 `.days .seconds .microseconds`；方法 `.isoformat() .strftime(fmt)
.weekday() .toordinal() .date()`。

* 值编码：日期 `"YYYY-MM-DD"`（类型 DT）、日期时间 `"YYYY-MM-DD HH:MM:SS"`（DTT）、
  timedelta `"days,seconds,micros"`（TD）。因为是 ISO 文本，`print` 直接正确，
  字符串相等也等价于日期相等。
* 属性/方法通过 eval 属性分支与 methodcall 头部的新钩子接入（先 `lookup` 判变量，
  避免把 `math`/`datetime` 这类模块名当变量求值）。
* **未支持**：时区、日期加减运算符、`datetime.datetime.now()` 这种「类→方法」两级链
  （用 `datetime.now()` 替代）。

### re（P716）
`search match fullmatch findall sub split escape` + 常量 `re.I`。
编译为三个平行列表 `RxQ`（量词）/`RxY`（种类）/`RxD`（数据），匹配是递归回溯（`rxmat`）。

支持的语法：字面量、`.`、`\d \D \w \W \s \S \n \t \r`、转义的元字符、
`[abc] [^abc] [a-z]`、贪婪 `* + ?`、`^…$` 锚点、顶层 `|` 交替、`re.I`。

**未支持**：分组/捕获、反向引用、环视、`{m,n}`、Match 对象——`search/match/fullmatch`
返回匹配到的**文本**（str）或 `None`，`findall` 返回文本列表。

> 注意：MiniPy 的字符串字面量会吃掉未知转义（`'\d'` → `'d'`），写正则请用
> **两个反斜杠** `'\\d+'`（raw string `r'\d'` 尚未支持）。

### cmath（P717）
`sqrt exp log log10 sin cos tan asin acos atan sinh cosh tanh phase polar rect isnan isinf`
+ 常量 `pi e`。

* 复数用类型标签 **CPX**，值 `"re,im"`；`strval` 前插入分支，按 CPython 规则打印
  （`1j`、`(2+0j)`、`(-1-2j)`，去掉多余的 `.0`）。
  标签最初用 `'C'`，实跑发现 `'C'` 已被「类名」占用（异常对象打印成 `(ZeroDivisionError+0j)`），
  改为 `CPX` 后主套件/覆盖套件恢复全绿。
* **未支持**：`1j` 字面量与复数运算符；`polar()` 返回列表（MiniPy 无元组表示）；
  `asin/acos/atan/sinh/cosh/tanh` 仅接受实数实参。

## 四、本轮踩坑（补丁层）

1. **`IF(c, ids)` 没有第三个参数**：写成 `IF(cond, [a], [b])` 时 else 被静默丢弃
   （P716 里一个量词分支就这么没了，表现为「所有 + 匹配只吃一个字符」）。要用 `IFELSE`。
2. **Scratch 的 `=` 与 `contains` 都不分大小写**：`\d` 和 `\D` 会同时命中，
   `%m`/`%M`、`%a`/`%A`、`%b`/`%B` 同理。凡只有大小写差异的分支，
   一律用 `compareText`（写进 `cmp`）判等。
3. **`change variable by` 是自增**：`chgV('x', ADD(VAR('x'), d))` 会变成 `x += x + d`
   （P712 的方差算出了 4 倍值）。只传增量。
4. **过程参数在重复调用时不可靠**：`statvar`/`statmed` 改成读全局变量后正常；
   模块分派一律把实参先落到 `maKv` 全局。
5. **共享判定子树会被 webfix 丢掉**：同一判据块用两处 → 一处静默失效。
   P712 改为「每个函数一个过程」，共享的 `numGuard` 也拆成工厂函数。
6. **`margsplit` 边界差一**：`MArP[i+1]` 是下一参数起点，中间参数要减 2（跳过逗号），
   最后一个参数减 1。写错时数组字面量会带上逗号，`eval` 报 `missing expression`。
7. **`evalArgs(n)` 不能无条件求值第 n 个参数**：参数不足时 `maKb = 0-1 = -1`，
   `eval(7, -1)` 直接 `SyntaxError: missing expression`。要按 `macnt` 守卫。
8. **`pruneUnreachable` 会吞掉孤立的块簇**，而 webfix 的 `dangling>0` 会让构建**静默不写 sb3**
   （看起来 build 跑完了，实际产物是旧的）。改完补丁务必看构建输出的最后一行。
9. **裸 JS 字符串当块 id**：`setV('x', '')`、`inStr(v, ',')` 之类把裸字面量当块引用，
   产出 `id=""` 的悬空引用。字面量一律 `txt()`。
10. **过程定义顺序**：`callProc('foo')` 在 `newProc('foo')` 之前会抛 `definition not found`。
    新过程要放在使用它的过程前面。

## 五、复跑命令

```
cd _work/v41
node assemble219.cjs
V41_OUT=../../MiniPy_v4.223.sb3 V41_STAMP="MiniPy v4.223 - built 2026-11-08" node build41.js
node check41.cjs ../../MiniPy_v4.223.sb3
node runall.mjs ../../MiniPy_v4.223.sb3 _res223main _new*.txt
node runall.mjs ../../MiniPy_v4.223.sb3 _res223cov _cov*.txt
node run_iso.mjs ../../MiniPy_v4.223.sb3 _gap131.json _gap223.out.json g
for f in _mods_stat _mods_rnd _mods_time _mods_dt _mods_re _mods_cp _mods_misc; do
  node run_iso.mjs ../../MiniPy_v4.223.sb3 $f.json ${f}_out.json t
done
```

## 六、下一轮建议

* `re`：分组与 Match 对象（`.group() .span() .start() .end()`），可复用 P717 的
  `objmeth` 钩子把类型扩展为 `RX`。
* `datetime`：日期加减 (`d + timedelta`)、`datetime.datetime.now()` 两级链。
* `cmath`：`1j` 字面量与复数运算符（需要右侧算术钩子，参照 P589 的 bgops 挂点）。
* `random`：若要数值级对齐 CPython，需要实现 MT19937 的 32 位拆分乘法（工作量约 100+ 块）。
