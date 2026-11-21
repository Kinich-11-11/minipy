# MiniPy v4.62 更新说明

本轮交付清单里的**菱形继承 C3 顺序**（`d159` E4 的 `D().hi()` 应为 `DBCA`），补丁 **P135**。
查这个问题的过程中还挖出一个**通用解析 bug**：`X 运算符 Y.方法()` 一律解析错——它才是 E4 真正卡住的地方。

产物 `MiniPy_v4.62.sb3`：Interpreter 17,473 块，合计 **18,902**，`check41` errors=0；
`frames.mjs fib16` 仍是 **6388** interpSteps；53 个历史版本全部可复现（v4.10…v4.62 MATCH）。

## 1. E4 之前为什么连"单继承的 super"都报错

`d159` E4 的方法体是 `return 'B' + super().hi()`，在 v4.61 上它报
`AttributeError: 'str' object has no attribute 'hi'`——**和菱形无关**，单继承的 `'B' + super().hi()`
同样报错（S3/S5/S6）。原因在 `eval` 的分派顺序：

```
eval 的最终 else:  ① 三元 → ② 找深度 0 的 '.' 走 methodcall2（后缀链）
                   → ③ 名字/属性分支 → ④ 扫描深度 0 的运算符 → pair()/rightside
```

后缀链排在**运算符之前**，于是 `'B' + super().hi()` 里第一个深度 0 的 `.` 被当成"整段的后缀"，接收者算成
`'B' + super()`；而 `super()` 的钩子只检查前缀（`Tok[lo]=='super'`、`Tok[hi]==')'`），恰好
`Tok[lo+3]` 是后面那个 `.`，于是它**在子区间上触发**，把 `'B' + super()` 算成 `'BA'`，
再对字符串取 `.hi` → 报错。

`'B' + 'xy'.upper()` 看着是好的，纯粹是巧合：先拼接再大写 = 先大写再拼接。`1 == [1,2].count(1)` 就露馅了。

**做法**：把 methodcall2 分支从"最终 else 的开头"**搬到 `ecut == 0` 分支的开头**（即运算符分流之后）。
运算符先决定操作数，每个操作数再各自允许是后缀链——这正是 Python 的优先级。搬一个 IF（连同它的子栈）
即可，`pair`/`rightside` 一行没动。

## 2. 真正的 C3：`ClsMro` + super() 走实例 MRO

* **每个类在 `class` 语句处记下自己的线性化**（新列表 `ClsMro`，逗号连接）：把每个父类的 MRO、再加上
  父类列表本身放进 `M3L`，用教科书式的 C3 merge 合并——每轮取"不在别的列表尾部出现"的第一个头，
  追加后从所有列表头里删掉。类名不含逗号，所以列表用字符串编码，`shead`/`stail`/`shas` 是三个切片小过程。
  无父类时 MRO 就是自己；父类是内建名（`Exception`）时按"没记录 = 就它自己"处理；层级不自洽时取第一个头
  （CPython 会抛 TypeError，MiniPy 保持可用）。
* **`super()` 沿"实例所在类的 MRO"走**：`cmet` 是**正在跑的方法所属的类**，`InstCls[cinst]` 是实例真正的类，
  在它的 MRO 里找到 `cmet` 的下一个类就是 `super()`。这正是 CPython 的 `super(定义类, self)`。
  找不到（比如拿别的类的实例来调这个类的方法）就退回"取 `cmet` 的第一个父类"，与旧行为一致。

于是 `D→B→C→A`：D 的 `super()` 给 B、B 的给 C（**不是 A**）、C 的给 A → `"D"+"B"+"C"+"A"` ✓。

## 3. 三个坑（都靠日志定位）

1. **辅助过程和调用者抢同一个计数器**：`shead` 原本用 `m3i`，而 `m3merge` 的外层、候选、删除三个循环
   也用 `m3i`——`shead` 一返回就把计数器顶到末尾，循环立刻结束（MRO 只算出 `"B,A,C"`）。
   `clsmro` 同样：它在"收集父类 MRO"的循环里被调用，于是 `M3L` 只剩两个元素（`["B,A","B,C"]`）。
   **规矩**：每个辅助过程用自己的计数器（`m3q`/`m3z`/`m3t`）。
2. **帮手借 `ev` 回话会吃掉调用者的值**（P131 的老教训，这次换了个花样）：`shas` 原本把结果放在 `ev`，
   但它内部每切一段就调 `stail`，而 `stail` 用 `sfind`/**也写 `ev`** ⇒ 匹配成功写进去的 `1` 被随后
   覆盖成 `-1`（`sfind` 的"没找到"），于是"这个头在不在别的尾部"永远是否。改成 `m3has` 自己存，
   最后才 `ev = m3has`。
3. **`newProc` 必须早于引用它的 `callProc`**（构建器找不到定义直接抛错），以及调试日志要记得撤——
   `DbgM` 列表留下会让构建报 `no list`。

## 4. 实测

| 套件 | v4.61 | **v4.62** |
|---|---|---|
| `d159.json`（清单反例集，E4 = 菱形 super） | 4/5 | **5/5** |
| `d191.json`（本轮新写 8 条：菱形 super 链 / 中间类不覆盖 / 三级链 / 菱形 `__init__` / 菱形属性 / 单继承不变 / 各自属性 / `super()` 到顶） | 2/8 | **6/8** |
| `d192.json`（`super()` 出现在表达式里 6 条） | 3/6 | **6/6** |
| `d193`（super 在左/右、两次 super） · `d195`（基础类 5 条） · `cls` 12 · `t144` 16 · `func` 31 · `t133` 60 | — | **全绿** |
| 86 套快照 | — | **83 套逐例相同**，3 处差异**全是既知噪声**（`t111h`/`t113` 的 CPython 集合哈希序、featprobe3 的 `enumerate`/`zip` 内存地址） |
| 6 个 featprobe（259 条） | 246/259 | **246/259** |
| `check41.cjs` | 18,662 块 errors=0 | **18,902 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.61 共 52 版全 MATCH | **v4.10…v4.62 共 53 版全 MATCH** |
| `frames.mjs fib16`（interpSteps） | 6388 | **6388** |

新增 19 个变量、4 个列表（`ClsMro`/`M3L`/`M3M`/`M3N`）与 4 个过程（`shead`/`stail`/`shas`/`clsmro`/`m3merge`）。

## 5. 前后对比

```
class A: def hi(self): return 'A'
class B(A): def hi(self): return 'B' + super().hi()
class C(A): def hi(self): return 'C' + super().hi()
class D(B, C): def hi(self): return 'D' + super().hi()
print(D().hi())        v4.61: AttributeError: 'str' object has no attribute 'hi'   => DBCA

# 同一个 bug 的普通形态（和类无关）：
print(1 == [1, 2].count(1))    v4.61: AttributeError: only lists have methods   => True

class A: def __init__(self): self.tag = 'A'
class B(A): def __init__(self): super().__init__(); self.tag = self.tag + 'B'
class C(A): def __init__(self): super().__init__(); self.tag = self.tag + 'C'
class D(B, C): def __init__(self): super().__init__(); self.tag = self.tag + 'D'
print(D().tag)         v4.61: ABD                                => ACBD
```

## 6. 仍缺 / 已知边界

| 项 | 现状 |
|---|---|
| **中间类不覆盖**（D2） | `class D(B, C)` 里 B 没写 `hi`、C 写了 → CPython 用 C 的，MiniPy 仍用"拷贝表"里 B（其实是 A）的那份 → `A`（应为 `CA`）。根因：方法/属性表还是**拷贝**出来的，拷贝不区分"自己定义的"和"从父类抄来的"；要按 MRO 逆序只拷贝每个类**自己**的方法（下一轮：`ClsFn1`/`ClsAt1` 边界 + 只拷 owner） |
| **菱形属性继承**（D5） | 同上：`D().n` 取到 A 的而不是 C 的 |
| `super().hi().upper()` | 后缀链套在后缀链上仍报错（`super()` 钩子只认"整段就是 `super().m(...)`"） |
| 嵌套"带关键字 sorted" | `sorted(sorted(xs, key=…), reverse=…)` 报 `SyntaxError: parentheses`（P101 遗留） |
| `1()` / `(1).foo` | 仍是 `SyntaxError`，CPython 是 `TypeError`/`AttributeError`（v4.61 记录的行为缺口） |

## 7. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.62.sb3
node _work/v41/run.mjs MiniPy_v4.62.sb3 _work/cmp47/d159.json  # 类与 super 5 条
node _work/v41/run.mjs MiniPy_v4.62.sb3 _work/cmp47/d191.json  # 菱形 8 条
node _work/v41/run.mjs MiniPy_v4.62.sb3 _work/cmp47/d192.json  # super 出现在表达式里 6 条
pwsh -NoProfile -File _work/v41/sweep.ps1 -sb3 MiniPy_v4.62.sb3 -tag v462 -ref v461
pwsh -NoProfile -File _work/v41/sweepcmp.ps1 -tag v462 -ref v461
pwsh -NoProfile -File _work/v41/featprobe-check.ps1 -sb3 MiniPy_v4.62.sb3 -tag v462
node _work/v41/check41.cjs MiniPy_v4.62.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
# v4.61 还原： $env:V41_SKIP='P135'; $env:V41_OUT='…/MiniPy_v4.61.sb3'; node _work/v41/build41.js
```

## 8. 下一轮（v4.63）候选，按清单顺序

1. **方法/属性表按 MRO 拷贝**（只拷"自己定义的"那一份）→ 收掉 D2/D5，C3 才算真正落地
2. 嵌套"带关键字 sorted"的状态栈（P101 遗留）
3. 元组子句里写未定义名字应报 `NameError`（v4.60 发现）
4. 元组的 `index`/`count`（v4.61 发现）；任意值当函数调用 / 属性访问（`1()`、`(1).foo`）
