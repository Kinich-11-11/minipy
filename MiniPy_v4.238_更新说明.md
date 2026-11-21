# MiniPy v4.238 更新说明

基线：`main` 的 `1eb67dd42d1663b0d6e7d54ca3868d77eed816b6` / MiniPy v4.237。
依据《MiniPy v4.236 待修复清单》，继续 MP-07～MP-18；保留 v4.237 历史产物和 P743～P748。

## 本轮修复

| 编号 | 状态 | 补丁及说明 |
|---|---|---|
| MP-07 | 原场景及扩展用例通过 | P753：`with` 块头识别、进入/退出帧；正常、异常抑制/传播、嵌套、return、break/continue |
| MP-08 | 通过 | P752：`list.sort(key=..., reverse=...)` 复用 srtkey；稳定排序、对象、内置 key、原无 key 行为 |
| MP-09 | 通过 | P751：P226 后增的推导式目标寄存器纳入 csave/crestore、csp/crp；补齐 crng 单参数递归保护 |
| MP-10 | 通过 | P750：识别尾下标的深层删除目标，重建容器并 pathset 写回；避免重复执行同一删除语句 |
| MP-11 | 通过 | P750：P732 深层增强赋值分派补齐以 `]` 结束的目标；销售订单例输出 rejected / 160 / 1 2 |
| MP-12 | 数值构造器通过 | P749：`complex()`、一/二数值参数、已有复数参数，复用 CPX 与 cpset/cpsplit |
| MP-13 | 通过 | P749：`math.log(x[, base])`、定义域、base=1 异常；支持 from-import |
| MP-14 | 通过 | P749：factorial，0/负数/浮点类型检查，超过安全整数范围使用 P589 十进制乘法 |
| MP-15 | 通过 | P749：gcd，零参、负数、零、多参、类型检查，长整数复用十进制除法 |
| MP-16 | 10 个原关联用例通过 | P754：JSON 模块注册、独立递归解析与序列化，支持嵌套结构、布尔值、null、字符串转义；不通过 eval 执行输入 |
| MP-17 | 未达性能目标 | 词法行缓存原型未带来足够收益，不纳入本版 |
| MP-18 | 部分改善，待继续优化 | P756：字符串键查找单次扫描；仅变量面板预览限制长字典的 repr 计算，真实值及 print/repr 不截断 |

## 测试说明

- `_work/v41/_v237_bl.txt` 是上一轮的 33 个功能用例。修复前针对 MP-07～15 的 11 例全部失败。本轮功能阶段 32/33 通过，MP-07～16 的 21 个相关用例全部通过；加入 P756 后再次检查 12 个字典/JSON 组合用例为 12/12，最后完整重建 SB3 的 8 个重点烟测为 8/8。
- 最终 `check41.cjs`：55,482 积木、0 结构错误；`webfix` dangling=0、orphans=0。
- MP-05 的 `R2_L02` 在同一 Linux Scratch VM 5.0.300 环境中，v4.237 与 v4.238 均会报 `TypeError: unexpected keyword argument z`。因此保留为既有兼容性问题，不计作本轮新回归，也不直接采信旧版“隔离必过”的结论。
- 新增 `_work/v41/_v238_target.txt`，覆盖上下文管理器、稳定排序、嵌套推导式、深层删除、复数、math 边界和 JSON 转义/嵌套/错误处理等；`runrepair.mjs` 使用独立 VM 和 CPython 差分验收。`_v238_results.json` 保留分阶段实测记录（实际输出、预期、错误、耗时）。
- 所有运行时间是本机 headless Scratch VM 记录的墙钟时间，非 Scratch/TurboWarp 浏览器性能保证。性能用例 10 秒是软截止，并非证明程序永远无法完成。

首轮同环境性能测量（10 秒软截止）：

| 用例 | v4.237 | v4.238 | 验收 |
|---|---:|---:|---|
| Tloop10000 | 超时（10,003 ms） | 超时（10,004 ms） | 未达标 |
| Tdict150 | 超时（10,074 ms） | 6,965 ms，输出 `150 1113775` | 达标 |
| Tdict500 | 超时（10,062 ms） | 超时（10,008 ms） | 未达标 |

Tdict150 在最终 SB3 上额外复跑两次为 6,211、6,306 ms，三次均输出正确，三轮中位数 **6,306 ms**。Tloop10000、Tdict500 只完成了软截止测量，尚未完成真实耗时的长时三轮对比，留作下一轮。

## 兼容性边界

- `with` 当前支持单个上下文管理器及可选单标识符 `as`；多管理器同一行、复杂解包目标以及真实 traceback 对象未实现（第三个参数传 None）。
- `complex` 支持数值构造；字符串构造、关键字参数尚未扩展。
- JSON 支持基础 `loads(str)`、`dumps(value)`，字典键当前限字符串；`indent`、`sort_keys`、`ensure_ascii` 等关键字及 `JSONDecodeError` 专属类型尚未实现。非 ASCII 序列化允许直接输出 Unicode（合法 JSON，但不是 CPython 默认的 ASCII 转义格式）。
- 深层 `del` 当前覆盖单个尾下标（列表/字典）；切片删除、复杂删除目标和用户自定义 `__delitem__` 未扩展。
- 高级全量 267/873/593 等历史套件未逐一重跑，因此报告的通过数仅适用于明确列出的测试集合。

## 构建和复现

完整重建：

```bash
node _work/v41/assemble238.cjs
node _work/v41/build238.js
node _work/v41/check41.cjs MiniPy_v4.238.sb3
```

也可使用 v4.237 作增量基座：

```bash
node _work/v41/assemble238.cjs --delta
node _work/v41/build238delta.js
```

`V41_SRC`、`V41_OUT`、`V41_JSON`、`V41_STAMP` 可分别覆盖构建参数；本版组装不再依赖 Windows 绝对路径。

Node.js 测试（安装 scratch-vm 5.0.300 并确保 Python 3 可用）：

```bash
node _work/v41/runrepair.mjs MiniPy_v4.238.sb3 _work/v41/_v237_bl.txt
node _work/v41/runrepair.mjs MiniPy_v4.238.sb3 _work/v41/_v238_target.txt
MINIPY_MAX_MS=10000 MINIPY_MAX_STEPS=100000 node _work/v41/runrepair.mjs MiniPy_v4.238.sb3 _work/v41/_v237_perf.txt
```

可用 `MINIPY_VM` 指向本地 scratch-vm 模块（绝对路径），`PYEXE` 指定 Python。
