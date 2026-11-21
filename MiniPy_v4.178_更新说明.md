# MiniPy v4.178 更新说明：`len()` 走 `__len__`（Tier-3 #11 第一块）

## 0. 一句话

```python
class A:
    def __len__(self):
        return 3
print(len(A()))     # 3   ← 以前 TypeError: object of type 'A' has no len()
```

解释器积木 29,349 → **29,365**（+16），合计 31,626 → **31,642**。

## 1. 病因与修法

报错站点在 `callfn` 里那条 `TypeError: object of type 'X' has no len()`。
修法照 P286 给 `str()` 做 `__str__` 的成熟套路 —— 在那条报错**之前**插：

```
if evtype == "O" and (InstCls[ev] & ".__len__") in FnName:
    callmeth(inst=ev, meth="__len__", lo=1, hi=0)    # 返回值落在 ev/evtype
    结束本次脚本
```

（`lo=1, hi=0` 是空区间 —— `callmeth` 对零参调用不需要 token 区间，实测可用。）

## 2. 一个定位坑（值得记）

全库**有两处**语句带 "has no len()" 这段文字：一处在 `castmsg`，另一处在 `callfn`（真正生效的那条）。
所以找站点要扫「**任何**子树含该文本的语句」，不能假定它是 `setMsg` / `procedures_call` /
或只取第一个命中。

## 3. 验收与回归

| 套件 | v4.177 | **v4.178** |
|---|---|---|
| `_oo`（面向对象 30 条） | 22/30 | **23/30**（o5 `len(A())` 转正） |
| `_lm` 4/6 · `_lm2` 5/5 · `_mi` 6/6 · `_ca` 6/6 · `_cls2` 3/3 · `_nx` 6/6 · `_it` 6/6 | 同 | 不变 |
| `func` 31/31 · `_sm` 31/33 · `_be` 26/27 · `_pow` 36/36 · `_catch2` 7/7 · `_covX` 58/63 | 同 | 不变 |
| `_dictset` 30/30 · `_broad` 31/33 · `_cov1` 34/40 · `_cov3` 40/42 · `_cov5` 31/47 · 其余 40+ 套件 | 同 | 不变 |
| `check41.cjs` | — | **errors=0**（31,642 块） |

## 4. 下一步（同族 4 个 dunder，已探明路线）

`callmeth` 的内部是 `assign("self", inst, "O")` + `calluser(fn = <cls>.<meth>, lo, hi)` ——
**参数靠 token 区间重新求值**，所以"值已在手"的 dunder 不能直接复用零参写法。
下一步按各自的 **token 级站点**插分派（那里区间还在）：

| dunder | 用例 | 站点思路 |
|---|---|---|
| `__getitem__` | `A()[3]` | `indexget %s %s (lo,hi)` 顶部，参数区间 `lo+1 .. hi-1` |
| `__contains__` | `1 in A()` | `in` 比较的 token 级站点 |
| `__add__` | `A(1) + A(2)` | 二元 `+` 的链式扫描处（右操作数区间在手） |
| `__eq__` | `A(1) == A(1)` | `veq`/`ceq` 的调用点（token 级） |

## 5. 清单进度

| # | 项 | 状态 |
|---|---|---|
| 1·2·9·10·12 | 容器别名 / `__str__`分派 / `next()`迭代器 / 类属性（赋值+共享）/ 多继承第二基类 | ✅ |
| 3·4·6·7 | 异常实例模型 / 闭包 / `pow(2)` / 隐式拼接+尾逗号 | 🟡 |
| 8 | lambda：内联多参 ✅ v4.173、默认值 ✅ v4.175、内建名当值 ⬜（已确定不能改 `atom` 的 fail） | 🟡 |
| 11 | `__len__` ✅ **v4.178**；`__getitem__`/`__contains__`/`__add__`/`__eq__` ⬜ | 🟡 |
| 5·13 | 浅拷贝 / 生成器 | ⬜ |
