# MiniPy v4.34 更新说明

> **版本号说明**：v4.34 这个号先前被 P69 断点调试用过，但那版**从未出货**（已按你的要求回退，留档
> `_work/v41/reverted/`），缺口清单第 3 节也把"下一版最小集"记作 **v4.34**，所以这一轮继续用 v4.34。

本轮按 `_work/cmp47/v4_缺失清单.md` 第 3 节的"下一版最小集"施工：**9 个补丁（P70–P78）**，
把独立探针套件 `gaps433.json` 从 **0/63** 推到 **21/63**（E 18/55、F 0/2、G 3/6），
既有 23 套回归**零退化**。

产物 `MiniPy_v4.34.sb3`：Interpreter 9,811 → **10,760** 块，合计 **12,189**，`check41` errors=0。
`MiniPy_v4.33.sb3` 及更早产物全部不动。

## 1. 补丁清单（清单 ID → 补丁）

| 补丁 | 关闭的缺口 | 做法 |
|---|---|---|
| **P70** | E5 / E6 位运算增强赋值 | 分词器从不把 `& \| ^` 与后面的 `=` 合并，`<<=` 也只合并成 `<<`，所以五种运算都是"四记号：名 运算符 = 值"。在 `execute` 的 `+=` 分支前加一条分支，复用现成的 `rightside`（它本来就实现了 `& \| ^ << >>`），运算符取 `Tok[2]`、右值从 4 号记号起 |
| **P71** | E1 / E2 / E3 数字字面量 | 分词器的数字分支只认 `[0-9.]`，`0x10` 被切成 `0`+`x10`。改成：`0` 后跟 `x/X/o/O/b/B` 就吞对应的字母表，否则吞数字后允许再吞指数（`e/E` + 可选符号 + 至少一位数字）。`atom` 里新增 `numlit` 把记号文本改写成十进制/浮点（`basenum` 逐位解析进制前缀；指数用 `尾数 * 10^指数`），`1e3` 走 `mkfloat` 得 `1000.0` |
| **P72** | E20 / E21 `\n` `\t` | 字符串读取分支把 `\` 后面那个字符原样收下，所以 `'a\nb'` 成了 `anb`。在 `ec = letter ep of source` 之后补两条映射（`n`→换行、`t`→制表）；控制台是一行一行的列表，所以 `log` 同时改成"遇到换行就断行"，否则一个含 `\n` 的字符串永远对不上 CPython 的两行 |
| **P73** | E4 分号多语句 | 新增 `splitlines`（源码级重写），在**三次 `expandlines` 之后、`prepare` 之前**调用：这样 `for i in range(3): a; b` 先被展开成块状语句、再按 `;` 切开，两半都留在循环体里。切点只在括号深度 0、且在字符串与注释之外；每段 trim 后补回原缩进，空段丢弃 |
| **P74** | E9 / E10 列表 `+` `*` | 列表是"lsep+类型+文本"的平铺编码，两段编码相接就是列表相加、重复 n 次就是列表乘。新增两条语句，并把原来 `+`／字符串 `*` 两个分支的条件改成"任一侧是 L 就跳过"，两处无条件的 `mkfloat` 探针也加了 `evtype ≠ L` 守卫（否则含小数点的列表编码会被提成数字） |
| **P75** | E13 / E14 / E15 字符串方法 | `methodcall` 的 S 段新增 `index`（复用 `sfind`，找不到抛 ValueError）、`title`、`zfill`、`isdigit`、`isalpha`（三个新过程），末尾"未知方法"的守卫列表同步扩列 |
| **P76** | G1 / G6 | 列表原地方法返回的是空串 + 类型 S，改成类型 `Z`（解释器的 None 就是 Z，`strval(Z)` 印 `None`）；`type()` 原来只印 `int`/`float`，改成 `<class 'int'>` 形式，并且**在 `evtype = "S"` 之前**插入映射，否则类型早被覆盖了 |
| **P77** | E17 / E18 / E19 / G4 | `pctfmt` 原来只看 `%` 后一个字符，`%5d` 印成 `42d`。改成先扫 `%[-][宽度][.精度]转换符`，再交给新的 `pctitem(值, 类型, 规格, 转换符)`：`d` 取整、`f` 默认 6 位小数（含补零与符号）、`s/r` 走 `strval`，最后按宽度左右补空格。f-string 的 `{expr:spec}` 也拆成"表达式 + 规格"并调用同一个 `pctitem`，两条路径格式完全一致 |
| **P78** | E22 / E25 | `callfn` 里补 `min/max(一个可迭代对象)`（容器逐元素、数字按大小、字符串按 `compareText`，空序列抛 ValueError）；`eval` 的双参数白名单加上 `int`，`builtin2b` 用 `basenum` 按给定进制解析字符串（`basenum` 顺带支持前导正负号） |

## 2. 这一轮最值得记的一条坑

**同一个 argument reporter 积木被多个输入复用，在 scratch-vm 里会求值成垃圾。**

P71 的 tokenizer 里图省事写了 `const src = argOf('source')`，然后 `letter ... of source`、
`length of source` 全用这一个积木（最终 **19 处**引用同一个 block id）。症状非常反直觉：
`print(0x10)` 死循环——因为 `contains("0123456789abcdefABCDEF", letter ep of source)` 恒为假，
数字扫描在 `0x1` 之后原地打转、每轮追加一个空记号。

排查链（工具留在 `_work/v41/`）：

* 在 `tokenize` 外层循环里插一个"400 轮就 fail 并打印 ep/ec"的守卫（`p99dbg.txt` 的写法）→ 拿到
  `ep=10 len=11 ec=[0]`，以及 `Tok = [print, (, 0x1, "", "", ...]`；
* 在过程开头用**同样的写法**探针求 `contains(set, letter 10 of source)` → 全部 `true`，
  说明条件本身没错；
* 最后对比积木本身：原版 reporter 是 `shadow:false` 且每处一个（refs=1），我的那个是
  `shadow:true` 且 refs=19 —— 改成"每次用都新建一个"后立刻全绿。

教训：**新补丁里不要 `const src = argOf(...)` 再到处用**；`lenOf/find` 之类每次调用现造。

## 3. 实测

| 套件 | v4.33 | **v4.34** |
|---|---|---|
| `gaps433.json`（63 条） | 0/63 | **21/63**（E 18/55、F 0/2、G 3/6） |
| 23 套 battery | 3 组既有失败 | **完全相同**（one2 1、math 3、dict 3） |
| `demos.json` / `scope.json` / `d1.json` / `pan.json` | 12/12 · 4/4 · 4/4 · 7/7 | **同上** |
| `check41.cjs` | 11,240 块 errors=0 | **12,189 块 errors=0** |
| `rebuild-old.ps1` | v4.10…v4.33 MATCH | **v4.10…v4.34 共 25 个版本全部 MATCH** |
| `frames.mjs fib16` | 23 帧 / 8.7s（interpSteps 6388） | **24 帧 / 8.1s（interpSteps 6388）** |
| `stepcost.mjs demo1` | 13–30 ms/步 | **13–15 ms/步** |

（`frames` 的帧数在这台机器上有 ±8 帧的抖动，同一次对比里 v4.33 自己就跑出 23 帧；
解释器内部步数 `interpSteps` 两版都是 6388，说明没有真实的性能退化。
`numlit` 一开始对每个数字字面量都调 `scase`（95 字符表 × 每个字符），实测拖慢约 2 倍，
已改成"长度 > 2 才进改写"并去掉了 `scase`。）

## 4. 复现

```
node _work/v41/assemble.cjs && node _work/v41/build41.js        # -> MiniPy_v4.34.sb3
node _work/v41/run.mjs MiniPy_v4.34.sb3 _work/cmp47/gaps433.json _work/cmp47/gaps434_out.json
pwsh -NoProfile -File _work/v41/battery.ps1 -sb3 MiniPy_v4.34.sb3 -out _work/v41/battery_v434.txt
node _work/v41/check41.cjs MiniPy_v4.34.sb3
pwsh -NoProfile -File _work/v41/rebuild-old.ps1
```

## 5. 下一版（v4.35）建议

清单里剩下的按性价比排：

1. **E38–E41 字典可写**（`d[k]=v`、`del d[k]`、`len/in`、`for k in d`）——字典只读是最影响写代码的一条；
2. **E54** 属性/方法的根可以是任意表达式（`C().v`、`c.inc().v`）——类已经能用，卡在链式入口；
3. **E30/E31** 函数当值 / 立即调用 lambda（函数值类型 F 已存在，只差"求值为 F 的表达式 + `(`"）；
4. **E33–E35** 元组/列表解包（赋值、`for`、`divmod` 返回值同一套逻辑）；
5. **E23/E24** `enumerate` / `zip`（预先求值成 `[[i, v], ...]`，再靠上面的解包）；
6. **E16** `str.format`（`pctitem` 已经就绪，只需扫 `{}`/`{0}`）；
7. **E7/E8** 切片第三段（步长、反向）；
8. **F1/F2** 两条静默错（嵌套推导式、生成器内循环）；
9. **E42** 字典方法 `keys/values/items/get/pop`；
10. **E45/E47/E48/E49** 类属性、`__str__`、`try/else`、`try/finally`。
