# 873 覆盖组差分记录（v4.244）

用 `_new*.txt`、`_cov*.txt` 原有 34 套、873 例，CPython 3.12.14 / Scratch VM 5.0.300，按文件名顺序在同一 VM 连续 RUN。v4.244 严格结果 **867/873**。

## 已关闭的长期项

`_cov205b.txt` 的 `templated game characters` 输出 `False 33\nFalse 19 20`，与 CPython 一致（本轮真实合并流和 14 例独立组均验证）。v4.237 历史归档曾报 `Line 19: SyntaxError: expression`。根据 v4.243 实测，该项已在此前版本解决。

## 剩余六项

本轮未改写历史输入或放宽 oracle。以下六项均可在 v4.243 复现，并非 P770–772 新引入；后续需要独立修复。

| 套/用例 | v4.244 实际差异 | 分类 |
|---|---|---|
| _new2_algo / heap sort | 第一组输出 `[4,7,1,8,2,6,3,5,9]`，CPython 为排序后的列表 | 真实语义 |
| _new5_func / higher order filter map chained | 第二个 print 的 max(genexp) 抛 ValueError empty iterable，预期 `22 6` | 真实语义 |
| _new7_probe / probe heap sort minimal | 第二组输出 `[4,7,1,8,9]`，预期 `[1,7,4,8,9]` | 真实语义 |
| _cov1 / zero division caught | 四条消息均为 division by zero，CPython 依照整数/浮点运算区分消息 | 诊断文本 |
| _cov7 / comprehension reusing a generator | NameError: name 'v' is not defined，预期 `[0, 1, 2] []` | 真实语义 |
| _covY / append in nested function | `[1] []`，预期 `[1] [1]` | 真实语义 |

不把真实语义失配列为通过，也不把它们悄悄标作可忽略边界。常规回归仍为此组返回非零，便于追踪。
