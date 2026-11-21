# MiniPy v4.46 更新说明

本轮把上一轮"发现但没修"的**`except X as e` 既存 bug** 修掉（P112），并给 v4.45 新加的
**集合补上全套操作**（P113 的 `len`/`in`/`for`、P114 的 `sum`/`sorted`/`list`/`min`/`max`）。
缺口套件仍是 **61/63**（套件里只剩 E50 与 G5，见 §5），探针也是 **242/259** 不变
（那 6 套探针没有覆盖 `as e` 与集合操作，本轮的增量由 `t107b`/`t113`/`t114` 三组用例记录），
23 套既有回归**逐字节零退化**。

产物 `MiniPy_v4.46.sb3`：Interpreter 14,270 块，合计 **15,699**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 类型 | 做法 |
|---|---|---|
| **P112** | **既存 bug**：`except X as e` 绑不上名字 | 走 `trycatch` 的 handler 命中分支时，`pc` 直接跳到 `TryHand`（= 子句行 +1），**子句行从来没被执行过**，所以 `as` 的名字哪儿都没绑。修法：命中时把异常文本（`tlast`，本来是给裸 `raise` 用的）顺手绑给这个名字——取子句行 `TryHand-1`，tokenize 后扫 `as` 的**后一个 token** 当名字，值取"第一个冒号之后的文本"（CPython 的 `str(e)` 就是不带类名的消息；裸错误名如 `ZeroDivisionError` 则给空串）。**关键坑**：`tokenize` 在 `error` 非空时立刻停手，所以这段必须放在"清空 `error`"那条语句**之后**，否则 Tok 是空的、扫不到 `as` |
| **P113** | 集合门面：`len`/`in`/`for` | 集合的编码和列表一模一样，所以这三处**不需要新算法**：① `len(s)` 在 P80 的"字典长度"分支前面插一条 `evtype=='E'` 分支（直接 `listlen`，不除 2），并把 `len requires string` 那道守卫放行 `'E'`；② `in`：在 P80 的 `dictkeys` 分支**前面**插 `if evtype == 'E' then evtype = 'L'`——把标签临时改成列表，后面现成的列表扫描就对了；③ `for x in s` 同理，在 `forloop` 的 L/T 分支前做同样的改标签。改标签是安全的：这个标签只表示"该用哪个取元素的函数"，而两者完全相同 |
| **P114** | 集合门面：`sum`/`sorted`/`list`/`min`/`max` | 这四个（含 P101 的 `sorted(x, reverse=…)` 钩子）都是同一形状的守卫 `evtype ∈ {L, T, G}`，后面用 `listlen`/`listitem` 走元素——正是集合的编码。所以只要允许 `'E'` 进门。`sorted` 另外要把结果**重新标成列表**（CPython 里 `sorted({3,1,2})` 是 `[1, 2, 3]`，不是集合）。`len` 自己那道 `{L,T,G}` 守卫故意没动：集合走的是 P113 新加的 `'E'` 分支 |

## 2. 本轮踩实的四条（都写进 README 了）

* **`tokenize` 遇到 `error` 非空就立刻收手**：P112 第一版把"读子句行"放在清空 `error` 之前，
  结果 `Tok` 是空的、`asnm` 一直是空串、绑定静默失败——而失败的样子是"名字还是没绑上"，
  和真正的原因（tokenize 早退）差得很远。凡是需要重新 tokenize 的地方，先确保 `error == ''`。
* **"改标签"比"加分支"便宜得多**：集合与列表编码相同，与其在 `in`/`for`/`sum` 里各写一套
  `'E'` 分支，不如在那三处各插一句 `evtype = 'L'`。P113 因此只有 3 条语句，却换来了
  `len`/`in`/`for`/`sum`/`sorted`/`list`/`min`/`max` 八个入口。
* **守卫要按"条件形状"认，不要按"谁能到达那个 fail"认**：`find(... reach(substack).has(failCall))`
  会把**所有外层**控制块都算成候选（本轮 `sorted(x, reverse=…)` 的守卫一下子匹配到 6 个）。
  正确的锚点是条件本身的形状（`not(evtype == 'L')`）——这已经是 P51/P80/P107 一路踩过来的同一个坑。
* **新类型要顺手把"返回类型"想清楚**：`sorted(set)` 返回列表、`sum(set)` 返回数字、
  `list(set)` 返回列表。前两个不改标签就会打出 `{...}`，所以 P114 在 `lsort` 之后补了一句
  `evtype = 'L'`。

## 3. 实测

| 套件 | v4.45 | **v4.46** |
|---|---|---|
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6，剩下的两条见 §5） |
| 局部套件 `t107.json`（try/finally 12 条） | 7/12 | **8/12**（T6 的 `as e` 转绿） |
| 局部套件 `t107b.json`（`as e` 与嵌套 finally 5 条） | 2/5 | **4/5**（只剩 ZeroDivisionError 的文案差） |
| 局部套件 `t113.json`（集合门面 14 条） | — | **13/14**（只差元素顺序） |
| 局部套件 `t114.json`（集合进内建 12 条） | — | **12/12** |
| 局部套件 `t108*` / `t111*` | 全绿 / 只差顺序 | **同上（无退化）** |
| 23 套 battery | math 7/10 · dict 9/10 · one2 11/12 | **逐字节相同** |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| featprobe 1/2/3/4/5/6 | 77 · 107 · 26 · 14 · 10 · 8 | **77 · 107 · 26 · 14 · 10 · 8**（探针未覆盖本轮两处改动） |
| `check41.cjs` | 15,609 块 errors=0 | **15,699 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.45 共 36 版全 MATCH | **v4.10…v4.46 共 37 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 两个 bug 的前后对比

```
# except X as e（v4.45 坏，v4.46 好）
try:
    raise ValueError('boom')
except ValueError as e:
    print('caught', e)
v4.45 ->  Line 4: NameError: e
v4.46 ->  caught boom

# 集合的操作（v4.45 全是错，v4.46 可用）
print(len({1, 2, 3}))        -> 3          print(2 in {1, 2, 3})   -> True
print(sum({1, 2, 3}))        -> 6          print(sorted({3, 1, 2}))-> [1, 2, 3]
for x in {1, 2, 3}: print(x) -> 1 2 3      print(min({4, 2, 9}))   -> 2
```

## 5. 仍然不做的两件事（结论性说明）

* **E50 `with`**：CPython 自己会抛 `FileNotFoundError`，控制台报错行的位置/文本对不齐，
  这条用例在"逐字对照"的判定下**无法通过**，不是 MiniPy 的问题。
* **G5 默认参数共享**：`def f(b=[])` 要让 `print(f(), f())` 打出 `[1, 1] [1, 1]`，
  要求**返回值本身是引用**。MiniPy 的列表是"编码串 + 别名表"（P54），`return b` 返回的是串的
  拷贝，print 的实参拿到的是两个独立串；别名表只能在"变量之间"传播，救不了已求值的实参。
  这是**模型层面**的差距，除非把列表/字典改成真正的对象模型（换心脏），不建议为了 1 条用例动。

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.46.sb3
node _work/v41/run.mjs MiniPy_v4.46.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps446_out.json
node _work/v41/run.mjs MiniPy_v4.46.sb3 _work/cmp47/t107b.json
node _work/v41/run.mjs MiniPy_v4.46.sb3 _work/cmp47/t113.json
node _work/v41/run.mjs MiniPy_v4.46.sb3 _work/cmp47/t114.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.46.sb3 -out _work/v41/battery_v446.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.46.sb3 -tag v446f
node _work/v41/check41.cjs MiniPy_v4.46.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.45 还原： $env:V41_SKIP='P112,P113,P114'; $env:V41_OUT='…/MiniPy_v4.45.sb3'; node _work/v41/build41.js
```

## 7. 再往后（如果还要继续）

缺口清单已经没有"值得为了刷分而动"的条目了，剩下的价值都在**把已有的东西做厚**：

1. `try` 里的 `return` / `break` 也跑 `finally`（现在 `return` 会跳过尾巴）
2. 集合方法 `add`/`remove`/`discard`/`|`/`&`/`-`；集合的元素顺序按哈希序（CPython）而不是插入序
3. 双 `for` 推导式（`[x*y for x in range(3) for y in range(2)]`）
4. `yield i, i + 1`（裸逗号元组没走到 yield 分支）
5. 浮点 repr（`1e+16` / `1e-05` / `-0.0` / 大浮点）与 `'hello'.split()` 无参按空白切
6. P91 余项：`d.pop(k)` 会把整个字典删空、`d.nope()` 的报错文案
7. `super()` 与类属性继承
