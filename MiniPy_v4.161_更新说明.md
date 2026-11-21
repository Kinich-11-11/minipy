# MiniPy v4.161 更新说明：`sorted(dict, key=…)` / `sorted(dict, reverse=…)`（P276）

## 0. 一句话

```python
d = {'bb': 1, 'a': 2}
print(sorted(d))                    # ['a', 'bb']   （v4.76 起就正常，P149 修的）
print(sorted(d, reverse=True))      # ['bb', 'a']   ← 以前 TypeError: sorted() requires a list
print(sorted(d, key=lambda k: -ord(k)))   # ['b', 'a'] 型同样修好
```

解释器积木 28,710 → **28,737**（+27），合计 30,987 → **31,014**。

（**已知剩余**：`sorted(d, key=<内建函数>)`（如 `key=len`）现在不再报错，但返回的是**未排序的键序**
——内建 key 那条路要另修；lambda/reverse 已经完全正确。）

## 1. 真正的病因（改了两轮才看清）

反汇编里那条分支的形状是：

```
if NOT(evtype == "L" or evtype == "E"):
    if evtype == "D":
        dictkeys(ev)                              ← 转换**成功**了（自会把 evtype 变成 L）
        fail "TypeError: sorted() requires a list"  ← 但它**无条件**执行
    p4list = ev
```

也就是说：**`fail` 被写在"字典分支"里面**，于是"转换成功"和"报错"同时发生。
所以前两轮的两次尝试都注定无效：

* 给那处 `dictkeys` 之后补 `evtype = "L"` —— 没用（`dictkeys` 早就把它变成 L 了）；
* 给 6 个含该消息的站点都补"字典先转键列表" —— 也没用（转换本来就发生了）。

**决定性探针**（PZ64 给 6 个站点各插一个）跑 `sorted({'bb':1,'a':2}, key=len)` 得到：

```
PZ64 #6 L/SbbSa          # 第 6 处执行，evtype 已是 L，ev 已是键列表（'bb'、'a' 的编码）
```

## 2. 修法

把**全部 6 处** `requires a list` 的 fail 就地包一层条件（等价且安全）：

```
if evtype != "L":  fail("TypeError: sorted() requires a list")
```

于是刚被转成键列表的字典继续往下走；真正不可迭代的类型（`N`/`K` 等）照旧报错。

## 3. 回归证据

| 套件 | v4.160 | **v4.161** |
|---|---|---|
| 新探针 `_sdk2`（sorted 与字典 4 例） | 1/4 | **3/4** |
| `_broad` 30/33 · `_covX` 58/63 · `_cov1` 34/40 · `_cov3` 40/42 · `_cov5` 30/47 | 同 | 不变 |
| `_uh` 1/1 · `_map` 8/8 · `_upd` 12/12 · `_pw` 4/5 · `_ch` 2/5 · `_kw` 0/4 | 同 | 不变 |
| `_orig` 4/4 · `_doc2` 10/10 · `_nest` 24/24 · `_setflt` 15/15 · `func` 31/31 · `_dictset` 30/30 | 同 | 不变 |
| `_slice` 17/20 · `_cat` 3/8 · `_star` 7/12 · `_fstring` 17/18 · `_floatarith` 34/35 · `_alias` 11/17 | 同 | 不变 |
| `_del` 13/13 · `_swap` 17/17 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（31,014 块） |
| 历史复现 | — | **v4.161 … v4.158 全 MATCH** |

## 4. 落地与验证

* 新部件 `_work/v41/p276.txt`（P276），插在 `p271.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p161 = 'P276'`、`'v4.160' = "$p161"`，150 个旧版本条目全部前置 `$p161`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.161**；产物 **`MiniPy_v4.161.sb3`**。
* 块数：Interpreter 28,737 / Controller 2,019 / TextRenderer 234 / Stage 24 = **31,014**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.161.sb3
node _work/v41/check41.cjs MiniPy_v4.161.sb3                      # 31,014 块 errors=0
node _work/v41/run.mjs MiniPy_v4.161.sb3 _work/v41/_sdk2.json   # 3/4
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.161…v4.10 MATCH
```

## 5. 下一轮候选

1. `sorted(d, key=<内建名>)` 的"未排序"残留（内建 key 路径）；
2. `min/max` 的 `default=`（门与内层结构已定位，见 `_work/v41/notes-broad.md`）；
3. 内建名做值（`f = int`）——需要新表示 + 调用侧分支。
