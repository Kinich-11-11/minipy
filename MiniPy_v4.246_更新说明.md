# MiniPy v4.246：名称大小写、生成器 send 与字典写入

基线为 `main` 的 v4.245（`0227ed07de8c481cf6e11909eeef9bfc44b79ae2`）。本轮依据《MiniPy v4.245 回归测试与剩余待修复清单》的 P0、P1、P3。保留历史 `.sb3`，新增独立增量构建。

## 变更

- **P776**：函数、类、方法、实例与类属性表中的名称比较和成员查询使用精确字符比较；消除原 Scratch 忽略大小写的 `contains`/`equals` 行为。保持存储的原始名称和已有变量、字典键路径。方法缺失按 `AttributeError` 处理。
- **P777**：简单名称赋值形式 `x = yield ...`、`x = yield from ...`；生成器 `send(value)`，`next()` 恢复时默认接收 `None`，拒绝尚未开始的生成器接收非 None 值。委托生成器接收传入值，并把正常的 `return` 值交给委托者。每个生成器维护独立状态；保护递归调用过程中被重新词法分析的 token 流。
- **P778**：数值字典键写入先用完整的序列化字段标记排除不存在的键，再线性扫描奇数槽（只匹配键）；保留其它类型的旧路径。
- **P779**：普通无需转换的载荷直接复制；含分隔符和转义标记时仍使用原逐字符序列化逻辑。

## 验证

Scratch VM 5.0.300 与 CPython 差分，本轮使用仓库的真实 RUN 广播入口，未放宽输出 oracle。

| 测试组 | 通过数 |
|---|---:|
| G01–G18（报告原用例）及扩展 | 31/31 |
| v4.245 新定向 | 27/27 |
| `_probe216b.txt` | 47/47 |
| `_probe230.json` | 12/12 |
| `_v243_repairs.txt` | 37/37 |
| `_v244_repairs.json` | 9/9 |
| 合计（同一 VM 连续 RUN） | **163/163** |
| SB3 结构检查 | 60,723 块，0 错误 |

G04/G05/G11–G14/G16–G18 共九项原失败语义均通过，G01–G03、G06–G10、G15 仍通过。测试组额外覆盖独立生成器实例、初次 send、默认 None、委托列表、空生成器返回、继承方法大小写及数字字典键更新。

### 压力（Scratch VM Turbo、单工作流，60 秒上限）

| 任务 | v4.246 时间 | 输出 | 10 秒目标 |
|---|---:|---|---|
| 10000 次累加 | 22,097 ms | `49995000` | 未达标 |
| 500 个数值字典键 | 8,805 ms | `500 41541750` | 达标 |
| 500 元素排序 | 8,829 ms | `500 0 100 25000` | 达标 |

三项均输出正确结果，500 键字典达到 10 秒目标；长循环仍需继续性能优化。排序输入与报告的原始输入不完全相同，因此不宣称排序速度的严格同比提升。

## 复现

```bash
node _work/v41/build246delta.cjs
node _work/v41/check41.cjs MiniPy_v4.246.sb3
MINIPY_MAX_MS=60000 node _work/v41/runrepair.mjs MiniPy_v4.246.sb3 _work/v41/_v246_probe.txt --shared --suite _work/v41/_v245_probe.txt --suite _work/v41/_probe216b.txt --suite _work/v41/_probe230.json --suite _work/v41/_v243_repairs.txt --suite _work/v41/_v244_repairs.json
MINIPY_TURBO=1 MINIPY_MAX_MS=60000 MINIPY_MAX_STEPS=20000 node _work/v41/runrepair.mjs MiniPy_v4.246.sb3 _work/v41/_v246_stress.txt --shared
```

测试需要可用的 `scratch-vm`（可通过 `MINIPY_VM` 指定）与 CPython 3。压力脚本是按报告任务重建的示例，不是报告全部原始用例；计时不可直接与不同硬件、VM 模式或运行策略的结果比较。尚未重跑全部 285 例或仓库的 873 项历史覆盖组。P777 不声称完整实现 Python 的所有表达式位置、生成器异常注入、close/throw 或所有委托迭代器协议。
