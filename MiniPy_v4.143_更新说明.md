# MiniPy v4.143 更新说明：`dict.update(键值对序列)` + 返回值别名调研（P225）

## 0. 一句话

`d.update([('b', 2)])` 以前报 `TypeError: 'list' object is not iterable`（update 分支只认字典实参）；
现在列表/元组会按「键值对序列」逐个写回，并给出 CPython 原文的两条错误。
解释器积木 27,600 → **27,645**（+45），变量 1,317 → **1,327**，合计 29,877 → **29,922**。

## 1. P225：`dict.update` 接受键值对序列

```
d = {'a': 1}
d.update([('b', 2)])          ->  TypeError: 'list' object is not iterable   ✗
d.update([('a', 9), ('b', 2)])->  同上                                       ✗
d.update(zip('ab', [1, 2]))   ->  同上                                       ✗
                                   （CPython 分别给 {'a':1,'b':2} / {'a':9,'b':2} / {'a':1,'b':2}）
```

`dictmeth` 的 update 分支结构是 `if 实参是 D: dupd 合并 else: fail("'…' object is not iterable")`。
修法：把 else 再分成两支——实参是 **L/T** 时走新的「逐对写回」循环，否则保持原来的报错：

* 逐个取元素，元素必须是 **L/T 且长度 2**；
* 用 `dsetv(rec, key, keytype, valtype, val)` 写回（返回新记录，累积到 `upacc`）；
* 元素不是序列 → `TypeError: object is not iterable`（CPython 原文）；
* 元素长度不是 2 → `ValueError: dictionary update sequence element #N has length M; 2 is required`；
* 最后 `assign` + `publish` 写回，并把 `ev` 设成 `""`/`Z`（`update` 返回 None）。

> **踩坑**：第一版我写成 `listlen(ev)` 之后就继续用 `ev` 当"待遍历的记录" —— 但 `listlen` 把**结果写进 `ev`**，
> 记录当场被覆盖，于是第一轮就报"element #0 不是序列"。改成先 `uprec = ev` 保存记录、再 `listlen(uprec)`
> 就对了。这类"输出变量恰好是 `ev`"的坑在这个解释器里到处都是，写补丁时要逐个确认每个过程的出口。

实测：新套件 `_upd.json`（12 条）**1/12 → 11/12**，covX 的 `dict update iterable of pairs` 转正，
`_dictset` 30/30、`_nest` 24/24、cov4/covC 逐例不变。剩下 1 条是 `d.update(b=2)`（方法的关键字实参）
——那是另一块缺口，本轮不动。

## 2. 返回值别名：调研结论（本轮未实现，留档）

本轮前半段本来要做「`def ident(x): return x; b = ident(a); b.append(2)` 应改到 `a`」。
把调用/返回机制读完之后，设计与结论如下：

* 别名对 (`AliasN`/`AliasT`) 只在 `execute` 里**语句形如 `名字 = 名字`**（`count == 3`）时记录，
  返回值路径不记录，所以 `b = ident(a)` 拿不到别名；
* 调用侧参数信息：`calluser` 把实参记进 `UArgN`/`UArgV`/`UArgT`；
  `fpush`/`fpop` 会**保存并恢复**这三个列表（所以嵌套调用不会串台）；
  但**位置实参**记录的是 `UArgN.push("")`（空串），只有关键字实参才记名字 ——
  因为 `UArgN` 的非空值另有语义（关键字绑定 / 惰性按名绑定会把名字转义后标记 `#`），
  不能直接改成记位置实参的名字，否则会破坏关键字绑定；
* 可行方案（下一批可做）：新增一个「调用方实参变量名」列表（在 `calluser` 的位置实参分支里
  按参数顺序记下 `Tok[fplo]`，仅当它是单个 `Kind=="I"` token），然后
  ① `execute` 处理 `return` 时，若语句恰好是 `return <名字>`（`count == 2`）且该名字是当前函数的形参、
  且它的当前值**等于**调用方传入值（防住 `x = [1]; return x` 这种重赋值），就把 `retAlias` 设为调用方变量名；
  ② 调用方赋值语句里若 `retAlias != ""` 就 `alrec(target=name, src=retAlias)` 并清空 `retAlias`；
  ③ 每次进入用户函数时先把 `retAlias = ""`，避免陈旧值泄漏。
  **为什么不做文本相等判定**：`def f(x): return x[:]` 的返回文本与实参相同，但 CPython 明确**不共享** ——
  用文本相等会把它误判成别名，制造新的静默错误；上面的 token 级判定（`return` 后只有一个名字）才是保守正确的。
  代价约 60 个积木并要动调用机制，风险偏高，因此排在后面。

`_alias.json`（17 条）现状 **11/17**，剩下 6 条：`[:]`/`.copy()` 浅拷贝（3 条，需要元素级引用）、
元组内层列表、`return <参数>`、函数默认参数共享。

## 3. 回归证据

| 套件 | 结果 |
|---|---|
| cov4 / covC / covX（逐例 diff） | **0 broke**（covX +1：dict update iterable of pairs） |
| `_dictset` 30/30 · `_nest` 24/24 · `_alias` 11/17 · `_alias2` 11/11 | 不变 |
| `_del` 13/13 · `_slice` 17/20 · `_swap` 17/17 | 不变 |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 | 全绿 |
| `_upd` 11/12（新套件） | 本轮 |
| `_floatarith` 34/35 · `_fstring` 17/18 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（29,922 块） |
| 历史复现 | **v4.142 … v4.132 / v4.100 / v4.10 全 MATCH** |

## 4. 落地与验证

* 新部件 `_work/v41/p225.txt`（P225），插在 `p224.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p143 = 'P225'`、`'v4.142' = "$p143"`，132 个旧版本条目全部前置 `$p143`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.143**；产物 **`MiniPy_v4.143.sb3`**。
* 块数：Interpreter 27,645（+45）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **29,922**。
* 新探针套件：`_upd.json`（12 条）。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.143.sb3
node _work/v41/check41.cjs MiniPy_v4.143.sb3                      # 29,922 块 errors=0
node _work/v41/run.mjs MiniPy_v4.143.sb3 _work/v41/_upd.json     # 11/12
node _work/v41/run.mjs MiniPy_v4.143.sb3 _work/v41/_alias.json   # 11/17
node _work/v41/run.mjs MiniPy_v4.143.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.142…v4.10 MATCH
```
