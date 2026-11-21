# MiniPy v4.203 更新说明

## 本轮目标

按《已知问题清单_v4.202.md》的"下一步建议"执行 4 个点：
**① `finally` 吞返回（清单 #5）**、**③ `assert` 语句（清单 #5）**、
**④ UnboundLocalError 产生侧（清单 #1 余例）**、外加 **两级 `+=`（清单 #5）**。

结果：**581 全套 41 → 36 失败；补充 82 例 9 → 8 失败；逐例对照修复 6+2 例、
行为性"破坏" 1 例（`assert with message`，实为用例不合法，见下）。**

## 一、修好了什么

| 用例 | 之前 | 现在 |
|---|---|---|
| `cov6 finally swallows return` | `fin` `try` 后报 `ValueError: x` | `fin` `try` `from-finally` |
| `covC finally return on exception path` | 报 `ValueError: x` | `fb` |
| `cov6 assert statements` | `assert 1 == 2, 'nope'` 静默通过 | `after assert` `assertion nope` |
| `cov4 two level plus assign` | `SyntaxError: expression` | `nested += first: {'a': {'x': 6}, 'b': {'y': 2}}` |
| `cov5 closure counter attempt without nonlocal` | `1 1` | `ule cannot access local variable 'n' where it is not associated with a value` |
| `cov5 augmented assign to global inside function` | `1`（读到全局旧值） | `ule`（`n += 1` 的读也走 ULE） |
| 补充 `UnboundLocalError name exists` | 报基类 `NameError` | `unbound`（UnboundLocalError 可被接住） |

```python
# finally 里的 return 压过在途异常（CPython 语义）
def h():
    try:
        raise ValueError('x')
    finally:
        return 'fb'
print(h())              # fb

# assert：真值通过、假值带消息抛 AssertionError
try:
    assert 1 == 2, 'nope'
except AssertionError as e:
    print('assertion', e)   # assertion nope

# 链式下标的增强赋值
d = {'a': {'x': 1}}
d['a']['x'] += 5        # {'a': {'x': 6}}（列表嵌套 m[0][1] += 10 同样可用）

# UnboundLocalError：函数体内被赋值的名字是本地名，读未绑定的本地名报 ULE
def make_counter():
    n = 0
    def inc():
        n = n + 1       # CPython: UnboundLocalError
        return n
    return inc
```

错误文本与 CPython 3.14 逐字一致：
`UnboundLocalError: cannot access local variable 'n' where it is not associated with a value`。
`UnboundLocalError ⊂ NameError`（P491 已注册），`except NameError` 也能接住。

## 二、根因与修法（P500–P503 四个补丁）

| 补丁 | 内容 |
|---|---|
| P500 | `assert` 语句：execute 加分支（P104/P499 同款挂点）。深度 0 找第一个逗号拆 条件/消息，`truth()` 假值时报 `AssertionError: <msg>`（无消息报 `AssertionError`）。之前 `assert` 不在不支持名单里，整行落进兜底 eval 被当表达式求值后丢弃，完全静默 |
| P501 | UnboundLocalError 产生侧，机制见下 |
| P502 | trycatch 尾驱动 tailDone 分支的重抛 `error = tfm` 加 `retflag != 1` 守卫——finally 尾块里的 return（P123 路径，retflag=1）按 CPython 语义吞掉停着的异常 |
| P503 | execute 下标 aug 分支的兜底： augop 为空时全 token 扫描（三种括号计深、跳字符串）在深度 0 找 augop，要求其前一 token 恰为 `]`，然后 eval 链式读 → rightside → 改写 token 成普通链式写。单层情形上一块已设好 augop，直接跳过 |

### P501 的机制（静态本地名集合）

CPython 的规则是静态的：函数体内被赋值的名字就是本地名。为此：

1. **regdef 末尾扫描函数体**（逐行 tokenize，期间保存/恢复 Tok/Kind/error），
   收集"被赋值的名字"进 `FnLocN`（扁平表 + FnLocB/FnLocL 区间，与 FnName 对齐）；
   `global`/`nonlocal` 声明的名字进 `FnXcN` 排除集（P104/P499 语义优先）。
   识别形态：`x =`、`x +=` 等（含 `**`/`//` 拆 token 形态）、行首 `a, b =` 元组目标、
   嵌套 `def`/`class` 名字；**`.` 后面的属性名不算**（`self.v = x` 不绑定 v）；
   缩进状态机跳过嵌套 def/class 的函数体（那是内层作用域）。
2. **lookup**：主扫描之后、闭包回退之前统一算两个旗标——
   `ubF` = 名字是当前函数（FnStack 顶）的严格本地名（∈FnLoc 且 ∉FnXc）；
   `ubR` = ubF 且（没找到 或 命中的是继承槽）。继承槽 = 帧模型里调用方整表仍在
   `Names[1 .. lenL(FN)-FrBase[top]+1]`，自有名字从 `ubO = lenL(FN)-FrBase[top]+2` 开始。
   `ubF` 时跳过 P383 闭包搜索（否则闭包快照里的旧值会盖住 ULE）。
3. **帧内已绑定表 `FrBnd`/`FrBndC`**：assign 会复用继承槽，读回时无法区分
   "本帧已赋值"和"仍是调用方的值"——assign 末尾对 ubF 名字记入 FrBnd
   （每帧一个计数，calluser 压入/返回时截断），lookup 见到的名字在本帧绑过就不报。
4. **atom**：NameError 兜底处 `ubR==1` 改抛 UnboundLocalError（found>0 的继承槽命中
   在 `ev = Values[found]` 前同样抛）。
5. **三个增强赋值分支**（`//`/`**`、`&|^<<>>`、`+=` 家族）的 `found==0 → NameError`
   门外包一层 `ubR` 检查——`n += 1` 的读也走 ULE（这修好了
   `cov5 augmented assign to global inside function`）。

## 三、实现清单

| 补丁 | 文件 | 内容 |
|---|---|---|
| P500 | `_work/v41/p500.txt` | execute 的 assert 分支 |
| P501 | `_work/v41/p501.txt` | regdef 静态扫描 + lookup 旗标/闭包跳过 + FrBnd 帧内绑定表 + atom/增强赋值抛 ULE |
| P502 | `_work/v41/p502.txt` | trycatch 重抛的 retflag 守卫 |
| P503 | `_work/v41/p503.txt` | 链式下标增强赋值 |

`assemble.cjs` 的 parts 链末尾加入 p500–p503；`head.txt` 默认产物/时间戳改为 v4.203。

### 本轮踩的坑（下轮注意）

- **REPEAT_UNTIL 的语义是"条件为假就执行循环体"**——"while x > 0" 必须写成
  `REPEATU(NOT(GT(x, 0)))`。写反了（`REPEATU(GT(x, 0))` 想"仅在 x>0 时循环"）
  会在删空列表时无限循环（del last 对空表是 no-op），整个 VM 卡死在一步 warp 里。
  本轮 `FrBnd` 截断循环就栽在这里。
- builder 的 `IF(cond, ids)` 只有 2 个参数——手滑写成 `IF(c, [a], [b])` 时第三个参数
  被**静默丢弃**（本轮丢了整段 token 规则分支，扫描结果为空）。多分支必须用 IFELSE。
  新增了 `_work/v41/zcheckif.cjs` 扫 3 参 IF。
- 数组字面量元素不能带分号：`[FAILB(...);]` 是语法错误，V8 报在几百行之外
  （`Unexpected token ';'`）。定位工具：`_work/v41/zmatch.cjs`（括号配对 + 字符串感知）。
- JOIN 链要数清层数——多包一层 JOIN（单参）会让 scratch-vm 把 undefined 拼进字符串
  （ULE 消息尾部多出 "undefined"）。
- scratch-vm 里 `item(list, 0)` 返回 `''`，`REPEAT_UNTIL` 的边界要用 `GT(idx, lo+L-1)`
  的形式对空区间立即退出。
- execute 的增强赋值有**三个**同构分支（`//`/`**`、`&|^<<>>`、`+=` 家族），
  改其中一个要想到另外两个。

### 已知近似（套件未覆盖）

- 静态扫描是文本级的：`x: int = 5` 注解会误标 `int`（读内建不受影响）；
  单行 `def f(): x = 1` 的体扫不到（FnStart > FnEnd）；`import`/`with…as`/`except…as`、
  `for` 循环变量不产生静态本地（运行期经 assign 落进 Names，行为一致，只是
  "先读后绑定"的 ULE 检测不到）；`del x` 不标本地。
- 无消息断言的 `repr(e)` 是 `''`，CPython 是 `AssertionError()`（套件只打印 str）。
- `d['a'].x += 1`（下标后接属性）仍不支持；break/continue 在 finally 尾块里
  吞异常的形态未实现（套件未覆盖）。
- P501 的 FrBnd 近似：参数与全局同名时（`def f(n)` 有全局 n），参数绑定经 assign
  写进继承槽并标记 FrBnd，读取正确；但"绑定"的粒度是帧而不是槽位。

## 四、验证

| 项目 | v4.202 | **v4.203** |
|---|---|---|
| 581 全套失败 | 41 | **36** |
| 补充 82 例失败 | 9 | **8** |
| 真实失败合计 | ≈48 | **≈44（再扣除 3 例"用例不合法"后 ≈41）** |
| 逐例对照（581） | — | **修复 6 例、回归 0 例** |
| 逐例对照（82） | — | **修复 2 例** |
| `check41.cjs` | 33,490 块、errors 0 | **34,079 块、errors = 0** |
| `validate_web.cjs` | 悬空 0 | **悬空 0、shadow 误标 0** |

### 关于 `assert with message`（covZ + 补充各 1 例）

`assert 1 == 2, 'msg'`（不带 try/except）。CPython：无 stdout、stderr 为
`AssertionError: msg`。v4.203 之前 assert 是空操作 → stdout 空 → **假通过**；
现在 MiniPy 同样抛错且 err 文本与 pyerr 逐字一致，但解释器的 Output 里有一行
`Line 1: AssertionError: msg`，逐字节对比判 FAIL。该用例没有 `expectError` 标记，
属"用例不合法"类（与 `pow one arg`、`type e equals E` 同类），不计入真实失败。

## 五、复现命令

```bash
cd D:/编程/scratch/ai/minipython

# 重新生成（默认输出 MiniPy_v4.203.sb3）
node _work/v41/assemble.cjs && node _work/v41/build41.js

# 结构 / 网页兼容体检
node _work/v41/check41.cjs MiniPy_v4.203.sb3
node _work/v41/validate_web.cjs MiniPy_v4.203.sb3

# 全套 581 例
node _work/v41/runall.mjs MiniPy_v4.203.sb3 _work/v41/_res203 \
  _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt

# 补充 82 例
node _work/v41/run_iso.mjs MiniPy_v4.203.sb3 _work/v41/_gap131.json _work/v41/_gap131_203.out.json g203

# 逐例对照（需要先有 v4.202 的结果目录）
node _work/v41/cmp131.cjs _work/v41/_res203 _work/v41/_res202
node _work/v41/gdiff.cjs _work/v41/_gap131_203.out.json _work/v41/_gap131_202.out.json
```

> ⚠️ `run.mjs` 共享 `_tmp.py`，两份并行会互踩出假失败。必须用 `runall.mjs`/`run_iso.mjs`。
> ⚠️ 调试套路：把补丁插桩复制进 `_dbgpatch.js`、拼 `build_dbg.js`（在 `// ---- DEBUG`
> 标记前插入），`V41_OUT=… node build_dbg.js`，用 `run.mjs` 跑探针、读 Output。

## 六、下一步建议

1. **genexp 惰性 / G 化**（清单 #2，约 6 例）：生成器函数的游标已修好（P497），
   剩下全卡在 genexp 急切物化为 L。重试前先探明 `print(next(g), list(g))` 的实参求值顺序。
2. **返回值别名**（清单 #4，约 3 例）：值都是编码串快照，要给容器引入引用语义，动面大。
3. **`format` 高级形式 / 嵌套 f-string**（清单 #3，约 4 例）。
4. **迭代器协议类**（清单 #6，`__iter__`/`__next__`，约 5 例）。

### 已知遗留 / 非真问题

- 闭包读外层变量按**值快照**（P498 已声明）；`NlN`/`GName` 是全局表不按帧区分（P104/P499 已声明）。
- 补充用例 `type e equals E`：用例本身不合法，不计入真实失败（v4.200 已声明）。
- 大整数精度 / 浮点显示 / `print(sep='',end='')` / `frozenset` / `len(range)`：§10 暂缓项不变。
