# MiniPy v4.241 更新说明：异常组与 `except*`

基线：v4.240（`9f6387f3`）。本轮以 P759 独立实现异常组，保留 P758 的排序修复。产物为 `MiniPy_v4.241.sb3`，构建管线为 `assemble241.cjs → build241.js`。

## 新增能力

* `ExceptionGroup(message, exceptions)`、`BaseExceptionGroup(message, exceptions)`，支持非空 list/tuple、嵌套异常组及用户自定义异常作为叶子。对消息类型、空序列、非异常成员、`ExceptionGroup` 中的非 `Exception` 成员进行校验。
* `BaseExceptionGroup` 根据成员选择 `ExceptionGroup` 或 `BaseExceptionGroup`；补充 `KeyboardInterrupt`、`SystemExit`、`GeneratorExit` 类。异常组复用既有异常对象堆、继承关系、`args`、异常链属性和普通 `except`，提供 `.message`、只读 `.exceptions` 元组、`str`、`repr`。
* `except*` 递归按异常类型（类、类型元组、动态类型表达式）拆分树，保留分组消息、嵌套层次、叶子顺序和异常对象身份；每个匹配分支依次运行，未匹配部分向外传播。单个普通异常在命中 `except*` 时包装成匿名组，不命中时保持原异常。
* 裸 `raise` 的叶子按原组结构合并，显式 `raise e` 或新异常单独进入传播组；支持与普通 `try/except`、`else`、`finally`、嵌套 `except*` 及 `with` 的组合。执行结束后删除 `as` 绑定。
* `split(type_or_tuple)`、`subgroup(type_or_tuple)` 和 `derive(exceptions)`；拆分时复制异常链属性，空子树表示为 `None`。
* 编译阶段检查同一 `try` 混用 `except`/`except*`、缺少捕获类型、从 `except*` 块直接 `return` 或跳出处理器的 `break`/`continue`。禁止以异常组类作为 `except*` 捕获类型。

附带修复：列表/元组元素的 `C`（类值）标记与 `CPX`（复数值）解码冲突。现在识别完整的复数前缀与数值对，避免异常类型元组被错误解码。

## 示例

```python
try:
    raise ExceptionGroup('outer', [
        ValueError('a'),
        ExceptionGroup('inner', [TypeError('b'), ValueError('c')])
    ])
except* ValueError as e:
    print(repr(e))
except* TypeError as e:
    print(repr(e))
```

与 CPython 一致的输出：

```text
ExceptionGroup('outer', [ValueError('a'), ExceptionGroup('inner', [ValueError('c')])])
ExceptionGroup('outer', [ExceptionGroup('inner', [TypeError('b')])])
```

## 实现

P759 用 `EGId/EGMsg/EGSeq` 保存堆对象对应的组内容；原有 `InstCls` 与属性表继续承担类型、属性和异常链语义。`egsplit` 将同一棵树划分为匹配和剩余两棵子树，以独立的递归栈保存每层遍历状态。`EG*` 处理器栈则保存剩余组、重新抛出的叶子、新异常及语句边界，并在现有的 `trycatch` 调度中恢复下一个 `except*` 分支。所有新增状态在 RUN 时清空。

## 验证与复现

独立差分套件 `_work/v41/_v241_exception_groups.txt` 覆盖 41 个用例，包括构造、嵌套、部分捕获、普通异常包装、未命中传播、裸重抛与显式重抛、异常链、动态类型表达式、混合语法诊断及上下文管理器组合。

| 验收项目 | 结果 |
|---|---:|
| 异常组新增差分套件（增量构建产物） | **41/41** |
| 原异常边界 `_exc232_edges.json` | **25/25** |
| `_v238_target.txt` 中排序、复数、with 相关用例 | **10/10** |
| 完整源码构建重点抽测（nested、reraise_tree、dynamic_type_function、readonly） | **4/4** |
| 完整构建及增量构建 `check41.cjs` | 各 56,961 块，**0 错误** |

```bash
node _work/v41/assemble241.cjs
node _work/v41/build241.js
node _work/v41/check41.cjs MiniPy_v4.241.sb3
node _work/v41/runrepair.mjs MiniPy_v4.241.sb3 _work/v41/_v241_exception_groups.txt
node _work/v41/runrepair.mjs MiniPy_v4.241.sb3 _work/v41/_exc232_edges.json
```

也可在 v4.240 SB3 基础上通过 `node _work/v41/assemble241.cjs --delta` 和 `node _work/v41/build241delta.js` 构建（`V41_SRC` 可指定基座）。差分测试需要 Scratch VM 和 Python 3.11+；`MINIPY_VM` 可指定 Scratch VM 模块路径。

## 范围与后续

本轮实现 PEP 654 的核心组值与捕获、传播语义；尚未实现完整 CPython traceback 对象及异常组树状 traceback 展示、异常组子类的自定义 `__new__`/`derive` 分派、`split`/`subgroup` 的任意 callable 谓词，以及构造器对任意自定义 sequence 协议的兼容。MP-17/MP-18 等性能项目仍沿用 v4.240 状态，本轮不更改这些路径。
