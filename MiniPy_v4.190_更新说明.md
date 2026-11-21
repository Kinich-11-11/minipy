# MiniPy v4.190 更新说明

## 本次修复：`__lt__` 运算符重载（文档 #12 的一部分）

**问题**：类里定义了 `__lt__`，但 `<` 比较报 `TypeError: '<' not supported between instances`。

**之前 / 现在**：

```python
class U:
    def __init__(self, x): self.x = x
    def __lt__(self, o): return self.x < o.x

print(U(1) < U(2))
# 之前: TypeError: '<' not supported between instances of 'U' and 'U'
# 现在: True
```

## 根因与实现

`==` 之后，`<`/`+` 这类运算会在 **`rightside %s %s %s %s %s`**（形参 `leftval, lefttype, op, lo, hi`）
**内部更早的"操作数类型检查"处**直接抛 `TypeError`，所以必须在**入口**拦下：

```
IF( lefttype == "O" ):
    IF( op == "<" AND FnName 含 "<类>.__lt__" ):
        callmeth(leftval, "__lt__", lo, hi)     ← lo/hi 是右操作数的区间
        stop this script
```

与 v4.189 的 `__eq__`（末尾覆盖、不需要 stop）不同，`<` 必须提前拦截，因此这里需要 `stop`。

## 验证

| 项目 | 结果 |
|---|---|
| `check41.cjs` | 231 parts、**32,023 块**、**errors = 0** |
| 全套 70 个回归套件 | **全部 = v4.189 基线**（零回归） |
| `_r12`（新增 2 例：`__add__` / `__lt__`） | `__lt__` 一例转正（`U(1) < U(2)` → `True`） |
| `_o1` / `_oo` / `_r11` | 4/4、25/5、3/0（与 v4.189 一致） |
| 旧版重建 | v4.189 用新跳过表重建 = **MATCH** |

## 本次未覆盖

```python
class V:
    def __add__(self, o): return V(self.x + o.x)
print((V(1) + V(2)).x)      # 仍 TypeError: unsupported operand

class U:
    def __lt__(self, o): return self.x < o.x
print(sorted([U(3), U(1)])[0].x)   # 仍 TypeError: '<' not supported（排序比较器走另一条通道）
```

* **`__add__`**：报错由共用过程 **`binerr`** 产生（`rightside` 有 5 处调用它）。在那里派发 dunder
  需要"用**值**传参调方法"，而现有工具只有 `callmeth/callmethW`（都吃 **token 区间**）⇒
  只能在有 `lo/hi` 的 `rightside` 里，把相应 `binerr` 调用点改为
  `IFELSE(有 dunder, [callmeth(leftval,"__add__",lo,hi)], [binerr])`。
  注意：**不能**照搬 `<` 的入口拦截 + `stop` —— 实测那样会让整个脚本静默（连"方法体只 return 常量"都不行）。
* **`sorted` 的 `__lt__`**：排序比较器不走 `rightside`，需要单独处理。
