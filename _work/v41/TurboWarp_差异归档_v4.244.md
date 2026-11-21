# TurboWarp 差分归档（v4.244）

历史根目录的 `_tw_main.out.json`（168 例）、`_tw_gap.out.json`（82 例）、`_tw_demos.out.json`（20 例）记录 same=true 共 270 例。旧比较器接受 `expectError && (无 stdout || 任意 error)`，因此这些结果不能证明异常类别一致，也不能替代新回归。

本轮用实际仓库 TurboWarp VM 2.1.46 和 Scratch VM 5.0.300 共享 RUN 差分；CPython 3.12.14 同一基准。

| 定向组 | Scratch | TurboWarp | 差异 |
|---|---:|---:|---|
| RUN-hat 排序、用户变量、异常后恢复 | 9/9 | 9/9 | 无 |
| gap131 | 82/82 | 82/82 | 无 |
| probe230 | 12/12 | 12/12 | 无 |
| cov205b | 14/14 | 14/14 | 无 |
| v4.244 新增 P770–772 | 9/9 | 9/9 | 无 |
| reg232（发布产物） | 590/593 | 590/593 | 同 3 项已知 CPython 差异，无新增 VM 间差异 |

前四行核验 P770–771 核心构建；后两行核验含 P772 的发布产物。历史 demo 归档为 20 例；当前 `cases_demo.json` 只有 4 例，P770–771 TurboWarp 实测 4/4，不应混计。

常规入口：`MINIPY_TW_VM=/absolute/path/to/turbowarp/src/index.js bash _work/v41/_reg_current.sh`。每档写入独立日志，VM 缺失、未完成执行、非声明差异均非零退出。独立 VM 和合并 VM 使用相同的 oracle。
