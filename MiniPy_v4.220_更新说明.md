# MiniPy v4.220 更新说明

**构建**：`MiniPy_v4.220.sb3`（2026-11-08，41,507 块，check41 errors=0）
**主题**：内置 demo 全面翻新——**13 → 20 个样例、覆盖 20 个不同方面**，全部与 CPython 3.14
逐字一致；HELP 屏同步更新（样例目录、输出宽度勘误、`next()` 补充）；顺手修掉
**最后一个 demo 显示 "Demo 0"** 的 P56 老瑕疵（新增补丁 **P708**）。
解释器零改动：Interpreter 39,052 块与 v4.219 完全一致，增量 178 块全在 Controller（demo/help 数据）。

## 一、结果总览

| 套件 | v4.219 | **v4.220** | 说明 |
|---|---|---|---|
| 主套件+探针（168 例） | 168 过 0 败 | **168 过 0 败** | 0 破坏 |
| `_cov*` 回归（681 例） | 681 过 0 败 | **681 过 0 败** | cov 全绿保持 |
| `_gap131` 补充（82 例） | 82 过 0 败 | **82 过 0 败** | — |
| 新 demo 内容验证 | — | **20 过 0 败** | `demos_v4220.json` 过 run_iso，与 CPython 逐字一致 |
| DEMO 按钮端到端 | — | **20 过 0 败** | 置 `demo=N` → 广播 INIT → Code 列表与 demos.json 逐行比对；状态栏 `Demo 1`…`Demo 20` |

## 二、20 个样例（20 个方面）

| # | 方面 | 亮点 |
|---|---|---|
| 1 | functions | def / 默认参数 / `*args` |
| 2 | recursion | fact / fib / gcd |
| 3 | strings & text | strip/replace/切片/`split`/`join`/`title` |
| 4 | string formatting | f-string（`{:>3}` `{:.2f}`）/ `%` / `.format` |
| 5 | lists | append/sort/insert/pop/slice/`[::-2]`/推导式过滤 |
| 6 | tuples & unpacking | 交换 / `divmod` 拆包 / 拼接 / `in` |
| 7 | dicts | 字面量打印 / `get` / `keys`/`values` / 字典推导 / `del` |
| 8 | sets | `| & - ^` / add / `sorted` |
| 9 | comprehensions | 列表 / 嵌套 / 字典 / 集合 / genexp 求 sum |
| 10 | lambdas & higher-order | `map`/`filter`/`sorted(key=)` |
| 11 | loops & iteration | `enumerate` / `zip` / while + `continue`/`break` |
| 12 | classes | `__init__` / 方法 / `__str__` / 属性赋值 / `type()` |
| 13 | inheritance | 覆写 / `super().__init__` / 显式父类调用 / `isinstance` |
| 14 | exceptions | `raise` / `except as e` / `finally` / `ZeroDivisionError` |
| 15 | generators | `next()` / `list` / `sum` / for 消费 |
| 16 | closures | 闭包捕获 / 字典可变状态计数器 |
| 17 | math module | floor/ceil/sqrt/pow/log/exp/sin/cos/fabs/trunc |
| 18 | bits & bools | `& | ^ << >> ~` / bin/hex/oct / any/all / 短路 / 三元 / 单行 if-else |
| 19 | algorithms | 二分查找 + 筛法（`[True] * n` 列表乘） |
| 20 | input & conversion | `input` 交互 / int/float/str 转换 / `int('ff', 16)` |

**数据**：demo 1–19 在 `_work/v41/demos.json`，demo 20（含 `inputs`）在 `demos_input.json`，
由 P56 在构建时读入重建 Controller 的 `example` 过程；完整用例集（含输入）
在 `_work/v41/demos_v4220.json`，可直接 `run_iso.mjs` 复跑。

**写样例时避开的坑**：双精度大数（§1 声明项）、实例直接打印（repr 地址，§7 声明项）、
依赖 genexp 惰性（§5 不修项）；set 打印序实测与 CPython 一致（PYTHONHASHSEED=0 下
小整数集）后才保留 `a | b` 直印。

## 三、HELP 屏更新（`_work/v41/help.json`，130 行）

1. `DEMO button: 13 samples` → `20 samples`，并附 6 行 20 样例目录（`1fn 2rec 3str …`）。
2. 勘误：`Output wraps at 26 cols` → **30 cols**（P56 起渲染即 30 列，help 文案一直没跟上）。
3. `-- GENERATORS --` 段补 `g = f();  next(g)`（P531 起支持）。
4. 所有行保持 ≤ 30 字符（P56 构建期强校验）。

## 四、P708：最后一个 demo 显示 "Demo 0"

P56 的 `example` 尾部顺序是：分支选择 → `demo` 自增 → 超界回绕 1 → `status='Demo '+(demo-1)`。
选最后一个样例时回绕已把 demo 归 1，`(demo-1)` 算出 0 —— 13 个样例时 demo13 就显示
"Demo 0"，只是从没人点到最后一个。修法（P708，`p708.txt`）：

1. `status` 赋值**挪到 `demo` 自增之前**（分支执行时 demo 恰为刚显示的样例号 N）。
2. join 的 STRING2 从 `(demo-1)` 改为 `demo` 变量压缩描述符 `[12,'demo',id]` 整体复用
   （`B.VAR` 产形就是压缩描述符，不是块引用——铁律 6 的同款坑）。
3. 状态栏恒为 `Demo N`（含最后一个），回绕只影响下一次点击。

## 五、踩坑（下轮注意）

1. **`assemble.cjs` ≠ 实际构建管线**：`assemble.cjs`（336 parts，止于 p575）是 v4.209 时代的
   旧清单，每轮各建 `assemble2NN.cjs`（v4.219 = `assemble219.cjs`，373 parts）。用旧清单
   assemble+build 会**静默产出少 3,299 块的旧语义产物**（主套件掉 12 例），且没有任何
   报错。构建前必须确认用当轮的 `assemble2NN.cjs`。test-harness 记忆里的
   "`node assemble.cjs && node build41.js`" 已过时，以各轮 README 为准。
2. **端到端测 DEMO 按钮的姿势**：直接广播 INIT 测不到 demo 分支切换——先清空 Code 列表、
   置 `demo=N`（数字），再广播 INIT，比对其后 Code 列表与 demos.json 对应条目；
   第一次跑出 19 假败就是残留 Code 没清 + 字符串类型不匹配。
3. 复用已有 input 时注意 `[3, [12,'name',id], [10,'']]` 三元形态：描述符在 input[1]，
   shadow 占位在 input[2]，整体 slice() 复用即可，不要拆。

## 六、复跑命令

```
cd _work/v41
node assemble219.cjs
V41_OUT=../../MiniPy_v4.220.sb3 V41_STAMP="MiniPy v4.220 - built 2026-11-08" node build41.js
node check41.cjs ../../MiniPy_v4.220.sb3
node run_iso.mjs ../../MiniPy_v4.220.sb3 demos_v4220.json _demos220c.out.json d220c
node _demo_e2e3.mjs ../../MiniPy_v4.220.sb3        # DEMO 按钮端到端（20 例）
node runall.mjs ../../MiniPy_v4.220.sb3 _res220f _new*.txt   # 主套件 168
node runall.mjs ../../MiniPy_v4.220.sb3 _res220covf _cov{1,2,3,4,5,6,7,8,9,10,205a,205b,205c,205d,205e,C,D,X,Y,Z,heap}.txt  # cov 681
node run_iso.mjs ../../MiniPy_v4.220.sb3 _gap131.json _gap131.v220f.json g220
```

## 七、下一轮建议

沿 `MiniPy_v4.219_更新说明.md` §七不变（yield 表达式含用户函数调用、P1-5/P1-6 帧容器身份、
genexp 闭包捕获）。
