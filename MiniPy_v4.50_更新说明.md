# MiniPy v4.50 更新说明

本轮清掉清单第 2 条 **`try` 里的 `return` / `break` / `continue` 也要先跑 `finally`**。
一个补丁 **P123** 分两半：先做"跳转寄存 + 尾巴走完重放"，再把
**`try/except/finally`** 的尾巴补上（P107 只在 `try` 的**第一个**子句是 `finally` 时才压尾巴帧，
所以 `try / except / finally` 里的 `except` 一旦 `return`，尾巴就被整段跳过）。
探针 `t123.json` **29/29**（其中 23 条是本轮新翻绿的），缺口套件与全部既有回归**零退化**。

产物 `MiniPy_v4.50.sb3`：Interpreter 14,924 块，合计 **16,353**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单条目 → 补丁）

| 补丁 | 清单条目 | 做法 |
|---|---|---|
| **P123a** | 2（跳转部分） | `return`/`break`/`continue` 不是异常，所以它走"正常路径"离开保护体——驱动器只看 `retflag`/`dest`，尾巴自然被跳过。修法：**把跳转当成异常寄存**。尾巴帧多挂四列：`FinRet`（1=return、2=break、3=continue）、`FinV`/`FinVT`（返回值）、`FinDest`（跳转目标）；`return` 分支在设 `retflag=1` 之后补一句 `if inBody(): FinRet=1, FinV=ev, FinVT=evtype, retflag=0, dest=FinStart`；`break`/`continue` 分支在 `popLoop()` 前补 `fdef=1` + 同样的寄存，并用 `fdef` 把 `popLoop()` 本身挡掉。钩子在"尾巴已走完"那一支里读回四列、重放动作（`return` 还原 `ev/evtype/retflag`、`break` 调 `popLoop` 并跳 `FinDest`）。`inBody()` = `len(FinEnd)>0 且 FinC[last]==cdepth 且 pc<FinStart 且 pc<FinEnd`——**尾巴自己里面的跳转刻意不寄存**，因为 CPython 允许尾巴里的 `return` 覆盖前面那个 |
| **P123b** | 2（`try/except/finally` 部分） | P51 的 `try` 分支把"子句行"取成 `Elses[pc]`，**只取第一个**（`except`），P107 的岔路因此只在"第一个子句就是 `finally`"时压尾巴帧。修法：在 handler 帧压完后**沿 `Elses` 子句链继续走**，找到 `finally:` 就再压一个尾巴帧，并多记两列：`FinH=1`、`FinHand=该 try 的 handler 行`。分流规则照着 CPython 写：① **保护体里的错误先给自家 `except`**——前置钩子对 `FinH=1` 的帧不抢，交给 `trycatch` 原有的匹配循环；② **自家 `except` 不要的错误先跑尾巴**——在匹配循环丢弃该帧的那一步（`delLast(TryHand)` 之前）插一句：若 `error!=''` 且 `FinHand[last]==TryHand[last]` 且 `FinHand≠0`，就把错误寄存进 `FinMsg`、清 `error`、`pc=FinStart`，然后再丢帧（错误留在尾巴之后重抛，外层的 `except` 才看得到）；③ 尾巴里再抛的错误**替换**原来的（`pc>=FinStart` 就是"错误出在尾巴里"，丢帧放行）。错误臂因此重写成三段：进尾巴前只处理"handler 已经过去"的错误，尾巴里只丢帧不重跑（顺带修掉"尾巴里抛错会无限重跑尾巴"的隐患） |

## 2. 本轮踩实的四条（都写进 README 了）

* **"块数组"要在每次用到时新建**：`popExtra` 原本是一个**预先建好的块数组**，被
  `spliceAfter(sweepBody, chain(popExtra))`、尾巴分支、错误臂三处共用——而**一个块只能有一个位置**，
  最后一次 `chain()` 会把共享块的 `.next` 接到自己那条链上，于是**尾巴分支里重放动作的四个 `if`
  整段消失**（现象：`return 1` 在 `finally` 之后变成 `None`，`break` 变成不退出循环）。
  `check41`、orphans 都是 0——结构性检查抓不到"同一批块出现在两条链上"。
  改成工厂函数 `popExtra()`/`pushExtra()`/`dropFrame()`（P107 的 `drop()` 本来就是这么写的）。
* **`FinStart`/`FinEnd` 的确切含义**：`FinStart` = **尾巴第一条语句**（= 子句行 + 1），
  `FinEnd` = `Ends[子句行]` = **尾巴之后的第一条语句**（即整条 try 语句的排他末端）。
  钩子的两个判据都建立在这上面：`pc >= FinEnd` ⇒ 尾巴已经走完；`pc >= FinStart` ⇒ 当前在尾巴里。
  `tokAt(1)` 之所以能认出 `finally`，是因为 P51 的 `try` 分支在处理子句前
  **把 `Tok` 换成了子句行的 token**（处理完再换回来）。
* **`Elses` 是"子句链"不是"下一个块"**：`Elses[try]` = 第一个子句行，`Elses[except行]` = 下一个子句行
  （实测 `Elses=[0,4,0,6,0,0,0,0]`、`Ends=[8,4,4,6,6,8,8,9]` 对应
  `try(2) / 1÷0(3) / except(4) / return(5) / finally(6) / print(7) / print(8)`），
  子句数不限，所以找 `finally` 必须用循环（`REPEATU`，条件写成 `Elses==0 or 已找到`）。
* **在"匹配循环"里插语句要认准落点**：`trycatch` 里丢掉一帧的 `delLast(TryHand)` 有且只有一处，
  但要按 **`reach(walkBody)`** 去搜（`find` 收的是 id 集合，直接把块 id 传进去会被当成字符串展开，
  报 `Cannot read properties of undefined (reading 'opcode')`）。

## 3. 实测

| 套件 | v4.49 | **v4.50** |
|---|---|---|
| `t123.json`（finally 29 条） | 8/29 | **29/29** |
| `t107.json`（v4.45 的 try/finally 回归） | 8/12 | **9/12**（T4「函数里 finally」翻绿） |
| `t115c.json`（v4.47 探针 33 条） | 28/33 | **30/33**（R1「try 里 return」、R2「try 里 break」翻绿） |
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6，本轮不加分） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| 其余 28 套 `_work/v41` 套件（含 `demos`/`scope`/`d1`/`pan`）+ 13 套 `t1xx` | — | **与 v4.49 逐条相同**（`cmpout.cjs` 逐例对比 python 侧与解释器侧输出，diff=0；只有 `t123`/`t115c`/`t107` 按上表变好） |
| 23 套 battery | math 7/10 · dict 9/10 · one2 11/12 | **逐字节相同** |
| 6 个 featprobe（259 条） | 242/259 | **242/259** |
| `check41.cjs` | 16,091 块 errors=0 | **16,353 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.49 共 40 版全 MATCH | **v4.10…v4.50 共 41 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
def f():                     v4.49: 1            => v4.50: fin / 1
    try: return 1
    finally: print('fin')
print(f())

for i in range(3):           v4.49: after        => v4.50: fin / after
    try: break
    finally: print('fin')
print('after')

def f():                     v4.49: 1            => v4.50: in / out / 1     （嵌套 finally）
    try:
        try: return 1
        finally: print('in')
    finally: print('out')
print(f())

def f():                     v4.49: 7            => v4.50: fin / 7         （except+finally）
    try: 1 / 0
    except: return 7
    finally: print('fin')
print(f())

try:                         v4.49: Line 2: ValueError: v   => v4.50: fin / Line 7: ValueError: v
    raise ValueError('v')                                   （尾巴先跑，错误接着往外抛）
except TypeError: print('no')
finally: print('fin')

try:                         v4.49: outer        => v4.50: fin / outer    （内层尾巴先于外层 handler）
    try: raise ValueError('v')
    except TypeError: print('no')
    finally: print('fin')
except ValueError: print('outer')

def f():                     v4.49: 1            => v4.50: 2               （尾巴里的 return 说了算）
    try: 1 / 0
    except: return 1
    finally: return 2
print(f())
```

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.50.sb3
node _work/v41/run.mjs MiniPy_v4.50.sb3 _work/cmp47/t123.json
node _work/v41/run.mjs MiniPy_v4.50.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps450_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.50.sb3 -out _work/v41/battery_v450.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.50.sb3 -tag v450
node _work/v41/check41.cjs MiniPy_v4.50.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.49 还原： $env:V41_SKIP='P123'; $env:V41_OUT='…/MiniPy_v4.49.sb3'; node _work/v41/build41.js
# 逐例对比两版（python 侧 + 解释器侧）： node _work/v41/cmpout.cjs <旧.json> <新.json>
```

## 6. 下一轮（v4.51）候选，按清单顺序

1. **集合方法**：`add`/`remove`/`discard` / `|`/`&`/`-`（第 3 条）
2. **双 `for` 推导式**（第 4 条；`t115c` 的 X1）
3. `for a, b in <生成器>`：yield 出来的元组还不能解包（`t115c` 的 Y3）
4. `super()` 与类属性继承；多重继承
5. 集合元素顺序（不保证项，可不修）
