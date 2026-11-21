# MiniPy v4.204 更新说明

## 本轮目标

按《已知问题清单_v4.203.md》的排序与"下一步建议"完成 4 个点：
**① 生成器对象标识 / genexp 惰性（清单 #1，3 例）**、**② format 高级形式 / 嵌套
f-string（清单 #2，3 例）**、**③ 迭代器协议 / 解析遗漏（清单 #4，cov6 实例序列协议）**、
**④ realistic 类解析遗漏——运算符内容字符串字面量（清单 #4 落解析，cov8 class based bank）**。

结果：**581 全套 36 → 28 失败（修复 8 例、回归 0 例）；补充 82 例 8 → 8（0 修复 0 回归）。**

## 一、修好了什么

| 用例 | 之前 | 现在 |
|---|---|---|
| `cov8 realistic: class based bank` | `Line 17: SyntaxError: expression`（`'+' + str(amt)`） | `150.0 120.0 120.0` `err insufficient` `['+50.0', '-30.0']` |
| `cov6 operator overloading len getitem` | `Line 9: SyntaxError: expression`（`s[1:]`） | `3 10 30 [20, 30]` + `for v in s` 逐元素 |
| `cov7 generator expression vs list comp` | `0 [0, 1, 2]` | `0 [1, 2]` |
| `cov7 comprehension reusing a generator` | `[0, 1, 2] [0, 1, 2]` | `[0, 1, 2] []` |
| `cov7 generator exception propagation` | `Line 4: ValueError: gen`（调用时炸） | `1` `gen err gen` |
| `cov10 nested fstring in format` | `Line 2: KeyError: 'w'` | `    3.14       42|` |
| `cov2 format nested spec and paths` | `Line 2: SyntaxError: expression` | `b a 20` |
| `cov2 format errors caught` | `Line 2: IndexError: ...` | `ve` `ie` |

```python
# ① 运算符内容的字符串字面量（左操作数位置）
self.log.append('+' + str(amt))      # 之前直接 SyntaxError

# ② 实例序列协议：len/__getitem__/负下标之外，补切片与 for
s[1:]                                 # 逐元素 __getitem__(1), __getitem__(2)
for v in s: ...                       # __getitem__ 序列协议（IndexError 收尾）

# ③ genexp 带游标（G 化）
g = (x for x in range(3))
print(next(g), list(g))               # 0 [1, 2]
print([v for v in g], [v for v in g]) # [0, 1, 2] []
def bad():
    yield 1
    raise ValueError('gen')
g = bad()                             # 调用不再当场炸
print(next(g))                        # 1
next(g)                               # 这时才 ValueError: gen

# ④ format / f-string
w = 8
print(f'{3.14159:{w}.2f}')            #     3.14（嵌套说明符按表达式求值）
print('{0[1]} {0[0]}'.format(['a','b']), '{a[1]}'.format(a=[10,20]))  # b a 20
try: print('{'.format())              # ValueError: Single '{' encountered in format string
except ValueError as e: print('ve')   # ve
```

附带收益（套件未覆盖但顺带正确）：`','.join(str(x) for x in range(4))`（genexp 作
join 实参）、`sum(x for x in ...)` 现在会**消费**生成器（之后 `list(g)` 为空，与
CPython 一致）、两次运行的生成器游标不再互相污染。

## 二、根因与修法（P504–P507）

| 补丁 | 内容 |
|---|---|
| P504 | eval 算子扫描的"前一个 token 是运算符 ⇒ 这个 +/- 是一元"回看只比文本不看 Kind：`'+'` 字符串字面量（Kind=S）作左操作数时，紧随其后的**真二元 `+`** 被改排成一元加 → SyntaxError。修法：`AND(<原条件>, NOT(EQ(eprevK,'S')))`——eprevK（Tok[ek-1] 的 Kind）扫描时已捕获。P211 给行首一元加过同款守卫，这是同族检查的另一半 |
| P505 | format/f-string 三件：**(a)** fstr 的字段闭括号扫描加 `{}` 计数（fzbd），`{3.14159:{w}.2f}` 不再在 `{w}` 的 `}` 处截断；**(b)** f-string 说明符里的 `{...}` 在交给 flditem 前按 **f-string 语义**（外层作用域表达式）tokenize+eval 展开（P160 的 .format 语义查 FmtK 会 KeyError）；**(c)** strfmt 的字段扫描结束后 `sfk > len(s)` 即未闭合 `{` → `ValueError: Single '{' encountered in format string`（挂在 sfa 更新点，named/positional 分派之前）；**(d)** P155 的 fpath 用 `assign __fmt + tokenize + eval` 求路径，**tokenize 覆盖外层行 Tok 且不经 calluser（无自动恢复）**——两个带路径的 format 调用同 print 才炸。修法：进出保存/恢复 Tok/Kind/count（FpT/FpK/fpC） |
| P506 | 实例序列协议：新过程 **objiter**（`__iter__`→循环 `__next__`（StopIteration 清 error 收尾），否则 `__getitem__(0,1,2,...)` 序列协议（IndexError 收尾））；**forloop** 与 **next()** 接入（两处 callfn/callfnW 副本都插）；**indexget 的 O 分派**加切片路径：区间含深度 0 冒号时 eval 两端（缺省 0/开区间）、负边界才借 `__len__` 归一化、逐元素 `__getitem__` 收集（`oiK/oiHF` 等）。**注意 callfn 有两条实路径（IFELSE 一侧 callfnW 一侧内联），钩子必须两份都插** |
| P507 | genexp G 化 + 生成器错误延迟：P126 的 eval 挂点把 complist 结果标 **G**（编码串不变，带上游标语义）；消费侧逐个补 gconv（list/tuple/enumerate/sorted/anyall × callfn+callfnW、sum、join、cdo 的 G 守卫补 `clist=ev` 回写——P497 只回写了 cltyp，游标推进了 walk 却仍用完整 G 串）；**P52 的 G 组装点**：函数体预跑出错但已有 yield 时把错误存 GErrV/GErrE/GErrP、清 error、照常返回 G——next() 耗尽分支与 gslice 查表改抛存的错误并删表项（CPython 语义：错误冒一次，之后 StopIteration）；RUN 启动清理 GIt/GId/ItSrc/ItPos/GErr*（原先不清理，上一用例耗尽的游标污染下一用例）；**gslice 全新游标（ItPos==1）直通**——按 L 重释 G 串（保住含容器元素的编码；元素级重编码曾把 `yield 1, 2` 的元组拆成 6 段）；strval 对 G 按列表格式化（print(genexp) 维持 `[0, 1, 2]` 形态） |

## 三、实现清单

| 补丁 | 文件 | 内容 |
|---|---|---|
| P504 | `_work/v41/p504.txt` | eval eprev 一元回看的 Kind 守卫 |
| P505 | `_work/v41/p505.txt` | fstr 括号计数 + spec 嵌套字段展开 + strfmt 未闭合 `{` + fpath 现场保存 |
| P506 | `_work/v41/p506.txt` | objiter + forloop/next 接入 + indexget 实例切片 |
| P507 | `_work/v41/p507.txt` | genexp G 化 + 消费侧 gconv + 生成器错误延迟 + 运行起点清理 + gslice 直通 + join/sum/cdo/strval 配套 |

`assemble.cjs` 的 parts 链末尾加入 p504–p507；`head.txt` 默认产物/时间戳改为 v4.204。

### 本轮踩的坑（下轮注意）

- **callfn 有两条实路径**：IFELSE 一侧 `callfnW`（完整分支副本），另一侧内联。钩子只插
  一份 = 插在不跑的那份上（探针单发全过、套件里照样挂）。list/tuple/enumerate/sorted/
  next/anyall 两份都要插（各恰好 1 份，可作数量断言）。
- **共享块 = 多主**：一个表达式块树喂多个挂点（如 hasProtoObj 同时给 2 个 list 钩子和
  forloop 钩子），webfix/求值都会坏。每个使用点必须用工厂函数现场重建（P211 的老教训）。
- **indexget 的 `igev` 是全局 scratch**：方法体里的嵌套 indexget（`self.items[i]`）会把它
  覆盖——循环第二次 callmeth 就拿错对象。跨 callmeth 使用的值先快照到私有变量。
- **objiter/切片为合成参数设 `count=1`**：calluser 的 fpush/fpop 不保存 count，泄漏回
  表达式层（eval 的算子扫描按 count 循环）→ 下一个 eval 空区间报 missing expression。
  进出保存/恢复 count。
- **gslice 元素级重编码破坏容器元素**：`yield 1, 2` 的 G 串按元素切再拼会把元组拆散。
  全新游标（ItPos==1）直接按 L 重释原始编码串。
- **`REPEATU(cond, body)` 的 cond 是"直到"条件**；且 stop 判定发生在 body 之前——
  匹配括号的"深度减到 0"必须像 P160 那样把减法放 body、条件看**自增前**的深度，
  否则匹配的 `}` 会被 body 消费掉、扫描过冲（本轮 fstr 内扫第一版踩的就是这个）。
- **find() 返回 id 数组**：`compPairs[0].next` 直接取是 undefined（要 `BL()[x].next`）；
  `spliceAfter(id, arr)` 只收单 id，要 `chain(arr)`。
- 补丁建的块**没有 parent 指针**（relinkParents 在构建收尾才跑）——找宿主 IF 别用
  `.parent`，扫 SUBSTACK 头或用 predecessorOf。
- **跨用例游标污染**：GIt/GId/ItSrc/ItPos 原先不在 RUN 启动清理清单里，串行套件里
  同编码串的 genexp 开局即耗尽。已补清理（GErr* 一并）。

### 已知近似 / 未达项

- **`list(实例)` 未挂**（cov7 iterator protocol on custom class 仍在）：callfnW 的表达式
  上下文里 objiter 的合成 token/count 与内层求值相互踩（missing expression），本轮让步
  未挂。for/next/切片三条路已可用；`it = It(); next(it)`、`for v in it` 都对，只差 `list(it)`。
- **generator short circuit**（any/all 对 genexp 短路）不修：genexp 仍是急切物化，
  副作用顺序无法对齐，要真惰性才行。
- **covZ genexp is a list**：`print(g)` 输出 `[0, 1, 2]`，CPython 是带地址的
  `<generator object ...>`——逐字节对比不可过，维持已声明偏差。
- **`s[-1:]` 形态**（负边界 + 类没有 `__len__`）：负边界归一化需要 `__len__`，没有就报
  `has no attribute __len__`；`s[1:]`/`s[:n]`/`s[a:b]` 不受影响。
- **spec 嵌套嵌套**（`{x:{y:{z}}}`）不支持（P160 同款限制）；`.format` 的 `'{:{w}}'`
  原本就好的路径未动。
- **RLE 的串行污染老 bug 未修**（见清单 v4.204 §新增）：`while-else` 用例 +
  `break/continue` 用例连跑后，函数内 `while + if/else` 首轮双分支执行；v4.202 已存在，
  单程序无法复现，属解释器循环/else 状态机深层问题。

## 四、验证

| 项目 | v4.203 | **v4.204** |
|---|---|---|
| 581 全套失败 | 36 | **28** |
| 补充 82 例失败 | 8 | **8** |
| 逐例对照（581） | — | **修复 8 例、回归 0 例** |
| 逐例对照（82） | — | **修复 0、回归 0** |
| `check41.cjs` | 34,079 块、errors 0 | **34,493 块、errors = 0** |
| `validate_web.cjs` | 悬空 0 | **悬空 0、multiOwnedInlineable 0、shadow 误标 0** |

失败构成（28 例，与 §10 暂缓项对齐）：大整数/浮点显示/round 12、返回值别名 2、
genexp 短路 1、list(实例) 1、实例 repr 地址 2、cov8 RLE（串行污染）1、
pow 报错用例 2、frozenset 1、range 形式 1、format negative and sign 1（用例缺 try）、
assert with message 1（用例不合法）、covD sep/end 1、cov5 builtin range forms 1。

## 五、复现命令

```bash
cd D:/编程/scratch/ai/minipython

# 重新生成（默认输出 MiniPy_v4.204.sb3）
node _work/v41/assemble.cjs && node _work/v41/build41.js

# 结构 / 网页兼容体检
node _work/v41/check41.cjs MiniPy_v4.204.sb3
node _work/v41/validate_web.cjs MiniPy_v4.204.sb3

# 全套 581 例
node _work/v41/runall.mjs MiniPy_v4.204.sb3 _work/v41/_res204 \
  _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt

# 补充 82 例
node _work/v41/run_iso.mjs MiniPy_v4.204.sb3 _work/v41/_gap131.json _work/v41/_gap131_204.out.json g204

# 与上一版逐例对照
node _work/v41/cmp131.cjs _work/v41/_res204 _work/v41/_res203
node _work/v41/gdiff.cjs _work/v41/_gap131_204.out.json _work/v41/_gap131_203.out.json
```

> ⚠️ `run.mjs` 共享 `_tmp.py`，两份并行会互踩出假失败。必须用 `runall.mjs`/`run_iso.mjs`。
> ⚠️ 调试套路：把探针补丁写进 `_dbg506.js`，`node _work/v41/_make_dbg.cjs` 拼
> `build_dbg.js`，`V41_OUT=… node build_dbg.js` 出 `_dbg506.sb3`，用 `run.mjs` 跑探针、
> 读 Output（`log %s` 写 Output 列表）。

## 六、下一步建议

1. **`list(实例)` 的挂点**（cov7 iterator protocol，约 1 例）：objiter 已可用，问题只在
   callfnW 表达式上下文里的现场互踩。可试"把 O→L 转换提到 callfnW 的**实参预求值**
   之后、分支分发之前"，或给 objiter 的合成调用改走 fpath 式临时全局名。
2. **RLE 串行污染老 bug**（1 例）：`while-else` + `break/continue` 用例连跑后，函数内
   `while + if/else` 双分支。需要给循环/else 状态机找泄漏点（RUN 启动清理清单之外
   还有残留变量）。
3. **返回值别名**（清单 #3，2 例）：仍需引用语义，动面大。
4. **`format negative and sign`**：用例缺 try，建议修用例（加 expectError）。
