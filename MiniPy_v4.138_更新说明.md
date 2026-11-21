# MiniPy v4.138 更新说明：repr 的 `\xhh`、元组前缀、以及一个 scratch-vm 的平台坑（P220）

## 0. 一句话

三件事：`repr()` 把 BEL/VT/FF 打成 `\xhh`；`startswith`/`endswith` 接受**元组**前缀
（以前按记录串长度比较，永远 False），其它非字符串实参抛出 CPython 的 TypeError；
另外查出一个**平台级**问题——scratch-vm 在加载工程时会把 `text` 字段里的 **U+0008 变成空串**，
所以 P213 给 `\b` 加的映射其实在**静默丢字符**，本轮把它退化为原来的字母 `b`。
解释器积木 27,156 → **27,210**（+54），变量 1,296 → **1,297**，合计 29,433 → **29,487**。

## 1. P220(a) repr 的控制字符

CPython 的 `repr` 把控制字符写成转义：`repr('\v')` = `'\x0b'`。P214 只处理了
`\ \n \r \t` 和引号，其余原样输出，于是 VT/FF/BEL 直接变成裸字节进控制台：

```
repr('\v') -> '<VT>'      (CPython '\x0b')
repr('\f') -> '<FF>'      (CPython '\x0c')
repr('\a') -> '<BEL>'     (CPython '\x07')
```

现在转义链末端补上 BEL(7)/VT(11)/FF(12) → `\x07`/`\x0b`/`\x0c`。

## 2. P220(b) `startswith` / `endswith` 接受元组

```
'abc'.startswith(('z','a'))        -> False    (CPython True)
'abc'.endswith(('z','c'))          -> False    (CPython True)
'abc'.startswith(('b','x'), 1)     -> False    (CPython True)
'abc'.startswith(['z','ab'])       -> False    (CPython TypeError)
```

`methodcall` 只把第一个实参的**文本**交给 `sprefix`，元组的文本是它的记录串
（`len()` 是记录串长度），切片比较自然永远不等。现在：

* 实参是 `T`（元组）→ 逐个元素走原来的 `sprefix`/`sprefix2` 分派（有无 start/end 三种情形），
  命中即短路，结果仍是布尔；
* 实参既不是字符串也不是元组（列表/集合/字典/数字/None…）→ 抛
  `TypeError: <方法名> first arg must be str or a tuple of str, not <类型名>`（用 `tname` 取类型名）。

`_cov2` 的 `startswith endswith tuples`、`_covX` 的 `startswith tuple`/`endswith tuple`、
`_covC` 的 `startswith tuple` 全部转正。

## 3. 平台坑：scratch-vm 会丢掉字面量里的 U+0008

P213（v4.134）给字符串转义补了 `\r \v \f \a \b`。本轮做 repr 时发现 `repr('\b')` 打出 `''`
——**字符不见了**。逐步定位：

1. 构建产物 `project.json` 里那个 `text` 字段确实是 1 个字符、码点 8（用 `zipRead` 直接读原始 JSON 验证）；
2. 但**真正经 scratch-vm 加载后**，同一个字段读出来是**空串**（写了个只加载工程、打印码点的小工具验证）：

```
bdatase_lg5vjn3nh op=text len=1 codes=13     <- \r 存活
bdatase_lg8xf3hyq op=text len=1 codes=11     <- \v 存活
bdatase_lgbm0baen op=text len=1 codes=12     <- \f 存活
bdatase_lgeeuwfm5 op=text len=1 codes=7      <- \a 存活
bdatase_lghswpdz0 op=text len=0 codes=       <- \b 变成空串！
```

3. 用「把 `\z` 映射到码点 8」做对照实验：`len('\z')` = **0**、`len('\b')` = **1**（此时 `b` 已无映射）
   —— 证明丢的是**字符 8 本身**，与转义字母无关。

结论：在 Scratch 字面量里**无法表示 U+0008**（至少经 scratch-vm 加载的路径不行）。
既然 `\b` → 空串会**静默吞掉一个字符**（比原来更糟），P220 把 `tokenize` 里那条
`ec == "b"` 分支改成空操作，`\b` 回到「保留字母 b」的旧行为。
repr 侧也不再为 BEL 之外的码点 8 生成分支（那个比较字面量同样会被清空）。

> 这条对以后的转义/NUL 类改造同样成立：**凡是小于 0x20 的字符，先确认它能否生存在字面量里**。

## 4. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.137 | **v4.138** | CPython |
|---|---|---|---|
| `repr('\v')` / `repr('\f')` / `repr('\a')` | 裸控制字节 | **`'\x0b'` / `'\x0c'` / `'\x07'`** | 同 |
| `repr('\b')` | `''`（丢字符） | **`'b'`**（已知无法表示，回退旧行为） | `'\x08'` |
| `'abc'.startswith(('z','a'))` | `False` | **`True`** | 同 |
| `'abc'.endswith(('z','c'))` | `False` | **`True`** | 同 |
| `'abc'.startswith(('b','x'), 1)` | `False` | **`True`** | 同 |
| `'abc'.startswith(['z','ab'])` | `False` | **`TypeError: startswith first arg must be str or a tuple of str, not list`** | 同 |
| `'abc'.startswith('ab')` / `.endswith('bc')` | 对 | **仍对** | 同 |

转正用例：覆盖套件 **4 条**（cov2 1 / covX 2 / covC 1）＋ `_slice` 的元组前缀 3 条、
`_esc` 的 `\v \f \a` 3 条、`_bs` 的 `len('\b')` 1 条。

## 5. 回归证据

| 套件 | 结果 |
|---|---|
| cov1 / cov2 / cov3 / cov4 / cov5 / cov8 / covX / covC（逐例 diff） | **0 broke**（cov2 +1、covX +2、covC +1） |
| `_prt` 12/12 · `_bool` 8/8 · `_swap` 17/17 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 · `_dictset` 30/30 · `_nest` 24/24 | 全绿 |
| `_floatarith` 34/35 · `_fstring` 17/18 · `_esc` 14/22 · `_slice` 8/20 · `_bs` 1/8 | 见 §6 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（29,487 块） |
| 历史复现 | **v4.137 / v4.136 / v4.135 / v4.134 / v4.133 / v4.132 / v4.100 / v4.10 全 MATCH** |

## 6. 本轮查明但**未修**的两条（下一批首选）

1. **扩展切片赋值是语法错误**（6 条用例）：
   ```
   a = [1,2,3,4,5]; a[::2] = [0,0,0]     ->  SyntaxError: expression   (CPython [0,2,0,4,0])
   del a[::2]                            ->  SyntaxError: expression
   ```
   带步长的**读**（`a[::-1]`）是好的，赋值/删除的解析路径不支持第三个冒号。要改解析器 + 赋值路径。
2. **`'abc'[::0]` 的 ValueError 抓不住**（2 条用例）：
   ```
   try: 'abc'[::0]
   except ValueError: print('caught')     ->  异常逃出 try（CPython 打印 caught）
   ```
   对照实验很有指向性：`'abc'[0:3:0]`、`'abcdef'[1::0]`、`'abcdef'[:5:0]` **都能抓住**，
   只有**两端都省略**的 `[::0]` 抓不住 —— 说明错误虽然由同一个 `indexget` 里的 `fail` 抛出，
   但 `[::step]` 这条路径上的 `error` 没被 try 的语句级检查看到。需要插桩 trace 才能定位。

其余既有待办不变：别名/引用语义（`a[:]`/`.copy()` 深拷贝、嵌套函数修改不可见）、
浮点十进制 vs 二进制（`round(2.55,1)`）、`chr()` 只支持 32..126（95 字形限制）、
`\xhh`/`\ooo`/未知转义、闭包与 `nonlocal`、生成器耗尽、`__str__` 分派、类属性共享、
多继承 `isinstance`。

## 7. 落地与验证

* 新部件 `_work/v41/p220.txt`（P220），插在 `p219.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：新增 `$p138 = 'P220'`、新增 `'v4.137' = "$p138"`，
  **128 个历史版本跳表全部前置 `$p138`**。
* `head.txt` 输出版本 → **v4.138**；产物 **`MiniPy_v4.138.sb3`**。
* 块数：Interpreter 27,210（+54）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **29,487**。
* 新调试工具：`_work/v41/vmval.mjs`（用真实 scratch-vm 加载 .sb3，打印指定字段的码点）
  —— 区分「构建产物里是对的」和「加载后是对的」就靠它。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.138.sb3
node _work/v41/check41.cjs MiniPy_v4.138.sb3                      # 29,487 块 errors=0
node _work/v41/vmval.mjs _work/v41/_p220.sb3                      # 字面量码点（含 U+0008 丢失）
node _work/v41/run.mjs MiniPy_v4.138.sb3 _work/v41/_slice.json   # 8/20（余下见 §6）
node _work/v41/run.mjs MiniPy_v4.138.sb3 _work/v41/_esc.json     # 14/22
node _work/v41/run.mjs MiniPy_v4.138.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.137…v4.10 MATCH
```
