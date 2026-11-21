# MiniPy v4.139 更新说明：扩展切片赋值 `a[i:j:k] = seq`（P221）

## 0. 一句话

带步长的切片**赋值**以前是 `SyntaxError`——`indexset` 只认第一个冒号，把「第二个冒号 + 步长」
当成 stop 表达式去求值。现在它记录第二个冒号、按 CPython 的 `slice.indices(n)` 语义取值、
并把带步长的目标交给新的 `sliceset` 过程逐个元素写回（长度不符时给出 CPython 那条
`ValueError: attempt to assign sequence of size N to extended slice of size M`）。
解释器积木 27,210 → **27,393**（+183），变量 1,297 → **1,309**，合计 29,487 → **29,670**。

## 1. 问题

```
a = [1,2,3,4,5]; a[::2] = [0,0,0]   ->  SyntaxError: expression   (CPython [0,2,0,4,0])
a = [1,2,3,4];   a[::2] = [9,9]     ->  SyntaxError: expression   (CPython [9,2,9,4])
a[1::3] = [0,0]                     ->  SyntaxError: expression   (CPython [1,0,3,4,0,6])
a[::-2] = [7,8,9]                   ->  SyntaxError: unexpected token (CPython [9,2,8,4,7])
```

**读**带步长的切片（`a[::-1]`）一直是好的，只有赋值不行。`indexset` 的切片分支是这样的：

```
isSlc = 第一个深度为 0 的 ':' 的位置 ; isSp = ']' 的位置
if isSlc > lo+2:            isSlS = eval(lo+2, isSlc-1)        # start
if isSlc < isSp-1:          isSlE = eval(isSlc+1, isSp-1)      # stop  ← 这里含进了第二个 ':'
eval(isSp+2, hi) → repl ; slicewrite(name, recv, isSlS, isSlE, repl)
```

对 `a[::2]`，stop 的区间是 `: 2` → 表达式解析器报 `SyntaxError: expression`。

## 2. 修法（P221）

**解析层**（`indexset`）：

* 冒号扫描时同时记录**第二个**冒号（新变量 `isSl2`），并加两个「用户是否写了 start/stop」的
  标志 `isSlH`/`isSlP`；
* stop 的区间改成 `isSlc+1 .. isSl2-1`；
* 步长取 `isSl2+1 .. isSp-1`（默认 1），非整数报 `TypeError: slice step must be an integer`；
* `isSl2 == 0` 时仍走原来的 `slicewrite`（步长 1 的路径**完全不变**），否则走新的 `sliceset`。

**运行层**（新过程 `sliceset %s %s %s %s %s %s (name,recv,xs,xe,st,repl)`）：

按 CPython `PySlice_AdjustIndices` 的规则算边界——`lower`/`upper` 随步长符号变
（步长 > 0 时 `lower=0, upper=n`；步长 < 0 时 `lower=-1, upper=n-1`），**只有用户写出来的**
start/stop 才做「加 n、再夹紧」的调整（默认值直接用，不能被再调整一次，否则 `a[::-2]` 的默认
stop `-1` 会被算成 `n-1`）。然后：

1. 走一遍目标槽位**数个数**；
2. 与 `len(repl)` 比较，不等就报那条 CPython 原文错误；
3. 再走一遍，按切片顺序逐个 `lsetv`（元素级替换），最后 `assign` + `publish` 写回。

步长为负时槽位是**倒序**的，所以 `a[::-2] = [7,8,9]` 是 `a[4]=7, a[2]=8, a[0]=9` →
`[9,2,8,4,7]` ✓（第一版我把步长区间的起点写成了 `isSl2+2`，把 `-` 号漏掉了，于是变成顺序赋
`[7,2,8,4,9]`；已修正为 `isSl2+1`）。

## 3. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.138 | **v4.139** | CPython |
|---|---|---|---|
| `a=[1,2,3,4,5]; a[::2]=[0,0,0]` | SyntaxError | **`[0, 2, 0, 4, 0]`** | 同 |
| `a=[1,2,3,4]; a[::2]=[9,9]` | SyntaxError | **`[9, 2, 9, 4]`** | 同 |
| `a=[1,2,3,4,5,6]; a[1::3]=[0,0]` | SyntaxError | **`[1, 0, 3, 4, 0, 6]`** | 同 |
| `a=[1,2,3,4,5]; a[::-2]=[7,8,9]` | SyntaxError | **`[9, 2, 8, 4, 7]`** | 同 |
| `a=[1,2,3,4]; a[::2]=[1]` | SyntaxError | **`ValueError: attempt to assign sequence of size 1 to extended slice of size 2`** | 同 |
| `a[1:3]=[9]`、`a[1:2]=[8,9,10]`（无步长） | 对 | **仍对** | 同 |
| `a[::-1]`、`a[::-2]`、`a[4:1:-1]`（读） | 对 | **仍对** | 同 |

转正用例：`_slice` 8/20 → **14/20**（6 条）＋ cov3 2 条（`slice step assignment`、
`slice assignment length mismatch caught`）＋ covX 2 条（`slice step assign`、`slice step assign with step 3`）。

## 4. 回归证据

| 套件 | 结果 |
|---|---|
| cov1 / cov3 / cov4 / covX / covC（逐例 diff） | **0 broke**（cov3 +2、covX +2） |
| `_dictset` 30/30 · `_nest` 24/24 · `_swap` 17/17（都是 `indexset` 重路径） | **逐例不变** |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 | 全绿 |
| `_floatarith` 34/35 · `_fstring` 17/18 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（29,670 块） |
| 历史复现 | **v4.138 / v4.137 / v4.136 / v4.135 / v4.134 / v4.133 / v4.132 / v4.100 / v4.10 全 MATCH** |

## 5. 过程事故与恢复（值得记一笔）

做 `rebuild-old.ps1` 的跳表更新时，我用

```powershell
Set-Content _work/v41/rebuild-old.ps1 $linesArray -NoNewline    # ← 错
```

把**整个文件拍平成了一行**（58,813 字符，内容都在、换行没了；`#` 注释因此吞掉后面的代码，
脚本无法解析）。没有 git、没有备份，于是写了个恢复脚本 `_work/v41/fixrebuild.cjs`：

* 内容其实完好，只是换行丢了 —— 在**可靠的分隔点**重新断行：
  `$变量 = '...'` / `$变量 = "..."`（各占一行）、`'vX.Y' = "..."`（跳表条目各占一行）、
  `#`（注释块在每个 `#` 处切开，恢复原来的注释行）；
* 末尾的驱动循环按原样重写（行为一致：设置 `V41_SKIP/OUT/JSON/STAMP` → `build41.js` → `compare.cjs`）。

结果：384 行、**129 条**跳表条目，`Parser::ParseFile` 语法检查 OK，
`verify-rebuild.ps1` 跑 **v4.138 … v4.10 全 MATCH**（其中 v4.138 MATCH 正好证明 P221 被正确排除在
旧版本之外）。备份留在 `_work/v41/rebuild-old.flat.bak`。

> 教训：`Set-Content -NoNewline` 传**数组**会把元素直接拼接；要按行写就用默认的 `Set-Content`（不加
> `-NoNewline`），或者先 `-join "`n"`。

## 6. 残留（下一批）

1. **`del a[::k]`**（1 条）：`indexdel` 与 `indexset` 同构，还没做同样的改造（需要再加一个
   「按目标下标重建记录」的过程）。
2. **`'abc'[::0]` 的 ValueError 抓不住**（2 条，含新的 `a[::0] = ...` 写入形式）：对照实验显示
   `[0:3:0]`/`[1::0]`/`[:5:0]` 都能被 `except` 抓住，只有**两端都省略**的 `[::k]` 抓不住 ——
   `fail` 由同一条路径抛出却逃出 try，需要插桩 trace 才能定位。
3. 既有待办：别名/引用语义（`a[:]`/`.copy()` 深拷贝、嵌套函数修改不可见）、浮点十进制 vs 二进制、
   `chr()` 只支持 32..126、`\xhh`/`\ooo`、闭包与 `nonlocal`、生成器耗尽、`__str__` 分派、
   类属性共享、多继承 `isinstance`。

## 7. 落地与验证

* 新部件 `_work/v41/p221.txt`（P221），插在 `p220.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`（已重建）：`$p139 = 'P221'`、`'v4.138' = "$p139"`，128 个旧版本条目全部前置 `$p139`。
* `head.txt` 输出版本 → **v4.139**；产物 **`MiniPy_v4.139.sb3`**。
* 块数：Interpreter 27,393（+183）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **29,670**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.139.sb3
node _work/v41/check41.cjs MiniPy_v4.139.sb3                      # 29,670 块 errors=0
node _work/v41/run.mjs MiniPy_v4.139.sb3 _work/v41/_slice.json   # 14/20
node _work/v41/run.mjs MiniPy_v4.139.sb3 _work/v41/_swap.json    # 17/17
node _work/v41/run.mjs MiniPy_v4.139.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.138…v4.10 MATCH
```
