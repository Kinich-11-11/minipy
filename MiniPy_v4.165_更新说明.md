# MiniPy v4.165 更新说明：字典视图可以直接排序（P283）

## 0. 一句话

```python
d = {'b': 1, 'a': 2}
print(sorted(d.items()))    # [('a', 2), ('b', 1)]   ← 以前 TypeError: sorted() requires a list
print(sorted(d.keys()))     # ['a', 'b']
print(sorted(d.values()))   # [1, 2]
```

解释器积木 28,824 → **28,887**（+63，6 处守卫各 +10 左右），合计 31,101 → **31,164**。

## 1. 病因与修法

`d.keys() / d.values() / d.items()` 返回的是"**视图值**"：**内容已经是列表编码**
（P163 的实现就是 `dictkeys %s` / `dictvals %s` / `dictitems %s`，然后给 `evtype` 打上 `K`/`V`/`I` 标记）。
于是所有"要求 `L` 或 `E`"的检查都会拒绝它 —— 那句 `TypeError: sorted() requires a list` 一共 6 处。

修法：在这 6 处 fail 的**外层守卫之前**插一句

```
if evtype == "K" or evtype == "V" or evtype == "I":  evtype = "L"
```

注意插入位置：P276 已经把这些 fail 包成了 `if evtype != "L": fail(...)`，
所以必须插在**那个包装 if 之前**（插在 fail 之前就来不及了）。
再配合 P276 的"字典先转键列表"，`sorted(dict)`、`sorted(dict.keys())`、`sorted(dict.items())` 都通了。

## 2. 已知剩余（同族）

`sorted(<dict 或 view>, key=lambda …)` 仍**忽略 key**（返回未排序的键/项序）：
这和第 88/89 轮记录的 `sorted(d, key=<内建名>)` 是同一族的"key 没被传下去"问题，
需要先弄清那条入口（当时的结论：字典路径既不经过 `srtkey` 也不经过 `p4list`）。

## 3. 回归证据

| 套件 | v4.164 | **v4.165** |
|---|---|---|
| 新探针 `_sm`（33 条 str/list/dict 方法） | 30/32 | **31/33**（新拆出的 `m20a` 转正；`m16` 与 `m20b` 见下） |
| `_be` 26/27 · `_it` 6/6 · `_fn` 5/5 · `_q` 4/4 · `_map` 8/8 | 同 | 不变 |
| `_dictset` 30/30 · func 31/31 · `_orig` 4/4 · `_uh` 1/1 · `_upd` 12/12 · `_broad` 30/33 | 同 | 不变 |
| `_covX` 58/63 · `_cov1` 34/40 · `_cov3` 40/42 · `_cov5` 30/47 · `_ch` 2/5 · `_bk` 2/4 · `_sdk2` 3/4 · `_kw` 0/4 | 同 | 不变 |
| `_paren2` 15/15 · `_nest` 24/24 · `_setflt` 15/15 · `_doc2` 10/10 | 同 | 不变 |
| `_slice` 17/20 · `_star` 7/12 · `_cat` 3/8 · `_pw` 4/5 · `_catch2` 7/7 · `_catch3` 8/8 | 同 | 不变 |
| `_del` 13/13 · `_swap` 17/17 · `_alias` 11/17 · `_alias2` 11/11 · `_fstring` 17/18 · `_floatarith` 34/35 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（31,164 块） |
| 历史复现 | — | **v4.165 … v4.162 全 MATCH** |

## 4. 本轮顺带记录的另一处差异（`_sm` 的 m16）

```python
x = [1, 2]
x.extend([3]); x.insert(0, 0)
print(x, x.pop())     # CPython: [0, 1, 2] 3 ｜ MiniPy: [0, 1, 2, 3] 3
```

CPython 从左到右求值实参：先取 `x` 的**引用**、再执行 `x.pop()`、最后才格式化输出，
所以打印出来的是"已被 pop 过"的列表。MiniPy 先把第一个实参**快照成文本**再求值第二个，
因此打印的是旧值。这属于"实参快照"的设计差异（改动面较大），已记录、暂不动。

## 5. 落地与验证

* 新部件 `_work/v41/p283.txt`（P283），插在 `p282.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p165 = 'P283'`、`'v4.164' = "$p165"`，154 个旧版本条目全部前置 `$p165`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.165**；产物 **`MiniPy_v4.165.sb3`**。
* 块数：Interpreter 28,887 / Controller 2,019 / TextRenderer 234 / Stage 24 = **31,164**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.165.sb3
node _work/v41/check41.cjs MiniPy_v4.165.sb3                      # 31,164 块 errors=0
node _work/v41/run.mjs MiniPy_v4.165.sb3 _work/v41/_sm.json     # 31/33
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.165…v4.10 MATCH
```

## 6. 待办

1. `sorted(<dict/view>, key=…)` 的 key 传递（第 88/89 轮线索 + 本轮确认同族）；
2. `min/max default=`（门 `bcontro_jqknkpwgy`、内层 `bcontro_jkx36thdu` 已定位）；
3. `print` 的实参快照顺序（m16）；
4. 浮点显示（设计层，存档）。
