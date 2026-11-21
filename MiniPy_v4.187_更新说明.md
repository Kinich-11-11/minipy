# MiniPy v4.187 更新说明

## 本次修复：对象显示回退到 `__repr__`

**问题**：只定义了 `__repr__`（没有 `__str__`）的对象，打印时显示成 `<类名 object>`；
CPython 的 `str(obj)` 在这种情况下应**回退到 `__repr__`**。

**之前 / 现在**：

```python
class Thing:
    def __init__(self, n): self.n = n
    def __repr__(self): return 'Thing!' + str(self.n)

print(Thing(3))
# 之前: <Thing object>
# 现在: Thing!3
```

**不受影响**：定义 `__str__` 的对象仍优先使用 `__str__`：

```python
class Other:
    def __str__(self): return 'S' + str(self.n)
    def __repr__(self): return 'R' + str(self.n)

print(Other(1))   # S1（与之前一致）
```

## 实现方式

改动位于 `printargs` 里原有的 `__str__` 分派处，**不触碰显示函数 `strval`**：

* 该分派的条件为 `evtype == "O" AND FnName 含 "<类>.__str__"`；本次**只把第二项**
  换成 `OR("<类>.__str__", "<类>.__repr__")`（第一项 `evtype == "O"` 原样保留）；
* 分支改为：**有 `__str__` 就走 `__str__`，否则走 `__repr__`**；
* 两者都没有的对象，行为不变（仍为 `<类名 object>`）。

## 验证

| 项目 | 结果 |
|---|---|
| `check41.cjs` | 231 parts、31,985 块、**errors = 0** |
| 73 个回归套件 | **全部与 v4.186 基线一致**（零回归） |
| 新增套件 `_r10`（顶层对象打印 2 例） | 1/2 → **2/2** |
| 哨兵套件 `_prt`/`_strip`/`_cr`/`_fstring`/`_oo`/`func`/`_covX` | 12/20/17/17/24/31/58，与基线一致 |
| 旧版重建 | v4.186 用新跳过表重建 = **MATCH** |

## 仍未覆盖（留待后续）

```python
print({'k': Thing(3)})   # 仍为 {'k': <Thing object>}，应为 {'k': Thing!3}
```

字典**值**的格式化走的是另一条路径（经 `strval`），需要在 `printargs` 里负责字典元素的那一处
再做一次同样的处理。注意：不要在显示函数 `strval` 内部触发方法调用 —— 会让所有打印静默。
