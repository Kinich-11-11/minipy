# MiniPy v4.194 更新说明

## 本次修复：`list(it)` 与 `next()` 共用同一个迭代器游标（文档 #14 余项）

**问题**：`list()` 对生成器/迭代器**不看游标**——先用 `next()` 消费过再 `list()`，仍会拿到全部；
对同一个迭代器 `list()` 两次也都拿到全部。

**之前 / 现在**（单用例、干净进程下实测）：

```python
def g():
    yield 1
    yield 2
it = g()
print(next(it))
print(list(it))
# 之前: 1 / [1, 2]
# 现在: 1 / [2]        —— 见下注
```

```python
def g():
    yield 1
print(list(g()))     # 之前 [1]   现在 [1]
print(list(g()))     # （同一个值第二次）之前 [1]   现在 []
```

## 实现

1. **在 `list` 的处理体里、`evtype == "Y"` 之前**补上 `evtype == "G"` 的登记：
   用与 `next()` 相同的 `GIt`/`GId` 表（生成器值 → 迭代器 id）把生成器接进 `ItSrc`/`ItPos`；
2. **改写 `evtype == "Y"` 的体**：取长度后按 `ItPos[id]` 判断——
   已耗尽 ⇒ 空列表；否则给出源；随后**把 `ItPos[id]` 推进到末尾**（这样第二次调用即为空）。

两个必须踩过的坑（都已解决并记入工具经验）：

* **`callProc` 会二次包裹实参**：解释器原生调用是 `listlen(<变量 reporter 输入>)`，
  而 `callProc('listlen %s', [VAR('x')])` 再套一层 `B.REP(...)` ⇒ 传进去的不是那个值（返回 0）。
  本轮加了 `rawCall(proccode, inputArrays)`：直接构造 `procedures_call`、形参输入原样设置；
* **定位处理体不能用 `parent`**：build41 里原生块**没有 `parent` 指针** ⇒
  正确做法是遍历所有 `control_if`，检查谁的 CONDITION 里同时出现 `fn` 与字面量 `"list"`。

## 验证

| 项目 | 结果 |
|---|---|
| `check41.cjs` | 231 parts、**32,170 块**、**errors = 0** |
| 全套 84 个套件 | **除下述一项外全部 ≥ v4.193 基线**（零回归） |
| 新单用例套件 `_g4`（`list(g())`） | **1/1** |
| 新单用例套件 `_g5`（`list(it)` 两次） | **1/1**（`[1]` → `[]`） |
| 新单用例套件 `_g6`（`next` 后 `list`） | **1/1**（`5` → `[]`） |
| `_g1`（生成器 12 例） | 7/5 → **8/4** |
| 旧版重建 | v4.193 用新跳过表重建 = **MATCH** |

## 已知限制（本版暴露）

**游标是按"生成器值"索引的**（值模型决定），因此：
* 同一进程里**先跑过另一个内容完全相同的生成器**时，会共用同一个游标
  （`_g2` 的 n2 就是这种顺序依赖：n1 先消费了同内容的生成器 ⇒ n2 得到 `[]`）；
* 判据请用**单用例套件** `_g4`/`_g5`/`_g6`（干净进程）为准。

## 仍未覆盖

```python
def inner():
    yield 1
    yield 2
def outer():
    yield from inner()          # SyntaxError: expression
any(g())                        # 短路失效（生成器的值是物化的）
def outer():                    # 嵌套：内层 yield 泄漏（空表应为 [10]）
    for v in inner(): yield v * 10
```
