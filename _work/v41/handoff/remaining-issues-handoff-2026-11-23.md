# MiniPy 收尾阶段剩余问题交接清单

- **整理日期**：2026-11-23
- **项目根目录**：`C:\Personal\个人\编程\scratch\ai\minipython`
- **正式基线**：`C:\Personal\个人\编程\scratch\ai\minipython\MiniPy_v4.250.sb3`
- **正式基线 SHA-256**：`E3B80DB5B63A619C750BBA15FF4A9CA360C8B453508C4A03613C6462075BA5FD`
- **候选/日志/脚本目录**：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\`
- **当前原则**：不覆盖正式版；未通过完整回归的候选不得发布；主目录只保留正式发布作品和正式版本说明。

## 一、当前结论速览

| 优先级 | 问题 | 当前状态 | 是否可合入 v4.250 | 交接判断 |
|---|---|---|---|---|
| P0 | `gen-L3-01` 首次 `send(non-None)` / 首次恢复副作用 | **未修复** | 否 | 继续研究 generator first-resume 与外层 frame/list 恢复；当前应标 XFAIL |
| P0 | `dict-L3-01` 动态 `keys/values/items` view | **窄目标可通过，完整语义未修复** | 否 | 必须先解决稳定 dict identity/ref；当前应标 XFAIL |
| P1 | `gen-L3-02` | P821/P823 通过；P824 宽补丁回归失败 | 暂不单独发布 | 每次生成器候选都必须回归 |
| P1 | `gen-L3-03` | P821/P823 通过；P824 宽补丁仍通过 | 暂不单独发布 | 作为异常/清理回归门槛 |
| P1 | `gen-L4-01` | P821/P823 定向候选通过；P824 宽补丁失败 | 暂不单独发布 | 作为嵌套/组合回归门槛 |
| P2 | 目录与产物隔离 | 已完成 | 是 | 91 个过程文件已移入 `_work\v41\root_process`，SHA-256 已核验 |

## 二、正式版本与候选版本边界

### 正式版本

- `MiniPy_v4.250.sb3` 保持不变。
- `MiniPy_v4.249.sb3`、`MiniPy_v4.249-cloud.sb3`、`MiniPy_v4.249-local-p819.sb3`、`MiniPy_v4.248.sb3` 及历史正式版本保留。
- 任何修复候选都必须以新文件名写入 `_work\v41\`，不能覆盖正式 SB3。

### 已否决候选

| 候选 | 结论 | 原因 |
|---|---|---|
| `MiniPy_v4.250-p820-dict-view.sb3` | 不晋级 | 能通过部分动态 view 目标，但变量重绑定错误；`len/for` 仍不完整 |
| `MiniPy_v4.250-p820-scope-v2.sb3` | 不晋级 | 重绑定隔离成功，但原字典 mutate 后 view 不再更新；动态测试 0/3 PASS |
| `MiniPy_v4.250-p821-genL301-candidate.sb3` | 不晋级 | `gen-L3-01` 仍 FAIL；仅修正/保护 `GHStarted`，未恢复首次副作用 |
| `MiniPy_v4.250-p822-initialpc-candidate.sb3` | 不晋级 | initial PC 不是单独根因，不能用简单 `FnStart±1` 修复 |
| `MiniPy_v4.250-p823-targeted.sb3` | 不晋级 | 目标副作用偶有恢复，但出现重复异常事件；不能作为安全修复 |
| `MiniPy_v4.250-p824-prefix-merge.sb3` | 不晋级 | `gen-L3-01/02/L4-01` 回归失败；宽范围列表前缀合并造成回归 |

## 三、P0：`gen-L3-01` 交接项

### 目标用例

```python
log = []
def g():
    log.append("entered")
    value = yield "ready"
    log.append(("received", value))

it = g()
try:
    it.send(1)
except TypeError as e:
    log.append(("exc", type(e).__name__))
log.append(("next", next(it)))
print(log)
```

### CPython 语义预期

```text
[('exc', 'TypeError'), 'entered', ('next', 'ready')]
```

### 当前正式版实际

```text
[('exc', 'TypeError'), ('next', 'ready')]
```

对照用例显示，这不是 `send(non-None)` 独有的问题：

```python
log = []
def g():
    log.append("entered")
    yield "ready"
it = g()
log.append(("next", next(it)))
print(log)
```

正式版实际也会跳过 `"entered"`。

### 已确认根因方向

1. 首次 `send(1)` 的 `TypeError` 本身是正确的。
2. 后续 `next(it)` 能返回 `"ready"`，说明生成器对象与恢复入口并非完全失效。
3. 首次恢复时，生成器体内 `yield` 前的 `log.append("entered")` 没有稳定保留下来。
4. 深入诊断指向嵌套调用返回时的 frame/list alias 恢复：
   - 外层执行 `log.append(("next", next(it)))`；
   - `next(it)` 触发嵌套 frame 切换；
   - 生成器内对 `log` 的追加发生后，外层 frame 恢复时旧列表快照覆盖了新增事件。
5. 不能只改 `FnStart`、`GHStarted` 或把整个外层列表快照拼回去；后两类尝试已分别证明无效或会制造重复事件。

### 下一位修复者必须完成的实验

- [ ] 在外层 frame 保存时记录每个可变 list 的长度/内容基线，而不是只保存完整快照。
- [ ] 生成器恢复结束后，仅合并生成器期间真实新增的 list 后缀。
- [ ] 验证嵌套 `next()`、异常捕获、`finally`、`throw()` 不会重复合并外层事件。
- [ ] 明确区分“生成器新增事件”和“外层在嵌套调用返回后新增事件”。
- [ ] 不得通过全量列表拼接解决；不得修改正式版进行试错。

### 必跑验收矩阵

| 用例 | 通过条件 |
|---|---|
| `gen-L3-01` | 输出严格为 `[('exc', 'TypeError'), 'entered', ('next', 'ready')]` |
| `gen-L3-02` | 保持既有 PASS，不出现重复异常/重复事件 |
| `gen-L3-03` | 保持既有 PASS，异常清理顺序不变 |
| `gen-L4-01` | 保持既有 PASS，嵌套/组合恢复不回归 |
| 首次 `next()` 对照 | 必须保留 `"entered"` |
| 首次 `send(None)` | 与 CPython 首次恢复语义一致 |

### 相关实验材料

- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\p821_gen_send.cjs`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\p821_gen_send_cases.json`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\gen-L3-01.py`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\gen-L3-02.py`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\gen-L3-03.py`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\gen-L4-01.py`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\p823.txt`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\p824.txt`

## 四、P0：`dict-L3-01` 交接项

### 目标语义

```python
d = {"a": 1, "b": 2}
keys = d.keys()
values = d.values()
items = d.items()

d["c"] = 3
del d["a"]
d["a"] = 4
```

要求 view 同时满足：

1. 看到原字典后续 mutate；
2. `d = {"z": 9}` 重新绑定后，旧 view 仍指向原字典；
3. `list(view)`、`len(view)`、`for view` 语义一致；
4. `keys/values/items` 分别保持对应输出。

### 当前诊断

- P820 v1：部分 `list(view)` 动态行为可通过，但变量重新绑定错误；`len(view)` 与 `for view` 不完整。
- P820 v2：变量重新绑定隔离成功，静态 `len` 与静态 `for` 可工作；动态 mutate 测试 0/3 PASS。
- 精确阻塞点：当前字典主要是 `Values/Types` 中的序列化记录；view 保存变量名会错误跟随重绑定，保存 record 快照又无法跟随原字典 mutate。

### 正确修复方向

必须引入稳定对象身份或引用单元，不能继续只在 `list/len/for` 入口打补丁。可选设计：

```text
view -> dict object id
 dict object id -> 可变字典存储单元
```

或：

```text
view -> 隐藏注册表槽
字典 mutate -> 更新注册表槽
重新绑定 d -> 创建新对象身份，不改变旧注册表槽
```

必须覆盖所有可能替换字典序列化值的路径：

- `indexset`
- `indexdel`
- `update`
- `pop`
- `assign`
- `publish`
- 其他字典写入/替换路径

### 必跑验收矩阵

| 用例 | 通过条件 |
|---|---|
| 原字典新增键 | 已创建 view 能看到新增键 |
| 原字典删除键 | 已创建 view 不再看到被删键 |
| 原字典更新值 | `values/items` 反映更新 |
| 变量重新绑定 | 旧 view 不跟随新字典 |
| `len(keys/values/items)` | 与当前原字典大小一致 |
| `for keys/values/items` | 顺序与同一时刻的字典内容一致 |
| `list(keys/values/items)` | 与 `for` 结果一致 |

### 相关实验材料

- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\MiniPy_v4.250-p820-dict-view.sb3`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\MiniPy_v4.250-p820-scope-v2.sb3`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\p820_dict_view.cjs`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\p820_dict_view_report.md`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\dict_probes.json`

## 五、回归门槛与发布流程

任何新候选都必须按以下顺序执行：

1. [ ] 在 `_work\v41\` 生成候选 `.sb3`，不得写入主目录。
2. [ ] 结构检查：无损坏、无未定义 block、无异常 block 计数变化。
3. [ ] 先跑定向目标用例。
4. [ ] 再跑四项生成器回归：`gen-L3-01/02/03`、`gen-L4-01`。
5. [ ] 若涉及 dict，再跑完整 `dict-L3-01` 动态矩阵。
6. [ ] 对所有失败用例记录实际输出，不凭单一成功样例判定。
7. [ ] 对 Scratch 风险项重复运行，记录是否存在并发顺序/重绘门控/克隆上限影响。
8. [ ] 只有“目标通过 + 全部回归通过 + 结构检查通过”才允许进入发布候选。
9. [ ] 发布前计算 SHA-256，并与正式版本做差异记录。
10. [ ] 发布时新建版本号文件，不覆盖旧正式版本；发布完成后再次核验主目录布局。

## 六、XFAIL 与已知限制

### `gen-L3-01`

- **状态**：XFAIL / 已知限制。
- **限制**：首次恢复期间的前置副作用可能因嵌套 frame 与 list 快照恢复而丢失。
- **不能宣称已修复**：P821 只保证部分既有 generator 行为未回归，不修复目标问题。

### `dict-L3-01`

- **状态**：XFAIL / 已知限制。
- **限制**：当前实现无法同时保证“原字典 mutate 可见”和“变量重新绑定隔离”。
- **不能宣称已修复**：窄范围 `list/len/for` 成功不等于完整动态 view 协议完成。

### Scratch 风险

以下断言需要按 Scratch 风险处理，而不是直接归咎 Python 语义：

- 依赖并发顺序的广播/脚本恢复；
- 依赖重绘门控的状态可见性；
- 依赖克隆上限的对象模拟；
- 依赖 GC 时机的清理行为。

## 七、交接完成判定

当且仅当以下项目全部完成，才可结束本轮：

- [ ] `gen-L3-01` 有一个不引入 `gen-L3-02/03/L4-01` 回归的候选；
- [ ] `dict-L3-01` 完成稳定 identity/ref 设计并通过动态矩阵；
- [ ] 全量收尾套件重新执行并保存报告；
- [ ] 所有未实现或 Scratch 非确定行为明确标为 XFAIL；
- [ ] 正式 `MiniPy_v4.250.sb3` 未被试验覆盖；
- [ ] 新候选和日志均位于 `_work\v41\`；
- [ ] 主目录只留下正式发布作品和正式版本说明。

## 八、给下一位执行者的最短行动顺序

1. 先从 `gen-L3-01` 的 frame/list alias 诊断继续，不要再尝试简单改 `FnStart` 或全量列表拼接。
2. 若无法在一次迭代内同时通过四项 generator 回归，立即保留 XFAIL，不发布候选。
3. 之后再做 dict stable identity/ref；不要继续叠加只改 `list/len/for` 入口的补丁。
4. 每个候选都在 `_work\v41\` 留下：脚本、候选 SB3、运行日志、结构检查结果、回归结果和 SHA-256。
5. 最终只将通过完整门槛的新版本复制为正式发布文件。
