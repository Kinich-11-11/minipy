# MiniPy v4.228 更新说明

本轮补齐复数能力：`1j` 字面量、复数 `+ - * /` 与一元负号，以及 cmath 12 个函数的
复数实现（含新增 `asinh/acosh/atanh`）。用户给出的代码里 `print(cmath.asin(z)` 少一个
右括号——那是代码本身的 SyntaxError，CPython 也一样；补上后即可运行。

## 一、总体变化

| 项目 | v4.227 | v4.228 |
|---|---|---|
| Interpreter 块数 | 43,495 | **43,926** |
| 总块数 | 45,950 | **46,381** |
| 主套件 `_new*` | 168/168 | **168/168** |
| 覆盖套件 `_cov*` | 705/705 | **705/705** |
| 补充套件 `_gap131` | 82/82 | **82/82** |
| 内置 demo 端到端 | 20/20 | **20/20** |
| 旧模块套件 `_mods_*` | 71/71 | **71/71** |
| 新 20 例套件 `_mods20_*` | 140/140 | **140/140** |
| 复数专项 `_mods_cplx` | — | **12/12** |
| `check41` | errors=0 | **errors=0** |

## 二、虚数字面量（P719）

CPython 把 `1j` 的 `j` 当数字后缀；MiniPy 之前把它拆成数字 1 + 标识符 j。

实现：tokenize 收尾的“相邻字符串合并”之后再跑一遍合并——`Kind N` 紧跟
`Kind I` 且其文本为 `j`/`J` 时，把前一个 token 的 Kind 标成 **`IM`** 并删除 j token；
atom 把 Kind `IM` 的数字文本转成 CPX `"0,<num>"`，`strval` 已有 CPX 分支，
于是 `print(1j)`/`print(2.5j)` 与 CPython 一致。

> **坑**：`Kind 'J'` 在 MiniPy 里早已是**大整数**（`bg*` 系列）的类型标签，
> 16 位以上整数会得到 Kind J。最初把虚数也用 `'J'`，导致
> `print(1000000000000000)` 输出 `1000000000000000j`。虚数标签最终定为 `IM`。

## 三、复数算术（P719）

在 `rightside` 求值右操作数之后、进入普通类型分支之前插入 CPX 分派：
`+ - * /` 任一操作数为 CPX 且两侧都是数值型（N/B/CPX）时，用 `cpsplit` 拆出
实部/虚部，按复数公式计算后用 `cpset` 写回 CPX 并结束该帧。一元负号类似。

```python
print(1 + 1j)                 # (1+1j)
print((1+2j)+(3-4j))          # (4-2j)
print((1+2j)/(3-4j))          # (-0.2+0.4j)
print(1j * 1j)                # (-1+0j)
```

> 生成条件时注意：构建器里的 `AND`/`OR` 是**二元**的，传三个参数会静默丢掉第三个。
> 本轮首版因此把所有数值 `+ - * /` 都算成了复数（`1+2` → `(3+0j)`），改为嵌套 `AND` 修复。

## 四、cmath 复数函数（P717）

新增内部过程（输入 `cpRe/cpIm`，输出 `cpre/cpim`）：

* `cpasinz` / `cpacosz` / `cpatanz`：经 `sqrt(1-z²)`、`log`、`i·z` 等组合；
* `cpsinhz` / `cpcoshz` / `cptanhz`：`sinh x cos y + i cosh x sin y` 等；
* `cpasinhz` / `cpacoshz` / `cpatanhz`：`ln(z+sqrt(z²+1))`、`ln(z+sqrt(z-1)sqrt(z+1))`、
  `½ln((1+z)/(1-z))`。

实数实参仍走原来的实数快路径（保持既有精确输出）；`asin/acos` 的实轴 |x|>1
按 CPython 主值分支给出 `π/2 + i·acosh(x)` / `-i·acosh(x)`；`atanh(±1)` 抛
`ValueError`。

同时修掉 `cpdiv` 虚部的符号错误（原为 `AI·BR + AR·BI`，应为 `AI·BR − AR·BI`），
它影响 `tanh`、`atanh` 和用户直接做复数除法。

**限制**：
* `**` 对复数仍未支持；
* 复用 Scratch 的 `sin/cos`（内部 `toFixed(10)`），复数结果通常与 CPython 相差
  10⁻¹⁰ 量级，测试用 6–10 位小数断言；`-1j` 打印 `-1j` 而 CPython 打 `(-0-1j)`（有符号零差异）。

## 五、验证

```bash
node _work/v41/run_iso.mjs MiniPy_v4.228.sb3 _work/v41/_mods_cplx.json _work/v41/_mods_cplx_out.json mcplx
# cases=12 pass=12 fail=0
```

专项覆盖：字面量、加减乘除/链式、12 个函数的幅值+相位（6 位小数）、实轴
`asinh/acosh/atanh`、`asin/acos(|x|>1)` 主值、`atanh(1)` 与复数除零错误。
