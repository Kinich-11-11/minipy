# MiniPy v4.195 更新说明

## 本次新增：`yield from`（文档 #14 的 g6）

**问题**：`yield from X` 报 `SyntaxError: expression`。

**之前 / 现在**：

```python
def inner():
    yield 1
    yield 2
def outer():
    yield from inner()
print(list(outer()))
# 之前: SyntaxError: expression
# 现在: [1, 2]
```

```python
def outer():
    yield from [1, 2, 3]
print(list(outer()))
# 之前: SyntaxError: expression
# 现在: [1, 2, 3]
```

## 实现

`execute` 里 `IF(head == "yield")` 的分支负责把每项追加到 `GYield`
（每项编码为 `join[join[lsep, evtype], ev]`）。本版在该分支内加一段前置判断：

```
IF( Tok[2] == "from" ):
     eval(3, count)                     # 求值 `from` 之后的表达式
     IF( evtype != "G" ):               # 生成器调用的项**已经**进了 GYield ⇒ 不能重复追加
         lnv = ev ; n = listlen(lnv) ; k = 1
         repeat until k > n:
             listitem(lnv, k)           # 逐项解码出 ev / evtype
             addTo(GYield, join[join[lsep, evtype], ev])
             k += 1
```

同时把**原有的 `yield` 处理**（`IFELSE(count>1)` 与随后的 `IF(error=="")`）用
`IF(NOT(Tok[2] == "from"))` 包住，避免它再把这个语句当成普通表达式求值。

要点：
* `listlen`/`listitem` 用**直接构造 `procedures_call`** 的方式调用
  （`callProc` 会二次包裹实参，传值会错——见 v4.194 的经验）；
* **生成器调用**（`yield from inner()`）的项在调用过程中已经进了全局 `GYield`，
  必须跳过逐项追加，否则会得到 `[1, 2, 1, 2]`。

## 验证

| 项目 | 结果 |
|---|---|
| `check41.cjs` | 231 parts、**32,192 块**、**errors = 0** |
| 全套 86 个套件 | **全部 = v4.194 基线**（零回归） |
| 新单用例套件 `_g7`（`yield from inner()`） | **1/1** |
| 新单用例套件 `_g8`（`yield from [1,2,3]`） | **1/1** |
| 既有生成器套件 `_g4`/`_g5`/`_g6`/`_g1` | 均保持 |
| 旧版重建 | v4.194 用新跳过表重建 = **MATCH** |

## 生成器余项

```python
def inner():
    yield 1
def outer():
    for v in inner(): yield v * 10     # 嵌套：内层 yield 泄漏（需 GYield 帧栈）
any(g())                               # 短路失效（生成器的值是物化的 ⇒ 建议已知限制）
```
