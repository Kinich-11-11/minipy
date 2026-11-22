# MiniPy v4.248：迭代器默认值、StopIteration 构造、绑定方法调用与字典性能

基线：v4.247，提交 `b218e9a0166cc4398b97748f8586ed0066ca1a1a`。根据 v4.247 回归报告的 MP-19–MP-22 增加可重建增量 P785–P789，不修改历史 SB3。

## 修复

- **P785 / MP-19**：`next(iterator, default)` 在取下一项前按顺序求值两个参数，支持普通迭代器、生成器、生成器表达式、用户定义迭代器、不同类型的默认值。仅捕获 `StopIteration` 及其子类；其他异常继续传播。补齐多参数解析分派，保留用户定义的 `next` 函数优先级，并正确处理 `iter(obj)` 返回的自定义迭代器。
- **P786 / MP-20**：显式 `StopIteration()` 的 `value` 为 `None`，有参时为首个参数，保留完整 `args`。支持继承；后续修改 `args` 不会重置已有的 `value`。普通迭代器耗尽同样具有默认 `value`。
- **P787 / MP-21**：连续调用表达式接受绑定方法，例如 `getattr(a, 'f')(4)`；保存参数切分位置，使用方法的绑定实例和后续实参调用，而不是再次调用原函数。复合接收者如 `C().f` 也可返回绑定方法。
- **P788 / MP-22**：对长字典的键和值投影进行单次序列化字段扫描，避免每项重新扫描整个记录；安全整数列表的 `sum()` 采用线性累加。复杂数标签、浮点数、大整数与非安全编码自动走原路径。
- **P789 / MP-22**：为经过完整验证的纯整数键值记录缓存键值表，重复下标查找走原生列表索引；以完整序列化内容作为失效键，写入、删除、不同字典切换后重新验证。混合类型、浮点与大整数记录保持原查找语义。

## 验证

Scratch VM 5.0.300、CPython 3.12.14，真实 RUN 广播入口共享 VM 连续执行，不降低输出和异常 oracle。

| 测试组 | 通过数 |
|---|---:|
| 报告 I01–I22 | 22/22 |
| 新增 I23–I40 | 18/18 |
| v4.247 及历史定向组 | 203/203 |
| 合计 | **243/243** |
| SB3 结构 | 63,069 块，0 错误 |

新增测试覆盖默认参数的提前求值、非 StopIteration 异常传播、自定义迭代器、不同类型默认值、函数名遮蔽、异常子类及 args 独立修改、绑定方法嵌套调用、转义和嵌套字典值、更新键顺序、浮点与大整数求和回退、字典查找缓存失效和混合类型回退。

### 压力测试

Scratch VM Turbo，同一 VM 顺序运行，无并行任务，60 秒测试上限。

| 任务 | 时间 | 输出 | 10 秒目标 |
|---|---:|---|---|
| 10000 次整数循环 | 3,145 ms | `49995000` | 达标 |
| 500 键字典，values 与 sum | 6,137 ms | `500 41541750` | 达标 |
| 500 键字典，逐键读取与累加 | 6,915 ms | `500 41541750` | 达标 |
| 500 元素排序 | 8,403 ms | `500 0 100 25000` | 达标 |

## 复现

```bash
node _work/v41/build248delta.cjs
node _work/v41/check41.cjs MiniPy_v4.248.sb3
MINIPY_MAX_MS=60000 node _work/v41/runrepair.mjs MiniPy_v4.248.sb3 _work/v41/_v248_probe.txt --shared --suite _work/v41/_v247_probe.txt --suite _work/v41/_v246_probe.txt --suite _work/v41/_v245_probe.txt --suite _work/v41/_probe216b.txt --suite _work/v41/_probe230.json --suite _work/v41/_v243_repairs.txt --suite _work/v41/_v244_repairs.json
MINIPY_TURBO=1 MINIPY_MAX_MS=60000 MINIPY_MAX_STEPS=20000 node _work/v41/runrepair.mjs MiniPy_v4.248.sb3 _work/v41/_v248_stress.txt --shared
```

本轮未重跑报告全部 323 项。压力脚本为按报告重建的任务示例；单次性能不代表严格跨硬件同比，也不表明完整 Python 兼容率。
