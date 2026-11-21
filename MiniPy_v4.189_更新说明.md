# MiniPy v4.189 更新说明

## 本次修复：`__eq__` 运算符重载（文档 #12 的一部分）

**问题**：类里定义了 `__eq__`，但 `==` 比较**静默返回 `False`**（文档中最该优先修的一类：静默错）。

**之前 / 现在**：

```python
class W:
    def __init__(self, x): self.x = x
    def __eq__(self, o): return self.x == o.x

print(W(1) == W(1))
# 之前: False     ← 静默错
# 现在: True
```

## 根因与实现

`==` 的求值确实经过 **`rightside %s %s %s %s %s`**（形参 `leftval, lefttype, op, lo, hi`）——
探针实测：`print(W(1) == W(1))` 打出 `R op=[==] lt=O lv=[1]`（左操作数是对象）。
（而 `1 == 1` → `lt=N`、`'a' == 'a'` → `lt=S`，这两条本来就对。）

修法：在该过程的**末尾**追加一段（**不 stop**，用"末尾覆盖"）：

```
IF( lefttype == "O" ):
    IF( op == "==" AND FnName 含 "<类>.__eq__" ):
        callmeth(leftval, "__eq__", lo, hi)     ← 方法返回值写入 ev/evtype，覆盖前面算出的布尔值
```

`lo/hi` 正是**右操作数**的 token 区间，所以 `callmeth` 会照常求值出 `other` 传给 `__eq__`。
没有打断它原有的比较流程（因此在中间插入或不放在末尾都会失效或出错）。

## 验证

| 项目 | 结果 |
|---|---|
| `check41.cjs` | 231 parts、**32,007 块**、**errors = 0** |
| 全套 58 个回归套件 | **全部 ≥ v4.188 基线**（零回归） |
| `_r11`（`==` 对象/整数/字符串，3 例） | 新增，**3/3** |
| `_o1`（运算符重载等 8 例） | 3/3 → **4/3**（`__eq__` 一例转正） |
| `_oo`（30 例） | 24/6 → **25/5**（`eq dunder` 转正） |
| 旧版重建 | v4.188 用新跳过表重建 = **MATCH** |

## 本次未覆盖

```python
class V:
    def __add__(self, o): return V(self.x + o.x)
print((V(1) + V(2)).x)      # 仍报错（已能进入 __add__ 方法体，但返回值/后续链接不对）

class U:
    def __lt__(self, o): return self.x < o.x
print(sorted([U(3), U(1)])[0].x)   # 仍报 TypeError: '<' not supported
```

* `+` / `<` 会在 `rightside` **内部更早的"操作数类型检查"**处直接抛 `TypeError`；
  入口级拦截后 `__add__` 已能进入方法体，但返回值未能正确接回调用处；
* `sorted` 的比较走的是另一条通道（排序比较器），需要单独处理。
