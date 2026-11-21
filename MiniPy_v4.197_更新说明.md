# MiniPy v4.197 更新说明

## 本轮目标

按《已知问题清单_v4.196.md》的"下一步建议"执行：

1. ① 先修 v4.196 的 3 例回归（生成器 yield 语义 2 例、异常消息重复 1 例）
2. ② 再做 Top 1 浅拷贝（纯静默、覆盖最广）

两项都完成，并额外修掉了清单未列出的一个老回归（lambda 内 TypeError 无限重试）。

## 一、修好了什么

| 用例 | 之前 | 现在 |
|---|---|---|
| `cov7 generator return value stops iteration` | `[]` | `[1]` |
| `cov7 yield inside condition and loop` | `[]` | `[0, 2, 4, 6]` |
| `cov6 builtin exception messages` | `err` × 984（RecursionError） | `err` × 7 |
| `cov3 shallow copy method` | `[[1]] [[1, 2]]` | `[[1, 2]] [[1, 2]]` |
| `cov3 slice copy vs alias` | 原列表不跟着变 | 两侧一致 |
| `cov4 dict copy shallow` | `{'a': [1]} {'a': [1, 2]}` | 两侧都是 `{'a': [1, 2]}` |
| `covC copy is deep` / `covX list/dict copy depth` | 同上（值复制） | 同上（元素共享） |
| `gap131 copy deep not shallow` | 值复制 | 元素共享 |

顺带修好（同源）：

- `cov5 keyword argument errors caught`、`cov5 recursion depth error caught`（P485 让 calluser 报错后正常收尾）
- `cov7 yield from if supported`、`covC generator exhaustion`、`covY generator exhaustion twice`（P481 让新生成器不继承陈旧游标）

```python
a = [[1]]
b = a.copy()
b[0].append(2)
print(a, b)        # 之前: [[1]] [[1, 2]]   现在: [[1, 2]] [[1, 2]]

a = [1, 2]; b = a.copy(); b.append(3)
print(a, b)        # [1, 2] [1, 2, 3]   ← 结构改动仍然互不影响

g = gen(); list(g), list(g)      # [1] []   ← 复用耗尽语义不变
def g2(): yield 1                # 新生成器从头发起，不再被旧游标卡住
print(list(g2()))                # [1]
```

## 二、三个根因

### 1）生成器游标按"值内容"寻址（2 例回归）

P449/P461 用 `GIt`（生成器值→迭代器 id）让 `next()`/`list()` 共用游标。但生成器的"值"就是
它产出的项拼成的编码串——**两个内容相同的生成器对象共用一条游标**。

套件里前一个用例把一个产出 `[1]` 的生成器迭代到耗尽，`GIt` 留下"已耗尽"游标；后一个用例
再定义 `def gr(): yield 1; return; yield 2`（内容同为 `1`）就直接命中陈旧游标 ⇒ `[]`。
所以这两个用例**单跑能过、串进套件就失败**——这也是清单里"疑似 v4.196 改坏"的真相：
它们不是 v4.196 改坏的，而是被前序用例污染。

**P481**：在 calluser 装配生成器值（`ev = gan; evtype = "G"`）之后，从后往前删掉 `GIt` 里
与 `gan` 相同的旧条目及其平行的 `GId`。新对象因此总是从 1 开始。局限沿用既有模型：
两个内容相同且同时存活的生成器只能有一个游标。

### 2）calluser 的失败分支用 `stop this script` 跳过了收尾（1 例回归 + 2 例附带）

`def show(fn): try: fn() except Exception as e: print('err')` + `show(lambda: len(1))`
会打印几百行 `err` 后 `RecursionError`。侦察（探针 P482–P484）结论：

- 第一次报错其实被 trycatch 正确捕获（同 cdepth、error 清空、pc 指到 handler）；
- 但 calluser 的参数绑定/查名失败分支是 `FAIL(...)` **紧跟 `stop this script`**，
  而"stop this script"会跳过 calluser 的收尾段（popLoop / 恢复 Names、Values、Types /
  fpop / 弹 FrRet,FrLoop,FrBase / cdepth−1）；
- 帧栈与 cdepth 从此整体错位，下一轮 trycatch 在**顶层**也能匹配（cdepth 漂移），
  把顶层 pc 改成函数体内的 handler 行 ⇒ 反复执行第 5、6 行 ⇒ 死循环。

**P485**：摘掉 calluser 内部的 10 处 `stop this script`。报错已经写进 `error`，而函数体循环的
条件本就包含 `error != ""`，所以流程会立刻落到收尾段，帧栈、cdepth、pc 全部正常还原。

> 清单把这一例记作 v4.196 新回归；实测 v4.182 起就已存在（v4.181 正确），
> 由 P375 链式调用补丁引入。

### 3）浅拷贝是值复制（Top 1，7 例）

值是"编码字符串"，`copy()` / `[:]` 只复制了字符串 ⇒ 内层列表被**深拷贝**，`b[0]` 的改动
传不回 `a`。而 Python 的浅拷贝是"新列表对象 + 共享元素"。

**P486** 复用 P54 的别名表：

1. `y = x.copy()`（list/dict）与 `y = x[:]` 在赋值处登记一对**拷贝别名**
   （写进 AliasN/AliasT ⇒ assign 自动把新值传播给伙伴），并在 CpyN/CpyT 标记为"可解除"。
2. 结构操作（`b.append(...)` 这类直接在变量上调用、且 `Tok[lo+1]=='.'`）先解除这对别名：
   值本来就各一份，解除后结构改动只影响接收者 —— 与 Python 一致。
   `b[0].append(...)` 的接收者是元素（`Tok[lo+1]=='['`），不解除 ⇒ 改动照样同步。
3. 槽位整体替换（`a[0] = 99`、`del a[0]`）也不算"共享元素"，同样解除：
   按被写入元素的类型判断，容器（list/dict）才保留共享，不可变值直接解除。
4. dict 的 clear/pop/popitem/setdefault/update 同样解除。

已知局限（比"深拷贝"更接近 Python，仍不完全）：`b[0] = [9]` 这种"给副本的槽换一个容器"
会被当成元素内部改动而同步给原列表；真正区分需要对象标识。

## 三、实现清单

| 补丁 | 文件 | 内容 |
|---|---|---|
| P481 | `_work/v41/p481.txt` | 新建生成器值作废旧游标（修 2 例回归） |
| P485 | `_work/v41/p485.txt` | calluser 报错后正常收尾，不再 stop this script（修 1 例回归） |
| P486 | `_work/v41/p486.txt` | `copy()`/`[:]` 元素共享（修 7 例）+ `CpyN`/`CpyT` 两张表 |

另：`_work/v41/p480.txt`（生成器基准栈，目标"嵌套生成器"）是上一轮未落地的草稿，
构建链里已被摘掉，保留文件供后续继续；它当前把基准压栈压进了参数绑定循环，0 参函数不执行，
会让所有生成器返回 `[]`（本轮已定位，改动方式见文件内注释）。

## 四、验证

| 项目 | v4.196 | **v4.197** |
|---|---|---|
| 581 全套失败 | 88 | **73** |
| 补充 82 例失败 | 22 | **21**（其中 `pow one arg` 1 例是测试缺 try/except，非真问题） |
| 真实失败合计 | ≈107 | **≈93** |
| 逐例对照 | — | **修复 15 例、回归 0 例、新增失败 0 例** |
| `check41.cjs` | — | 32,420 块、**errors = 0** |

补充套件逐例：`fixed=1（copy deep not shallow）、broke=0`。

边界自测（与 CPython 逐条核对，全部一致）：

```python
a = [1, 2]; b = a.copy(); a[0] = 99      # [99, 2] [1, 2]
a = [1, 2]; b = a.copy(); a.append(3)    # [1, 2, 3] [1, 2]
a = [1, 2, 3]; b = a.copy(); del a[0]    # [2, 3] [1, 2, 3]
a = [[[1]]]; b = a.copy(); b[0][0].append(2)   # 两侧都是 [[[1, 2]]]
d = {'k': 1}; e = d.copy(); d['k'] = 5   # {'k': 5} {'k': 1}
a = [[1]]; b = a.copy(); c = b.copy(); c[0].append(7)   # 三者都是 [[1, 7]]
```

## 五、复现命令

```bash
cd D:/编程/scratch/ai/minipython

# 重新生成（默认输出 MiniPy_v4.197.sb3）
node _work/v41/assemble.cjs && node _work/v41/build41.js

# 结构体检
node _work/v41/check41.cjs _work/v41/_proj197.json

# 全套 581 例
node _work/v41/runall.mjs MiniPy_v4.197.sb3 _work/v41/_res197 \
  _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt

# 补充 82 例
node _work/v41/run_iso.mjs MiniPy_v4.197.sb3 _work/v41/_gap131.json _work/v41/_gap131_197.out.json g197

# 逐例对照
node _work/v41/cmp131.cjs _work/v41/_res197 _work/v41/_res196
node _work/v41/gdiff.cjs _work/v41/_gap131_197.out.json _work/v41/_gap131_196.out.json
```

> 注：`run_iso.mjs` 等运行器的 scratch-vm 路径已更新为
> `D:/users/OneDrive/Desktop/不常用/scratch-vm-test`（目录被移动过）。

## 六、下一步建议

1. **生成器剩余 7 例**（`nested generator functions` / `generator short circuit` /
   `comprehension reusing a generator` / `iterator protocol on custom class` …）：
   先把 `p480.txt` 的基准栈修对（压栈要放在 calluser 入口而不是参数循环里，出栈在收尾段），
   能一次吃掉"嵌套生成器"3 例。
2. **`nonlocal` / 闭包返回**（4 例）：`closure returned and called`、`closure returned lambda called`、
   `nonlocal keyword` ×2 —— 属 P14 帧模型的扩展。
3. **内建名当值**（`type(1) == int`、`map(str, …)`、`apply(str, 4)`，约 6 例）：
   与 `sorted(key=…)` 的 3 例同源，一次可修一片。
