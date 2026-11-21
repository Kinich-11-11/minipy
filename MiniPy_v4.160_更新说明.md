# MiniPy v4.160 更新说明：补齐缺失的内建异常类（P271）

## 0. 一句话

以前 `raise UnboundLocalError('x')`、`except ImportError`、`except OSError`、`except MemoryError` 等都会
`NameError: name 'X' is not defined`（内建异常名表 `ExcNames` 只有 13 个名字）；现在这些类都能用：

```python
try:
    raise UnboundLocalError('x')
except UnboundLocalError as e:
    print('caught ule')          # 现在正常
```

解释器积木数不变（28,710）——本次只往两张表里加名字，所以产物大小与 v4.159 相同（30,987 块），
但**行为**不同（列表内容属于运行时数据，不在积木计数里）。

## 1. 病根与修法

* 内建异常名表在 **`ExcNames`**（P140 建立），只有
  `Exception / ValueError / TypeError / IndexError / KeyError / NameError / ZeroDivisionError /`
  `AttributeError / RuntimeError / AssertionError / StopIteration / ArithmeticError / OverflowError` 共 13 个；
* 名字查找时找不到就抛 `NameError: name 'UnboundLocalError' is not defined`；
* 本补丁把 15 个常见但缺失的名字补进 **`ExcNames`** 与 **`ClsName`**（后者原本是空的，所以共追加 30 项，
  已存在的自动跳过、不产生重复）：

```
UnboundLocalError  ImportError  ModuleNotFoundError  IndentationError  TabError
LookupError  EOFError  MemoryError  NotImplementedError  FileNotFoundError
OSError  UnicodeError  RecursionError  StopAsyncIteration  FloatingPointError
```

（`ClsName` 是类名表，`p106`/`p127` 用它做父类匹配与 `isinstance`；两张表都补上，
既能让 `raise X` 找到名字，也能让 `except X` / `except Exception` 正确匹配。）

## 2. 回归证据

| 套件 | v4.159 | **v4.160** |
|---|---|---|
| 新探针 `_ch`（5 条候选：recursion 捕获 / UnboundLocalError / max kwargs / max key / pow(2)） | 1/5 | **2/5**（UnboundLocalError 已修） |
| `_uh` 1/1 · `_covX` 58/63 · `_catch2` 7/7 · `_catch3` 8/8 · `_orig` 4/4 | 同 | 不变 |
| `_catch1` | 无此文件 | — |
| `_broad` 30/33 · `_paren2` 15/15 · func 31/31 · `_dictset` 30/30 · `_map` 8/8 · `_upd` 12/12 | 同 | 不变 |
| `_doc2` 10/10 · `_cr` 17/17 · `_strip` 20/20 · `_cov5` 30/47 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（30,987 块） |
| 历史复现 | — | **v4.160 … v4.156 全 MATCH** |

## 3. 同一轮里排掉的一个"系统性怀疑"

我扫了**所有** `fail` 站点的消息字面量，检查是否存在"缺异常类前缀"（那样 `except` 会抓不到）：
结果只有 1 条可疑，而且它本来就带 `IndentationError: ` 前缀（只是不在我的类名白名单里）。
即：**除了 P270 修掉的那处，异常消息都带 `<Class>: ` 前缀**，没有第二处系统性问题。

## 4. 下一步（已探测，按性价比排序）

| 候选 | 现状 | 说明 |
|---|---|---|
| `max/min` 的 `default=` | `SyntaxError: expression` | `key=` 已经能用（P130 那套），只差 `default=` |
| `pow(x)` 单参数 | `NameError` | 应报 `TypeError: pow() missing required argument 'exp' (pos 2)`（P142 `zeroarg` 表里已有该文案） |
| `RecursionError` 捕获 | 抛出但抓不到 | 递归爆栈时解释器自身状态已坏，风险较高，暂缓 |
| 内建类型名做值（`f = int`） | `NameError: name 'int'` | `type(x)` 能给 `<class 'int'>`，但裸 `int` 不是名字 |

## 5. 落地与验证

* 新部件 `_work/v41/p271.txt`（P271），插在 `p270.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p160 = 'P271'`、`'v4.159' = "$p160"`，149 个旧版本条目全部前置 `$p160`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.160**；产物 **`MiniPy_v4.160.sb3`**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.160.sb3
node _work/v41/check41.cjs MiniPy_v4.160.sb3                      # 30,987 块 errors=0
node _work/v41/run.mjs MiniPy_v4.160.sb3 _work/v41/_ch.json     # 2/5
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.160…v4.10 MATCH
```
