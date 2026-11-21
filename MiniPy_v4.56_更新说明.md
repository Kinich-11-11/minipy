# MiniPy v4.56 更新说明

本轮补上**自定义异常类**（`class MyErr(Exception)` + `raise MyErr('…')` + `except MyErr as e`），
补丁 **P129**。这是清单 §3 里点名的那条（featprobe 的「自定义异常类」与「raise 自定义异常」两例本轮翻绿）。

产物 `MiniPy_v4.56.sb3`：Interpreter 16,326 块，合计 **17,755**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；47 个历史版本全部可复现（v4.10…v4.56 MATCH）。

## 1. 为什么只差"类语句这一关"

`raise` / `except` 其实**一直是按名字工作**的：

* P51 的 raise 分支把 `raise` 后面那个 token 当类名，失败信息拼成 `"<名字>: <消息>"`；
* `trycatch` 用 `startswith(TryName)` 匹配 handler 帧，`''`（裸 `except`）与 `Exception` 是两个万能子句。

所以 `raise MyErr('boom')` 早就"能"抛、`except MyErr` 也早就"能"接——**卡住的只有类语句本身**：
P106 的父类检查要求父类已经在 `ClsName` 里，而 `Exception`/`ValueError` 这些内建异常名是
P16 注册的**类型 C 的值**、不在 `ClsName` 里，于是 `class MyErr(Exception):` 报
`NameError: name Exception`。把这一关放开（内建异常名不做 `ClsName` 检查，方法表本来也没有
`Exception.xxx` 条目可复制），名字这条线就整条通了。

## 2. 补丁清单（P129）

| 段 | 做法 |
|---|---|
| **(a) 父类放行** | 类语句的"父类必须是已知类"守卫加一条例外：`Exception`/`ValueError`/`TypeError`/`IndexError`/`KeyError`/`NameError`/`ZeroDivisionError`/`AttributeError`/`RuntimeError`/`AssertionError`/`StopIteration`/`ArithmeticError`/`OverflowError` 直接通过 |
| **(b) 子类 handler** | `except Base` 也要接住 `Sub`（CPython 按类层次匹配）。前缀测试失败后，从错误串里取**第一个冒号之前**的类名（`sfind` 给的是前缀长度），若是用户类就交给 P128 的 `isanc` 沿 `ClsPar` 爬父类链 |
| **(c) 类名当值** | `print(MyErr)` → `<class '__main__.MyErr'>`。`atom` 里内建异常名那条测试（P16）前面补一段大小写敏感的 `iscls` 判定（用 P127 的 `iscls`，所以要存/恢复 `ev`），命中就把类型标成 `C`；`strval` 的类型 C 分支对用户类加 `__main__.` 前缀 |
| **(d) 异常实例的 str** | `MyErr('z')` 打印成 `z`（CPython 的 `str(e)`）。构造路径里若该类是异常子类且**没有 `__init__`**，就把第一个实参存进隐藏属性 `__msg__`；`printargs` 在 `__str__` 分支后面接一层：实例带 `__msg__` 就打印它 |
| **(e) `raise MyErr()`** | 无参 raise 原来报 `SyntaxError: missing expression`（空实参区间交给 `eval`）。给消息求值加"有实参才求值"的守卫；**同时**要守住后面的 `if error == ''` 分支——否则 `ev` 还是上一条语句的残留值，消息会变成 `MyErr: 0` |
| **(f) 空消息绑定** | `except MyErr as e` 后 `e` 是 `0`：P112 用 `substr(tlast, cp+2, len)` 取消息，守卫只要求 `cp+1 ≤ len`，而 raise 拼出来的串是带尾空格的 `"<名字>: "`，冒号在倒数第二位，于是 `substr` 收到"起点 > 终点"，`ev` 残留成了 `0`。改成要求 `cp+2 ≤ len` |

新增变量：`p3nm p3k p3len p3v p3cls p3x p3k2 p3n2`（沿用 P128 的 `p2*`/`p3*` 前缀，避免与既有全局量撞名）。

## 3. 实测

| 套件 | v4.55 | **v4.56** |
|---|---|---|
| `d165.json`（本轮新写 5 条：自定义异常 / 被 Exception 接住 / 子类 handler / 属性与方法 / `print(类名)`） | 0/5 | **5/5** |
| `d166.json`（本轮新写 8 条：无参异常 / 消息含冒号 / 函数里抛 / 未捕获 / 实例与属性 / 多级继承 / 内建异常） | 0/8 | **8/8** |
| featprobe「raise 自定义异常」·「自定义异常类」 | 红 | **绿** |
| 6 个 featprobe（259 条） | 243/259 | **245/259** |
| 62 套快照（`demos`/`scope`/`d1`/`pan`/battery 23 套 + 全部 `t*`/`gaps*`） | — | **62 套逐例相同**，差异只有 3 处**噪声或变好**：`t111h`/`t113` 是 CPython 字符串集合哈希序（清单 §3 第 9 条注明的噪声）、featprobe3 是 `enumerate`/`zip` 打印内存地址 |
| `t133` 60/60 · `t139` 31/31 · `t123` 29/29 · `t141` 18/18 · `t143` 7/7 · `t144` 16/16 · `t134` 9/9 | 全绿 | **全绿** |
| `t115c.json` | 32/33 | **32/33**（只剩 S8 的 `split('\n')`，ASCII 显示限制） |
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6） |
| `check41.cjs` | 17,601 块 errors=0 | **17,755 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.55 共 46 版全 MATCH | **v4.10…v4.56 共 47 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
class MyErr(Exception):
    pass
try:
    raise MyErr('boom')
except MyErr as e:
    print('caught', e)          v4.55: NameError: name Exception   => caught boom

class Base(Exception): pass
class Sub(Base): pass
try:
    raise Sub('s')
except Base as e:               （父类 handler 接住子类）          => base s
    print('base', e)

class MyErr(Exception):
    code = 7
b = MyErr('z')
print(b)                        v4.55: <MyErr object>              => z
print(b.code, MyErr.code)                                          => 7 7
print(MyErr)                                                       => <class '__main__.MyErr'>
print(isinstance(b, MyErr))                                        => True

class MyErr(Exception): pass
try:
    raise MyErr()
except MyErr as e:
    print('y[{}]'.format(e))    v4.55: SyntaxError: missing expr / e == '0'  => y[]

# 仍与 CPython 有别（见 §5）
try:
    raise ValueError('v')
except ValueError as e: print('V', e)
except Exception as e: print('E', e)   # 多子句只匹配第一个子句（P51 的既有形状）
```

## 5. 已知边界（写进文档，留待后续）

| 项 | 现状 |
|---|---|
| 多个 `except` 子句 | 只按名字匹配**第一个**子句（P51 的既有形状，v4.56 未动） |
| `except (A, B) as e` | 元组形式的子句没验证过 |
| 内建异常类的构造 | `IndexError('x')` → `NameError: function IndexError`（只有**用户类**能构造） |
| `e.args` | 没有实现；消息存在隐藏属性 `__msg__` 里，`print(e)` / `'{}'.format(e)` 都对，`e.args` 取不到 |
| `ZeroDivisionError` 的消息 | 仍是裸的类名（CPython 是 `division by zero`），`print(e)` 会打出空串 |
| `isinstance(x, (int, str))` / `issubclass` | 仍缺 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.56.sb3
node _work/v41/run.mjs MiniPy_v4.56.sb3 _work/cmp47/d165.json  # 自定义异常 5 条
node _work/v41/run.mjs MiniPy_v4.56.sb3 _work/cmp47/d166.json  # 边界 8 条
node _work/v41/run.mjs MiniPy_v4.56.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps453_out.json
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.56.sb3 -tag v457 -ref v456
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.56.sb3 -tag v456
node _work/v41/check41.cjs MiniPy_v4.56.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.55 还原： $env:V41_SKIP='P129'; $env:V41_OUT='…/MiniPy_v4.55.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.57）候选，按清单顺序

1. `sorted(x, key=lambda …)`（featprobe3 唯一还没做的功能项）——需要"把一个**值**当函数调用"的管线
   （`calluser` 用 `UArgV`/`UArgT` 收实参：可以先求值再把这几个列表喂进去）
2. 多个 `except` 子句的依次匹配（P51 的既有形状；`except (A, B)` 一并）
3. `ZeroDivisionError` 等内建异常的消息文案（`division by zero` / `integer division or modulo by zero`）
4. `isinstance(x, (int, str))` 与 `issubclass`
5. 继承线边角：菱形继承 C3、子类 `__init__` 用局部变量给父类 `__init__` 传参
