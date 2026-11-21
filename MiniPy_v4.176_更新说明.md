# MiniPy v4.176 更新说明：通过类名赋值类属性（Tier-3 #10 第一半）

## 0. 一句话

```python
class B:
    n = 1
B.n = 5
print(B.n, B().n)      # 5 5   ← 以前 AttributeError: only instances have attributes
```

解释器积木 29,289 → **29,296**，合计 31,566 → **31,573**。

## 1. 病因

`A.b = v` 的分派在 P55（p55:98-127）：

```
lookup(Tok[1])
IFELSE(found != 0 AND Types[found] == "O"):     # 只认"实例"
    iid = Values[found] ; 维护 IAttrId/IAttrName/IAttrVal/IAttrType
ELSE:
    FAIL('AttributeError: only instances have attributes')
```

**类名不是变量**（类没有 `Types == "O"` 的值），所以 `lookup` 失败 → `found == 0` → 报错。

而**类属性与实例属性存在同一批 `IAttr` 表**里，区别只在 `IAttrId` 那一列：
实例行用**实例号**（`Values[found]`），类行用**类名**（p55:78 `ccls = tokAt(num(2))`；p127:113 复制父类属性时同样 `addTo('IAttrId', ccls)`）。

## 2. 修法（P314）

1. 条件放宽：`(found != 0 and Types[found]=="O")` **或** `Tok[1] 在 ClsName 里`；
2. 体里第一条 `iid = Values[found]` 之后补一句 `if found == 0: iid = Tok[1]`。

## 3. 验收与回归

| 套件 | v4.175 | **v4.176** |
|---|---|---|
| `_ca`（类属性 6 条） | 1/6 | **4/6**（x2 `B.n=5`、x4 方法里 `D.n=…`、x6 `__init__` 计数；余 x1/x5 是"可变类属性共享"） |
| `_lm` 4/6 · `_lm2` 5/5 · `_mi` 6/6 · `_nx` 6/6 · `_it` 6/6 · `func` 31/31 · `_oo` 22/30 | 同 | 不变 |
| `_sm` 31/33 · `_be` 26/27 · `_pow` 36/36 · `_catch2` 7/7 · `_covX` 58/63 | 同 | 不变 |
| `_cov5` | 30/47 | **31/47**（顺带 +1） |
| 其余 40+ 套件 | — | 全部不变 |
| `check41.cjs` | — | **errors=0**（31,573 块） |

## 4. 工具链修复（顺带，重要）

`rebuild-old.ps1` 的 `$map` 里之前存在**重复键**和**同一 `$pNNN` 写两遍**的条目，
导致历史复现校验长期出现 `v4.168 / v4.166 / v4.165 :: DIFF`。
本轮去重后：**v4.175 → v4.162 全部 MATCH**（含此前一直 DIFF 的三版）。

## 5. 清单进度

| # | 项 | 状态 |
|---|---|---|
| 1·2·9·12 | 容器别名 / `__str__`分派 / `next()`迭代器 / 多继承第二基类 | ✅ |
| 3·4·6·7 | 异常实例模型 / 闭包 / `pow(2)` / 隐式拼接+尾逗号 | 🟡 |
| 8 | lambda：内联多参 ✅ v4.173、默认值 ✅ v4.175、内建名当值 ⬜ | 🟡 |
| 10 | 类属性赋值 ✅ **v4.176**；可变类属性共享 ⬜ | 🟡 |
| 5·11·13 | 浅拷贝 / 运算符重载 / 生成器 | ⬜ |