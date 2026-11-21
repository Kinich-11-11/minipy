# MiniPy v4.27 更新说明

本轮补上缺口清单的 **A8 生成器 / `yield`**（`gaps` 36/39 → **37/39**），并顺带补上一直缺失的 `list()` 内建。

产物 `MiniPy_v4.27.sb3`：Interpreter 8,668 → **8,774** 块，合计 **10,109**，`check41` errors=0。

## 0. 效果

| 用例集 | v4.26 | **v4.27** |
|---|---|---|
| 缺口清单 `gaps`（39 条） | 36/39 | **37/39**（A8 关闭）|
| 生成器 `gen`（新套件，11 条） | — | **11/11** |
| 其余 20 个套件 | — | 无回退 |

## 1. 实现方式（P52）——为什么是「预先求值」而不是真协程

解释器是**逐行驱动**的（主循环 + `calluser` 的函数体循环），一个真正挂起的生成器帧需要把
`pc`、局部变量表、循环栈都留活并在下次调用时恢复。本轮采用与其它限制一致的务实做法：

* `regdef` 在定义时扫描函数体，只要出现 `yield` 记号就把 `FnKind` 标成 `G`；
* `execute` 新增 `yield` 分支：求值后 `lesc` 转义，按 `lsep + 类型码 + 文本` 追加到 `GYield`（与列表编码完全一致）；
* `calluser` 调用 `G` 类函数时先清空 `GYield`，跑完函数体后把收集到的元素拼成一个值、类型标成 `G` 返回；
* 新增 `list()` 内建（`L`/`T`/`G` 透传，字符串按字符拆成 `S` 元素），并让 `len()`/`sum()` 也接受 `G`。

**精确的场景**：`list(gen())`、`sum(gen())`、`len(gen())`、`range` 循环里 `yield`、`yield` 字符串/嵌套列表、
生成器带参数、同一函数多次调用。**不精确的场景**（已记入限制）：无限/惰性生成器、
边消费边产生的副作用顺序、`next()`、`for x in gen()`（本解释器的 `for` 目前只支持 `range(...)`）。

## 2. 本轮踩的坑

1. **`yield [1, 2]` 被 `indexset` 分支抢走**：`execute` 里 `Kind[1]=="I" and Tok[2]=="["` 那条分支不检查 `pending`，
   于是把 `yield [` 当成下标赋值，报 `SyntaxError: expected = after ]`。
   修法：给该分支的条件补上 `pending == 0`（已经处理过的语句不该再被别的分支捡走）。
2. **`lesc()` 会写 `ev`**：`list("ab")` 的循环条件原本用 `len(ev)`，而每次 `lesc` 都把 `ev` 换成单个字符，
   于是循环只跑一次、只得到 `['a']`。修法：先把源串存进临时变量再循环。
3. **`setLast` 的 INDEX 忘了包描述符**：`data_replaceitemoflist` 的 INDEX 必须是 `[3, <block>, [4,'0']]`，
   直接塞 block id 会被 `check41` 判成 malformed input（这次静态体检立刻抓到了）。
4. **`operator_gt` 的槽位名是 `OPERAND1/OPERAND2`**（不是 sb3 的 `NUM1/NUM2`），按后者写会静默 0 命中。

## 3. 顺手发现但**未修**的既有 bug（P53 已尝试、已撤回）

`def f():` 的函数体如果**以 for/while 结尾**，循环只跑第一次：

```
def f():            # 只打印 0（CPython 打印 0 1 2）
    for i in range(3):
        print(i)
f()
```

原因是 `calluser` 的函数体循环以 `pc > fend` 作为退出条件，而循环的下一次迭代要靠 `boundary()` 把 `pc` 拉回循环体——
第一步迭代结束时 `pc` 已经越界，循环被提前放弃。试着把退出条件放宽成「`pc > fend` **且** 本帧没有未结束的循环」后，
循环反而**永不结束**（0,1,2 反复直到 `LimitError`），说明 `boundary()`/`popLoop()` 的交互还需要单独研究；
因此 P53 未启用（文件留在 `_work/v41/p53.txt`，探针用例在 `_work/v41/loopfn.json`）。
**这属于既有缺陷，与生成器无关**；写生成器时只要循环后面还有语句就不受影响。

## 4. 仍未支持 / 限制

* 生成器：见第 1 节的「不精确场景」；`return` 提前结束生成器时，已 `yield` 的值仍会保留 ✓（与 CPython 一致）。
* 缺口清单剩余 2 条：**A4 类**、**B5 别名语义**。

## 5. 复现

```
node _work/v41/assemble.cjs        # ... + p46..p49 + p51 + p52 + tail.txt -> build41.js
node _work/v41/build41.js         # -> MiniPy_v4.27.sb3
node _work/v41/check41.cjs MiniPy_v4.27.sb3
node _work/v41/run.mjs MiniPy_v4.27.sb3 _work/v41/gen.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.27.sb3 -out _work/v41/battery_v427_final.txt
```
