# MiniPy v4.248 收尾阶段全面多维度测试报告

> 基线：`MiniPy_v4.248.sb3`，Git `9c317e0e`，2026-11-22。测试入口：真实 RUN 广播 + CPython 3.12.14 差分；共享 VM 结果与隔离复跑分别记录。

## 0. 结论先行

- 现有发布资料的历史定向回归：**243/243**；另有提交摘要：shared-VM probes **111/111**、backlog **33/33**、reg232 **589/593**。这不等于完整套件 323/323：发布说明明确未重跑全部 323 项。
- 本轮新增收尾种子：**16 项，11 PASS、3 FAIL、2 XFAIL**。FAIL 是可复现的语义/协议缺口；XFAIL 是已确认的能力边界或 Scratch 资源风险。
- 最重要发现：`send(non-None)` 触发 TypeError 后生成器的首次启动副作用丢失；挂起生成器 `throw()` 的异常处理副作用丢失；`yield from` 的 `throw()` 未透传；字典 `keys/values/items` 是快照而非动态 view；500 键字典压力在 60 秒内未完成。
- 发布建议：**不阻断**已有 243/243 定向绿灯，但应把上述 3 个生成器问题列为 P0/P1 语义缺陷；dict view 与 Tdict500 按目标兼容范围登记 XFAIL/限制。

## 1. 阶段一：测试计划

### 1.1 特性优先级表


| 特性                                     | 实现不确定度 | Scratch 耦合度 | 反直觉规则密度 | 总分  | 已有用例覆盖                   | 本轮是否聚焦 |
| -------------------------------------- | ------ | ----------- | ------- | --- | ------------------------ | ------ |
| 生成器 send/throw/close、yield from 异常协议   | 5      | 5           | 5       | 125 | L1/L2 有，L3/L4 深层不全       | 是      |
| 闭包/nonlocal、genexp late binding        | 5      | 4           | 5       | 100 | 部分历史覆盖，组合边界不全            | 是      |
| with 清理/抑制/替换异常                        | 4      | 4           | 5       | 80  | 有基础项，嵌套与替换不全             | 是      |
| dict 投影/view、缓存失效、混合类型                 | 4      | 4           | 4       | 64  | v4.248 有专项，live view 未确认 | 是      |
| 控制流 break/continue/return/finally      | 3      | 3           | 5       | 45  | 部分覆盖                     | 是      |
| 性能/大规模循环与字典                            | 4      | 5           | 2       | 40  | 有压力结果，Tdict500 风险        | 是      |
| 绑定方法/动态属性/迭代器协议                        | 3      | 3           | 4       | 36  | v4.246–248 新增专项          | 补充     |
| 排序/key 帧/异常传播                          | 3      | 3           | 4       | 36  | 已有稳定性专项                  | 补充     |
| 参数与字面量求值顺序                             | 3      | 2           | 5       | 30  | 已有 next 默认专项             | 补充     |
| 标准库 math/cmath/random/time/datetime/re | 2      | 2           | 2       | 8   | real/real2/reg232 高覆盖    | 否      |


### 1.2 本轮聚焦声明

- 聚焦特性：生成器异常/提前退出、闭包与对象协议、with 清理、控制流退出、字典投影/缓存、排序 key 与参数求值、大规模压力。
- 目标层：以 **L3 → L4 → L5** 为主；仅对待确认能力保留 L1 门槛探测。
- 理由：生成器异常协议评分 125、闭包 100、with 80，且历史覆盖已主要集中 L1/L2 与专项回归。

### 1.3 能力缺口推断


| 特性/机制                                     | 档位           | 依据                                                    | 若待确认，L1 探测建议                             |
| ----------------------------------------- | ------------ | ----------------------------------------------------- | ---------------------------------------- |
| 普通生成器挂起/恢复、send/close、StopIteration.value | 确定支持         | v4.246–248 更新说明及 I01–I40 定向回归                         | —                                        |
| 生成器 throw 的完整异常捕获与 yield-from 透传          | 待确认/本轮实测部分失败 | release note 仅保证基础协议；本轮 gen-L3-02、gen-L4-01 失败        | 最小 suspended throw + 子生成器 catch          |
| 闭包 lexical cell/nonlocal、独立实例             | 确定支持         | 历史 E4 修复说明；closure-L3-01 PASS                         | —                                        |
| genexp late binding 与作用域                  | 确定支持（当前探针）   | genexp-L5-01 PASS；历史 P766/P769                        | —                                        |
| 自定义 with suppression                      | 部分支持/待确认     | with-L4-01 PASS，但替换异常/多重 with 未测                      | normal exit + **enter** 抛错 + **exit** 抛错 |
| ExceptionGroup/except* 高级协议               | 待确认          | 历史有基础专项，但 derive/split/traceback 未完全保证                | 单一 ValueError/TypeError group 分支         |
| CPython 动态 dict view                      | 确定不支持或未承诺    | dict-L3-01 三次均返回初始快照                                  | keys() 后增删改再 list(view)                  |
| 500 键字典稳定完成                               | 待确认/性能风险     | 压力项 60 秒未完成；v4.248 release note 的 Turbo 样例曾达标，运行策略有差异 | 150 键门槛后再递增到 500                         |
| GC/克隆上限/并发重绘确定性                           | 确定不支持作为语义承诺  | Scratch 运行时约束，无稳定 oracle                              | 只做完成性观察，统一 XFAIL                         |


### 1.4 已有用例覆盖摘要


| 特性     | 维度                                     | 已覆盖                      | 部分覆盖                              | 未覆盖                    |
| ------ | -------------------------------------- | ------------------------ | --------------------------------- | ---------------------- |
| 生成器    | 正常 next、send、close、StopIteration.value | I01–I40、v4.246–248       | throw 捕获/透传、三参数 throw             | 异常处理副作用丢失、委托 throw     |
| 闭包/作用域 | 独立 cell、大小写、genexp scope               | probe216b、P780、genexp 探针 | 复杂闭包与 late binding 压力             | 更多嵌套返回 callable        |
| 异常/清理  | try/except/finally、PEP479、基础组          | probe216b、excval、gen-L3  | 异常替换、with 多层                      | traceback 树/自定义 derive |
| with   | 基础 suppression                         | G08、with-L4-01           | normal exit、**enter**/**exit** 异常 | 多重上下文/非布尔返回            |
| dict   | 读写、投影、缓存失效路径                           | P788/P789、reg232         | 动态 view 语义                        | 视图对象活性                 |
| 控制流    | loop else、break/continue、嵌套算法          | probe216b、control-L3     | return+finally 组合                 | 更深对抗性控制流               |
| 性能     | 10000 loop、150/500 字典、排序               | v4.248 压力记录              | 跨运行策略稳定性                          | Turbo/浏览器渲染实测          |


### 1.5 规划假设清单

- H1：编译器支持生成器挂起/恢复。若成立，本轮可测 L3 throw/close 与 L4 yield-from；若不成立，本轮浪费生成器深测，应改为 L1 门槛并转向 with/控制流。
- H2：编译器支持异常对象绑定、异常类型匹配和清理栈。若成立，本轮可区分“异常捕获失败”和“事件日志丢失”；若不成立，本轮浪费异常消息/args 断言，应降级为仅断言 finally/完成态。
- H3：类、实例属性与绑定方法已实现。若成立，本轮可测动态属性与方法协议；若不成立，object/call 用例应改为普通函数/字典门槛，避免误报。
- H4：genexp 已编译为可恢复生成器且作用域隔离。若成立，本轮可测部分消费、耗尽与外部变量不泄漏；若不成立，genexp L4/L5 全部浪费，应保留 L1 探测。
- H5：共享 VM 的跨 RUN 重置足以隔离全局状态。若成立，连续回归可发现泄漏；若不成立，shared 结果会把前序状态污染到后序，应改为每例 fresh VM 并单独做 shared 复验。
- H6：并发/重绘/克隆上限可能非确定。若成立，压力用例只能做完成性/上界诊断；若不成立，仍不能把墙钟当语义 oracle。

### 1.6 冲突与待确认

- 发行说明的 v4.248 压力表称 500 键字典 6.137–6.915 秒达标；本轮同一版本、不同种子表达与 runner 状态下 500 键 view 探针 60 秒未完成。裁决：两者不静默合并，前者保留为 Turbo 专项样例，后者标为共享/当前 runner 下的 Scratch 风险；需在同一脚本、同一模式下复现确认。
- Generator 对部分基础协议的“已实现”与本轮深层 throw 失败并不冲突：裁决为“基础路径确定支持，异常注入深层协议待确认/部分不支持”。

## 2. 阶段二：合并种子用例清单

以下保留 Generator 输出字段；状态是主控实际跑测后的合并字段。完整可执行 JSON：`_work/v41/_closeout_v248_seed.json`。  
| ID | 层 | 标签 | 状态 | Scratch 风险 |  
|---|---|---|---|---|  
| gen-L3-01 | L3 | gen/L3/exception | FAIL | 需人工确认 / 依赖生成器挂起恢复 |  
| gen-L3-02 | L3 | gen/L3/cleanup | FAIL | 需人工确认 / 依赖生成器挂起恢复 |  
| gen-L3-03 | L3 | gen/L3/close | PASS | 需人工确认 |  
| gen-L3-04 | L3 | gen/L3/pep479 | PASS | 需人工确认 |  
| gen-L4-01 | L4 | gen/L4/yield-from | FAIL | 需人工确认 / 依赖生成器挂起恢复 |  
| with-L4-01 | L4 | with/L4/exception | PASS | 需人工确认 |  
| closure-L3-01 | L3 | closure/L3/nonlocal | PASS | 需人工确认 |  
| object-L3-01 | L3 | object/L3/lookup | PASS | 需人工确认 |  
| iterator-L3-01 | L3 | iterator/L3/protocol | PASS | 依赖并发顺序 |  
| control-L3-02 | L3 | control/L3/exit | PASS | 需人工确认 |  
| eval-L4-01 | L4 | eval/L4/order | PASS | 无 |  
| dict-L3-01 | L3 | dict/L3/cache | XFAIL | 需人工确认 / 共享 VM 缓存状态 |  
| sort-L4-01 | L4 | sort/L4/exception | PASS | 需人工确认 |  
| genexp-L5-01 | L5 | genexp/L5/scope | PASS | 需人工确认 / 跨帧状态 |  
| stress-L5-01 | L5 | stress/L5/dict | XFAIL | 依赖重绘门控 / 60 秒未完成 |  
| stress-L5-02 | L5 | stress/L5/loop | PASS | 依赖重绘门控；耗时仅诊断 |

### 2.1 实测失败明细

- **gen-L3-01**：预期 `entered` 在首次合法 `next` 前出现；实际只有 `TypeError` 与 `ready`，说明异常后恢复路径丢失生成器体内副作用。
- **gen-L3-02**：预期 `caught`、`recovered`、`finally`、`done`；实际缺少 `caught`，但仍有 `recovered/finally/done`，说明异常处理体的事件/绑定路径不完整。
- **gen-L4-01**：预期子生成器捕获 ValueError 并返回 2；实际 ValueError 直接逃逸，说明 `yield from` 的 throw 透传未闭环。
- **dict-L3-01**：预期动态 view 反映增删改；实际三次均为初始快照。按目标兼容范围标 XFAIL，而不是把快照实现误称为 CPython view。
- **stress-L5-01**：60 秒无输出，标 Scratch 风险 XFAIL，不据此断言字典语义错误。

## 3. SA-3 Mutator 原样结果摘要


| 派生自                                                                                                                                                         | 变换类型   | 变换说明                   | 预期                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------- | ------------------------------- |
| gen-L3-03                                                                                                                                                   | A      | 将 swallow 先保存到临时变量     | 事件保持；True 时增加 suppressed        |
| gen-L3-04                                                                                                                                                   | B      | 插入无副作用局部语句             | 保持 exhausted/throw 结果           |
| with-L4-01                                                                                                                                                  | D      | **exit** True→False    | after 消失，ValueError 逃逸          |
| closure-L3-01                                                                                                                                               | A      | 拆分 nonlocal 自增为临时变量+写回 | 保持独立 cell 结果                    |
| object-L3-01                                                                                                                                                | D      | delattr→setattr        | 最后回退值 base→second-instance-kind |
| iterator-L3-01                                                                                                                                              | A      | done 状态先存临时变量          | 保持迭代结果                          |
| control-L3-02                                                                                                                                               | A      | 条件先存临时变量               | 保持 finally 与 break 结果           |
| eval-L4-01                                                                                                                                                  | A      | 首个实参先存临时变量             | 保持求值顺序与返回值                      |
| sort-L4-01                                                                                                                                                  | D      | x==3→x==99             | 异常路径→成功排序路径                     |
| genexp-L5-01                                                                                                                                                | A      | next 结果先存临时变量          | 保持部分消费/作用域                      |
| stress-L5-02                                                                                                                                                | D      | break 9998→9999        | (6665,9998)→(6666,9999)         |
| 状态：已执行 11 个派生；初轮 10/11 通过。`sort-L4-01` 的第一版派生源码没有打印成功分支，属于 Mutator 生成的 Oracle/载荷缺陷；修正后 1/1 通过。`stress-L5-02` 的 9999 变体在 20 秒短跑下未完成，保留 Scratch 风险，不计语义 FAIL。 |   |                   |                            |


## 4. SA-4 Reviewer 审查表（原样结构）


| 问题类型       | 涉及用例 ID                                          | 建议动作（补充/降级/合并/标 XFAIL）                          |
| ---------- | ------------------------------------------------ | ----------------------------------------------- |
| 维度覆盖缺口     | 未重跑的完整历史 80 项                                    | 补充执行；不得将 243/243 外推为 323/323                    |
| 维度覆盖缺口     | gen-L3-01、gen-L3-02、gen-L4-01                    | 补充 throw 三参数/异常类/实例/挂起 send                     |
| 维度覆盖缺口     | gen-L3-03、gen-L3-04                              | 补充耗尽后的 close/throw/next                         |
| 维度覆盖缺口     | with-L4-01                                       | 补充 normal exit、**enter** 抛错、**exit** 抛错、多重 with |
| 维度覆盖缺口     | 本轮无对应 ID                                         | 补充 ExceptionGroup 高级协议与 cause/context           |
| 维度覆盖缺口     | 本轮无对应 ID                                         | 补充克隆上限、广播重入、重绘门控、GC；不支持则集中 XFAIL                |
| 维度覆盖缺口     | 11 个 Mutator 派生                                  | 补充实际执行结果                                        |
| 伪高维        | stress-L5-02                                     | 降级为 L3 控制流 + 性能探针                               |
| 伪高维        | stress-L5-01                                     | 拆分规模压力与 view 语义                                 |
| Oracle 脆弱  | dict-L3-01                                       | 拆分 live-view 与删除重插入顺序两个 Oracle                  |
| Oracle 脆弱  | sort-L4-01                                       | 不强断言 key 调用具体顺序；保留每项一次/结果/稳定性                   |
| 语义重复       | gen-L3-01、gen-L3-03、closure-L3-01、iterator-L3-01 | 合并历史回归；保留为边界 smoke                              |
| Scratch 风险 | gen-L3-01/02/03、gen-L4-01、genexp-L5-01           | 标挂起/恢复依赖；shared VM 顺序复跑或 fresh VM               |
| Scratch 风险 | dict-L3-01                                       | 每例前重置 VM，避免缓存/前序状态污染                            |
| Scratch 风险 | stress-L5-01、stress-L5-02                        | 只作完成性/诊断；不把墙钟当语义断言                              |
| 应标 XFAIL   | gen-L4-01                                        | 当前 yield-from throw 未保证，已知能力边界                  |
| 应标 XFAIL   | dict-L3-01                                       | 目标不承诺 CPython live view 时，快照实现不阻断发布             |
| 应标 XFAIL   | stress-L5-01                                     | 60 秒无输出；共享 VM/重绘门控风险                            |
| 维度覆盖缺口     | gen-L3-01、gen-L3-02                              | 拆分异常类型、后续 next 状态、异常处理事件三个 Oracle               |


## 5. 冲突条目与裁决建议


| 冲突              | 证据 A                            | 证据 B               | 裁决建议                                     |
| --------------- | ------------------------------- | ------------------ | ---------------------------------------- |
| 500 键字典性能       | v4.248 release note Turbo：6–7 秒 | 本轮 view 探针：60 秒未完成 | 不静默合并；拆成固定脚本/模式的性能档与语义档，当前后者 XFAIL       |
| 生成器 throw “已实现” | v4.247/248 声称 throw/close 支持    | 本轮深层 catch/透传失败    | 基础 throw/close PASS；深层异常帧/委托透传单独列缺口      |
| dict “缓存失效”     | P789 声称写入/删除后重新验证               | 本轮 `keys()` 对象仍为快照 | P789 是下标查找缓存，不等价于 CPython 动态 view；两者分开计数 |


## 6. XFAIL 与已知限制清单

- XFAIL-GEN-YF-THROW：`yield from` 委托生成器的 `throw()` 透传未闭环。
- XFAIL-DICT-LIVE-VIEW：当前 `keys()/values()/items()` 返回快照语义；除非目标明确承诺 CPython 动态 view，否则不阻断发布。
- XFAIL-TDICT500：500 键字典在本轮 runner/共享 VM/重绘条件下 60 秒未完成。
- XFAIL-SCRATCH-RUNTIME：不对 GC 时机、克隆上限、并发/广播顺序、重绘门控建立确定性语义断言。
- 版本依赖限制：零除消息存在 CPython 3.12 与 3.14 文本差异；只断言异常类型或明确选定 Python 版本，不断言跨版本完整消息。

## 7. 下一轮建议

1. P0：最小化修复/定位生成器异常帧：分别测试 `send(non-None)` 后合法 next、`throw` 捕获事件、`yield from` throw 透传；每项独立 EVENTS Oracle。
2. P1：明确 dict 目标契约：若只支持快照，补文档并把 live-view 统一 XFAIL；若承诺 CPython，则实现 view 引用/失效策略。
3. P1：统一运行档：Turbo/普通 VM、shared/fresh、同一输入脚本、同一超时；重跑 Tloop10000/Tdict500，解决 release note 与本轮结果冲突。
4. P1：补 Reviewer 指出的 with/ExceptionGroup/throw 三参数/耗尽生成器矩阵。
5. P2：执行 11 个 Mutator 派生，不把“已生成”计为覆盖；再做全量 323 项历史回归。

## 8. 可复现命令

```powershell
$env:PYEXE="python"
$env:MINIPY_VM="C:\Users\浅羽悠真\OneDrive\Desktop\不常用\scratch-vm-test\node_modules\scratch-vm"
$env:MINIPY_MAX_MS="60000"; $env:MINIPY_MAX_STEPS="20000"
node _work/v41/runrepair.mjs MiniPy_v4.248.sb3 _work/v41/_closeout_v248_seed.json --shared
node _work/v41/check41.cjs MiniPy_v4.248.sb3
```

## 9. Mutator 实测补充

- 11 个派生定义均已落盘：`_work/v41/_closeout_v248_mutants.json`。
- 10/11 初轮通过；`sort-L4-01` 因成功分支未写入 `observed`/`print`，出现“空输出但 runner 通过”的伪成功。修正载荷后单独复跑 1/1 PASS：`_work/v41/_closeout_v248_mutants_fixed.json`。
- `stress-L5-02` 变体 `break 9999` 在 20 秒短跑未完成；按协议标 Scratch 风险，不作为确定语义失败。

 