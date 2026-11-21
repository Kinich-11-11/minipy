# MiniPy v4.111 更新说明

本轮修掉一族**看起来不起眼、其实处处都在**的解析 bug：**字符串字面量被当成了逗号**。
补丁 **P184**。

产物 `MiniPy_v4.111.sb3`：Interpreter 25,373 块，合计 **26,802**，`check41` errors=0。

## 1. 问题

分词器把字符串字面量按**内容**存进 token 表（`Tok`），所以 `','` 这个 token 的文本恰好就是 `,`。
而"按顶层逗号切分"的扫描只看文本，于是把它当成真的分隔符：

| 代码 | v4.110（**错**） | **v4.111**（= CPython） |
|---|---|---|
| `len(',')` | `NameError: name 'len' is not defined` | `1` |
| `len('x' + ',' + 'y')` | 同上 | `3` |
| `len(','.join(['ab']))` | 同上 | `2` |
| `max(','.join(['ab']))` | `SyntaxError: missing expression` | `b`（`max` 对字符串仍另有缺口，见 §5） |
| `[',', 'a']` / `(',', 'a')` / `{',' : 1}` | `NameError` / `SyntaxError` | 正常 |
| `g(',')` / `h(',', ',')` | 参数被拆错 | 正常 |
| `for ch in ','` / `for a, b in [(1, 2)]` | 前者被拆错 | 都正常 |
| `'a,b'.split(',')` / `'a,b'.replace(',', ';')` | 被拆错 | `['a', 'b']` / `a;b` |
| `print(','.join(['a','b']))` | 正常 ✓ | 不变 |

`print` 之所以一直没中招，只是因为 P7 的 `printargs` 逗号扫描早就写了一句
`if not (item('Kind', ek) == 'S') then …` —— 也就是说这个 Kind 判据在别处**漏了 36 处**。

## 2. 做法（两步机械改写）

`Tok` 旁边有一张平行的 `Kind` 表（`S` = 字符串、`O` = 标点、`I` = 名字、`N` = 数字）：

1. **让每个 token 变量身边都有 kind**：每一条 `V = Tok[i]` 后面补一条 `VK = Kind[i]`
   （对 `V` 的**其它**赋值则把 `VK` 清成空串，避免残留旧值）——共 42 个变量、464 条伴随赋值。
2. **改判据**：所有 `X == ","`（`X` 是 `Tok[...]` 读取或上述变量）改写成
   `X == "," and <kind> != "S"` —— 共 **36 处**。

只动"拿 token 比逗号"的地方：那些**遍历字符串字符**的扫描（`letter(i, s) == ","`，用于 `%` 格式化、
`clssplit`、MRO 拆分等）本来就是按文本找逗号，**原样不动**。

## 3. 规模与代价

多 700 块积木（464 条伴随赋值 + 36 个 `and`/`not` 包装 + 36 个 `Kind` 读取）、42 个变量；
**没有**新过程、新列表。解释器仍能在 8.3 秒内跑完 `fib(16)`（`interpSteps` 6388 一字不变）。

## 4. 顺手确认（不算缺口的部分）

其它"看起来像标点"的字符串字面量 —— `len('(')`、`len(')')`、`len('+')`、`len(':')`、`len('=')`、
`len('*')`、`len('.')`、`len('[')`、`['+', 'a']`、`[':' , 'a']`、`len('-')`、`len('a+b')` ——
**v4.110 与 v4.111 都正确**。也就是说：**逗号是唯一漏掉 Kind 判据的分隔符**，
所以这一轮没有顺带修改别的东西。

## 5. 同一轮探针另发现（下轮候选）

`max`/`min`/`sorted` **不接受字符串**：

```
max(',')                 -> TypeError: ',' object is not iterable      (CPython: ,)
max('-'.join(['ab']))    -> 同上                                       (CPython: b)
max(x)  (x = 'ab')       -> 同上                                       (CPython: b)
max([',', 'a']) / max(1, 2) / min([',', 'a'])                          -> 正常 ✓
```

与 v4.110 逐字一致（**不是本轮引入的**），已写进清单作下一轮首选候选。

## 6. 实测

| 套件 | v4.110 | **v4.111** |
|---|---|---|
| `d265.json`（本轮新写 **32 条**：`len`/`max`/`min`/`sum` 的逗号实参、列表/元组/字典字面量、函数与 lambda 实参、`for` 目标、`split`/`replace`/`format`/f-string） | 11/32 | **32/32** |
| `d264`（元组切片/拼接）32 · `d263`（join）24 · `d202`（序列运算符）24 | 全绿 | **全绿（不变）** |
| 快照 **134 套** | — | **132 套逐例相同**；2 处差异 = `d265` 的 21 条**由错转对**（`ref false` → `new true`）+ `featprobe3` 的 enumerate/zip 地址 ⇒ **`ref true` 0 ⇒ 零回归** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 26,102 块 errors=0 | **26,802 块 errors=0**（1,194 个变量） |
| `rebuild-old.ps1` | v4.10…v4.110 共 101 版全 MATCH | **v4.10…v4.111 共 102 版全 MATCH** |

## 7. 前后对比

```
print(len(','))                v4.110: NameError: name 'len' is not defined   v4.111: 1
print(len(','.join(['ab'])))   v4.110: 同上                                    v4.111: 2
print([',', 'a'])              v4.110: NameError                              v4.111: [',', 'a']
print('a,b'.split(','))        v4.110: 拆错                                    v4.111: ['a', 'b']
print(','.join(['a', 'b']))    v4.110: a,b                                     v4.111: a,b（不变）
print(len('a,b'))              v4.110: 3                                       v4.111: 3（不变）
```

## 8. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js          # -> MiniPy_v4.111.sb3
node _work/v41/run.mjs MiniPy_v4.111.sb3 _work/cmp47/d265.json   # 逗号实参 32 条
node _work/v41/run.mjs MiniPy_v4.111.sb3 _work/cmp47/d264.json   # 元组切片/拼接 32 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.111.sb3 -tag v4111 -ref v4110
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4111 -ref v4110
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.111.sb3 -tag v4111
node _work/v41/check41.cjs MiniPy_v4.111.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.110 还原： $env:V41_SKIP='P184'; $env:V41_OUT='…/MiniPy_v4.110.sb3'; $env:V41_STAMP='MiniPy v4.110 - built 2026-09-17'; node _work/v41/build41.js
```
