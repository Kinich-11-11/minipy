# MiniPy v4.243 更新说明：帧身份、生成器晚绑定与异常组深化

基线：v4.242（`209dc13`，含最新下一轮建议回顾台账）。本轮增加 P761–P769，产物为 `MiniPy_v4.243.sb3`。

## 修复内容

| 待办 | 本轮实现 |
|---|---|
| E4 闭包计数器 / `nonlocal` | 每次函数调用分配帧代次，闭包按 `(代次, 名字)` 引用共享 cell；读取、写回、生成器恢复与同代局部容器别名不再仅依靠同名快照。 |
| 生成器表达式 late-binding | 合成 def 的自由变量读取活 cell；源在创建时求值，元素表达式在拉取时求值。新增有限序列源及单个 `if` 过滤。 |
| `except UnknownException` | 替换原错误为实际 `NameError` 对象，保留 `__context__`，阻止同一 try 的后续 except 误捕获类型解析错误。 |
| 异常组表达能力 | 子类 `__new__`、`__init__`、`derive`，函数/lambda/可调用实例谓词，自定义 `__getitem__` 序列；traceback 链、帧与局部变量快照、未捕获组的树状展示。 |
| random MT19937 | 624 个 32 位状态字；CPython `init_by_array`、53 位 random、拒绝采样 `_randbelow`、任意位宽 `getrandbits`；整数、非整数分数种子及 ASCII 字符串版本 2 SHA-512 种子。 |
| `sum()` 序列协议 | 保存实际 Tok/Kind/count 与 `objiter` 寄存器；`__getitem__`-only 对象可安全求和，同时保留非 `IndexError` 异常。 |

## 实现细节

- P761：类型解析失败时重建错误对象；迭代物化使用可嵌套的记号栈，不重新解析调用行。
- P762：用 16 位乘法分片及 4 位查表实现精确的 32 位运算；重写 random、randint/randrange 的底层取样、shuffle、sample、choices 无权分支、gauss 缓存和 getrandbits。分数种子采用 CPython 的 61 位哈希旋转；`seed(None)` 与无参数 seed 保持非确定性用途。
- P763：新增 `FrGen`、`GHGen`、`CellKey/CellGen/CellV/CellT`、`CloCell`；对注册过的自由变量、先定义闭包后初始化的局部变量以及 `nonlocal` 共享绑定使用代次身份。屏蔽旧的跨帧同名写回对私有 cell 的影响；补齐 lambda 静态作用域表。
- P764：使用实际值记号调用异常组子类和 predicate，支持 `super().__new__(cls, message, exceptions)`、基类 `__new__` 显式形式和 `derive()` 覆盖；验证自定义 `derive()` 返回值类型并传播 predicate 异常。
- P765：在异常传播点建立 traceback、frame、code 对象及其链接，保留 `tb_lineno`、`tb_next`、`tb_frame`、`f_code.co_name`、`f_code.co_filename`、`f_lineno`、`f_back`、`f_locals`；显式 raise 扩展已有 traceback，bare raise 不重复添加本帧；split/subgroup 派生组复制原 traceback。未捕获异常组递归显示子组、叶异常类型、消息及有 traceback 的调用链。
- P766：为 range、list、tuple、str 建立有限源游标，复用 P706 合成生成器与 cell 捕获机制。
- P767：新增同代局部容器的 cell 别名图；重绑定解除本代边，突变按连通分量传播，避免下一次工厂调用解除上一次的别名。原有参数、全局和属性槽同步机制保留。
- P768：以 32 位双半字实现 SHA-512，使用字符串字节与 digest 组成 CPython v2 种子的整数词序列。
- P769：单 for、单 if 的 genexp 将过滤表达式放在合成函数体里，消费时再读取自由变量。

## 示例

```python
def make_counter():
    n = 0
    def inc():
        nonlocal n
        n += 1
        return n
    return inc

a = make_counter()
b = make_counter()
print(a(), a(), b(), a())  # 1 2 1 3

factor = 2
g = (x * factor for x in range(4) if x > 0)
factor = 10
print(next(g), next(g))  # 10 20

import random
random.seed(42)
print([random.randint(1, 100) for i in range(6)])
# [82, 15, 4, 95, 36, 32]
```

## 构建与测试

```bash
node _work/v41/assemble243.cjs
node _work/v41/build243.js
node _work/v41/check41.cjs MiniPy_v4.243.sb3
node _work/v41/runrepair.mjs MiniPy_v4.243.sb3 _work/v41/_v243_repairs.txt
node _work/v41/runrepair.mjs MiniPy_v4.243.sb3 _work/v41/_v243_trace_tree.json
```

增量构建：`node _work/v41/assemble243.cjs --delta`，随后 `node _work/v41/build243delta.js`（默认基座为 v4.242）。完整与增量构建均为 59,836 块。`MINIPY_VM` 可指定 Scratch VM 模块路径；较长的回归测试可通过 `MINIPY_MAX_MS=120000` 调整单测超时。

`runrepair.mjs` 也补齐了 RUN 模式 stdin 协议，避免交互测试把等待输入误判为解释器回归。

| 验收项目 | 结果 |
|---|---:|
| 新增 v4.243 定向差分（含补充的边界用例） | **37/37** |
| 未捕获异常组 traceback 树 | **1/1** |
| probe216b（含 E4、交互、长计算分项复测） | **49/49** |
| `_exc232_validation` | **12/12**（原 11/12） |
| `_mods20_random` | **20/20**（原 18/20） |
| v4.241 异常组回归 | **41/41** |
| v4.242 修复回归 | **27/27** |
| 最终完整源码构建重点抽测 | **8/8** |
| 增量 / 完整产物结构检查 | 各 **0 错误** |

定向差分按 CPython 实际输出校验；异常组树使用独立的输出片段校验，允许 MiniPy 自身的 `Line N` 终止提示与显示分行。新旧测试均以 Scratch VM 实际载入 `.sb3` 后执行。旧 probe 的超时分项使用较长超时复测；J1/J2 采用 stdin 协议复测。

## 仍需注明的兼容边界

- Cell 解决本轮 E4 / 合成 genexp 的闭包绑定和同代局部别名，并不等于完成所有容器的堆对象身份改造。多重 for、多个过滤器及复杂解包 genexp 仍走此前路径；有限源的游标持有创建时的容器编码。
- traceback/frame/code 是 MiniPy 虚拟执行环境的对象快照，不是 CPython 的实时帧或字节码对象；`tb_lasti` 为占位值，源码和行号使用 MiniPy 的 Code。树展示不是对 CPython traceback 模块的逐字符复刻。
- random 数值级验收覆盖整数/大整数、非整数有限数值、ASCII 字符串默认 version=2，以及已有取样 API。既有 bytes/非 ASCII、version=1、带权 choices、getstate/setstate 等接口边界不宣称完整 CPython 兼容。浮点输出仍受 MiniPy 格式化和 IEEE double 的限制。
