# MiniPy v4.247：闭包、生成器异常协议、动态属性与循环性能

基线：v4.246，`main` 提交 `e68abe601b7c1e3e5217cc52f2445a6e08d3a05d`。依据《MiniPy v4.246 回归测试报告》新增可重建增量 P780–P784，不修改历史 SB3。

## 修复

- **P780**：以精确名称比较处理闭包元数据、捕获单元、`nonlocal`、局部声明表、帧保存表与相关变量名称。保留原普通变量和字典键语义。
- **P781**：补齐 `getattr`（含默认值、实例绑定方法及类属性回退）、`setattr`、`delattr` 和简单 `del obj.name`。删除使用失效槽保留其它属性索引，避免误删大小写不同的属性。
- **P782**：生成器正常返回的值写入首次 `StopIteration.value`，再次耗尽返回 `None`；PEP 479 将从用户生成器逸出的 `StopIteration` 转为 `RuntimeError`，区分解释器内部合成生成器的耗尽信号。
- **P783**：保存并恢复挂起生成器的 try、finally 与活动异常处理帧。`close()` 注入 `GeneratorExit`，`throw()` 支持异常类或实例，共用原异常展开流程；活动委托生成器先接收 close/throw，正常返回值继续向外传递。
- **P784**：对受严格约束的顶层单语句整数 `range` 循环进行有限批处理。仅支持可验证的小整数 `+=`、`-=`、`*=`；保持迭代变量、执行步数、显示值和停止条件，遇到对象、别名、闭包、浮点数、非安全精度、调试模式或复杂循环自动走原解释器路径。

## 测试

Scratch VM 5.0.300 + CPython 3.12.14，使用真实 RUN 广播入口对比输出及异常类别；未更改 oracle。

| 测试组 | 通过数 |
|---|---:|
| H01–H16 报告原专项 | 16/16 |
| H17–H40 新增边界 | 24/24 |
| v4.246 定向组 | 31/31 |
| v4.245 定向组 | 27/27 |
| `_probe216b.txt` | 47/47 |
| `_probe230.json` | 12/12 |
| `_v243_repairs.txt` | 37/37 |
| `_v244_repairs.json` | 9/9 |
| 合计（共享 VM 连续 RUN） | **203/203** |
| 项目结构 | 62,221 块、0 错误 |

新测试覆盖未启动/耗尽的 close、独立生成器、异常实例、未捕获 throw、重复耗尽、普通 finally、绑定方法、动态属性默认值与校验、GeneratorExit 被忽略、多层委托关闭/抛出及返回、负步长 range、不同大小写变量、整数精度回退。

### 压力测试

Scratch VM Turbo 模式，同一 VM 顺序执行，无并行测试，60 秒测试上限：

| 任务 | 时间 | 输出 | 10 秒目标 |
|---|---:|---|---|
| 10000 次整数累加 | 3,089 ms | `49995000` | 达标 |
| 500 个数值字典键 | 9,065 ms | `500 41541750` | 达标 |
| 500 元素排序 | 9,072 ms | `500 0 100 25000` | 达标 |

10000 次循环仍记录 10,003 个解释器执行步骤。字典和排序靠近阈值，建议在目标环境继续多轮预热测量。

## 复现

```bash
node _work/v41/build247delta.cjs
node _work/v41/check41.cjs MiniPy_v4.247.sb3
MINIPY_MAX_MS=60000 node _work/v41/runrepair.mjs MiniPy_v4.247.sb3 _work/v41/_v247_probe.txt --shared --suite _work/v41/_v246_probe.txt --suite _work/v41/_v245_probe.txt --suite _work/v41/_probe216b.txt --suite _work/v41/_probe230.json --suite _work/v41/_v243_repairs.txt --suite _work/v41/_v244_repairs.json
MINIPY_TURBO=1 MINIPY_MAX_MS=60000 MINIPY_MAX_STEPS=20000 node _work/v41/runrepair.mjs MiniPy_v4.247.sb3 _work/v41/_v246_stress.txt --shared
```

本轮不声称重跑报告全部 301 项，也不将定向回归视为完整 Python 兼容率。动态属性操作针对 MiniPy 已有对象模型，异常注入不声称完整支持 CPython 全部 `throw` 历史签名、上下文管理器及异常组在所有挂起位置的语义。压力脚本为按报告重建的任务示例，单次性能结果不能视为严格跨平台同比。
