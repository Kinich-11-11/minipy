# MiniPy v4.204 新测试报告(84 例多维度复杂用例)

日期:2026-10-29
套件:`_work/v41/_cov205a~e.txt`(算法 18、OOP 14、字符串 15、函数式 15、异常与控制流 15)
运行:`node _work/v41/runall.mjs MiniPy_v4.204.sb3 _work/v41/_res205 _work/v41/_cov205{a,b,c,d,e}.txt`
最小化探针:`_work/v41/_min205.txt`、`_min205b~g.txt`(输出目录 `_min205*out`、`_iso205`)

## 总体结果

| 维度 | 用例 | 通过 | 失败 |
|---|---|---|---|
| 算法与数据结构 (a) | 18 | 15 | 3 |
| OOP (b) | 14 | 8 | 6 |
| 字符串 (c) | 15 | 12 | 3 |
| 函数式 (d) | 15 | 11 | 4 |
| 异常与控制流 (e) | 15 | 13 | 2 |
| **合计** | **77** | **59** | **18** |

(注:84 个 `###` 头,runall 解析计 77 例,以 runner 计数为准。)

**18 个失败全部在隔离重跑(独立 VM、单用例)下复现 —— 全部为真 bug,无串行污染。**
经 7 轮最小化,归并为 **14 个独立根因 + 2 个已知问题的新表现**。

## 根因清单(按严重度)

### 高(静默错误结果或常用路径直接崩溃)

**B1. `is not` 判定语义错误(恒偏 False)**
- `print(1 is not 2)` → `False`(应 `True`);`x is not None` 恒 `False`(Q1/R5/R6)。
- `is` 对值相等的不同对象也返回 True(`[1] is [1]` → True,按值比较)。
- 波及:链表/BST 遍历 `while cur is not None` 循环体一次不执行,静默返回空(cov205b 链表、BST 两例)。
- 复现:`_min205d.txt` Q1、Q2;`_min205e.txt` R5、R6。

**B2. 方法实参求值上下文错位(接收者泄漏进实参)**
- `lst.append('abc'.upper())` → `AttributeError: 'list' object has no attribute 'upper'`(方法在宿主 list 上找,T1/T5)。
- `acc.append(other.pop(1))` → pop 竟在 `acc` 上执行,IndexError(T8)。
- `self.parts.append(w[0].upper() + w[1:])` 同炸(T9)。
- 内置函数作实参正常(`append(len('abc'))` T4、`append('+'+str(x))` 老 cov8 可过),`join`/`update` 的实参正常(T3/T6)——仅 **list.append(可能还有同族变异方法)的实参** 里再调用方法时接收者错位。
- 波及:titlecase(任何 append 实参含字符串方法)、csv 解析、约瑟夫斯环、T9 builder。
- 复现:`_min205f.txt` S3/S6/S8;`_min205g.txt` T1/T2/T5/T8/T9。

**B3. `filter` 返回谓词结果而非元素**
- `list(filter(lambda x: x % 2 == 0, [1,2,3,4]))` → `[True, False, False, False]`(应 `[2, 4]`)(M14)。
- 波及 cov205d map/filter 组合 1 例。

**B4. 内联多参数 lambda 解析失败**
- `fold(lambda a, b: a + b, xs, 0)` → `SyntaxError: lambda needs a colon`(M16)。
- 单参数内联 OK、`f = lambda a, b: ...` 赋值形式 OK(M15)、dict 值形式同炸(M17 套件 dispatch)。
- 波及 cov205d fold、cov205e dispatch table 两例。

**B5. lambda 闭包不能捕获"函数参数作可调用"**
- `def ap(f, v): return lambda x: f(x) + v` → 调用时 `NameError: name 'ten' is not defined`(N17/P13)。
- 捕获普通变量 OK(M18 `make(n)` 通过);捕获列表 OK;两函数参数组合(`f(g(x))`)同炸。
- 波及 cov205d compose 一例(与 B4 叠加)。

**B6. 方法内构造实例且实参引用 `self`(≥2 实参)→ self 被提前重绑**
- `return W7(self.x + k, self.y + k)` → `AttributeError: 'W7' object has no attribute 'x'`(读到未初始化的新实例)(P3/P4/Q17)。
- 单实参 OK(M6);实参全为字面量 OK(P5)。
- **workaround 已验证:先存临时局部变量再构造(Q16 通过)**。
- 波及 cov205b Vector 运算符重载一例。

**B7. `__init__` 中 `类名.类属性 += ...` 后,该类实例方法调用全部失败**
- `class K: n=0; def __init__(self): K.n += 1; def bump(self): ...` → 之后 `y.bump()` 报 `NameError: name '.bump' is not defined`(注意名字带前导点)(R2/R3)。
- `__init__` 只赋实例属性则正常(R1/R4);无 `__init__` 正常(P7/P9)。
- 波及 cov205b class counter 一例。

**B8. 实例属性持有对象 → 方法分派错位**
- `self.e = E()` 后调用 `w.drive()` → `E has no attribute drive`(在外层对象调用方法,却按属性持有的 E 类解析)(M8)。
- 波及 cov205b composition 一例;链表/BST 部分症状或与此叠加。

### 中高

**B9. 元组赋值 RHS 含 `%` 运算语义错误**
- `x, y = y, x % y` → `ZeroDivisionError: division by zero`(Q8;gcd 欧几里得写法 M2、P21 连环双 swap 同炸)。
- 纯交换 `a, b = b, a`(Q9)、RHS 含 `+`(P19)、常量 RHS(P20)均正常。
- workaround:`t = a % b` 临时变量逐步赋值(M3 通过)。

**B10. dict 字面量(值含下标/调用)作调用实参 → 实参列表污染**
- `recs.append({'name': f[0]})` → recs 变成 `['a', '3', {'name': 'a'}]`(外层列表元素被拖进实参)(Q12/Q14/N11)。
- 同样字面量赋给变量则正常(M12/Q15);值为纯变量正常(Q13)。

### 中

**B11. dict 字面量键/值为括号字符串 → SyntaxError**
- `d = {')': '(', ']': '['}` → `SyntaxError: expression`(N15)。疑似 tokenize 对字符串内容做了括号计数。
- 波及 cov205c 括号匹配器一例。

**B12. `__contains__` 未接入 `in`**
- 自定义类实现 `__contains__` 后 `2 in bag` → `TypeError: in requires strings`(round1 case 8)。`__len__` 正常。

### 低

**B13. `Exception.__init__` 不可调用**
- `Exception.__init__(self, msg)` → `Exception has no attribute __init__`(M19)。
- workaround:子类不调 base init,直接存属性——`str(e)` 与两参数 args 行为均正确(N20、Q18 通过)。

**B14. `hasattr` 不存在**(M21 探测;`str(双参异常)` 本身正确)。

### 已知问题的两种新表现(归入既有清单项)

**A1. 返回值别名(清单 #3)**
- 递归 flatten 即使先用临时变量接住递归结果再迭代,输出仍为 `[3,4,5]×4` 型重复(Q22/N6)——递归帧的局部列表疑似跨帧共享身份。
- cov205d recursive flatten 一例归此。

**A2. RLE/调用帧污染家族**
- qsort 递归调用作 `+` 操作数 → `UnboundLocalError: 'left'`(N4);快排非递归版正常(N3)。局部列表在递归调用后"未关联"。
- cov205a quicksort 一例归此。

## 顺带确认的正常项(59 例覆盖)

排序(冒泡/插入/选择 key)、二分、DP(楼梯/硬币/LIS)、筛法、RPN、矩阵乘/转置/旋转、
约瑟夫斯(拆步后)、汉诺塔、进制与位运算、字符串切片/方法链/凯撒/罗马数字/RLE 压缩、
f-string(嵌套说明符/表达式/格式规格)、str.format(混合位置命名/对齐/符号)、
生成器管线、组合推导式(嵌套/字典)、闭包计数器、高阶函数(make_adder/compose 单层)、
sorted key(单参 lambda)、zip/enumerate、set 运算、异常嵌套/finally 次序/自定义异常层析、
while-else/for-else、链式比较、global、继承多态/方法链 builder/`__str__`/`__repr__`/
`__eq__`/`__add__`(实参不引用 self 时)、实例序列与容器协议(len)。

另:`print(实例)` 输出 `<W6 object>` 与 CPython 地址格式差异,属已声明的 repr 地址偏差家族(Q16)。

## 复现命令

```bash
cd D:/编程/scratch/ai/minipython
node _work/v41/runall.mjs MiniPy_v4.204.sb3 _work/v41/_res205 \
  _work/v41/_cov205a.txt _work/v41/_cov205b.txt _work/v41/_cov205c.txt \
  _work/v41/_cov205d.txt _work/v41/_cov205e.txt
# 探针(任一)
node _work/v41/runall.mjs MiniPy_v4.204.sb3 _work/v41/_min205gout _work/v41/_min205g.txt
```

## 修复优先级建议

1. **B1 `is not`** —— 一处判定逻辑,修好直接救回链表/BST 2 例,且消除一大类静默错误。
2. **B2 append 实参接收者泄漏** —— 单点(callmeth 实参求值的上下文保存),救回 5+ 例。
3. **B3 filter** —— 独立小修,语义级错误。
4. **B4/B5 lambda** —— 解析器(多参数)与闭包捕获(参数作可调用)两处。
5. **B6/B7/B8 对象模型三连** —— 构造时 self 重绑时序、类属性自增对方法表的破坏、属性持对象时的分派。
6. **B9 元组赋值求值顺序**、**B10 dict 实参污染**、**B11 括号字符串 tokenize**。
7. **B12 `__contains__`、B13 `Exception.__init__`、B14 `hasattr`** —— 小功能补齐。
