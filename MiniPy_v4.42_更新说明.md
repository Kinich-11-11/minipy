# MiniPy v4.42 更新说明

本轮补函数调用层：**关键字参数**（E26，`f(1, c=9)`）、**`sorted(x, reverse=True)`**（E27），
并顺手修掉一个被它们**暴露出来的既存 bug**（P89 的解包分支共用一个 reporter，见 §2）。
三个补丁（P100、P101、P102），`gaps433.json` 从 **51/63** 推到 **53/63**（E 46/55、F 2/2、G 5/6），
23 套既有回归**逐条零退化**，6 个 `featprobe` 从 **224/259** 升到 **228/259**。

产物 `MiniPy_v4.42.sb3`：Interpreter 13,042 块，合计 **14,471**，`check41` errors=0。
`frames.mjs fib16` 仍是 **6388** interpSteps（无退化）。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P100** | **E26** `f(1, c=9)` | `calluser` 按顶层逗号切实参、逐段 `eval`，于是 `c=9` 整段被当表达式求值（`SyntaxError: expression`）。修法：新增与 `UArgV/UArgT` 平行的 **`UArgN`** 列表，每段记 `''`（位置参数）/关键字名/`'#'`（已用）。判断形状只看这一段自己的 token：`Tok[fplo]` 是名字、`Tok[fplo+1]=='='`、`Tok[fplo+2]!='='`（排除 `==`），此时只求值 `fplo+2 .. fphi`。绑定循环改成"先按参数名找关键字，再取下一个未被占用的位置参数"；"too many arguments" 只数位置段；关键字名不属于任何参数时**在绑定之前**就报错（与 CPython 的报错顺序一致） |
| **P101** | **E27** `sorted(x, reverse=True)` | 单参 `sorted` 在 callfn 里（P13），但带逗号的调用 `narg == 1` **进不去 callfn**（v4.41 `zip` 同款）→ `NameError: name sorted is not defined`。修法：在 eval 的 narg 分派**之前**挂 `sorted` 钩子——`hascomma` 找出顶层逗号 `tqcpz`，逗号前那段是列表（交给现成的 `lsort`，结果在 ev/evtype），逗号后必须是 `reverse=<值>`（值过一遍 `truth`，`True`/`1`/`0` 都认）；真就调新的 `lrev` 反转。其余关键字按 unexpected keyword 报错 |
| **P102** | —（既存 bug，本轮暴露） | P89 把**同一个** `item N of LoopName` reporter 同时喂给 `boundary` 解包分支的 `unpackto` 和 `assign`。一个 Scratch 块只能有一个父节点，VM 对共享 reporter 会返回**陈旧值**：实测三例套件（zip 循环 → 字典循环 → `for i, x in enumerate(...)`）里，最后一个循环第二趟拿到的 `names` 是第一个用例的 `a,b`，元素本身却是对的，于是循环变量停在第一趟的值、身体连打两遍。修法：给 else 分支（普通 assign）克隆一份 reporter |

## 2. 本轮踩实的五条（都写进 README 了）

* **共享 reporter 会返回陈旧值——又一次，而且是既存代码里的**。上轮 P95 踩到"共享导致条件恒假"；这轮 P102 证明它在**跨 RUN 的序列**里还会返回**上一个用例的值**。排查过程：先用 `featprobe` 的 83 例序列复现（`[zip, dict, enum]` 三例），再插桩 `boundary`/`unpackto`（`PTrace` + `runtrace.mjs`）看到 `F lv=2 ev=(1,'b')`（元素对）却 `U names=a,b`（名字错），最后 dump `Names/Values` 看到表里多出 `a,b` 两项，才定位到共享块。**教训：新增"多分支都引用同一个表达式"的补丁，一律克隆。**
* **新列表必须跟着帧一起存**：`UArgN` 是 P100 才建出来的，而 P14 的 `fpush`/`fpop` 只保存它写补丁时存在的列表，"实参里再调用户函数"（`func` 的 `[F] nested call in arg`）会因内层调用清掉 `UArgN` 而失败。修法：把 `UArgN` 追加进 `fpush`（末尾压栈）与 `fpop`（在丢弃列表区**之前**恢复）。
* **逗号参数调用进不去 callfn**：`narg == 1` 时 eval 只走 `builtin2`/`minmax`/`callable` 三条路，普通内建名都不是 callable。给内建函数加多参支持，**优先在 eval 层挂钩子**（v4.41 `zip`、本轮 `sorted` 都是这么修的）。
* **`REPEATU(cond)` 是"cond 为假时继续"**：P100 的位置游标跳过循环第一版写成 `REPEATU(OR(past_end, NOT(EQ(entry,''))))`，把"该跳过"和"该停下"写反了 → 纯位置调用全部报 `missing argument a`。正确条件 `OR(past_end, EQ(entry,''))`。
* **`replaceStmt` 只重连一条语句**（老坑，本轮再用）：要把"一段前置 + 一个新循环"替换掉旧循环时，正确顺序是 `insertBeforeStmt(旧循环, [前置])` 再 `replaceStmt(旧循环, 新循环)`；要插到**后面**就用 `spliceAfter`。

## 3. 实测

| 套件 | v4.41 | **v4.42** |
|---|---|---|
| `gaps433.json`（63 条） | 51/63 | **53/63**（E 46/55、F 2/2、G 5/6） |
| 23 套 battery | one2 1 / math 3 / dict 1 | **逐字节相同**（无退化；`func` 31/31、`comp` 10/10） |
| 6 个 `featprobe`（259 条） | 224/259 | **228/259**（`字典遍历`、`生成器用于 for` 由 P102 修好） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 14,277 块 errors=0 | **14,471 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.41 MATCH | **v4.10…v4.42 共 33 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增临时用例集：`t100.json`（关键字参数 16 条，**13/16**）、`t101.json`（`sorted` 12 条，**11/12**）、
`t102/t103/t104/t105`（`for` 遍历与解包回归）、`t106*/w*/x*`（P102 的定位用例）。
余下失败都只是**报错文案**与 CPython 不同（`missing argument b` vs `f() missing 1 required positional
argument: 'b'`、`too many arguments` vs `f() takes 1 positional argument but 2 were given`、
`unexpected keyword argument z` vs `f() got an unexpected keyword argument 'z'`、`sorted(key=…)` 措辞），
异常类型都对。

## 4. 本轮新发现（下一版候选，尚未修）

* **`yield i, i + 1`** 报 `TypeError: use str(number)`（裸逗号元组没走到 yield 分支的求值区间）。
* **双 for 推导式** `[x * y for x in range(3) for y in range(2)]` 报 `SyntaxError: parentheses`。
* **`'hello'.split()`（无参）** 按字符切，CPython 按空白切。
* **浮点 repr**：`1e16` → `1e+16`、`1e-5` → `1e-05`、`-0.0` 保号、大浮点用科学计数（`t92c` Q6/Q7/Q8/Q10）。
* `d.pop(k)` 把整个字典删空、`d.nope()` 的报错文案与 CPython 不同（P91 余项）。

## 5. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.42.sb3
node _work/v41/run.mjs MiniPy_v4.42.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps442_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.42.sb3 -out _work/v41/battery_v442.txt
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.42.sb3 -tag check
node _work/v41/check41.cjs MiniPy_v4.42.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.41 还原： $env:V41_SKIP='P100,P101,P102'; $env:V41_OUT='…/MiniPy_v4.41.sb3'; node _work/v41/build41.js
```

## 6. 下一版（v4.43）建议

1. **E49** `try/finally`（P88 的正常完成路径可以复用）
2. **E46** 继承 `class B(A)` + `super()`
3. **E51** `from math import sqrt`（P87 的模块表 + 把 math 分派搬进 `callfn`）
4. **E43** 字典推导式 / **E44** 集合
5. **E28+E29** `*args` / `**kwargs`
6. **E32** `global`
7. **G5** 默认参数只求值一次（`def f(b=[])`）
8. **双 for 推导式**
9. **`yield i, i + 1`**
10. **浮点 repr**（`1e+16`/`1e-05`/`-0.0`/大浮点）
