# MiniPy v4.259：链式赋值、大整数、生成器表达式与 `collections.deque`

从 GitHub `main` 的正式 v4.258 增量构建。基线提交 `8b848dc6a8fc041e1bb9842efc993ca87f2f0615`，SHA-256 `537e49cde6499ba2fb3b5d5035c50905adb8588b940bb4f6827a8c610b08fb33`；构建器会核对基线哈希，不匹配即停止。MiniPy 作品本身不需要 Node、Python 或修改过的 Scratch VM。

## 修复内容

根据反馈的 5 段程序逐项定位（v4.258 全部失败，0/5）：

1. **链式赋值遇到下标/属性目标**（`is_prime[0] = is_prime[1] = False`、`self.a = self.b = 1`、`a, b = c = [1, 2]`）。此前只支持纯名字链。现在右侧表达式只求值一次，存入临时变量 `@chain259:N`，然后每个目标按普通语句 `target = @chain259:N` 重新走一遍完整分派——下标、切片、属性、property setter、元组解包都保持原有语义；纯名字链仍由 `assignlist` 处理，不受影响。
2. **大整数乘法与按位运算**（迷宫程序的线性同余随机数）。两个整数位数之和超过 15 位时乘法改走十进制字符串的 `bgmul`，不再落入双精度；`+ - * // %` 的大数结果若不超过 2^53 会归一回普通整数（`type()` 为 `int`，可直接作下标）；`& | ^` 对大数按十进制字符串逐位计算，负数按 CPython 的补码语义处理。常用的“大数 & 小掩码”走 53 位窗口快路径，避免逐位长除。
3. **一元负号作用在方法/属性调用结果上**（`return -self.unary()`、`-self.lexer.next()`）。此前快速路径把 `-obj.m()` 先取到绑定方法再取负，报“TypeError: numeric operand”；现在前缀 `- + ~` 一律先求出完整操作数。
4. **对没有方法表的对象调用属性**（`self.right._repr(...)` 其中 `right` 为 `None`）。错误信息由“AttributeError: only lists have methods”改为按接收者类型命名（`'NoneType' object has no attribute '_repr'` 等）；`tname` 补齐了 `complex` / `function` / `method` / `generator`。
5. **生成器表达式体内含字符串字面量**（`" ".join("{:4d}".format(v) for v in row)`）。生成器源码是按 token 值重新拼接的，字符串 token 保存的是解码后的文本，重新分词后引号丢失（`"{:4d}"` 变成 `{ : 4 d }`）。现在拼接时对字符串 token 使用 `repr` 重新加引号（f-string 体同样处理）。
6. **内置函数的星号参数**（`zip(*A)` 转置矩阵）。惰性内置函数扫描器此前把 `*A` 直接交给表达式求值器，报“SyntaxError: missing expression”；现在按 CPython 语义把可迭代对象展开为多个实参。用户函数的 `*args` 一如此前。
7. **`collections.deque`**（迷宫程序 BFS 队列）。此前模块属性不存在。现在在首次使用时注册一段预置函数源码（局部类 + 工厂，与生成器同机制），`collections.deque(...)` 与 `from collections import deque` 都可使用；实现了 `append`、`appendleft`、`pop`、`popleft`、`extend`、`extendleft`、`rotate`、`clear`、`copy`、`remove`、`count`、`index`、`reverse`、`maxlen`，以及 `len`、`bool`、迭代（`__getitem__` 序列协议）、索引、`in`、`==`、`repr`（`deque([1, 2])`）。空队列 `popleft/pop` 抛 `IndexError`。

已知边界：deque 的 `__setitem__`/切片赋值未实现；`type(q)` 显示内部类名；`__setattr__` 语义仍是旧版缺口；嵌套下标赋值（`walls[r][c][w1] = False`）的解释器开销与 v4.258 相同，迷宫示例在 stock VM 中约需 100 秒。

## 构建与验证

从仓库根目录运行。验证环境：Node 22.19.0、stock `scratch-vm` 5.0.300、CPython 3.12.16。

```powershell
node _work/v41/v259/build.cjs
node _work/v41/check41.cjs MiniPy_v4.259.sb3

$env:MINIPY_PYTHON = 'C:\path\to\python.exe' # CPython 3.12
node _work/v41/v259/verify.cjs
```

`verify.cjs` 独立重建并逐字节比较作品，校验 ZIP 资源哈希/引用、积木结构、非解释器角色和造型；通过 `RUN` 广播在 stock Scratch VM 上执行全部测试。新增的 `make-suite.py` 用 CPython 冻结反馈程序的完整输出（含 `ast` 程序末尾的 `AttributeError`），`make-edges.py` 冻结 33 项新专项；两者均支持 `--check` 复核。`replay-cases.cjs` 是支持“正常输出 + 预期异常”对比的 RUN 回放器。

## 结果摘要

| 检查 | v4.258 | v4.259 |
|---|---:|---:|
| 反馈的 5 段程序（CPython 3.12 输出逐字一致） | 0/5 | **5/5** |
| 新增专项（链式赋值/大整数/星号参数/生成器表达式/一元负号/deque） | 6/33 | **33/33** |
| v4.258 的 `__name__` 专项 | 9/9 | **9/9** |
| 同一 VM 连续独立运行并验证重置 | 通过 | **通过** |
| v4.257 的报告全集（586 项） | 586/586 | **586/586** |
| v4.253～v4.257 既有定向回归 | 284/284 | **284/284** |
| 历史归档 | 547/557 | 547/557，失败项与前版相同 |

归档保留的 10 项旧差异为 `os` 导入 1 项、日期时间格式化 5 项和函数表示 4 项，不属于本次变更。`MiniPy_v4.259.sb3` 为 2,392,760 字节，SHA-256 `a55047aa97db0caebd8a0136c251260e9e12f3e307ddf55d4df71490947c85db`，共 76,136 个积木，结构错误为零。
