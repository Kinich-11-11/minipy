# MiniPy v4.192 更新说明

## 本次修复：类构造调用的实参里访问 `self.属性`

**问题**：在方法/dunder 里用 `self.属性` 作为**类构造的实参**时会报
`AttributeError: 'X' object has no attribute '…'`——因为类构造在**绑定 `self` 到新实例之后**
才去求值实参，于是 `self.x` 落在"还没有属性"的新实例上。

**之前 / 现在**：

```python
class P:
    def __init__(self, x): self.x = x
    def mk(self): return P(self.x)
print(P(5).mk().x)
# 之前: AttributeError: 'P' object has no attribute 'x'
# 现在: 5
```

```python
class B:
    def __init__(self, x): self.x = x
    def __add__(self, o): return B(self.x + o.x)
print((B(1) + B(2)).x)
# 之前: AttributeError: 'B' object has no attribute 'x'
# 现在: 3
```

（这也正是文档 #12 里 `__add__` 最后一个未通过形状的根因。）

## 实现

1. **`calluser` 增加"值槽"**：在它构造完实参表 `UArgV`/`UArgT`、即将绑定形参之前，
   若 `vmOn == 1`，则把第一个实参**替换/追加**为预先算好的 `vmA`/`vmT`（用 `assign` 同源的通道）；
2. **`callfn` 在 `self = iid` 之前**先算那一个实参：
   `IF( iid ≠ "" 且 narg == 0 且 lo ≤ hi )` → `eval(lo, hi)` → `vmA/vmT`，置 `vmOn = 1`；
   （`iid ≠ ""` 用来**只框住类构造**，普通函数调用不受影响；`narg` 是顶层逗号个数 ⇒ 恰好一个实参）
3. 该分支里的 `calluser(cfull, lo, hi)` 包成
   `IFELSE(vmOn == 1, [calluser(cfull, 1, 0)], [calluser(cfull, lo, hi)])`
   —— 武装时用**空区间**，让被调者直接用值槽里的实参。

要点：实参在**旧的 `self`** 下求值（值槽把结果带过去），因此 `__init__` 仍拿到正确的参数；
多实参、无实参的调用完全不变。

## 验证

| 项目 | 结果 |
|---|---|
| `check41.cjs` | 231 parts、**32,080 块**、**errors = 0** |
| 全套 78 个套件 | **零回归**；其中 `_oo` 25/5 → **26/4**、`_o1` 4/4 → **5/3**、`_p7` 1/5 → **2/4** |
| 新增 `_r18`（缺陷边界 5 例） | **5/5** |
| 新增 `_r17`（根因 4 例） | **4/4** |
| 新增 `_r16`（同类/异类/常量/self/标量 5 例） | **5/5** |
| `_r12`（`__add__`/`__lt__`） | **2/2** |
| 旧版重建 | v4.191 用新跳过表重建 = **MATCH** |

## 仍未覆盖

```python
print(sorted([U(3), U(1)])[0].x)   # 仍 TypeError: '<' not supported（排序比较器走另一条通道）
```