# MiniPy v4.193 更新说明

## 本次修复：`next()` 对生成器的迭代器状态（文档 #10）

**问题**：`next()` 对生成器**没有游标**——每次调用都从头取，取完也不抛 `StopIteration`。

**之前 / 现在**：

```python
def g():
    yield 1
    yield 2
it = g()
print(next(it), next(it))
# 之前: 1 1
# 现在: 1 2

it2 = g()
print(next(it2))
try:
    print(next(it2))
except StopIteration:
    print('stop')
# 之前: 1 / 1
# 现在: 1 / stop
```

## 根因

* `iter(x)` 的实现是：`ItSrc += x` ；`ItPos += 1` ；`ev = length(ItSrc)`（**数字** id）；`evtype = "Y"`。
  之后 `next` 用 `ItSrc[id]` / `ItPos[id]` 推进游标——**这套是有状态的**。
* 但**生成器的类型是 `"G"`**（其值本身编码了 yield 出的序列），`next` 的分派只认 `"Y"`
  ⇒ 落到 else 分支，把值当容器、**每次都取第 1 项**。
* `ItSrc` 是按**数字下标**索引的，而生成器的 id 是字符串 ⇒ 不能直接复用它。

## 实现

在 `next` 的分派里、原 `IFELSE(evtype == "Y")` **之前**插入 `evtype == "G"` 的一支，
并新增两张平行表 `GIt`（生成器值）/ `GId`（对应的迭代器 id）：

```
IF( evtype == "G" ):
    gix = item # of ev in GIt
    IF( gix == 0 ):                       # 首次见到这个生成器值
        ItSrc += ev ; ItPos += 1
        GIt += ev   ; GId += length(ItSrc)
        ev = length(ItSrc)
    ELSE:
        ev = GId[gix]                     # 同一个生成器值 → 复用同一个游标
    evtype = "Y" ; pending = 1
```

之后原有的 `"Y"` 分支照常推进游标 ⇒ 同一个生成器值始终对应同一个迭代器。

## 验证

| 项目 | 结果 |
|---|---|
| `check41.cjs` | 231 parts、**32,114 块**、**errors = 0** |
| 全套 79 个套件 | **全部 = v4.192 基线**（零回归） |
| `_g1`（生成器 12 例） | 5/7 → **7/5**（`next` 两次、耗尽抛 `StopIteration` 转正） |
| `_g2`（新增 2 例） | **2/2** |
| 旧版重建 | v4.192 用新跳过表重建 = **MATCH** |

## 仍未覆盖（生成器余项）

```python
def inner():
    yield 1
    yield 2
def outer():
    yield from inner()          # SyntaxError: expression

it = g(); list(it); list(it)     # [1] [1]（应为 [1] []）—— list()/for 那条通道还没共用游标
any(g())                         # 短路失效：先把生成器跑完
def outer():                     # 嵌套：内层 yield 泄漏（[1, 10] 应为 [10]）
    for v in inner(): yield v * 10
```