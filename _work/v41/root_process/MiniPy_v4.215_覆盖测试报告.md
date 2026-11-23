# MiniPy v4.215 新覆盖测试报告

**被测产物**：`MiniPy_v4.215.sb3`（39,937 块，check41 errors=0）
**对照**：CPython 3.14.10
**跑法**：`node _work/v41/run_iso.mjs MiniPy_v4.215.sb3 <cases>.json <out>.json <tag>`（逐例重灌 Code、广播 RUN、输出逐字节对比）
**日期**：2026-11-06

## 一、测试规模与结果

新编写 **80 个**较复杂程序，分两批执行（每例独立运行）：

| 批次 | 文件 | 例数 | 通过 | 失败 |
|---|---|---|---|---|
| A 批（数值/字符串/容器/推导式/生成器） | `_work/v41/_probe216a.json` | 31 | 25 | 6 |
| B 批（函数/OOP/异常/控制流/算法/输入/别名） | `_work/v41/_probe216b.json` | 49 | 42 | 7 |
| **合计** | | **80** | **67** | **13** |

13 个失败逐例隔离复跑（`_iso216*.json`，共 80 例追加探针）后定性：

- **12 条缺陷表现**，其中 **10 条不在更新说明的已知限制清单里**；2 条属已声明限制
  （单目负号对 J、字面量 >15 位）；
- **1 个本测试用例自身写错**（B4，`d[k]` 在 CPython 也抛 KeyError，MiniPy 行为一致，不算缺陷）。

## 二、覆盖面（维度 × 例数）

| 维度 | 例数 | 代表内容 |
|---|---|---|
| 数值/大整数/浮点 | 8 | 负数取模、floor div、位运算、阶乘、10^25、转换 |
| 字符串 | 8 | 切片、方法链、`%`/f-string、凯撒、词频、repr |
| 容器 | 8 | list 方法/切片赋值、tuple、dict、嵌套 dict、矩阵、排序、别名 |
| 推导式/生成器 | 7 | 嵌套推导、生成器管道、genexp、无限源 take、fib 生成器 |
| 函数 | 8 | 递归/记忆化、默认参数、`*args/**kwargs`、闭包/nonlocal、lambda/HOF、互递归、作用域 |
| OOP | 7 | 构造/`__str__`、继承多态、运算符重载、类/实例属性、栈类、自定义异常 |
| 异常 | 6 | try/else/finally、异常种类、嵌套 finally、break/continue、KeyError/IndexError、裸 raise |
| 控制流 | 5 | loop-else、Collatz、嵌套 break、短路副作用、三元链 |
| 综合算法 | 15 | 快排/归并/二分、LCS、BFS 最短路、筛法、矩阵乘、字符串大数乘、RPN、背包、汉诺塔、杨辉三角、银行模拟、文本统计、词法状态机、嵌套美化输出 |
| 输入 | 2 | `input()` 多行读取 |
| 语义/别名 | 4 | 属性列表别名、模块级列表、容器 repr、链式赋值 |
| 专项回归 | 2 | 大指数 `pow(a,b,m)`、类 `__name__` |

## 三、确认的问题（按严重度）

### P0-1 浮点字面量：小数尾数 + 多位/带符号指数被截断成一位

`1.5e300 → 1500.0`（应为 `1.5e+300`），`2.5e10 → 25.0`（应为 `25000000000.0`），
`1.25e-10 → 0.125`（应为 `1.25e-10`）。整数尾数正常（`1e300`、`1e-7` 正确），
`1.5e3` 恰好只有一位指数也正确。规律：**尾数带小数点时，指数只读了第一位字符**。

```python
print(1.5e300)   # MiniPy 1500.0      CPython 1.5e+300
print(2.5e10)    # MiniPy 25.0        CPython 25000000000.0
print(1.25e-10)  # MiniPy 0.125       CPython 1.25e-10
```

### P0-2 计算得到的大整数：加法结果错误（阈值恰为 2^53）

`2**53 + 2**53` 得到 `19115399519591984`，正确值是 `18014398509481984`；
`2**100 + 2**100` 亦错。同一批测试里 **`x * 2` 正确、`x + 1` 正确、`x - x = 0` 正确**，
而 `10**k + 10**k`（k=20..50）也正确——说明坏了的是「非 J 串路径的大整数加法」，
且从 16 位十进制（2^53=9007199254740992）开始出现。

```python
x = 2 ** 53
print(x + x)   # MiniPy 19115399519591984   CPython 18014398509481984
print(x * 2)   # 两侧一致 18014398509481984
y = 2 ** 100
print(y + y)   # MiniPy 13535311311557559913993517511752（错）  CPython 2535301200456458802993406410752
```

连带：`fact(25)` 走 `r *= i` 在 22! 处退化成浮点（`1.1240007277776077e+21`），
`fact(25)` 打印 `1.5511210043330984e+25`（应为精确整数 `15511210043330985984000000`）。
`2**53` 附近 `3**35` 的 `x+x` 同样错误。与已知的「字面量 >15 位」不是同一入口（本次是计算值）。

### P1-3 NaN 比较语义错误

```python
n = float('nan')
print(n == n, n != n)   # MiniPy True False   CPython False True
print(n < 0, n > 0)     # MiniPy False True   CPython False False
print(float('inf') - float('inf'))  # MiniPy 0   CPython nan
```

### P1-4 `pow(a, b, m)` 大指数结果错误

```python
print(pow(3, 100, 7))  # MiniPy 3  CPython 4
print(pow(3, 40, 7))   # MiniPy 6  CPython 4
print(pow(3, 30, 7))   # 一致（小指数正常）
print(pow(7, 77, 13))  # 一致（恰好通过）
```

说明模幂没有走整数算法，中间量按双精度丢失（属 P0-2 同族）。

### P1-5 闭包捕获的局部容器在多次外层调用间共享

```python
def counter():
    c = [0]
    def inc():
        c[0] += 1
        return c[0]
    return inc
f = counter()
g = counter()
print(f(), g(), f(), g())   # MiniPy 1 2 3 4   CPython 1 1 2 2
```

非 `nonlocal` 整型版本（counter 用 `n` + `nonlocal`）正确；列表单元格没有按调用新建。

### P1-6 函数局部名与调用方/全局同名时复用同一个容器对象

```python
def mk():
    a = []
    return a
a = mk()
b = mk()
a.append(1)
print(a, b)      # MiniPy [1] [1]   CPython [1] []
```

把调用方变量改名（`x = mk(); y = mk()`）就正确。这是「同名行复用 + FN 快照恢复」
模型的可观测缺陷：局部行 `a` 被当成调用方 `a` 的同一行，容器身份因此泄漏。

### P1-7 切片副本被错误纳入别名组

```python
a = [1, 2]
b = a
c = a[:]        # 本应是副本
b.append(3)
print(a, b, c)   # MiniPy [1,2,3] [1,2,3] [1,2,3]   CPython [1,2,3] [1,2,3] [1,2]
```

顺序交换（先 `c = a[:]` 再 `b = a`）同样失败；只改 `c`（`c.append`）则正确。
说明「通过别名写入」会错误传播到切片副本，P588/P596 的槽配对把副本也算进了别名集合。

### P1-8 实例属性列表赋给变量是「快照」而非引用

```python
class B:
    def __init__(self):
        self.v = []
b = B()
x = b.v
b.v.append(1)
x.append(2)
print(x, b.v)   # MiniPy [2] [2]   CPython [1, 2] [1, 2]
```

单个写者 + 单次追加可能碰巧通过（P596 同步），两个写者就会互相覆盖/丢失。

### P1-9 下标增强赋值右侧是内建调用时静默失效

```python
r = [0, 0]
r[0] += len('abc')    # MiniPy 不变  CPython 3
r[1] += int('3')      # 同上
r[1] += abs(-3)       # 同上
r[1] += min(3, 5)     # 正确
def u(): return 3
r[1] += u()           # 正确
r[1] += 3 * 4         # 正确
```

即 `a[i] += <callfn 内建>` 不写回。这正是本次 `I7 字符串大数乘法` 全输出 0 的根因
（`res[i+j+1] += int(a[i]) * int(b[j])`）。

### P1-10 已声明限制的补充证据

- 单目负号对 J：`a = 10**25; print(-a + 1)` → `TypeError: numeric operand`
  （更新说明 §四已声明）。
- `>15` 位字面量直接 `SyntaxError: unexpected token`（本次 `9007199254740992 + ...`
  即此原因，已在 §四声明）。

### P2-11 `Class.__name__` / `obj.__class__` 未实现

```python
class Foo: pass
print(Foo.__name__)   # AttributeError: type object 'Foo' has no attribute '__name__'
print((5).__class__.__name__)  # AttributeError: 'int' object has no attribute '__class__'
```

### P2-12 `input()` 未实现 / 不按 harness 协议等待

- `x = input()` → `SyntaxError: missing expression`（Line 1）。
- `x = int(input('n? '))` → 卡在 `Waiting for input`，即使 cases 里给了 `inputs` 也未消费。
- 现有 927 例套件中没有任何 `input()` 用例，属未覆盖能力。

### P2-13 生成器表达式包住无界生成器时仍会拉满

```python
def naturals():
    n = 1
    while True:
        yield n
        n += 1
g = (x * x for x in naturals())
print(next(g))    # 20s 超时（status=Running）
```

直接 `next(naturals())`、`take(naturals(), 3)`、genexp 包有限生成器都正确。
更新说明已声明「无界生成器被 for/list 消费会拉满」，但 `next(genexp)` 同样被拉满，
影响面比声明更宽。

## 四、通过的项目（抽样）

80 例中 67 例逐字节通过，说明下列复杂组合目前是可靠的：

- 负数 `//`/`%`/`divmod` 全符号组合、`round` 半数偶入、`pow` 小指数、位运算/移位；
- 字符串切片（含负步长/越界）、方法链、`%`/f-string（含 `:03d`/`.3f`）、`ord/chr`（ASCII）、
  `isalpha`、Caesar、词频；
- list 方法链（append/extend/insert/pop/remove/index/count/sort/reverse/copy）、切片赋值、
  `del`、tuple 解包与比较、dict `get/setdefault/update/pop/items`、嵌套 dict 聚合、矩阵转置、
  `sorted(key=...)`/`reverse=True`；
- 嵌套推导式、生成器管道、`sum/any/all` 流式、fib 生成器、无限源 `take`；
- 递归/记忆化、可变默认参数跨调用、`*args/**kwargs`、lambda/HOF/compose、
  互递归 + Ackermann、闭包 + `nonlocal`（单实例）、LEGB/global；
- 类基础/继承多态/多级继承/运算符重载（`__add__/__eq__/__lt__/__len__/__getitem__`）/
  类属性 vs 实例属性/自定义异常/`isinstance`/`isinstance` 多继承；
- try/except/else/finally、异常种类、嵌套 finally 顺序、finally 中的 break/continue、
  裸 `raise` 重抛；
- loop-else、Collatz、嵌套 break、短路副作用、链式比较、三元链；
- 快排/归并/二分、LCS、BFS 最短路、筛法、矩阵乘、RPN、0/1 背包、汉诺塔、杨辉三角、
  银行模拟、文本统计、词法状态机、嵌套结构美化输出；
- 属性列表单写者同步、模块级列表修改、混合容器 repr、链式赋值。

## 五、建议修复顺序

1. **P0-1 浮点指数解析**（tokenizer/atom 的浮点字面量分支，读指数用完整 `[-+]?\d+`）——改动小、影响所有科学计数法输入。
2. **P0-2 大整数加法**（`bgops` 的 `+` 分支：确认何时走 J 串、何时走双精度；2^53 以上加法结果错位，疑似进位处理）。
   同批处理 `pow(a,b,m)`（改为整数模幂）与 `sum` 累加。
3. **P1-9 下标增强赋值 + 内建调用 RHS**（`augassign` 的 `indexset` 路径：RHS 求值前保存目标/下标寄存器，
   或求值后从栈恢复）。这一条直接影响大量算法代码。
4. **P1-7/P1-8 别名组边界**（切片副本、属性快照不应进入同一 alias 组；写入传播只沿真实别名）。
5. **P1-5/P1-6 闭包/帧容器身份**（局部容器按调用新建；同名行复用需要区分帧，或返回容器时做身份解绑）。
6. **P1-3 NaN 比较**（`==/!=/</>` 对 NaN 的特判）。
7. **P2-11/12/13** 补 `__name__`/`__class__`、实现或明确禁用 `input()`、genexp 对生成器源改为惰性拉取。

## 六、复现文件

| 文件 | 内容 |
|---|---|
| `_work/v41/_probe216a.json` / `.out.json` | A 批 31 例及结果 |
| `_work/v41/_probe216b.json` / `.out.json` | B 批 49 例及结果 |
| `_work/v41/_iso216*.json` / `.out.json` | 逐问题最小复现（共 80 例） |
| `_work/v41/_p216a.log` / `_p216b.log` | 两批运行日志 |

回归命令：

```bash
cd _work/v41
node run_iso.mjs ../../MiniPy_v4.215.sb3 _probe216a.json _probe216a.out.json p216a
node run_iso.mjs ../../MiniPy_v4.215.sb3 _probe216b.json _probe216b.out.json p216b
```
