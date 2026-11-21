# MiniPy v4.209 新套件测试报告（多维度复杂用例）

**日期**：2026-10-31　**被测**：`MiniPy_v4.209.sb3`　**oracle**：CPython 3.14
**方法**：`runall.mjs` 逐例对照；所有失败均按铁律单例隔离重跑定性（**零串行污染，全部真实失败**）。

## 一、总量

| 套件 | 维度 | 用例 | 失败 |
|---|---|---|---|
| `_new1_alias` | 别名/可变性（P557/P558/P559 新语义压力） | 19 | 9 |
| `_new2_algo` | 综合算法（排序/图/DP/回溯/位运算） | 17 | 6 |
| `_new3_str` | 字符串方法/格式化/推导 | 17 | 1 |
| `_new4_oop` | 类/继承/容器类/运算重载 | 13 | 2 |
| `_new5_func` | 高阶函数/闭包/生成器/装饰器 | 15 | 6 |
| `_new6_edge` | 异常/切片/链比较/大循环/解包 | 21 | 2 |
| `_new7~10_probe` | 最小化根因探针（4 轮） | 62 | 33（1 例跨用例引用作废） |
| **合计** | | **154 有效** | **59** |

主套件 **102 例 76 过 26 败**。探针把 26 个失败收敛为 **22 个独立问题**。
f-string 探针通过——**f-string 实际支持**（此前套件从未覆盖）。

## 二、确认的已知边界（与 v4.209 文档一致，非新问题）

- kw 实参不建配对：`g(x=lst)` 内 `x.append` 不影响 lst（声明边界）
- 方法返回不建配对：`xs = bx.put(); xs.append(1)` 不影响 bx.items（声明边界）
- print 实参快照：`print(a, a.reverse(), a)` 首参按求值时快照渲染（对象堆缺口同根）

## 三、新发现问题（22 项，按家族分组，均含最小复现）

### A. 对象/别名语义（对象堆缺口的可复现形态）

**A1 容器槽是快照，存后变异不反映**
```python
row = [1]
d = {}
d['r'] = row
row.append(2)
print(d, row)        # CPython {'r': [1, 2]} [1, 2]；MiniPy {'r': [1]} [1, 2]
```
连带：`m = [[0]*3]*3; m[0][1]=5`（matrix trap）三行不共享（MiniPy 行独立）。

**A2 列表乘法不共享内层对象**
```python
a = [[0]] * 3
a[0].append(1)
print(a)             # CPython [[0, 1], [0, 1], [0, 1]]；MiniPy [[0, 1], [0], [0]]
```

**A3 条件表达式不建别名**（P54 只认直接 `b = a`，P557 只认单调用形态）
```python
flag = True
a = [1]
b = a if flag else [2]
b.append(9)
print(a, b)          # CPython [1, 9] [1, 9]；MiniPy [1] [1, 9]
```

### B. P558 实参传引用的两个洞

**B1 参数重绑定后继续变异写穿调用方**（重绑定未解除配对）
```python
def q(x):
    x.append(1)
    x = [5]
    x.append(2)
lst = [0]
q(lst)
print(lst)           # CPython [0, 1]；MiniPy [5, 2, 3]
```
（covheap 的重绑定用例没有后续变异，所以没暴露。）

**B2 配对参数上的元组交换不写回**（heap sort 全错的根因）
```python
def swp(a):
    a[0], a[1] = a[1], a[0]
lst = [1, 2]
swp(lst)
print(lst)           # CPython [2, 1]；MiniPy [1, 2]
```
注意：`m[0][1] = 7` 单目标嵌套路径写经参数是**好**的；只有双目标交换坏。
连带：heap sort 的 sift 全部交换失效（`[9,4,7,1,8,2,6,3,5]` 原样输出）。

### C. P559 可变默认参数的两个洞

**C1 空 list/dict 默认值"首读"类型退化**
```python
def f(x, seen=[]):
    return x in seen       # TypeError: in requires strings
def f3(k, d={}):
    return d.get(k)        # AttributeError: only lists have methods
```
对比：`def acc(v, buf=[]): buf.append(v)` 是好的——空默认值在**未物化前**被读成
空串/错误类型；append 路径会物化所以不触发。

**C2 返回默认对象后变异不传播到另一个接收者**
```python
def acc(v, buf=[]):
    buf.append(v)
    return buf
a = acc(1)
b = acc(2)
a.append(9)
print(a, b)          # CPython [1, 2, 9] [1, 2, 9]；MiniPy [1, 2, 9] [1, 2]
```

### D. 类与递归方法

**D1 递归方法调用丢失兄弟分支字段（BST 建树损坏）**
```python
root = BT(5)
root.ins(3); root.ins(8); root.ins(1)   # 无循环、3 个节点即复现
print(root.vals())   # CPython [5, 3, 1, 8]；MiniPy [5, 3, 1]（root.r 被冲掉）
```
疑与铁律 7 同型（self/iid 寄存器被嵌套调用冲掉，或实例行写回用陈旧快照）。

**D2 深一点的方法递归触发 LimitError: expression depth**（6 节点 BST 的
`root.inorder()` 直接 LimitError）——疑似深度计数跨递归调用累积不归还。

**D3 类名 `Str` 与解释器内部名冲突**
```python
class Str:            # 换名 Q/S 全过，仅 Str 坏
    def add(self, s): ...
print(Str().add('a').add('b').add('c').text())
# AttributeError: 'str' object has no attribute 'add'
```
链式调用本身（2 层/3 层、内联/经变量）用其他类名全部通过——只坏在类名 `Str`。

### E. 函数/闭包/生成器

**E1 闭包变量经 compose/lambda 间接调用丢失**
```python
def mk(k):
    def ap(x): return x * k
    return ap
def compose(f, g): return lambda x: f(g(x))
both = compose(mk(2), mk(3))
both(5)              # NameError: name 'k' is not defined
```
直接 `mk(3)(4)` 是好的；坏在"闭包函数从另一函数帧内被调用"。

**E2 嵌套函数（闭包）递归状态污染**
- four queens：`sols.append(cols[:])` 的两份快照内容相同（应为两个不同解）；
- dfs all paths：`acc = acc + [cur]` 在嵌套递归里产生重复节点
  `['a','b','d','c','d','f']`。

**E3 生成器 `while True` 挂死**：`yield` + `while True` + 外部 `next()` 限量取——
无输出、无报错、步数耗尽超时（`for` 限次的生成器是好的）。

**E4 装饰器 `@` 语法不支持**（SyntaxError: expression）——特性缺口。

### F. 内建函数

**F1 map 不支持多序列**：`map(lambda a, b: a + b, [1,2], [10,20])` →
SyntaxError "lambda needs a colon"（多参 lambda 在 map 首位解析失败；
同形 lambda 放 dict 值里正常）；换成 def 回调 → TypeError: missing argument b
（只回一个实参）。

**F2 enumerate 不支持 start**：`enumerate(xs, start=1)` 与 `enumerate(xs, 1)`
均 SyntaxError: expression。

**F3 sorted 不稳定**（CPython 的 sorted 是稳定排序，reverse=True 同样稳定）：
```python
sorted(['bb','aa','cc','dd'], key=len)              # 等长组乱序
sorted([(2,'b'),(1,'a'),(2,'c'),(1,'d')], key=lambda p: p[0], reverse=True)
# CPython [(2,'b'),(2,'c'),(1,'a'),(1,'d')]；MiniPy 逆序整体翻转
```

**F4 内建异常消息在"函数内 except as e + 字符串拼接"时丢失**
```python
def conv(s):
    try: return int(s)
    except ValueError as e: return 'bad:' + str(e)
print(conv('x1'))    # CPython bad:invalid literal...；MiniPy bad:ValueError
```
顶层 `print('bad:' + str(e))` 与 `print(str(e))` 都正常——只在函数帧内坏。

### G. 解析/求值

**G1 二级下标表达式里读列表元素 → IndexError**
```python
dp[i][c] = dp[i - 1][c - ws[i - 1]] + 1   # IndexError: list index out of range
```
`dp[i-1][j-1]`（纯算术）是好的；坏在下标表达式内**再读列表元素**（疑铁律 7
寄存器冲突同型）。连带 permutations 3 元素递归 `xs[:i] + xs[i+1:]` IndexError
（2 元素通过）。

**G2 字符串索引结果作 dict 键 → KeyError**
```python
romans = {'I': 1, 'M': 1000}
s = 'MI'
print(romans[s[0]])  # KeyError: 'M'（print(s[0]) 显示 'M' 正常）
```

## 四、修复建议优先级

1. **B1/B2（P558 两洞）**——重绑定解配对 + pathset 双目标写回，影响面大
   （heap sort、以及一切"函数内交换"写法），且补丁系列已有现成挂点。
2. **C1（空默认值类型退化）**——一行守卫（物化空容器默认值）即可，学生代码高频。
3. **G1/G2（下标表达式读元素、s[i] 作键）**——嵌套求值寄存器保护，铁律 7 挂点。
4. **D1/D2（递归方法 self/深度）**——铁律 7 的方法版，需先审计 iid 保存/恢复。
5. **F1/F2/F3/F4**——独立内建缺口，互不牵连。
6. **A1–A3/E1–E3**——对象堆/FnSlot 化路线的一部分，按既定档案推进。
7. **D3（Str 名冲突）**——查内部名表，改用非保留前缀。

## 五、产物

- 套件：`_work/v41/_new1_alias.txt` … `_new6_edge.txt`（102 例）
- 探针：`_work/v41/_new7_probe.txt`、`_new8_probe2.txt`、`_new9_probe3.txt`、`_new10_probe4.txt`（62 例）
- 结果：`_work/v41/_res209n/`、`_res209p/`、`_res209q/`、`_res209r/`、`_res209s/`
- 隔离复跑：`_work/v41/_iso209/`（26 个单例文件，全部复现）
- 预校验：`_work/v41/_precheck.py`（CPython 合法性 + `!` 用例必须真报错）
