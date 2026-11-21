# MiniPy v4.224 更新说明

本轮只有一项功能补丁 **P718：原始字符串字面量 `r"..."` / `R'...'`**，用于修复用户反馈：

```python
import re
raw = " Hello, World!! 2024"
clean = re.sub(r"[^A-Za-z0-9]+", " ",raw).strip()
print(clean)          # v4.223: SyntaxError: expression
                      # v4.224: Hello World 2024
```

## 一、总体变化

| 项目 | v4.223 | v4.224 |
|---|---|---|
| Interpreter 块数 | 43,249 | **43,308** |
| 总块数 | 45,704 | **45,763** |
| 主套件 `_new*` | 168/168 | **168/168** |
| 覆盖套件 `_cov*` | 705/705 | **705/705** |
| 补充套件 `_gap131` | 82/82 | **82/82** |
| 内置 demo 端到端 | 20/20 | **20/20** |
| 旧模块套件 `_mods_*` | 71/71 | **71/71** |
| 新 20 例套件 `_mods20_*` | — | 127/140（见 §四） |
| `check41` | errors=0 | **errors=0** |

## 二、P718：原始字符串

**原因**：`tokenize` 先把 `r` 当普通标识符收下，紧接着的引号又开了普通字符串，
两个 token 并列，`atom` 阶段报 `SyntaxError: expression`。

**实现**：在 P21 f-string 前缀的同一位置（标识符 token 刚写入 `Tok/Kind` 之后）加判定：

* 标识符为 `r`/`R` 且下一个字符就是 `'` 或 `"` 时，进入 raw 扫描；
* 逐个复制字符，遇到反斜杠时**原样保留反斜杠**，并把后一个字符一起收下
  （因此 `r"\d+"` 得到 `\d+`、`r"a\\b"` 得到 `a\\b`，与 CPython 一致；
  反斜杠也能阻止引号提前收尾）；
* 扫到行尾仍未闭合 → `SyntaxError: unclosed string`；
* 用正文替换标识符 token，`Kind` 改为 `'S'`，后续按普通字符串求值。

**边界**：只支持单/双引号 raw string；`r"""..."""` 与 `fr"..."` 暂不支持。
消费完后清空 `et`，避免 `r"a""b"` 被后面的 f-string 分支误判。

## 三、验证

```bash
node _work/v41/check41.cjs MiniPy_v4.224.sb3            # errors=0
node _work/v41/runall.mjs MiniPy_v4.224.sb3 _work/v41/_res224new _work/v41/_new*.txt      # 168/168
node _work/v41/runall.mjs MiniPy_v4.224.sb3 _work/v41/_res224covall _work/v41/_cov*.txt   # 705/705
node _work/v41/run_iso.mjs MiniPy_v4.224.sb3 _work/v41/_gap131.json _work/v41/_gap131_224.out.json g224  # 82/82
node _work/v41/_demo_e2e3.mjs MiniPy_v4.224.sb3         # ALL 20 OK
```

raw string 专项 12 例（`_probe_raw.json`）全过，覆盖：用户原程序、`r"\d+"`、
反斜杠保留、引号内含引号、`r"tab\t"`、空 raw、未闭合报错、普通字符串回归、
`r` 作变量名、f-string 回归、单引号 raw。

## 四、已知问题（本轮未修）

`_mods20_*` 七套 140 例暴露的 10 处模块语义缺陷仍在，清单与根因见
`_work/v41/_mods20_*_out.json` 与项目记忆 `minipy-v4223-mods20-bugs`：

* math：`log10` 实为 `ln`、三角未做弧度→角度、`fmod` 负数符号、`log(0)` 无域检查；
* cmath：`log10` 乘错寄存器、`tan` 恒 NaN；
* time/datetime：`%j` 年内序号错误；`datetime.isoformat()` 用空格而非 `T`；
  `timedelta` 微秒进位丢失；
* re：字面量默认大小写不敏感、`findall` 忽略 `flags`。
