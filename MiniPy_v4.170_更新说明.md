# 目标清单 第 10 轮：Tier-1 #3 **主体完成**（v4.170）

## 1. 出货内容（三个补丁一次打包）

| 补丁 | 做了什么 |
|---|---|
| **P293** | `except ... as e` 绑定的那句 `assign %s %s %s (vn=$asnm, vv=$asmsg, vt="S")`，其输入是**内联原语**（`vv` = `[3,[12,"asmsg","bvar_…"],[10,""]]`）。补丁①在它**之前**插前置段算出 `eid`/`evt2`，②把 `vv`/`vt` 两个输入改指 `eid`/`evt2`。类名取自 **`tnm`**（p51 的 raise 分支本来就有，用它拼 `"tnm: msg"`），记进新的 `ErrN`；内部错误（`1/0`）退回从异常文本切类名。 |
| **P294** | **真正的病根**：`callfn` 的 `fn == "type"` 阶梯**对实例没有分支**，所以恒为 `<class 'object'>`。补上后用 P129 的拼法：内建异常（P271 的 `ExcNames`）→ `<class 'ZeroDivisionError'>`，用户类 → `<class '__main__.E'>`。 |
| **P296** | 绑定变成实例之后 `str(e)` 会印 `<E object>`：P129 只在 `printargs` 里查隐藏属性 `__msg__`。P296 把同样的查找（`IAttrId`/`IAttrName == "__msg__"`）加到 `strval` 的实例分支（包一层写法）。 |

**过程中的两个"坑"记录**：
* 那句 assign 处在一条**不能被前置改写**的语句链里 —— `replaceStmt` 和"包一层"都会让 `as e` 完全绑不上（`NameError`）；**只改输入**才安全。
* 深层 `JOIN` 拼诊断消息会退化成块 id；诊断要用"连续 `setV('dbg', JOIN(dbg, …))`"再 `fail(dbg)`。

## 2. 验收（`_ex` 拆成 8 条单断言，才能看出真实变化）

| 断言 | v4.169 | **v4.170** |
|---|---|---|
| x1 `type(e)` | `<class 'str'>` | **`<class '__main__.E'>`** ✅ |
| x5 `str(e)`（用户异常） | `msg` | **`msg`** ✅（经历中间版本回归后由 P296 修回） |
| x6 `type(e).__name__`（`1/0`） | `str` | **`ZeroDivisionError`** ✅ |
| x7 `str(e)`（`1/0`） | `division by zero` | **`division by zero`** ✅ |
| x8 `isinstance(e, E)` | `False` | **`True`** ✅ |
| x2 `type(e).__name__` | `str` | `__main__.E` ⬜（多前缀，纯显示） |
| x3 `type(e) == E` | `False` | `False` ⬜（类值比较） |
| x4 `e.code`（自定义属性） | AttributeError | AttributeError ⬜ |
| **合计** | **2/8** | **5/8** |

## 3. 全量回归（52 套件，0 回归）

```
_ex 2/8 → 5/8 ｜ _broad 30/33 → 31/33（附加收获）
_oo 22/30 · _catch2 7/7 · _catch3 8/8 · func 31/31 · _sd 5/6 · _sm 31/33
_dictset 30/30 · _map 8/8 · _it 6/6 · _be 26/27 · _covX 58/63 · _cov5 30/47
_nest 24/24 · _setflt 15/15 · _doc2 10/10 · _orig 4/4 · _al 6/6 · _na 4/5
_fstring 17/18 · _pw 4/5 · _ch 2/5 · _kw 0/4 · _bk 2/4 · _sdk2 3/4 · _paren2 15/15
_cov1 34/40 · _cov3 40/42 · _slice 17/20 · _star 7/12 · _cat 3/8 · _del 13/13
_swap 17/17 · _prt 12/12 · _bool 8/8 · _pow 36/36 · _strip 20/20 · _cr 17/17
_tcases 3/3 · _rhs 6/6 · _comp 12/12 · _comp2 6/6 · _calls2 4/4 · _unp 13/13
_unp2 11/13 · _unp3 13/14 · _orig2 7/8 · _floatarith 34/35 · _alias 11/17
_alias2 11/11 · _uh 1/1 · _upd 12/12 · _fn 5/5 · _q 4/4
check41 errors=0（31,442 块）｜assemble: 221 parts, no duplicates
```

## 4. 清单进度

* ✅ #1 外层变量变异（v4.166）
* ✅ #2 `__str__`/`__repr__`（v4.167–169）
* 🟡 #3 异常实例模型（v4.170：**主体完成**；余 x2 前缀、x3 类值比较、x4 自定义属性）
* ⬜ #4 闭包捕获表、⬜ #5–#8、⬜ #9–#13

### #3 剩余三项的线索

* x2：`type(x).__name__` 去掉 `__main__.`（P265 的快速通道里那次 `substr` 之后再切一刀；
  注意别用 `hasText` 找分支 —— 要 `deepText`，第 10 轮踩过）。
* x3：`type(e) == E` —— 需要看"类名做值"的比较（P129 的 `<class '__main__.X'>` 值 vs 类对象）。
* x4：自定义异常属性 —— 现在 `e` 是**真实例**（`ErrV` 路径），`e.code` 应能取到；
  但 x4 走的是 `raise E(42)` + `__init__` 里 `self.code = code`，可能是
  `__init__` 的参数绑定或属性写入在异常路径上没生效。
