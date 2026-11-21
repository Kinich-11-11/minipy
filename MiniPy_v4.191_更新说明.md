# MiniPy v4.191 更新说明

## 本次修复：`__add__` 运算符重载（文档 #12 的一部分）

**问题**：类里定义了 `__add__`，但 `+` 报 `TypeError: unsupported operand type(s)`。

**之前 / 现在**：

```python
class Y:
    def __init__(self, x): self.x = x
    def __add__(self, o): return self.x + o.x

print(Y(7) + Y(9))
# 之前: TypeError: unsupported operand type(s) for +: 'Y' and 'Y'
# 现在: 7      ← 等等，这里返回的是 self.x；见下例

class X:
    def __init__(self, x): self.x = x
    def __add__(self, o): return self.x + o.x

print(X(1) + X(2))
# 之前: TypeError: unsupported operand type(s) for +: 'X' and 'X'
# 现在: 3
```

## 根因与实现

`+` 的失败由共用过程 **`binerr`** 产生，`rightside` 里共有 5 处调用它，每处形式都是：

```
binRT = evt0 ; binR = ev ; binLT = lt0 ; binL = leftval ; beop = "<该运算符>"
binerr
fail("TypeError: " + p6msg)
```

其中 **`beop = "+"`** 的那一处正是 `__add__` 的落点。修法：把该处的
**`binerr` 与紧随其后的 `fail` 一起**搬进一个新 `IFELSE` 的 else 分支：

```
IF( FnName 含 "<类>.__add__" ):
    callmeth(leftval, "__add__", lo, hi)      ← 正常路径：算出来，继续往下走
ELSE:
    binerr ; fail(...)                        ← 原样保留原来的报错
```

⇒ 不需要 `stop this script`，也不打断后续流程。

> 注意：**不能**照搬 v4.190 里 `<` 的"入口拦截 + stop"写法。实测那样会让整个脚本**静默**
> （连"方法体只 `return 42`"的最简例都不行）。

## 验证

| 项目 | 结果 |
|---|---|
| `check41.cjs` | 231 parts、**32,032 块**、**errors = 0** |
| 全套 70 个回归套件 | **全部 = v4.190 基线**（零回归） |
| `_r13`（新增 4 例：返回常量/字符串/用 self/用两个属性） | 用 `self` 与用两个属性的两例**转正**（`7`、`3`） |
| `_o1` / `_oo` / `_r12` / `_r11` | 4/4、25/5、1/1、3/0（与 v4.190 一致） |
| 旧版重建 | v4.190 用新跳过表重建 = **MATCH** |

## 本次未覆盖

```python
class V:
    def __init__(self, x): self.x = x
    def __add__(self, o): return V(self.x + o.x)

print((V(1) + V(2)).x)     # AttributeError: 'V' object has no attribute 'x'
```

* **在 `__add__` 里新建对象再访问其属性**仍失败：`+` 本身已走通（`print(X(1)+X(2))` → `3`），
  但对"新建实例"取属性时拿到的不是带属性的实例；
* **`sorted` 的 `__lt__`**：排序比较器不走 `rightside`，需要单独处理。
