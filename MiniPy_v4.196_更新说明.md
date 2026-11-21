# MiniPy v4.196 更新说明

## 本次修复：`max()` / `min()` 的 `default=` 关键字（文档 #7 的后半，自 v4.143 起暂缓的条目）

**问题**：带 `default=` 的 `max`/`min` 报 `SyntaxError`。

**之前 / 现在**：

```python
print(max([1, 2], default=0))
# 之前: SyntaxError: expression / missing expression
# 现在: 2

print(min([], default=-1))
# 之前: SyntaxError
# 现在: -1
```

同时**未影响**既有行为：

```python
print(max([1, 2]))            # 2   ✅
print(max([1, -5], key=abs))  # -5  ✅（key= 仍生效）
print(min([]))                # ValueError: min() iterable argument is empty ✅
```

## 根因与实现

关键字路径（`max`/`min` 带 `key=` 时走的那条）里，`default` 不被识别 ⇒ 该 token 被当普通参数 ⇒ 报错。
本版沿用之前已经打通的算法（在关键字路径里"先算好答案"），并**修掉当时导致失败的自己那一步**：

1. 关键字扫描里把 `default` 认成第三种关键字（`mkklo = mkpos+2`、`mkend = mkpos`、`mkdef = 1`），
   区域入口清 `mkdef = 0`；
2. 在 `mkhi = mkend-2` 之后：清 `p4list` → `mmsv = mkhi` → `eval(mkklo, mkkhi)` 求默认值 →
   用 `callfn(Tok[lo], lo+2, mmsv)` 走普通路径**真正算一遍 min/max**（非空就用真结果覆盖默认值）→
   `eval(lo+2, mmsv)` 把 `ev/evtype` 恢复成"可迭代对象本身"；
3. `minkey` 里对 `mkdef == 1` 提前返回 —— 直接给出上一步算好的 `mkdfv/mkdft`。

**关键修正**：**不要**把 `mkhi` 收窄成 `lo+1`。原先那样做是为了"让收集循环收集 0 个元素"，
但它会让路径后续某处的 `eval(lo+2, mkhi)` 变成**空区间** ⇒ `SyntaxError: missing expression` ✗
（这正是该条目长期失败的原因）。收集循环照常跑即可，结果由 `minkey` 的提前返回接管。

## 验证

| 项目 | 结果 |
|---|---|
| `check41.cjs` | 231 parts、**32,237 块**、**errors = 0** |
| 全套 91 个套件 | **零回归**，且以下套件**净增**：`_r4` 3/5→**6/2**、`_r1` 5/5→**8/2**、`_p8` 7/3→**9/1**、`_kw` 0/4→**2/2**、`_doc` 7/5→**8/4**、`_p7` 2/4→**3/3**、`_cov5` 32/15→**33/14**、`_ch` 3/2→**4/1**（合计 **+14**） |
| 新单用例套件 `_h1`/`_h2`/`_h3`/`_h5` | **各 1/1**（`max([1,2],default=0)`=2、`min([],default=-1)`=-1、`max([1,2])`=2、`max([1,-5],key=abs)`=-5） |
| 旧版重建 | v4.195 用新跳过表重建 = **MATCH** |
