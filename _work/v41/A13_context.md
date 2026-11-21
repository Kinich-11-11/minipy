# A13 交接（嵌套容器字面量）——给协作者的完整上下文

> 本文件由主 agent 生成，所有代码均摘自当前产物 MiniPy_v4.23.sb3 的反编译结果（decomp23.txt）。
> 目的：让协作者不必从零探索，直接看到全部相关实现与已证实的因果链。

## 1. 问题
MiniPy v4.23（Scratch3 .sb3 里的 Python 子集解释器）**不支持嵌套的容器字面量**：只要元素本身又是容器字面量就出错。

| 输入 | CPython 期望 | v4.23 实际 |
|---|---|---|
| x = [[1], 2] | ok | SyntaxError: parentheses |
| print([[1, 2], [3, 4]]) | [[1, 2], [3, 4]] | SyntaxError: parentheses |
| print([1, [2, [3, 4]]]) | [1, [2, [3, 4]]] | 值错误 |
| x = ([1], 2) | ok | **正常**（元组路径已可重入）|
| x = [1, 2] 或 print([1, [2]]) 之类单层 | ok | 正常 |

## 2. 已证实的因果链（P44 探针逐步追踪）
探针：tokenize 入口打印 pc+源串；listlit 入口/出口打印 lo/hi 与 LComm/LOut 长度。
对 x = [[1], 2]（Tok: 1:x 2:= 3:[ 4:[ 5:1 6:] 7:, 8:2 9:]）输出：
```
TOK pc=1 src=x = [[1], 2]          （同一源串被 tokenize 3 次，Tok 稳定，与本问题无关）
LITIN  lo=4 hi=8 LComm=0 LOut=0     （外层 listlit 开始，元素区 4..8 = [ 1 ] , 2）
LITIN  lo=5 hi=5 LComm=1 LOut=0     （外层已记录 1 个逗号，然后递归求值元素 [1]）
LITOUT LComm=0 LOut=1 ev=<lsep>N1   （内层返回：LComm 被内层清成 0 —— 外层的逗号表丢了）
Line 1: SyntaxError: parentheses
```

**结论**：内层 listlit 的 clear(LComm)/clear(LOut) 抹掉外层的元素边界表与已求值元素；
外层 lpi/lplo/lphi/lacc 等临时变量同样被内层覆盖。外层回到循环后 lplo = item lpi of LComm + 1 取到空表
→ lplo=1，尾段发出 eval(1, 8)，括号深度从 1 开始 → SyntaxError: parentheses。

## 3. 关键机制（Scratch 层）
- 所有解释器状态都是 Interpreter 精灵的**全局变量**（没有过程局部变量），重入必须自己保存/恢复。
- **VStack**：通用值栈列表，append(VStack, x) 压；x = item last of VStack + del VStack[last] 弹。
  tuplelit、listfmt、tupfmt 都用它做重入保护。
- **fpush / fpop**：用户函数调用的整机存档机制（calluser 调用用户函数前 fpush、返回后 fpop）。
  - fpush 把 **137 个解释器变量**（含 lpi、lplo、lphi、lacc、ed、ek、eop、ln、lstart、lcount…）压入 VSave；
    并把 **LComm、LOut、Comma、AName、AVal、AType、AComma、MComma、UArgV、UArgT、UComma、DefSeg、DefPar、DefDef** 等列表
    以「先长度、后逐项」的顺序压入 LSave（见第 6 节代码）。
  - fpop 用 FrVBase/FrLBase 的栈顶作基准把这些变量/列表整体恢复，并把自己压入的部分从 VSave/LSave 删掉。
  - **注意**：ev、evtype、error 三个“输出通道”变量**不在** fpush 的保存集合里 → 嵌套调用结束后返回值不会丢。
  - **注意**：fpush 只压 FrVBase/FrLBase/FrLoop；fpop **不弹**这三个栈，弹栈由调用方（calluser）自己完成。
  - tuplelit 的 tqacc/tqlo/tqek/tqed、listfmt 的 lfacc/lfn/lfi、listlit 的 cfor/cdep/ck **不在** fpush 集合里。
- 列表编码：元素按 lsep + 类型码 + 文本 依次拼接；listlen 数 lsep，listitem 扫描第 n 个 lsep。
  嵌套列表的元素文本会被 lesc 转义（内层分隔符 → ESC+1），listitem 用 lunesc 还原（P34）。

## 4. listlit（当前实现，不可重入）—— 问题所在
```
2409| PROC listlit %s %s  [warp=true] args=["lo","hi"]
2410|   cfor = ??4,0
2411|   cdep = ??4,0
2412|   ck = arg:"lo"
2413|   until (V(ck)>arg:"hi"):
2414|     if ((item V(ck) of "Tok"=="(") or (item V(ck) of "Tok"=="[")):
2415|       cdep += ??4,1
2416|     if ((item V(ck) of "Tok"==")") or (item V(ck) of "Tok"=="]")):
2417|       cdep += ??4,-1
2418|     if ((V(cdep)=="0") and ((item V(ck) of "Tok"=="for") and (V(cfor)=="0"))):
2419|       cfor = ??12,ck,bvar_383hyz5hb
2420|     ck += ??4,1
2421|   if (V(cfor)>"0"):
2422|     CALL complist %s %s(arg:"lo", arg:"hi")
2423|     stop this script
2424|   ev = ??10,
2425|   evtype = ??10,L
2426|   if not((arg:"lo">arg:"hi")):
2427|     clear(LComm)
2428|     clear(LOut)
2429|     ed = ??4,0
2430|     ek = arg:"lo"
2431|     until (V(ek)>arg:"hi"):
2432|       eop = item V(ek) of "Tok"
2433|       if ((V(eop)=="(") or (V(eop)=="[")):
2434|         ed += ??4,1
2435|       if ((V(eop)==")") or (V(eop)=="]")):
2436|         ed += ??4,-1
2437|       if ((V(ed)=="0") and (V(eop)==",")):
2438|         append(LComm, ??12,ek,qtf0BmrjrC{v`JzL,c/=)
2439|       ek += ??4,1
2440|     lpi = ??4,1
2441|     lplo = arg:"lo"
2442|     until (V(lpi)>length of "LComm"):
2443|       lphi = (item V(lpi) of "LComm"-"1")
2444|       CALL eval %s %s(V(lplo), V(lphi))
2445|       if not((V(error)=="")):
2446|         stop this script
2447|       CALL lesc %s(V(ev))
2448|       append(LOut, (V(lsep) + (V(evtype) + V(ev))))
2449|       lplo = (item V(lpi) of "LComm"+"1")
2450|       lpi += ??4,1
2451|     CALL eval %s %s(V(lplo), arg:"hi")
2452|     if not((V(error)=="")):
2453|       stop this script
2454|     CALL lesc %s(V(ev))
2455|     append(LOut, (V(lsep) + (V(evtype) + V(ev))))
2456|     lacc = ??10,
2457|     lpi = ??4,1
2458|     until (V(lpi)>length of "LOut"):
2459|       lacc = (V(lacc) + item V(lpi) of "LOut")
2460|       lpi += ??4,1
2461|     ev = ??12,lacc,bvar_yvcb71gi
2462|     evtype = ??10,L
2463| 
```

要点：
1. 扫描 lo..hi 的**顶层逗号**位置存进 LComm（2427–2439）。
2. 逐个元素 eval(lplo, lphi)，结果经 lesc 编码后 append 到 LOut，再 lplo = item lpi of LComm + 1（2440–2455）。
3. 尾段 eval(lplo, hi) 同样 append。
4. 把 LOut 连接成 lacc，ev = lacc、evtype = L 作为返回值。
**递归点**：eval 若又遇到 [，会再次 CALL listlit（见第 8 节）→ 2427/2428 行的 clear 直接毁掉外层状态。

## 5. tuplelit（同类但**已经**可重入）—— 参照实现
```
4342| PROC tuplelit %s %s  [warp=true] args=["lo","hi"]
4343|   ev = ??10,
4344|   evtype = ??10,T
4345|   if not((arg:"lo">arg:"hi")):
4346|     tqacc = ??10,
4347|     tqlo = arg:"lo"
4348|     tqed = ??4,0
4349|     tqek = arg:"lo"
4350|     until (V(tqek)>arg:"hi"):
4351|       tqeop = item V(tqek) of "Tok"
4352|       if ((V(tqeop)=="(") or (V(tqeop)=="[")):
4353|         tqed += ??4,1
4354|       if ((V(tqeop)==")") or (V(tqeop)=="]")):
4355|         tqed += ??4,-1
4356|       if ((V(tqed)=="0") and (V(tqeop)==",")):
4357|         tqhi = (V(tqek)-"1")
4358|         append(VStack, ??12,tqacc,bvar_3i72rfp80)
4359|         append(VStack, ??12,tqlo,bvar_3i4yr1lqq)
4360|         append(VStack, ??12,tqek,bvar_3i240tpvw)
4361|         append(VStack, ??12,tqed,bvar_3i1xjeukc)
4362|         if not((V(tqlo)>V(tqhi))):
4363|           CALL eval %s %s(V(tqlo), V(tqhi))
4364|           if not((V(error)=="")):
4365|             tqed = item length of "VStack" of "VStack"
4366|             del VStack[??10,last]
4367|             tqek = item length of "VStack" of "VStack"
4368|             del VStack[??10,last]
4369|             tqlo = item length of "VStack" of "VStack"
4370|             del VStack[??10,last]
4371|             tqacc = item length of "VStack" of "VStack"
4372|             del VStack[??10,last]
4373|           if not((V(error)=="")):
4374|             stop this script
4375|         CALL lesc %s(V(ev))
4376|         tqenc = ((V(lsep) + V(evtype)) + V(ev))
4377|         tqed = item length of "VStack" of "VStack"
4378|         del VStack[??10,last]
4379|         tqek = item length of "VStack" of "VStack"
4380|         del VStack[??10,last]
4381|         tqlo = item length of "VStack" of "VStack"
4382|         del VStack[??10,last]
4383|         tqacc = item length of "VStack" of "VStack"
4384|         del VStack[??10,last]
4385|         tqacc = (V(tqacc) + V(tqenc))
4386|         tqlo = (V(tqek)+"1")
4387|       tqek += ??4,1
4388|     if not((V(tqlo)>arg:"hi")):
4389|       append(VStack, ??12,tqacc,bvar_3i72rfp80)
4390|       append(VStack, ??12,tqlo,bvar_3i4yr1lqq)
4391|       append(VStack, ??12,tqek,bvar_3i240tpvw)
4392|       append(VStack, ??12,tqed,bvar_3i1xjeukc)
4393|       CALL eval %s %s(V(tqlo), arg:"hi")
4394|       if not((V(error)=="")):
4395|         tqed = item length of "VStack" of "VStack"
4396|         del VStack[??10,last]
4397|         tqek = item length of "VStack" of "VStack"
4398|         del VStack[??10,last]
4399|         tqlo = item length of "VStack" of "VStack"
4400|         del VStack[??10,last]
4401|         tqacc = item length of "VStack" of "VStack"
4402|         del VStack[??10,last]
4403|       if not((V(error)=="")):
4404|         stop this script
4405|       CALL lesc %s(V(ev))
4406|       tqenc = ((V(lsep) + V(evtype)) + V(ev))
4407|       tqed = item length of "VStack" of "VStack"
4408|       del VStack[??10,last]
4409|       tqek = item length of "VStack" of "VStack"
4410|       del VStack[??10,last]
4411|       tqlo = item length of "VStack" of "VStack"
4412|       del VStack[??10,last]
4413|       tqacc = item length of "VStack" of "VStack"
4414|       del VStack[??10,last]
4415|       tqacc = (V(tqacc) + V(tqenc))
4416|     ev = ??12,tqacc,bvar_3i72rfp80
4417|     evtype = ??10,T
4418| 
```

要点：它不用列表暂存元素，而是用**字符串** tqacc 累加编码串；每次递归 eval 前把
tqacc、tqlo、tqek、tqed 压 VStack，求值后先用 ev 生成 tqenc，再弹回这 4 个变量，最后 tqacc = tqacc + tqenc。
**这就是本仓库里已被验证可用的“重入保护”写法。**

## 6. 用户函数存档机制源码（fpush / fpop 关键段落）
```
// fpush 头部与 LComm/LOut 存档
3249| PROC fpush  [warp=true] args=[]
3250|   append(FrVBase, (length of "VSave"+"1"))
3251|   append(FrLBase, (length of "LSave"+"1"))
3252|   append(FrLoop, length of "LoopHead")
3253|   append(VSave, ??12,ek,qtf0BmrjrC{v`JzL,c/=)
3254|   append(VSave, ??12,en,Tm;%+bdzLfYr2Qr6Fh},)
3255|   append(VSave, ??12,ed,:PpRjordSkFu@+,nUI=q)
3256|   append(VSave, ??12,emin,qfh|9,|xff_QbO,~#)X;)
  ...(中间 130+ 个 append(VSave, <var>) ...)
3410|   append(LSave, length of "AComma")
3411|   epI = ??4,1
3412|   until (V(epI)>length of "AComma"):
3413|     append(LSave, item V(epI) of "AComma")
3414|     epI += ??4,1
3415|   append(LSave, length of "LComm")
3416|   epI = ??4,1
3417|   until (V(epI)>length of "LComm"):
3418|     append(LSave, item V(epI) of "LComm")
3419|     epI += ??4,1
3420|   append(LSave, length of "LOut")
3421|   epI = ??4,1
3422|   until (V(epI)>length of "LOut"):
3423|     append(LSave, item V(epI) of "LOut")
3424|     epI += ??4,1

// fpop：恢复 VSave、恢复列表、删掉自己压入的部分
3461| PROC fpop  [warp=true] args=[]
3462|   epB = item length of "FrVBase" of "FrVBase"
3463|   ek = item (V(epB)+"0") of "VSave"
3464|   en = item (V(epB)+"1") of "VSave"
3465|   ed = item (V(epB)+"2") of "VSave"
3466|   emin = item (V(epB)+"3") of "VSave"
  ...(大量 <var> = item (epB+n) of VSave)
3595|   stopreq = item (V(epB)+"132") of "VSave"
3596|   cursor = item (V(epB)+"133") of "VSave"
3597|   branchjump = item (V(epB)+"134") of "VSave"
3598|   exportShown = item (V(epB)+"135") of "VSave"
3599|   speed = item (V(epB)+"136") of "VSave"
3600|   repeat ((length of "VSave"-V(epB))+"1"):
3601|     del VSave[length of "VSave"]
3602|   epB = item length of "FrLBase" of "FrLBase"
3603|   epI = ??12,epB,bvar_xm0vtqe9
3604|   epN = item V(epI) of "LSave"
3605|   epI += ??4,1
3606|   clear(Comma)
3607|   epJ = ??4,1
3608|   until (V(epJ)>V(epN)):
3609|     append(Comma, item V(epI) of "LSave")
3610|     epI += ??4,1
3611|     epJ += ??4,1
3612|   epN = item V(epI) of "LSave"
3613|   epI += ??4,1
3614|   clear(AName)
3615|   epJ = ??4,1
3616|   until (V(epJ)>V(epN)):
3617|     append(AName, item V(epI) of "LSave")
3618|     epI += ??4,1
3619|     epJ += ??4,1
3620|   epN = item V(epI) of "LSave"
  ...(恢复 AName/AVal/AType/AComma/MComma/UArgV/UArgT/UComma/DefSeg/DefPar/DefDef)
3712|   until (V(epJ)>V(epN)):
3713|     append(DefDef, item V(epI) of "LSave")
3714|     epI += ??4,1
3715|     epJ += ??4,1
3716|   repeat ((length of "LSave"-V(epB))+"1"):
3717|     del LSave[length of "LSave"]
3718| 
```

## 7. calluser 如何配对使用（弹栈顺序）
```
3774|   cdepth += ??4,1
3775|   if (V(cdepth)>"96"):
3776|     CALL fail %s("RecursionError: maximum recursion depth exceeded")
3777|     stop this script
3778|   append(FrRet, ??12,pc,j*QhLn+]=t{6R+a`9w=N)
3779|   append(FrBase, (length of "FN"+"1"))
3780|   CALL fpush()
3781|   fj = ??4,1
  ...(函数体执行)
3857|   if (V(retflag)=="0"):
3858|     ev = ??10,
3859|     evtype = ??10,Z
3860|   until not((length of "LoopHead">item length of "FrLoop" of "FrLoop")):
3861|     CALL popLoop()
3862|   epB = item length of "FrBase" of "FrBase"
3863|   clear(Names)
3864|   clear(Values)
3865|   clear(Types)
3866|   epI = ??12,epB,bvar_xm0vtqe9
3867|   until (V(epI)>length of "FN"):
3868|     append(Names, item V(epI) of "FN")
3869|     append(Values, item V(epI) of "FV")
3870|     append(Types, item V(epI) of "FT")
3871|     epI += ??4,1
3872|   repeat ((length of "FN"-V(epB))+"1"):
3873|     del FN[length of "FN"]
3874|     del FV[length of "FV"]
3875|     del FT[length of "FT"]
3876|   CALL fpop()
3877|   CALL tokenize %s(item V(pc) of "Code")
3878|   del FrRet[length of "FrRet"]
3879|   del FrLoop[length of "FrLoop"]
3880|   del FrBase[length of "FrBase"]
3881|   del FrVBase[length of "FrVBase"]
3882|   del FrLBase[length of "FrLBase"]
3883|   cdepth += ??4,-1
3884|   retflag = ??4,0
```

注意 3860–3861 的循环展开、3876 的 fpop、3878–3882 的五个 del ...[last]。
**任何自己调用 fpush 的地方，都必须在 fpop 之后自己删 FrVBase/FrLBase/FrLoop 的栈顶。**

## 8. eval 里对列表/元组字面量的分发调用点
```
1400|                         if ((item arg:"lo" of "Tok"=="divmod") and (V(narg)=="1")):
1401|                           CALL hascomma %s %s((arg:"lo"+"2"), (arg:"hi"-"1"))
1402|                           if (V(tqhcm)=="0"):
1403|                             CALL fail %s("TypeError: divmod expected 2 arguments, got 1")
1404|                           CALL eval %s %s((arg:"lo"+"2"), (V(tqcpz)-"1"))
1405|                           if not((V(error)=="")):
1406|                             stop this script
1407|                           if not((V(evtype)=="N")):
1408|                             CALL fail %s("TypeError: divmod() argument must be a number")
1409|                           tqdiv = ??12,ev,7LTr}:CJbj{+nTM79!^v
1410|                           CALL eval %s %s((V(tqcpz)+"1"), (arg:"hi"-"1"))
1411|                           if not((V(error)=="")):
1412|                             stop this script
1413|                           if not((V(evtype)=="N")):
1414|                             CALL fail %s("TypeError: divmod() argument must be a number")
1415|                           if (V(ev)=="0"):
1416|                             CALL fail %s("ZeroDivisionError: integer division or modulo by zero")
1417|                           CALL lesc %s(V(ev))
1418|                           tqacc = ((V(lsep) + "N") + "floor"((V(tqdiv)/V(ev))))
1419|                           CALL lesc %s(V(ev))
1420|                           tqacc = (V(tqacc) + ((V(lsep) + "N") + (V(tqdiv)%V(ev))))
1421|                           ev = ??12,tqacc,bvar_3i72rfp80
1422|                           evtype = ??10,T
1423|                           stop this script
1424|                         if ((V(narg)=="1") and (((item arg:"lo" of "Tok"=="max") or (item arg:"lo" of "Tok"=="min")) or ((item arg:"lo" of "Tok"=="pow") or (item arg:"lo" of "Tok"=="round")))):
1425|                           CALL builtin2 %s %s %s %s(item arg:"lo" of "Tok", (arg:"lo"+"2"), V(qcut), (arg:"hi"-"1"))
```

## 9. 三次已失败的修复尝试（都已从构建里撤掉，源码仍在 p42/p43/p45.txt）
- p42.txt：新写 listlit2 %s %s，只动自己那一段 LComm/LOut 切片（基址+计数，不清表）。失败：嵌套与部分普通用例仍错；
  它还加了“区间以开括号打头就跳过它”的补丁，说明也踩了“前导开括号被算成深度 1”的坑。
- p43.txt：新写 listlit3 %s %s，整表压 VStack/恢复。用的是「先压长度再压元素」，恢复时却
  用 l3rn = item last of VStack 读长度 —— **读到的是最后一个元素而不是长度**（只有空表时才碰巧对），
  随后 repeat l3rn: del VStack[last] 把栈切错 → 整个 VStack 及其上层状态被破坏。
- p45.txt：在**原有** listlit 的两个递归 eval 前后插 saveL/restoreL（同一套错误助手）。
  症状：连 a = [1, 2] 都错（nested2 只有 1/10）—— 正是栈被切错的表现。

**共同点：三次都用了「先压长度、再压元素，然后用 item last 读长度」的写法，恢复端读错位置。**
本仓库里**正确**的写法只有两种：(a) tuplelit 那种逐个变量压/弹；(b) fpush/fpop 那种用 FrVBase/FrLBase 记录基址的整机存档。

## 10. 主 agent 的候选方案（请审核/挑错，或给出更好的）
方案 A（最小改动，仿 tuplelit）：在 listlit 的两个递归 eval 前后做**成对**保护：
  压：lpi、lplo（变量逐个 append 到 VStack）；LComm、LOut（**倒序**压元素、最后压长度，这样长度在栈顶）；
  eval 之后先在 error 分支里恢复并 stop this script；否则 lesc(ev) 后、append(LOut, ...) 之前恢复，
  然后原有 append 语句照常用 ev/evtype（它们不受影响）+ 已恢复的 LOut。
  恢复列表：n = item last of VStack；del last；clear(表)；repeat n 次 { append(表, item last of VStack)；del last }。
  疑问：这样会不会与 listfmt/tupfmt/tuplelit 的 VStack 用法冲突？（它们的压/弹是平衡的）
方案 B：直接用 fpush()/fpop() 包住两个递归 eval（fpush 已保存 lpi/lplo/lphi/lacc + LComm/LOut），
  之后自己 del FrVBase[last]、FrLBase[last]、FrLoop[last]（照 calluser 的做法），错误路径同样先 fpop 再 stop。
  疑问：fpush/fpop 有无我没注意到的副作用（例如 FrLoop/LoopHead 展开、Tok/pc 重建、性能）？

## 11. 构建与验证（全部在 D:/编程/scratch/ai/minipython 下运行）
```
node _work/v41/assemble.cjs                    # head.txt + p13..p38 + tail.txt -> build41.js
node _work/v41/build41.js                     # 生成 MiniPy_v4.23.sb3（并写 _work/v41/project.json）
node _work/v41/check41.cjs MiniPy_v4.23.sb3    # 静态体检（块数、悬空引用）
node _work/v41/run.mjs MiniPy_v4.23.sb3 _work/v41/nested2.json   # 无头运行 vs CPython 3.14
```

测试套件（_work/v41/*.json，每条 {name, code, expect}）：nested2(10)、nested(8)、tuple(20)、comp(10)、func(31)、regress(15)、gaps(39)、dict(10，字典字面量，p33.txt 已写好但因本 bug 未启用)、one/one2/b2/cont/str/chain/fstr/pct/math/bit/booljson/float 等。

## 12. 相关文件
| 文件 | 说明 |
|---|---|
| _work/v41/head.txt | 构建器主程序 + patch() API + 全部构造器（I/addTo/item/llen/setV/IF/REPEATU/callProc/newProc/attachBody/insertBeforeStmt/spliceAfter/replaceStmt/tokAt/VAR/argOf）|
| _work/v41/p28.txt | 元组字面量（tuplelit/tupfmt）——可重入的参考实现 |
| _work/v41/p34.txt | 嵌套转义 lesc/lunesc |
| _work/v41/p42.txt / p43.txt / p45.txt | 三次失败尝试（含完整源码）|
| _work/v41/p33.txt | 字典字面量（待 A13 修好后启用）|
| _work/v41/decomp23.txt | MiniPy_v4.23.sb3 的完整反编译（4640 行，PROC <名> 分节）|
| _work/v41/project_v423.json | MiniPy_v4.23.sb3 里的 project.json（真源码）|
| _work/v41/A13_交接.md | 更早的交接文档（探针、静态扫描结论）|
| _work/decomp.js | 反编译器：node _work/decomp.js <project.json> <out.txt> |
