# MiniPy v4.252 回归测试报告

日期：2026-11-23。来源：[GitHub main 固定提交](https://github.com/Kinich-11-11/minipy/blob/ea56986481de3dbad7d56c59276ae7eecab35637/MiniPy_v4.252.sb3)，blob f366fe693393a601eba0ef8a4860a7183b0e6e54，SHA256 e8633f497337273b22ee21fafbe56914578f87cc83581d4d87ae29b40962ff89。ZIP 完整性通过，原文件未修改。scratch-vm 5.0.300 RUN 入口，CPython 3.12.14 独立对照，功能软超时 12s，压力软超时 10s；每项恢复初始变量、列表、造型索引；允许 26 字符 UI 换行。

## 汇总

| 套件 | v4.251 | v4.252 |
|---|---:|---:|
| R1 | 35/35 | 35/35 |
| R2 | 80/80 | 80/80 |
| R3 | 152/152 | 152/152 |
| G | 18/18 | 18/18 |
| H | 16/16 | 16/16 |
| I | 22/22 | 22/22 |
| J | 22/22 | 22/22 |
| K | 29/29 | 29/29 |
| L | 15/18 | 15/18 |
| M | 28/64 | 30/64 |
| N | 5/12 | 8/12 |
| 原456项 | 417/456 | 419/456 |
| 全部 | 422/468 | 427/468 |

全部 468 项中，427 项通过，41 项未通过。通过率 91.24%，仅代表本测试集。N 套件同版本基线复测，非历史原456项。

## 变更验证

| 编号 | 用例 | v4.251 → v4.252 |
|---|---|---|
| M26 | 字典视图动态更新 | wrong → pass |
| M53 | 字典 items 和 values 视图 | wrong → pass |
| N101 | 重绑定后视图仍属于旧字典 | wrong → pass |
| N103 | 删除与原地更新 | wrong → pass |
| N104 | clear 和重新填充 | wrong → pass |

注意：仓库 v4.252 更新说明中的 MP-32 指 P825 生成器副作用修复，而前序测试报告的 MP-32 指 callable() 缺少。下方延用前序测试报告编号。

## 原问题验收（MP 编号沿用此前测试报告）

| 编号 | 主题 | 验收 |
|---|---|---|
| MP-32 (P2) | callable() | L111 python_error；L118 python_error |
| MP-33 (P3) | 空字典 pop 的 CPython 行为 | L107 wrong |
| MP-34 (P1) | 关键字专用参数禁止位置绑定 | M02 wrong |
| MP-35 (P2) | 位置专用参数标记 / | M03 python_error |
| MP-36 (P1) | 星号实参消费生成器 | M06 python_error |
| MP-37 (P1) | 对象真值协议 | M09 wrong；M11 wrong；M54 wrong；M55 wrong |
| MP-38 (P1) | __len__ 负数结果验证 | M10 wrong |
| MP-39 (P2) | 缺失属性 __getattr__ 回退 | M12 python_error |
| MP-40 (P1) | property setter 分派 | M13 wrong |
| MP-41 (P2) | 继承 classmethod 调用 | M14 python_error；M56 python_error |
| MP-42 (P1) | 反向比较及反向加法 | M15 wrong；M16 python_error |
| MP-43 (P1) | 用户对象切片协议 | M18 python_error；M57 wrong |
| MP-44 (P2) | iter(callable, sentinel) | M19 python_error |
| MP-45 (P2) | zip(strict=True) | M20 python_error |
| MP-46 (P1) | 列表乘法的浅引用语义 | M25 wrong；M52 wrong |
| MP-47 (P1) | 字典动态视图 | M26 pass；M53 pass |
| MP-48 (P1) | 字典迭代中修改长度 | M27 wrong |
| MP-49 (P1) | 消费既有迭代器的剩余元素 | M49 wrong；M51 python_error |
| MP-50 (P1) | 列表迭代器实时观察追加 | M28 wrong；M50 wrong |
| MP-51 (P1) | except as 别名离开后删除 | M31 wrong；M64 wrong |
| MP-52 (P1) | 推导式闭包 late-binding | M38 python_error |
| MP-53 (P1) | pow(a, negative, modulus) | M40 wrong |
| MP-54 (P2) | sum 的容器起始值 | M42 python_error |
| MP-55 (P2) | reversed 自定义协议 | M43 python_error；M63 python_error |
| MP-56 (P2) | int(s,0) 自动识别基数 | M44 python_error |
| MP-57 (P3) | Unicode 源码和字符串支持 | M45 python_error |

## N 专项新增验收（与基线对比）

| 用例 | 主题 | v4.251 | v4.252 |
|---|---|---|---|
| N101 | 重绑定后视图仍属于旧字典 | wrong | pass |
| N102 | 临时字典表达式视图 | pass | pass |
| N103 | 删除与原地更新 | wrong | pass |
| N104 | clear 和重新填充 | wrong | pass |
| N105 | 键成员测试及迭代 | wrong | wrong |
| N106 | 原字典多级属性引用 | wrong | wrong |
| N107 | 视图跨函数返回 | wrong | wrong |
| N108 | 首次 send 失败后保留外列表副作用 | pass | pass |
| N109 | 嵌套调用对外列表多次追加 | pass | pass |
| N110 | 外列表别名与生成器恢复 | pass | pass |
| N111 | 闭包持有列表生成器首次恢复 | python_error | python_error |
| N112 | 两次恢复的嵌套调用副作用 | pass | pass |

MP-47 原始 M26/M53 已通过，新增 N101/N103/N104 也从失败变为通过；但 N105 成员判断、N106 属性路径、N107 跨函数视图仍未通过，建议保留 MP-47 为部分完成。N108/N109/N110/N112 在两个版本均通过，因此这些独立样例不能证明 P825 的具体修复效果，仅证明此类场景未回归。N111 在两个版本均出现解包 ValueError，建议另行定位嵌套生成器定义与返回元组的交互（MP-58）。

## 未通过用例与复现

### L/L107 不可哈希 pop — wrong

```python
d = {}
try:
    print(d.pop([],9))
except TypeError:
    print("type")
```

CPython：
```text
9
```

MiniPy：
```text
type
```

错误字段：无；耗时 30 ms；基线 wrong。

### L/L111 callable 内建与实例 — python_error

```python
class A:
    def __call__(self):
        return 1
print(callable(A()),callable(1))
```

CPython：
```text
True False
```

MiniPy：
```text
Line 4: NameError: name 'c
allable' is not defined
```

错误字段：NameError: name 'callable' is not defined；耗时 32 ms；基线 python_error。

### L/L118 callable 普通函数 — python_error

```python
def f():
    return 1
print(callable(f),callable(3))
```

CPython：
```text
True False
```

MiniPy：
```text
Line 3: NameError: name 'c
allable' is not defined
```

错误字段：NameError: name 'callable' is not defined；耗时 19 ms；基线 python_error。

### M/M02 关键字专用参数 — wrong

```python
def f(a,*,b=2):
    return a+b
print(f(3,b=4))
try:
    f(3,4)
except TypeError:
    print("type")
```

CPython：
```text
7
type
```

MiniPy：
```text
7
```

错误字段：无；耗时 1494 ms；基线 wrong。

### M/M03 位置专用参数 — python_error

```python
def f(a,/,b=2):
    return a+b
print(f(3,b=4))
try:
    f(a=3)
except TypeError:
    print("type")
```

CPython：
```text
7
type
```

MiniPy：
```text
Line 3: TypeError: missing
 argument /
```

错误字段：TypeError: missing argument /；耗时 806 ms；基线 python_error。

### M/M06 星号解包生成器 — python_error

```python
def g():
    yield 2
    yield 3
def f(a,b):
    return a*b
print(f(*g()))
```

CPython：
```text
6
```

MiniPy：
```text
Line 6: TypeError: missing
 argument a
```

错误字段：TypeError: missing argument a；耗时 95 ms；基线 python_error。

### M/M09 __bool__ 优先于 __len__ — wrong

```python
class A:
    def __len__(self):
        return 4
    def __bool__(self):
        return False
print(bool(A()))
```

CPython：
```text
False
```

MiniPy：
```text
True
```

错误字段：无；耗时 169 ms；基线 wrong。

### M/M10 __len__ 负值异常 — wrong

```python
class A:
    def __len__(self):
        return -1
try:
    print(len(A()))
except ValueError:
    print("value")
```

CPython：
```text
value
```

MiniPy：
```text
-1
```

错误字段：无；耗时 286 ms；基线 wrong。

### M/M11 __bool__ 非布尔返回值 — wrong

```python
class A:
    def __bool__(self):
        return 1
try:
    print(bool(A()))
except TypeError:
    print("type")
```

CPython：
```text
type
```

MiniPy：
```text
True
```

错误字段：无；耗时 43 ms；基线 wrong。

### M/M12 __getattr__ 缺失属性钩子 — python_error

```python
class A:
    def __getattr__(self,name):
        return name.upper()
print(A().hello)
```

CPython：
```text
HELLO
```

MiniPy：
```text
Line 4: AttributeError: 'A
' object has no attribute 
'hello'
```

错误字段：AttributeError: 'A' object has no attribute 'hello'；耗时 22 ms；基线 python_error。

### M/M13 property setter — wrong

```python
class A:
    def __init__(self):
        self._x = 1
    @property
    def x(self):
        return self._x
    @x.setter
    def x(self,v):
        self._x = v*2
a = A()
a.x = 7
print(a.x)
```

CPython：
```text
14
```

MiniPy：
```text
7
```

错误字段：无；耗时 219 ms；基线 wrong。

### M/M14 类方法继承绑定子类 — python_error

```python
class A:
    @classmethod
    def f(cls):
        return cls.x
class B(A):
    x = 7
print(B.f(),B().f())
```

CPython：
```text
7 7
```

MiniPy：
```text
Line 7: SyntaxError: missi
ng expression
```

错误字段：SyntaxError: missing expression；耗时 296 ms；基线 python_error。

### M/M15 实例 __eq__ 与反向比较 — wrong

```python
class A:
    def __eq__(self,other):
        return other == 5
a = A()
print(a == 5,5 == a,a == 2)
```

CPython：
```text
True True False
```

MiniPy：
```text
True False False
```

错误字段：无；耗时 51 ms；基线 wrong。

### M/M16 反向加法 — python_error

```python
class A:
    def __radd__(self,x):
        return x+7
print(2+A())
```

CPython：
```text
9
```

MiniPy：
```text
Line 4: TypeError: unsuppo
rted operand type(s) for +
: 'int' and 'A'
```

错误字段：TypeError: unsupported operand type(s) for +: 'int' and 'A'；耗时 77 ms；基线 python_error。

### M/M18 索引切片传入 slice — python_error

```python
class A:
    def __getitem__(self,x):
        return x.start,x.stop,x.step
a = A()
print(a[1:8:2])
```

CPython：
```text
(1, 8, 2)
```

MiniPy：
```text
Line 5: SyntaxError: expre
ssion
```

错误字段：SyntaxError: expression；耗时 128 ms；基线 python_error。

### M/M19 iter 可调用对象 sentinel — python_error

```python
a = iter([1,2,0,3])
def f():
    return next(a)
print(list(iter(f,0)))
```

CPython：
```text
[1, 2]
```

MiniPy：
```text
Line 4: SyntaxError: paren
theses
```

错误字段：SyntaxError: parentheses；耗时 176 ms；基线 python_error。

### M/M20 zip 严格长度 — python_error

```python
try:
    print(list(zip([1],[2,3],strict=True)))
except ValueError:
    print("value")
```

CPython：
```text
value
```

MiniPy：
```text
Line 2: SyntaxError: expre
ssion
```

错误字段：SyntaxError: expression；耗时 85 ms；基线 python_error。

### M/M25 list *= 保持内部别名 — wrong

```python
a = [[1]]
b = a
a *= 2
a[0].append(2)
print(a is b,a[0] is a[1],b)
```

CPython：
```text
True True [[1, 2], [1, 2]]
```

MiniPy：
```text
True False [[1, 2], [1]]
```

错误字段：无；耗时 303 ms；基线 wrong。

### M/M27 迭代时修改字典长度 — wrong

```python
d = {"a":1,"b":2}
it = iter(d)
print(next(it))
d["c"] = 3
try:
    next(it)
except RuntimeError:
    print("runtime")
```

CPython：
```text
a
runtime
```

MiniPy：
```text
a
```

错误字段：无；耗时 133 ms；基线 wrong。

### M/M28 list 迭代时追加元素 — wrong

```python
a = [1,2]
it = iter(a)
print(next(it))
a.append(3)
print(list(it))
```

CPython：
```text
1
[2, 3]
```

MiniPy：
```text
1
[1, 2]
```

错误字段：无；耗时 27 ms；基线 wrong。

### M/M31 异常别名离开 except 后删除 — wrong

```python
try:
    raise ValueError("a")
except ValueError as e:
    print(str(e))
try:
    print(e)
except NameError:
    print("name")
```

CPython：
```text
a
name
```

MiniPy：
```text
a
a
```

错误字段：无；耗时 102 ms；基线 wrong。

### M/M38 推导式内 lambda late-binding — python_error

```python
a = [lambda: x for x in range(3)]
print(a[0](),a[1](),a[2]())
```

CPython：
```text
2 2 2
```

MiniPy：
```text
Line 2: NameError: name 'x
' is not defined
```

错误字段：NameError: name 'x' is not defined；耗时 27 ms；基线 python_error。

### M/M40 pow 三参数负指数模逆 — wrong

```python
print(pow(3,-1,7))
```

CPython：
```text
5
```

MiniPy：
```text
0.3333333333333333
```

错误字段：无；耗时 63 ms；基线 wrong。

### M/M42 sum start 为列表 — python_error

```python
print(sum([[1],[2]],[]))
```

CPython：
```text
[1, 2]
```

MiniPy：
```text
Line 1: TypeError: unsuppo
rted operand type(s) for +
: 'int' and 'list'
```

错误字段：TypeError: unsupported operand type(s) for +: 'int' and 'list'；耗时 13 ms；基线 python_error。

### M/M43 reversed 自定义序列 — python_error

```python
class A:
    def __len__(self):
        return 3
    def __getitem__(self,i):
        return i+1
print(list(reversed(A())))
```

CPython：
```text
[3, 2, 1]
```

MiniPy：
```text
Line 6: TypeError: 'A' obj
ect is not reversible
```

错误字段：TypeError: 'A' object is not reversible；耗时 26 ms；基线 python_error。

### M/M44 int base 与前缀 — python_error

```python
print(int("0xff",0),int("101",2),int("-12",8))
```

CPython：
```text
255 5 -10
```

MiniPy：
```text
Line 1: ValueError: invali
d literal for int() with b
ase 0: '0xff'
```

错误字段：ValueError: invalid literal for int() with base 0: '0xff'；耗时 251 ms；基线 python_error。

### M/M45 Unicode 大小写扩展 — python_error

```python
print("straße".upper(),"Ä".lower())
```

CPython：
```text
STRASSE ä
```

MiniPy：
```text
Line 1: SyntaxError: ASCII
 text required
```

错误字段：SyntaxError: ASCII text required；耗时 5 ms；基线 python_error。

### M/M49 list 消费部分迭代器（无修改） — wrong

```python
a = iter([1,2,3])
print(next(a))
print(list(a))
print(next(a,9))
```

CPython：
```text
1
[2, 3]
9
```

MiniPy：
```text
1
[1, 2, 3]
9
```

错误字段：无；耗时 40 ms；基线 wrong。

### M/M50 列表追加后 next — wrong

```python
a = [1,2]
it = iter(a)
print(next(it))
a.append(3)
print(next(it,9),next(it,9),next(it,9))
```

CPython：
```text
1
2 3 9
```

MiniPy：
```text
1
2 9 9
```

错误字段：无；耗时 73 ms；基线 wrong。

### M/M51 tuple 消费部分迭代器 — python_error

```python
a = iter([1,2,3])
print(next(a))
print(tuple(a))
print(next(a,9))
```

CPython：
```text
1
(2, 3)
9
```

MiniPy：
```text
1
Line 3: TypeError: 'object
' object is not iterable
```

错误字段：TypeError: 'object' object is not iterable；耗时 29 ms；基线 python_error。

### M/M52 乘法重复保持嵌套引用 — wrong

```python
a = [[1]]
b = a*2
b[0].append(2)
print(a,b,b[0] is b[1])
```

CPython：
```text
[[1, 2]] [[1, 2], [1, 2]] True
```

MiniPy：
```text
[[1]] [[1, 2], [1, 2]] Tru
e
```

错误字段：无；耗时 130 ms；基线 wrong。

### M/M54 bool 使用 __len__ 回退 — wrong

```python
class A:
    def __len__(self):
        return 0
print(bool(A()))
```

CPython：
```text
False
```

MiniPy：
```text
True
```

错误字段：无；耗时 22 ms；基线 wrong。

### M/M55 直接 __bool__ 与 bool 内建 — wrong

```python
class A:
    def __bool__(self):
        return False
a = A()
print(a.__bool__(),bool(a))
if a:
    print("truth")
else:
    print("false")
```

CPython：
```text
False False
false
```

MiniPy：
```text
False True
truth
```

错误字段：无；耗时 55 ms；基线 wrong。

### M/M56 classmethod 类与实例分离 — python_error

```python
class A:
    @classmethod
    def f(cls):
        return cls.x
class B(A):
    x = 7
b = B()
print(B.f(),b.f())
```

CPython：
```text
7 7
```

MiniPy：
```text
Line 8: SyntaxError: missi
ng expression
```

错误字段：SyntaxError: missing expression；耗时 35 ms；基线 python_error。

### M/M57 直接切片方法与普通索引 — wrong

```python
class A:
    def __getitem__(self,x):
        return x
a = A()
print(a[4])
print(a[1:3])
```

CPython：
```text
4
slice(1, 3, None)
```

MiniPy：
```text
4
[1, 2]
```

错误字段：无；耗时 58 ms；基线 wrong。

### M/M63 自定义 __reversed__ — python_error

```python
class A:
    def __reversed__(self):
        return iter([3,2,1])
print(list(reversed(A())))
```

CPython：
```text
[3, 2, 1]
```

MiniPy：
```text
Line 4: TypeError: 'A' obj
ect is not reversible
```

错误字段：TypeError: 'A' object is not reversible；耗时 25 ms；基线 python_error。

### M/M64 except 别名覆盖已有变量 — wrong

```python
e = 7
try:
    raise ValueError("x")
except ValueError as e:
    pass
try:
    print(e)
except NameError:
    print("name")
```

CPython：
```text
name
```

MiniPy：
```text
x
```

错误字段：无；耗时 73 ms；基线 wrong。

### N/N105 键成员测试及迭代 — wrong

```python
d = {"a":1}
k = d.keys()
d["b"] = 2
print("b" in k)
for x in k:
    print(x)
```

CPython：
```text
True
a
b
```

MiniPy：
```text
False
a
b
```

错误字段：无；耗时 321 ms；基线 wrong。

### N/N106 原字典多级属性引用 — wrong

```python
class A:
    def __init__(self):
        self.d = {"a":1}
a = A()
k = a.d.keys()
a.d["b"] = 2
print(list(k))
```

CPython：
```text
['a', 'b']
```

MiniPy：
```text
['a']
```

错误字段：无；耗时 815 ms；基线 wrong。

### N/N107 视图跨函数返回 — wrong

```python
def f():
    d = {"a":1}
    return d,d.items()
d,i = f()
d["a"] = 7
print(list(i))
```

CPython：
```text
[('a', 7)]
```

MiniPy：
```text
[('a', 1)]
```

错误字段：无；耗时 429 ms；基线 wrong。

### N/N111 闭包持有列表生成器首次恢复 — python_error

```python
def outer():
    a = []
    def f():
        a.append(2)
    def g():
        f()
        yield len(a)
    return g(),a
x,a = outer()
print(next(x),a)
```

CPython：
```text
1 [2]
```

MiniPy：
```text
Line 9: ValueError: not en
ough values to unpack (exp
ected 2, got 0)
```

错误字段：ValueError: not enough values to unpack (expected 2, got 0)；耗时 24 ms；基线 python_error。

## N 套件全部源码

### N101 重绑定后视图仍属于旧字典 — pass

```python
d = {"a":1}
k = d.keys()
old = d
d = {"b":2}
old["c"] = 3
print(list(k),list(d.keys()))
```

预期：
```text
['a', 'c'] ['b']
```

实际：
```text
['a', 'c'] ['b']
```

### N102 临时字典表达式视图 — pass

```python
def f():
    return {"a":1}
v = f().values()
print(list(v),len(v))
```

预期：
```text
[1] 1
```

实际：
```text
[1] 1
```

### N103 删除与原地更新 — pass

```python
d = {"a":1,"b":2}
v = d.values()
i = d.items()
del d["a"]
d["b"] = 8
print(len(v),list(v),list(i))
```

预期：
```text
1 [8] [('b', 8)]
```

实际：
```text
1 [8] [('b', 8)]
```

### N104 clear 和重新填充 — pass

```python
d = {"a":1}
k = d.keys()
d.clear()
print(len(k))
d["z"] = 9
print(list(k))
```

预期：
```text
0
['z']
```

实际：
```text
0
['z']
```

### N105 键成员测试及迭代 — wrong

```python
d = {"a":1}
k = d.keys()
d["b"] = 2
print("b" in k)
for x in k:
    print(x)
```

预期：
```text
True
a
b
```

实际：
```text
False
a
b
```

### N106 原字典多级属性引用 — wrong

```python
class A:
    def __init__(self):
        self.d = {"a":1}
a = A()
k = a.d.keys()
a.d["b"] = 2
print(list(k))
```

预期：
```text
['a', 'b']
```

实际：
```text
['a']
```

### N107 视图跨函数返回 — wrong

```python
def f():
    d = {"a":1}
    return d,d.items()
d,i = f()
d["a"] = 7
print(list(i))
```

预期：
```text
[('a', 7)]
```

实际：
```text
[('a', 1)]
```

### N108 首次 send 失败后保留外列表副作用 — pass

```python
a = []
def f():
    a.append(1)
def g():
    f()
    yield 7
x = g()
try:
    x.send(9)
except TypeError:
    print(len(a))
print(next(x),a)
```

预期：
```text
0
7 [1]
```

实际：
```text
0
7 [1]
```

### N109 嵌套调用对外列表多次追加 — pass

```python
a = []
def f(x):
    a.append(x)
def g():
    f(1)
    f(2)
    yield len(a)
x = g()
print(next(x),a)
```

预期：
```text
2 [1, 2]
```

实际：
```text
2 [1, 2]
```

### N110 外列表别名与生成器恢复 — pass

```python
a = []
b = a
def f():
    b.append(2)
def g():
    f()
    yield 1
x = g()
print(next(x),a,b,a is b)
```

预期：
```text
1 [2] [2] True
```

实际：
```text
1 [2] [2] True
```

### N111 闭包持有列表生成器首次恢复 — python_error

```python
def outer():
    a = []
    def f():
        a.append(2)
    def g():
        f()
        yield len(a)
    return g(),a
x,a = outer()
print(next(x),a)
```

预期：
```text
1 [2]
```

实际：
```text
Line 9: ValueError: not en
ough values to unpack (exp
ected 2, got 0)
```

### N112 两次恢复的嵌套调用副作用 — pass

```python
a = []
def f(x):
    a.append(x)
def g():
    f(1)
    yield 1
    f(2)
    yield 2
x = g()
print(next(x),a)
print(next(x),a)
```

预期：
```text
1 [1]
2 [1, 2]
```

实际：
```text
1 [1]
2 [1, 2]
```

## 压力测试（计时非严格基准）

| 用例 | v4.251 ms | v4.252 ms | 结果 |
|---|---:|---:|---|
| Tloop100 循环 100 次 | 3107 | 2718 | pass |
| Tloop300 循环 300 次 | 35 | 35 | pass |
| Tloop1000 循环 1000 次 | 48 | 53 | pass |
| Tloop10000 循环 10000 次 | 347 | 287 | pass |
| Tsort20 排序 20 元素 | 1857 | 1646 | pass |
| Tsort60 排序 60 元素 | 303 | 205 | pass |
| Tsort150 排序 150 元素 | 772 | 585 | pass |
| Tsort500 排序 500 元素 | 3711 | 2658 | pass |
| Trec10 递归深度 10 | 1428 | 1171 | pass |
| Trec30 递归深度 30 | 325 | 236 | pass |
| Trec80 递归深度 80 | 862 | 615 | pass |
| Trec150 递归深度 150 | 1588 | 1148 | pass |
| Tdict10 字典 10 个键 | 826 | 716 | pass |
| Tdict50 字典 50 个键 | 807 | 741 | pass |
| Tdict150 字典 150 个键 | 2401 | 2315 | pass |
| Tdict500 字典 500 个键 | 7829 | 6181 | pass |
| Tstr100 字符串 100 字符 | 148 | 123 | pass |
| Tstr500 字符串 500 字符 | 30 | 25 | pass |
| Tstr1500 字符串 1500 字符 | 50 | 42 | pass |
| Tstr10000 字符串 10000 字符 | 224 | 175 | pass |

## 全部结果

| 套件 | 编号 | 主题 | 结果 | CPython | MiniPy | ms |
|---|---|---|---|---|---|---:|
| R1 | arithmetic | arithmetic | pass | 14 3 2 256 | 14 3 2 256 | 1443 |
| R1 | loop | loop | pass | 55 | 55 | 1284 |
| R1 | recursion | recursion | pass | 720 | 720 | 1269 |
| R1 | closure | closure | pass | 11 | 11 | 639 |
| R1 | slice | slice | pass | [5, 3, 1]<br>[0, 8, 9, 10, 3, 4, 5] | [5, 3, 1]<br>[0, 8, 9, 10, 3, 4, 5] | 922 |
| R1 | slice_delete | slice_delete | pass | [0, 2, 4] | [0, 2, 4] | 202 |
| R1 | comprehension | comprehension | pass | [0, 4, 16] | [0, 4, 16] | 424 |
| R1 | dict | dict | pass | 5 9 2 | 5 9 2 | 602 |
| R1 | set | set | pass | [2, 3] [1, 2, 3, 4] | [2, 3] [1, 2, 3, 4] | 417 |
| R1 | class | class | pass | 14 | 14 | 647 |
| R1 | mro | mro | pass | C | C | 731 |
| R1 | exception | exception | pass | caught<br>done | caught<br>done | 850 |
| R1 | generator | generator | pass | 3 5 | 3 5 | 636 |
| R1 | format | format | pass | 3.14 | 3.14 | 875 |
| R1 | fstring | fstring | pass | n=007 | n=007 | 65 |
| R1 | bigint | bigint | pass | 1267650600228229401496703205377 | 12676506002282294014967032<br>05377 | 215 |
| R1 | complex | complex | pass | (-5+12j) | (-5+12j) | 293 |
| R1 | math | math | pass | 720 6 | 720 6 | 248 |
| R1 | json | json | pass | 2 | 2 | 587 |
| R1 | regex | regex | pass | ['12', '34'] | ['12', '34'] | 882 |
| R1 | statistics | statistics | pass | 5 | 5 | 303 |
| R1 | random | random | pass | 4 | 4 | 570 |
| R1 | datetime | datetime | pass | 3 | 3 | 516 |
| R1 | case | case | pass | 4 9 False | 4 9 False | 18 |
| R1 | case_string | case_string | pass | False False | False False | 8 |
| R1 | case_upper | case_upper | pass | 9 | 9 | 8 |
| R1 | math_sqrt | math_sqrt | pass | 9.0 | 9.0 | 73 |
| R1 | math_gcd | math_gcd | pass | 6 | 6 | 14 |
| R1 | math_factorial | math_factorial | pass | 720 | 720 | 9 |
| R1 | json_dumps | json_dumps | pass | [1, 2, 3] | [1, 2, 3] | 200 |
| R1 | json_loads | json_loads | pass | 2 | 2 | 15 |
| R1 | regex_simple | regex_simple | pass | ['ab', 'ab'] | ['ab', 'ab'] | 83 |
| R1 | int_exact | int_exact | pass | True | True | 13 |
| R1 | format_basic | format_basic | pass | hello 42 | hello 42 | 87 |
| R1 | super_single | super_single | pass | 5 | 5 | 124 |
| R2 | S01 | 负数除法与取模 | pass | -3 2 -3 -2 | -3 2 -3 -2 | 1564 |
| R2 | S02 | 短路求值 | pass | False True | False True | 12 |
| R2 | S03 | 链式比较 | pass | True False | True False | 755 |
| R2 | S04 | 类型转换 | pass | 42 2.5 False False | 42 2.5 False False | 524 |
| R2 | S05 | 二进制与位运算 | pass | 2 48 4 6 | 2 48 4 6 | 218 |
| R2 | S06 | 字符串搜索和替换 | pass | 2<br>4 | 2<br>4 | 626 |
| R2 | S07 | 字符串拆分连接 | pass | a/b/c | a/b/c | 302 |
| R2 | S08 | 负索引与反转 | pass | f bd fedcba | f bd fedcba | 75 |
| R2 | S09 | 列表别名与复制 | pass | 3 2 | 3 2 | 1392 |
| R2 | S10 | 字典缺省值 | pass | 4 9 | 4 9 | 405 |
| R2 | S11 | 可变参数边界 | pass | 12 10 | 12 10 | 1484 |
| R2 | S12 | 解包与交换 | pass | 5 2 | 5 2 | 131 |
| R2 | L01 | 全局与非局部作用域 | pass | 5 7 3 | 5 7 3 | 277 |
| R2 | L02 | 星号及关键字参数 | pass | 10 | 10 | 78 |
| R2 | L03 | 高阶函数与 lambda | pass | [1, 4, 9]<br>[3, 4] | [1, 4, 9]<br>[3, 4] | 167 |
| R2 | L04 | 字典推导式 | pass | 9 4 | 9 4 | 577 |
| R2 | L05 | 集合去重与差集 | pass | [1, 3] | [1, 3] | 418 |
| R2 | L06 | 迭代器与 StopIteration | pass | 4 5<br>end | 4 5<br>end | 805 |
| R2 | L07 | 生成器表达式 | pass | 30 | 30 | 1162 |
| R2 | L08 | yield from | pass | [2, 4, 6] | [2, 4, 6] | 29 |
| R2 | L09 | 自定义异常及消息 | pass | oops | oops | 660 |
| R2 | L10 | finally 中的返回值 | pass | 2 | 2 | 28 |
| R2 | L11 | 类属性、继承和覆盖 | pass | 6 10 | 6 10 | 271 |
| R2 | L12 | 自定义迭代器 | pass | 10 | 10 | 212 |
| R2 | L13 | 上下文管理器 | pass | enter<br>7<br>exit | enter<br>7<br>exit | 394 |
| R2 | L14 | 装饰器与闭包 | pass | 10 | 10 | 46 |
| R2 | N01 | 整数舍入与绝对值 | pass | 2 4 7 | 2 4 7 | 78 |
| R2 | N02 | 大整数进位 | pass | 123 | 123 | 435 |
| R2 | N03 | 幂模运算 | pass | 3 | 3 | 118 |
| R2 | N04 | 复数四则 | pass | 5.0 3.0 4.0 | 5.0 3.0 4.0 | 810 |
| R2 | N05 | 数学三角函数 | pass | 0.5<br>-1.0 | 0.5<br>-1.0 | 25 |
| R2 | N06 | 对数与指数 | pass | 3.0<br>1.0 | 3.0<br>1.0 | 106 |
| R2 | N07 | 统计均值与中位数 | pass | 6 4 | 6 4 | 526 |
| R2 | N08 | 统计样本方差 | pass | 10 | 10 | 170 |
| R2 | N09 | 数值稳定的平方和 | pass | 13.0 | 13.0 | 77 |
| R2 | N10 | 复数平方根与相位 | pass | 0.0 2.0<br>1.5708 | 0.0 2.0<br>1.5708 | 249 |
| R2 | A01 | 最大公约数欧几里得 | pass | 21 | 21 | 24 |
| R2 | A02 | 素数筛选 | pass | 11 160 | 11 160 | 922 |
| R2 | A03 | 冒泡排序 | pass | [2, 2, 4, 7, 9] | [2, 2, 4, 7, 9] | 623 |
| R2 | A04 | 二分搜索 | pass | 4 | 4 | 54 |
| R2 | A05 | 矩阵乘法 | pass | [4, 4]<br>[10, 8] | [4, 4]<br>[10, 8] | 465 |
| R2 | A06 | 动态规划：斐波那契 | pass | 610 | 610 | 212 |
| R2 | A07 | 递归快速排序 | pass | [1, 3, 3, 4, 6, 9] | [1, 3, 3, 4, 6, 9] | 216 |
| R2 | A08 | 最短路径 BFS | pass | 2 | 2 | 360 |
| R2 | A09 | 背包动态规划 | pass | 9 | 9 | 353 |
| R2 | A10 | 回溯排列 | pass | 24 | 24 | 1461 |
| R2 | P01 | 购物车结算（分） | pass | 598 | 598 | 23 |
| R2 | P02 | 库存管理 | pass | 3 3 | 3 3 | 67 |
| R2 | P03 | 成绩统计与评级 | pass | 84.4 3 100 | 84.4 3 100 | 53 |
| R2 | P04 | 文本词频统计 | pass | 3 2 1 | 3 2 1 | 106 |
| R2 | P05 | CSV 销售明细解析 | pass | 150 | 150 | 115 |
| R2 | P06 | 订单排序与汇总 | pass | c b | c b | 126 |
| R2 | P07 | 银行账户对象及异常 | pass | rejected<br>70 | rejected<br>70 | 125 |
| R2 | P08 | 学生成绩对象排行榜 | pass | Bob 87.0 | Bob 87.0 | 345 |
| R2 | P09 | 配置数据深层更新 | pass | [81, 443, 8080] | [81, 443, 8080] | 212 |
| R2 | P10 | 日志解析与异常跳过 | pass | 20 1 | 20 1 | 172 |
| R2 | M01 | 日期与时间：日期转时间戳 | pass | 2024-02-29 | 2024-02-29 | 914 |
| R2 | M02 | 数学与统计：均方根 | pass | 7.506 | 7.506 | 40 |
| R2 | M03 | JSON 与数学：计算半径 | pass | 5.0 | 5.0 | 483 |
| R2 | M04 | 正则与统计：提取数字 | pass | 20 | 20 | 769 |
| R2 | M05 | JSON 与正则：筛选订单编号 | pass | 2 | 2 | 221 |
| R2 | M06 | 数学与复数库：幅值和相位 | pass | 0.0 2.0 | 0.0 2.0 | 23 |
| R2 | M07 | 随机与数学：确定性采样 | pass | 4.0 | 4.0 | 620 |
| R2 | M08 | 成绩报告：JSON、统计、数学 | pass | 80 85.0<br>12.25 | 80 85.0<br>12.25 | 37 |
| R2 | M09 | 传感器日志：正则、统计、数学 | pass | 4<br>13.0 | 4<br>13.0 | 153 |
| R2 | M10 | 日程提醒：datetime、re | pass | 2024-03-01 | 2024-03-01 | 483 |
| R2 | M11 | 实验分析：random、statistics、math | pass | 8 True True<br>True | 8 True True<br>True | 196 |
| R2 | M12 | 交易记录处理：json、re、datetime | pass | 12 | 12 | 226 |
| R2 | M13 | 复数信号分析：cmath、math、statistics | pass | 9.0<br>53.13 | 9.0<br>53.13 | 55 |
| R2 | M14 | 项目日期与随机抽样：datetime、random、statistics | pass | 2024-03-05<br>2 | 2024-03-05<br>2 | 270 |
| R2 | M15 | JSON+math：数组向量长度 | pass | 13 | 13 | 39 |
| R2 | M16 | re+math：简单文本定量 | pass | 3 | 3 | 96 |
| R2 | M17 | datetime+math：日期周期 | pass | 29 | 29 | 21 |
| R2 | M18 | time+math：确定性时间计算 | pass | 1970 | 1970 | 196 |
| R2 | M19 | JSON+re+math：关键词数据计分 | pass | 3<br>2 | 3<br>2 | 80 |
| R2 | M20 | cmath+math+statistics：复数信号 | pass | 9.0<br>53.13 | 9.0<br>53.13 | 45 |
| R2 | E01 | 销售订单系统：库存、订单、折扣、异常 | pass | rejected<br>160<br>1 2 | rejected<br>160<br>1 2 | 403 |
| R2 | E02 | 传感器数据流水线：解析、分类、汇总 | pass | 3 1<br>20<br>36<br>1 | 3 1<br>20<br>36<br>1 | 278 |
| R2 | E03 | 项目排程：日期、工时、里程碑 | pass | design 2024-02-28<br>build 2024-03-01<br>test 2024-03-03<br>5 | design 2024-02-28<br>build 2024-03-01<br>test 2024-03-03<br>5 | 139 |
| R2 | E04 | JSON 配置解析与向量分析报告 | pass | [5, 13, 17]<br>35<br>17 | [5, 13, 17]<br>35<br>17 | 373 |
| R3 | D001 | 负数、优先级、整数运算 | pass | 107 | 107 | 3049 |
| R3 | D002 | 负数、优先级、整数运算 | pass | 2 | 2 | 22 |
| R3 | D003 | 负数、优先级、整数运算 | pass | 24 | 24 | 19 |
| R3 | D004 | 负数、优先级、整数运算 | pass | -6 | -6 | 18 |
| R3 | D005 | 负数、优先级、整数运算 | pass | 1 | 1 | 18 |
| R3 | D006 | 负数、优先级、整数运算 | pass | 1 | 1 | 24 |
| R3 | D007 | 负数、优先级、整数运算 | pass | -10 | -10 | 27 |
| R3 | D008 | 负数、优先级、整数运算 | pass | -40 | -40 | 27 |
| R3 | D009 | 负数、优先级、整数运算 | pass | -69 | -69 | 27 |
| R3 | D010 | 负数、优先级、整数运算 | pass | 86 | 86 | 26 |
| R3 | D011 | 负数、优先级、整数运算 | pass | -2 | -2 | 27 |
| R3 | D012 | 负数、优先级、整数运算 | pass | -9 | -9 | 18 |
| R3 | D013 | 负数、优先级、整数运算 | pass | 0 | 0 | 22 |
| R3 | D014 | 负数、优先级、整数运算 | pass | -5 | -5 | 20 |
| R3 | D015 | 负数、优先级、整数运算 | pass | 2 | 2 | 25 |
| R3 | D016 | 负数、优先级、整数运算 | pass | 0 | 0 | 22 |
| R3 | D017 | 负数、优先级、整数运算 | pass | 4 | 4 | 30 |
| R3 | D018 | 负数、优先级、整数运算 | pass | -7 | -7 | 25 |
| R3 | D019 | 负数、优先级、整数运算 | pass | 0 | 0 | 24 |
| R3 | D020 | 负数、优先级、整数运算 | pass | -147 | -147 | 24 |
| R3 | D021 | 列表切片与求和 | pass | 1 5<br>[5] | 1 5<br>[5] | 1324 |
| R3 | D022 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 38 |
| R3 | D023 | 列表切片与求和 | pass | 5 -36<br>[-7, -6, -4, -10, -9] | 5 -36<br>[-7, -6, -4, -10, -9] | 49 |
| R3 | D024 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 30 |
| R3 | D025 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 34 |
| R3 | D026 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 31 |
| R3 | D027 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 40 |
| R3 | D028 | 列表切片与求和 | pass | 1 -4<br>[-4] | 1 -4<br>[-4] | 41 |
| R3 | D029 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 33 |
| R3 | D030 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 27 |
| R3 | D031 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 27 |
| R3 | D032 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 27 |
| R3 | D033 | 列表切片与求和 | pass | 1 -6<br>[-6] | 1 -6<br>[-6] | 28 |
| R3 | D034 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 29 |
| R3 | D035 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 25 |
| R3 | D036 | 列表切片与求和 | pass | 2 -18<br>[-10, -8] | 2 -18<br>[-10, -8] | 30 |
| R3 | D037 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 27 |
| R3 | D038 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 28 |
| R3 | D039 | 列表切片与求和 | pass | 0 0<br>[] | 0 0<br>[] | 25 |
| R3 | D040 | 列表切片与求和 | pass | 2 8<br>[3, 5] | 2 8<br>[3, 5] | 33 |
| R3 | D041 | 大小写敏感查找与替换 | pass | 2 0<br>qBBqx | 2 0<br>qBBqx | 251 |
| R3 | D042 | 大小写敏感查找与替换 | pass | 1 1<br>cqx1D | 1 1<br>cqx1D | 25 |
| R3 | D043 | 大小写敏感查找与替换 | pass | 0 -1<br> cB1 | 0 -1<br> cB1 | 24 |
| R3 | D044 | 大小写敏感查找与替换 | pass | 0 -1<br> xc D | 0 -1<br> xc D | 24 |
| R3 | D045 | 大小写敏感查找与替换 | pass | 1 4<br>11cBqc1B1B B | 1 4<br>11cBqc1B1B B | 24 |
| R3 | D046 | 大小写敏感查找与替换 | pass | 1 2<br>Dcq1ax1xx | 1 2<br>Dcq1ax1xx | 31 |
| R3 | D047 | 大小写敏感查找与替换 | pass | 3 5<br>x DDxqDDBBxqq | 3 5<br>x DDxqDDBBxqq | 32 |
| R3 | D048 | 大小写敏感查找与替换 | pass | 0 -1<br>xxccB | 0 -1<br>xxccB | 24 |
| R3 | D049 | 大小写敏感查找与替换 | pass | 2 2<br>BDqxq | 2 2<br>BDqxq | 33 |
| R3 | D050 | 大小写敏感查找与替换 | pass | 3 5<br>1 DaDqDqq | 3 5<br>1 DaDqDqq | 36 |
| R3 | D051 | 大小写敏感查找与替换 | pass | 0 -1<br>D BBx1 B | 0 -1<br>D BBx1 B | 29 |
| R3 | D052 | 大小写敏感查找与替换 | pass | 1 1<br> q c | 1 1<br> q c | 30 |
| R3 | D053 | 大小写敏感查找与替换 | pass | 2 2<br>1cqqc    1cB1 | 2 2<br>1cqqc    1cB1 | 28 |
| R3 | D054 | 大小写敏感查找与替换 | pass | 0 -1<br> cxB1 | 0 -1<br> cxB1 | 25 |
| R3 | D055 | 大小写敏感查找与替换 | pass | 0 -1<br>aBcxx | 0 -1<br>aBcxx | 23 |
| R3 | D056 | 大小写敏感查找与替换 | pass | 1 10<br>x 11aDx1aDq1a | 1 10<br>x 11aDx1aDq1a | 23 |
| R3 | D057 | 大小写敏感查找与替换 | pass | 3 5<br>11x1xqBacqBcq | 3 5<br>11x1xqBacqBcq | 22 |
| R3 | D058 | 大小写敏感查找与替换 | pass | 1 1<br> q  c11DB | 1 1<br> q  c11DB | 22 |
| R3 | D059 | 大小写敏感查找与替换 | pass | 1 11<br>  DxccDcacBq | 1 11<br>  DxccDcacBq | 23 |
| R3 | D060 | 大小写敏感查找与替换 | pass | 1 6<br>ac1  cqa | 1 6<br>ac1  cqa | 24 |
| R3 | D061 | 链式比较与布尔组合 | pass | True<br>False | True<br>False | 93 |
| R3 | D062 | 链式比较与布尔组合 | pass | False<br>True | False<br>True | 27 |
| R3 | D063 | 链式比较与布尔组合 | pass | False<br>False | False<br>False | 23 |
| R3 | D064 | 链式比较与布尔组合 | pass | False<br>True | False<br>True | 39 |
| R3 | D065 | 链式比较与布尔组合 | pass | False<br>False | False<br>False | 23 |
| R3 | D066 | 链式比较与布尔组合 | pass | False<br>True | False<br>True | 24 |
| R3 | D067 | 链式比较与布尔组合 | pass | False<br>False | False<br>False | 22 |
| R3 | D068 | 链式比较与布尔组合 | pass | False<br>True | False<br>True | 27 |
| R3 | D069 | 链式比较与布尔组合 | pass | False<br>False | False<br>False | 25 |
| R3 | D070 | 链式比较与布尔组合 | pass | False<br>True | False<br>True | 25 |
| R3 | D071 | 链式比较与布尔组合 | pass | False<br>True | False<br>True | 25 |
| R3 | D072 | 链式比较与布尔组合 | pass | False<br>False | False<br>False | 20 |
| R3 | D073 | 链式比较与布尔组合 | pass | False<br>False | False<br>False | 20 |
| R3 | D074 | 链式比较与布尔组合 | pass | False<br>False | False<br>False | 23 |
| R3 | D075 | 链式比较与布尔组合 | pass | False<br>True | False<br>True | 25 |
| R3 | D076 | 链式比较与布尔组合 | pass | False<br>False | False<br>False | 20 |
| R3 | D077 | 链式比较与布尔组合 | pass | False<br>False | False<br>False | 24 |
| R3 | D078 | 链式比较与布尔组合 | pass | True<br>False | True<br>False | 24 |
| R3 | D079 | 链式比较与布尔组合 | pass | True<br>False | True<br>False | 23 |
| R3 | D080 | 链式比较与布尔组合 | pass | False<br>True | False<br>True | 22 |
| R3 | D081 | 循环、分支、函数组合 | pass | 8 | 8 | 1336 |
| R3 | D082 | 循环、分支、函数组合 | pass | -1 | -1 | 62 |
| R3 | D083 | 循环、分支、函数组合 | pass | -9 | -9 | 56 |
| R3 | D084 | 循环、分支、函数组合 | pass | -3 | -3 | 44 |
| R3 | D085 | 循环、分支、函数组合 | pass | 7 | 7 | 54 |
| R3 | D086 | 循环、分支、函数组合 | pass | 37 | 37 | 82 |
| R3 | D087 | 循环、分支、函数组合 | pass | 18 | 18 | 91 |
| R3 | D088 | 循环、分支、函数组合 | pass | 42 | 42 | 75 |
| R3 | D089 | 循环、分支、函数组合 | pass | 6 | 6 | 51 |
| R3 | D090 | 循环、分支、函数组合 | pass | 195 | 195 | 136 |
| R3 | D091 | 循环、分支、函数组合 | pass | 77 | 77 | 93 |
| R3 | D092 | 循环、分支、函数组合 | pass | 3 | 3 | 45 |
| R3 | D093 | 循环、分支、函数组合 | pass | -16 | -16 | 78 |
| R3 | D094 | 循环、分支、函数组合 | pass | 42 | 42 | 81 |
| R3 | D095 | 循环、分支、函数组合 | pass | 21 | 21 | 59 |
| R3 | D096 | 循环、分支、函数组合 | pass | -3 | -3 | 43 |
| R3 | D097 | 循环、分支、函数组合 | pass | -4 | -4 | 47 |
| R3 | D098 | 循环、分支、函数组合 | pass | 104 | 104 | 72 |
| R3 | D099 | 循环、分支、函数组合 | pass | -13 | -13 | 53 |
| R3 | D100 | 循环、分支、函数组合 | pass | 9 | 9 | 61 |
| R3 | P01 | 迷宫求解器（二维地图 BFS） | pass | 5 | 5 | 2364 |
| R3 | P02 | 文本冒险：移动、取物、状态机 | pass | exit<br>['key'] | exit<br>['key'] | 712 |
| R3 | P03 | 矩阵运算库：乘法与转置 | pass | [14, 32]<br>[32, 77] | [14, 32]<br>[32, 77] | 1762 |
| R3 | P04 | 虚拟计算器：自定义指令、栈、算术 | pass | 529 | 529 | 354 |
| R3 | P05 | 递归表达式解释器：树形表达式 | pass | 30 | 30 | 240 |
| R3 | P06 | 随机模拟：采样与统计报告 | pass | 30 True True<br>True<br>30 | 30 True True<br>True<br>30 | 1633 |
| R3 | P07 | 学生管理系统：增删改查与排序 | pass | ['Bob', 'Cat']<br>2 | ['Bob', 'Cat']<br>2 | 1293 |
| R3 | P08 | 简易线性回归：迭代训练 | pass | 2.0<br>8.0 | 2.0<br>8.0 | 1167 |
| R3 | X01 | 标识符与字符串大小写 | pass | 7 13 False | 7 13 False | 11 |
| R3 | X02 | 标识符与字符串大小写 | pass | 6 16 False | 6 16 False | 11 |
| R3 | X03 | 标识符与字符串大小写 | pass | 5 12 False | 5 12 False | 11 |
| R3 | X04 | 标识符与字符串大小写 | pass | 2 12 False | 2 12 False | 11 |
| R3 | X05 | 标识符与字符串大小写 | pass | 7 16 False | 7 16 False | 15 |
| R3 | X06 | 标识符与字符串大小写 | pass | 7 13 False | 7 13 False | 11 |
| R3 | X07 | 嵌套容器别名和浅拷贝 | pass | 2 3<br>[3, 17]<br>False True | 2 3<br>[3, 17]<br>False True | 186 |
| R3 | X08 | 嵌套容器别名和浅拷贝 | pass | 2 3<br>[1, 18]<br>False True | 2 3<br>[1, 18]<br>False True | 56 |
| R3 | X09 | 嵌套容器别名和浅拷贝 | pass | 2 3<br>[4, 29]<br>False True | 2 3<br>[4, 29]<br>False True | 54 |
| R3 | X10 | 嵌套容器别名和浅拷贝 | pass | 2 3<br>[3, 38]<br>False True | 2 3<br>[3, 38]<br>False True | 56 |
| R3 | X11 | 嵌套容器别名和浅拷贝 | pass | 2 3<br>[1, 42]<br>False True | 2 3<br>[1, 42]<br>False True | 55 |
| R3 | X12 | 嵌套容器别名和浅拷贝 | pass | 2 3<br>[2, 53]<br>False True | 2 3<br>[2, 53]<br>False True | 73 |
| R3 | X13 | 闭包与独立 nonlocal 状态 | pass | 5 17 6 18 | 5 17 6 18 | 90 |
| R3 | X14 | 闭包与独立 nonlocal 状态 | pass | 5 16 6 17 | 5 16 6 17 | 68 |
| R3 | X15 | 闭包与独立 nonlocal 状态 | pass | 7 14 8 15 | 7 14 8 15 | 64 |
| R3 | X16 | 闭包与独立 nonlocal 状态 | pass | 8 11 9 12 | 8 11 9 12 | 76 |
| R3 | X17 | 闭包与独立 nonlocal 状态 | pass | 6 12 7 13 | 6 12 7 13 | 65 |
| R3 | X18 | 闭包与独立 nonlocal 状态 | pass | 3 11 4 12 | 3 11 4 12 | 69 |
| R3 | X19 | 异常与 finally 状态传播 | pass | -207 | -207 | 606 |
| R3 | X20 | 异常与 finally 状态传播 | pass | -101 | -101 | 81 |
| R3 | X21 | 异常与 finally 状态传播 | pass | -94 | -94 | 84 |
| R3 | X22 | 异常与 finally 状态传播 | pass | -91 | -91 | 85 |
| R3 | X23 | 异常与 finally 状态传播 | pass | -190 | -190 | 111 |
| R3 | X24 | 异常与 finally 状态传播 | pass | -105 | -105 | 80 |
| R3 | Tloop100 | 循环 100 次 | pass | 4950 | 4950 | 2718 |
| R3 | Tloop300 | 循环 300 次 | pass | 44850 | 44850 | 35 |
| R3 | Tloop1000 | 循环 1000 次 | pass | 499500 | 499500 | 53 |
| R3 | Tloop10000 | 循环 10000 次 | pass | 49995000 | 49995000 | 287 |
| R3 | Tsort20 | 排序 20 元素 | pass | 20 0 97 970 | 20 0 97 970 | 1646 |
| R3 | Tsort60 | 排序 60 元素 | pass | 60 0 100 2971 | 60 0 100 2971 | 205 |
| R3 | Tsort150 | 排序 150 元素 | pass | 150 0 100 7455 | 150 0 100 7455 | 585 |
| R3 | Tsort500 | 排序 500 元素 | pass | 500 0 100 24997 | 500 0 100 24997 | 2658 |
| R3 | Trec10 | 递归深度 10 | pass | 10 | 10 | 1171 |
| R3 | Trec30 | 递归深度 30 | pass | 30 | 30 | 236 |
| R3 | Trec80 | 递归深度 80 | pass | 80 | 80 | 615 |
| R3 | Trec150 | 递归深度 150 | pass | 150 | 150 | 1148 |
| R3 | Tdict10 | 字典 10 个键 | pass | 10 285 | 10 285 | 716 |
| R3 | Tdict50 | 字典 50 个键 | pass | 50 40425 | 50 40425 | 741 |
| R3 | Tdict150 | 字典 150 个键 | pass | 150 1113775 | 150 1113775 | 2315 |
| R3 | Tdict500 | 字典 500 个键 | pass | 500 41541750 | 500 41541750 | 6181 |
| R3 | Tstr100 | 字符串 100 字符 | pass | 100 50 b | 100 50 b | 123 |
| R3 | Tstr500 | 字符串 500 字符 | pass | 500 250 b | 500 250 b | 25 |
| R3 | Tstr1500 | 字符串 1500 字符 | pass | 1500 750 b | 1500 750 b | 42 |
| R3 | Tstr10000 | 字符串 10000 字符 | pass | 10000 5000 b | 10000 5000 b | 175 |
| G | G01 | 闭包计数器独立状态 | pass | 1 2 1 3 2 | 1 2 1 3 2 | 4226 |
| G | G02 | 生成器表达式延迟绑定 | pass | [0, 5, 10] | [0, 5, 10] | 2734 |
| G | G03 | 未定义异常类型 | pass | name error | name error | 903 |
| G | G04 | 生成器委托返回值 | pass | [1, 9] | [1, 9] | 137 |
| G | G05 | 大小写函数及属性 | pass | 1 2 | 1 2 | 247 |
| G | G06 | JSON 嵌套及转义 | pass | True<br>a"b | True<br>a"b | 1534 |
| G | G07 | 排序稳定性及 key 调用次数 | pass | b a c<br>3 | b a c<br>3 | 1217 |
| G | G08 | 上下文管理器异常抑制 | pass | True<br>ok | True<br>ok | 434 |
| G | G09 | 字典键区分大小写 | pass | 2 1 2<br>1 2 | 2 1 2<br>1 2 | 192 |
| G | G10 | 关键字参数转发 | pass | 12 | 12 | 184 |
| G | G11 | 大小写全局函数 | pass | 1 2 | 1 2 | 20 |
| G | G12 | 大小写实例属性 | pass | 1 2 | 1 2 | 194 |
| G | G13 | 大小写类名 | pass | 1 2 | 1 2 | 101 |
| G | G14 | 大小写类属性 | pass | 1 2 | 1 2 | 12 |
| G | G15 | 生成器局部变量延迟绑定 | pass | [0, 5, 10] | [0, 5, 10] | 82 |
| G | G16 | 生成器委托 send | pass | 1<br>7 | 1<br>7 | 128 |
| G | G17 | 普通 yield 表达式与 send | pass | 1<br>7 | 1<br>7 | 29 |
| G | G18 | send(None) 恢复生成器 | pass | 1<br>2 | 1<br>2 | 29 |
| H | H01 | send 初始非 None 错误 | pass | TypeError<br>1 | TypeError<br>1 | 5875 |
| H | H02 | 生成器 close 与 finally | pass | 1<br>closed<br>end | 1<br>closed<br>end | 1134 |
| H | H03 | 生成器 throw 异常 | pass | 1<br>2 | 1<br>2 | 408 |
| H | H04 | StopIteration.value | pass | 1<br>9 | 1<br>9 | 64 |
| H | H05 | 生成器委托普通迭代器 send | pass | 1<br>2 | 1<br>2 | 149 |
| H | H06 | 大小写动态属性操作 | pass | 1 2<br>False True | 1 2<br>False True | 280 |
| H | H07 | 关键字参数大小写 | pass | 12 | 12 | 514 |
| H | H08 | 大小写闭包捕获 | pass | (4, 7)<br>(7, 12) | (4, 7)<br>(7, 12) | 453 |
| H | H09 | MRO 大小写方法继承 | pass | 1 2 | 1 2 | 475 |
| H | H10 | 生成器多层委托返回 | pass | [1, 2, 3] | [1, 2, 3] | 201 |
| H | H11 | 只读闭包大小写 | pass | (1, 2) | (1, 2) | 46 |
| H | H12 | 单一 nonlocal 大小写 | pass | (1, 7) | (1, 7) | 33 |
| H | H13 | getattr 默认值 | pass | 1 9 | 1 9 | 174 |
| H | H14 | hasattr 区分大小写 | pass | True False | True False | 21 |
| H | H15 | delattr 区分大小写 | pass | 2 | 2 | 25 |
| H | H16 | PEP479 生成器内部 StopIteration | pass | 1<br>runtime | 1<br>runtime | 168 |
| I | I01 | 委托生成器 close 传播 | pass | 1<br>inner<br>outer | 1<br>inner<br>outer | 5883 |
| I | I02 | 委托生成器 throw 传播 | pass | 1<br>2 | 1<br>2 | 878 |
| I | I03 | close 后重复调用 | pass | 1<br>9 | 1<br>9 | 463 |
| I | I04 | 生成器忽略 GeneratorExit | pass | 1<br>runtime | 1<br>runtime | 78 |
| I | I05 | throw 已结束生成器 | pass | [1]<br>value | [1]<br>value | 222 |
| I | I06 | StopIteration 显式构造 | pass | 7<br>(7,) | 7<br>(7,) | 88 |
| I | I07 | 动态属性继承及删除 | pass | 1<br>2<br>1 | 1<br>2<br>1 | 595 |
| I | I08 | 动态属性无默认值抛错 | pass | missing | missing | 39 |
| I | I09 | 多层闭包大小写隔离 | pass | (2, 12) (4, 14) (3, 22) | (2, 12) (4, 14) (3, 22) | 736 |
| I | I10 | 闭包同帧共享大小写 | pass | (1, 5) | (1, 5) | 172 |
| I | I11 | 类方法动态读取并调用 | pass | 5 | 5 | 364 |
| I | I12 | 生成器异常恢复后终止 | pass | 1<br>2<br>3 | 1<br>2<br>3 | 92 |
| I | I13 | next 默认值普通迭代器 | pass | 1<br>9 | 1<br>9 | 69 |
| I | I14 | next 默认值结束生成器 | pass | 1<br>9 | 1<br>9 | 25 |
| I | I15 | 重复 close 后普通 next | pass | 1<br>end | 1<br>end | 73 |
| I | I16 | 动态获取方法后间接调用 | pass | 5 | 5 | 31 |
| I | I17 | 普通函数返回可调用对象后直接调用 | pass | 5 | 5 | 24 |
| I | I18 | StopIteration 无参数及多参数 | pass | None<br>7<br>(7, 8) | None<br>7<br>(7, 8) | 41 |
| I | I19 | 变量边界循环累加 | pass | 12497500 4999 | 12497500 4999 | 474 |
| I | I20 | 循环 continue 与 break | pass | 100 20 | 100 20 | 178 |
| I | I21 | 循环负步长及初值 | pass | 250509 2 | 250509 2 | 91 |
| I | I22 | 循环中修改累加值和列表 | pass | 30 435 435 | 30 435 435 | 598 |
| J | J01 | 默认值为可变容器并保持身份 | pass | True | True | 4775 |
| J | J02 | None 元素不应被默认值替换 | pass | None 0 False 8 | None 0 False 8 | 83 |
| J | J03 | 默认值求值副作用 | pass | default<br>2<br>default<br>9 | default<br>2<br>default<br>9 | 915 |
| J | J04 | 非 StopIteration 异常不能被默认值吞掉 | pass | 1<br>value | 1<br>value | 1934 |
| J | J05 | 生成器返回值与 next 默认值分离 | pass | 1 9 9 | 1 9 9 | 39 |
| J | J06 | StopIteration 子类继承 value | pass | 12 (12, 13) | 12 (12, 13) | 492 |
| J | J07 | 显式 raise 后异常属性 | pass | 4 (4, 5) | 4 (4, 5) | 59 |
| J | J08 | StopIteration.value 可写且与 args 独立 | pass | 8 (4,) | 8 (4,) | 186 |
| J | J09 | getattr 默认函数返回值直接调用 | pass | 10 | 10 | 395 |
| J | J10 | getattr 方法关键字参数 | pass | 12 | 12 | 286 |
| J | J11 | getattr 链式调用 | pass | 7 | 7 | 34 |
| J | J12 | getattr 非可调用值报错 | pass | type | type | 86 |
| J | J13 | 删除重插后顺序 | pass | 30 10 100 | 30 10 100 | 1912 |
| J | J14 | 键等价与大小写隔离 | pass | 4 c d 1 2 | 4 c d 1 2 | 447 |
| J | J15 | 更新现存键不改变顺序 | pass | ['a', 'b', 'c', 'd'] [1, 9, 3, 4] | ['a', 'b', 'c', 'd'] [1, 9<br>, 3, 4] | 542 |
| J | J16 | 字典浅拷贝隔离 | pass | {'x': [1, 2]} {'x': [1, 2], 'y': 3} | {'x': [1, 2]} {'x': [1, 2]<br>, 'y': 3} | 413 |
| J | J17 | 不使用 getattr 的裸链式调用 | pass | ok | ok | 281 |
| J | J18 | getattr 方法裸调用 | pass | ok | ok | 24 |
| J | J19 | 非可调用值放在赋值表达式中 | pass | type | type | 34 |
| J | J20 | 布尔与整数键相等 | pass | 1 b b | 1 b b | 17 |
| J | J21 | 浮点与整数键相等 | pass | 1 b b | 1 b b | 30 |
| J | J22 | False 与零键相等 | pass | 1 b b | 1 b b | 18 |
| K | K01 | 等价键保留首次键对象 | pass | [True] 2 1 | [True] 2 1 | 3874 |
| K | K02 | 等价键删除与重新插入 | pass | ['x', 1] 3 | ['x', 1] 3 | 261 |
| K | K03 | get、pop、setdefault 等价键 | pass | 3 3 3 0 | 3 3 3 0 | 212 |
| K | K04 | 成员判断等价键 | pass | True True True False | True True True False | 169 |
| K | K05 | 等价元组键 | pass | 3<br>1 7 | 3<br>1 7 | 413 |
| K | K06 | 复数与整数键 | pass | 1 4 | 1 4 | 258 |
| K | K07 | 浮点负零与整数零 | pass | 1 5 5 | 1 5 5 | 73 |
| K | K08 | 不可哈希列表键 | pass | type | type | 1178 |
| K | K09 | 不可哈希查询 | pass | type | type | 271 |
| K | K10 | 等价数值去重 | pass | 2 True True | 2 True True | 139 |
| K | K11 | 等价数值删除 | pass | [2] | [2] | 169 |
| K | K12 | 普通函数返回非可调用对象 | pass | type | type | 720 |
| K | K13 | getattr 返回 None | pass | type | type | 502 |
| K | K14 | getattr 缺失属性优先抛 AttributeError | pass | attribute | attribute | 40 |
| K | K15 | 参数求值先于调用类型错误 | pass | arg<br>type | arg<br>type | 41 |
| K | K16 | 返回可调用实例 | pass | 6 | 6 | 522 |
| K | K17 | 数值键与同形字符串并存 | pass | 3 3 2 4 | 3 3 2 4 | 125 |
| K | K18 | 字典相等比较使用等价键 | pass | True True | True True | 128 |
| K | K19 | 字典合并等价键 | pass | 1 4 | 1 4 | 80 |
| K | K20 | finally 在调用错误后执行 | pass | type<br>finally | type<br>finally | 36 |
| K | K21 | 普通元组键通过变量查询 | pass | 3 3 | 3 3 | 97 |
| K | K22 | 元组等价键通过变量访问 | pass | 3<br>1 7 | 3<br>1 7 | 121 |
| K | K23 | 不可哈希键成员检测 | pass | type | type | 30 |
| K | K24 | add 等价数值 | pass | 1 | 1 | 130 |
| K | K25 | 等价键集合运算 | pass | 1 3 1 | 1 3 1 | 141 |
| K | K26 | 不可哈希查询异常 | pass | type | type | 37 |
| K | K27 | 实例属性保存可调用对象 | pass | 6 | 6 | 43 |
| K | K28 | 直接调用可调用实例 | pass | 6 | 6 | 33 |
| K | K29 | 类属性存放其他类实例（不调用） | pass | True | True | 22 |
| L | L101 | 数值等价的首次元素身份 | pass | 1 True | 1 True | 3345 |
| L | L102 | discard 与 membership | pass | 1 False True | 1 False True | 482 |
| L | L103 | 对称差等价元素 | pass | [2, 3] | [2, 3] | 385 |
| L | L104 | 集合子集、相等性 | pass | True True | True True | 14 |
| L | L105 | 嵌套等价元组键 | pass | True 4 | True 4 | 843 |
| L | L106 | 不可哈希元组包含列表 | pass | type | type | 1364 |
| L | L107 | 不可哈希 pop | wrong | 9 | type | 30 |
| L | L108 | 不可哈希 setdefault | pass | type<br>0 | type<br>0 | 98 |
| L | L109 | 继承 __call__ | pass | 5 | 5 | 1745 |
| L | L110 | 可调用实例关键字参数 | pass | 7 | 7 | 509 |
| L | L111 | callable 内建与实例 | python_error | True False | Line 4: NameError: name 'c<br>allable' is not defined | 32 |
| L | L112 | 类属性实例共享且有初始化参数 | pass | True 7 | True 7 | 226 |
| L | L113 | 类属性实例可变 | pass | [1] | [1] | 226 |
| L | L114 | 排序键只求值一次 | pass | [2, 4, 3, 1]<br>[3, 2, 1, 4] | [2, 4, 3, 1]<br>[3, 2, 1, 4] | 542 |
| L | L115 | 反向稳定排序 | pass | [(2, 'b'), (2, 'd'), (1, 'a'), (1, 'c')] | [(2, 'b'), (2, 'd'), (1, '<br>a'), (1, 'c')] | 127 |
| L | L116 | 非实数复数键不能合并 | pass | 2 5 4 | 2 5 4 | 579 |
| L | L117 | 非空字典不可哈希 pop | pass | type | type | 40 |
| L | L118 | callable 普通函数 | python_error | True False | Line 3: NameError: name 'c<br>allable' is not defined | 19 |
| M | M01 | 默认可变对象跨调用共享 | pass | 1 2 3 | 1 2 3 | 3912 |
| M | M02 | 关键字专用参数 | wrong | 7<br>type | 7 | 1494 |
| M | M03 | 位置专用参数 | python_error | 7<br>type | Line 3: TypeError: missing<br> argument / | 806 |
| M | M04 | 重复绑定参数 | pass | type | type | 324 |
| M | M05 | 双星号重复关键字 | pass | type | type | 261 |
| M | M06 | 星号解包生成器 | python_error | 6 | Line 6: TypeError: missing<br> argument a | 95 |
| M | M07 | 关键字映射键不是字符串 | pass | type | type | 34 |
| M | M08 | 默认参数在定义时求值 | pass | 1 8 | 1 8 | 157 |
| M | M09 | __bool__ 优先于 __len__ | wrong | False | True | 169 |
| M | M10 | __len__ 负值异常 | wrong | value | -1 | 286 |
| M | M11 | __bool__ 非布尔返回值 | wrong | type | True | 43 |
| M | M12 | __getattr__ 缺失属性钩子 | python_error | HELLO | Line 4: AttributeError: 'A<br>' object has no attribute <br>'hello' | 22 |
| M | M13 | property setter | wrong | 14 | 7 | 219 |
| M | M14 | 类方法继承绑定子类 | python_error | 7 7 | Line 7: SyntaxError: missi<br>ng expression | 296 |
| M | M15 | 实例 __eq__ 与反向比较 | wrong | True True False | True False False | 51 |
| M | M16 | 反向加法 | python_error | 9 | Line 4: TypeError: unsuppo<br>rted operand type(s) for +<br>: 'int' and 'A' | 77 |
| M | M17 | 自定义 contains | pass | True False | True False | 40 |
| M | M18 | 索引切片传入 slice | python_error | (1, 8, 2) | Line 5: SyntaxError: expre<br>ssion | 128 |
| M | M19 | iter 可调用对象 sentinel | python_error | [1, 2] | Line 4: SyntaxError: paren<br>theses | 176 |
| M | M20 | zip 严格长度 | python_error | value | Line 2: SyntaxError: expre<br>ssion | 85 |
| M | M21 | 迭代器耗尽后重复 next | pass | 1 2 3 | 1 2 3 | 569 |
| M | M22 | iter 序列协议回退 | pass | [1, 2, 3] | [1, 2, 3] | 335 |
| M | M23 | 生成器表达式外层迭代立即求值 | pass | outer<br>created<br>1 | outer<br>created<br>1 | 828 |
| M | M24 | list += 保持身份 | pass | True [1, 2] | True [1, 2] | 284 |
| M | M25 | list *= 保持内部别名 | wrong | True True [[1, 2], [1, 2]] | True False [[1, 2], [1]] | 303 |
| M | M26 | 字典视图动态更新 | pass | ['a', 'b'] | ['a', 'b'] | 233 |
| M | M27 | 迭代时修改字典长度 | wrong | a<br>runtime | a | 133 |
| M | M28 | list 迭代时追加元素 | wrong | 1<br>[2, 3] | 1<br>[1, 2] | 27 |
| M | M29 | 扩展切片赋值长度不匹配 | pass | value<br>[1, 2, 3, 4] | value<br>[1, 2, 3, 4] | 107 |
| M | M30 | 列表排序 key 异常 | pass | value<br>[3, 1, 2] | value<br>[3, 1, 2] | 454 |
| M | M31 | 异常别名离开 except 后删除 | wrong | a<br>name | a<br>a | 102 |
| M | M32 | 异常链 cause | pass | ValueError a | ValueError a | 179 |
| M | M33 | 嵌套 except 裸 raise 恢复外异常 | pass | value | value | 102 |
| M | M34 | with 抑制异常 | pass | ValueError<br>after | ValueError<br>after | 416 |
| M | M35 | 类作用域不被方法捕获 | pass | 1 | 1 | 24 |
| M | M36 | 函数默认值闭包与 late-binding | pass | 0 1 2 | 0 1 2 | 165 |
| M | M37 | 推导式变量不泄漏 | pass | [0, 1, 2]<br>8 | [0, 1, 2]<br>8 | 414 |
| M | M38 | 推导式内 lambda late-binding | python_error | 2 2 2 | Line 2: NameError: name 'x<br>' is not defined | 27 |
| M | M39 | round ties to even | pass | 2 4 -2 | 2 4 -2 | 232 |
| M | M40 | pow 三参数负指数模逆 | wrong | 5 | 0.3333333333333333 | 63 |
| M | M41 | min 空 iterable default | pass | 9 8 | 9 8 | 91 |
| M | M42 | sum start 为列表 | python_error | [1, 2] | Line 1: TypeError: unsuppo<br>rted operand type(s) for +<br>: 'int' and 'list' | 13 |
| M | M43 | reversed 自定义序列 | python_error | [3, 2, 1] | Line 6: TypeError: 'A' obj<br>ect is not reversible | 26 |
| M | M44 | int base 与前缀 | python_error | 255 5 -10 | Line 1: ValueError: invali<br>d literal for int() with b<br>ase 0: '0xff' | 251 |
| M | M45 | Unicode 大小写扩展 | python_error | STRASSE ä | Line 1: SyntaxError: ASCII<br> text required | 5 |
| M | M46 | split 空字符串和 maxsplit | pass | ['a', 'b c ']<br>['a', ',b'] | ['a', 'b c ']<br>['a', ',b'] | 142 |
| M | M47 | 格式化转换旗标 | pass | 'a' | 'a' | 409 |
| M | M48 | format 动态宽度 | pass |    x |    x | 138 |
| M | M49 | list 消费部分迭代器（无修改） | wrong | 1<br>[2, 3]<br>9 | 1<br>[1, 2, 3]<br>9 | 40 |
| M | M50 | 列表追加后 next | wrong | 1<br>2 3 9 | 1<br>2 9 9 | 73 |
| M | M51 | tuple 消费部分迭代器 | python_error | 1<br>(2, 3)<br>9 | 1<br>Line 3: TypeError: 'object<br>' object is not iterable | 29 |
| M | M52 | 乘法重复保持嵌套引用 | wrong | [[1, 2]] [[1, 2], [1, 2]] True | [[1]] [[1, 2], [1, 2]] Tru<br>e | 130 |
| M | M53 | 字典 items 和 values 视图 | pass | [2, 3] [('a', 2), ('b', 3)] | [2, 3] [('a', 2), ('b', 3)<br>] | 268 |
| M | M54 | bool 使用 __len__ 回退 | wrong | False | True | 22 |
| M | M55 | 直接 __bool__ 与 bool 内建 | wrong | False False<br>false | False True<br>truth | 55 |
| M | M56 | classmethod 类与实例分离 | python_error | 7 7 | Line 8: SyntaxError: missi<br>ng expression | 35 |
| M | M57 | 直接切片方法与普通索引 | wrong | 4<br>slice(1, 3, None) | 4<br>[1, 2] | 58 |
| M | M58 | pow 正指数的模数 | pass | 4 81 | 4 81 | 458 |
| M | M59 | sum 非零起始值 | pass | 16 | 16 | 12 |
| M | M60 | int 显式十六进制 | pass | 255 255 | 255 255 | 18 |
| M | M61 | 关键字专用缺参 | pass | type<br>7 | type<br>7 | 46 |
| M | M62 | 推导式 lambda 默认值 | pass | 0 1 2 | 0 1 2 | 66 |
| M | M63 | 自定义 __reversed__ | python_error | [3, 2, 1] | Line 4: TypeError: 'A' obj<br>ect is not reversible | 25 |
| M | M64 | except 别名覆盖已有变量 | wrong | name | x | 73 |
| N | N101 | 重绑定后视图仍属于旧字典 | pass | ['a', 'c'] ['b'] | ['a', 'c'] ['b'] | 3964 |
| N | N102 | 临时字典表达式视图 | pass | [1] 1 | [1] 1 | 832 |
| N | N103 | 删除与原地更新 | pass | 1 [8] [('b', 8)] | 1 [8] [('b', 8)] | 429 |
| N | N104 | clear 和重新填充 | pass | 0<br>['z'] | 0<br>['z'] | 30 |
| N | N105 | 键成员测试及迭代 | wrong | True<br>a<br>b | False<br>a<br>b | 321 |
| N | N106 | 原字典多级属性引用 | wrong | ['a', 'b'] | ['a'] | 815 |
| N | N107 | 视图跨函数返回 | wrong | [('a', 7)] | [('a', 1)] | 429 |
| N | N108 | 首次 send 失败后保留外列表副作用 | pass | 0<br>7 [1] | 0<br>7 [1] | 2047 |
| N | N109 | 嵌套调用对外列表多次追加 | pass | 2 [1, 2] | 2 [1, 2] | 350 |
| N | N110 | 外列表别名与生成器恢复 | pass | 1 [2] [2] True | 1 [2] [2] True | 47 |
| N | N111 | 闭包持有列表生成器首次恢复 | python_error | 1 [2] | Line 9: ValueError: not en<br>ough values to unpack (exp<br>ected 2, got 0) | 24 |
| N | N112 | 两次恢复的嵌套调用副作用 | pass | 1 [1]<br>2 [1, 2] | 1 [1]<br>2 [1, 2] | 55 |
