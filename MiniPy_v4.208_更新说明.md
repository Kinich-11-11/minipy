# MiniPy v4.208 更新说明

**构建**：`MiniPy_v4.208.sb3`（2026-10-31，36,660 块，check41 errors=0）
**依据**：《已知问题清单_v4.207.md》（v4.207 实测：581 套件 12 败 / 补充 82 例 2 败 /
`_cov205` 77 例 0 败，真实失败合计 14，其中 9 例为双精度/地址类不可修项）。

## 一、结果总览

| 项目 | v4.207 | **v4.208** |
|---|---|---|
| 581 全套 | 12 失败 | **8 失败（修复 4、回归 0）** |
| 补充 82 例 | 2 失败 | **1 失败（修复 1、回归 0）** |
| `_cov205`（77 例） | 0 失败 | **0 失败（回归 0）** |
| 真实失败合计 | 14 | **8（全部为清单声明"不可修/不修"项）** |
| check41 | 36,242 块 errors 0 | **36,660 块 errors 0** |

剩余 8+1 败全部是清单 §1/§5/§7 声明的不可修项：`big int precision`、
`integer division precision`、`divmod big`、`int to str of very large`（§1 双精度）、
`instance in dict and list`、`repr fallback for print`（§7 对象地址）、
`generator short circuit`、`genexp is a list`（§5 声明不修）。
**清单上所有可修问题至此清零。**

全绿 5 例：`tuple element path alias`（82）、`default mutable argument`、
`function modifying global list`（cov5）、`realistic: run length encoding`（cov8 串行污染）、
`iterator protocol on custom class`（cov7，P548 三版回退后复活）。

## 二、修掉的问题（5 个补丁）

| # | 问题 | 根因 | 修法（补丁） |
|---|---|---|---|
| 1 | `t = ([1],); t[0].append(2)` 变异丢失 | methodcall2 的写回走 pathset，而 pathset 对头部类型 T（元组）直接 STOPTHIS | **P552** pathset 的 T 分支：lsetv（T/L 记录同构）替换元素 → evtype 保持 T → 递归写回头部名字。原 `IF(OR(T,S))` 条件收窄为只剩 S（字符串不可变，丢弃理应如此）。已知偏差：`t[0][0]=9`（元组套元组直接赋值，CPython 报 TypeError）会静默成功——记录串模型无法区分"经引用变异"与"直接赋值" |
| 2 | `print(acc(1), acc(2))`（可变默认参数）输出 `[1] [1, 2]` | print 边求值边渲染，容器值是记录串快照；CPython 先求值全部实参后渲染且实参是对象引用 | **P553** "返回值行引用 + print 两遍渲染"（对象堆的窄化版，见 §三） |
| 3 | `print(additem(1), additem(2))`（全局列表）同上 | 同上 | **P553** 同一机制：`return items` 捕获全局行引用，第二段的 `items.append` 直接反映在行上，两段渲染时重读同一行 → `[1, 2] [1, 2]` |
| 4 | RLE 串行污染（套件挂、隔离过） | **P15 的 `LoopElse` 标记表从不清理**（Elses/Indents/Ends 都在 prepare 开头 clear，唯独它漏了）。套件里 Code 每例重灌、行号从 1 重新开始——前例在相同行号留下的 `LoopElse[行号]=1` 让 RLE 的 if-else 在 execute 里被当成 loop-else（dest=pc+1 落进 else 体），首轮 if/else 两支都执行。P551 重置标量状态机无效，因为泄漏的是**列表** | **P554** prepare 的 Elses 清理点补 `clearL('LoopElse')` |
| 5 | `list(It())`（自定义 `__iter__`/`__next__`）报 not iterable | callfn/callfnW 的 list 分支不认 O；P548 三版回退的真正死因：成功路径 `stop this script` 越过 calluser 出口的**再词法化**，栈弹回另一克隆时 Tok 还停在 `__next__` 方法体上 → 行 11 的后续求值对垃圾记号报 `SyntaxError: expression`；且 p48d 成功后不复位会毒化下一次 list() | **P548**（复活，两行修复）：成功 stop 前手动 `tokenize(Code[pc])`；list 分支入口复位 `p48d=0`。钩子本体不变：fail 点前对 O 保存现场 → objiter（成功→pending=1+stop；失败→恢复现场、清 error、按原格式 tname+fail），errBody 用 p48d==0 守卫 |

## 三、P553 的机制（返回值行引用 + print 两遍渲染）

对象堆（给每个可变容器一个跨名共享的存储槽）仍是从根本上解决别名问题的正道，
但改动面覆盖 assign/lookup/全部变异点/帧快照。本轮改用窄化版，只修"print 实参
是同一活对象"这一形态：

1. **return 端捕获**（execute 的 return 分支，P14 锚点）：`return <单个名字>` 且值是
   容器（L/D/E/T）时记下"活存储"位置（rrK/rrI/rrN）：
   - 行号 ≤ FrRBase 栈顶（= calluser 入口时的 `llen(Names)`，即继承行：全局/调用者帧）
     → **行引用**：帧退出后行仍在，后续变异直接反映在 `Values[row]` 上；
   - 行属本帧且名字在 P547 的 DefWr 里（可变默认参数）→ **FnDef[fu] 引用**
     （P547 的帧尾写回保证 FnDef[fu] 持久且最新）。
   - 其余（本帧局部、lambda 等）→ 不引用，行为同旧。
2. **printargs 两遍渲染**：主循环 TIMES 改 REPEATU 驱动（prpass 1→2→3）。第一遍只
   求值实参并把 (记录, 类型, 引用种类, 引用键) 存 Seg* 列表；第二遍从 Seg 物化
   ev/evtype（行引用带 行+名+类型 三重校验，FnDef 引用切记录），走**原有渲染链**
   （包在 `IF(prpass==2)` 里，避免 `__str__` 副作用跑两遍）。引用只在"存快照时记录串
   == 引用目标现值"时登记（自校验），陈旧 rrK 只会优雅回退成快照。
3. **嵌套/中止安全**：PrBaS 栈顶 = 本 printargs 实例的 Seg 基址（每个嵌套 print 各推
   各的），段条目按 `基址+pi` 寻址；退出时压实基址以上全部条目并弹栈；try/except 里
   print 中止留下的残条由外层压实兜底；PrPpS 栈保存/恢复 prpass。换遍时复位
   pi/plo/printbuf。

**已知边界**（对象堆仍是后续工作）：跨语句别名（`a = f(); b = f(); print(a, b)`）、
实参传递别名（`def g(x): x.append(1)` 影响调用方）、print 之外的渲染点（str/repr
拼接）仍取快照——与 v4.207 及更早行为一致，未回归。

## 四、本轮踩的坑（下轮注意）

- **IFELSE 分支替换会"吞链"**：把分支首块换成新建 IFELSE 时，旧首块的 `.next` 仍连着
  原链——substack 执行沿 `.next` 走，整条原渲染链被吞进 IFELSE 的一个分支里继续跑。
  P553 首版的 store 因此跑到渲染之后（ev 已被冲成字符串）、pass 2 根本不渲染，
  输出全靠 pass 1，行为与旧版完全一样。正确结构：`branch = [IFELSE(prpass, [物化],
  [eval→store]) → 原链]`，原链接在 IFELSE 后面两遍共用。
- **块树禁止跨实例共享**：mkStore/mkMaterialize 这类工厂函数是必须的——两个分支各
  调一次工厂；把同一个 `isContainer` 表达式树塞进两份 store，webfix 规范化会丢弃
  多主块，条件静默变假（kind-1 校验因此失灵过一轮）。
- **压实循环的方向**：`REPEATU(NOT(GT(base, llen)))` 恒真（base≤llen 永远成立）→
  循环体从不执行，嵌套 print 的残条全部漏删，外层把嵌套实参的记录当自己的段渲染
  （输出 "s"/"cleanup" 之谜）。要删"基址以上"应该写 `NOT(GT(llen, base))`。
- **stop this script 会跳过 calluser 出口的再词法化**：任何"成功即 stop"的钩子，
  stop 前必须手动 `tokenize(Code[pc])`，否则栈弹回另一克隆/调用方时 Tok 是最后
  执行的方法体行（P548 三版回退的真因，一行修复）。
- **跨"程序重启"存活的按行号索引列表**：套件每例重灌 Code、行号从 1 重来，prepare
  里新增的按行索引表必须同步加进 prepare 开头的 clear 序列（P15 漏了 LoopElse，
  P551 只重置标量所以无效）。
- **eval 钩子拦内建调用的双重求值陷阱**：在 narg 分派前拦 `list(...)` 意味着非 O
  实参要落回原路径**再求值一遍**——`list(map(int, input().split()))` 会读两行输入。
  放弃了该方案（P555 未入库），P548 的 fail-site 钩子才是正确位置。
- **行号判"继承行"不可靠的替代**：FrBase/FrBnd 语义都不是"入帧行数"（FrBase 顶是
  llen(FN)+1 且 FN 为空；FrBnd 存名字且带 NlN 三重守卫）。自建 FrRBase（calluser
  入口推 `llen(Names)`、出口与 FrBase 弹点配对弹出）才是可靠判据。

## 五、复现命令

```bash
cd D:/编程/scratch/ai/minipython
node _work/v41/assemble.cjs && node _work/v41/build41.js     # 默认输出 MiniPy_v4.208.sb3
node _work/v41/check41.cjs MiniPy_v4.208.sb3

node _work/v41/runall.mjs MiniPy_v4.208.sb3 _work/v41/_res208 \
  _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt          # 573/581
node _work/v41/run_iso.mjs MiniPy_v4.208.sb3 _work/v41/_gap131.json \
  _work/v41/_gap131_208.out.json g208                          # 81/82
node _work/v41/runall.mjs MiniPy_v4.208.sb3 _work/v41/_res208g \
  _work/v41/_cov205{a,b,c,d,e}.txt                             # 77/77
```

## 六、版本演进小结

| 版本 | 真实失败 | 关键变化 |
|---|---|---|
| v4.205 | ≈44 | B1–B14 多维度根因批量修复 + 链式调用 |
| v4.206 | ≈33 | float 尾零、print 行缓冲、range 快路径、用例标记 |
| v4.207 | 14 | 帧语义三重修、链式调用双修、构造器身份、round 伪平局（16 补丁） |
| **v4.208** | **8** | **别名三连修（pathset 元组写回 + 返回值行引用/两遍渲染）、LoopElse 每例清理、P548 复活（stop 前再词法化）——清单可修项清零，剩余 8+1 败全部为声明不可修项（5 补丁，回归 0）** |

**下一步建议**：
① **对象堆**：P553 已搭好行引用+延迟渲染的地基，把堆槽化推进到 assign/lookup/
   变异点即可覆盖跨语句别名与实参传递别名；
② round 的 10^8 尺度探测对超大数（>1e10）仍有理论盲区（无测试覆盖，动前先造例）；
③ 82 套仅剩 `divmod big number`（§1 双精度），若引入大整数表示可一并了结 §1 四例。
