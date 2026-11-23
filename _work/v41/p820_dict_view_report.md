# P820 dict-L3-01 窄补丁分析报告

日期：2026-11-23（Asia/Shanghai）

## 结论

在不修改正式 `MiniPy_v4.250.sb3` 的前提下，P820 临时候选已能修复当前 `dict-L3-01 view invalidation`：真实 Scratch VM `5.0.300` 下目标用例 `1/1 PASS`。

这不是“可直接发布”的完整动态 view 实现。补丁只在 `list(view)` 的两个函数调用路径（`callfn` / `callfnW`）上做惰性物化；`len(view)`、直接 `for` 迭代、view 的 repr/比较/集合运算、匿名/表达式接收者、复杂别名传播尚未完成回归，因此暂不建议合入正式 v4.250。

## 改动文件

- `_work/v41/p820_dict_view.cjs`
  - `dictmeth` 的 `keys/values/items` 不再保存创建时的字典快照。
  - 改为保存接收者变量名 token，并使用现有 `K/V/I` 类型标记。
  - 在 `list(view)` 的 `callfn` 与 `callfnW` 入口解析当前变量值，再调用现有 `dictkeys/dictvals/dictitems`，从而读取最新字典内容。
- `_work/v41/build250_p820_dict_view.cjs`
  - 以 `MiniPy_v4.250.sb3` 为基线，叠加 P801/P819 与 P820，输出临时候选。
- `_work/v41/MiniPy_v4.250-p820-dict-view.sb3`
  - 临时 SB3 候选，不是正式版本。
- `_work/v41/p820_dict_test.log`
  - `dict-L3-01` 目标测试日志。
- `_work/v41/p820_full_closeout.log`
  - 收尾套件回归日志。

## 构建命令

```powershell
node _work\v41\build250_p820_dict_view.cjs
```

默认输入/输出：

```text
输入：MiniPy_v4.250.sb3
输出：_work\v41\MiniPy_v4.250-p820-dict-view.sb3
```

## 结构检查

```powershell
node _work\v41\check41.cjs _work\v41\MiniPy_v4.250-p820-dict-view.sb3
```

结果：

```text
Stage          blocks=    24 vars=  63 lists= 21
Controller     blocks=  2197 vars=  12 lists=  1
TextRenderer   blocks=   234 vars=  12 lists=  0
Interpreter    blocks= 61574 vars=2769 lists=420
total blocks=64029  errors=0
```

## 真实 Scratch VM 测试

VM：`scratch-vm 5.0.300`

```powershell
$env:MINIPY_VM='C:\Users\浅羽悠真\OneDrive\Desktop\不常用\scratch-vm-test\node_modules\scratch-vm\dist\node\scratch-vm.js'
$env:PYEXE='python'
node _work\v41\runrepair.mjs _work\v41\MiniPy_v4.250-p820-dict-view.sb3 _work\v41\_closeout_v248_seed.json '^dict-L3-01' --shared
```

结果：`dict-L3-01 1/1 PASS`。

预期三组结果均匹配：

```text
['a', 'b'] [1, 2] [('a', 1), ('b', 2)]
['b', 'c', 'a'] [2, 3, 4] [('b', 2), ('c', 3), ('a', 4)]
['b', 'c', 'a', 'd'] [20, 3, 4, 5] [('b', 20), ('c', 3), ('a', 4), ('d', 5)]
```

## 收尾回归

同一临时候选运行 `_closeout_v248_seed.json`：

```text
13/16 passed
```

失败项仍是原有/非 P820 目标：

- `gen-L3-01`：已知生成器首次 `send(non-None)` 副作用顺序限制。
- `stress-L5-01`：500 键压力超时，Scratch 风险。
- `stress-L5-02`：10000 次循环压力超时，Scratch 风险。

`dict-L3-01` 从基线的失败变为 PASS；其余已覆盖收尾用例未出现新的语义失败。

## 不合入正式版的原因 / 精确剩余阻塞点

1. **物化边界过窄**：当前只在 `list(view)` 的 `callfn`/`callfnW` 分支物化；其它消费协议尚未统一接入。
2. **接收者依赖变量名**：P820 通过 `nm` 保存接收者变量名，再由 `lookup` 取当前值；匿名字典表达式、复杂属性链、重新绑定后的别名语义还未验证。
3. **类型标签复用**：复用了已有 `K/V/I` 标签，需补查所有读取这些标签的路径，避免对 `len`、迭代、repr、比较等产生回归。
4. **尚未覆盖完整 dict view 协议**：CPython 动态 view 的 `len`、迭代、重复消费、别名/重绑定和 view 间交互仍需单独 L3/L4 用例。

因此当前裁决：**P820 技术路径可行，目标用例已修复；但属于候选窄补丁，不建议直接合入 v4.250。**

## 正式版本保护

正式版本未被覆盖：

```text
MiniPy_v4.250.sb3
SHA-256: E3B80DB5B63A619C750BBA15FF4A9CA360C8B453508C4A03613C6462075BA5FD
```

临时候选：

```text
_work/v41/MiniPy_v4.250-p820-dict-view.sb3
SHA-256: 7AC580CE0932AA07B97A5FB9DB6B3EA9189AF47F43D17B3ED059215D95983B95
```
