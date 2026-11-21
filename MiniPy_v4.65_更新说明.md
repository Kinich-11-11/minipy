# MiniPy v4.65 更新说明

本轮把**排序的比较**做对：元组/列表按元素逐个比（CPython 的字典序），`min`/`max` 也跟着走。补丁 **P138**。

产物 `MiniPy_v4.65.sb3`：Interpreter 17,845 块，合计 **19,274**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；56 个历史版本全部可复现（v4.10…v4.65 MATCH）。

## 1. 以前为什么排不了元组

`lsort` 只认两种形状：数字对数字（用 Scratch 的 `>`）和字符串对字符串（`compareText`），
其余一律 `TypeError: sort requires all numbers or all strings`。于是最常见的
`sorted([(2, 'b'), (1, 'a')])` 直接报错（`d168` K3，清单里挂了很久）。

CPython 的规则是**字典序**：元组/列表逐个元素比，第一个不相等的地方定胜负；如果一个是另一个的前缀，
短的更小。

## 2. 做法：一次比较搬进 `lcmp`

* 新增过程 **`lcmp`**，两个值通过全局量 `lca`/`lcat`/`lcb`/`lcbt` 传（不自定义积木实参——P127 的老规矩），
  结果放 `cmp`：
  * **数字与布尔是一族**（`sorted([True, False, 2, 0])` → `[False, 0, True, 2]`，CPython 就是这么排的）；
  * 字符串走 `compareText`；
  * **元组/列表递归**：逐元素比较，递归前把当前这一对压进 `LcStk`、回来再弹（固定临时量会被更深一层冲掉，
    和 P137 给 sorted 钩子加栈是同一个道理）；比完了再看长度（短的是前缀 → 更小）；
  * 其余可比的同类型（`None`/字典/集合/实例/函数）**和所有跨类型比较**都按 CPython 的措辞报错：
    `'<' not supported between instances of 'X' and 'Y'`（类型名复用 P134 的 `tname`，左右顺序照 CPython ——
    它是按 `b < a` 比的，所以**右边**那个名字在前）。
* **`lsort`** 的比较块换成"调 `lcmp`，`cmp > 0` 就交换"；`lsort` 保持它原来的冒泡（相等不交换 ⇒ 稳定），
  于是 `sorted()`、`list.sort()`、`sorted(..., key=…)`、`min`/`max` **一次全部受益**。
* 顺带修两处**转义**：`lsort` 收尾重新编码时和 `srtkey` 把 key 塞进键表时都没调 `lesc`，
  容器元素/容器键的内部分隔符会漏进外层编码（以前排不了容器所以看不出来）。现在两处都先 `lesc`。
* `min`/`max` 有两条比较路径（`callfn` 里的"单可迭代"循环和 `minmax` 的 n 元循环），两条都换成 `lcmp`；
  原本的"纯数字/纯字符串"分支条件改成恒真（字符串分支变成死代码，会被构建期剪掉）。

## 3. 两个自找的坑

1. **`replaceStmt` 只支持单条语句**：它会把替换块的 `next` 重写成旧块的 `next`，所以我传一条链进去，
   链上的第 2 条起全被丢掉（`lcat`/`lcb`/`lcbt`/`lcmp` 都没了，排序静默失效）。改成
   `insertBeforeStmt` 插在旧块前面、再手工把旧块从链上摘掉。
2. **"同类型但不能比"的判断写成了 `cmp == 0`**：两个相等的字符串比完 `cmp` 就是 0，于是
   `sorted(xs, key=lambda s: s[0])` 报 `'str' and 'str'`（`d174` Q3 当场翻红）。改成按标签判断
   （`Z`/`D`/`E`/`O`/`F`/`C`）。

## 4. 实测

| 套件 | v4.64 | **v4.65** |
|---|---|---|
| `d201.json`（本轮新写 15 条：元组/列表排序、前缀关系、嵌套元组、空列表、混排报错 ×3、纯数字/字符串回归、`list.sort()`、元组作 key、`min`/`max`、布尔与浮点、集合） | —— | **15/15** |
| `d168.json`（K3 = 元组排序） | 5/6 | **6/6** |
| `d174` 8（`key` 稳定性等） · `d176` 6 · `d173` 4 · `d178` 3 · `d200` 8 | — | **全绿** |
| `t133` 60 · `comp` 10 · `func` 31 · `str` 12 · `cont` 12 · `cls` 12 | — | **全绿** |
| 90 套快照 | — | **87 套逐例相同**；4 处差异 = `d168` K3 **由 fail 翻 pass** + `t111h`/`t113` 的 CPython 集合哈希序 + featprobe3 内存地址（既知噪声）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259** |
| `check41.cjs` | 19,152 块 errors=0 | **19,274 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.64 共 55 版全 MATCH | **v4.10…v4.65 共 56 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 9 个变量、1 个列表（`LcStk`）与 1 个过程（`lcmp`）。

## 5. 前后对比

```
print(sorted([(2, 'b'), (1, 'a'), (1, 'c')]))
#   v4.64: TypeError: sort requires all numbers or all strings
#   => [(1, 'a'), (1, 'c'), (2, 'b')]

print(sorted([[2, 1], [1, 5]]))          => [[1, 5], [2, 1]]
print(sorted([(1, 2), (1,)]))            => [(1,), (1, 2)]     （短的在前）
print(sorted([True, False, 2, 0]))       => [False, 0, True, 2]
print(min([(2, 1), (1, 9)]))             => (1, 9)
print(sorted([1, 'a']))                  => TypeError: '<' not supported between instances of 'str' and 'int'
print(sorted([None, None]))              => TypeError: '<' not supported between instances of 'NoneType' and 'NoneType'
```

## 6. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| 键/元素是**实例**时的排序 | `lcmp` 只认自己比得了的类型；实例/函数会报 CPython 风格的 TypeError（v4.57 起 `sorted(key=…)` 对这类元素本来也报错） |
| key 函数里再调用一次**带关键字**的 sorted | `srtkey` 的三个工作列表不在栈里（v4.64 记录的边界） |
| `super()` 钩子只认"整段就是 `super().m(...)`" | 两个 super 连用、`super().m().n()` 仍报 `SyntaxError: parentheses`（`d193` T6） |
| 元组子句里写未定义名字 · 元组的 `index`/`count` · `1()` / `(1).foo` | 仍缺（v4.60/v4.61 记录） |

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.65.sb3
node _work/v41/run.mjs MiniPy_v4.65.sb3 _work/cmp47/d201.json  # 容器排序 15 条
node _work/v41/run.mjs MiniPy_v4.65.sb3 _work/cmp47/d168.json  # K3 元组排序 6 条
node _work/v41/run.mjs MiniPy_v4.65.sb3 _work/cmp47/d174.json  # key 稳定性 8 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.65.sb3 -tag v465 -ref v464
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v465 -ref v464
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.65.sb3 -tag v465
node _work/v41/check41.cjs MiniPy_v4.65.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.64 还原： $env:V41_SKIP='P138'; $env:V41_OUT='…/MiniPy_v4.64.sb3'; node _work/v41/build41.js
```

## 8. 下一轮（v4.66）候选，按清单顺序

1. `super()` 钩子只认整段：两个 super 连用 / `super().m().n()`（`d193` T6）
2. 元组子句里写未定义名字应报 `NameError`（v4.60 发现）
3. 元组的 `index`/`count`（v4.61 发现）
4. 任意值当函数调用 / 属性访问（`1()`、`(1).foo` 现在报 `SyntaxError`，应是 `TypeError`/`AttributeError`）
