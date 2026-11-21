# MiniPy v4.175 更新说明：lambda 的默认参数值（Tier-2 #8 第二块）

## 0. 一句话

```python
f = lambda x, y=10: x + y
print(f(1), f(1, 2))     # 11 3   ← 以前 f(1) 报 TypeError: missing argument y
```

解释器积木 29,274 → **29,289**（+15），合计 31,551 → **31,566**。

## 1. 病因

调用端的绑定循环（P100，`p100:126-134`）是这么取默认值的：

```
126  fdd = FnDef[fu]
127  if fdd == "":   TypeError: missing argument <名>
131  substr(fdd, 3, len(fdd))     # 从第 3 个字符起 = 默认值文本
133  ftype = letter(2, fdd)       # 第 2 个字符 = 类型标签
134  assign(FnPar[fu], fval, ftype)
```

而生产端（P14，`p14:52-55`）为**每个参数**写一条：

```
if Tok[fplo+1] == "=":
    eval(fplo+2, fphi) ; addTo('DefDef', JOIN(JOIN(lsep, evtype), ev))
else:
    addTo('DefDef', txt(''))
... 然后 addTo('FnDef', item('DefDef', fj))
```

`reglam`（解析 lambda 的过程）只填了 `DefPar`，**`FnDef` 那边只加了一条空串**，
于是参数与 `FnDef` 的对应关系也乱了 → `f(1)` 拿不到 `y` 的默认值。

## 2. 修法（P309）

1. 在 `reglam` 的参数循环里（`DefPar` 追加之后）照抄 P14 那两件事：
   识别 `Tok[rlflo+1] == "="`、求值默认值、压 `DefDef`，再把该条 `DefDef` 追加到 `FnDef`；
2. 把循环后那条多余的 `addTo('FnDef', txt(''))` 用恒假条件包住（等于去掉，但不动语句链）。

## 3. 验收与回归

| 套件 | v4.174 | **v4.175** |
|---|---|---|
| `_lm`（lambda/内建名 6 条） | 3/6 | **4/6**（l2 = lambda 默认值转正；余 l3/l6 = 内建名当值） |
| `_lm2` 5/5 · `_mi` 6/6 · `_nx` 6/6 · `_it` 6/6 · `func` 31/31 · `_oo` 22/30 | 同 | 不变 |
| `_sm` 31/33 · `_tcases` 3/3 · `_be` 26/27 · `_pow` 36/36 · `_catch2` 7/7 · `_covX` 58/63 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（31,566 块） |

## 4. 落地

* 新部件 `_work/v41/p309.txt`（P309），插在 `p308.txt` 之后。
* `rebuild-old.ps1`：`$p175 = 'P309'`、`'v4.174' = "$p175"`，`bumpskip.cjs` 累加（165 条）。
* `head.txt` → **v4.175**；产物 **`MiniPy_v4.175.sb3`**。
* 块数：Interpreter 29,289 / Controller 2,019 / TextRenderer 234 / Stage 24 = **31,566**。

**校验备注**：`verify-rebuild.ps1` 显示 v4.174…v4.166 全 MATCH；**v4.165 及更老仍 DIFF（+15 块）**，
这是**更早遗留**的漂移（与本次无关，第 11/12/16 轮已修过三处同类问题），已记进笔记待一次性清理。

## 5. 清单进度

| # | 项 | 状态 |
|---|---|---|
| 1 | 返回的容器别名 | ✅ v4.166 |
| 2 | `__str__`/`__repr__` | ✅ v4.167–169 |
| 3 | 异常实例模型 | 🟡 v4.170/171（x3 设计差异、x4 有锚点） |
| 4 | 闭包捕获表 | 🟡（(A) 注入已证明在跑；(B) 待换挂点） |
| 5 | `[:]`/`.copy()` 浅拷贝 | ⬜ |
| 6 | `pow(2)` / `max·min(default=)` | 🟡 |
| 7 | 隐式拼接 + 尾逗号 | 🟡 |
| 8 | lambda：内联多参 ✅ v4.173、默认值 ✅ **v4.175**、内建名当值 ⬜ | 🟡 |
| 9 | `next()` 迭代器状态 | ✅ v4.172 |
| 12 | 多继承第二基类 | ✅ v4.174 |
| 10·11·13 | 类属性共享 / 运算符重载 / 生成器 | ⬜ |
