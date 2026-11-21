# MiniPy v4.134 更新说明：`**` 结合性、strip 空白集、转义表、repr（P211–P214）

## 0. 一句话

四个补丁：`2 ** 3 ** 2` 从 64 变成 **512**、`-2 ** 2` 从 4 变成 **-4**（`**` 右结合 + 一元号优先级）、
`strip()` 认得 `\t`/`\n`/`\r`、`\r \v \f \a \b` 真的解码、`repr()` 会转义并按 CPython 规则挑引号。
解释器积木 26,897 → **27,003**（+106），变量 1,280 → **1,285**，合计 29,174 → **29,280**。

## 1. P211 `**` 右结合 + 一元号优先级

`eval` 解析表达式的方式是「扫描整段 token、挑**rank 最小**的运算符作为切点」，rank 来自
`rank %s`（`or`=1 … `*`/`/`/`%`=9，`**`=10）。问题是切点选择写着：

```js
if (erank > 0) and not (erank > emin):  emin = erank ; ecut = ek
```

同 rank 时**后者覆盖前者** → 取最右的运算符 → 这就是**左结合**。对 `+`/`*` 正确，对 `**` 错：

```
print(2 ** 3 ** 2)   ->  64       (CPython 512)
print(2 ** 2 ** 3)   ->  64       (CPython 256)
```

而前导的一元 `-`/`+`/`~` 被有意排除在切点之外（rank 置 0），所以「符号」作用在**底数**上而不是幂上：

```
print(-2 ** 2)       ->  4        (CPython -4)
print(-2 ** 3 ** 2)  ->  64       (CPython -512)
```

修法：
* **(a)** 同 rank 时，若运算符是 `**` 就**保留先出现的那个**（其它运算符维持"最右者胜"），
  于是切点变成 `2 ** (3 ** 2)`；混合优先级不受影响（`2*3**2`→18、`2**3*2`→16 都验过）。
* **(b)** 当这段以 `-`/`+`/`~` 开头**且**选中的切点是 `**`（`emin==10`）时，符号的作用域是
  整个幂表达式 —— 复用原来给 `not` 准备的那个分支，把它扩成三种符号，并把该调用的 `op`
  参数从字面量 `"not"` 改成 `Tok[lo]`（对 `not` 语义完全等价）。

专项套件 `_pow.json` **24/36 → 36/36**；cov1 +1、covX +2、covC +2 条转正，**0 破坏**。

> 踩坑记录：第一版把 `Tok[lo]` 写成了 `lo`（比较的是 token **下标**），而且把**同一个
> argument reporter 积木**喂给了 4 个比较 —— 后者正是仓库里 P120 记过的那条
> 「一个 block id 不能同时喂给两个输入」。两处都已修正。

## 2. P212 `strip()` 的空白集

`trimsp %s`（无参数 strip，`splitlines`/`joinlines` 也用它）里两个判断写的是
`letter(t,v) == " "`，所以只去**空格**：

```
repr('\t a \n'.strip())   ->  '\t a '     (CPython 'a')
repr('a\t'.rstrip())      ->  'a\t'
```

解释器其它地方（`ssplitw`）早就用四字符空白集，这里统一成 **空格 / \t / \n / \r**。
专项套件 `_strip.json` **13/20 → 20/20**；cov2 的 `strip chars` 一并转正。

## 3. P213 转义表补全

字符串读取器吃掉反斜杠后把下一个字符原样收下，P72 只把 `n`/`t` 映射成控制字符，其余转义
留下的是**裸字母**：

```
repr('\r')             ->  'r'          (CPython '\r')
'a\r\nb'.splitlines()  ->  ['ar', 'b']
repr('\v')('\f')('\a')('\b')  ->  'v' 'f' 'a' 'b'
```

修法：在同一处（P72 插进 `tokenize` 的那段）追加 `\r \v \f \a \b` 五个映射。
CRLF 文本从此能被 `splitlines`/`strip`/`repr` 正确对待。
两字符转义（`\xhh`、`\ooo`、`\N{...}`）与「未知转义保留反斜杠」仍不在范围内。

## 4. P214 `repr()` 会转义、会挑引号

`reprval %s %s` 只做了 `ev = ("'" & vv) & "'"`：

```
repr('\n')       ->  真的换行（控制台多出一行）    CPython '\n'
repr('a\\b')     ->  'a\b'                        CPython 'a\\\\b'
repr("it's")     ->  '''it's'''                   CPython "it's"
```

修法：先按 CPython 的规则**选引号**（默认单引号；文本里有单引号且没有双引号时改用双引号），
再逐字符转义：`\` → `\\`、当前引号 → `\'`（或 `\"`）、`\n`/`\r`/`\t` → 对应转义。
`_esc.json` 由 4/22 升到 **11/22**。

> 踩坑记录：第一版用 `chgV`（Scratch 的 `change [var] by`）来拼字符串 —— 那是**数值**加法，
> 于是 `repr(任何东西)` 都变成 `'0'`。改用 `set rvout = rvout & x` 后正常。

## 5. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.133 | **v4.134** | CPython |
|---|---|---|---|
| `2 ** 3 ** 2` / `2 ** 2 ** 3` | `64` / `64` | **`512` / `256`** | 同 |
| `-2 ** 2` / `-2 ** 3 ** 2` | `4` / `64` | **`-4` / `-512`** | 同 |
| `-a ** b`、`-f(2) ** 2`、`-2 ** -2` | 丢掉负号 | **全对** | 同 |
| `'\t\na\n\t'.strip()` | `'\ta\t'` | **`'a'`** | 同 |
| `'a\r\nb'.splitlines()` | `['ar', 'b']` | **`['a', 'b']`** | 同 |
| `repr('\n')` / `repr('\r')` | 裸控制字符 | **`'\n'` / `'\r'`** | 同 |
| `repr("it's")` | `'''it's'''` | **`"it's"`** | 同 |
| `repr('a\\b')` | `'a\b'` | **`'a\\b'`** | 同 |
| `2 ** 3 * 2` / `2 * 3 ** 2` | 对 | **仍对** | 同 |

转正用例：`_pow` 12 + `_strip` 7 + `_esc` 9 + 覆盖套件（cov1 1 / cov2 1 / covX 3）6 = **34 条**。

## 6. 回归证据

| 套件 | 结果 |
|---|---|
| cov1 / cov2 / cov3 / cov4 / covX（对照 v4.133 逐例 diff） | **0 broke**，6 fixed |
| `_pow` 36 / `_strip` 20 / `_dictset` 30 / `_nest` 24 / `_indot` 30 / `_indot2` 27 / `_dotlit` 20 | 全绿 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（29,280 块） |
| 历史复现 | **v4.133 / v4.132 / v4.100 / v4.10 全 MATCH**（v4.131 仍是上一轮查出的手工另存副本） |

## 7. 残留（本轮新查出 + 原有）

1. **`compareText` 依赖字形表**（新查出，P213 把 `\r` 正确解码后暴露）：
   字符串方法比较字符时用「切换造型 `_<char>` → 取造型编号」，控制字符没有字形，切换失败
   就退回**当前**造型号 → 任何两个非字形字符都被判成相等：
   ```
   'a\rb'.find('\r')   -> 0      (CPython 1)
   'a\rb'.count('\r')  -> 3      (CPython 1)
   'a\rb'.split('\r')  -> ['', '', '', '']   (CPython ['a', 'b'])
   'x' in 'a\rb'       -> True   (CPython False)
   ```
   专项套件 `_cr.json` 8/17。修法：造型切换后校验 `costume [name]` 是否真的是 `_<char>`，
   没有字形就走 `operator_lt/gt` 兜底。**这是下一轮首选**。
2. `repr` 对 `\v \f \a \b \0` 仍打裸字符（CPython 打 `\x0b` 等），`\xhh`/`\ooo`/未知转义未实现。
3. 整值浮点丢浮点性（值模型，见 v4.133 §7）。
4. `t = a[i]` 槽位别名（冒泡排序）、f-string 的 `{{`、`zfill` 符号位置、`startswith(元组)`、
   `%.2s` 精度、`print(sep=…, end=…)` 组合。

## 8. 落地与验证

* 新部件 `_work/v41/p211.txt`（P211–P214），插在 `p207.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：新增 `$p134 = 'P211,P212,P213,P214'`、新增 `'v4.133' = "$p134"`，
  **124 个历史版本跳表全部前置 `$p134`**。
* `head.txt` 输出版本 → **v4.134**；产物 **`MiniPy_v4.134.sb3`**。
* 块数：Interpreter 27,003（+106）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **29,280**。
* `verify-rebuild.ps1` 现在用正则 `(?m)^\$p\d+ = ` 定位跳表起点（之前硬编码 `$p132`/`$p133`，
  一旦加新变量就会漏定义 → 新补丁漏进老版本 → 看起来像"历史版本坏了"）。
* 四个补丁都按结构定位并断言数量：`eval` 里唯一的 `ecut = ek`（其前驱是 `emin = erank`）、
  `eval` 里唯一的 `unary("not")` 调用、`trimsp` 里唯一的两个单空格判断、
  `tokenize` 里唯一的 `ec == "t"`、`reprval` 里唯一的 `set ev`。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.134.sb3
node _work/v41/check41.cjs MiniPy_v4.134.sb3                     # 29,280 块 errors=0
node _work/v41/run.mjs MiniPy_v4.134.sb3 _work/v41/_pow.json     # 36/36
node _work/v41/run.mjs MiniPy_v4.134.sb3 _work/v41/_strip.json   # 20/20
node _work/v41/run.mjs MiniPy_v4.134.sb3 _work/v41/_esc.json     # 11/22（余下见 §7）
node _work/v41/run.mjs MiniPy_v4.134.sb3 _work/v41/_cr.json      # 8/17（compareText 字形依赖）
node _work/v41/run.mjs MiniPy_v4.134.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                # v4.133/v4.132/v4.100/v4.10 MATCH
```
