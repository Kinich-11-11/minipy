# MiniPy v4.35 更新说明

本轮把清单里"最影响写代码"的一块补上：**字典可写**，外加切片步长与 `str.format`。
四个补丁（P79–P82），`gaps433.json` 从 **21/63** 推到 **28/63**（E 25/55、F 0/2、G 3/6），
既有 23 套回归**逐条零退化**。

产物 `MiniPy_v4.35.sb3`：Interpreter 10,760 → **11,253** 块，合计 **12,682**，`check41` errors=0。
`MiniPy_v4.34.sb3`（12,189 块）按规则重建还原，未受本轮影响。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P79** | E38 `d[k]=v`、E39 `del d[k]` | 字典编码是"key,value,key,value…"的平铺记录（每条都是 `lsep+类型+转义文本`）。`indexset`/`indexdel` 各加一条 `D` 分支，插在原来那句 `if not(xb=="L"): fail` **之前**（否则先撞上列表的类型检查），命中就做完并 `stop this script`，列表路径一字未动。写：找到键的扁平下标 `2j-1`（值在 `2j`），按 lsep 位置切一刀换掉值记录；键不存在就整体追加。删：把键记录和值记录一次切掉 |
| **P80** | E40 `len(d)`/`'k' in d`、E41 `for k in d` | 新增过程 `dictkeys %s`：把字典里的**键记录**抽出来重新转义成一个 L 编码。于是三处都能复用现成的列表机制——`len` 用 `listlen/2`（`callfn` 的失败条件放宽成"不是 D 也不是 S"），`in` 与 `for` 各在 L/T 分支前插一句"是 D 就先 `dictkeys`"（`evtype` 被改成 L，后面的代码原样工作） |
| **P81** | E7 `s[::2]`、E8 `s[::-1]` | `indexget` 只认第一个顶层冒号，第二个冒号被当成 stop 表达式。扫描循环里多记一个 `xcol2`——把原来的 `if (xcol == 0)` 改成 **if/else**，else 里记第二个冒号（两次测试在同一轮迭代里跑，写成两条语句会把第一个冒号记两遍）。有 `xcol2` 时改走"按步长取值"：Python 的默认值（step>0 时 start/stop 是 0/n；step<0 时是 n-1/"开头之前"）与负数归一化都照做，`step==0` 抛 ValueError。没有第二个冒号时旧路径完全不变 |
| **P82** | E16 `'{} {}'.format(1, 2)` | `methodcall` 的 S 段**只会预先求值前两个实参**，三个参数就报 "SyntaxError: expression"。所以 `format` 的分支挂在 `if (xb=="O")`（实例分派）**之前**：自己按顶层逗号扫出全部实参存进 `FmtV`/`FmtT`，再交给新过程 `strfmt`——它逐字符走接收者，处理 `{}`（自动序号）、`{2}`（显式序号）、`{{`/`}}`，最后 `stop this script` |

## 2. 这一轮的两条经验

* **`insertBeforeStmt` 的位置要选在"守卫之前"**：P79 最初插在 `eval(键)` 之前，但真正的类型检查
  （`if not(xb=="L"): fail "index assignment needs a list"`）在那之前就执行了，分支永远不生效；
  要按"这条路径上第一个会挡住我的判断"来选锚点。
* **`operator_and`/`operator_or` 的操作数是布尔描述符 `[2, id]`**，用 `varName(desc)` 直接看会得到
  `null`。判断这种条件要先把描述符解成块（`blk(desc)`）再取变量名——P81 找"`ed==0 and eop==':'`"
  时正是踩了这一下。
* 顺带复习上一轮那条：**同一个 argument reporter 积木不能在多处复用**。P81 一开始又写了
  `const hi = argOf('hi')` 用了十几次，`s[4:1:-1]` 于是得出空串；改成 thunk（每次现造）才正确。
  `_work/v41/p79–p82.txt` 里凡是用到参数的地方都是现造的。

## 3. 实测

| 套件 | v4.34 | **v4.35** |
|---|---|---|
| `gaps433.json`（63 条） | 21/63 | **28/63**（E 25/55、F 0/2、G 3/6） |
| 23 套 battery | one2 1 / math 3 / dict 3 | **完全相同**（无退化） |
| `demos` / `scope` / `d1` / `pan` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 12,189 块 errors=0 | **12,682 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.34 MATCH | **v4.10…v4.35 共 26 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |
| `stepcost.mjs demo1` | 13–15 ms/步 | **15 ms/步** |

本轮新增的临时用例集：`_work/v41/td.json`（字典 8 条）、`ts.json`（切片 10 条）、`tf.json`（format 9 条），
其中三条不属于缺口清单的已知边界：`[1,2][::2]`（列表字面量直接下标，解析层限制，报 `SyntaxError: parentheses`）、
`del d['z']`（报 `KeyError: z`，CPython 是 `KeyError: 'z'`，字典套件里本来就是既有失败）。

## 4. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.35.sb3
node _work/v41/run.mjs MiniPy_v4.35.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps435_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.35.sb3 -out _work/v41/battery_v435.txt
node _work/v41/check41.cjs MiniPy_v4.35.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.34 还原： $env:V41_SKIP='P79,P80,P81,P82'; node _work/v41/build41.js
```

## 5. 下一版（v4.36）建议

剩下的 35 条里性价比最高的十条：

1. **E54** 属性/方法的根可以是任意表达式（`C().v`、`c.inc().v`）——类已经能用，卡在链式入口；
2. **E42** 字典方法 `keys/values/items/get/pop`（`dictkeys` 已就绪，`items()` 直接就是编码本身）；
3. **E30+E31** 函数当值 `g = f`、立即调用 lambda（函数值类型 `F` 已存在）；
4. **E33+E34+E35** 解包（`a,b=(1,2)`、`divmod` 返回值、`for a,b in ...`）；
5. **E23+E24** `enumerate` / `zip`（预先求值成 `[[i, v], ...]`，再靠上面的解包）；
6. **F1+F2** 两条静默错（嵌套推导式得 `[[]]`；生成器体内循环没写结尾 `return` 只 yield 一项）；
7. **E45+E47** 类属性 `class C: n = 1`、`__str__`；
8. **E36+E37** 裸逗号元组 `x = 1, 2` 与多值 `return`；
9. **E48+E49** `try/else`、`try/finally`；
10. **E26+E27** 关键字参数（`f(c=9)`、`sorted(x, reverse=True)`）。
