# MiniPy v4.200 更新说明

## 本轮目标

按《已知问题清单_v4.199.md》的"下一步建议 ①"执行：**例外实例模型**（清单 #1，约 8 例 + 补充 3 例）。

结果：**581 全套 63 → 55 失败；补充 82 例 18 → 15 失败；逐例对照修复 11 例、回归 0 例、新增失败 0 例。**

## 一、修好了什么

| 用例 | 之前 | 现在 |
|---|---|---|
| `covC exception instance identity` | `<class 'ZeroDivisionError'> False` | `… True` |
| `covZ exception instance type` | `<class 'ValueError'> False` | `… True` |
| `covY type equality with class` | `False`（`type(e) == E`） | `True` |
| `cov6 type of instance and name` | `False True True` | `True True True` |
| `cov6 custom exception with attributes` | `AttributeError: code` | `7 bad 7:bad` |
| `cov6 exception str and repr` | `NameError: ValueError` | `msg ValueError('msg')` / ` <class 'ValueError'>` |
| `cov6 exception hierarchy catching base` | `KeyError: k`（没被 `except LookupError` 抓住） | `lookup 'k'` |
| `covZ custom exception with init attrs` | `AttributeError: code` | `7` |

补充套件修好 3 例：`LookupError name exists`、`custom exception init attr`、`except as e is exception object`。

顺带修好（同源、清单未单列）：

- `type(ValueError)` / `type(v)` 与类名 `==`、`is` 一致；`type(x).__name__` 不受影响
- 内建异常可以直接构造：`ValueError('msg')`、`Exception()`
- `print(repr(ValueError('msg')))` → `ValueError('msg')`
- `str(Exception())` → `''`（CPython 的异常实例无参数时就是空串）
- `raise KeyError('k')` 的消息为 `KeyError: 'k'`，`print(e)` → `'k'`（KeyError 的 `__str__` 就是 args 的 repr）

```python
class AppError(Exception):
    def __init__(self, code, msg):
        self.code = code
        self.msg = msg
    def __str__(self):
        return str(self.code) + ':' + self.msg

try:
    raise AppError(7, 'bad')
except AppError as e:
    print(e.code, e.msg, e)          # 7 bad 7:bad
    print(type(e) == AppError)       # True

print(str(Exception()))              # （空行）
print(repr(ValueError('msg')))       # ValueError('msg')
try:
    raise KeyError('k')
except LookupError as e:             # 内建异常层次
    print('lookup', e)               # lookup 'k'
```

## 二、五个根因

### 1）内建异常名不在 `ClsName` 里，构造根本进不去

`callfn` 的构造分支判据是"这个名字在类表里"，而 `ClsName` 在运行起点被 `clear` 掉，
P271 只把 15 个"补漏"的异常名写进了**构建期**数据。于是 `ValueError('msg')` 走不到构造，
报 `NameError: name 'ValueError' is not defined`。

**P491(1)**：在运行起点（`clear(ClsPar)` 之后）按继承树成对 append 到 `ClsName`/`ClsPar`：
`KeyError → LookupError → Exception`、`UnboundLocalError → NameError` 等 29 个名字。

### 2）`ClsMro` 是按 `ClsName` 的下标读的 —— 注册后错位

`clsmro` 的实现是"在 `ClsName` 里找到名字的位置 i，返回 `ClsMro[i]`"。`ClsMro` 只随用户类
append，多出 29 个内建名字后整体错位，`super()` 链断掉（`diamond with super chain`
回归成 `L4>M1>B4`）。**补齐 29 行 `ClsMro`**（条目取类名本身，等价于旧版"查不到就回退成
类名"）。

### 3）类名判断用的是 Scratch 的 `contains`（子串！）

`callfn`/`callfnW` 里写作 `ClsName 的内容 包含 fn`。以前 `ClsName` 是空的，这个子串判断
永远为假，从未暴露；一注册就出事：

- `FloatingPointError` 里含 **`int`**
- `OverflowError … ValueError` 这一段里含 **`len`**

于是 `len('ab')` / `type(1)` / `int('7')` / `float('1.5')` 被当成**类构造**，
返回 `<len object>`、`<type object>`… 这是本轮最隐蔽的一个坑。

**P491(1b)**：两处 `contains` 换成 `list contains item`（`Cast.compare` 的精确比较）。

### 4）`raise X(...)` 从来没调用过构造函数

`raise` 分支取 `tnm = Tok[2]`，只对**参数区** `eval(4, count-1)` 求值来拼消息 —— 构造函数
一次都没执行。所以 `a = AppError(7); a.code` 正常，但 `raise AppError(7)` 之后 `e.code`
永远 `AttributeError`（`e` 是 trycatch 回退路径现造的、只有 `__msg__` 的实例）。

**P491(6)**：`tnm` 是类名时改成对整个调用表达式 `eval(2, count)`（`Tok[count]` 是右括号），
与 `a = X(args)` 走同一条路（`__init__`、`__msg__`、`__str__` 全部生效）；求值后暂存
`ev/evtype`，因为接下来 `fail %s` 会清空 `ErrV/ErrT`，再把实例写回去。

### 5）`type(实例)` 与类值不是同一种表示

`type(n)` 原来给字符串 `"<class '__main__.Named'>"`，而类名当值是类型 `C` + 裸名
（P16/P129）。`==` 在类型不同时直接判不等，所以 `type(n) == Named` 永远是 `False`。

**P491(2)**：`type(实例)` 直接返回**类值本身**（`C` + `InstCls[ev]`）。打印仍由 `strval`
的 C 分支给出 `<class '__main__.Named'>`；`type(x).__name__` 也正好回到裸名。
连带把 `strval` 的 `__main__.` 判定加上 `ExcNames` 排除（`iscls` 现在对内建异常也为真）。

### 附带的显示层修正

- **P491(3)** `strval`：没有 `__msg__` 的异常实例打印空串（`str(Exception())` == `''`）；
- **P491(4)** `reprval`：异常实例打印 `Cls(参数repr)`（`ValueError('msg')`），空串参数按无参数处理；
- **P491(5)** 构造 `KeyError` 时 `__msg__` 先过一遍 `reprval`，复现 CPython 的 `str(KeyError('k'))` == `"'k'"`；
  多参数异常（`Exception('e','f')`）的 `__msg__` 是元组编码，先过 `strval` 再存，否则打印会漏出 `\u001f` 编码。

## 三、实现清单

| 补丁 | 文件 | 内容 |
|---|---|---|
| P491 | `_work/v41/p491.txt` | 内建异常注册 + 继承树 + MRO 补齐、类名精确匹配、`type(实例)` 返回类值、`raise X(...)` 构造函数、异常实例的 str/repr/KeyError 消息 |

`assemble.cjs` 的 parts 链末尾加入 `p491.txt`；`head.txt` 的默认产物/时间戳改为 v4.200。

## 四、验证

| 项目 | v4.199 | **v4.200** |
|---|---|---|
| 581 全套失败 | 63 | **55** |
| 补充 82 例失败 | 18 | **15**（`pow one arg` 2 例仍是测试缺 try/except） |
| 真实失败合计 | ≈79 | **≈68** |
| 逐例对照（581） | — | **修复 8 例、回归 0 例、新增失败 0 例** |
| 逐例对照（82） | — | **修复 3 例、回归 0 例** |
| `check41.cjs` | 32,950 块 | **33,129 块、errors = 0** |
| `validate_web.cjs` | 悬空 0 | **悬空 0、shadow 误标 0** |

中途抓到并修掉的 2 例回归：`diamond with super chain`（`ClsMro` 错位）与
`raise with class and instance`（多参数消息漏出元组编码），都已归零。

## 五、复现命令

```bash
cd D:/编程/scratch/ai/minipython

# 重新生成（默认输出 MiniPy_v4.200.sb3）
node _work/v41/assemble.cjs && node _work/v41/build41.js

# 结构 / 网页兼容体检
node _work/v41/check41.cjs MiniPy_v4.200.sb3
node _work/v41/validate_web.cjs MiniPy_v4.200.sb3

# 全套 581 例
node _work/v41/runall.mjs MiniPy_v4.200.sb3 _work/v41/_res200 \
  _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt

# 补充 82 例
node _work/v41/run_iso.mjs MiniPy_v4.200.sb3 _work/v41/_gap131.json _work/v41/_gap131_200.out.json g200

# 逐例对照（需要先有 v4.199 的结果目录）
node _work/v41/cmp131.cjs _work/v41/_res200 _work/v41/_res199v
node _work/v41/gdiff.cjs _work/v41/_gap131_200.out.json _work/v41/_gap131_199.out.json
```

> 注意：`_res199`（旧目录）是 v4.198 代的产物（70 失败），不能当 v4.199 基线；
> 本轮重新跑了一份 v4.199 到 `_res199v`（63 失败，与清单一致）用于对照。

## 六、下一步建议

1. **闭包返回 / `nonlocal`**（清单 #2，约 6 例）：`closure returned and called`、
   `nonlocal keyword`、`closure counter attempt without nonlocal` —— P14 帧模型的扩展，
   目前返回的内层函数拿不到外层局部变量，`nonlocal` 直接是 `SyntaxError`。
2. **生成器对象标识**（清单 #3，约 6 例）：值仍是编码串，两个内容相同的生成器共用一个游标；
   `genexp` 也是立即求值的列表。
3. **运算符重载 `__lt__`**（清单 #4，约 4 例）：`sorted(自定义对象)` 仍报
   `'<' not supported between instances of 'P' and 'P'`，`__len__`/`__getitem__` 也有缺。
4. 清单 #8 的实例 `repr`（`<X object>` 缺 `__main__.` 与地址）是纯显示问题，
   可以单独一轮做掉。

### 已知遗留 / 非真问题

- 补充用例 `type e equals E`：`class E: pass` 之后 `raise E('m')` 在 CPython 是
  `TypeError: exceptions must derive from BaseException`；MiniPy 宽容地构造了实例并输出
  `True`。这是用例本身不合法，不计入真实失败。
- `UnboundLocalError name exists`：MiniPy 抛的是基类 `NameError`，而用例要的是子类 ——
  根因是"局部变量未赋值时报错了错误的异常类"，属异常**产生**侧，不属实例模型。
