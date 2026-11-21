# MiniPy v4.157 更新说明：`type(x).__name__`（P265）

## 0. 一句话

`type(3).__name__` 以前报 `AttributeError: 'str' object has no attribute '__name__'`，
现在返回 **`int`**（`type('x').__name__` → `str`，`type([]).__name__` → `list`）。
解释器积木 28,553 → **28,579**（+26），合计 30,830 → **30,856**。

## 1. 病根

MiniPy 的 `type(x)` 返回的是**显示字符串** ``<class 'int'>``；对字符串做尾随点属性读取
（`.__name__`）会走到 P141 的通用属性错误分支 → `AttributeError`。

## 2. 修法

照 P262（`map`/`filter`）的成功做法，在 `eval` 里加一条**早期分支**：

```python
if Tok[hi-1] == "." and Tok[hi] == "__name__":
    eval(lo, hi-2)                      # 求值接收者
    if evtype == "S":
        if ev 以 "<" 开头:  ev = substr(ev, 9, len(ev)-2)   # 取 <class '...'> 里的名字
        evK = "" ; 结束本次 eval
    # 其它情况照旧（原来的 AttributeError 路径不变）
```

* 只对**字符串**接收者生效，其余 `obj.attr` 行为完全不变；
* 取舍：严格按 CPython，`'abc'.__name__` 应报 AttributeError，这里会返回 `abc`
  —— 但 `type(x).__name__` 极常见、`'abc'.__name__` 基本不会出现，故取务实行为。

## 3. 已知的**另一个**缺口（本轮发现，未修）

```python
try: raise MyErr('x')
except MyErr as e: print(type(e).__name__)     # MiniPy 给 "str"，CPython 给 "MyErr"
```

`except ... as e` 绑定时 MiniPy 手里是**异常消息字符串**（不是异常对象），
所以 `type(e)` 得到的是 `str`。这与上面的 `__name__` 无关，是"异常对象表示"的独立问题，
已记入下一轮候选（需要 `raise`/`except` 侧保留类名）。

## 4. 回归证据

| 套件 | v4.156 | **v4.157** |
|---|---|---|
| `_tn`（`type(3).__name__` 等） | AttributeError | **返回 int/str/list**（异常类名那条属上节缺口） |
| `_broad` 30/33 · `_paren2` 15/15 · `_doc2` 10/10 · `_orig` 4/4 | 同 | 不变 |
| `_dictset` 30/30 · `_map` 8/8 · `_upd` 12/12 · func 31/31 | 同 | 不变 |
| covX 56/63 · `_catch2` 7/7 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（30,856 块） |
| 历史复现 | — | **v4.157 … v4.152 全 MATCH** |

## 5. 落地与验证

* 新部件 `_work/v41/p265.txt`（P265），插在 `p263.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p157 = 'P265'`、`'v4.156' = "$p157"`，146 个旧版本条目全部前置 `$p157`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.157**；产物 **`MiniPy_v4.157.sb3`**。
* 块数：Interpreter 28,579 / Controller 2,019 / TextRenderer 234 / Stage 24 = **30,856**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.157.sb3
node _work/v41/check41.cjs MiniPy_v4.157.sb3                      # 30,856 块 errors=0
node _work/v41/run.mjs MiniPy_v4.157.sb3 _work/v41/_tn.json     # int/str/list（异常类名见第 3 节）
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.157…v4.10 MATCH
```
