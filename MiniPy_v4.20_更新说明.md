# MiniPy v4.20 更新说明

本轮补上 **`any()` / `all()`**（A24 收尾）。产物 `MiniPy_v4.20.sb3`
（Interpreter 7,797 → 7,862 块，共 9,197 块）。

## 0. 效果

| 用例集 | v4.18 | v4.19 | **v4.20** |
|---|---|---|---|
| 缺口清单（39 条） | 30/39 | 31/39 | **32/39** |
| 内建 `b2.json`（13 条，本轮新增） | — | 0/13 | **13/13** |
| 单行复合 `one.json` | 0/10 | 10/10 | 10/10 |
| 单行边界 `one2.json` | — | 12/12 | 12/12 |
| math `math.json` | 7/10 | 7/10 | 7/10（余 3 条为判据边界，见 v4.18 说明） |
| 其余专项（函数/字符串/链/f-string/%/位运算/推导式/布尔/浮点/元组/回归） | 全绿 | 全绿 | **全绿** |
| 结构体检 | 0 err | 0 err | **0 err** |

## 1. any() / all()

```python
print(any([0, 1]))        # True
print(any([0, 0]))        # False
print(any([]))            # False
print(all([1, 1]))        # True
print(all([1, 0]))        # False
print(all([]))            # True
print(any((0, 3)))        # True（元组同样支持）
print(any(''), all('ab')) # False True（字符串按"非空即真"）
x = [0, 0, 5]
if any(x): print('yes')   # yes（可以直接当条件）
```

实现：新过程 `anyall fn vv vt`

* 列表/元组：`listlen` + `listitem` 逐个取元素，用现成的 `truth %s %s` 判真值，
  `any` 遇真、`all` 遇假即提前结束；
* 字符串：`any` 等价"长度 > 0"，`all` 恒为真（非空字符都是真值）；
* 其它类型报 `TypeError: 'X' object is not iterable`；
* 结果类型是 `B`（布尔），因此打印成 `True`/`False`。

挂接点在 `callfn` 名字分派链的末尾（"不可调用"报错之前）。

## 2. 本轮踩坑

* **`callfn` 的 `lo`/`hi` 是实参区间，不是"函数名 + 括号"区间**：`callfn` 开头已经
  `eval(lo, hi)` 把实参求值进 `ev`/`evtype`，所以新内建直接用 `ev` 即可。
  我最初按 `eval(lo+2, hi-1)` 重算（那是 `eval` 里的坐标约定），结果把一个越界区间送进解析器，
  报出莫名其妙的 `SyntaxError: expression`。
* **argument reporter 参与 `operator_or` 组合时行为不可靠**：`if (vt == 'L') or (vt == 'T')` 这种
  "参数变量 + 或" 的写法在本项目里没有按预期为真（单独比较是对的，打印出来也是 `L`，
  但组合后走了 else 分支）。改成读全局 `evtype` 分派后立刻正常。
  **结论：新过程里做类型分派一律用全局 `evtype`，参数只用于取值。**

## 3. 仍然缺的（下一轮候选）

| 行 | 内容 | 计划 |
|---|---|---|
| A13 | 嵌套容器字面量 / 嵌套打印串层 | 改成"长度前缀 + 负载"的自描述编码，是字典的前置 |
| A21 | 括号续行 `x = (1 +\n     2)` | 复用 P30 的源码级前置过程，加一个 `joinlines` |
| A12 | 字典字面量 | 依赖 A13 的编码 |
| A4/A5/A8 | 类 / try-except / 生成器 | 体量较大，排在后面 |
| B5 | 列表别名语义（`b = a` 后改 `b` 影响 `a`） | 需要引用语义，影响面大 |
