# MiniPy v4.251 深度差分测试与修复待办

2026-11-23。基于 GitHub commit 9f3a97b11efcc0eb84c10e8bde3f527a3f026958 的 MiniPy_v4.251.sb3，SHA256 119161a6c120f6cf39e35f8addc05a43605a4778d6a4bd1cc3b12d4d5c2c3671。未修改 SB3 或仓库。以 scratch-vm 5.0.300 RUN 入口与 CPython 3.12.14 对照。12 秒软超时；每项恢复初始状态，允许 26 字符 UI 换行。

## 总结

本轮增加 64 项：28 通过、20 输出错误、16 报错、0 超时。36 项差异归并为 24 个暂定修复任务，其中部分是 Python 尚未支持的特性，不代表已实现功能的回归。本次未复跑上一轮 392 项，MP-32/MP-33 仍按上一轮报告单独跟踪。

## 修复任务

| 编号 | 优先级 | 问题 | 失败用例 | 验收 |
|---|---|---|---|---|
| MP-34 | P1 | 关键字专用参数禁止位置绑定 | M02 | M61 已通过；保留关键字调用及缺参检查 |
| MP-35 | P2 | 位置专用参数标记 / | M03 | 允许位置参数，拒绝关键字绑定 |
| MP-36 | P1 | 星号实参消费生成器 | M06 | 生成器迭代解包 |
| MP-37 | P1 | 对象真值协议 | M09, M11, M54, M55 | bool 和 if 使用 __bool__，回退 __len__；拒绝非 bool 返回值 |
| MP-38 | P1 | __len__ 负数结果验证 | M10 | 应抛 ValueError |
| MP-39 | P2 | 缺失属性 __getattr__ 回退 | M12 | 调用缺失属性钩子 |
| MP-40 | P1 | property setter 分派 | M13 | 赋值应调用 setter 而非覆盖 property |
| MP-41 | P2 | 继承 classmethod 调用 | M14, M56 | 类和实例绑定到实际子类；当前报语法错误，具体原因待定位 |
| MP-42 | P1 | 反向比较及反向加法 | M15, M16 | 右侧对象 __eq__/__radd__ 分派 |
| MP-43 | P1 | 用户对象切片协议 | M18, M57 | 将 slice 对象传给 __getitem__ 而非把切片转成索引列表 |
| MP-44 | P2 | iter(callable, sentinel) | M19 | 支持 sentinel 迭代形式 |
| MP-45 | P2 | zip(strict=True) | M20 | 长度不一致抛 ValueError |
| MP-46 | P1 | 列表乘法的浅引用语义 | M25, M52 | 普通乘法和原地乘法应共享原元素对象 |
| MP-47 | P1 | 字典动态视图 | M26, M53 | keys、values、items 实时观察字典修改 |
| MP-48 | P1 | 字典迭代中修改长度 | M27 | 下一次 next 应抛 RuntimeError |
| MP-49 | P1 | 消费既有迭代器的剩余元素 | M49, M51 | list/tuple 不得重放已消费元素；消费结束后保持耗尽 |
| MP-50 | P1 | 列表迭代器实时观察追加 | M28, M50 | next 应看见新增元素；M28 同时涉及 MP-49 |
| MP-51 | P1 | except as 别名离开后删除 | M31, M64 | 包括覆盖已有变量的情况 |
| MP-52 | P1 | 推导式闭包 late-binding | M38 | M62 默认值捕获已通过，应保持 |
| MP-53 | P1 | pow(a, negative, modulus) | M40 | 应求模逆；M58 正指数已通过 |
| MP-54 | P2 | sum 的容器起始值 | M42 | 从 start 对象开始逐项加法；M59 数值 start 已通过 |
| MP-55 | P2 | reversed 自定义协议 | M43, M63 | 优先 __reversed__，回退 __len__ 和 __getitem__ |
| MP-56 | P2 | int(s,0) 自动识别基数 | M44 | M60 显式 16 进制通过 |
| MP-57 | P3 | Unicode 源码和字符串支持 | M45 | 当前明确拒绝非 ASCII；如项目有意限制 ASCII，应视作功能扩展而非回归 |

## 全部失败复现（36 项）

### M02 · MP-34 · 关键字专用参数

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

结果：wrong；错误：无；耗时：1619 ms。

### M03 · MP-35 · 位置专用参数

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

结果：python_error；错误：TypeError: missing argument /；耗时：822 ms。

### M06 · MP-36 · 星号解包生成器

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

结果：python_error；错误：TypeError: missing argument a；耗时：122 ms。

### M09 · MP-37 · __bool__ 优先于 __len__

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

结果：wrong；错误：无；耗时：241 ms。

### M10 · MP-38 · __len__ 负值异常

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

结果：wrong；错误：无；耗时：487 ms。

### M11 · MP-37 · __bool__ 非布尔返回值

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

结果：wrong；错误：无；耗时：37 ms。

### M12 · MP-39 · __getattr__ 缺失属性钩子

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

结果：python_error；错误：AttributeError: 'A' object has no attribute 'hello'；耗时：22 ms。

### M13 · MP-40 · property setter

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

结果：wrong；错误：无；耗时：232 ms。

### M14 · MP-41 · 类方法继承绑定子类

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

结果：python_error；错误：SyntaxError: missing expression；耗时：349 ms。

### M15 · MP-42 · 实例 __eq__ 与反向比较

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

结果：wrong；错误：无；耗时：53 ms。

### M16 · MP-42 · 反向加法

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

结果：python_error；错误：TypeError: unsupported operand type(s) for +: 'int' and 'A'；耗时：95 ms。

### M18 · MP-43 · 索引切片传入 slice

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

结果：python_error；错误：SyntaxError: expression；耗时：1712 ms。

### M19 · MP-44 · iter 可调用对象 sentinel

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

结果：python_error；错误：SyntaxError: parentheses；耗时：391 ms。

### M20 · MP-45 · zip 严格长度

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

结果：python_error；错误：SyntaxError: expression；耗时：704 ms。

### M25 · MP-46 · list *= 保持内部别名

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

结果：wrong；错误：无；耗时：703 ms。

### M26 · MP-47 · 字典视图动态更新

```python
d = {"a":1}
k = d.keys()
d["b"] = 2
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

结果：wrong；错误：无；耗时：598 ms。

### M27 · MP-48 · 迭代时修改字典长度

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

结果：wrong；错误：无；耗时：268 ms。

### M28 · MP-50 · list 迭代时追加元素

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

结果：wrong；错误：无；耗时：33 ms。

### M31 · MP-51 · 异常别名离开 except 后删除

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

结果：wrong；错误：无；耗时：98 ms。

### M38 · MP-52 · 推导式内 lambda late-binding

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

结果：python_error；错误：NameError: name 'x' is not defined；耗时：246 ms。

### M40 · MP-53 · pow 三参数负指数模逆

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

结果：wrong；错误：无；耗时：89 ms。

### M42 · MP-54 · sum start 为列表

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

结果：python_error；错误：TypeError: unsupported operand type(s) for +: 'int' and 'list'；耗时：13 ms。

### M43 · MP-55 · reversed 自定义序列

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

结果：python_error；错误：TypeError: 'A' object is not reversible；耗时：35 ms。

### M44 · MP-56 · int base 与前缀

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

结果：python_error；错误：ValueError: invalid literal for int() with base 0: '0xff'；耗时：317 ms。

### M45 · MP-57 · Unicode 大小写扩展

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

结果：python_error；错误：SyntaxError: ASCII text required；耗时：6 ms。

### M49 · MP-49 · list 消费部分迭代器（无修改）

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

结果：wrong；错误：无；耗时：5465 ms。

### M50 · MP-50 · 列表追加后 next

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

结果：wrong；错误：无；耗时：579 ms。

### M51 · MP-49 · tuple 消费部分迭代器

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

结果：python_error；错误：TypeError: 'object' object is not iterable；耗时：522 ms。

### M52 · MP-46 · 乘法重复保持嵌套引用

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

结果：wrong；错误：无；耗时：911 ms。

### M53 · MP-47 · 字典 items 和 values 视图

```python
d = {"a":1}
v = d.values()
i = d.items()
d["a"] = 2
d["b"] = 3
print(list(v),list(i))
```

CPython：
```text
[2, 3] [('a', 2), ('b', 3)]
```

MiniPy：
```text
[1] [('a', 1)]
```

结果：wrong；错误：无；耗时：884 ms。

### M54 · MP-37 · bool 使用 __len__ 回退

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

结果：wrong；错误：无；耗时：483 ms。

### M55 · MP-37 · 直接 __bool__ 与 bool 内建

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

结果：wrong；错误：无；耗时：708 ms。

### M56 · MP-41 · classmethod 类与实例分离

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

结果：python_error；错误：SyntaxError: missing expression；耗时：824 ms。

### M57 · MP-43 · 直接切片方法与普通索引

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

结果：wrong；错误：无；耗时：357 ms。

### M63 · MP-55 · 自定义 __reversed__

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

结果：python_error；错误：TypeError: 'A' object is not reversible；耗时：29 ms。

### M64 · MP-51 · except 别名覆盖已有变量

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

结果：wrong；错误：无；耗时：171 ms。

## 全部 64 项结果

| 编号 | 分类 | 用例 | 结果 | CPython | MiniPy | ms |
|---|---|---|---|---|---|---:|
| M01 | 参数 | 默认可变对象跨调用共享 | pass | 1 2 3 | 1 2 3 | 6774 |
| M02 | 参数 | 关键字专用参数 | wrong | 7<br>type | 7 | 1619 |
| M03 | 参数 | 位置专用参数 | python_error | 7<br>type | Line 3: TypeError: missing<br> argument / | 822 |
| M04 | 参数 | 重复绑定参数 | pass | type | type | 390 |
| M05 | 参数 | 双星号重复关键字 | pass | type | type | 335 |
| M06 | 参数 | 星号解包生成器 | python_error | 6 | Line 6: TypeError: missing<br> argument a | 122 |
| M07 | 参数 | 关键字映射键不是字符串 | pass | type | type | 49 |
| M08 | 参数 | 默认参数在定义时求值 | pass | 1 8 | 1 8 | 214 |
| M09 | 对象 | __bool__ 优先于 __len__ | wrong | False | True | 241 |
| M10 | 对象 | __len__ 负值异常 | wrong | value | -1 | 487 |
| M11 | 对象 | __bool__ 非布尔返回值 | wrong | type | True | 37 |
| M12 | 对象 | __getattr__ 缺失属性钩子 | python_error | HELLO | Line 4: AttributeError: 'A<br>' object has no attribute <br>'hello' | 22 |
| M13 | 对象 | property setter | wrong | 14 | 7 | 232 |
| M14 | 对象 | 类方法继承绑定子类 | python_error | 7 7 | Line 7: SyntaxError: missi<br>ng expression | 349 |
| M15 | 对象 | 实例 __eq__ 与反向比较 | wrong | True True False | True False False | 53 |
| M16 | 对象 | 反向加法 | python_error | 9 | Line 4: TypeError: unsuppo<br>rted operand type(s) for +<br>: 'int' and 'A' | 95 |
| M17 | 对象 | 自定义 contains | pass | True False | True False | 6833 |
| M18 | 对象 | 索引切片传入 slice | python_error | (1, 8, 2) | Line 5: SyntaxError: expre<br>ssion | 1712 |
| M19 | 迭代 | iter 可调用对象 sentinel | python_error | [1, 2] | Line 4: SyntaxError: paren<br>theses | 391 |
| M20 | 迭代 | zip 严格长度 | python_error | value | Line 2: SyntaxError: expre<br>ssion | 704 |
| M21 | 迭代 | 迭代器耗尽后重复 next | pass | 1 2 3 | 1 2 3 | 907 |
| M22 | 迭代 | iter 序列协议回退 | pass | [1, 2, 3] | [1, 2, 3] | 831 |
| M23 | 迭代 | 生成器表达式外层迭代立即求值 | pass | outer<br>created<br>1 | outer<br>created<br>1 | 1280 |
| M24 | 容器 | list += 保持身份 | pass | True [1, 2] | True [1, 2] | 122 |
| M25 | 容器 | list *= 保持内部别名 | wrong | True True [[1, 2], [1, 2]] | True False [[1, 2], [1]] | 703 |
| M26 | 容器 | 字典视图动态更新 | wrong | ['a', 'b'] | ['a'] | 598 |
| M27 | 容器 | 迭代时修改字典长度 | wrong | a<br>runtime | a | 268 |
| M28 | 容器 | list 迭代时追加元素 | wrong | 1<br>[2, 3] | 1<br>[1, 2] | 33 |
| M29 | 容器 | 扩展切片赋值长度不匹配 | pass | value<br>[1, 2, 3, 4] | value<br>[1, 2, 3, 4] | 140 |
| M30 | 容器 | 列表排序 key 异常 | pass | value<br>[3, 1, 2] | value<br>[3, 1, 2] | 441 |
| M31 | 异常 | 异常别名离开 except 后删除 | wrong | a<br>name | a<br>a | 98 |
| M32 | 异常 | 异常链 cause | pass | ValueError a | ValueError a | 253 |
| M33 | 异常 | 嵌套 except 裸 raise 恢复外异常 | pass | value | value | 5353 |
| M34 | 异常 | with 抑制异常 | pass | ValueError<br>after | ValueError<br>after | 2948 |
| M35 | 作用域 | 类作用域不被方法捕获 | pass | 1 | 1 | 876 |
| M36 | 作用域 | 函数默认值闭包与 late-binding | pass | 0 1 2 | 0 1 2 | 1440 |
| M37 | 作用域 | 推导式变量不泄漏 | pass | [0, 1, 2]<br>8 | [0, 1, 2]<br>8 | 554 |
| M38 | 作用域 | 推导式内 lambda late-binding | python_error | 2 2 2 | Line 2: NameError: name 'x<br>' is not defined | 246 |
| M39 | 内建 | round ties to even | pass | 2 4 -2 | 2 4 -2 | 410 |
| M40 | 内建 | pow 三参数负指数模逆 | wrong | 5 | 0.3333333333333333 | 89 |
| M41 | 内建 | min 空 iterable default | pass | 9 8 | 9 8 | 109 |
| M42 | 内建 | sum start 为列表 | python_error | [1, 2] | Line 1: TypeError: unsuppo<br>rted operand type(s) for +<br>: 'int' and 'list' | 13 |
| M43 | 内建 | reversed 自定义序列 | python_error | [3, 2, 1] | Line 6: TypeError: 'A' obj<br>ect is not reversible | 35 |
| M44 | 内建 | int base 与前缀 | python_error | 255 5 -10 | Line 1: ValueError: invali<br>d literal for int() with b<br>ase 0: '0xff' | 317 |
| M45 | 字符串 | Unicode 大小写扩展 | python_error | STRASSE ä | Line 1: SyntaxError: ASCII<br> text required | 6 |
| M46 | 字符串 | split 空字符串和 maxsplit | pass | ['a', 'b c ']<br>['a', ',b'] | ['a', 'b c ']<br>['a', ',b'] | 169 |
| M47 | 字符串 | 格式化转换旗标 | pass | 'a' | 'a' | 452 |
| M48 | 字符串 | format 动态宽度 | pass |    x |    x | 161 |
| M49 | 迭代 | list 消费部分迭代器（无修改） | wrong | 1<br>[2, 3]<br>9 | 1<br>[1, 2, 3]<br>9 | 5465 |
| M50 | 迭代 | 列表追加后 next | wrong | 1<br>2 3 9 | 1<br>2 9 9 | 579 |
| M51 | 迭代 | tuple 消费部分迭代器 | python_error | 1<br>(2, 3)<br>9 | 1<br>Line 3: TypeError: 'object<br>' object is not iterable | 522 |
| M52 | 容器 | 乘法重复保持嵌套引用 | wrong | [[1, 2]] [[1, 2], [1, 2]] True | [[1]] [[1, 2], [1, 2]] Tru<br>e | 911 |
| M53 | 容器 | 字典 items 和 values 视图 | wrong | [2, 3] [('a', 2), ('b', 3)] | [1] [('a', 1)] | 884 |
| M54 | 对象 | bool 使用 __len__ 回退 | wrong | False | True | 483 |
| M55 | 对象 | 直接 __bool__ 与 bool 内建 | wrong | False False<br>false | False True<br>truth | 708 |
| M56 | 对象 | classmethod 类与实例分离 | python_error | 7 7 | Line 8: SyntaxError: missi<br>ng expression | 824 |
| M57 | 对象 | 直接切片方法与普通索引 | wrong | 4<br>slice(1, 3, None) | 4<br>[1, 2] | 357 |
| M58 | 内建 | pow 正指数的模数 | pass | 4 81 | 4 81 | 594 |
| M59 | 内建 | sum 非零起始值 | pass | 16 | 16 | 16 |
| M60 | 内建 | int 显式十六进制 | pass | 255 255 | 255 255 | 178 |
| M61 | 参数 | 关键字专用缺参 | pass | type<br>7 | type<br>7 | 796 |
| M62 | 作用域 | 推导式 lambda 默认值 | pass | 0 1 2 | 0 1 2 | 588 |
| M63 | 迭代 | 自定义 __reversed__ | python_error | [3, 2, 1] | Line 4: TypeError: 'A' obj<br>ect is not reversible | 29 |
| M64 | 异常 | except 别名覆盖已有变量 | wrong | name | x | 171 |

## 通过用例源码

### M01 默认可变对象跨调用共享

```python
def f(a=[]):
    a.append(1)
    return len(a)
print(f(),f(),f())
```

### M04 重复绑定参数

```python
def f(a):
    return a
try:
    f(1,a=2)
except TypeError:
    print("type")
```

### M05 双星号重复关键字

```python
def f(**kw):
    return kw
try:
    f(**{"a":1},**{"a":2})
except TypeError:
    print("type")
```

### M07 关键字映射键不是字符串

```python
def f(**kw):
    return kw
try:
    f(**{1:2})
except TypeError:
    print("type")
```

### M08 默认参数在定义时求值

```python
x = 1
def f(a=x):
    return a
x = 2
print(f(),f(8))
```

### M17 自定义 contains

```python
class A:
    def __contains__(self,x):
        return x == 7
print(7 in A(),2 in A())
```

### M21 迭代器耗尽后重复 next

```python
it = iter([1])
print(next(it,0),next(it,2),next(it,3))
```

### M22 iter 序列协议回退

```python
class A:
    def __getitem__(self,i):
        if i==3:
            raise IndexError()
        return i+1
print(list(A()))
```

### M23 生成器表达式外层迭代立即求值

```python
def f():
    print("outer")
    return [1,2]
g = (x for x in f())
print("created")
print(next(g))
```

### M24 list += 保持身份

```python
a = [1]
b = a
a += [2]
print(a is b,b)
```

### M29 扩展切片赋值长度不匹配

```python
a = [1,2,3,4]
try:
    a[::2] = [9]
except ValueError:
    print("value")
print(a)
```

### M30 列表排序 key 异常

```python
a = [3,1,2]
def key(x):
    if x==1:
        raise ValueError()
    return x
try:
    a.sort(key=key)
except ValueError:
    print("value")
print(a)
```

### M32 异常链 cause

```python
try:
    try:
        raise ValueError("a")
    except ValueError as e:
        raise RuntimeError("b") from e
except RuntimeError as e:
    print(type(e.__cause__).__name__,str(e.__cause__))
```

### M33 嵌套 except 裸 raise 恢复外异常

```python
try:
    try:
        raise ValueError("a")
    except ValueError:
        try:
            raise KeyError("b")
        except KeyError:
            pass
        raise
except ValueError:
    print("value")
```

### M34 with 抑制异常

```python
class A:
    def __enter__(self):
        return self
    def __exit__(self,t,v,b):
        print(t.__name__)
        return True
with A():
    raise ValueError("a")
print("after")
```

### M35 类作用域不被方法捕获

```python
x = 1
class A:
    x = 2
    def f(self):
        return x
print(A().f())
```

### M36 函数默认值闭包与 late-binding

```python
a = []
for i in range(3):
    a.append(lambda x=i:x)
print(a[0](),a[1](),a[2]())
```

### M37 推导式变量不泄漏

```python
x = 8
print([x for x in range(3)])
print(x)
```

### M39 round ties to even

```python
print(round(2.5),round(3.5),round(-2.5))
```

### M41 min 空 iterable default

```python
print(min([],default=9),max([],default=8))
```

### M46 split 空字符串和 maxsplit

```python
print(" a  b c ".split(None,1))
print("a,,b".split(",",1))
```

### M47 格式化转换旗标

```python
x = "a"
print(f"{x!r}")
```

### M48 format 动态宽度

```python
print("{:>{}}".format("x",4))
```

### M58 pow 正指数的模数

```python
print(pow(3,4,7),pow(3,4))
```

### M59 sum 非零起始值

```python
print(sum([1,2,3],10))
```

### M60 int 显式十六进制

```python
print(int("ff",16),int("0xff",16))
```

### M61 关键字专用缺参

```python
def f(*,x):
    return x
try:
    f()
except TypeError:
    print("type")
print(f(x=7))
```

### M62 推导式 lambda 默认值

```python
a = [lambda x=x:x for x in range(3)]
print(a[0](),a[1](),a[2]())
```

