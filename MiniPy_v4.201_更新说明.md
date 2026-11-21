# MiniPy v4.201 更新说明

## 本轮目标

按《已知问题清单_v4.200.md》的"下一步建议"执行前四项，并额外做掉两项相邻问题：

1. 闭包返回 / `nonlocal`（清单 #1）
2. 生成器对象标识（清单 #2）
3. 运算符重载 `__lt__`（清单 #3）
4. 实例 `repr`（清单 #4）—— 改为做**方法返回值 / 方法值提取**（同一"类与对象小尾巴"族，且能修好）
5. 顺带：`filter(None, …)` 真值（清单 #8）、反斜杠续行（清单 #9）

结果：**581 全套 55 → 43 失败；补充 82 例 15 → 10 失败；逐例对照修复 17 例、回归 0 例、新增失败 0 例。**

## 一、修好了什么

### 581 全套（修复 12 例）

| 用例 | 之前 | 现在 |
|---|---|---|
| `covY method returns self attribute pop` | `<S object>` | `2` |
| `cov6 class with list of objects and methods` | `2 <Stack object> 1` | `2 2 1` |
| `cov6 calling method stored in variable` | `AttributeError: 'T2' object has no attribute 'f'` | `6` |
| `cov6 operator overloading lt for sort` | `TypeError: '<' not supported…` | `['1', '2', '3']` |
| `covY sorted custom objects needs lt` | 同上 | `[1, 2, 3]` |
| `cov5 builtin map filter reduced` | `[1, 'a', None, [], 0]` | `[1, 'a', [0]]` |
| `cov9 backslash in string is not continuation` | `a b` | `ab` |
| `covC closure returned and called` | `NameError: n` | `6` |
| `covY closure returned lambda called` | `NameError: n` | `6` |
| `cov5 function returning function` | `NameError: n` | `6 0` |
| `cov7 generator in for loop` | `TypeError: comprehension needs an iterable` | `[0, 1, 2, 3]` + `v 0 v 1 v 2` |
| `covY comprehension over generator function` | 同上 | `[1, 2]` |

### 补充 82 例（修复 5 例）

`backslash continuation in string literal`、`method value extraction`、
`self.data.pop returns object`、`operator overload lt sorted`、`closure returned`。

```python
class Stack:
    def __init__(self):
        self.data = []
    def push(self, v):
        self.data.append(v)
    def pop(self):
        return self.data.pop()      # ← 之前返回 <Stack object>，现在返回弹出的值
    def size(self):
        return len(self.data)

s = Stack()
s.push(1); s.push(2)
print(s.size(), s.pop(), s.size())   # 2 2 1

class T2:
    def f(self, x):
        return x * 2
t = T2()
m = t.f                              # ← 之前 AttributeError，现在是绑定方法值
print(m(3))                          # 6

class P:
    def __init__(self, n): self.n = n
    def __lt__(self, other): return self.n < other.n
print([p.n for p in sorted([P(3), P(1), P(2)])])    # [1, 2, 3]

print(list(filter(None, [0, 1, '', 'a', None, [], [0]])))   # [1, 'a', [0]]
print('a\
b')                                 # ab

def adder(n):
    return lambda x: x + n
print(adder(5)(1))                   # 6
```

## 二、七个根因

### 1）方法返回值被接收者写回覆盖（P492）

`methodcall2` 处理点号链（`self.data.pop()`）时分三步：求接收者 → 把接收者存进 `__recv`
并改写记号 → 走普通 `methodcall` → **用 `pathset` 把变后的接收者写回原路径**。
问题是 `pathset` 求值路径时会把 `ev/evtype` 覆盖成路径的中间值（实例），
方法的返回值就此丢失。插桩实测：

```
DBG methodcall lo=5 hi=9 Tok[lo]=__recv
DBG pop Tok[lo]=__recv xa=\x1fN1\x1fN2 xb=L      ← 列表方法算对了
x= <S object>                                     ← 但 ev 被 pathset 改回实例
```

修法：`pathset` 前后保存/恢复 `ev/evtype`。

### 2）属性读取不认方法（P493）

`m = t.get` 走 3 记号属性读取分支，只查实例属性表 `IAttr*`，查不到就 fail。
新增：查不到时若 `<类>.<名>` 在 `FnName` 里，返回绑定方法值（`evtype='M'`，
值形如 `"<实例id>.<方法名>"`）。两处配合：

- `callfn` 入口：`Types=='M'` → 拆出实例 id 与方法名 → `callmeth`；
- 名字调用路径的可调用判定不认 M，会落到 `'object' object is not callable`，
  于是在 `not callable` fail 的守卫前加一条 `IF(evtype=='M')` 逃生门，转交 `callfn`。

### 3）`lcmp` 不认 `__lt__`（P494）

`lsort`/`sorted`/`min`/`max` 的比较统一走 `lcmp`，而 `lcmp` 对 O/O 直接
`tname + fail("'<' not supported…")`。P426 给 `<` 运算符加的 `__lt__` 分派只覆盖
**记号里有左右操作数**的情形，排序没有记号。

修法：`lcmp` 开头加 O/O 分支——`<类>.__lt__` 已注册时用 dunder 比较
（`lt(a,b)` 真则 −1；否则 `lt(b,a)` 真则 +1；否则 0）。

传参是个坑：实例不能像 `callval` 那样 repr 后 tokenize（会变成 `<P object>` 文本）。
解法是把右操作数 `assign('__ltarg', lcb, lcbt)` 注册成**用户层变量**，再 `tokenize('__ltarg')`——
用户函数的形参表达式求值时按名字查的就是 Names 表。调用会摧毁 `Tok/Kind`，
结束前 `tokenize(Code[pc])` 还原（`callval` 同款）。

### 4）`filter(None, …)` 的真值表是手写的（P495）

P262 的 filter 分支自建了一张 `mpkeep` 真值表，漏了 `None`（`Z`）与空列表；
另外元素用 `enc` 原样拼回，嵌套容器的编码里带 `lsep` 会破坏外层元素边界
（`[0]` 读回来变成 `0`）。

修法：整个 else 分支换成 `truth(mpel, mpelt)`（解释器的权威真值过程），
元素先 `lesc` 再 `enc`。

### 5）字符串内的反斜杠续行被当成空格（P496）

`joinlines` 因"括号未闭合"继续拼行时，分隔符一律是空格（`xgsep=' '`），
字符串内的 `\<换行>` 就变成 `\ `，再被字符串扫描器当成转义空格 ⇒ `a b`。
CPython：字符串内 `\<换行>` = 什么都不产生。

修法：行尾状态检查里，若"仍在单引号/双引号字符串内（非三引号）且行尾是反斜杠"，
置 `xgb=1`（让既有的"剥掉行尾反斜杠"分支生效）且 `xgsep=''`。三引号行为不动。

### 6）lambda 没有闭包快照（P498）

P383 给 `regdef` 加了"快照当前可见环境到 `CloB/CloN/CloV/CloT`"，
配 `lookup` 末尾的 `FnStack` 回退查找——但 `lambda` 走的是 `reglam`，一个字都没存。
所以 `return lambda x: x + n` 出来的函数拿不到 `n`。

修法：把 P383 的 regdef 尾部原样接到 reglam 末尾（`FnName` 条目已在尾部之前登记，
`llen(FnName)` 就是这个 lambda 的 fi，回退查找用的正是 `FnStack` 栈顶的 fi）。

已知近似：同一 lambda 的多个存活闭包共享一份快照（后建覆盖先建）。
现有失败用例都是"先建先调、再建再调"的顺序用法，不受影响。

### 7）生成器函数被当作"不可迭代"（P497）

`[v for v in gg()]` 与 `for v in counter(3)` 都报
`TypeError: comprehension needs an iterable`：`cdo`（推导驱动）与 `forloop` 的
类型分派只认 L/T/D/K/V/I/S，生成器的 G 不在这里面。

修法：新过程 `gslice gid`（把 `ItSrc[gid]` 从 `ItPos[gid]` 切到尾、推进游标、给 L）
与新过程 `gconv`（G 值 → 登记/查 `GIt/GId` 得迭代器 id → `gslice`），三处接上：

- `callfn` 的 `list()` Y 分支改为切片（P461 的行为升级：`next(g)` 之后 `list(g)` 只剩尾部）；
- `cdo` 的 iterable 守卫前：G → `gconv`（并把 `cltyp` 置 L）；
- `forloop` 的 L/T/G 分派前：G → `gconv`。

`next()` 本来就在推进 `ItPos`，所以生成器函数的复用/续读语义现在与 CPython 一致。

## 三、没做成的（明确回退）

**genexp 惰性化**（清单 #2 剩下的 2 例 `comprehension reusing a generator` /
`generator expression vs list comp`）仍然是失败。根因是"genexp 立即物化成列表"
（文档 §2 早已声明的偏差），游标机制对它无效。

本轮试过在 P235 的括号剥离点检测"内层有深度 0 的 `for`"并把结果从 L 改标 G（P499），
G 化本身成功（`evtype` 确实变成 G），但 `print(next(g), list(g))` 立刻
`StopIteration` —— 疑似 printargs 的实参求值顺序或重复求值。已整段回退，构建保持干净。

下一轮重试之前，先用探针确认 `print(next(g), list(g))` 里两个实参的求值次数与顺序。

## 四、踩坑记录（下轮注意）

1. **`spliceAfter(afterId, firstId)` 的第二个参数是块 id，不是数组。** 传 `[id]` 会让
   `next` 变成数组、整棵子树被 prune 成孤儿（`STRUCTURE ERROR: N non-top blocks without parent`）。
   本轮在 P493b、P494、P496、P499 上踩了四次。
2. **`JSON.stringify(block.inputs)` 不含引用块的内部文本。** 按字面量定位块必须顺着引用
   走子树（`subtreeHas` 模式）；而且字段值可能是 shadow 包裹（`VALUE=[1,[4,"0"]]`），
   判等时要拆一层。
3. **用户层形参按名字查的是 Names 表，不是 Scratch 变量表。** 给 dunder 传实例只能
   `assign('__ltarg', …)` 注册成用户变量，再 `tokenize('__ltarg')`；用 Scratch 变量
   （`newVar`）会得到 `NameError: name '__ltarg' is not defined`。
4. **eval 里有两套属性读取分支**：3 记号的 `iid + Tok[lo+2]` 版，与链式的 `atid + atnm` 版。
   插桩/改逻辑时两个都要打，否则会插进一条永不执行的死路。
5. **`lcmp` 里有历史克隆的两处同文 fail**，锚点会命中两个；改成按过程体首条语句定位最稳。
6. **调试套路**：把插桩补丁写进 `_dbgpatch.js`，在 `// ---- DEBUG` 标记前拼出 `build_dbg.js`，
   `V41_OUT=… V41_JSON=… node build_dbg.js` 构建，再用 `run.mjs` 跑单例探针读 Output。
   比静态读 34,000 行拼装后的代码快得多。

## 五、复现命令

```bash
cd D:/编程/scratch/ai/minipython

# 重新生成（默认输出 MiniPy_v4.201.sb3）
node _work/v41/assemble.cjs && node _work/v41/build41.js

# 结构 / 网页兼容体检
node _work/v41/check41.cjs MiniPy_v4.201.sb3
node _work/v41/validate_web.cjs MiniPy_v4.201.sb3

# 全套 581 例
node _work/v41/runall.mjs MiniPy_v4.201.sb3 _work/v41/_res201 \
  _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt

# 补充 82 例
node _work/v41/run_iso.mjs MiniPy_v4.201.sb3 _work/v41/_gap131.json _work/v41/_gap131_201.out.json g201

# 逐例对照（v4.200 基线）
node _work/v41/cmp131.cjs _work/v41/_res201 _work/v41/_res200
node _work/v41/gdiff.cjs _work/v41/_gap131_201.out.json _work/v41/_gap131_200.out.json
```

## 六、下一步建议

1. **`nonlocal` 写回**（清单 #1 残余，约 4 例）：P498 的闭包快照已经有位置可挂。
   `nonlocal n; n += 1` 的 SyntaxError 需要先认这条语句；写回则是在 `assign` 时
   若名字是捕获名就同步更新 `CloV`。`closure counter without nonlocal`
   （应为 UnboundLocalError）需要"函数体内被赋值的名字是本地"的判定。
2. **`finally` 吞返回**（清单 #6，约 3 例）：`finally: return 'fb'` 应覆盖
   异常路径上的传播，现在是异常直接跑出去。
3. **genexp 惰性/G 化**（清单 #2 残余，约 4 例）：先探明 `print(next(g), list(g))`
   的实参求值顺序（见 §三）。
4. **`assert` 语句**（1 例，`cov6 assert statements`）。
5. 实例 `repr` 的 `__main__.`/地址（约 2 例）**不建议修**：
   `<__main__.X object at 0x…>` 的地址在逐字节对比下不可能匹配 CPython。
