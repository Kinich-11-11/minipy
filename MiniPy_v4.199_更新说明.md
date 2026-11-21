# MiniPy v4.199 更新说明

## 本轮目标

按《已知问题清单_v4.197.md》的"下一步建议"执行：

1. ① 内建名当值 / `sorted`·`max`·`min` 的 `key=`（一次一片）
2. ② `p480` 基准栈修对后吃"嵌套生成器"3 例
3. 顺带把清单里没单列的 `sorted(字典, key=…)` 静默错修掉

三项都完成：**581 全套 73 → 63 失败，补充 82 例 21 → 18 失败，逐例对照修复 13 例、回归 0 例。**

## 一、修好了什么

| 用例 | 之前 | 现在 |
|---|---|---|
| `cov5 builtin type names` | `NameError: int` | `<class 'int'>` … `True True` |
| `cov5 function as argument` | `NameError: str` | `12 4 4` |
| `cov5 lambda forms` | `map()/filter() first argument must be…` | `[2, 3]` |
| `cov5 builtin map filter reduced` | 同上 | `['1', '2'] [2, 4]` / `[1, 'a', [0]]` |
| `cov5 builtin sorted with key on dicts` | `['b', 'a']`（静默插入序） | `['a', 'b']` |
| `covC sorted dict with key lambda` | `['b', 'a']` | `['a', 'b']` |
| `covZ sorted dict with key lookup` | `['b', 'a']` | `['a', 'b']` |
| `cov7 nested generator functions` | `[1, 2, 10, 20]` | `[10, 20]` |
| `covC / covY nested generator yields` | `[1, 2, 10, 20]` | `[10, 20]` |
| `covD pow name alone` | `NameError: pow` | `<built-in function pow>` |

补充套件修好 3 例：`builtin as value apply str`、`type identity equals int`、`sorted dict with key`。

顺带修好（同源、清单未单列）：

- `max/min/sorted(..., key=len)` 不再报 `NameError: name ''`（P488 补的兼容层）
- `print(len)` / `print(int)` / `g = len; g("abcd")` / `def apply(fn, v): return fn(v)`
  全部按 CPython 工作

```python
print(type(1) == int, type(1) is int)        # True True
def apply(fn, v): return fn(v)
print(apply(str, 4), apply(len, 'abcd'))     # 4 4
print(list(map(lambda x: x + 1, [1, 2])))    # [2, 3]
d = {'b': 1, 'a': 2}
print(sorted(d, key=lambda k: -d[k]))        # ['a', 'b']
def inner(): yield 1; yield 2
def outer():
    for v in inner(): yield v * 10
print(list(outer()))                         # [10, 20]
```

## 二、四个根因

### 1）`sorted(字典, key=…)` 根本没排序（3 例，纯静默）

`eval` 里两个带逗号的 `sorted` 分支形状相同：

```
if not (evtype == "L" or evtype == "E"):
   if evtype == "D": dictkeys(ev)      # P149：字典 -> 键列表
   if not (evtype == "L"): fail "requires a list"
   fnlimit -= 1
   stop this script                     # ← P276 只把 fail 变成有条件，这两句还无条件
```

于是字典被成功转成 L 之后照样 `stop this script`，直接返回**未排序**的键表，key 函数一次都没被调用
（探针里 `callval` 的打印为空证实了这一点；键的插入序恰好和正确结果不同时才暴露）。

**P487**：把那句 `fnlimit -= 1 ; stop this script` 也变成 `if evtype != "L"`。真正不可迭代的类型
（N/K/…）照旧报错并停下，字典 / K/V/I 转换成功后继续排序。

### 2）内建名不是值（约 8 例）

`atom` 只认变量、`None`、用户函数/类；`len`/`int` 落到 `NameError`。而 `sorted(key=…)`、
`max(key=…)`、`map`/`filter` 的第一参数都是"把函数当值用"。

**P488** 的表示法：内建名求值成**它的 CPython 打印形态**（字符串 S）——

- 类型名 → `<class 'int'>`。这正好等于 `type()` 的输出，所以 `type(1) == int` / `is int` 直接成立，
  而且**完全不动 `type()`**（没有回归面）；
- 函数名 → `<built-in function len>`。

唯一多出来的一步是"调用"：`eval` 的可调用判定把这两种拼写也算进去，并在**分派前**重新查一次变量、
把拼写里的裸名取出来（`<class 'x'>` → 第 9..len-2 位，用户类再剥 `__main__.`；
`<built-in function x>` → 第 20..len-1 位）交给 `callfn`。同时 `x8nc`（"不可调用"）的判定要排除这两种拼写。
**坑**：单参数调用（`f(x)`）走的是 `narg == 0` 分支，它有自己的 `callfn` 且完全不看 `callable`，
必须单独补一次解析 —— 第一版只改了 `narg > 0` 的分派点，于是 `g("ab")` 仍然是 `NameError: name 'g'`。

### 3）`map`/`filter` 只认单个标识符（2 例）

P262 要求第一参数是"单个标识符"（`mpfn = Tok[lo+2]; lookup`）。lambda 是多记号片段，被守卫直接拒了。

**P489**：把守卫改成分支——形状不是单标识符（也不是 `None`）时正常 `eval` 第一个片段，
得到 `evtype == "F"`（函数值的 FnName 下标）就 `mpfn = FnName[ev]`、`mpbin = 0`、`mpset = 1`；
`mpset == 0` 时再走原来的"标识符 + lookup"路径，`None` 的恒等判定保持原样。

### 4）嵌套生成器共用一张全局表（3 例）

生成器是"急切求值"：调用时跑完 body，把每个 `yield` 追加进**全局单表** `GYield`，返回时整表拼成值。
内层生成器调用会把外层已收集的项也算进自己的值里。

**P490** 基准栈：入口压 `GYBase = len(GYield)+1`（非生成器不动表）、值构建从 `GYBase[末项]` 开始、
构建完截回起点之前再弹出。p480 的失败原因是把压栈插进了参数绑定循环（0 参函数不执行），
这里直接改 calluser 主链上那句 `clear(GYield)`，与参数个数无关。

两个补充修正：

- **截断必须用有界 `REPEAT`，不能用 `REPEATU`**。第一版用 `until (len(GYield) < base-1)`
  在这台 VM 里会卡住整个线程（程序静默结束、`error` 仍为空）；改成先算 `len - base + 1`
  再 `repeat N` 就正常。这是本轮最花时间的一个坑。
- `yield from` 原来靠"共享表泄漏"白拿内层项，截断后必须显式复制：去掉 `execute` 里那句
  `if not (evtype == "G")` 守卫。

## 三、实现清单

| 补丁 | 文件 | 内容 |
|---|---|---|
| P487 | `_work/v41/p487.txt` | `sorted(字典, key=/reverse=)` 转换后继续排序（3 例） |
| P488 | `_work/v41/p488.txt` | 内建类型名/函数名当值 + 可调用值分派 + `key=` 兼容（约 8 例） |
| P489 | `_work/v41/p489.txt` | `map`/`filter` 接受 lambda/任意函数值（2 例） |
| P490 | `_work/v41/p490.txt` | 生成器基准栈（3 例）+ `yield from` 显式复制 |

另外把 v4.198 的网页端后处理（`webfix.cjs`）从生成的 `build41.js` 挪进了 `head.txt`/`tail.txt`
—— 它此前只存在于生成的产物里，重新 `assemble.cjs` 会把它丢掉。

## 四、验证

| 项目 | v4.197 | **v4.199** |
|---|---|---|
| 581 全套失败 | 73 | **63** |
| 补充 82 例失败 | 21 | **18**（其中 `pow one arg` 1 例是测试缺 try/except，非真问题） |
| 真实失败合计 | ≈93 | **≈80** |
| 逐例对照（581） | — | **修复 10 例、回归 0 例、新增失败 0 例** |
| 逐例对照（82） | — | **修复 3 例、回归 0 例** |
| `check41.cjs` | 32,420 块 | **32,950 块、errors = 0** |
| `validate_web.cjs` | 悬空 0 | **悬空 0、shadow 误标 0** |

中途抓到并修掉的 4 例回归（`len` 作 key 的 `sorted`/`min`/`max`）：P488 让 `len` 求值成功，
旧代码的"求值失败才当内建名"回退失效，`FnName['<built-in function len>']` 取到空串。
最终在 key 解析处补了同样的拼写还原，回归归零。

## 五、复现命令

```bash
cd D:/编程/scratch/ai/minipython

# 重新生成（默认输出 MiniPy_v4.199.sb3）
node _work/v41/assemble.cjs && node _work/v41/build41.js

# 结构 / 网页兼容体检
node _work/v41/check41.cjs MiniPy_v4.199.sb3
node _work/v41/validate_web.cjs MiniPy_v4.199.sb3

# 全套 581 例
node _work/v41/runall.mjs MiniPy_v4.199.sb3 _work/v41/_res199 \
  _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt

# 补充 82 例
node _work/v41/run_iso.mjs MiniPy_v4.199.sb3 _work/v41/_gap131.json _work/v41/_gap131_199.out.json g199

# 逐例对照
node _work/v41/cmp131.cjs _work/v41/_res199 _work/v41/_res197
node _work/v41/gdiff.cjs _work/v41/_gap131_199.out.json _work/v41/_gap131_197.out.json
```

## 六、下一步建议

1. **例外实例模型**（清单 §3，约 7 例）：`e` 仍是消息串而不是异常对象。
   `except X as e` 后 `e is e`、`e.args`、自定义异常的 `__init__` 属性都拿不到。
2. **闭包返回 / `nonlocal`**（4 例）：`closure returned and called`、`nonlocal keyword` —— P14 帧模型的扩展。
3. **运算符重载 `__lt__`**（约 3 例）：`sorted(自定义对象)` 仍报 `<` not supported。
4. 生成器剩余的 `comprehension reusing a generator` / `iterator protocol on custom class`
   属"生成器对象标识"问题：值仍是编码串，两个内容相同的生成器只能有一个游标。
