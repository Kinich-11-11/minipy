# MiniPy v4.242 更新说明：括号根自增、格式化与正则属性

基线：v4.241（`9be7eb2`），同步到最新仓库 `be67373`（曲线统计工具更新）。本轮增加 P760，产物 `MiniPy_v4.242.sb3`；不改变 v4.241 的异常组实现及远端统计工具。

## 修复内容

| 项目 | v4.242 行为 |
|---|---|
| `(f()).v += 5` | 在通用赋值重写前进入专用路径；接收者只求值一次，读旧属性 → 计算 RHS → 写回原接收对象。支持多参调用、深层属性、既有 `rightside` 支持的增强运算符以及右侧异常传播。 |
| `f'{p}'` | 存在自定义 `__format__` 时传入 `''` 而非直接使用 `__str__`；显式 `!s`/`!r` 保留原转换规则。 |
| `format('abc', 'a')` | 对格式 mini-language 中 str 的非空 type code 进行校验，仅允许 `s`；非法 code 抛出 `ValueError`，不影响百分号格式和 `!a` 转换。 |
| `p.pattern`、`m.re` | `Pattern.pattern` 读取原始模式字符串；`Match.re` 返回可继续使用的 Pattern 值。支持直接及链式属性、存储在列表中的 Match、命名组与迭代结果。 |

附带修复：`__format__` 返回非字符串时抛出 `TypeError`；P740 无 `__format__` 且非空 spec 的错误分支不再把积木 ID 当成错误消息。

## 根因与方案

### 括号根增强赋值

P732 将增强赋值改写为普通赋值，P742 的 `z736pc` 门控状态会被接收者函数内部的 `execute` 重置。即便只恢复门控，`pathset` 再次求接收者仍会重复调用 `f()`。本轮在预扫描之后、其他语句分类之前捕获以括号开头、以属性结束的增强赋值。过程参数保留操作符位置、原始 RHS 边界、属性名和执行行；只求值接收对象一次，复用属性查找、`rightside`、`aset` 与 `presync` 完成读改写。类属性的标量增强赋值写到实例，避免改动类本身；异常时不落账。普通括号根赋值与元组解包仍走原路径。

### 格式化

空 spec 的 f-string 之前直接走 `__str__`；P760 在该分支优先 `__format__('')`，并保存外层 f-string 扫描位置及文本以支持方法内部的嵌套 f-string。`pctitem` 在 `pcsrc=1`（format，而非 `%`）且值为 str 时对非空 code 做精确校验，区分 `s` 和 `S`。自定义对象的格式方法仍拥有整个 spec。

### 正则编码

旧 Match 值把 subject、位置和组信息直接用 `|` 拼接，既没有模式字段，也会让 subject 内的竖线破坏解码。新编码以字符长度前缀保存 subject 和完整 pattern，再保留位置、组和命名映射。`rxmsplit` 恢复原 `RxP` 行布局（subject 仍是第 1 行，group-name 表仍在末行），另取模式字段供 `rxattr` 返回 P 类型值。因此 `group`、`groups`、`span`、`lastgroup`、`repr` 等消费方仍通过同一解码器工作。普通用户自定义对象的 `.pattern`/`.re` 不经过推测性重复求值。

## 示例

```python
import re

p = re.compile(r'a\|b')
m = p.search('x|a|b|z')
print(p.pattern, m.re.pattern, m.group(), m.span())
# a\|b a\|b a|b (2, 5)
```

## 验证与构建

新增 `_work/v41/_v242_repairs.txt` 覆盖 27 个差分用例。包含接收者仅求值一次、嵌套调用及异常、显式转换、非法格式码、无效 `__format__` 返回值、正则竖线/命名组/`finditer`/复合表达式及用户同名属性。

| 验收项目 | 最终结果 |
|---|---:|
| 括号根赋值及自增回归 | **8/8** |
| 空 spec 分派及格式码 | **8/8** |
| 正则模式属性及旧 Match 消费 | **11/11** |
| 完整源码构建重点抽测 | **5/5** |
| 增量/完整构建结构检查 | 各 57,309 块，**0 错误** |

相关回归：`_v236_fmt.json` 非交互 7/7，`_v236_hof.json` 9/9，`_v236_chain.json` 7/7，`_v233_dt_match.json` 18/18，v4.241 异常组重点抽测 12/12。`_v236_fmt.json` 另两项 `input_ascii_*` 在 v4.241 和 v4.242 的 headless 测试环境均等待输入超时，未计入通过数。

```bash
node _work/v41/assemble242.cjs
node _work/v41/build242.js
node _work/v41/check41.cjs MiniPy_v4.242.sb3
node _work/v41/runrepair.mjs MiniPy_v4.242.sb3 _work/v41/_v242_repairs.txt
```

增量构建：`node _work/v41/assemble242.cjs --delta`，随后 `node _work/v41/build242delta.js`。默认基座为 v4.241；`MINIPY_VM` 可指定 Scratch VM 模块路径。

既有 regex 引擎的组内 alternation 和 compile flags 等兼容性限制不属于本轮元数据修复；调用根的容器索引写回（如 `(f())['k'] = 9`）也仍为独立待办项。
