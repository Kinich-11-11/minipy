# MiniPy v4.49 更新说明

本轮清掉清单第 7 条 **浮点 repr**（顺带修好科学计数法字面量的解析）。两件事分开做：
**P121** 修字面量的**数值**（`Math.pow` 在负指数上不准 + `numbercheck` 不认科学计数），
**P122** 修**排版**（新增 `floatfmt`，按 CPython 的规则在定点/科学计数之间切换）。
探针 `t121.json` 从 **8/20 到 20/20**，缺口套件与 23 套既有回归**零退化**。

产物 `MiniPy_v4.49.sb3`：Interpreter 14,662 块，合计 **16,091**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单条目 → 补丁）

| 补丁 | 清单条目 | 做法 |
|---|---|---|
| **P121** | 7（数值部分） | ① `numlit` 原来用 Scratch 的 `10 ^`（= JS `Math.pow`）算 `尾数 × 10^指数`，而 `Math.pow(10,-4)` 是 **0.00009999999999999999**，CPython 的 `1e-4` 是 **0.0001**。修法：指数为负时改成**除以** `10^\|指数\|`（`10^k` 在 k ≤ 22 时精确，除法是正确舍入）——`1e-4`/`1e-5` 从此与 CPython 逐位一致。② `numbercheck` 只认数字、一个小数点和一个行首正负号，于是**值需要科学计数法**的字面量（`1e21`、`1e300`、`1.5e-7`，词法阶段早就读对了）被拒成 `SyntaxError: invalid number`。修法：允许一个 `e`/`E` + 可选符号 + 其后至少一位数字 |
| **P122** | 7（排版部分） | 新增 `floatfmt`：CPython 的 `repr(float)` 规则是 **-4 ≤ exp10 < 16 用定点，否则科学计数**，指数带符号且至少两位；JS 的最短往返数字与 CPython 相同，所以只需要换"形状"。四条接入点：① `mkfloat`（所有浮点运算结果的必经之路）改成走 `floatfmt`；② `unary` 的负号——原来 `0 - x` 直接回到 JS 算术，`-1e16` 会丢掉小数点（`-10000000000000000`），现在浮点操作数会再过一次 `floatfmt`，**并且 `-0.0` 单独产出**；③ `float()` 现在真的产出浮点（`float(1)` → `1.0`）；④ 超过 16 位的**浮点字面量**（`123456789012345678.0`）也过 `floatfmt`，顺带用 `×1` 让 JS 把它舍入成 double |

## 2. 本轮踩实的四条（都写进 README 了）

* **`JOIN('e+', x)` 会把字面量当块 id**：`REP(x, shadow)` 的约定是"字符串 = 块 id"，
  所以拼接字面量必须 `txt('e+')`。写错时的症状是 scratch-vm 直接**崩在 `BlockCached` 构造函数**里
  （`check41` 和 orphans 都是 0，看不出问题——结构性检查抓不到"输入指向不存在的块"）。
* **`replaceStmt` 之后原来的块已经脱链**：`replaceStmt(old, A)` 把 A 接到老位置上，**old 被摘下来**；
  接着 `spliceAfter(old, B)` 写的是一条谁也走不到的链（表现为"补丁静默失效"：`1e3` 印成 `1e3.0`，
  因为 `nres` 还停在 numlit 开头赋的原始 token 文本上）。要接在**新块**后面：
  `const a = replaceStmt(old, A); spliceAfter(a, B)`。
* **辅助函数返回"块 id"还是"语句数组"要分清**：`...mantFrom(x)` 把返回值当数组展开，
  实际返回的是一个 id 字符串 → 被摊成一个个字符（P115 的 `...pushV` 是同一个坑，这次又踩了一遍）。
* **去掉零也要分"前导"和"尾随"**：指数的 `+300` 需要去掉**前导**零（保留至少一位），
  而尾数 `10000000000000000` 需要去掉**尾随**零——第一版两处共用一个 `stripZeros`，
  于是 `1e300` 印成 `1e+03`。

## 3. 实测

| 套件 | v4.48 | **v4.49** |
|---|---|---|
| `t121.json`（浮点 20 条） | **8/20** | **20/20** |
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6，本轮不加分） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `t107` / `t108` / `t111` / `t113` / `t114` / `t115b` / `t115c` / `t116b` | 8/12 · 14/14 · 14/15 · 14/14 · 12/12 · 7/7 · 24/33 · 4/4 | **同上** |
| 23 套 battery | math 7/10 · dict 9/10 · one2 11/12 | **逐字节相同** |
| `check41.cjs` | 15,778 块 errors=0 | **16,091 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.48 共 39 版全 MATCH | **v4.10…v4.49 共 40 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 4. 前后对比

```
print(1e16)              v4.48: 10000000000000000.0   => v4.49: 1e+16
print(1e17)              v4.48: 100000000000000000.0  => v4.49: 1e+17
print(1e-4)              v4.48: 0.00009999999999999999 => v4.49: 0.0001     （数值也修对了）
print(1e-5)              v4.48: 0.000009999999999999999 => v4.49: 1e-05
print(1/100000)          v4.48: 0.00001               => v4.49: 1e-05
print(-0.0)              v4.48: 0                   => v4.49: -0.0
print(-1e16)             v4.48: -10000000000000000  => v4.49: -1e+16
print(1e21)              v4.48: SyntaxError: invalid number => v4.49: 1e+21
print(1e300)             v4.48: SyntaxError: invalid number => v4.49: 1e+300
print(1.5e-7)            v4.48: SyntaxError: invalid number => v4.49: 1.5e-07
print(float(1))          v4.48: 1                   => v4.49: 1.0
print(123456789012345678.0) v4.48: 123456789012345678.0 => v4.49: 1.2345678901234568e+17
# 没有动的（本来就与 CPython 一致）
print(1e15) / print(1e3) / print(1e-3) / print(0.1+0.2) / print(1/3) / print(2**0.5)   全部不变
```

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.49.sb3
node _work/v41/run.mjs MiniPy_v4.49.sb3 _work/cmp47/t121.json
node _work/v41/run.mjs MiniPy_v4.49.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps449_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.49.sb3 -out _work/v41/battery_v449.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.49.sb3 -tag v449f
node _work/v41/check41.cjs MiniPy_v4.49.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.48 还原： $env:V41_SKIP='P121,P122'; $env:V41_OUT='…/MiniPy_v4.48.sb3'; node _work/v41/build41.js
```

## 6. 下一轮（v4.50）候选，按清单顺序

1. **`try` 里 `return` / `break` 也跑 `finally`**（第 2 条；`t115c` 的 R1/R2 是现成用例）
2. **双 `for` 推导式**（第 4 条；`t115c` 的 X1）
3. **集合方法**：`add`/`remove`/`discard` / `|`/`&`/`-`（第 3 条）
4. `for a, b in <生成器>`：yield 出来的元组还不能解包（`t115c` 的 Y3）
5. `super()` 与类属性继承；多重继承
6. 集合元素顺序（不保证项，可不修）
