# MiniPy v4.234 更新说明

本轮按 v4.233「下一轮建议」第 1/3/4 条，**完成 3 大类**：

1. **深层属性链**（P732）：3 级以上 `a.X.Y.Z` 读取、赋值、自增赋值、错误消息；
2. **科学计数法精确舍入**（P733）：`%e`/`%E`/`%g` 按双精度的精确二进制值舍入（平局取偶）；
3. **`%r` 与 `__repr__` 回退**（P734）：`'%r' % 对象`、精度截断、只有 `__repr__` 的对象在 `%s`/f-string/`format` 下的渲染。

**构建**：`MiniPy_v4.234.sb3`（2026-11-21，总 **52,934** 块，Interpreter **50,3xx**，
vars 2,200，lists 285，`check41 errors=0`）

## 一、结果总览

| 套件 | v4.233 | **v4.234** |
|---|---|---|
| 新套件 `_v234_chain`（12） | — | **12/12** |
| 新套件 `_v234_exp`（10） | — | **10/10** |
| 新套件 `_v234_repr`（28） | — | **28/28** |
| 主套件+探针 `_new*`+`_cov*`（873） | 873/873 | 见五（实测） |
| 跨模块回归 `_reg232`（593） | 582/593 | 见五（实测） |
| `_v233_*` 五套（84） | 15/16+16/16+19/19+18/18+16/16 | 见五（实测） |
| 异常专项 / mods / `_real*` / raw / gap131 | 见 v4.233 | 见五（实测） |
| 内置 demo / `check41` | 20/20、errors=0 | 见五（实测） |

## 二、行为对照（3 大类）

```python
# 1. 深层属性链（数据链、类属性、容器根、方法根、自增赋值）
class N:
    def __init__(self, v, nx=None):
        self.v = v; self.nx = nx
a = N(1); b = N(2, a); c = N(3, b); d = N(4, c)
print(c.nx.nx.v)        # 1（原 3？实际读成 c.nx.nx.nx → None 或错值）
print(d.nx.nx.nx.v)     # 1
c.nx.nx.v += 5
print(a.v)              # 6（原 SyntaxError: expression）
print(d['k'].nx.nx.v)   # 链式读取
x = 5
print(x.foo)            # AttributeError: 'int' object has no attribute 'foo'
                        # （原消息用了上一个链的陈旧属性名）

# 2. %e/%g 精确舍入（2.675 的精确值 < 2.675）
print('%.2e' % 2.675)   # 2.67e+00（原 2.68e+00）
print('%.0e' % 3.5)     # 4e+00  （平局取偶；原 3e+00）
print('%.0e' % 2.5)     # 2e+00  （平局取偶；原 3e+00）
print('%.3e' % 9.9995)  # 9.999e+00（进位链修正）
print(f'{9.9995:.4g}')  # 9.999 （原 10）
print('%.1e' % 1e-300)  # 1.0e-300
print('%.1f' % 0.04)    # 0.0（P729 短路臂 R/B 比较错误，原 0.1）

# 3. %r 与 __repr__ 回退
class P:
    def __str__(self): return 'STR'
    def __repr__(self): return 'REPR'
p = P()
print('%r' % p)         # REPR（原 NameError: name '.__repr__' is not defined）
print('[%.2r]' % 'abcdef')   # ['a（精度截断）
class Q:
    def __repr__(self): return 'QR'
q = Q()
print('%s' % q)         # QR（原 <__main__.Q object at 0x…>）
print(f'{q}', '{}'.format(q), format(q, ''))  # QR QR QR
e = Q()  # 只有 __repr__ 的异常子类
class E(Exception):
    def __repr__(self): return 'E_REPR'
print(str(E('x')))      # x（继承 BaseException.__str__，不回退 __repr__）
```

## 三、实现（P732–P734）

### P732 深层属性链
* **根因**：`eval` 的尾属性分支先把属性名存进全局 `atnm`，再递归求值接收者；3 级以上的链在
  递归里把 `atnm` 冲成中间那级的名字 → `a.X.Y.Z` 实际读成 `a.X.Y.Y`（与 exrefsync 无关）。
* (a) 递归 `eval(lo, hi-2)` 之后按 `Tok[hi]`/`Kind[hi]` 复原 `atnm/atnmK`；
* (b) 2 记号属性读（`x.foo`）的 AttributeError 消息改读 `Tok[lo+2]`——`atnm` 在消息 join 里是
  **内联变量描述符** `[12,'atnm',id]`，且可能被 `[3,[12,…],shadow]` 包一层，两种形态都要认；
  三条 `fail` 站点按"最近的含 Tok 条件祖先"（有 `operator_subtract` → 尾属性分支）区分；
* (c) 深层属性目标的**自增赋值**（`c.nx.nx.v += 5` / `l[0].v += 2`）原来没有分派（两条 aug
  分支只认 `x op=` 与 `x.a op=`）。新块在通用赋值分支前扫**深度 0** 的 aug 记号；命中且目标
  以 `.name` 结尾时：`eval(1, k-1)` 读旧值 → `rightside` 算新值 → 把 `Tok[k]` 改成 `'='`、
  值/类型写进 `k+1`、`count=k+1`，交给既有 `pathset` 通用赋值落账。目标可以是
  `a.b.c`、`l[0].a.b`、`d['k'].a.b`（括号根同样走 `eval` 读取）。

### P733 科学计数法精确舍入
* 新过程 **`zfscaled v places`**：把 `|v|` 精确写成 `m·2^-k`（整数 `>2^53` 先折半、小数倍乘到
  整数，步数上界 1200）→ `n≥0` 时给 `A=digits(m)` 补 `n` 个 0、`n<0` 时给 `B=2^k` 补 `|n|` 个 0
  → `bgdv` 长除得 `Q/R` → `2R` 与 `B` 比较定进位（`>` 进、`= 平局取偶`、`<` 不进）→ `zfxQ`；
* `zfexact` 改为**薄包装**（同一套精确除法，左补零到 `n+1` 位）。顺带修掉 P729 在
  `k > 53+4n` 短路臂把 `R` 当 `A` 却仍拿 `B='1'` 比较、导致 `0.04:.1f → 0.1` 的错误；
* `pctitem` 的 `%e/%E` 分支：保留原归一循环只用于**估指数** `p16e`，随后用 `zfscaled` 精确算
  `digits(|v|·10^(ppr-e))`，位数不符按 ±1 修正 `p16e`（最多 3 次，计数器 `zfeRet` 与 zfscaled
  内部 `zfxTry` 分离）；`v==0` 跳过位数修正（位数恒为 1），`-0.0` 由字面首字符补 `psg='-'`；
  宽度/符号/两位指数格式沿用原尾段；`%g` 经 `pctg` 复用 `%e`/`%f`，`pctg` 的指数估计改为
  **按值重新归一 + 精确位数修正**（原 `floor(m·10^(p-1)+0.5)` 半上估计会把 9.9995 抬成 10）。

### P734 `%r` 与 `__repr__` 回退
* 根因（v4.233 结论）：P728 的 conv-'r' 预分支先跑 `reprval` 把全局 `ev` 变成字符串，P288 的
  `%r` 分支随后用陈旧的 `ev` 当 `callmeth` 接收者 → `NameError: name '.__repr__' is not defined`。
* 修法：
  1. `pctitem` 三处 `callmeth` 接收者改 `argOf('vv')`；删除冗余的 conv-'r' 预分支；
     `%r` 增加与 `%s` 同款精度截断（`phas==1` 时截到 `ppr` 个字符）；
  2. 新过程 **`z734str vv vt`**：`O` 且有 `__str__` → `callmeth __str__`；否则 `O` 且有
     `__repr__` → 若不是 BaseException 后代（`isanc`）→ `callmeth __repr__`，是异常 → `strval`
     （异常继承 `BaseException.__str__`，不能回退 `__repr__`）；其余 → `strval`；
  3. 所有"有 `__str__` 才 callmeth、否则 strval"的兜底位点改调 `z734str`：`pctitem` ×2、
     `flditem` ×2（`!s` 与默认）、`fstr`、`callfn`/`callfnW` 的 `format` 与 `str` 分支、
     `builtin2b` 的 `format` 分支（共 9 处）。`reprval` 不改（`repr()` 不得继承 `__str__`）。

## 四、新测试套件（`_work/v41/_v234_*.json`，50 例）

| 套件 | 例数 | 通过 | 覆盖 |
|---|---|---|---|
| `_v234_chain` | 12 | **12/12** | 3/4 级链读取、自增/复合赋值、容器根、方法根、类属性、错误消息、3 级 cause/context 链 |
| `_v234_exp` | 10 | **10/10** | 平局取偶、进位链、二进制噪声、±0、宽度/符号/`%E`、大数/近边界、`%g` 族 |
| `_v234_repr` | 28 | **28/28** | `%r` 原语/对象/宽度/精度、异常、tuple/mapping、`__repr__`-only 在 `%s`/f-string/`format`/`str()` 下 |

> 次正规字面量（`5e-324`、`1e-320`）MiniPy 解析为 0（见七），套件改用可精确解析的
> `2.2250738585072014e-308`/`2.5e-308` 等近边界值；`4.35e18` 用整数形态
> `4350000000000000000`（字面量解析限制同样见七）。

## 五、验证

```bash
node _work/v41/assemble234.cjs
V41_OUT=MiniPy_v4.234.sb3 V41_JSON=_work/v41/project234.json \
  V41_STAMP='MiniPy v4.234 - built 2026-11-21' node _work/v41/build234.js

node _work/v41/run_iso.mjs MiniPy_v4.234.sb3 _work/v41/_v234_chain.json …   # 12/12
node _work/v41/run_iso.mjs MiniPy_v4.234.sb3 _work/v41/_v234_exp.json   …   # 10/10
node _work/v41/run_iso.mjs MiniPy_v4.234.sb3 _work/v41/_v234_repr.json  …   # 28/28
bash _work/v41/_reg234_all.sh        # 全量回归，结果写入 _work/v41/_reg234.log
node _work/v41/check41.cjs MiniPy_v4.234.sb3                                 # errors=0
```

## 六、本轮踩坑（接 v4.233 记录）

1. **`operator_contains` 的 STRING2 把块 id 当字面量**：`txt(blockId)` 会生成 `[10,"boperat_…"]`，
   条件恒假。块引用必须 `B.REP(blockId,[10,''])`，字面量才用 `txt('n')`。P732 的 aug 扫描和
   P733 的平局奇偶判断因此全部失效（平局全都舍下、深层 `+=` 直接 SyntaxError）。
2. **共享计数器被被调过程清零**：`zfscaled` 内部用 `zfxTry` 保护折叠/倍乘循环，`%e` 重试循环
   也复用它 → 每次调用被重置 → 零值/次正规数无限重试（表现为用例挂死、无输出、无错误）。
   计数器分离为 `zfeRet`（`%e` 与 `pctg` 各一份）。
3. **内联变量描述符有两种形态**：`[12,'atnm',id]` 与 `[3,[12,'atnm',id],shadow]`；改写消息时
   两种都要替换，且 `refOf` 只能找到块级引用。
4. **`fail` 站点区分**：尾属性分支与两记号分支的消息都含 `atnm`，按"最近含 `Tok` 的条件祖先"
   是否有 `operator_subtract` 判定归属（前者 `Tok[hi-1]=='.'`）。
5. **REPEATU 极性**（第四次）：zfscaled 的折半/倍乘、pctg 重归一、补零循环一律写"退出条件"。
6. **调试手法**：debug 补丁用 `addTo('Output', …)` 追加进度标记，即使用例挂死也能看到
   标记序列——本轮靠 `DBGS0|1 → DBGS0|2 → …` 直接定位到重试无限循环。见 `p798dbg.txt`/
   `p799dbg.txt`（仅 `assemble235` 调试构建使用，不入发布）。
7. **字面量解析限制**：`4.35e18` → `4.3499999999999995e18`、`<2.2e-308` → `0`。这是浮点
   **解析**（而非格式化）的历史限制；测试改用可精确解析的字面量，格式化本身已按解析后的
   双精度精确舍入。

## 七、已知限制（更新）

* **深层属性链**：`f().a.b`、`f().a += 1` 这类**调用结果直接取属性**仍不支持（`c.child().nx.v`
  可用）；深层链的 class 属性赋值会写实例属性（与 v4.233 相同）。
* **异常链**：`__traceback__` 恒 None；uncaught 场景 cause 校验失败时 ErrV 会被被 raise 的
  实例覆盖（v4.233 同）。
* **%e/%g**：次正规字面量解析为 0（`print(1e-320)` → `0.0`），其 `%e` 输出为 `0.000e+00`；
  Infinity/NaN 走零形态；位数修正 3 次仍不符时按现有位数截断。
* **%r**：`%a`（ascii）仍未支持（pctfmt 报 `unsupported format character 'a'`）；自定义
  `__format__` 不支持；`__repr__` 返回非字符串不报 TypeError（CPython 报）。
* **未做**：map/filter lambda 的链式体内建（v4.231 遗留）；异常组 `ExceptionGroup`/`except*`。

## 八、下一轮建议

1. **异常组**：`ExceptionGroup` / `except*`（单独一轮，需新的异常容器值与展开语义）。
2. **map/filter lambda 的链式体内建**：v4.231 遗留的"键函数应用帧不可重放"。
3. **`%a` 与 `__format__`**：ascii 转义（`\xXX`/`\uXXXX`）+ 对象自定义 `__format__` 分派。
4. **浮点字面量解析对齐 CPython**：`4.35e18` 的末位偏差与次正规数下溢（解析器的手工幂展开）。
5. **调用结果属性链**：`f().a.b`、`f().a += 1`（`methodcall`/`objattr` 的调用根路径）。

## 九、交接信息

**本轮新增文件**

| 文件 | 用途 |
|---|---|
| `_work/v41/p732.txt` / `p733.txt` / `p734.txt` | 三类补丁（assemble234 的 parts 尾部） |
| `_work/v41/assemble234.cjs` → `build234.js` | 400 段组装 + 构建 |
| `MiniPy_v4.234.sb3` / `_work/v41/project234.json` | 发布产物 |
| `_work/v41/_v234_chain.json` / `_v234_exp.json` / `_v234_repr.json` | 新套件（50 例） |
| `_work/v41/_p234{a..o}.json` 及其 `_o.json` | 复核探针（属性链边界、平局、挂死定位） |
| `_work/v41/_reg234_all.sh` / `_reg234.log` | 一键回归（结果见第五节） |
| `_work/v41/p798dbg.txt` / `p799dbg.txt` / `assemble235.cjs` | **仅调试**：Output 标记/寄存器发布，发布构建不加载 |

**新增全局变量**：`zfxM/zfxK/zfxA/zfxB/zfxQ/zfxR/zfxC/zfxOk/zfxV/zfxTry/zfeRet`（P733）、
`z7augk/z7augd/z7augi/z7augop`（P732）；新过程 `zfscaled %s %s`、`zf729nm`（P729）、
`z734str %s %s`（P734）。

**构建命令**（与历史轮次一致）：

```bash
node _work/v41/assemble234.cjs
V41_OUT=MiniPy_v4.234.sb3 V41_JSON=_work/v41/project234.json \
  V41_STAMP='MiniPy v4.234 - built 2026-11-21' node _work/v41/build234.js
```

**块手术铁律**见 `minipy-test-harness.md`；本轮新增第 (1)(2)(3) 条踩坑已并入上文第六节，
建议后续轮次把它补进 `minipy-test-harness.md` 的"铁律"清单。
