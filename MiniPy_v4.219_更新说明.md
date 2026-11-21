# MiniPy v4.219 更新说明

**构建**：`MiniPy_v4.219.sb3`（2026-11-07，41,329 块，check41 errors=0）
**依据**：`MiniPy_v4.218_更新说明.md` §六.1——**P2-13：genexp 编译成真生成器（合成 def）**。
本轮完成 **P2-13 主目标 + 5 项 E3 深层修复**，新增补丁 **P706**（P707 随轮入库）。

## 一、结果总览

| 套件 | v4.218 | **v4.219** | 说明 |
|---|---|---|---|
| 主套件+探针（168 例） | 168 过 0 败 | **168 过 0 败** | 0 破坏 |
| `_cov*` 回归（681 例） | 681 过 0 败 | **681 过 0 败** | cov 全绿保持 |
| `_gap131` 补充（82 例） | 82 过 0 败 | **82 过 0 败** | — |
| 覆盖报告 probe216a（31 例） | 30 过 1 败 | **31 过 0 败** | **D7 转绿**（`take((x*x for x in naturals()), 4)` → `[1, 4, 9, 16]`） |
| 覆盖报告 probe216b（49 例） | 48 过 1 败 | **48 过 1 败** | 余 E4 = P1-5/P1-6 声明项 |
| iso216 genexp 子集（19 例） | 3 败（P2-13×1 + P1-5/6×2） | **17 过 2 败** | **P2-13 用例全转绿**；余 2 例 = P1-5/P1-6 声明项 |
| 专项验证 `_verify219`（13 例） | — | **13 过 0 败** | 本轮最小复现集（惰性拉取/缓存/耗尽/forloop/回退边界） |

## 二、P2-13 主目标：genexp 编译成真生成器

`(x*x for x in naturals())` 这类**源为 G# 句柄**（典型：无限生成器）的 genexp 原先走
complist 急切物化（无限源挂死）。v4.218 已定论：帧外逐元素变换无法存活，必须合成 def。
本轮落地（P706）：

1. **形态扫描**：深度 0 恰一个 `for`、无 `if` 过滤、循环变量为单一名字、源为 `G#` 句柄才走
   惰性；其余形态原样落 complist 急切物化（存量零回归）。
2. **合成 4 行**追加到 Code 尾：`def gxN():` / `while True:` / `x = gxpull(<gid烘焙>)` /
   `yield <元素文本>`——体不用 `for`（forloop 的 G 分派走 gconv 急切拉取），`gxpull` 逐元素拉。
3. **重跑 prepare** 重建 Ends/Indents/Elses/LoopElse → regdef 的 gy 扫描才能标 `FnKind='G'`。
4. **缓存**：键 `pc|lo|fpos|hi`，同一 genexp 表达式只合成一次，重复求值直接调 def 出新句柄
   （与 CPython 每次-求值-一-新-生成器一致）。
5. **创建 = 直接 `callProc('calluser', gxname, 1, 0)`**（零参调用，与 next() 恢复路径同款），
   不走 eval 分派——见踩坑 2/3。
6. **gxpull 保留名分派臂**（callfn/callfnW 体首）：体内 `x = gxpull(N)` 经 eval→callfn 分派，
   gxpull 不在 FnName/Names，落 callfnW 尾部会 NameError；臂内求值实参 → callProc('gxpull') →
   STOPTHIS 弹穿回 eval，ev=拉取值。
7. **耗尽干净死亡**：源耗尽时 gxpull `fail('StopIteration')` 使体循环退出 → calluser G 臂
   dead 分支置 GHdead=1；该分支中 `error=='StopIteration'` 时清空（真异常照常传播），
   list()/for 消费者据此干净结束而非报错。

## 三、顺带修掉的 5 项 E3 深层缺陷（全部本轮实测定位）

| # | 症状 | 根因 | 修复 |
|---|---|---|---|
| 1 | 合成 def 注册后 `FnKind='D'`、`FnEnd=-1`，创建调用秒返回不建句柄 | p706 首版 **prepare 重跑调用丢失**（tokSave 与 tokRestore 之间没有 prepare），Ends[def行] 缺失 → gy 扫描不跑 | 补 `callProc('prepare')` |
| 2 | 合成调用报 `SyntaxError: missing expression`（v4.218 收尾时的卡点） | **calluser 出口无条件 `tokenize(Code[pc])` 还原调用方记号**——合成 token 流 `gx1()` 被换回创建行记号而 count 仍=3 → eval 尾部 p375 二次扫描在错误记号上触发链式调用 `callfn(fn=FnName[ev]='', lo=4, hi=2)` → `eval(4,2)` 踩 `lo>hi` 报错 | 合成调用改走直接 callProc(calluser)，绕开 eval 分派（出口还原恰好正确还原创建行记号） |
| 3 | （2 的中间环节）p375 二次扫描触发幽灵链式调用 | eval 的零参分派尾部有"首调结果若为 F 再调一次"的链式门 | 由 2 间接消除 |
| 4 | 嵌套生成器第三次拉取 `UnboundLocalError: 'n'` | **ghstash/ghlstash 的"先删 GHCnt[g] 条再追加"假定本生成器旧快照在 GHLoc*/GHLp* 平铺表尾部**——嵌套场景 LIFO 交错后重暂存误删**别人**的尾部块，对方 GHStart 指针失效，读串块 | 改为只追加 + 更新 GHStart/GHCnt 指针（旧块成垃圾但指针永不失效；GHLoc 只经指针读取，语义不变） |
| 5 | 元素表达式只剩首记号（`yield x*x` 变 `yield x`） | mkJoin 用 `IF(c, then, else)` 三参——**IF 无第三参（v4.218 坑 1 复发）**，else 臂静默丢 | 改 IFELSE |
| 6 | 元素表达式含函数调用时 next(g) 返回 None 且**值晚一拍** | **calluser 的 pc 恢复门 `if (gmy > 0): pc = GHpc[gmy]` 对"从生成器体内发起的普通调用"误触发**（gmy 是全局寄存器）——被调函数体竟从生成器的 yield 行开始执行，yield 协议在普通函数里误触发 | 门改 `grez==1`（仅真恢复时从 GHpc 取 pc）。注：`yield h(4)` 本身在 v4.218 即返回 None（预存限制，见 §五） |

## 四、补丁明细与踩坑

**P706**（genexp 合成 def + E3 修复，`_work/v41/p706.txt`）；**P707**（生成器体内 next()
钩子的 gmy==0 守卫，v4.218 轮已试作、本轮随 P706 入库——体内嵌套 pull 统一走 gxpull，
next() 钩子保持 p707 守卫语义）。

**踩坑八则**（接 v4.218 踩坑六则，下轮写补丁前先读）：
1. **IF 无第三参复发**：mkJoin 三参 IF 静默丢 else 臂 → 元素文本只剩首记号。三层判据/双臂
   一律 IFELSE。
2. **calluser 出口重 tokenize 是全局记号流的隐形破坏者**：任何"合成 token 流 + eval 分派 +
   内含 calluser"的组合都会被出口的 `tokenize(Code[pc])` 毒化（count 不同步）——合成调用
   直接 callProc(calluser) 绕开。
3. **STOPTHIS 弹穿多层**：实测 callfnW 的 STOPTHIS 一次性弹穿 callfnW+callfn 两层回到 eval
   （resume-after-call 语义），ev 不被中间层破坏——gxpull 分派臂依赖此语义。
4. **GHLoc*/GHLp* 平铺快照表的"删尾再追加"只对单生成器安全**；嵌套生成器必须纯追加 +
   指针更新。
5. **gmy 是全局寄存器**：从生成器体内发起的普通函数调用会继承 gmy>0，calluser 的 pc 恢复门
   必须 `grez==1` 而非 `gmy>0`。
6. **count 协议（v4.218 WIP 已发现，本轮实证）**：tokenize 全程零 count 写入，调用方负责
   `set count = len(Tok)`；execute 入口自带。calluser 出口重 tokenize 后 count 与 Tok 的
   一致性由"pc 未变 + Code[pc] 即原行"保证。
7. **调试基建**：GXcN 当日志列表 + `_probe_iso2.mjs`（20000 字符全量 dump 版，600 截断版
   看不了长 trace）；TK（tokenize 入口）/calluser 入口/eval 调用点三类插桩一次定位六重根因。
   插桩块手术后 `node --check` + build 尾行确认（本轮两次因插桩自身语法错跑在旧 sb3 上）。
8. **shadow 变量描述符**：`[12,name,id]` 可直接内嵌于 input（如 `set ev = [12,"GYval",id]`），
   reach() 找不到——谓词要同时查描述符形态与块引用形态。

## 五、仍存在的问题（全部已声明）

| 编号 | 症状 | 归档 |
|---|---|---|
| yield 表达式含用户函数调用 | `yield h(4)`（及 genexp 元素 `h(x)`）返回 None 且值晚一拍——**v4.218 同款预存 E3 限制**（本轮 gmy 隔离修复后行为改善但未根治） | E3 深层批次；根因在 yield 处理器与 STOPTHIS 弹层的互动作 |
| 生成器体内 next() | 体内对持久源 next() 挂死（v4.218 同款） | 用 gxpull 合成体替代（P706 已验证）；next() 钩子体内语义维持 p707 守卫 |
| 无界消费 | `for v in <无界生成器/genexp>` 与 CPython 同样不终止（gconv 急切） | 声明 |
| P1-5/P1-6 闭包/帧容器身份 | 闭包捕获的局部容器跨外层调用共享；局部名与调用方同名时复用容器（iso216 余 2 例 + probe216b E4） | 行模型批次（帧代次戳 + alrec 跨代解绑 + presync 模式复用） |
| J 与浮点比较精度 | mixed 臂双精度近似，超 2^53 精度差不准 | 声明（v4.218） |
| 函数 repr | `<function f>` 无 0x 地址 | 声明 |

## 六、工程记录

- 补丁：`p706`（P706，含 5 项 E3 修复）+ `p707` 入库；加在 `p703` 之后、`tail.txt` 前
  （assemble219.cjs，373 parts 无重复）。
- 专项验证：`_verify219.json` 13 例（三连拉/元素表达式/函数实参内创建/有限源 list+sum/
  部分消费/缓存双句柄/外层变量捕获/急切回退边界/forloop 有界消费/嵌套 print/take 变体）全绿。
- 结果目录：`_v219main/`（168）、`_v219reg/`（681）、`_gap131.v219.json`、
  `_verify219.final.out.json`、`_probe216a/b.v219.json`、`_iso216.v219.json`、
  `_p219*.json/.out.json`（调试过程件）。
- 复现命令：

```bash
cd _work/v41
node assemble219.cjs
V41_OUT="../../MiniPy_v4.219.sb3" V41_STAMP="MiniPy v4.219 - built 2026-11-07" node build41.js
node check41.cjs ../../MiniPy_v4.219.sb3
node runall.mjs ../../MiniPy_v4.219.sb3 _v219main _new1_alias.txt _new1add.txt _new2_algo.txt _new3_str.txt _new4_oop.txt _new5_func.txt _new6_edge.txt _new7_probe.txt _new7add.txt _new8_probe2.txt _new9_probe3.txt _new10_probe4.txt
node runall.mjs ../../MiniPy_v4.219.sb3 _v219reg _cov1.txt _cov2.txt _cov3.txt _cov4.txt _cov5.txt _cov6.txt _cov7.txt _cov8.txt _cov9.txt _cov10.txt _cov205a.txt _cov205b.txt _cov205c.txt _cov205d.txt _cov205e.txt _covC.txt _covD.txt _covX.txt _covY.txt _covZ.txt _covheap.txt
node run_iso.mjs ../../MiniPy_v4.219.sb3 _gap131.json _gap131.v219.json g219
node run_iso.mjs ../../MiniPy_v4.219.sb3 _verify219.json _verify219.final.out.json v219
node run_iso.mjs ../../MiniPy_v4.219.sb3 _probe216a.json _probe216a.v219.json pa
node run_iso.mjs ../../MiniPy_v4.219.sb3 _probe216b.json _probe216b.v219.json pb
```

## 七、下一轮建议

1. **yield 表达式含用户函数调用**（本轮新暴露的 E3 深层限制）：现象 = next(g) 返回 None 且
   值晚一拍（GYval 在 G 臂检查 gyld 之后才被赋值）。方向：追 callfnW 的 STOPTHIS 弹层与
   yield 处理器的时序——弹层停在"最近 procedures_call"的 resume 语义与 yield 处理器的
   赋值顺序存在错位；修好它则 genexp 元素可含任意表达式。
2. **P1-5/P1-6 帧容器身份**：方向不变（帧代次戳 + alrec 跨代解绑 + presync 模式复用）。
3. **genexp 闭包捕获**（P2-13 拉满）：合成体目前以创建帧快照语义引用外层名（E3 FN 快照），
   元素表达式引用函数参数/局部名时的行为需专项用例验证后再定。
