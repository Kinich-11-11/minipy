# MiniPy v4.245：生成器消费、除零诊断与跨帧容器引用

基线：v4.244 发布产物。P773–P775 是独立、可重建的增量；不修改历史 `.sb3` 文件。

## 修复

- **P773：生成器消费与推导式帧保护。** `min/max` 的普通、warp 和 key 路径接入现有生成器转换器；推导式在迭代生成器期间保护 `c*` 寄存器与原始 Tok/Kind，防止生成器执行污染外层推导式的目标及表达式。验证生成器耗尽后再次迭代、嵌套聚合、字典推导式及 `key`。
- **P774：除零诊断。** 普通算术、大整数、`divmod` 的零除分支共享诊断过程，按 MiniPy 已有数字表示区分整数与浮点数的 `/`、`//`、`%` 和 `divmod`。异常类别仍为 `ZeroDivisionError`。
- **P775：参数别名跨帧。** 对简单名称传入的可变参数（list/dict/set），在参数当前帧与调用者词法帧之间建立按代次标识的 cell 关系。与 P767 的同帧别名图协同传递修改，重新绑定时依旧解绑；避免仅凭同名进行动态写回。`cpyrec` 的浅复制关系不得进入强 cell 别名图；多目标下标赋值补齐与普通单目标下标赋值一致的 `cpybreak`，保留嵌套元素共享的已有通路。

## v4.244 遗留六项

| 历史用例 | 修复 |
|---|---|
| `_new2_algo / heap sort` | P775：完整排序、单元素及空列表 |
| `_new7_probe / probe heap sort minimal` | P775：原历史输入的 CPython 差分 |
| `_new5_func / higher order filter map chained` | P773：生成器 `max` 消费 |
| `_cov7 / comprehension reusing a generator` | P773：第一次消费，第二次为空 |
| `_covY / append in nested function` | P775：嵌套修改同步至外层参数和原始容器 |
| `_cov1 / zero division caught` | P774：四条诊断文本对齐 |

额外新增 27 条定向差分，包含参数同名遮蔽、重新绑定、闭包逃逸、列表/字典/集合跨调用、同一对象作为两个参数、浅复制直接下标替换与嵌套元素修改等边界。

## 复现

```bash
node _work/v41/build245delta.cjs
node _work/v41/check41.cjs MiniPy_v4.245.sb3
node _work/v41/runrepair.mjs MiniPy_v4.245.sb3 _work/v41/_v245_probe.txt --shared
MINIPY_TW_VM=/absolute/path/to/turbowarp/src/index.js bash _work/v41/_reg_current.sh MiniPy_v4.245.sb3
```

需要可用的 `scratch-vm` Node 模块（也可通过 `MINIPY_VM` 指定）和 CPython 3。本轮 CPython 3.12.14、Scratch VM 5.0.300。新定向组和历史覆盖组均保留原 oracle，不放宽失败判定。

## 实测验收

| 回归组 | v4.245 |
|---|---:|
| 项目结构 | 60,077 块，0 错误 |
| 历史覆盖组（34 套同一 VM） | **873/873** |
| `_reg232` | 590/593（3 项既有声明差异） |
| `_probe216b` | 49/49 |
| `_probe230` | 12/12 |
| v4.243 / v4.244 定向 | 37/37、9/9 |
| RUN-hat | 9/9 |
| v4.245 新定向（共享 / 独立 VM） | 各 27/27 |
| 模块七组（共享 VM） | 140/140 |

`_reg232`、上述历史定向及新定向合并为一个共享 VM 连续 RUN 流，合计 733/736，三项均为原有具名差异。覆盖组单独按原 34 套合并流执行，原始 873 例无一失败。覆盖组详见 `_work/v41/coverage873_v4.245.md`。

## 范围说明

- 三项 v4.244 已声明的 `_reg232` 差异仍保留（`cmath.foo`、`statistics.nope`、不支持宿主 `os`）。
- P775 并不是完整的 Python 堆对象身份模型；只覆盖通过简单名称传递的参数及上述复制边界。
- P773 复用已有生成器物化逻辑，不代表 `min/max` 已具有完全一致的流式比较/副作用顺序。
- 本轮 TurboWarp 运行时依赖未齐备，不能把 Scratch VM 的实测成绩视作 TurboWarp 验收结果。
