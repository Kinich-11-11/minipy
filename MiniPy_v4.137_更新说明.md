# MiniPy v4.137 更新说明：print 的 sep+end、zfill 符号、`%.Ns`、bool 内建（P219）

## 0. 一句话

四个"小但静默"的偏差：`print(sep=…, end=…)` 同时给时把分隔符当成**一元组**打出来、
`str.zfill()` 把零补在符号**前面**、`%.Ns` 的精度被解析后**丢掉**、`sum()`/`abs()` **拒绝布尔**。
解释器积木 27,117 → **27,156**（+39），变量 1,294 → **1,296**，合计 29,394 → **29,433**。

## 1. P219 四处修复

**(a) `print(sep=…, end=…)` → 分隔符变成元组**

```
print('x', 'y', sep='-', end='!')   ->  x('-',)y!     (CPython x-y!)
print('a', 'b', sep='',  end=';')   ->  a('',)b;      (CPython ab;)
```

`printargs` 先扫出 `sep`/`end` 两个关键字的位置，然后求分隔符的值用
`eval(lo = sep+2, hi = end-1)` —— 而 `end` **前一个 token 正是两个关键字之间的那个逗号**，
尾部逗号让表达式解析器构造了一元组 `('-',)`。只给一个关键字时区间结束在 `)`，所以一直没暴露。
修法：改到 `end-2`（Python 语法保证关键字实参之间只有一个逗号）。

**(b) `str.zfill()` 的符号位置**

```
'-42'.zfill(5)  ->  00-42      (CPython -0042)
'+42'.zfill(5)  ->  00+42      (CPython +0042)
```

`szfill` 是"不够长就在**最前面**补 0"。重写为：先摘出开头的 `+`/`-`，只把主体补到
`w - len(sign)`，最后把符号拼回去。`'42'.zfill(5)`、`'abc'.zfill(2)`、`center/ljust/rjust` 均不变。

**(c) `%.Ns` 的精度**

```
'%.2s' % 'abcdef'   ->  abcdef    (CPython ab)
```

`pctitem` 把精度解析进 `ppr`，但 `%s` 分支只做 `strval` 就结束了。现在转换之后按 `ppr` 截断
（对非字符串同样成立：`'%.2s' % 12345` → `12`）。

**(d) `sum()` / `abs()` 接受布尔**

```
sum([True, True])   ->  TypeError: sum() requires a list of numbers   (CPython 2)
abs(True)           ->  TypeError: numeric argument                   (CPython 1)
```

两处类型守卫写的是 `not (evtype == "N")`，把 `B` 也拒了。放宽成 `N 或 B`。
放宽后又冒出一个更隐蔽的：`abs()` 分支只写 `ev`，**没写 `evtype`**，于是 `abs(True)` 得到
数值 1 却仍带 `B` 标签，打印成 `True` —— 现在该分支显式 `evtype = "N"`（CPython 的 `abs()`
永远返回 int/float，不会返回 bool）。

## 2. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.136 | **v4.137** | CPython |
|---|---|---|---|
| `print('x','y',sep='-',end='!')` | `x('-',)y!` | **`x-y!`** | 同 |
| `print('a','b',sep='',end=';')` | `a('',)b;` | **`ab;`** | 同 |
| `print('x','y',sep='-')` / `print('p',end='')` | 对 | **仍对** | 同 |
| `'-42'.zfill(5)` / `'+42'.zfill(5)` | `00-42` / `00+42` | **`-0042` / `+0042`** | 同 |
| `'%.2s' % 'abcdef'` | `abcdef` | **`ab`** | 同 |
| `'%s|%r|%c' % ('a','b',65)` 等 | 对 | **仍对** | 同 |
| `sum([True, True])` / `sum([True, 1])` | TypeError | **`2`** | 同 |
| `abs(True)` / `abs(False)` | TypeError | **`1` / `0`** | 同 |
| `print(1 + True, True + True, True * 3)` | 对 | **仍对** | 同 |

转正用例：覆盖套件 **12 条**（cov1 2 / cov2 2 / cov5 2 / covX 4 / covC 2）
＋ 新套件 `_prt` 9/12→**12/12**、`_bool` 5/8→**8/8**、`_bool2` 4/6→**6/6**，**0 破坏**。

## 3. 顺带确认：`t = a[i]` 槽位别名早已修好

`_work/v41/v4131_覆盖测试报告.md` §1 的第 7 条（`t = a[0]` 槽位别名，冒泡排序全错）在本轮复核时
**已经不复现** —— 它是 P207/P208（v4.133）的连带修复。新建 `_swap.json` 作为回归护栏：

```
MiniPy_v4.131.sb3 :  9/17   （swap with temp -> [5, 5]；bubble sort -> [5, 5, 5, 5, 8]）
MiniPy_v4.136/137 : 17/17   （含 bubble sort / selection / reverse / 列表套列表 / 字典交换）
```

## 4. 回归证据

| 套件 | 结果 |
|---|---|
| cov1 +2 / cov2 +2 / cov5 +2 / covX +4 / covC +2（逐例 diff） | **0 broke** |
| cov3 / cov4 / cov8 | **逐例不变** |
| `_prt` 12/12 · `_bool` 8/8 · `_bool2` 6/6 · `_swap` 17/17 | 全绿 |
| `_floatarith` 34/35 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 · `_dictset` 30/30 · `_nest` 24/24 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（29,433 块） |
| 历史复现 | **v4.136 / v4.135 / v4.134 / v4.133 / v4.132 / v4.100 / v4.10 全 MATCH** |

## 5. 残留（下一批）

1. `'abc'.startswith(('z','a'))` / `endswith(元组)` 恒为 False —— `sprefix` 只按单个前缀比较，
   元组的 `len()` 是记录串长度。修法要在 `methodcall` 里加"遍历容器并短路"的分支（需要
   `control_stop this script` 早退），本轮没做。
2. **别名/引用语义**（值模型）：`a[:]`/`a.copy()` 在 CPython 是**浅**拷贝，MiniPy 的容器是扁平
   记录串因此等价于深拷贝（`a=[[1]]; b=a[:]; b[0].append(2)` 后 `a` 不变）；嵌套函数内的修改
   对返回值不可见也同源。
3. **浮点是十进制文本模型**：`round(2.55,1)` → `2.6`（CPython `2.5`）。
4. `repr` 对 `\v\f\a\b\0` 打裸字符、`\xhh`/`\ooo`、未知转义丢反斜杠。
5. 闭包/`nonlocal`、`lambda` 的多种写法、生成器耗尽与嵌套 yield、推导式 over dict、
   `__str__`/`__repr__` 分派、类属性共享、多继承 `isinstance`、切片赋值带步长。
   （以上都在 `_covC`/`_covX` 的失败清单里，逐条可查。）

## 6. 落地与验证

* 新部件 `_work/v41/p219.txt`（P219），插在 `p218.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：新增 `$p137 = 'P219'`、新增 `'v4.136' = "$p137"`，
  **127 个历史版本跳表全部前置 `$p137`**。
* `head.txt` 输出版本 → **v4.137**；产物 **`MiniPy_v4.137.sb3`**。
* 块数：Interpreter 27,156（+39）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **29,433**。
* 本轮踩到的两个"匹配器坑"（都已修正）：
  (1) 表达式里的变量通常是**内联描述符** `[12,name,id]` 而不是 `data_variable` 积木，
  遍历输入时必须同时认这两种形态；
  (2) `find` 的回调签名是 `(block, id)`，传 `block` 去查 `BL()` 会得到 `undefined`。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.137.sb3
node _work/v41/check41.cjs MiniPy_v4.137.sb3                      # 29,433 块 errors=0
node _work/v41/run.mjs MiniPy_v4.137.sb3 _work/v41/_prt.json     # 12/12
node _work/v41/run.mjs MiniPy_v4.137.sb3 _work/v41/_bool.json    # 8/8
node _work/v41/run.mjs MiniPy_v4.137.sb3 _work/v41/_swap.json    # 17/17
node _work/v41/run.mjs MiniPy_v4.137.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.136…v4.10 MATCH
```
