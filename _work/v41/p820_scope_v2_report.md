# P820 窄范围审查/增强实验报告

日期：2026-11-23
Scratch VM：5.0.300

## 基线与候选

- 正式基线：`C:\Personal\个人\编程\scratch\ai\minipython\MiniPy_v4.250.sb3`
- 正式基线 SHA-256：`E3B80DB5B63A619C750BBA15FF4A9CA360C8B453508C4A03613C6462075BA5FD`
- v1 候选：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\MiniPy_v4.250-p820-dict-view.sb3`
- v1 SHA-256：`7AC580CE0932AA07B97A5FB9DB6B3EA9189AF47F43D17B3ED059215D95983B95`
- v2 候选：`C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\MiniPy_v4.250-p820-scope-v2.sb3`
- v2 SHA-256：`C8DBA3B526EE0CEB48DC6EF834E3FEE4D255C04BFEE1661086BCEE00B159DD5F`

正式 v4.250 未写入；v2 为独立临时候选。

## v2 窄补丁

改动文件：

- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\p820_scope_v2.cjs`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\build250_p820_scope_v2.cjs`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\p820_scope_cases.json`
- `C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\p820_scope_static_cases.json`

实现策略：view 不再存变量名，而是存 `dictmeth` 调用时的 `rec`；`list(view)`、`len(view)` 和 `for view` 在消费边界按 K/V/I 物化。该策略用于验证“原字典身份”方向，已知 `rec` 仍是值快照。

## 构建与结构检查

```powershell
node C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\build250_p820_scope_v2.cjs
node C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\check41.cjs C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\MiniPy_v4.250-p820-scope-v2.sb3
```

结构检查：`errors=0`，总块数 `64035`。

## 测试结果

### 动态语义套件（v2）

运行：

```powershell
$env:MINIPY_VM='C:\Users\浅羽悠真\OneDrive\Desktop\不常用\scratch-vm-test\node_modules\scratch-vm\dist\node\scratch-vm.js'
$env:PYEXE='python'
node C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\runrepair.mjs C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\MiniPy_v4.250-p820-scope-v2.sb3 C:\Personal\个人\编程\scratch\ai\minipython\_work\v41\p820_scope_cases.json --shared
```

| 用例 | 结果 | 实际关键结果 | 失败模式 |
|---|---|---|---|
| `p820-rebind-original-dict` | FAIL | 两次均为 `['a'] [1] [('a', 1)]` | v2 保住了原记录，但原字典 mutate 后 view 不更新 |
| `p820-len-dynamic` | FAIL | `1 1 1`、`1 1 1`、`1 1 1` | `len(view)` 对 mutate 后的原字典不动态 |
| `p820-for-dynamic` | FAIL | 只迭代出 `a,b` 与 `1,2` | `for` 看到创建时快照，未看到新增 `c` |

结果：`0/3 passed`。

### 静态/身份隔离子套件（v2）

| 用例 | 结果 |
|---|---|
| 只重新绑定、不 mutate：view 仍指向原字典 | PASS |
| 静态 `len(keys/values/items)` | PASS，输出 `2 2 2` |
| 静态 `for keys/values/items` | PASS，输出 `['a','b'] [1,2] [('a',1),('b',2)]` |

结果：`3/3 passed`。

### v1 对照

- 原字典 mutate + `list(view)`：PASS。
- 变量重新绑定后仍指向原字典：FAIL，错误 lookup 到新变量值。
- `len(view)`：FAIL，均为 `0`。
- `for view`：FAIL，均为空。

## 结论

**不可晋级。**

v1 与 v2 分别证明了两条互相冲突的局部路径：

1. 存变量名：可以通过每次 lookup 看到 mutate，但变量重绑定会错误切换到新字典。
2. 存 `rec`：可以隔离变量重绑定，且静态 `len/for` 可工作；但 `rec` 是序列化值快照，后续 `d[k]=v` / `del d[k]` 更新的是变量槽中的新字符串，旧 `rec` 不会随之变化。

精确阻塞点：当前 MiniPy 字典没有可供 view 保存的稳定对象身份/引用单元。要同时满足动态 view 与重绑定隔离，必须先引入稳定 dict object/ref（或等价隐藏注册表），并让 `indexset`、`indexdel`、`update/pop`、`assign/publish` 等所有字典变更路径按对象身份更新；仅在 `list/len/for` 消费点补分支不足以修复。

因此 v2 仅保留为实验候选，不进入正式 `v4.250`，也不覆盖历史 SB3。
