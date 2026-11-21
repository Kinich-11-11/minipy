# MiniPy v4.133 更新说明：容器原地写、`in` 遇点、`type()` 阶梯（P207–P210）

## 0. 一句话

四个**静默算错**的 bug：`d[k] = v` 覆盖已有键会吃掉下一对键值、`indexset` 的临时变量被嵌套求值
冲掉、带 `.` 的字符串字面量被当成数字（于是 `'1.5' in '1.5'` 报 `in requires strings`）、
`type()` 永远说 `<class 'int'>`。四个补丁只动**语义**，不动语法与报错文案；
解释器积木 26,870 → **26,897**（+27），变量 1,250 → **1,280**，合计 29,147 → **29,174**。

## 1. P207 `d[k] = v` 覆盖已有键（最要命的一条）

`indexset` 用「数 `lsep` 的位置再切片」的方式替换容器里的一个字段：字段 #k 紧跟在分隔符 #k
之后，所以「键在字段 #dgf」的**值字段**是 #(dgf+1)，要切掉的范围是
**分隔符 #(dgf+1) → 分隔符 #(dgf+2)**。

列表分支写对了（`lcount == lidx+1` / `lcount == lidx+2`，`lidx` 是 0 基元素号）。字典分支里
`dgf` 是 **1 基字段号**，第二个判断却写成 `lcount == (dgf+1)+2`，也就是 **dgf+3**——多走了一个
分隔符，于是把**下一对的键**一起切掉了。用带探针的构件实测（`_instr`）：

```
d = {'a': 1, 'b': 2} ; d['a'] = 9
dgf=1 ls=4 le=10 lc=4 xa=|Sa|N1|Sb|N2 new=|Sa|N9|N2   ->  {'a': 9, 2: ''}
                ^^ le 该是 7（分隔符 #3）
```

覆盖**最后一个**键一直是对的：坏判断永远不触发，`lend` 退回 `len+1`（后缀为空）——这正是它能
藏这么久的原因：只有「替换非末位键」会静默写坏记录，而那正是所有「累积 / 记账」类程序的核心动作。

修法：第二个判断改成 `lcount == dgf+2`。专项套件 `_dictset.json` **5/30 → 30/30**。

## 2. P208 `indexset` 私有暂存变量

这个解释器所有 `l*`/`dg*` 都是**全局**变量，而 `indexset` 会把「接收者 / 键 / 值」存在这些全局里
**跨越**对键、对值的 `eval`——那是任意用户代码。实测 `_nest.json` 12/24 失败，两个根因：

```
a = ['a'] ; d = {'a': 1, 'b': 2} ; d[a[0]] = 9
    -> {9: ''}                  indexget 冲掉了 xa/xb，切片切到了别的记录
def f(): return {'x': 1}
d = {'a': 1, 'b': 2} ; d['a'] = f()
    -> {'a': 1, 'b': 2, 'a': {'x': 1}}   dictpair 冲掉了 dgkey/dgkt -> 找不到键 -> 追加
idx = [1] ; a = [1, 2, 3] ; a[idx[0]] = 9
    -> IndexError                xa 被冲 -> 长度取错
```

修法：把 `indexset` 自己的暂存（接收者、键、值、切片、切分共 29 个名字）改名为只有它自己写的
`is*` 变量（183 处引用）。两个调用点（`execute`、`pathset`）在调用后都不读这些名字，
`ev`/`evtype`/`evK`/`error`/`pending`/`lsep`/`lesc1` 一概不动。`_nest.json` **12/24 → 24/24**。

## 3. P209 浮点提升不该重新定型字符串

`rightside` 里有一处「把右操作数提升成浮点」的补丁，守卫只看**文本**：

```js
if (contains(leftval,".") || contains(ev,".")) and evtype != "L" and not both sets:
    mkfloat(ev)
```

于是**带点的字符串字面量**也被当数字重新定型。在 `in` 分派处插探针实测：

```
print('1.5' in '1.5')  ->  op=in lt2=S evtype=N ev=1.5     <- evtype 该是 S
                           -> 字符串分支被跳过 -> TypeError: in requires strings
print('1.5' == '1.5')  ->  False（S 与 N 类型不匹配）
a = ['1.5'] ; '1.5' in a / {'a': '1.5'} 同理全灭
```

修法：只有当「带点的那一侧真的是数字」时才提升——
`(lt2=="N" and contains(leftval,".") and evtype=="N") or (evtype=="N" and contains(ev,"."))`。
合法的提升（`1.5+1`、`1+1.5`、`1.5*2`、浮点比较）全部保留；顺带修好了
`str(1.5) + 'x'` 报 `TypeError: ... 'float' and 'str'`。
`_indot.json` 20/30 → **30/30**、`_indot2.json` 15/27 → **27/27**、`_dotlit.json` 12/20 → **20/20**。

## 4. P210 `type()` 的第二个阶梯读错了值

`callfn` 的 `fn == "type"` 分支连着跑两个阶梯，都写进 `ev`：第一个写**裸名**（`float`/`int`），
第二个写 `<class '...'>`。第二个阶梯的数字判断是 `contains(ev,".")`——可那时 `ev` 里已经是
**单词** `"float"`/`"int"`，`contains("float",".")` 为假，于是所有数字都落到 `<class 'int'>`：

```
print(type(1.0))   -> <class 'int'>     （该是 <class 'float'>）
print(type('1.5')) -> <class 'str'>     （正确：S 分支在前面就赢了）
```

修法：进入分支先把值存进新变量 `tyv`，数字判断读 `tyv` 并加 `evtype == "N"` 守卫（这样 `G`/`C`/`X`
这类标签仍保持原来的 `<class 'int'>` 兜底）。两个阶梯共 2 处。P210 在 `p68.txt` **之前**执行，
所以 P68 克隆出来的 `callfnW`（RUN 真正走的那份）自动带上修复。

## 5. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.132 | **v4.133** | CPython |
|---|---|---|---|
| `d={'a':1,'b':2}` ; `d['a']=9` ; `d['b']` | `KeyError` / `{'a':9, 2:''}` | **`2` / `{'a':9,'b':2}`** | 同 |
| `d={'a':1,'b':2,'c':3}` ; `d['b']=9` | `{'a':1,'b':9, 3:''}` | **`{'a':1,'b':9,'c':3}`** | 同 |
| `a=['a']` ; `d[a[0]]=9` | `{9: ''}` | **`{'a': 9, 'b': 2}`** | 同 |
| `d['a'] = {'x':1}` / `= f()` / `= [..]` | 追加成重复键 | **正确覆盖** | 同 |
| `'1.5' in '1.5'` / `'1.5' == '1.5'` | `TypeError` / `False` | **`True` / `True`** | 同 |
| `'a' in {'a': '1.5'}` | `TypeError: in requires strings` | **`True`** | 同 |
| `type(1.0)` / `type(1e3)` / `type(1.5)` | `<class 'int'>` | **`<class 'float'>`** | 同 |
| `str(1.5) + 'x'` | `TypeError` | **`1.5x`** | 同 |
| 词频 / 库存记账 / 分组求和（cov8 真实小程序） | 全错 | **逐字一致** | 同 |

转正用例：覆盖套件 **36 条**（cov1 1 / cov3 3 / cov4 8 / cov5 1 / cov8 6 / covX 6 / covY 2 / covZ 2 / covC 7）
＋ 本次新增专项套件 **72 条**，合计 **108 条**，**0 破坏**。

## 6. 回归证据

| 套件 | v4.132 | v4.133 |
|---|---|---|
| cov1 / cov2 / cov3 / cov4 / cov5 / cov8 / covX / covY / covZ / covC | — | **0 broke**，36 fixed |
| cov6 / cov7 / cov9 / cov10 | — | 逐例不变 |
| `_dictset` 字典原地写（30） | 5/30 | **30/30** |
| `_nest` 嵌套求值冲变量（24） | 12/24 | **24/24** |
| `_indot` + `_indot2` + `_dotlit` 点号（77） | 47/77 | **77/77** |
| `_floattype` 浮点类型标签（19） | 12/19 | 17/19（余 2 条是下面 §7 的更深问题） |
| 项目自带 `gaps433.json` | 61/63 | **61/63**（不变） |
| 项目自带 `func.json` | 31/31 | **31/31**（不变） |
| `check41.cjs` 结构体检 | errors=0 | **errors=0** |
| 历史版本复现 | v4.132/v4.100/v4.10 MATCH | **v4.132/v4.100/v4.10 仍全 MATCH** |

## 7. 已知残留（下一批首选）

整值浮点会丢掉「浮点性」：MiniPy 的数字只带 `N` 标签、靠**文本里有没有 `.`** 区分 int/float，
所以结果为整数的浮点运算退化成 int：

```
print(2 * 0.5)        -> 1      (CPython 1.0)
print(1 + 1.0)        -> 2      (CPython 2.0)
print(sum([1.5,2.5])) -> 4      (CPython 4.0)
type(2 * 0.5)         -> <class 'int'>
```

修它要给数字加真正的浮点标记（新标签或 `mkfloat` 打点），并让 `strval`/`reprval`/`floatfmt`/
`tname`/`numbercheck` 一起认；属于「值模型」改动，单独一版做。

其余待办（`v4131_覆盖测试报告.md` §7）：`**` 左结合（`2**3**2`→64）与一元负号优先级（`-2**2`→4）、
`t = a[i]` 槽位别名（冒泡排序）、`strip()` 不处理 `\t`/`\n`、f-string `{{`、`zfill` 符号位置、
`startswith(元组)`、`%.2s` 精度、`print(sep=…, end=…)` 组合。

## 8. 落地与验证

* 新部件 `_work/v41/p207.txt`（P207–P210），插在 `p204.txt` 之后、`p68.txt` **之前**
  —— P210 必须早于 P68，否则 `callfnW` 的 warp 克隆拿不到修复。
* `rebuild-old.ps1`：新增 `$p133 = 'P207,P208,P209,P210'`，新增 `'v4.132' = "$p133"`，
  **并把 123 个历史版本跳表全部前置了 `$p133`**。
* `head.txt` 输出版本 → **v4.133**；产物 **`MiniPy_v4.133.sb3`**。
* 块数：Interpreter 26,897（+27）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **29,174**。
* 四个补丁都**按结构或报错文案定位**（`indexset` 里唯一的 `(dgf+1)+2`、`callfn` 里唯一的
  `fn == "bool"`/`fn == "type"` 分支、全项目 3 处浮点提升守卫），数量不对就抛错。
* 验证脚本坑：`_work/v41/verify-rebuild.ps1` 从 `$p133 = ` 开始切跳表（旧版从 `$p132 = `
  开始切，会漏掉新变量 → `$p133` 变空 → 新补丁漏进老版本，看起来像"历史版本坏掉"）。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js      # -> MiniPy_v4.133.sb3
node _work/v41/check41.cjs MiniPy_v4.133.sb3                   # 29,174 块 errors=0
node _work/v41/run.mjs MiniPy_v4.133.sb3 _work/v41/_dictset.json  # 30/30
node _work/v41/run.mjs MiniPy_v4.133.sb3 _work/v41/_nest.json     # 24/24
node _work/v41/run.mjs MiniPy_v4.133.sb3 _work/v41/_dotlit.json   # 20/20
node _work/v41/run.mjs MiniPy_v4.133.sb3 _work/v41/_indot2.json   # 27/27
node _work/v41/run.mjs MiniPy_v4.133.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.132/v4.100/v4.10 MATCH
pwsh -NoProfile -File _work/v41/rebuild-old.ps1                    # 123 个历史版本复现
```
