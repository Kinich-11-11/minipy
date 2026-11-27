# MiniPy v4.267 更新说明

2026-11-27。修复：**运行代码后，代码编辑区里的代码会被改写**。

## 现象

在编辑器里输入示例程序（多行列表字面量 + 生成器表达式）：

```python
if __name__ == "__main__":
    A = [[1, 2, 3],
         [4, 5, 6]]
    B = [[7, 8],
         [9, 10],
         [11, 12]]
    print("A * B =")
    print_mat(mat_mul(A, B))
```

按 RUN 后，输出正确，但编辑器里的源码被改成了：

```python
    A = [[1, 2, 3], [4, 5, 6]]      # 续行被并成一行
    B = [[7, 8], [9, 10], [11, 12]]
    ...
def gx1():                          # 凭空多出 5 个生成器辅助函数
    while True:
        v = gxpull(-1)
        yield '{:4d}' . format ( v )
def gx2():
    ...
```

其他会触发改写的写法：

- `if True: print(1)` / `for i in range(3): print(i)` —— 单行复合语句被拆成多行；
- `a = 1; b = 2` —— 一行多条语句被拆成多行；
- `from collections import deque` —— 末尾被追加 `def _minipy_deque263(...)` 整段（64 行）；
- 带装饰器的函数 —— 行文本被就地替换；
- `total = 1 + \` 续行 —— 被并成一行。

## 根因：解释器把“编辑器缓冲区”当成了自己的可变解析缓冲区

舞台上的 `Code` 列表既是编辑器显示/编辑的文本（`Controller`、`TextRenderer` 读写它），也是 `Interpreter` 的解析与执行源。解释器在运行前会做几轮**源码级改写**，这些过程直接 `splitlines` / `joinlines` / `expandlines` 并原地清空、重填 `Code`：

| 过程 | 作用 | 对 `Code` 的写操作 |
|---|---|---|
| `splitlines` | 按 `;` 拆成多行 | 清空 + 重填 |
| `joinlines` | 合并 `\` / 括号 / 字符串续行 | 清空 + 重填 |
| `expandlines` | 单行复合语句展开成多行 | 清空 + 重填 |
| `dqPrep263` | `deque` 兼容层 | 追加 64 行 |
| `execute` | 装饰器改行 | 替换行 |
| `evalCtx828` | 生成器表达式改写成 `gxN` | 追加 4 行/个 |

所以“运行”本身就是一次对编辑器内容的改写——这是从 v4.19 引入 `expandlines` 起就存在的设计问题。

## 修复

### 1. 解释器改用独立工作副本 `Src267`

- 在 `Interpreter` 精灵上新增本地列表 `Src267`；
- 把解释器内 **153 处**对 `Code` 的列表引用全部改指向 `Src267`（解析、执行、错误行号、`deque`/生成器追加等都属于解释器内部行为）；
- 新增 warp 过程 `srccopy267`，在 RUN 广播的最开始把 `Code` 逐行复制到 `Src267`。

此后解释器只读写 `Src267`，`Code` 只属于编辑器。运行结束后（包括报错、停止）编辑器内容天然保持原样，不需要“备份/还原”，也不会在运行中短暂改坏代码。

### 2. 保留“当前执行行”标记

编辑器左侧的 `>` 标记用 `pc` 与行号比较来画。`pc` 现在指向 `Src267`（可能因合并/展开而和原代码行号不同），因此新增：

- 舞台全局列表 `SrcMap267`：`Src267` 第 N 行 → 原始 `Code` 行号；
- `TmpMap267`（`Interpreter` 本地）作为三个改写过程的临时映射；
- `splitlines` / `joinlines` / `expandlines` 在重建 `Src267` 的同时重建 `SrcMap267`；
- `TextRenderer` 的标记比较从 `rline == pc` 改为 `rline == SrcMap267[pc]`。

运行时动态追加的 `deque` / `gx` 辅助行没有原始行号，映射为空，标记就不会画到用户行上（与“这些行不属于用户源码”一致）。

`SrcMap267` 放在舞台上而不是 `Interpreter` 上，是因为 Scratch VM 跨精灵解析列表时只查“本地 + 舞台”，不查其他精灵的本地列表。

## 行为不变

解释器的分词、语法、执行、错误处理逻辑一行未改，只改了“读哪张列表”。同一批程序在 v4.266 / v4.267 上输出逐字节一致。

## 验证

| 检查 | 结果 |
|---|---|
| 本地示例程序 | 输出相同（58/64/139/154、A^T 三行），`Code` 前后逐行相同 |
| 18 段差异用例（示例/续行/单行 if/分号/反斜杠/生成器/yield/deque/装饰器/三引号/try/除零/空程序/exec/类与 lambda/嵌套推导/注释括号/多行输出） | **18/18** 输出与错误完全一致；v4.266 有 **8/18** 改写代码，v4.267 为 **0/18**；连续运行两次均正确 |
| 行号映射 | 示例运行 21 个 `pc` 采样，映射与源码 **0 失配**；`genexp`/`deque` 的辅助行按设计不映射 |
| v4.259 专项 | **33/33** |
| v4.258 main/global 专项 | **9/9** |
| v4.253 反馈回归 | **79/79** |
| 结构体检 `check41.cjs` | **0 错误**，76,179 积木 |
| 真实 CCW 导入 `MiniPy_v4.267_site.sb3` | 无造型报错 |
| 真实 CCW 内运行示例（`ccw.site/gandi` 已登录常驻 Chrome） | `Finished`，输出一致，`Code` 前后相同，`SrcMap267` 32 行 |
| 大程序（800 行） | 4.2s（v4.266 4.0s，约 +6%；行号映射的开销） |

## 产物

`MiniPy_v4.267.sb3`：2,393,292 字节，SHA-256 `d8c00d30a80e351a7caab8da304b1e1d3ce00e4fc5e5b84018f13a01bc370341`。

构建：`node _work/v41/v267/build.cjs MiniPy_v4.267.sb3`（校验 v4.266 基线 SHA-256；固定随机种子，连续两次构建 SHA-256 相同）。

复现/验证：

```powershell
node _work/v41/check41.cjs MiniPy_v4.267.sb3
node _work/v41/v267/one_side.cjs MiniPy_v4.266.sb3 _work/v41/v267/side_266.json 1
node _work/v41/v267/one_side.cjs MiniPy_v4.267.sb3 _work/v41/v267/side_267.json 2
node _work/v41/v267/compare_sides.cjs _work/v41/v267/side_266.json _work/v41/v267/side_267.json
node _work/v41/v267/map_check.cjs MiniPy_v4.267.sb3 _work/v41/v267/sample.py
$env:MINIPY_VM = "<scratch-vm>/dist/node/scratch-vm.js"
node _work/v41/v259/replay-cases.cjs MiniPy_v4.267.sb3 _work/v41/v259/edge-cases.json
```

`one_side.cjs` / `map_check.cjs` 使用 `C:/Users/浅羽悠真/OneDrive/Desktop/不常用/scratch-vm-test` 下的 stock scratch-vm 5.0.300（脚本内已写死该路径）；`map_check.cjs` 单独校验“当前执行行”映射。
