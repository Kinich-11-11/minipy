# MiniPy v4.25 更新说明

本轮补上缺口清单里的 **A12 字典字面量**（`gaps` 34/39 → **35/39**）：`d = {…}` 能建、能按键取值，
键/值支持字符串、整数、带空格的键，取出的值可以继续参与比较与条件判断。

产物 `MiniPy_v4.25.sb3`：Interpreter 8,193 → **8,511** 块，合计 **9,846**，`check41` errors=0。

## 0. 效果

| 用例集 | v4.24 | **v4.25** |
|---|---|---|
| 缺口清单 `gaps`（39 条） | 34/39 | **35/39**（A12 关闭）|
| 字典 `dict`（10 条） | 0/10 | **7/10** |
| 嵌套 `nested2` / `nested` | 10/10 · 8/8 | 10/10 · 8/8 |
| 元组 `tuple` / 推导 `comp` | 20/20 · 10/10 | 20/20 · 10/10 |
| 回归 `regress` / 函数 `func` / 字符串 `str` | 15/15 · 31/31 · 12/12 | 15/15 · 31/31 · 12/12 |
| 其余套件 | — | 无回退 |

## 1. 字典补丁 P33 是早写好的，启用时暴露两个问题

`_work/v41/p33.txt` 在 A13 之前就写好了（新增 `dictlit` / `dictpair` 两个过程、一张 `DOut` 暂存表，
并改 `indexget` 支持按键查找）。当时被 A13 挡着没启用；A13 修好后本轮启用，发现：

1. **分派会掉进兜底分支**：字典检查插在 `eval` 的列表字面量分支之前，但调用完 `dictlit` 后没有 `stop this script`，
   于是继续走完整条分派链，最后落到兜底的 `SyntaxError: expression`。补上 `STOPTHIS()` 后正常。
2. **字典过程不可重入**：`dictpair` / `dictlit` 用共享表 `DOut` 和全局变量 `dgi/dglo/dged`，
   与 A13 的 `listlit` 是同一类毛病（键/值里再出现字典就会互相覆盖）。新增 **P48** 保护：
   `dictpair` 的两次 `eval` 前后存/恢复 `DOut`；`dictlit` 的两次 `dictpair` 调用前后存/恢复 `dgi/dglo/dged`。

### P48 的一个反直觉坑（值得记住）

第一版把 `DOut` 的存/恢复也加在 **`dictlit` 调用 `dictpair` 的前后** —— 这等于把 `dictpair` 刚追加进去的
键值对又原样撤回，于是**所有字典都是空的**：`d = {"a": 1}` 之后 `Values` 里存的是空串、`d["a"]` 一律 `KeyError`
（探针看到 `Types=["D"]`、`Values=[""]`）。正确做法是：`DOut` 的保护只放在 `dictpair` **内部两次求值**的前后，
而 `dictlit` 侧只保护自己的循环变量。

## 2. 仍未通过 / 已知限制

* `print({"k": 7}["k"])`（**字面量直接接下标**）失败：与 `[[1, 2], [3, 4]][0][1]` 属同一个分派限制。
* 值里带**顶层运算符**的字典失败：`d = {"a": 1 + 2}`、`d = {"a": n + 1}`、`d = {"a": -1}` 都报 `SyntaxError: expression`，
  而 `d = {"a": (1 + 2)}` 正常——说明括号深度记账在某个扫描里仍然不认识 `{`/`}`，
  把一个 `+`/`-` 当成了顶层运算符，于是把 `{...}` 切成两半。
  本轮为此写了 **P50**（把 27+27 处括号深度扫描都补上 `{`/`}` 判断），
  **结果既没修好这个症状，还让 `tuple` 20→8、`str` 12→10、`b2` 13→11 回退**，因此已从构建撤下
  （补丁保留在 `_work/v41/p50.txt` 备查；下一轮应从"值求值区间的调用方"而不是"扫描器"入手）。
* `dict` 第 9 条（取不存在的键）失败属测试台边界：CPython 抛异常时 stdout 为空，MiniPy 会把 `KeyError: z` 打到输出台。
* 缺口清单剩余 4 条：A4 类、A5 `try/except`、A8 生成器、B5 别名语义。

## 3. 复现

```
node _work/v41/assemble.cjs        # head.txt + p13..p33 + p34 + p38 + p46..p49 + tail.txt -> build41.js
node _work/v41/build41.js         # -> MiniPy_v4.25.sb3（同时写 _work/v41/project.json）
node _work/v41/check41.cjs MiniPy_v4.25.sb3
node _work/v41/run.mjs MiniPy_v4.25.sb3 _work/v41/dict.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.25.sb3 -out _work/v41/battery_v425_final.txt
pwsh -NoProfile -File _work/v41/rebuild-old.ps1     # 重建 v4.10..v4.24 并与出货件逐字节比对
```
