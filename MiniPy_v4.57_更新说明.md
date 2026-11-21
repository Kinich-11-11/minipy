# MiniPy v4.57 更新说明

本轮补上 **`sorted(x, key=lambda …)`**——featprobe3 里最后一个没做的功能项。补丁 **P130**。

产物 `MiniPy_v4.57.sb3`：Interpreter 16,534 块，合计 **17,963**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；48 个历史版本全部可复现（v4.10…v4.57 MATCH）。

## 1. 两件缺的东西

`sorted(x, reverse=…)` 是 P101 在 `eval` 里的钩子：按第一个顶层逗号切开、`lsort` 排、需要就 `lrev`。
`key=` 缺的是两块拼图：

1. **"把一个值当函数调用"**。`calluser` 是从 `UArgV`/`UArgT` 取实参的，而那两个列表是它自己
   *扫描 token 区间* 填的（`eval(lo,hi)`）。所以 `callval` 的做法是：把元素**按源码形式**写进一个
   临时 token 序列再让 `calluser` 去读——
   ```
   reprval <值> <类型>          -> ev = 源码形式（数字、字符串、True/False/None、嵌套 list/tuple/dict/set 都能还原）
   tokenize <ev>                -> Tok 换成这个字面量的 token
   calluser <函数名> 1 len(Tok)  -> 正常调用（形参按值绑定）
   tokenize Code[pc]            -> 把当前行的 token 放回去（p112.txt 就是这么做的）
   ```
   实例/函数/类没有字面量形式，会报 `TypeError: sorted() key function cannot receive this value`。
   另外：**用户函数的值是 `FnName` 的下标**（p85.txt 写得很清楚），`calluser` 要的是名字，所以先
   `FnName[ev]` 取名字；`key=len` 这类**内建名**根本不是值（`atom` 会报 NameError），于是单 token 的
   key 在求值失败时改走 `callfn`（内建分派）。
2. **按 key 排序**。`lsort` 拒绝元组（`TypeError: sort requires all numbers or all strings`），所以
   `srtkey` 换个走法：先对每个元素调一次 key 得到**键表**（`. 数字/字符串/布尔`），`lsort` 排键，
   再按排好的键**依次找"第一个还没用过、键相等"的元素**——顺带保住了 CPython 的**稳定性**；
   回收元素时先 `lesc` 再嵌入（嵌套容器的分隔符不能漏进外层编码，`lrev` 也是这么做的）。

## 2. 补丁清单（P130）

| 段 | 做法 |
|---|---|
| **(a) `callval`** | 见上：`reprval` → `tokenize` → `calluser`（内建走 `callfn`）→ `tokenize Code[pc]` 复原。被调用者的返回值留在 `ev`/`evtype` |
| **(b) `srtkey`** | 键表 + `lsort` + "第一个未使用的等键元素"（稳定），结果重新 `lesc` 编码成列表 |
| **(c) `eval` 钩子** | 插在 P101 的 `sorted` 钩子**之前**，用 `hascomma` 逐个切出 `name = value` 片段（**任意顺序**、`key=` 与 `reverse=` 都能有），未识别的关键字照 P101 的文案报错；接受 `L` **和 `E`**（P114 让 `sorted` 也吃集合，结果重新标成列表）；最后 `chgV(fnlimit,-1)` + `stop this script`，所以逗号这种情形不再走 P101 的分支 |

新增变量：`p4i p4j p4n p4c p4pos p4end p4next p4klo p4khi p4rlo p4rhi p4list p4out p4fn p4v p4vt
p4vv p4tok p4len0 p4lenk p4kl p4sk p4ks p4kst p4res p4rt p4bi p4bin`；新增列表 `P4Key`、`P4KeyT`、`P4Used`。

## 3. 本轮踩到的坑（都是新代码自己的）

1. **`IF(cond, [then], [else])` 的第三个参数被丢掉**：这套补丁里的 `IF` 只接受两个参数（要 else 必须用
   `IFELSE`）。我写了两处三分支的 `IF`，于是"没有 key 就普通排序"那个 else 分支整块消失——
   表现是 `sorted([3,1,2], reverse=True)` 变成 `[]`（`p4out` 从没被赋值，还是初值 0）。
2. **函数值 ≠ 函数名**：`eval` 一个 lambda/函数名得到的是 `FnName` 的下标（`evtype='F'`），
   直接丢给 `calluser` 就报 `NameError: function 1`；要先 `item('FnName', ev)`。
3. **嵌套容器的编码要转义**：`sorted([[2,1],[1,9]], key=…)` 一开始打印成 `[[], 1, 2, …]`——
   把内层列表的编码直接拼进结果，内层的分隔符被外层当成元素分隔符了；补一次 `lesc` 即好。
4. **集合输入**：P114 把 P101 的 `not(evtype=='L')` 放宽成了 `not(or(L, E))`，我的新钩子照抄时漏了，
   于是 `sorted({3,1,2}, reverse=True)` 报 "requires a list"（被回归套件 `t114` 抓到）。

## 4. 实测

| 套件 | v4.56 | **v4.57** |
|---|---|---|
| `d174.json`（本轮新写 8 条：lambda/def 键、两关键字任意顺序、稳定性、bool 键、嵌套容器键、报错） | — | **8/8** |
| `d178.json`（内建键 `len`/`abs`/`str` 3 条） | — | **3/3** |
| `d173.json`（键排序 4 条，含 `0 - len(s)`） | — | **4/4** |
| `d176.json`（空列表 / 变量持有函数 / key 调外部函数 / 嵌套 sorted / `key='upper'`） | — | **5/6**（只有"`sorted(sorted(x, key=…), reverse=…)`"嵌套关键字这种情形失败，见 §5） |
| featprobe3「sorted key= lambda」 | 红 | **绿** |
| 6 个 featprobe（259 条） | 245/259 | **246/259** |
| 68 套快照（`demos`/`scope`/`d1`/`pan`/battery + 全部 `t*`/`gaps*`） | — | **68 套逐例相同**；差异只有 `t111h` 的 CPython 集合哈希序与 featprobe3 的 `enumerate`/`zip` 内存地址（外加本轮那一例翻绿） |
| `t114.json`（集合面） | 12/12 | **12/12**（G3 `sorted(集合, reverse=True)` 未退化） |
| `t133` 60/60 · `t139` 31/31 · `t123` 29/29 · `t141` 18/18 · `t143` 7/7 · `t144` 16/16 · `t134` 9/9 · `t115c` 32/33 | 全绿 | **全绿** |
| `gaps433.json`（63 条） | 61/63 | **61/63**（E 54/55、F 2/2、G 5/6） |
| `check41.cjs` | 17,755 块 errors=0 | **17,963 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.56 共 47 版全 MATCH | **v4.10…v4.57 共 48 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

## 5. 前后对比与已知边界

```
print(sorted([3, 1, 2], key=lambda x: -x))                  v4.56: TypeError: unexpected keyword  => [3, 2, 1]
print(sorted(['bb', 'a', 'cccc'], key=len))                                                        => ['a', 'bb', 'cccc']
print(sorted([3, -1, 2], key=abs))                                                                 => [-1, 2, 3]
def neg(x): return 0 - x
print(sorted([1, 3, 2], key=neg, reverse=True))                                                    => [1, 2, 3]
xs = ['b1', 'a2', 'b3', 'a4']
print(sorted(xs, key=lambda s: s[0]))                       （同键保持原顺序，与 CPython 一致）   => ['a2', 'a4', 'b1', 'b3']
print(sorted([[2, 1], [1, 9]], key=lambda p: p[0] * 10 + p[1]))                                    => [[1, 9], [2, 1]]
print(sorted({3, 1, 2}, key=lambda x: -x))                                                         => [3, 2, 1]
```

| 已知边界 | 说明 |
|---|---|
| 嵌套的"带关键字 sorted" | `sorted(sorted(xs, key=…), reverse=…)` 报 `SyntaxError: parentheses`。**这是 P101 就有的形状**：内层钩子会把 `tqcpz` 之类的全局量覆盖掉（v4.55 上 `sorted(sorted(xs, reverse=True), reverse=True)` 同样报错） |
| 元素是实例/函数/类 | 没有字面量形式，报 `TypeError: sorted() key function cannot receive this value` |
| 键混类型 | 键表要全数字或全字符串（`lsort` 限制）；布尔键按数字处理（`False < True`） |
| `key='upper'`（字符串名） | 报错（CPython 报 `TypeError: 'str' object is not callable`），文案不同 |
| 键函数里再调带关键字的 `sorted` | `p4*` 是全局量，会被内层覆盖（同第一行的成因） |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.57.sb3
node _work/v41/run.mjs MiniPy_v4.57.sb3 _work/cmp47/d174.json  # key= 8 条
node _work/v41/run.mjs MiniPy_v4.57.sb3 _work/cmp47/d178.json  # 内建键 3 条
node _work/v41/run.mjs MiniPy_v4.57.sb3 _work/cmp47/d176.json  # 边界 6 条
node _work/v41/run.mjs MiniPy_v4.57.sb3 _work/v41/featprobe3.json
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.57.sb3 -tag v458 -ref v457
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.57.sb3 -tag v457
node _work/v41/check41.cjs MiniPy_v4.57.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.56 还原： $env:V41_SKIP='P130'; $env:V41_OUT='…/MiniPy_v4.56.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.58）候选，按清单顺序

1. 多个 `except` 子句的依次匹配（P51 的既有形状）+ `except (A, B)` 元组子句
2. 内建异常的消息文案：`ZeroDivisionError: division by zero` / `integer division or modulo by zero`
3. `isinstance(x, (int, str))` 与 `issubclass`
4. 嵌套 `sorted` 的钩子状态（把 `tqcpz`/`p4*` 换成栈，修掉 P101 留下的那个 `SyntaxError: parentheses`）
5. 继承线边角：菱形继承 C3、子类 `__init__` 用局部变量给父类 `__init__` 传参
