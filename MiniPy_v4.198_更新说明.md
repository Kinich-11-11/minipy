# MiniPy v4.198 更新说明

**本次没有 Python 语义改动，只修网页端（小码王社区）兼容性。** 本地行为与 v4.197 完全一致。

## 一、修好了什么

| 问题 | 现象 | 根因 |
|---|---|---|
| 网页版 `print` 卡死 | 点 RUN 后状态 `Running`，但 `pc/steps` 不再前进，CONSOLE 永远空白，异常 `Cannot read properties of null (reading '_isHat')` | sb3 里有一个读 `ev` 的 `data_variable` 积木被 6 处同时引用；社区导入时把它内联成基本类型并删除，只替换第一处引用，其余 5 处悬空，网页 VM 崩溃 |
| 网页版 `scrollone` / `loadCode` 参数失效 | 变量面板滚动、IMPORT 导入代码在网页端行为异常 | 2043 个函数体内使用的 `argument_reporter_string_number` 被误标 `shadow:true`，其中 7 个被社区导入折叠成常量 `0` / `""` |

## 二、改动

1. 新增后处理 `_work/v41/webfix.cjs`：
   - 多引用的 `data_variable` / `data_listcontents` → 在每个引用处内联成基本类型并删块；
   - 其它多输入引用的积木 → 深克隆（本次 6 个，+27 块）；
   - 身体里使用却被标 `shadow:true` 的积木 → `shadow:false`（本次 2043 个）；
   - 最终悬空引用校验。
2. `_work/v41/build41.js` 构建末尾自动执行该后处理，出现悬空引用直接构建失败。
3. 产物：`MiniPy_v4.198.sb3`（积木总数 32,447，Interpreter 30,170）。

## 三、验证

- `validate_web.cjs`：悬空引用 0、多引用报告器 0、shadow 误标 0。
- 模拟社区导入器：原版会产生 5 个悬空引用（与线上文件完全一致），v4.198 为 0。
- scratch-vm 载入 → `toJSON()`（与平台导入同款逻辑）：v4.198 无悬空引用。
- 本地回归 `_cov1.._covZ` 581 例：508 pass / 73 fail，与 v4.197 完全一致；逐例输出对比只有 3 例不同，且差异仅为 CPython 内存地址与耗时字段。
- DEMO 4 例全过。

## 四、注意

- **v4.190 ~ v4.197 都有同样的网页端隐患**，重传旧版前先跑 `node _work/v41/webfix.cjs 旧.sb3 新.sb3`。
- 上传 v4.198 后请复验：绿旗 → RUN 是否正常输出；VARIABLES 面板滚动与 IMPORT 导入代码是否正常（第 2 项修复的线上效果需实际发布确认）。
- 详细诊断见 `MiniPy_v4.197_网页版print卡死_诊断报告.md`。
