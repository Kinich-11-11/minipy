# MiniPy v4.240 更新说明：sort 反向标志泄漏修复

基线：v4.239（`2c6e7d28`）。v4.239 拉取检验发现一处 v4.238 引入的缺陷（详见 `MiniPy_v4.239_拉取检验报告.md`），本轮以 P758 修复，产物 `MiniPy_v4.240.sb3`（55,605 块，check41 errors=0），管线 `assemble240.cjs → build240.js`。

## 缺陷与根因

**症状**：`sorted(..., reverse=True)` 之后，同一程序里（乃至合并跑批的下一用例里）的 `.sort(key=...)` 被反向——显式 `reverse=False` 也压不住；无 key 的 `.sort()` 与 `sorted()` 内建形式不受影响；方法形式 `.sort(reverse=True)` 后接 `.sort(key=...)` 也不泄漏。

```python
ts=[('a',2),('b',1)]
print(sorted(ts,key=lambda x:x[1],reverse=True)[0][0])   # "a" ✓
b=['aaaa','b','cc']
b.sort(key=len)
print(b)    # CPython ['b','cc','aaaa'] ｜ v4.238/239 ['aaaa','cc','b']（被反向）
```

**根因**：带 key 的排序走 srtkey，方向由两个全局共同决定——`lsrev`（内层 lsort 的拾取方向，P206 时代）与 `p4rev`（lsort 之后的稳定降序重排，P566）。sorted() 的 eval 钩子每次调用都设置两者；**P752 的 sort752 只设 `lsrev`，从不设 `p4rev`**——sorted(reverse=True) 留下的 `p4rev=1` 让后续带 key 的 `.sort` 被额外整体反向。无 key 的 `.sort()` 直接走 lsort，不经过 srtkey 的重排，故不受影响；作者 runrepair.mjs 逐例独立 VM 验收时 p4rev 恒为 0，看不见该泄漏。

## 修复（P758）

sort752 每次调用规范化两个标志，采用与 sorted() 钩子相同的契约：

* **key 路径**：`lsrev=0`（按键升序拾取）+ `p4rev=z752rev`（按需稳定降序重排）——对陈旧状态免疫；
* **无 key 路径**：`lsrev=z752rev`（原样）+ `p4rev=0`；
* 运行起点复位 `lsrev/p4rev`，合并跑批不再跨用例携带陈旧标志。

附带改善：`.sort(key=..., reverse=True)` 的等键组不再被整组翻转——P566 的稳定降序重排现在同样覆盖 `.sort` 方法路径，等键保持原序与 CPython 一致（此前该路径的 lsrev=1 是整体反向，等键组被倒置；既有套件恰好没有等键 + reverse 组合所以未暴露）。

## 验证

| 套件 | v4.239 | v4.240 | 说明 |
|---|---:|---:|---|
| 泄漏复现族（8 个触发矩阵用例） | 3/8 | **8/8** | var1–5/disc1–3 全部转绿 |
| 隔离排序套件（key/reverse/稳定/对象） | 6/6 | 6/6 | 无回归 |
| 等键稳定降序 + 基本反向 5 例 | 4/5* | **5/5** | *v4.239 的 stable_desc_key 等键组被翻转（本次顺带修正） |
| 清单 33 例 | 33/33 | 33/33 | 无回归 |
| `_v238_target.txt` 合并 VM 跑 | 26/31 | **27/31** | sort_builtin_key 转绿；余 4 例为报错文案对比伪影（CPython 3.12 措辞差异 + 错误行进 Output，见检验报告） |
| reg232 / gap131 / real3_hof 抽测 | 584/593、78/82、16/16 | 与基线持平 | 零回归（私有 tmpname 串行跑） |
| check41 | 55,600 块 0 错误 | 55,605 块 0 错误 | — |

MP-17（Tloop10000、Tdict500 的 10 秒目标）与 MP-18 的进一步优化仍按 v4.238/239 的自述维持未完成状态；P758 不触碰性能路径。

## 构建与复现

```bash
node _work/v41/assemble240.cjs
node _work/v41/build240.js
node _work/v41/check41.cjs MiniPy_v4.240.sb3
node _work/v41/runall.mjs MiniPy_v4.240.sb3 _work/v41/out240bl _work/v41/_v237_bl.txt
node _work/v41/runall.mjs MiniPy_v4.240.sb3 _work/v41/out240v238t _work/v41/_v238_target.txt
node _work/v41/run_iso.mjs MiniPy_v4.240.sb3 _work/v41/_sort239.json _work/v41/_sort240_out.json clean240
```

`assemble240.cjs --delta` 可在 v4.239 SB3 上生成增量构建器 `build240delta.js`（`V41_SRC` 指定基座）。

| 文件 | 说明 |
|---|---|
| `MiniPy_v4.240.sb3` | 本轮产物 |
| `_work/v41/p758.txt` | 修复补丁 |
| `_work/v41/_sortvar*.txt` / `_sortdisc*.txt` | 泄漏触发矩阵复现族 |
| `_work/v41/_sortstable.json` | 等键稳定降序验收 |
