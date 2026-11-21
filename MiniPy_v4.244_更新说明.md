# MiniPy v4.244：历史回归与生成器寄存器整治

基线：main 的 v4.243（`98a6c4f`）。P770–P772 是基于发布产物的可复现增量，不修改旧版本。

## 修复

- P770：`wscan` 在旧的动态同名写回前按词法帧所有权检查，即使局部变量尚未分配 cell，也不能修改调用者的同名容器。参数引用、显式 global 与已有 nonlocal cell 通路保持。RUN-hat 显式重置 `lsrev`、`p4*`、`z752*` 排序暂存寄存器。
- P771：`ghb/ghi/ghc/ghg/ghf` 按 `FrFi` 动态帧生命周期统一保存、恢复；RUN 初始化清空五张帧列及 `FrFi`，保留非 calluser helper 入口旧有 GStk 保护。并非宣称整个解释器的所有暂存寄存器均已改造。
- P772：修正十处 statistics 异常消息中被字符串化的 Scratch 输入描述符、生成块 ID。mean/variance 等不再输出 `1,10,`；geometric_mean 的数据类型/负数分支返回正确异常类别。异常文本不承诺跨 CPython 版本逐字完全一致。

## 历史项的定性

| 项目 | 结论 |
|---|---|
| _cov205b | 历史唯一失败项是 `templated game characters`，不是格式差异；v4.243 定向及共享 VM 复测 14/14。 |
| gap131 | 4 个旧失败为 next(list)、pow(2)、assert message、捕获非 BaseException 类。新差分要求异常类型及正常输出一致；前三条异常类别和消息对齐，第四条类别相同但解释文字不同。 |
| probe230 | v4.243 已消除 genexp late binding、source 求值两次、闭包身份三项；同名局部容器仍失败，P770 修复。 |
| mods20 | 7 套共 140 条在 v4.244 共享 VM 中通过类型级差分。statistics 消息额外定向验证；datetime 诊断文本随 CPython 版本而异。 |
| reg232 | v4.244 共享 VM 严格差分 590/593。原八项已不再失败；新工具揭示旧宽松 expectError 掩盖的三个独立边界（未知模块/属性）。保留为明确 known-difference，不计入通过数。 |

## 工具及复现

```bash
node _work/v41/build244delta.cjs
node _work/v41/check41.cjs MiniPy_v4.244.sb3
npm install scratch-vm
node _work/v41/runrepair.mjs MiniPy_v4.244.sb3 _work/v41/_v244_repairs.json --shared
MINIPY_TW_VM=/absolute/path/to/turbowarp/src/index.js bash _work/v41/_reg_current.sh MiniPy_v4.244.sb3
```

`runrepair` 默认每例独立 VM；`--shared` 在同一 VM 依次发 RUN，递增 ticket，不在两例之间重新绿旗或直接重置解释器内部状态。超时重建 VM，并把该例记为失败。额外 `--suite PATH` 可将多套用例合并，以覆盖跨套状态泄漏。异常类别与正常 stdout 同时核验，明确的 expectedError 仍可用于树状诊断等专用测试。CPython 启动失败不计入通过。

`_reg_current.sh` 包含 Scratch 独立/共享、TurboWarp 共享、原覆盖组与模块组；缺少 TurboWarp VM 时退出非零。旧 run_iso/runall 输出仅作历史记录。已知差异文件只允许三个具名且实际诊断完全匹配的边界，不泛化接受任何异常。

本轮环境：CPython 3.12.14、Scratch VM 5.0.300，仓库 TurboWarp VM 2.1.46（独立安装运行时依赖）。

| 验收 | 实测 |
|---|---:|
| 完整结构检查 | 59,943 块、0 错误 |
| P770–772 新定向（Scratch / TurboWarp） | 各 9/9 |
| modules 七组（发布产物） | 140/140 |
| probe230 / cov205b / gap131 / RUN-hat（P770–771 核心构建） | 12/12、14/14、82/82、9/9 |
| 同上，TurboWarp | 12/12、14/14、82/82、9/9 |
| v4.241 / v4.242 / v4.243 旧定向（P770–771 核心构建） | 41/41、27/27、37/37 |
| probe216b / exc232 validation / traceback tree（P770–771 核心构建） | 49/49、12/12、1/1 |
| reg232（发布产物，Scratch 共享） | 590/593（3 项已知差异） |
| reg232（发布产物，TurboWarp 共享） | 590/593（同 3 项已知差异） |

## 保留范围

- `_reg232_known_differences.json` 中的两个未知属性异常类别与一个不支持的宿主 os 导入仍有 CPython 差异。
- 新工具按异常类别和正常 stdout 验收，不能把类型一致解读为所有异常诊断文本逐字相同。
- P771 仅统一 gh 五寄存器的 calluser 调用帧；GStk 仍用于 helper 自己的生命周期。
