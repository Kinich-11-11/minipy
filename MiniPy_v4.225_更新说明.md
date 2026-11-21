# MiniPy v4.225 更新说明

本轮把 `_mods20_*` 七套新用例暴露的 **10 处模块语义缺陷**全部修复；
外加修复过程中发现的 re 字符类/范围大小写问题。全部对照 CPython 3.14。

## 一、总体变化

| 项目 | v4.224 | v4.225 |
|---|---|---|
| Interpreter 块数 | 43,308 | **43,411** |
| 总块数 | 45,763 | **45,866** |
| 主套件 `_new*` | 168/168 | **168/168** |
| 覆盖套件 `_cov*` | 705/705 | **705/705** |
| 补充套件 `_gap131` | 82/82 | **82/82** |
| 内置 demo 端到端 | 20/20 | **20/20** |
| 旧模块套件 `_mods_*` | 71/71 | **71/71** |
| 新 20 例套件 `_mods20_*` | 127/140 | **140/140** |
| raw string 专项 | 12/12 | **12/12** |
| `check41` | errors=0 | **errors=0** |

## 二、math（P23）

* **三角参数单位**：`math.sin/cos/tan` 之前把弧度直接喂给 Scratch 的三角块（收角度）。
  新增 `DEG(x) = x * 180/π`，三个函数先换算再调用。
* **`log10`**：之前与 `log` 共用 `ln` 分支。改为先把 `x` 规格化成 `m * 10^e`
  （`1 ≤ m ≤ 10`），再算 `e + ln(m)/ln(10)`；`log10(1000)` 得到精确 `3.0`，
  不再出现 `2.9999999999999996`。
* **`log` 域检查**：`log(0)` / `log(负数)` 现在抛 `ValueError: math domain error`，
  不再打印 `-Infinity.0`。
* **`fmod` 符号**：Scratch 的 `MOD` 是 floored，C 的 `fmod` 是 truncated。
  当余数非零且与 `a` 异号时改为 `r - b`，于是 `fmod(-7,3) = -1.0`、`fmod(7,-3) = 1.0`。

## 三、cmath（P717）

* **`log10`**：`cplog` 的结果写在 `cpre/cpim`（经 `cpset`），原实现却乘 `cpRe/cpIm`
  （仍是入参实部），导致 `log10(100)=43.429448`。改为乘 `cpre/cpim`。
* **`tan` 恒 NaN**：tan 分支从 `cpRe/cpIm` 取 `cpsin/cpcos` 结果，但 `cpset` 只写
  `cpre/cpim`，读到陈旧 0 → 0/0。改为从 `cpre/cpim` 取。

## 四、time / datetime（P714 / P715）

* **`%j` 年内序号（两模块共用 `zcfmt`）**：原实现用三月基准的 `zcDoy` 直接加日，
  2020-03-05 给 `005`、2026-11-08 给 `253`。改为新列表 `ZtCum`
  （各月前的累计天数）+ 日 + 闰年 2 月后补 1，得到正确的 `065` / `312`。
* **`datetime.isoformat()`**：DTT 值内部用空格分隔，CPython 输出用 `T`。
  现在把前 10 位 + `T` + 后 8 位重组。
* **`timedelta` 微秒进位**：原实现 `zdMic = MOD(zdMic, 1e6)` 丢掉了商，
  `timedelta(1, 90061, 1234567)` 的 seconds 少 1。改为先 `floor(µs/1e6)` 把商加进
  seconds，再用余数；负微秒也正确（`-1µs` → `days=-1, seconds=86399, micros=999999`）。

## 五、re（P716）

* **默认大小写敏感**：Scratch 的 `=` 与 `contains` 都不分大小写。
  * 字面量比较 `rxeqch` 的非 `re.I` 分支改用 `compareText`；
  * `\d \D \w \W \s \S` 与字符类成员判定改用新过程 `rxinch`（逐字符 `compareText`）；
  * 字符范围 `[a-c]` 的展开 `rxrange` 之前用 Scratch `< / >`（同样忽略大小写，
    会把 `A-C` 也收进来），改用 `compareText` 做大小比较。
* **`findall` 的 flags**：之前只求值 2 个参数、`rxFlags` 恒 0。现在接受第 3 个参数。
* **`re.I` 位测试**：`re.I` 的值是 2，原代码用 `MOD(flags,2)==1`（判奇偶）永远不命中；
  改为 `(flags // 2) % 2 == 1`。

## 六、测试调整

`_mods20_math.json` 的三角用例改为 10 位小数的相等断言——Scratch 的 `sin/cos/tan`
本身会 `toFixed(10)`，逐位比较没有意义；修复前（角度当弧度）这些断言仍会失败，
修复后通过。`_mods20_re.json` 的字符类用例补了大小写输入（`[a-c]` 对 `ABC`、
`[A-C]` 对 `abc` 均应为空）。

## 七、验证

```bash
node _work/v41/check41.cjs MiniPy_v4.225.sb3                                   # errors=0
node _work/v41/runall.mjs MiniPy_v4.225.sb3 _work/v41/_res225new _work/v41/_new*.txt     # 168/168
node _work/v41/runall.mjs MiniPy_v4.225.sb3 _work/v41/_res225cov _work/v41/_cov*.txt     # 705/705
node _work/v41/run_iso.mjs MiniPy_v4.225.sb3 _work/v41/_gap131.json _work/v41/_gap131_225.out.json g225  # 82/82
node _work/v41/_demo_e2e3.mjs MiniPy_v4.225.sb3                               # ALL 20 OK
node _work/v41/run_iso.mjs MiniPy_v4.225.sb3 _work/v41/_mods20_math.json ...  # 7 套 140/140
```
