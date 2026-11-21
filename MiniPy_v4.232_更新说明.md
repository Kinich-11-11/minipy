# MiniPy v4.232 更新说明

本轮按 v4.231「下一轮建议」第 3 条，完成**一大类：异常对象组合**。
v4.231 及以前，异常只是"类名 + 拼接消息"的文本；本轮把异常值升级为
**结构化对象**：

* `e.args` 是一个真正的元组，构造、继承构造、`raise`、裸 `raise`、重抛都保留它；
* `str()` / `repr()` / `format()` / f-string 的默认渲染统一按 `args` 生成
  （`KeyError` 的单参特例如 CPython 用键的 `repr`）；
* `e.args = ...` 支持任意可迭代对象（dict 取键、生成器消费、字符串逐字符），
  非法值回滚并抛 `TypeError`；
* 实参是容器时，`e.args` 与源变量之间保持**双向可变链接**：
  `p.append(2)` 后 `e.args` 能看到 `[1, 2]`，`e.args[0].append(3)` 也会写回 `p`。

**构建**：`MiniPy_v4.232.sb3`（2026-11-19，总 **51,427** 块，Interpreter **48,972**，
vars **2,117**，lists **285**，`check41` **errors=0**）

## 一、结果总览

| 套件 | v4.231b | **v4.232** |
|---|---|---|
| 主套件+探针 `_new*`（168） | 168/168 | **168/168** |
| 覆盖套件 `_cov*`（705） | 705/705 | **705/705** |
| 跨模块回归 `_reg232`（593） | 581/593 | **582/593**（净修 1，0 回归；余 11 项历史失败） |
| 内置 demo 端到端（20） | 20/20 | **20/20** |
| **异常专项 `_exc232`（60）** | — | **60/60** |
| **异常边界 `_exc232_edges`（25）** | — | **25/25** |
| **异常验证 `_exc232_validation`（12）** | — | **9/12**（3 项为既有缺口，见第七节） |
| 冒烟 `_probe232`（10） | — | **10/10** |
| `check41` | errors=0 | **errors=0** |

## 二、行为对照

```python
# 多参 / 零参 / KeyError 特例
e = ValueError('a', 1)
print(e.args, str(e), repr(e))
# CPython/MiniPy: ('a', 1) ('a', 1) ValueError('a', 1)

k = KeyError('x')
print(k.args, str(k), repr(k))
# CPython/MiniPy: ('x',) 'x' KeyError('x')

# args 赋值：dict 取键、生成器消费、字符串逐字符
e = Exception('old'); e.args = {'x': 1, 'y': 2}
print(e.args)                       # ('x', 'y')
e.args = (i * 2 for i in range(3))
print(e.args)                       # (0, 2, 4)

# 非法值：回滚 + TypeError
e = ValueError('old', 2)
try:
    e.args = 7
except TypeError:
    print('bad args')               # bad args
print(e.args)                       # ('old', 2)

# 可变链接（双向）
p = [1]
e = Exception(p)
p.append(2)
print(e.args, e.args[0] is p)      # ([1, 2],) True
e.args[0].append(3)
print(p)                            # [1, 2, 3]

# 裸 raise 恢复最深活动异常
try:
    try:
        raise KeyError('k')
    except KeyError as e:
        try:
            raise ValueError('v')
        except ValueError:
            raise
except Exception as exc:
    print(type(exc).__name__)       # ValueError
```

## 三、实现（P724–P726）

### P724 结构化实参

* **构造路径**：`callfn` / `callfnW` 的异常构造分支与 `callcls` 的
  `Exception.__init__` 分支，把括号内实参打包为元组值写入实例的 `args`
  属性（仍然放在 IAttr 堆里）；支持 `*iterable` 展开（元组/列表/集合直接展开，
  字符串逐字符，其余 `TypeError: argument after * must be an iterable`）。
  实参只求值一次，`narg`/`iid` 通过 VStack 保存恢复。
* **默认渲染**：新增 `ex232render`。`str` 规则：0 参 → `''`；1 参 →
  元素 `str`（若该类是 `KeyError` 子类，则用元素 `repr`，即 CPython 的
  `KeyError('x')` → `"'x'"`）；多参 → 元组 `str`。`repr` 规则：统一
  `类名(...)`。挂在 `strval`/`reprval` 的 `evtype == 'O'` 入口，只接管
  BaseException 子类且确实带 `args` 的实例，用户自定义 `__str__`/`__repr__`
  仍然优先。
* **raise 重写**：`raise <expr>` 先求值；若结果是异常实例，保留对象身份并记入
  ErrV；若是异常类，则零参构造；非 `BaseException` 子类 →
  `TypeError: exceptions must derive from BaseException`；无活动异常时裸
  `raise` → `RuntimeError: No active exception to reraise`。
* 修复 InstCls 注册顺序造成的构造实例 id 错位：新增 `ExCtorId` 栈。
* `Exception` 的父类改为 `BaseException`，`callfn` 的祖先检查同步。
* `print` 的 `__msg__` 快捷分支停用，统一走 args 渲染（含自定义 `__str__`）。

### P725 异常生命周期与 `args` 赋值

* **统一入口**：`fail %s` 只在实际设置 `error` 时记录文本，并按
  `Class: message` **合成异常对象**（`args=(message,)`，message 为空则 `()`），
  同时保存/恢复 `ev/evtype/evK`。任何旧代码路径抛出的错误因此都有 `e.args`
  与可裸 raise 的实例。
* **活动异常栈**：`ExActiveId/Start/End/Depth/Msg` 在处理器激活时压栈，
  `except ... as e` 的每条绑定都绑定**同一个**实例；裸 `raise` 取最深活动
  异常；离开处理器后按 `pc` 区间清理，外层裸 raise 能恢复外层异常。
* **`e.args = X` 归一化**（11 处 args 属性写入点统一走 `ex25normalize`）：
  dict → 键元组；生成器 → `gconv` 消费为元组；list/set → 元组；str → 逐字符；
  其它不可迭代 → 从 `ExArgsSaved` 回滚旧值并抛
  `TypeError: exception args must be an iterable`；元组保持元素（浅拷贝）。
* **format 路由**：内建 `format(e)` 与字符串 `format` 方法/`f"{e:spec}"`
  接到现有格式化管线；`eval` 对未知函数名的最后兜底 fail 改为
  `Tok == 'format'` 分支。
* **KeyError 原始键**：11 个旧错误站点直接使用键的原始值构造
  `KeyError: <str(键)>`，不再二次加引号，同时保留结构化实例。
* 补注册 `SyntaxError` 异常类并加入 `ExcNames`。

### P726 可变参数链接

* 构造时扫描实参，记录"**实参容器变量 ↔ args 槽位**"（`ExRefHost/Slot/Name`，
  连同 P54 名字别名）与嵌套容器链接（`ExNestHost/Slot/Name`）。
* **正向**：`assign` 末尾的 `exrefsync` 发现源容器内容变化 → 重建 args 元组、
  更新 `IAttrVal`，并用 `p8mut + presync` 驱动既有别名同步。
* **反向**：`e.args[0] = v` / `e.args[0].append(...)` 等对 attributes 的写入
  （`p8mut == 1`）→ `exrefreverse` 回写源变量并 `publish`。
* `e.args = (p, ...)` 会为新的源变量重建链接；重新绑定源变量会断开链接
  （沿用 P173 的 rebinding 钩子）。

## 四、新增测试套件

* `_exc232.json`（生成器 `mkexc232.mjs`，**60 例**）：3 种异常 × 8 种实参形态、
  `args` 下标/切片/解包/`*` 调用、函数传参与返回、容器内异常、`str/repr/format/
  %`/join、类/实例 raise、裸 raise 嵌套恢复、自定义异常多级继承与显式
  `__init__`、args 重设与增广赋值。
* `_exc232_edges.json`（**25 例**）：KeyError 的 dict/list/set 原始键、
  `format` 缺字段、多个 `as` 绑定、三层裸 raise、无 `as` 的裸 raise、
  处理器结束后 RuntimeError、`BaseException` 直接构造、非空 spec 的 TypeError、
  构造实参副作用只发生一次、`*` 构造、别名可变参数、重绑定源变量。
* `_exc232_validation.json`（**12 例**）：语义近似度更高的组合验证
  （非法 args 回滚、dict/生成器 args、元组快照、自定义 `__str__/__repr__`、
  `format` 精度、嵌套异常载荷等）。
* `_probe232.json`（**10 例**）：日常冒烟。

## 五、验证

```bash
# 异常专项
node _work/v41/run_iso.mjs MiniPy_v4.232.sb3 _work/v41/_exc232.json          ...  # 60/60
node _work/v41/run_iso.mjs MiniPy_v4.232.sb3 _work/v41/_exc232_edges.json    ...  # 25/25
node _work/v41/run_iso.mjs MiniPy_v4.232.sb3 _work/v41/_exc232_validation.json ... # 9/12（3 项既有缺口）
node _work/v41/run_iso.mjs MiniPy_v4.232.sb3 _work/v41/_probe232.json        ...  # 10/10

# 全量回归
node _work/v41/runall.mjs MiniPy_v4.232.sb3 _work/v41/_regall232 _work/v41/_new*.txt _work/v41/_cov*.txt
# TOTAL total=873 pass=873 fail=0

node _work/v41/run_iso.mjs MiniPy_v4.232.sb3 _work/v41/_reg232.json _work/v41/_reg232.out.json reg232
# cases=593 pass=582 fail=11（基线 581/593；逐例比对：修好 exception_args，0 回归）

node _work/v41/_demo_e2e3.mjs MiniPy_v4.232.sb3      # ALL 20 OK
node _work/v41/check41.cjs MiniPy_v4.232.sb3          # errors=0
```

`_exc232_validation.json` 余下 3 例与本次改动无关，且在 **v4.231b 上同样失败**
（已逐例复跑确认），归入第七节。

## 六、实现记录 / 踩坑

1. **自定义 `__str__` 导致死循环**：最初把"异常 args 渲染"挂到 `methodcall`
   的 `__str__/__repr__` 分支，异常对象再调用自定义 `__str__` 时形成递归，
   VM 卡死约 20 秒。改为在 `strval/reprval` 的入口只接管"默认渲染"路径，
   自定义方法走原有 `methodcall`，问题消失。
2. **normalize 误伤普通对象**：`ex25normalize` 起初对所有 `evtype == 'O'`
   的属性写生效，用户类 `__str__` 返回值的处理也被当成 args 归一化。
   加 `isanc(BaseException)` 门控后只处理异常实例。
3. **构造 id 错位**：P542 在注册 `InstCls` **之前**就把 `len(InstCls)` 压栈，
   带 `ExCtorId` 后取到的是"注册前的长度"。改为专门维护 `ExCtorId` 栈。
4. **两次"假回归"**：`_real3_exc:re_sub_catch` 与向量 `__eq__/__sub__` 曾在
   中间构建上失败，最终构建逐例重跑均通过；四个 re 用例在 4.231b 与 v4.232
   上输出完全一致（含 `re.compile` 不校验这一既有缺口）。
5. **`f'{e}'` 之外的 f-string 转换**：`{e}` 使用 `format(e, '')`，走新管线；
   `!s`/`!r` 是 f-string 自身的转换标志，与异常无关（见第七节）。

## 七、已知限制（更新）

以下 4 项均为**既有缺口**，已在 v4.231b 上复跑确认，不是本轮回归：

* **f-string `!s` / `!r` 转换标志不起作用**：普通对象的 `{a!s}`/`{a!r}` 都打印
  默认 `repr`；自定义异常的 `{e!s}` 得到 args 的默认渲染、`{e!r}` 得到默认异常
  `repr`（自定义 `__str__`/`__repr__` 不生效）。`format(a, '')` 与 `str(a)`/`repr(a)`
  本身正常，4.231b 相同；因此 `custom_exception_str_repr` 中 `!s/!r` 两段
  与 CPython 不同。
* **`type(实例).__name__` 不可用**：一律报
  `AttributeError: 'object' object has no attribute '__name__'`
  （类本身的 `ValueError.__name__` 正常）。
* **浮点定点格式的舍入方式**：MiniPy 用半上舍入，CPython 用就近半偶（银行家舍入）：
  `f'{3.25:.1f}'` 得 `3.3`（CPython `3.2`），`f'{2.675:.2f}'` 得 `2.68`
  （CPython `2.67`）。4.231b 的 f-string 同样如此；本轮新增的 `format()` 继承该行为。
* **`re.compile` 不校验非法模式**：`re.compile('(')` 不抛异常；
  `re.sub('(', ...)` 会抛且可被 `except Exception` 捕获（与 4.231b 一致）。

本轮**未实现**（下一轮候选）：

* 异常链：`raise X from Y`、`__cause__` / `__context__` / `__suppress_context__` /
  `__traceback__`（`raise ... from` 目前是 `SyntaxError: expression`）。
* `ExceptionGroup` / `except*`。

## 八、下一轮建议

1. **异常链**：`raise X from Y` + `__cause__`/`__context__`/`__suppress_context__`，
   并在 `repr`/traceback 中体现 "直接原因/上下文"。
2. **f-string 转换标志**：`!s`/`!r`/`!a` 三个后缀（影响所有对象，不只是异常），
   顺带修好 `custom_exception_str_repr` 一类组合。
3. **两个既有小缺口**：`type(x).__name__` 对实例、`.1f` 舍入。
4. **异常组**：`ExceptionGroup` / `except*`（建议单独一轮，改动面较大）。
