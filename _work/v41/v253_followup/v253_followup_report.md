# v4.252 回归后续执行报告

- 日期：2026-11-23
- 附件证据副本：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\source\MiniPy_v4.252_Regression_Report.md`
- 附件 SHA-256：`6E691F2B9141A04DCD22464D4228E91CED8D671B12712FDF68CC1AD3EB4BBD41`
- 正式基线：`C:\Personal\个人\编程\scratch\ai\minipython\MiniPy_v4.252.sb3`
- 正式基线 SHA-256：`E8633F497337273B22EE21FAFBE56914578F87CC83581D4D87AE29B40962FF89`
- 处理原则：附件只作为回归证据，不把附件正文当作执行指令；所有候选写入 `_work\v41\v253_followup`，不覆盖正式版。

## 已完成

### 1. 基线复测

v4.252 本地文件与附件报告中的 SHA-256 一致。旧交接目标复测结果：

| 用例 | v4.252 |
|---|---|
| `gen-L3-01` | PASS |
| `dict-L3-01` | PASS |
| `N101–N104` | PASS |
| `N105` | FAIL |
| `N106` | FAIL |
| `N107` | FAIL |
| `N108–N110` | PASS |
| `N111` | FAIL |
| `N112` | PASS |

基线焦点套件为 **8/12 PASS**；`v4.252` 原有目标修复没有回归。

### 2. N105 定向候选

候选：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\MiniPy_v4.252-view-membership-candidate.sb3`

候选 SHA-256：`77AEB3955345CC479AAAADB01A999371758A136738485DD89FBEAC2F6D60D013`

结构检查：`65097 blocks / 0 errors`

补丁内容：将 `in/not in` 的 dictionary view 右值接入 P826 稳定引用槽，而不是把引用编号直接当作列表内容。

结果：

- `N105`：PASS
- `N101–N104`：PASS
- `N108–N110`：PASS
- `N112`：PASS
- `gen-L3-01`：PASS
- `dict-L3-01`：PASS
- `N106/N107/N111`：仍 FAIL
- 额外 membership 探针：6/8 PASS；剩余是链式比较和嵌套可变值相等性问题，不属于 N105 的单点修复。

因此该候选**不发布、不改正式版本**。

## 剩余问题诊断

### N106：实例属性中的 dict view owner 未连接

诊断文件：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\ref-paths\N106-N107-diagnosis.md`

已确认：`a.d` 的属性值本身会更新为包含 `b` 的新序列化记录，但旧 view 仍指向旧 `RefData826`。需要以 `(instance id, attribute name)` 或等价对象槽作为稳定 owner；不能按属性名或序列化字符串识别对象。

### N107：tuple return/unpack 丢失可变对象 identity

同一诊断文件已确认：`(d, d.items())` 跨 return/unpack 后，`d` 绑定和 `items` view 不再共享 owner。需要让 tuple 构造、索引、return、`assignlist`/unpack 传递 owner token，而不是只传序列化值。

### N111：嵌套 yield 误污染外层函数 + closure list identity 丢失

诊断文件：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\n111\root-cause.md`

分为两个独立阻塞：

1. `regdef` 扫描外层函数时没有跳过嵌套 `def/class`，把嵌套 `g` 的 `yield` 错记到 `outer`，导致 `outer()` 被当成 generator，unpack 得到 0 项。
2. 即使修正 lexical yield scan，闭包捕获的 list 与 factory 返回的 list 仍不是同一 live object；scalar closure 已通过，问题集中在 `cellNew763/cellWrite763` 与 `aliasCell767/aliasSync767` 的可变对象 identity 传播。

## 当前裁决

- 不生成或覆盖正式 `MiniPy_v4.253.sb3`。
- 不把 N105 单点候选宣称为完整字典协议修复。
- `N106/N107/N111` 继续列为 OPEN/XFAIL，先做 owner/cell 设计，再进入代码补丁。
- 主目录正式版本未改变；所有新文件均位于 `_work\v41\v253_followup`。

## 下一步顺序

1. 先修 `N111` 的 lexical yield scan，做最小 P827 候选；验收 N111 + generator 四项回归。
2. 再修 closure list identity，补跑 N111 P03/P17/P24 族。
3. 设计统一 mutable owner primitive，覆盖 N106 attribute slot 与 N107 tuple transport。
4. 将 N105 membership 分支合并到统一 owner/view 路径后再重新跑全量回归；不直接发布当前窄候选。
5. 只有完整回归、结构检查、压力项裁决和 SHA-256 全部通过后，才创建正式 v4.253。

## 产物索引

- N105 候选：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\MiniPy_v4.252-view-membership-candidate.sb3`
- N105 构建：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\build-membership.cjs`
- N105 补丁：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\view-membership.patch.js`
- N105 结果：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\candidate-targets.log`、`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\candidate-membership.log`
- N106/N107：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\ref-paths\`
- N111：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\n111\`
- 基线及候选运行矩阵：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\baseline-focused.log`、`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\v253_followup\candidate-differential.log`