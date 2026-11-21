# MiniPy v4.186 更新说明 —— `pow(x)` 缺参报错（文档 #7 之一）

> 对应《剩余问题优先级与暂缓清单.md》第二梯队 **#7** 中的
> 「`pow(2)` 应报 `TypeError: pow() missing required argument 'exp' (pos 2)`」。
> 基准 v4.185（231 parts、31,971 块），本版 **231 parts、31,976 块**，`check41` errors=0。

## 一、修好了什么

```python
print(pow(2))     # v4.185: NameError: name 'pow' is not defined
                  # v4.186: TypeError: pow() missing required argument 'exp' (pos 2)  ✅
```

| 用例 | v4.185 | **v4.186** |
|---|---|---|
| `pow(2)` | ❌ `NameError: name 'pow'` | ✅ `TypeError: pow() missing required argument 'exp' (pos 2)` |
| `pow(2, 3)` / `pow(2, 3, 5)` | ✅ 8 / 3 | ✅ 8 / 3（不变） |
| `round(1.5)` / `int(2.7)` / `max([1,2])` / `min([3,1])` / `abs(-3)` | ✅ | ✅（不变） |

套件：`_doc` **6/12 → 7/12**、`_ch` 2/5 → 3/5、`_pw2` 6/8 → 7/8；
**其余 60 余套全部 ≥ 基线、零回归**（`func` 31/31、`_sm` 31/33、`_ix` 6/6、`_k` 5/5、`_cl` 4/6、
`_p8` 7/10、`_q1` 7/9、`_covX` 58/63 …）。

## 二、根因（第 141–142 轮侦察）

`eval %s %s` 里的内建分派按 **`narg`** 分流，而探针证明：

```
round(1.5) → B[N0] … narg=0        pow(2) → B[N0] … narg=0
int(2.7)   → B[N0] … narg=0        max([1,2]) → B[N0] … narg=0
abs(-3)    → B[N0] … narg=0        min([3,1]) → B[N0] … narg=0
```

⇒ **`narg` 是"顶层逗号数"而不是参数个数**：单参数内建（含 `pow(2)`）统统走
`bcontro_nd1f7pkr`（条件 `narg == "0"`）这条分支；
而条件里写着 `pow/round/int` 的那条（`narg == "1"`）**根本没被走到**
—— 这正是第 141 轮把守卫插错位置、补丁失效的原因。

`narg=="0"` 分支里 `round/int/max/min/abs` 都有处理，**唯独没有 `pow`** ⇒ 整条内建分派落空 ⇒
退回普通变量查找 ⇒ `NameError: name 'pow' is not defined`。

## 三、改了哪里（+5 块）

在 `narg == "0"` 分支的 **SUBSTACK 头部前插**一个守卫：

```
IF( Tok[lo] == "pow" , [ fail("TypeError: pow() missing required argument 'exp' (pos 2)") ] )
```

* 该分支里 `round/int/max/min/abs` 都不叫 `pow` ⇒ 完全不受影响（实测全部不变）；
* `pow(2,3)`、`pow(2,3,5)` 走的是别的分支（`narg` 分别为 1、2）⇒ 不受影响（实测 8 / 3 不变）。

实现要点：用"**前插到分支**"的写法（直接改 `inputs.SUBSTACK` 再把旧首语句挂到守卫的 `next`、
并接好 `parent`），而不是 `insertBeforeStmt`（它要求锚点前面已有语句，插到分支首条时会失败）。

## 四、判定方式的一个注意点

本工程的探针框架里，**`expectError` 只能由用例名前缀 `!` 显式开启**（`mkcases.cjs`：`### !name`）。
不开启时 `same` 只比较**标准输出**，而 MiniPy 会把错误文本打进输出 ⇒
"应该报错"的用例即使报错内容正确也不会被判为通过。

因此本轮核对 `pow(2)` 的方式是直接读 `mini.err`：

```
pow case ERR=TypeError: pow() missing required argument 'exp' (pos 2)   ✅ 与文档要求逐字一致
```

（文档条目 #7 的另一个子项 `max/min(default=)` 仍在进行中：单个 `default=` 目前会触发解析期
`SyntaxError`，两个关键字时才是运行期 `unexpected keyword`，属于另一处待修。）

## 五、回归验证（v4.186）

```
_doc 7/12   _p8 7/10   _q1 7/9   _r3 5/6   _ix 6/6   _k 5/5   _cl 4/6   func 31/31   _sm 31/33
_unp 13/13   _unp2 11/13   _unp3 13/14   _covX 58/63   _pow 36/36   _comp 12/12   _dictset 30/30
_paren2 15/15   _fstring 17/18   _map 8/8   _strip 20/20   _cr 17/17   _swap 17/17   _tc2 8/8
```

历史复现校验：v4.185 → v4.132 以及 v4.100/v4.10 全部 **MATCH**
（v4.131 仍是已记录的"手工另存"差异）。

## 六、清单进度

| 状态 | 条目 |
|---|---|
| ✅ 已修 | #1 v4.166 · #2 v4.167–169 · #3 主体 v4.170/171 · #4 链式 v4.182 + 闭包 v4.183 · #5 v4.181 · #8 尾随逗号 v4.184 + 隐式拼接 v4.185 · **#7 的 `pow(x)` 报错 v4.186** · #9 前两块 v4.173/175 · #10 v4.172 · #11 v4.176/177 · #13 v4.174 · #12 的 `__len__`/`__getitem__` v4.178/179 |
| 🟡 进行中 | #7 余下（`max([1,2], default=0)` / `min([], default=-1)`）· #9 残余（内建名当值：`print(str)`、`print(int)`） |
| ⬜ 待做 | #6（⚪值模型差异）· #12 余下（`__add__`/`__eq__`/`__lt__`/自定义迭代器）· #14（生成器） |

> 🥇 第一梯队 #1–#4 完成；🥈 第二梯队 #5、#8 完成，#7 已完成一半。
