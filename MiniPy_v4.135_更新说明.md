# MiniPy v4.135 更新说明：compareText 的字形依赖、f-string `}}`（P215–P216）

## 0. 一句话

两个补丁：`compareText` 之前靠**造型编号**比较字符，任何没有字形的字符（所有控制字符）
都被判成**相等** —— 于是 `find`/`count`/`split`/`replace`/`in` 遇到 `\r`、`\t` 全错；
f-string 的 `}}` 会打出两个 `}`。解释器积木 27,003 → **27,056**（+53），
变量 1,285 → **1,289**，合计 29,280 → **29,333**。

## 1. P215 `compareText` 对非字形字符的比较

`compareText %s %s` 是整个解释器的字符串比较原语（`find`/`count`/`split`/`replace`/`in`/
`sorted`/字典键匹配都走它）。它逐字符比较的方式是「把角色切换到名为 `_<char>` 的造型，
再读**造型编号**当排序键」——角色的 95 个造型正好覆盖可打印 ASCII（32..126）。

**没有造型的字符**（所有控制字符）切换会静默失败，读回来的编号是**上一个**造型的编号，
于是任意两个非字形字符都判成相等。v4.134 上实测（`_cr.json` 8/17）：

```
'a\rb'.find('\r')   -> 0                  (CPython 1)
'a\rb'.count('\r')  -> 3                  (CPython 1)
'a\rb'.split('\r')  -> ['', '', '', '']   (CPython ['a', 'b'])
'a\rb'.replace('\r','-') -> '---'         (CPython 'a-b')
'x' in 'a\rb'       -> True               (CPython False)
'a\tb'.find('\t')   -> 0                  (CPython 1)
```

修法：**有字形的字符仍走造型编号**，只要有一侧没有字形就退回 Scratch 自己的 `<`/`>`
（JS 码元序，对这里的字符正是 CPython 的顺序）。判断"有没有字形"用范围测试
`char >= " " and char <= "~"`（这正是造型集本身），**不用造型名查询** —— 也就避开了
Scratch `=` 大小写不敏感带来的坑。

专项套件 `_cr.json` **8/17 → 17/17**；`_esc.json` 14/22（+3：`count`/`find` 的 CR 两例
与 `split('\t')`）；cov4 的 `set basics` 一并转正。

> 这个 bug 是上一轮把 `\r` 正确解码之后**暴露**出来的：以前 `'\r'` 是字母 `r`，
> 那些用例只是碰巧对。

## 2. P216 f-string 的 `}}`

`fstr %s` 处理了双开花括号（`{{` → `{`），但 else 分支把其它字符**原样追加**，
所以双闭花括号会打出两个：

```
f'{{a}}'    ->  '{a}}'      (CPython '{a}')
f'{{{n}}}'  ->  '{5}}'      (CPython '{5}')
f'{{}}'     ->  '{}}'       (CPython '{}')
```

修法：else 分支照 `{{` 的逻辑镜像一遍 —— 当前字符是 `}` 且下一个也是 `}` 时，
只打一个 `}` 并跳过下一个。单独的 `}` 保持原行为（追加；CPython 在那里报
`SyntaxError: single '}' is not allowed`，不在本轮范围）。

专项套件 `_fstring.json` **5/18 → 17/18**，**0 破坏**；剩下的 1 条是探针自身源码非法
（格式说明符里写字面 `{`，CPython 报另一种 SyntaxError），两边都不是"能跑"的语义。

## 3. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.134 | **v4.135** | CPython |
|---|---|---|---|
| `'a\rb'.find('\r')` / `count('\r')` | `0` / `3` | **`1` / `1`** | 同 |
| `'a\rb'.split('\r')` | `['','','','']` | **`['a','b']`** | 同 |
| `'a\rb'.replace('\r','-')` | `'---'` | **`'a-b'`** | 同 |
| `'x' in 'a\rb'` | `True` | **`False`** | 同 |
| `'a\tb'.find('\t')` / `split('\t')` | `0` / 四个空串 | **`1` / `['a','b']`** | 同 |
| `f'{{a}}'` / `f'{{{n}}}'` / `f'{{}}'` | `{a}}` / `{5}}` / `{}}` | **`{a}` / `{5}` / `{}`** | 同 |
| `f'a{{b}}c'`、`f'{{{x:.2f}}}'`、`f'{{{{}}}}'` | 多一个 `}` | **全对** | 同 |
| `f'{n:>3}|'`、`f'[{n:^5}]'`、`f'{a}{b}'` | 对 | **仍对** | 同 |

转正用例：`_cr` 9 + `_esc` 3 + `_fstring` 12 + 覆盖套件（cov1 1 / cov4 1 / covC 2）4 = **28 条**。

## 4. 回归证据

| 套件 | 结果 |
|---|---|
| cov1 +1 / cov4 +1 / covC +2（逐例 diff） | **0 broke** |
| cov2 / cov3 / cov5 / cov7 / cov8 / covX | **逐例不变或转正，0 broke** |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（29,333 块） |
| 历史复现 | **v4.134 / v4.133 / v4.132 / v4.100 / v4.10 全 MATCH**（v4.131 仍是手工另存副本） |

## 5. 残留（下一批）

1. **整值浮点丢浮点性**（值模型）：`print(2*0.5)`→`1`、`print(1+1.0)`→`2`、
   `sum([1.5,2.5])`→`4`、`type(2*0.5)`→`int`。要给数字加真正的浮点标记，并让
   `strval`/`reprval`/`floatfmt`/`tname`/`numbercheck` 一起认。**下一轮首选**。
2. `t = a[i]` 槽位别名（`a=[5,2]; t=a[0]; a[0]=a[1]; a[1]=t` → `[5,5]`，冒泡排序全错）。
3. `repr` 对 `\v \f \a \b \0` 仍打裸字符（CPython 打 `\x0b` 等）；`\xhh`/`\ooo` 未实现；
   **未知转义**（`'\q'`）丢了反斜杠（CPython 保留）。
4. `zfill` 符号位置（`'-42'.zfill(5)` → `00-42`）、`startswith(元组)` 恒假、`%.2s` 忽略精度、
   `print(sep=…, end=…)` 同时给时坏掉。
5. f-string 格式说明符里的字面 `{`（CPython 也是 SyntaxError，属"非法代码"）。

## 6. 落地与验证

* 新部件 `_work/v41/p215.txt`（P215–P216），插在 `p211.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：新增 `$p135 = 'P215,P216'`、新增 `'v4.134' = "$p135"`，
  **125 个历史版本跳表全部前置 `$p135`**。
* `head.txt` 输出版本 → **v4.135**；产物 **`MiniPy_v4.135.sb3`**。
* 块数：Interpreter 27,056（+53）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **29,333**。
* 两个补丁都按结构定位并断言唯一：`compareText` 里恰好两个 `ca ? cb` 判断（且 `lt` 在 `gt` 之前）、
  `fstr` 里唯一的 `fo = fo & fc2`。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.135.sb3
node _work/v41/check41.cjs MiniPy_v4.135.sb3                      # 29,333 块 errors=0
node _work/v41/run.mjs MiniPy_v4.135.sb3 _work/v41/_cr.json      # 17/17
node _work/v41/run.mjs MiniPy_v4.135.sb3 _work/v41/_fstring.json  # 17/18
node _work/v41/run.mjs MiniPy_v4.135.sb3 _work/v41/_pow.json      # 36/36
node _work/v41/run.mjs MiniPy_v4.135.sb3 _work/v41/_strip.json    # 20/20
node _work/v41/run.mjs MiniPy_v4.135.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.134…v4.10 MATCH
```
