# MiniPy v4.140 更新说明：`[::0]` 不是"抓不住的异常"，而是**死循环**（P222）

## 0. 一句话

上一轮记的"`'abc'[::0]` 的 ValueError 抓不住"查清了：`fail` 只是把消息写进 `error`，
**切片代码接着用 step=0 继续跑**，下标推进 0 步 → 死循环 → 直到步数上限把整次运行掐掉，
最后把挂着的消息打出来，看起来才像"异常逃出 try"。修法：致命切片错误后 `stop this script`。
解释器积木 27,393 → **27,396**（+3），合计 29,670 → **29,673**。

## 1. 怎么查出来的

写了插桩补丁，在四处打日志：`fail` 写入 `error` 之后、`trycatch` 入口、**全部 12 处
`error = ""`**、以及 `trycatch` 的两个外部调用点（顶层驱动与 `calluser`）。同一份探针跑三例：

```
=== 两端都省略 [::0]（抓不住）
   DISP pc=2 err=[]                       <- 语句执行前
   FAIL pc=2 [ValueError: slice step cannot be zero]
                                          <- 语句执行后再也没有 DISP！
=== 显式边界 [0:3:0]（能抓住）
   DISP pc=2 err=[]
   FAIL pc=2 [ValueError: slice step cannot be zero]
   DISP pc=2 err=[ValueError: ...]        <- 语句正常返回，驱动看到 error
   TC pc=2 err=... d=0 try=1 fin=0        <- 进入 trycatch，匹配 except ValueError
   CLEAR@...
   caught2
=== 1/0（对照，能抓住）
   DISP pc=2 err=[] / FAIL pc=2 [ZeroDivisionError: ...] / DISP pc=2 err=[...] / TC ... / zd
```

结论：**异常没有被吞，是语句根本没返回**。而"没返回"的原因就是 step=0 的下标推进循环：

```
sgst（步长）= 0 → fail("ValueError: slice step cannot be zero")   ← 只是记消息
之后继续算切片：下标每轮 += 0，永远到不了终点 → 一直转到步数上限
```

显式边界的例子之所以"能抓住"，是因为错误发生点之后的路径不同（它的 walk 不会无限转），
语句得以返回，驱动照常把 `error` 交给 `trycatch`。

## 2. 修法（P222）

* `indexget`：`sgst == 0` 那一支里 `fail` 之后加 `stop this script`；
* 新的 `sliceset`（v4.139 加的）里两处致命错误（步长为 0、长度不符）同样在 `fail` 之后
  `stop this script`。

> **踩坑**：第一版我把 `stop` 插在 `if` 的**兄弟位置**（`spliceAfter(ifId, …)`），于是它**无条件执行**
> —— 所有带步长的切片赋值变成"静默什么都不做"（`_slice` 从 14/20 掉到 10/20）。正确位置是
> `if` 的 SUBSTACK **内部**、紧跟 `fail` 之后（`spliceAfter(failCall, …)`）。这次完全是靠
> `_slice` 套件当场抓住的。

## 3. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.139 | **v4.140** | CPython |
|---|---|---|---|
| `try: 'abc'[::0]` / `except ValueError: print('caught')` | 异常逃出（实为死循环） | **`caught`** | 同 |
| `try: a[::0] = [1,2,3]` / `except ValueError` | 同上 | **`caught`** | 同 |
| `try: 'abc'[0:3:0]` / `'abcdef'[1::0]` / `'abcdef'[:5:0]` | 能抓住 | **仍能抓住** | 同 |
| `a[::2] = [0,0,0]`、`a[::-2] = [7,8,9]`、长度不符 | 对 | **仍对** | 同 |
| `try: a[::2] = [1]`（长度不符） | 能抓住 | **仍能抓住** | 同 |

转正用例：`_slice` 14/20 → **16/20**（`slice step zero caught`、`slice step zero assign`）
＋ covC 1 条（`slice step zero catchable`）＋ covX 1 条（`slice step zero catchable`）。
新探针套件 `_tcases.json` 3/3、`_catch*.json` 22/22 全绿（把这次的调查固化成回归用例）。

## 4. 回归证据

| 套件 | 结果 |
|---|---|
| cov3 / cov4 / covC / covX（逐例 diff） | **0 broke**（covC +1、covX +1） |
| `_dictset` 30/30 · `_swap` 17/17 · `_nest` 24/24（`indexset`/`indexget` 重路径） | **逐例不变** |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 | 全绿 |
| `_tcases` 3/3 · `_catch` 7/7 · `_catch2` 7/7 · `_catch3` 8/8 | 全绿（本轮新增的调查用例） |
| `_floatarith` 34/35 · `_fstring` 17/18 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（29,673 块） |
| 历史复现 | **v4.139 / v4.138 / v4.137 / v4.136 / v4.135 / v4.134 / v4.133 / v4.132 / v4.100 / v4.10 全 MATCH** |

## 5. 新增调试工具（留在仓库里）

* `_work/v41/errclear.cjs <project.json>` —— 列出全部 `set error = ""` 及其所属过程（本轮靠它
  排除"错误被谁清掉"的可能，最后证明根本不是清除问题）。
* `_work/v41/pz.txt` —— 临时插桩补丁（`fail` / `trycatch` 入口 / 外部派发点 / 所有清除点打日志），
  已从 `assemble.cjs` 移除但保留在磁盘，下次追错误流可直接挂上。

## 6. 残留（下一批）

1. **`del a[::k]`**（1 条）：`indexdel` 与 `indexset` 同构，还没做同样改造（需要再加一个
   「按目标下标重建记录」的过程，或者复用 `sliceset` 的 walk 骨架）。
2. `repr` 的控制字符：`\v \f \a` 已打成 `\xhh`；更一般的小于 0x20/`\x7f` 仍打裸字符
   （需要 `ord` + `radix` 路径），`\xhh`/`\ooo` 转义本身也未实现。
3. 既有待办：别名/引用语义（`a[:]`/`.copy()` 深拷贝、嵌套函数修改不可见）、浮点十进制 vs 二进制、
   `chr()` 只支持 32..126、闭包与 `nonlocal`、生成器耗尽、`__str__` 分派、类属性共享、
   多继承 `isinstance`。

## 7. 落地与验证

* 新部件 `_work/v41/p222.txt`（P222），插在 `p221.txt` 之后、`p68.txt` 之前；
  `_work/v41/pz.txt` 已从装配列表移除。
* `rebuild-old.ps1`：`$p140 = 'P222'`、`'v4.139' = "$p140"`，129 个旧版本条目全部前置 `$p140`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.140**；产物 **`MiniPy_v4.140.sb3`**。
* 块数：Interpreter 27,396（+3）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **29,673**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.140.sb3
node _work/v41/check41.cjs MiniPy_v4.140.sb3                      # 29,673 块 errors=0
node _work/v41/run.mjs MiniPy_v4.140.sb3 _work/v41/_slice.json   # 16/20
node _work/v41/run.mjs MiniPy_v4.140.sb3 _work/v41/_tcases.json  # 3/3
node _work/v41/run.mjs MiniPy_v4.140.sb3 _work/v41/_catch.json   # 7/7
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.139…v4.10 MATCH
```
