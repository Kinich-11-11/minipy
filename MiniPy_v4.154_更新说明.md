# MiniPy v4.154 更新说明：字符串字面量里的 `\xHH` 转义（P261）

## 0. 一句话

`print('\x41')` 以前输出 `x41`（转义没解码），现在输出 **`A`**，与 CPython 一致；
`repr('\x0b')` 以前是 `'x0b'`，现在是 `'\x0b'`。
解释器积木 28,280 → **28,307**（+27），列表 131 → **133**（`HexD`/`Asc95`），合计 30,557 → **30,584**。

## 1. 病根

`tokenize %s` 的转义分支只认 `n / t / r / v / f / a / b` 与 `\`，遇到 `\x` 就把 `x` 当普通字符收下
—— 于是 `'\x41'` 变成 `x41`。

## 2. 修法

在转义链**最后**加一段 `x` 分支：

```python
if ec == "x":
    h1 = letter(ep+1, source) ; h2 = letter(ep+2, source)
    hv = (itemnum(HexD, h1) - 1) * 16 + (itemnum(HexD, h2) - 1)
    if 32 <= hv <= 126:  ec = Asc95[hv - 31] ; ep += 2      # Asc95 = 码位 32..126 共 95 个字符
    else:                ec = "x"                            # 维持旧行为（原样收下 x）
```

* `HexD`（新列表）= `0-9a-fA-F` 共 22 个字符，`itemnum` 减 1 就是该位的数值；
* `Asc95`（新列表）= **只放可打印字符**（32..126）。这一点是踩坑换来的：
  第一版放的是 0..127 全表，而 scratch-vm 载入时会**丢弃部分控制字符项**，
  导致后面的项整体错位（`\x41` 解出了 BEL）。

## 3. 另一个关键坑（本轮最费时的一处）

第一版把新分支插在 `if ec == "n"` **之前**，结果 `\x41` 解出的 `A` 又被**后面**的
`if ec == "a"` 分支改写成 BEL（`\a` = U+0007）—— 因为 **Scratch 的 `=` 不区分大小写**，
`'A' == 'a'` 为真。

所以这段必须插在**整条转义链的最后**（`b` 分支之后），这也是 `_hex3` 探针
（`\x41 \x42 \x43 \x44 / \x30 \x31 \x39 / \x61 \x7a`）能一次全绿的原因。

## 4. 已知边界

* 码位 < 32 与 > 126 不做解码，维持"字面 xHH"的老行为；
  这些字符 scratch-vm 本身也存不住（U+0008 会被丢，第 27 轮就发现过）。
* 因此 `_slice` 里两条控制字符用例（`\x08`、`\x7f`）仍然失败 —— 这是平台限制，不是解析问题。

## 5. 回归证据

| 套件 | v4.153 | **v4.154** |
|---|---|---|
| 新探针 `_hex3`（`\x41..\x44`、`\x30/\x31/\x39`、`\x61/\x7a`） | — | **全绿** |
| `_broad` 30/33 · `_slice` 17/20 · `_cat` 3/8 | 同 | 不变 |
| `_paren2` 15/15 · `_paren3` 7/7 · func 31/31 | 同 | 不变 |
| `_unp` 13/13 · `_unp2` 11/13 · `_unp3` 13/14 · `_setflt` 15/15 · `_nest` 24/24 · `_dictset` 30/30 | 同 | 不变 |
| `_swap` 17/17 · `_del` 13/13 · `_alias` 11/17 · `_alias2` 11/11 · `_upd` 11/12 | 同 | 不变 |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 · `_tcases` 3/3 | 同 | 不变 |
| `_fstring` 17/18 · `_floatarith` 34/35 · `_star` 7/12 | 同 | 不变 |
| `_orig`（用户两个原始程序）4/4 · `_orig2` 7/8 · `_doc2` 10/10 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（30,584 块） |
| 历史复现 | — | **v4.154 … v4.147 全 MATCH** |

## 6. 落地与验证

* 新部件 `_work/v41/p261.txt`（P261），插在 `p246.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p154 = 'P261'`、`'v4.153' = "$p154"`，143 个旧版本条目全部前置 `$p154`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.154**；产物 **`MiniPy_v4.154.sb3`**。
* 新探针：`_hex1/_hex2/_hex3.txt`（转义专项）。
* 块数：Interpreter 28,307 / Controller 2,019 / TextRenderer 234 / Stage 24 = **30,584**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.154.sb3
node _work/v41/check41.cjs MiniPy_v4.154.sb3                      # 30,584 块 errors=0
node _work/v41/run.mjs MiniPy_v4.154.sb3 _work/v41/_hex3.json    # 全绿
node _work/v41/run.mjs MiniPy_v4.154.sb3 _work/v41/_broad.json   # 30/33
node _work/v41/run.mjs MiniPy_v4.154.sb3 _work/v41/_orig.json    # 4/4
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.154…v4.10 MATCH
```
