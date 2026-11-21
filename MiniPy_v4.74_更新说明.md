# MiniPy v4.74 更新说明

本轮补上 `%` 格式化的**映射键形式** `'%(name)s' % {'name': …}`。补丁 **P147**。

产物 `MiniPy_v4.74.sb3`：Interpreter 19,203 块，合计 **20,632**，`check41` errors=0；
65 个历史版本全部可复现（v4.10…v4.74 MATCH）。

## 1. 问题

| 代码 | v4.73 | **v4.74**（= CPython） |
|---|---|---|
| `'%(a)s=%(b)d' % {'a': 'x', 'b': 3}` | `ValueError: unsupported format character '(' (0x28) at index 1` | `x=3` |
| `'[%(n)5d][%(s)-6s]' % {'n': 42, 's': 'ab'}` | 同上 | `[   42][ab    ]`（映射值照样走宽度/标志/转换符） |
| `'%(zz)s' % {'a': 1}` | 同上 | `KeyError: 'zz'` |
| `'%(a)s' % 1`（不是字典） | 同上 | `TypeError: format requires a mapping` |
| `'%(a)s' % {'a': 1, 'b': 2}` | 同上 | `1`（多余的**字典项**不算多余参数） |
| 位置形式 `'%s-%d' % (…)` | 正常 | **不变** |

P77 的 `pctfmt` 从没学过映射形式，`(` 被当成转换符字符。

## 2. 做法

* **读键**：`pctfmt` 的规格扫描前加一段——遇到 `(` 就把直到 `)` 的字符收进新变量 `pvkey`，指针跳过 `)`，
  之后的宽度/精度/转换符照旧解析（于是映射值也能用 `%5d`、`%-6s` 这些）。
* **取值**：新过程 **`dget`** 在被当作映射的**第一个实参**里按键查值——`listitem` 本来就负责解转义，
  所以按 `1,3,5…` 取键、命中后取下一个就是值；找不到报 CPython 的 `KeyError: 'zz'`。
* **接线**：把原来"检查实参是否够 + 读 `pvv`/`pvt` + `pvk++`"这四条语句整段**摘下来**，放进新
  `IFELSE(有键, [映射查表], [那四条])` 的 else 里，再把 IFELSE 挂回原位置——顺序敏感：位置形式一字未改。
  映射形式把 `pvk` 设成"参数个数+1"，这样 P145 的"多余参数"检查不会误报（CPython 里多余的字典项本来
  也不算多余参数）。
* **一个定位坑**：`pctfmt` 里有**两处** `not enough arguments for format string`（原来的位置检查 + P146 的
  `*` 替换），光看消息分不开；最后按语句序取靠前的那一个（先建 DFS 序表再排序）。

## 3. 实测

| 套件 | v4.73 | **v4.74** |
|---|---|---|
| `d224.json`（本轮新写 16 条：映射形式（含宽度/标志/`%d`）、缺键 `KeyError`、非字典 `TypeError`、多余字典项、位置形式回归、以及并排验证的"子句里未定义名"6 条与 f-string/生成器表达式/零参构造） | — | **16/16** |
| `d223` 17 · `d221` 31 · `d220` 20 · `d218` 21 · `d217` 24 · `d206` 37 · `d190` 46 · `t107` 12 · `t133` 60 · `str` 12 · `one` 10 · `cont` 12 · `pan` 7 · `b2` 13 · `func` 31 · `demos` 12 · `tuple` 20 · `d204` 14 | — | **全绿** |
| 94 套快照 | — | **91 套逐例相同**，3 处差异全是既知噪声：`t113`/`t111h` 是 **CPython 参考侧**的集合哈希序（换一次运行就变）+ featprobe3 内存地址——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259**（逐套与 v4.73 相同） |
| `check41.cjs` | 20,573 块 errors=0 | **20,632 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.73 共 64 版全 MATCH | **v4.10…v4.74 共 65 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 5 个变量（`pvkey` `pvd` `p17f` `p17i` `p17n`）、1 个过程（`dget`）。

**顺带核实的结论**（都在 `d224` 里）：`except (NameError, NoSuchError)` 这类"坏名字与 `NameError` 同列"
的子句**已经正确**——v4.67 的 P140 会先把 `tcl`/`t2hit` 清零再弹帧，所以本 try 接不住、外层
`except NameError` 接得住，与 CPython 一致；`dict()`/`list()` 等零参构造、生成器表达式当实参、
f-string 格式规范也都正常。

## 4. 前后对比

```
print('%(a)s=%(b)d' % {'a': 'x', 'b': 3})
        v4.73: ValueError: unsupported format character '(' (0x28) at index 1
        => x=3

print('[%(n)5d]' % {'n': 42})        v4.73: 同上 ValueError   => [   42]

try:    '%(zz)s' % {'a': 1}
except KeyError as e: print(e)       => 'zz'
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'%g'`/`'%G'` | 仍按 `%s` 打印（`'%g' % 1234.5` 恰好相同，`'%g' % 0.0000123` 应 `1.23e-05`） |
| `dict(a=1, b=2)`（内建构造器的关键字实参） | 仍报 `NameError` |
| `'{a}'.format(a=3)`（`str.format` 的关键字形式） | 仍报 `SyntaxError: expression` |
| 缩进只认 4 的空格倍数（`if True:\n  print(1)` 报 `IndentationError: use 4 spaces`，CPython 接受） | MiniPy 的既定限制 |
| 其它 `IndentationError` 文案（`unexpected indent`） | 已是 CPython 措辞 |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.74.sb3
node _work/v41/run.mjs MiniPy_v4.74.sb3 _work/cmp47/d224.json  # 映射形式等 16 条
node _work/v41/run.mjs MiniPy_v4.74.sb3 _work/cmp47/d223.json  # %e/星号/缩进 17 条（上一轮）
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.74.sb3 -tag v474 -ref v473
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v474 -ref v473
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.74.sb3 -tag v474
node _work/v41/check41.cjs MiniPy_v4.74.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.73 还原： $env:V41_SKIP='P147'; $env:V41_OUT='…/MiniPy_v4.73.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.75）候选，按清单顺序

1. `dict(a=1, b=2)` 与 `'{a}'.format(a=3)`：内建/方法调用的**关键字实参**（两者同一套机制）
2. `%g`/`%G`
3. 清单 §2 的 E50（CPython 侧自己抛 `FileNotFoundError`，不可对齐）与 G5（默认参数共享需要对象模型）——
   这两条已在文档里判为"不动"
4. 复核 §F/§G 表与 63 条清单的现状，把仍然过时的行清理干净
