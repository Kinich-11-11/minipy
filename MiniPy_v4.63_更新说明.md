# MiniPy v4.63 更新说明

本轮把 **C3 真正落地**：方法表和属性表不再是"把父类的行抄一遍"，而是**按每个类的 MRO 逆/正序、只抄它自己定义的那一份**。
补丁 **P136**（接 v4.62 的 P135）。

产物 `MiniPy_v4.63.sb3`：Interpreter 17,577 块，合计 **19,006**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；54 个历史版本全部可复现（v4.10…v4.63 MATCH）。

## 1. 为什么"有 MRO"还不够

v4.62 让 `super()` 沿实例的 MRO 走了，但**方法从哪里找**仍然靠"拷贝"：建类时把父类的 `FnName`/`IAttr` 行
抄到子类名下。拷贝分不清"这一行是这个类自己定义的"还是"它从祖先那儿抄来的"，于是：

```
class A: def hi(self): return 'A'
class B(A): pass                       # B 没有自己的 hi
class C(A): def hi(self): return 'C' + super().hi()
class D(B, C): pass
print(D().hi())        # CPython 用 C 的（MRO 里 B 之后就是 C）   v4.62 得到 'A'
```

属性同理（`D().n` 取到了 A 的而不是 C 的）。

## 2. 做法：给每一行记"归属"，再按 MRO 定序

* **属性有归属列**：新列表 `IAttrOwn` 与 `IAttrId` 平行。P90 的类体 `name = value` 处理器在**追加**和
  **原地覆盖**两条路径上都写它（覆盖那条要用 `replaceitem`——行号不变，只看位置是看不出"被覆盖过"的）；
  拷贝出来的行则**保留原始定义者**，所以孙类不会再抄一遍（它自己的 MRO 会带来）。
* **方法用"边界"代替归属列**：一个类**自己**的方法就是它的拷贝跑完之后追加的那些 `FnName` 行，于是
  `ClsFn1[i]` 在拷贝结束时快照 `length(FnName)`，`clscopy` 只抄"下标 > 父类的快照"的行。
* **拷贝顺序跟着 MRO 走**（`M3M` = P135 存进 `ClsMro` 的那个线性化字符串切出来的片段）：
  * 方法**倒着走** MRO（最远的祖先先抄，最近的最后抄）——`calluser` 从表尾往前找，最后抄的赢 ✓
  * 属性**顺着走** MRO（最近的先抄）——`IAttr` 是从头往后扫的，先抄的赢 ✓
  （M3M[1] 是子类自己，所以方法循环到下标 2 停、属性循环从 2 开始。）
* **顺手关掉一个历史包袱**：P106 的单父类拷贝**一直内联在 `execute` 里**（在 `addTo ClsName` 之前跑，
  而且也是"连抄来的行一起抄"），与 P127 的 `clscopy` 重复劳动、还正好破坏本轮的规则。现在把它那个
  循环的条件改成恒真（不执行），**但保留它上面的"父类必须存在"检查**（`class B(Nope)` 仍会报错）。

## 3. 实测

| 套件 | v4.62 | **v4.63** |
|---|---|---|
| `d191.json`（菱形/继承 8 条） | 6/8 | **8/8**（D2 中间类不覆盖、D5 菱形属性 全绿） |
| `d159.json`（清单反例集） · `d192`（super 在表达式里） | 5/5 · 6/6 | **5/5 · 6/6** |
| `d193.json`（super 位置 6 条） | 3/6 | **5/6**（T6"两个 super 连用"仍报 `SyntaxError: parentheses`） |
| `cls` 12 · `t144` 16 · `d156` 5 · `d158` 8 · `d160` 6 · `d161` 6 · `d165` 5 · `d166` 8 · `func` 31 · `cont` 12 · `str` 12 · `demos` 12 | — | **全绿** |
| 90 套快照 | — | **86 套逐例相同**；4 处差异 = `d191` D2/D5 与 `d193` T2/T4/T6 **由 fail 翻 pass**，加 `t113` 的 CPython 集合哈希序与 featprobe3 内存地址（既知噪声）——**零回归** |
| 6 个 featprobe（259 条） | 246/259 | **246/259** |
| `check41.cjs` | 18,902 块 errors=0 | **19,006 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.62 共 53 版全 MATCH | **v4.10…v4.63 共 54 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 9 个变量、3 个列表（`M3M`/`IAttrOwn`/`ClsFn1`/`ClsAt1`）与 1 个过程（`clsfn1`）。

## 4. 前后对比

```
class A: def hi(self): return 'A'
class B(A): pass
class C(A): def hi(self): return 'C' + super().hi()
class D(B, C): pass
print(D().hi())            v4.62: A        => CA

class A: n = 'A'
class B(A): pass
class C(A): n = 'C'
class D(B, C): pass
print(D().n)               v4.62: A        => C

# v4.62 修的解析 bug 在更多形状下也对了（本轮回归里一并翻绿）：
x = 'B' + super().hi()                     => BA
'B' + A().hi()                             => BA
'C' + super().hi() + super().hi()          => CBB
```

## 5. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| `'C' + super().hi() + super().hi()`（一条表达式里两个 super） | `SyntaxError: parentheses`（`super()` 钩子只认"整段就是 `super().m(...)`"；`d193` T6） |
| `super().hi().upper()` | 后缀链套后缀链仍不行（同上根因） |
| 嵌套"带关键字 sorted" | `sorted(sorted(xs, key=…), reverse=…)` 报 `SyntaxError: parentheses`（P101 遗留） |
| 元组子句里写未定义名字 | CPython 抛 `NameError`，MiniPy 只当普通不匹配（v4.60 记录） |
| 元组的 `index`/`count` · `1()` / `(1).foo` | 仍缺（v4.61 记录） |

## 6. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.63.sb3
node _work/v41/run.mjs MiniPy_v4.63.sb3 _work/cmp47/d191.json  # 菱形/继承 8 条
node _work/v41/run.mjs MiniPy_v4.63.sb3 _work/cmp47/d159.json  # 清单反例集 5 条
node _work/v41/run.mjs MiniPy_v4.63.sb3 _work/cmp47/d193.json  # super 位置 6 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.63.sb3 -tag v463 -ref v462
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v463 -ref v462
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.63.sb3 -tag v463
node _work/v41/check41.cjs MiniPy_v4.63.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.62 还原： $env:V41_SKIP='P136'; $env:V41_OUT='…/MiniPy_v4.62.sb3'; node _work/v41/build41.js
```

## 7. 下一轮（v4.64）候选，按清单顺序

1. 嵌套"带关键字 sorted"的状态栈（P101 遗留，清单里点名）
2. `super()` 钩子只认整段：让"两个 super 连用 / `super().m().n()`"也能解析
3. 元组子句里写未定义名字应报 `NameError`（v4.60 发现）
4. 元组的 `index`/`count`（v4.61 发现）；任意值当函数调用 / 属性访问（`1()`、`(1).foo`）
