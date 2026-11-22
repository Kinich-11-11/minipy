# 873 覆盖组差分记录（v4.245）

测试环境：CPython 3.12.14 / Scratch VM 5.0.300；`_new*.txt` 与 `_cov*.txt` 原 34 套，使用 `runrepair.mjs --shared` 按原脚本顺序合并执行，不修改旧用例，不放宽 oracle。

| 版本 | 通过 | 失败 |
|---|---:|---:|
| v4.244 | 867/873 | 6 |
| v4.245 | **873/873** | **0** |

原六项全部闭合：

| 用例 | 本轮结果 |
|---|---|
| `heap sort` | `[1, 2, 3, 4, 5, 6, 7, 8, 9] [1] []` |
| `probe heap sort minimal` | `[1, 2, 3]`；`[1, 7, 4, 8, 9]`（保留原用例算法输入及 oracle） |
| `higher order filter map chained` | `['APPLE', 'BANANA', 'KIWI', 'PLUM']`；`22 6` |
| `comprehension reusing a generator` | `[0, 1, 2] []` |
| `append in nested function` | `[1] [1]` |
| `zero division caught` | 普通除法、整除、取模、浮点除法四条消息均与 CPython 一致 |

增量候选曾在 `_cov205a / bubble sort and insertion sort` 失败：浅复制执行多目标下标交换时，原数据被错误排序。最终 P775 保留浅复制的弱关系并补齐多目标下标写入解绑，完整覆盖组再次运行后该项也通过；原始列表 `[5, 2, 9, 1, 7, 3]` 保持不变。

本记录的 873/873 只表示此覆盖集、该版本及 Scratch VM 环境的实测结果，不表示所有 Python 行为已实现；另有 `_reg232` 三个历史声明差异。
