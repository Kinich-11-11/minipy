# MiniPy v4.123 更新说明

本轮补 **`min(xs, key=f)` / `max(xs, key=f)`**。补丁 **P196**。

产物 `MiniPy_v4.123.sb3`：Interpreter 25,949 块，合计 **27,378**，`check41` errors=0。

## 1. 问题

| 代码 | v4.122（**错**） | **v4.123**（= CPython） |
|---|---|---|
| `min([3, 1, 2], key=lambda x: x)` | `SyntaxError: expression` | `1` |
| `max(['bb', 'a', 'ccc'], key=len)` | 同上 | `ccc` |
| `min([(1, 5), (2, 3)], key=lambda p: p[1])` | 同上 | `(2, 3)` |
| `min(3, 1, 2, key=lambda x: x)` | 同上 | `1`（多个位置实参） |
| `max(-1, -5, key=abs)` | 同上 | `-5`（内建名当 key） |
| `min('ba', key=lambda c: c)` | 同上 | `a`（字符串按字符） |
| `min({'b': 2, 'a': 1}, key=lambda k: k)` | 同上 | `a`（字典按键） |
| `min([2, 1, 3], key=lambda x: 0)` | 同上 | `2`（键相等保留先出现的） |
| `min([], key=f)` | 同上 | `ValueError: min() iterable argument is empty` |
| `min(5, key=f)` | 同上 | `TypeError: 'int' object is not iterable` |
| `min([1], foo=1)` | 同上 | `TypeError: min() got an unexpected keyword argument 'foo'` |
| `print(min([3, 1, 2]))` / `max(3, 1, 2)` | `1` / `3` ✓ | 不变 |

## 2. 做法

`eval` 只在把调用交给 `calluser` 时才认 `name=value`（P100/P165）；内建带关键字会落进"数顶层逗号"那一支，
`=` 就让 `eval` 报 `SyntaxError: expression`。所以关键字形式必须有自己的钩子，位置就选在
**`narg == 0` 派发正前方**（与 `sum(xs, start)`、`enumerate(xs, start)`、`sorted(x, key=…)` 三个钩子同一处；
到那里 `narg` 已经数好顶层逗号）：

```
if 名字 == min 或 max and narg > 0:
    扫一遍参数，找顶层的 `key =` 和别的 `name =`
    if 有 `name =` 片段:
        if 不是 key  → TypeError: <名字>() got an unexpected keyword argument '<name>'
        else:
            位置片段：1 个 → 直接当可迭代对象；多个 → 求值后拼成编码列表
            可迭代对象归一化：字符串 → charsplit（字符）、字典 → dictkeys（键）、列表/元组/集合原样
            key 函数：eval(key 值) 得到函数值（FnName 下标）；单 token 内建名（len/abs/…）直接用名字
            minkey            # 逐元素调 key，留最优
            停止本脚本         # 与 P130 的 sorted 钩子同款收尾
```

* **没有关键字片段时钩子什么都不写**（只用自己的 `mk*` 暂存），老的 `builtin2`（两实参）与 `minmax`（多实参）
  两条路一个字节都不变。
* **key 的调用**直接复用 P130 的 `callval`：把元素 `repr` 成字面量、临时替换 `Tok`、`calluser`/`callfn` 调用、
  再 `tokenize(Code[pc])` 还原当前行的 token —— 所以 lambda、用户函数、`len`/`abs` 这类内建名都能当 key。
* **键的比较**复用 P138 的 `lcmp`（数字/布尔/字符串/元组/列表，混用报 CPython 的
  `'<' not supported between instances of …`），`minkey` 只在**严格更优**时替换最优元素 ⇒ 相等时保留**先出现**的。
* 空序列用本机 CPython 的措辞 `ValueError: min() iterable argument is empty`（与无 key 路径同一个说法）——
  按 P185 的教训，文案以本机解释器为准。

## 3. 实测

| 套件 | v4.122 | **v4.123** |
|---|---|---|
| `d277.json`（本轮新写 **38 条**：key 形式 23 条——lambda/具名函数/内建名、`key=len`、按字段、键相等留前者、字符串/字典/集合/元组可迭代、多个位置实参、键表达式与负号键、嵌套列表键、结果参与表达式、循环里/函数里；报错 8 条——空序列 ×3、未知关键字、非可迭代、键类型混用、两参数 lambda；回归 7 条——无 key 的 min/max、字符串/容器、`sorted` 的 key 与 reverse、集合与字典、`sum`/`enumerate` 钩子） | 15/38 | **38/38** |
| `d276` 38 · `d275` 38 · `d274` 42 · `d273` 27 · `d272` 29 · `d271` 31 · `d265` 32 · `d264` 32 · `d250` 26 · `d249` 42 · `d248` 61 | 全绿 | **全绿（不变）** |
| 快照 **146 套** | — | **143 套逐例相同**；差异 = `d277` 的 29 条**由错转对** + `t111h` M4（CPython 集合遍历顺序）+ `featprobe3` 的两条地址 ⇒ **MiniPy 侧零回归（`ref true` 0）** |
| featprobe（6 套 259 条） | 248/259 | **248/259（不变）** |
| `gaps433.json`（63 条） | 61/63 | **61/63（不变）**，只余 E50 与 G5 |
| `frames.mjs … fib16.json` | interpSteps 6388 | **6388（不变）** |
| `check41.cjs` | 27,086 块 errors=0 | **27,378 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.122 共 113 版全 MATCH | **v4.10…v4.123 共 114 版全 MATCH** |

本轮多 292 块积木、21 个新变量（`mk*` 暂存），**没有**新过程以外的结构变化：新增过程 `minkey`。

## 4. 前后对比

```
print(min([3, 1, 2], key=lambda x: x))   v4.122: SyntaxError: expression   v4.123: 1
print(max(['bb', 'a', 'ccc'], key=len))  v4.122: SyntaxError: expression   v4.123: ccc
print(min([(1, 5), (2, 3)], key=...))    v4.122: SyntaxError: expression   v4.123: (2, 3)
print(max(-1, -5, key=abs))              v4.122: SyntaxError: expression   v4.123: -5
print(min([], key=lambda x: x))          v4.122: SyntaxError: expression   v4.123: ValueError: min() iterable argument is empty
print(min([3, 1, 2]))                    v4.122: 1                         v4.123: 1（不变）
print(max(3, 1, 2))                      v4.122: 3                         v4.123: 3（不变）
print(min('ba'))                         v4.122: a                         v4.123: a（不变）
```

## 5. 仍缺 / 下一轮（v4.124）候选

1. 扩展解包 `a, *rest = [1, 2, 3]`
2. 内建 `*` 展开（`max(*xs)`、`zip(*m)` 转置）；方法调用 `obj.m(*xs)`
3. 多访问器路径别名（`b = a[0][1]`；补丁与结论留档 `_work/v41/_p176_twoaccessor.txt`）
4. `find`/`rfind`/`count` 的 `end`（要先给字符串派发加 `sma3`）；`index(x, start, end)` 的 `end`
5. `split(None, maxsplit)`；`rsplit`；视图集合语义；非 ASCII

（另：`sorted` 的未知关键字文案目前少了引号，`min`/`max` 这一路已按 CPython 补上引号——留作小候选。）

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js           # -> MiniPy_v4.123.sb3
node _work/v41/run.mjs MiniPy_v4.123.sb3 _work/cmp47/d277.json    # min/max key= 38 条
node _work/v41/run.mjs MiniPy_v4.123.sb3 _work/cmp47/d276.json    # 布尔位运算与 ~ 负号 38 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.123.sb3 -tag v4123 -ref v4122
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v4123 -ref v4122
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.123.sb3 -tag v4123
node _work/v41/check41.cjs MiniPy_v4.123.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.122 还原： $env:V41_SKIP='P196'; $env:V41_OUT='…/MiniPy_v4.122.sb3'; $env:V41_STAMP='MiniPy v4.122 - built 2026-09-18'; node _work/v41/build41.js
```
