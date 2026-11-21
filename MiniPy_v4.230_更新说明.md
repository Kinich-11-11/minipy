# MiniPy v4.230 更新说明

**构建**：`MiniPy_v4.230.sb3`（2026-11-10，49,033 块，Interpreter 46,578，vars 2,071，
lists 270，check41 errors=0）
**依据**：`MiniPy_v4.219_更新说明.md` §五/§七 清单——本轮完成其中 **3 类**：
**yield 表达式含用户函数调用**（E3 深层首选项）、**生成器体内 next() 挂死**、
**函数 repr 无 0x 地址**（声明项）。新增补丁 **P721/P722/P723**。

## 一、结果总览

| 套件 | v4.229 | **v4.230** | 说明 |
|---|---|---|---|
| 主套件+探针（168 例） | 168 过 0 败 | **168 过 0 败** | 0 破坏 |
| `_cov*` 回归（705 例） | 705 过 0 败 | **705 过 0 败** | 0 破坏 |
| `_gap131` 补充（82 例） | 82 过 0 败 | **82 过 0 败** | — |
| 模块套件 `_mods20_*`（140 例） | 140 过 0 败 | **140 过 0 败** | — |
| 真实场景 `_real_*`（120 例） | 120 过 0 败 | **120 过 0 败** | — |
| 旧模块 `_mods_*`（82 例） | 82 过 0 败 | **82 过 0 败** | — |
| raw / 复数专项（12+12 例） | 12+12 过 | **12+12 过** | — |
| 内置 demo 端到端（20 例） | 20 过 0 败 | **20 过 0 败** | ALL 20 OK |
| 清单专项 `_probe230`（12 例） | 5 过 7 败 | **8 过 4 败** | 3 类修复全转绿；余 4 败见 §五 |
| 清单扩展 `_probe230b`（5 例） | — | **5 过 0 败** | lambda repr/混合嵌套拉取/体内循环 yield 调用 |

## 二、P721：yield 表达式含用户函数调用（值晚一拍）

**症状**（v4.218/v4.219 两轮遗留）：`def g(): yield h(4)` 拉 `list(g())` 得
`[None, 8]`——首拉 None、次拉才给 8。

**根因**（本轮 dbg 插桩 trace 实证）：`calluser` 用全局寄存器 **fi** 存"本次调用的
FnName 行号"，出口不恢复。生成器体内 `yield h(4)` 的执行序：

1. pull 的 calluser 设 `fi=2`（g），体循环 execute 该行 → eval `h(4)` → **嵌套
   calluser(h) 把 fi 覆盖成 1**，h 出口不恢复；
2. 值捕获链（GYval=8、GYtype、gyldpc、gyld=1）与 lesc **全部正常执行**，体循环
   gyld==1 干净退出；
3. 但出口 G 臂组装守卫 `AND(FnKind[fi]=='G', glz==1)` 读到 `FnKind[1]='D'` →
   **惰性组装整段被跳过**（resume/dead 两臂都没跑，gyld 不清、帧不 stash），落到
   旧组装守卫（oldCond AND glz==1）的急切死路径 → `ev=''/'Z'`；
4. 第二次 pull 因 gyld 仍为 1 直接走 resume 臂 → GYval=8 → **值晚一拍**。

v4.219 的 "gmy 门改 grez==1" 修的是 pc 恢复门，与本缺陷（fi 冲刷）正交。

**修复**：新增帧表 `FrFi`——calluser **入口**（fi 被解析覆盖之前）压入调用方 fi，
**出口 epilogue**（FrRet 弹出点）恢复。calluser 子树内已无任何 control_stop
（P485 使错误路径全部正常流经 epilogue），压/弹严格配对、零泄漏。恢复点在
epilogue 末段（其余 epilogue 语句不用 fi），对既有语义零干扰。

**验证**：`yield h(4)`、双 yield、`next()` 逐拉、`yield k(2)` 嵌套两层、
`yield h(i)` 循环体内调用——全部与 CPython 逐字一致。

## 三、P723：生成器体内 next()（嵌套拉取）不再挂死

**症状**（v4.218/v4.219 声明项）：生成器体内 `next(另一生成器)` 挂死。

**根因**（两个叠加缺陷，trace 实证）：

1. p592 的 next() 句柄钩子（callfn/callfnW 各一份）拉完后的收尾是
   `pending=1 + tokenize + STOPTHIS`（顶层"语句完成为单位"协议）。p707 把
   pending=1 与末尾 STOPTHIS 都包了 `IF(gmy==0)`——体内两者全跳过，执行
   **跌入 nxSet 的普通 next() 文本切片路径**，把刚拉到的 ev 当迭代器状态改写成
   `''/'S'` → 外层 yield 捕获到空值。
2. 钩子把 **ghg** 改写成被拉源 gid（ghg='2'），而外层 gconv 的拉取循环恰恰用
   ghg 做句柄 id（ghg='1'）——嵌套拉取返回后外层循环 `gcur=ghg='2'` → 第二次
   pull 恢复了**被拉源**的帧（ghrestore(2)、fi=GHFn[2]、pc=GHpc[2]）→ 外层
   生成器永不结束 → 挂死。gconv 自身的 GStk 保护只覆盖嵌套 gconv，不覆盖
   next 钩子。

**修复**（对照 p706 gxpull 分派臂的成熟模式——"STOPTHIS 一次性弹穿 callfnW+callfn
两层回到 eval，ev=拉取值不被出口破坏"，该模式 v4.219 已在生成器体内验证）：

- 钩子臂入口把旧 ghg 压栈 GStk，tokenize 之前恢复并出栈（fail 路径不恢复——
  error 上抛后外层 gconv 由自身 GStk 兜底）；
- 末尾 STOPTHIS **去掉 gmy==0 守卫**（无条件执行）——体内也弹回 eval，拉取值
  留在 ev；pending=1 仍保持 gmy==0 守卫（体内不得标记语句完成）。

**验证**：`def g(): a=c1(); b=c2(); yield next(a); yield next(b); yield next(a);
yield next(b)` → `[1, 10, 2, 20]` 与 CPython 逐字一致（两个持久源交错拉取）。

## 四、P722：函数 repr 对齐 CPython

`print(f)` → `<function f at 0x7f00000000001>`（v4.219 §五 声明项）。地址沿用
P587 伪地址方案（固定前缀 + FnName 行号十进制后缀；runall/run_iso 双侧 0x 归一化
后逐字节对比，人读格式与 CPython 一致）。lambda（FnName 行以 '#' 开头）输出
`<function <lambda> at 0x…>`。唯一产地 = strval 的 F 分支（reprval 委托 strval，
列表内元素经 listfmt→reprval→strval 全覆盖）；p606 的 `__name__` 直读 FnName 表，
不受渲染文本影响。

## 五、仍存在的问题（清单余项，全部已声明）

| 编号 | 症状 | 现状 |
|---|---|---|
| P1-5/P1-6 帧容器身份 | 闭包捕获的局部容器跨外层调用共享（`make()` 两份闭包共写一个 list）；局部名与调用方同名时复用容器 | 仍败（`_probe230` 后 2 例）；行模型深层批次（帧代次戳 + alrec 跨代解绑） |
| genexp 闭包 late-binding | 合成体创建时快照外层名，CPython 每次拉取时重读（`a=5→9` 场景差） | 仍败（1 例）；E3 FN 快照语义，改真闭包需帧代次 |
| genexp 源急切物化 | `(x for x in src())` 源函数被调两次（创建时+首次拉取时） | 仍败（1 例）；与 G# 句柄惰性路径的正交语义 |
| 无界消费 / J 浮点精度 / 时区 / random 序列 | 与 v4.219 声明一致 | 不变 |

## 六、工程记录与踩坑

- 补丁：**p721/p722/p723** 加在 `p720` 之后、`tail.txt` 前（assemble230.cjs，388
  parts 无重复——本轮另存 assemble 清单副本，assemble219.cjs 未动）。
- 调试基建：`p_dbg230.txt` 插桩补丁 + `_asm_dbg230.cjs`（parts 注入 dbg）+
  `_dbg230run.mjs`（单例跑批 + DbgL 全量 dump，不占 run_iso 输出）。**插桩教训**：
  spliceAfter 收"块 id"不收数组（insertBeforeStmt 收数组）——首版 8 orphan；
  GYval 是变量不是列表（F()=VAR，item-of-list 锚定 0 命中）；`if` 的 SUBSTACK
  判 id 前先 `typeof x==='string'`（shadow 描述符是数组）；条件树判寄存器名要
  递归 reach（AND 的操作数是子块引用）。
- **重要坑**：assemble/build 的 V41_OUT 相对路径基于 v41 目录解析——产物会写进
  `_work/v41/` 而不是仓库根；check41 记得指向真实路径。
- **排查方法论**：v4.219 的 G 臂静态结构在 v4.230 里已被后续补丁改写（死代码守卫
  变体），纯静态读源码会得出错误结论——**插桩 trace 是唯一可信路径**。本轮
  "GARM 在 arm 内三分支日志全不触发但状态变了" 的矛盾即由此解开（守卫在运行期
  为假，静态看不出来）。
- 专项验证：`_probe230.json`（12 例）+ `_probe230b.json`（5 例）；中间过程件
  `_probe230dbg.json`、`_dbg230_yield.log`、`_dbg230_next.log`、`_b230.log`。
- 复现命令：

```bash
cd _work/v41
node assemble230.cjs
V41_OUT="../../MiniPy_v4.230.sb3" V41_STAMP="MiniPy v4.230 - built 2026-11-10" node build41.js
node check41.cjs ../../MiniPy_v4.230.sb3
node runall.mjs ../../MiniPy_v4.230.sb3 _res230new _new1_alias.txt _new1add.txt _new2_algo.txt _new3_str.txt _new4_oop.txt _new5_func.txt _new6_edge.txt _new7_probe.txt _new7add.txt _new8_probe2.txt _new9_probe3.txt _new10_probe4.txt
node runall.mjs ../../MiniPy_v4.230.sb3 _res230cov _cov1.txt _cov2.txt _cov3.txt _cov4.txt _cov5.txt _cov6.txt _cov7.txt _cov8.txt _cov9.txt _cov10.txt _cov205a.txt _cov205b.txt _cov205c.txt _cov205d.txt _cov205e.txt _covC.txt _covD.txt _covX.txt _covY.txt _covZ.txt _covheap.txt
node run_iso.mjs ../../MiniPy_v4.230.sb3 _gap131.json _gap131_230.out.json g230
node run_iso.mjs ../../MiniPy_v4.230.sb3 _probe230.json _probe230_4230.out.json p230
node run_iso.mjs ../../MiniPy_v4.230.sb3 _probe230b.json _probe230b.out.json p230b
# _mods20_* / _real_* / _mods_* / _probe_raw 同 v4.229 跑法
cd ../.. && node _work/v41/_demo_e2e3.mjs MiniPy_v4.230.sb3   # ALL 20 OK（注意从仓库根跑）
```

## 七、下一轮建议

1. **P1-5/P1-6 帧容器身份**（清单余项中影响最大）：方向不变——帧代次戳 +
   alrec 跨代解绑 + presync 模式复用。P721 的 FrFi 帧表证明 calluser 的
   push/epilogue-pop 生命周期是零泄漏的，帧代次戳可以走同一条路。
2. **genexp late-binding**：合成体若改为"每次拉取重读外层名"（体语法引用而非
   快照文本），可与 1 共用帧代次机制。
3. gh 寄存器家族（ghf/ghg/gsa/gcur/gkeep）的跨嵌套保护目前是逐点打补丁
   （P594 压栈、P723 压栈）——值得考虑统一入帧表（FrFi 模式推广），一次根治。
