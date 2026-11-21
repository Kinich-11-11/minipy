# MiniPy v4.141 更新说明：扩展切片删除 `del a[i:j:k]`（P223）

## 0. 一句话

`del a[::2]` 与上一轮的赋值形式同源（stop 区间里含进了第二个冒号）→ `SyntaxError`。
现在 `indexdel` 也记录第二个冒号，并把带步长的目标交给新的 `slicedel` 过程：按目标槽位
**从后往前**删除（删后面的元素不会移动前面元素的下标）。
解释器积木 27,396 → **27,595**（+199），变量 1,309 → **1,317**，合计 29,673 → **29,872**。

## 1. 问题与修法

```
a = [1,2,3,4,5]; del a[::2]        ->  SyntaxError: expression   (CPython [2, 4])
a = [1,2,3,4,5]; del a[::-2]       ->  SyntaxError: expression   (CPython [2, 4])
```

`indexdel` 的形状与 P221 之前的 `indexset` 一模一样：第一个冒号找到后，stop 取
`slc+1 .. lsp-1`（`lsp` 是 `]`），带步长时这段里就有第二个冒号 → 表达式解析报错。
（步长 1 的 `del a[1:3]` 一直走 `slicewrite(..., repl="")`，本轮未动。）

**解析层**：新增 `lsl2`（第二个冒号）与沿用 `isSlH`/`isSlP`（用户是否写了 start/stop）两个标志；
stop 区间改成 `slc+1 .. lsl2-1`；步长取 `lsl2+1 .. lsp-1`；`lsl2 == 0` 仍走 `slicewrite`，
否则走新的 `slicedel %s %s %s %s %s (name,recv,xs,xe,st)`。

**运行层**：边界归一化与 `sliceset` 同一套 CPython `PySlice_AdjustIndices` 规则；然后

1. 先数一遍目标槽位个数 `zsC`；
2. **从最后一个槽位开始**：正向步长时起点 = `b + (zsC-1)*st`、每步 `-st`；负向步长时起点 = `b`、
   每步 `st`（本来就是倒序）；
3. 循环 `zsC` 次，每次把记录里第 `zsI` 个元素摘掉（扫 `lsep` 定位前后边界再拼接前后缀）；
4. `assign` + `publish` 写回。

> 第一版给「倒序走」用了原来的区间判断（`i > zsE`），结果正向步长的删除**一个都没删**
> （起点 4、上界 5 → 条件当场为假直接退出）。改成**按次数循环**（`zsC` 次）后一次通过 ——
> 数过一次就够了，不需要再判区间。

## 2. 过程中挖到的一个**补丁工具坑**（值得记）

声明一切就绪后构建通过、`P223` 日志也打了，但行为是"step 恒为 0"。查下来：

```
[P223] DBG insert head=… head.next=bcontro_… swCall=bproced_…
       pred(swCall)=bcontro_lx06204nq     ← 不是刚插进去的那个 IF！
```

`replaceStmt(oldId, newId)` 把**旧积木的 `next` 留在原地**（指向它原来后面的语句）。
而 `predecessorOf(id)` 是**扫描全部积木**找 `next === id` 的第一个命中 —— 于是它命中了那个
已经"死掉"的旧积木，后续 `insertBeforeStmt` 就把新语句**接到死链上** → 构建末尾统一
`pruneUnreachable` 把它们**静默剪掉**（`whowrites slst` 显示"没有任何写入者"就是这个现象）。

修法（局部）：替换之后显式清掉旧积木的 `next`：

```js
replaceStmt(stopIf, newIfElse);
BL()[stopIf].next = null;      // 否则 predecessorOf 会命中这个死块
```

> 没有改 `replaceStmt` 本身：那会改变所有历史版本的重建结果，而我们要求 v4.132…v4.140 逐字节可复现。
> 但**以后写补丁**遇到「`replaceStmt` 之后还要 `insertBeforeStmt`」的顺序，都要记得清死链，
> 或者反过来先插入、后替换。

## 3. 实测（真实 scratch-vm 5.0.300 无头 + CPython 3.14 对照）

| 用例 | v4.140 | **v4.141** | CPython |
|---|---|---|---|
| `a=[1,2,3,4,5]; del a[::2]` | SyntaxError | **`[2, 4]`** | 同 |
| `a=[1..7]; del a[1::3]` | SyntaxError | **`[1, 3, 4, 6, 7]`** | 同 |
| `a=[1,2,3,4,5]; del a[::-1]` | SyntaxError | **`[]`** | 同 |
| `a=[1,2,3,4,5]; del a[::-2]` | SyntaxError | **`[2, 4]`** | 同 |
| `a=[1,2,3,4]; del a[0:4:1]` | SyntaxError | **`[]`** | 同 |
| `a=[1..6]; del a[4::2]` | SyntaxError | **`[1, 2, 3, 4, 6]`** | 同 |
| `a=[[1,2],[3,4],[5,6]]; del a[::2]` | SyntaxError | **`[[3, 4]]`** | 同 |
| `del a[::0]`（try/except ValueError） | 死循环（P222 前） | **`caught`** | 同 |
| `del a[1:3]`、`del a[:]`、`del a[1]`、`del d['a']` | 对 | **仍对** | 同 |

转正用例：新套件 `_del.json`（13 条）4/13 → **13/13**；`_slice.json` 16/20 → **17/20**
（`del slice step`）。

## 4. 回归证据

| 套件 | 结果 |
|---|---|
| cov3 / cov4 / covX（逐例 diff） | **0 broke** |
| `_dictset` 30/30 · `_swap` 17/17 · `_nest` 24/24（`indexdel`/`indexset` 重路径） | **逐例不变** |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 | 全绿 |
| `_tcases` 3/3 · `_catch` 7/7 · `_catch2` 7/7 · `_catch3` 8/8 | 全绿 |
| `_floatarith` 34/35 · `_fstring` 17/18 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（29,872 块） |
| 历史复现 | **v4.140 / v4.139 / v4.138 / v4.137 / v4.136 / v4.135 / v4.134 / v4.133 / v4.132 / v4.100 / v4.10 全 MATCH** |

## 5. 残留（下一批）

1. `repr` 的控制字符：`\v \f \a` 已打成 `\xhh`；更一般的小于 0x20 / `\x7f` 仍打裸字符
   （需要 `ord` + `radix` 路径），`\xhh`/`\ooo` 转义本身也未实现。
2. **别名/引用语义**（值模型，最大的一块）：`a[:]`/`a.copy()` 在 CPython 是浅拷贝，MiniPy 的
   扁平记录串等价深拷贝；嵌套函数内的修改对返回值不可见同源。
3. 浮点是十进制文本模型（`round(2.55,1)` → `2.6`，CPython `2.5`）。
4. `chr()` 只支持 32..126（95 字形限制）；闭包与 `nonlocal`、生成器耗尽/嵌套 yield、
   `__str__`/`__repr__` 分派、类属性共享、多继承 `isinstance`。

## 6. 落地与验证

* 新部件 `_work/v41/p223.txt`（P223），插在 `p222.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p141 = 'P223'`、`'v4.140' = "$p141"`，130 个旧版本条目全部前置 `$p141`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.141**；产物 **`MiniPy_v4.141.sb3`**。
* 块数：Interpreter 27,595（+199）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **29,872**。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.141.sb3
node _work/v41/check41.cjs MiniPy_v4.141.sb3                      # 29,872 块 errors=0
node _work/v41/run.mjs MiniPy_v4.141.sb3 _work/v41/_del.json     # 13/13
node _work/v41/run.mjs MiniPy_v4.141.sb3 _work/v41/_slice.json   # 17/20
node _work/v41/run.mjs MiniPy_v4.141.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.140…v4.10 MATCH
```
