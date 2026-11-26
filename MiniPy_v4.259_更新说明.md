# MiniPy v4.259 更新说明

2026-11-25。根据反馈的 5 段示例程序，修复了 6 处解释器缺陷并补上 `collections.deque`。修复前这 5 段程序全部报错，v4.259 的输出与 CPython 3.12.16 逐字一致（其中 AST 示例在 CPython 中同样以 `AttributeError: 'NoneType' object has no attribute '_repr'` 结束，MiniPy 现在给出相同消息）。

## 主要修复

1. **链式赋值支持下标、属性和元组目标**：`is_prime[0] = is_prime[1] = False`、`self.a = self.b = v`、`a, b = c = [1, 2]`、`(a, b) = c = [1, 2]` 等。右侧只求值一次，各目标按从左到右顺序按普通赋值处理，属性赋值会触发 property setter。

```python
a = [1, 2]
a[0] = a[1] = 5          # v4.258: SyntaxError；v4.259: a 变为 [5, 5]
```

2. **大整数乘法与按位运算**：两个整数位数之和超过 15 位时乘法走十进制字符串精确算法；结果不超过 2^53 时归一回普通整数；`& | ^` 支持大整数（含负数的补码语义），常用的“大数 & 小掩码”走 53 位窗口快路径。

```python
state = (state * 1103515245 + 12345) & 0x7FFFFFFF   # 与 CPython 完全一致
```

3. **一元负号作用于方法调用结果**：`-self.unary()`、`-self.lexer.next()` 之前报 `TypeError: numeric operand`，现在正确对调用结果取负。
4. **属性调用失败的报错信息**：由“AttributeError: only lists have methods”改为 `'NoneType' object has no attribute '_repr'` 这类按接收者类型命名的消息（并补齐 `complex` / `function` / `method` / `generator`）。
5. **生成器表达式中的字符串字面量**：`" ".join("{:4d}".format(v) for v in row)` 之前重新分词后引号丢失而报 `SyntaxError: missing expression`，现在重新加引号后可正常使用。
6. **内置函数的星号参数**：`list(zip(*A))`、`zip(*A, *B)` 等；用户函数的 `*args` 保持原样。
7. **`collections.deque`**：支持 `deque(...)`、`append`、`appendleft`、`pop`、`popleft`、`extend`、`extendleft`、`rotate`、`clear`、`copy`、`remove`、`count`、`index`、`reverse`、`maxlen`，以及 `len`、`bool`、迭代、索引、`in`、`==` 和 `deque([1, 2])` 形式的 `repr`。

## 验证

| 测试 | 结果 |
|---|---:|
| 反馈的 5 段程序（逐字对比 CPython 3.12 输出） | **5/5**（v4.258 为 0/5） |
| 新增专项：链式赋值 / 大整数 / 星号参数 / 生成器表达式 / 一元负号 / deque | **33/33**（v4.258 为 6/33） |
| v4.258 的 `__name__` 专项 | **9/9** |
| 同一个 Scratch VM 连续两次独立 `RUN`，第二次确认重置 | **通过** |
| v4.257 的 586 项报告回归 | **586/586** |
| v4.253～v4.257 既有定向回归 | **284/284** |
| 历史归档 | **547/557**，10 项已知差异与 v4.258 相同 |

CPython 3.12.16 生成并核对全部新增预期。项目在 stock `scratch-vm` 5.0.300 的 `RUN` 广播入口执行；重复构建逐字节一致，积木结构零错误，旧作品资源与非解释器角色保持不变。产物 `MiniPy_v4.259.sb3` 为 2,392,760 字节，SHA-256 `a55047aa97db0caebd8a0136c251260e9e12f3e307ddf55d4df71490947c85db`，共 76,136 个积木；造型及非解释器角色保持不变。详细逐项记录见 [`_work/v41/v259/verification.json`](_work/v41/v259/verification.json)，复现步骤见 [`_work/v41/v259/README.md`](_work/v41/v259/README.md)。

已知边界：deque 尚无下标赋值与切片赋值；`type(q)` 显示内部类名；嵌套下标赋值（如迷宫程序的墙壁写入）解释器开销与 v4.258 相同，示例迷宫在 stock VM 中约需 100 秒完成。
