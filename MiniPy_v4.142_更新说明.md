# MiniPy v4.142 更新说明：别名语义调研 + 字典别名修复（P224）

## 0. 一句话

本轮先写探针**量化别名语义**（新套件 `_alias.json` 17 条、`_alias2.json` 11 条），结论是
MiniPy **已经有**一套精确的别名机制（列表/集合正确、无误别名、重绑定会解除），只是**字典被漏掉**了；
修掉之后 `e = d; e['y'] = 2` 会同时改到 `d`（与 CPython 一致）。
解释器积木 27,595 → **27,600**（+5），合计 29,872 → **29,877**。

## 1. 调研结果：别名机制现状

`_alias.json`（17 条）改动前 **10/17**；`_alias2.json`（11 条，专门测机制精度）**11/11** ✓：

```
a = [1,2]; b = a; b.append(3)          -> [1,2,3] [1,2,3]     ✓ 别名生效
a = [1]; b = a; c = b; c.append(3)     -> [1,3] [1,3] [1,3]   ✓ 链式
a = [1]; b = a; b = [9]                -> [1] [9]             ✓ 重绑定解除
c = [1]; d = [1]; d.append(2)          -> [1] [1,2]           ✓ 没有"相同文本"误别名
a = [[1]]; b = a[0]; b.append(2)       -> [[1,2]] [1,2]       ✓ 元素级也能传播
def f(x): x.append(3); a=[]; f(a)      -> [1]                 ✓ 传参可见
a = [1,2]; b = a; del b[0]             -> [2] [2]             ✓ 删除也传播
```

**机制**（读代码得到）：

* `assign(vn,vv,vt)` 把变量存进平行的 `Names/Values/Types/Show` 列表；
* 别名关系记在 `AliasN`（src）/`AliasT`（target）两个列表里，由 `alrec(src,target)` 写入、`aldrop` 删除；
* `execute` 在语句形如 **`名字 = 名字`**（`count == 3`）且值是**列表/集合**时调用 `alrec`；
* `assign` 写入容器后，会遍历别名表把**同一个新值推给伙伴变量**（递归，深度由 `ald < 3` 限制）。

所以它既不是"文本相同就共享"（没有误别名），也不是句柄/堆模型，而是**按名字对传播**。

## 2. P224：把 `D` 加进这套机制的两处判定

两处判定都只测了 `L`/`E`：

* `assign` 里的传播条件 `(((vt=="L") OR (vt=="E")) AND (ald<3))`
* `execute` 里记录别名对的条件 `((evtype=="L") OR (evtype=="E")) AND ((count==3) AND …)`

于是字典在两边都被跳过，表现成值语义：

```
d = {'x': 1}; e = d; e['y'] = 2; print(d, e)   ->  {'x': 1} {'x': 1, 'y': 2}   ✗
                                                   （CPython 两者都是 {'x':1,'y':2}）
```

修法：两处都加 `OR (vt=="D")` / `OR (evtype=="D")`（用 `P224` 按结构定位并重建 AND 的两侧，
不碰其它条件）。元组**故意不加**：往元组元素里写本来就会被拒，传播元组文本只会造出误别名。

实测：`_alias` **10/17 → 11/17**（`assign dict then mutate` 转正），`_alias2` 仍 **11/11**，
`_dictset` 30/30、`_nest` 24/24、cov4/covX 逐例不变。

## 3. 仍然做不到的 6 条（根因已查明）

| 用例 | CPython | MiniPy | 根因 |
|---|---|---|---|
| `a=[[1]]; b=a[:]; b[0].append(2)` | 两者 `[[1,2]]` | `a` 不变 | 容器是**内联文本**，`[:]` 必然深拷贝；CPython 是浅拷贝（共享内层对象） |
| `b=a.copy()` 同上 | 同 | 同 | 同上（`.copy()` 也走记录复制） |
| `t=([1],); t[0].append(2)` | `([1,2],)` | `([1],)` | 往元组元素写被拒（元组不可变），而 CPython 改的是**内层列表对象** |
| `def ident(x): return x; b=ident(a); b.append(2)` | 两者 `[1,2]` | `a` 不变 | 别名对只在 `名字 = 名字`（`count==3`）时记录；返回值路径没记录 |
| `d.copy()` 后改内层 | 两者都变 | `d` 不变 | 同 `[:]` |
| `def acc(x,out=[]): out.append(x)` 两次调用 | `[1,2] [1,2]` | `[1] [2]` | 默认参数每次调用重新求值（CPython 默认对象只创建一次并共享） |

**返回值那条**值得单独说：可以用"返回值文本与实参变量当前文本相等"来判定 `return x` 这种情形，
但这会**误判** `def f(x): return x[:]`（CPython 明确不共享）→ 会把 `x[:]` 变成别名，反而制造新的
静默错误。要做对必须**静态判断函数体是否就是 `return <参数>`**（MiniPy 有 `FnStart/FnEnd/FnDef`
等函数元信息，可行但需要新过程 + 在 `execute` 的调用点做名字解析），属于下一批的活。

## 4. 若要真正做"引用语义"（值模型改造）的代价评估

现在容器是**扁平记录串**（`lsep + 类型 + 文本` 拼接），天然值语义。要拿到 CPython 的引用语义，
需要引入句柄层，影响面包括：`assign`/`publish`、`indexget`/`indexset`/`indexdel`、`pathset`、
字典/集合、切片三件套、`str`/`repr`、`==`/`in`/`sorted`、`del`、函数传参与返回、以及所有
内建（`list`/`dict`/`set`/`copy`）。工作量远超一轮，且会同时改动大量已通过的用例 ——
建议**继续按"名字对传播"路线做局部修复**（投资回报高、风险可控），例如下一批做
「函数返回参数」的静态判定。

## 5. 回归证据

| 套件 | 结果 |
|---|---|
| cov1 / cov2 / cov3 / cov4 / cov5 / cov8 / covC / covX（逐例 diff） | **0 broke**（cov2 +1 来自上一轮 P222） |
| `_alias2` 11/11 · `_dictset` 30/30 · `_nest` 24/24 · `_swap` 17/17 · `_del` 13/13 · `_slice` 17/20 | 全绿 |
| `_prt` 12/12 · `_bool` 8/8 · `_pow` 36/36 · `_strip` 20/20 · `_cr` 17/17 | 全绿 |
| `_alias` 11/17（余 6 条见 §3） | 本轮新套件 |
| `_floatarith` 34/35 · `_fstring` 17/18 | 不变 |
| 项目自带 `gaps433.json` | **61/63**（不变） |
| 项目自带 `func.json` | **31/31**（不变） |
| `check41.cjs` | **errors=0**（29,877 块） |
| 历史复现 | **v4.141 … v4.132 / v4.100 / v4.10 全 MATCH** |

## 6. 落地与验证

* 新部件 `_work/v41/p224.txt`（P224），插在 `p223.txt` 之后、`p68.txt` 之前。
* `rebuild-old.ps1`：`$p142 = 'P224'`、`'v4.141' = "$p142"`，131 个旧版本条目全部前置 `$p142`
  （`Parser::ParseFile` 语法检查 OK）。
* `head.txt` 输出版本 → **v4.142**；产物 **`MiniPy_v4.142.sb3`**。
* 块数：Interpreter 27,600（+5）/ Controller 2,019 / TextRenderer 234 / Stage 24 = **29,877**。
* 新探针套件：`_alias.json`（17 条）、`_alias2.json`（11 条），以后改别名相关逻辑可直接回归。

```bash
node _work/v41/assemble.cjs && node _work/v41/build41.js         # -> MiniPy_v4.142.sb3
node _work/v41/check41.cjs MiniPy_v4.142.sb3                      # 29,877 块 errors=0
node _work/v41/run.mjs MiniPy_v4.142.sb3 _work/v41/_alias.json   # 11/17
node _work/v41/run.mjs MiniPy_v4.142.sb3 _work/v41/_alias2.json  # 11/11
node _work/v41/run.mjs MiniPy_v4.142.sb3 _work/cmp47/gaps433.json # 61/63
pwsh -NoProfile -File _work/v41/verify-rebuild.ps1                 # v4.141…v4.10 MATCH
```
