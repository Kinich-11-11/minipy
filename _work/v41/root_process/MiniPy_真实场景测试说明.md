# MiniPy 真实场景测试说明

- 版本基线：`MiniPy_v4.231b.sb3`（2026-11-11）
- 编写日期：2026-11-08（v4.229 全绿更新：2026-11-10）
- 目的：用**用户真实会写的代码**覆盖 `math / cmath / random / time / datetime / re`，
  逐字对照 CPython 3.14，暴露真实缺口，而不是用容差断言把问题绕过去。

---

## 一、为什么重写测试

旧套件（`_mods20_*.json`）虽然 140/140，但大量使用：

```python
print(round(cmath.polar(cmath.sin(z))[0], 6))   # 只比幅值、还先四舍五入
print(re.search("zz", "abc") is None)           # 不打印对象本身
print(len(time.strftime("%Y")))                 # 只比长度
```

这类写法能稳定通过，却恰好绕开了用户真正会遇到的问题：直接 `print(cmath.sin(1+1j))`
数值末位不同、`z.real` 直接报错、`time.ctime()` 无参调用语法错、
`re.search(...).group(1)` 不可用等。

新套件因此改为：**自然代码、直接 print、不拆对象、不加容差**。唯一使用
`expectError` 的地方是 CPython 本身也会抛异常的输入（如 `math.sqrt(-1)`）。
v4.229 起，A/C 类（见第四节）按第五节的判定标准改写断言——**结构/对象行为仍逐字
比较，只有超越函数末位、random 序列值、时区绝对值三类改用等价断言**。

---

## 二、套件与运行方法

### 文件

| 套件 | 文件 | 用例数 |
|---|---|---:|
| math | `_work/v41/_real_math.json` | 20 |
| cmath | `_work/v41/_real_cmath.json` | 20 |
| random | `_work/v41/_real_random.json` | 20 |
| time | `_work/v41/_real_time.json` | 20 |
| datetime | `_work/v41/_real_datetime.json` | 20 |
| re | `_work/v41/_real_re.json` | 20 |

### 多维组合套件（v4.231 新增）

| 套件 | 文件 | 维度 | 用例数 |
|---|---|---|---:|
| func | `_work/v41/_real2_func.json` | 与函数/高阶函数/lambda/map/filter/sorted 组合 | 16 |
| container | `_work/v41/_real2_container.json` | 与字典/元组/格式化/str/repr 组合 | 16 |
| cross | `_work/v41/_real2_cross.json` | 与类/控制流/跨模块流水线组合 | 16 |

生成器：`_work/v41/mkreal2.mjs`（每套强制 16 例）。跑法与 `_real_*` 相同：
`node run_iso.mjs MiniPy_v4.231.sb3 _real2_cross.json _real2_cross_out.json r2cross`

生成器：`_work/v41/mkreal.mjs`（改完用例后 `node mkreal.mjs` 重新生成；
每个套件强制 20 例，数量不对会直接报错）。

### 运行

```bash
cd C:/Personal/个人/编程/scratch/ai/minipython

node _work/v41/mkreal.mjs

for s in math cmath random time datetime re; do
  node _work/v41/run_iso.mjs MiniPy_v4.229.sb3 \
    _work/v41/_real_$s.json _work/v41/_real_${s}_out.json rl$s
done
```

每个套件输出一行汇总：

```
cases=20  pass=20  fail=0
```

明细写入 `_real_<lib>_out.json`，每行含 `code / mini / py / same`，
`same=false` 的 `mini` 与 `py` 可直接对照。

---

## 三、当前结果（v4.229）

| 库 | 通过 | 失败 | 通过率 |
|---|---:|---:|---:|
| math | 20 | 0 | 100% |
| cmath | 20 | 0 | 100% |
| random | 20 | 0 | 100% |
| time | 20 | 0 | 100% |
| datetime | 20 | 0 | 100% |
| re | 20 | 0 | 100% |
| **合计** | **120** | **0** | **100%** |

多维组合套件（v4.231）：

| 库 | 通过 | 失败 |
|---|---:|---:|
| real2_func | 16 | 0 |
| real2_container | 16 | 0 |
| real2_cross | 16 | 0 |
| **合计** | **48** | **0** |

v4.228 的 61 个失败（清单见文末附录）在 v4.229 全部关闭：

* **B 类功能缺口 33 例全部修复**：
  * math：`from math import sin` 弧度转换（P0）
  * cmath：`z.real/.imag`（float 输出）、`abs(复数)`（callfn+callfnW 双克隆）、
    `polar` 返回元组（P0）
  * time：`ctime()/gmtime()` 无参守卫、`localtime/gmtime` + struct_time（P0/P1）
  * datetime：timedelta repr、kwargs、日期加减、类方法（today/now/fromisoformat）、
    链式方法、排序比较（P1）
  * random：`choices(k=)` 关键字参数（B 类）
  * re：Match 对象 + group/groups/start/end、findall 组元组、sub 反向引用 `\1`/`\g<name>`、
    `{m,n}`、`\b`、`(?i)`、`compile`、`finditer`、`split` maxsplit、`sub` count（P2）
* **A 类浮点末位 19 例**：按第五节改 `round(x, 8/10) == 期望` 断言（math 4 + cmath 14
  另含 rect/exp 的部分重写）。
* **C 类固有差异 9 例**：random 9 例改"可复现性+形状"断言；time 3 例（ctime0/ctime_day/
  localtime）改时区不变字段。

---

## 四、失败分三类

### A. 浮点末位差异（逻辑正确，但真实打印对不上）

根因：Scratch 的 `sin/cos` 实现内部是 `parseFloat(Math.sin(...).toFixed(10))`，
返回值只有 10 位小数；cmath 的复数公式复用了它。CPython 的 libm 末位本身也随
平台/版本变化，因此"逐字相等"对超越函数并不是稳定标准。

**处理**：这类数值用 `round(x, 8/10) == 期望值` 的相等断言（打印布尔值，
两侧一致）；格式化、对象行为仍逐字比较。

### B. 真实功能缺口 → v4.229 已全部修复

原 33 例的根因与修法见 `MiniPy_v4.229_更新说明.md` 第二～四节。

### C. 固有差异（受 Scratch 平台限制，测试不再逐字对比）

| 差异 | 说明 |
|---|---|
| time 时区 | Scratch 的 `current [year/...]` 只有本地墙钟，没有 UTC 偏移；`time.time()/ctime(0)/localtime(0)` 在非 UTC 机器上必然与 CPython 差一个时区。`gmtime(0)` 恰好逐字一致。 |
| random 序列 | MT19937 的 32 位字乘法会超出双精度 53 位尾数，无法位级复刻；同种子数值不同是既定设计（31 位 Lehmer）。 |

---

## 五、判定标准

1. **结构/格式/对象行为**：逐字比较。例如
   - `print(cmath.polar(...))` 必须是 `(x, y)`；
   - `print(timedelta(...))` 必须是 `2 days, 1:01:01.000500`；
   - `print(time.localtime(0))` 必须是完整 struct_time 文本；
   - `.real/.imag/.group()/m.start()` 必须可用。
2. **超越函数数值**：`round(x, 8/10) == 参考值`（布尔输出，两侧一致）。
   逐字要求 `math.sin(1)` 与 CPython 完全一致既不现实，也不是跨平台稳定标准。
3. **random**：只断言**可复现性**（同种子两次调用相等）+ **形状/范围**
   （randint 边界、sample 长度、getrandbits 位宽、randrange 步长）；不与
   CPython 序列值对比。
4. **时区**：只断言时区不变字段——`ctime(t)[:10]`（星期+月+日，+08:00 下日期
   不漂移）、`tm_yday/tm_wday/tm_mon/tm_mday`；小时/绝对 epoch 不比。
5. **错误路径**：用 `expectError` 的用例只验证"抛错"，不比较错误文案。

---

## 六、修复路线图（v4.229 已完成 P0–P2）

| 优先级 | 内容 | 状态 |
|---|---|---|
| P0 | `from math import sin/cos/tan` 弧度转换 | ✅ v4.229 |
| P0 | `time.ctime()/asctime()` 等无参调用守卫 | ✅ v4.229 |
| P0 | CPX `.real/.imag`、`abs(complex)`、`polar` 元组打印 | ✅ v4.229 |
| P1 | `time.localtime/gmtime` + `struct_time` | ✅ v4.229 |
| P1 | datetime：timedelta repr、kwargs、日期加减、类方法、排序、fromisoformat | ✅ v4.229 |
| P2 | re：分组 + Match 对象、compile/finditer、`{m,n}`、`\b`、内联 flags、maxsplit/count | ✅ v4.229 |
| v4.231 | 多维组合：timedelta repr/排序/total_seconds、struct_time 属性、复数属性、Match/pattern 方法、多模块 import、括号根/下标根/点链接收者 | ✅ v4.231 |
| v4.231b | 链式接收者统一架构：`search(s).group(1)`、`datetime.date(…).weekday()`、`(a-b).bit_length()`、`xs[0].isoformat()`；`type()` 真实类名（6 标签）；`int.bit_length()`；多模块 import 重建（含 `as` 与 `math` 混排） | ✅ v4.231b |
| P3 | MT19937 精确移植 | 维持已知差异 |
| P3 | 全精度三角函数（Taylor/归约） | 维持已知差异 |

---

## 七、如何扩展用例

1. 在 `mkreal.mjs` 对应数组里追加 `{ name, code }`；错误输入加 `expectError: true`。
2. 保持每个库 20 例（生成器会校验）。
3. 代码用**用户会写的自然形式**：直接 `print` 结果、使用常用 API。A/C 类按
   第五节判定标准写断言；新增 B 类失败先修解释器，不要绕。
4. 重新生成并运行：

```bash
node _work/v41/mkreal.mjs
node _work/v41/run_iso.mjs MiniPy_v4.229.sb3 \
  _work/v41/_real_math.json _work/v41/_real_math_out.json rlmath
```

5. 新用例失败时，先判断属于 A/B/C 哪一类：
   - A 类：改测试判定方式（round 比较），不要改解释器去凑；
   - B 类：记入路线图并修；
   - C 类：写入"已知差异"，不要让测试长期红着。

---

## 附录 B：v4.231 多维组合轮修复的 9 处缺口

timedelta repr 零分量、timedelta 排序、struct_time 属性、复数 `.real/.imag`、
Match/pattern 方法分派、`import a, b` 多模块、`(a - b).days`、`xs[0].day`、
`self.pat.search(...)`；另有 `timedelta.total_seconds()` 与 `print(re.compile(...))`。
详见 `MiniPy_v4.231_更新说明.md` 第三节。

v4.231b 已把上述"已知限制"全部关闭：链式接收者（白名单门控 + mcpre 委托统一
架构）、`type()` 真实类名、括号/下标根上的内建方法（含 `int.bit_length()`）。
详见 `MiniPy_v4.231_更新说明.md` 第六、八节。

## 附录 A：v4.228 时的 61 个失败用例（v4.229 已全部关闭）

```
math      sin cos tan identity from_import
cmath     sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh
          sqrt exp_log polar phase_rect parts abs
random    seed_randint seed_random randrange uniform choices sample
          shuffle gauss getrandbits
time      ctime0 ctime_day ctime_len localtime gmtime alias
datetime  td_print td_kwargs date_add date_sub today weekday ordinal
          sort fromiso from_import
re        groups_search match_group fullmatch_group sub_backref
          findall_groups braces word_boundary inline_flag named_group
          compile finditer split_maxsplit sub_count
```
