# MiniPy v4.239 拉取检验报告（2026-11-21）

拉取 `https://github.com/Kinich-11-11/minipy` 增量 2 个提交（`1eb67dd4` → `2c6e7d28`，fast-forward 无冲突）：

| 提交 | 内容 | 新补丁 |
|---|---|---|
| `7b8f0df3` | **v4.238**：修复 MP-07～MP-16（with / sort key / 推导式作用域 / 深层 del / complex / math 扩充 / JSON 模块）+ P756 字符串键单次扫描 | p749–p754、p756 |
| `2c6e7d28` | **v4.239**：P757 按调用签名重修 MP-05 变参绑定（fhas 时序 + 大小写敏感关键字比较） | p757 |

检验环境：本机 Windows harness（scratch-vm 本地副本 + CPython 3.x 自动差分），与远端作者的 Linux scratch-vm 5.0.300 / CPython 3.12.14 不同。

## 验证结果（MiniPy_v4.239.sb3）

| 项 | 结果 | 结论 |
|---|---|---|
| `check41.cjs` | 55,600 块、0 结构错误 | ✅ 与作者声明一致 |
| 清单 33 例（`_v237_bl.txt`） | **33/33**（v4.237 为 11/33） | ✅ MP-01～MP-16 全部在本环境复验通过 |
| MP-05 冒烟（f(1,2,3,z=4) / f(1) / f(1,k=9)） | 3/3 | ✅ P757 有效 |
| reg232（593 例历史回归） | **584/593，与 v4.236/237 基线完全持平** | ✅ 零回归 |
| gap131（82 例） | 78/82，失败集与基线逐项相同 | ✅ 零回归 |
| real3_hof（16 例） | 16/16 | ✅ |
| P747 冒烟（`if p.q >= r.q:` / 深层增强赋值） | 通过 | ✅ v4.237 修复未被新补丁破坏 |
| 性能套件（我方 20s 上限） | **Tdict150 3.7s、Tdict500 19.0s、Tloop10000 14.8s，全部输出正确**（v4.236 时三者均 >20s 超时） | ✅ P756 改善显著；按作者 10s 软截止 Tloop10000/Tdict500 未达标（与其自述一致） |
| `_v238_target.txt`（31 例，合并 VM 跑） | 26/31 | ⚠️ 见下：1 个真缺陷 + 4 个文案对比伪影 |

reg232 首跑出现 583/593（`_mods20_math.json:exp` 一例），经查是**验证跑批自身的 `_tmp_iso.py` 并行覆盖竞争**（run_iso 未传私有 tmpname），传私有名重跑即 584/593，非回归。

## 发现的真缺陷：sorted(reverse=True) 泄漏到后续 .sort(key=…)

**v4.238 引入、v4.239 仍在**。最小复现（单程序两条语句）：

```python
ts=[('a',2),('b',1)]
print(sorted(ts,key=lambda x:x[1],reverse=True)[0][0])   # → "a" ✓
b=['aaaa','b','cc']
b.sort(key=len)
print(b)    # CPython: ['b', 'cc', 'aaaa'] ｜ MiniPy: ['aaaa', 'cc', 'b']（被反向）
```

触发矩阵（均为单程序两语句）：

| 前句 | 后句 | 结果 |
|---|---|---|
| `sorted(..., reverse=True)` | `.sort(key=…)` | ❌ 被反向 |
| `sorted(..., reverse=True)` | `.sort(key=…, reverse=False)` | ❌ 仍被反向（显式 False 也压不住） |
| `sorted(..., reverse=True)` | `.sort()`（无 key） | ✅ 正常 |
| `sorted(..., reverse=True)` | `sorted(key=…)` | ✅ 正常 |
| `sorted(...)`（无 reverse） | `.sort(key=…)` | ✅ 正常 |
| `.sort(key=…, reverse=True)` | `.sort(key=…)` | ✅ 正常（P752 方法路径保存/恢复正确） |
| 中间插任意 print | `.sort(key=…)` | ❌ 仍泄漏（持久全局态，非线程时序） |

要点：
- 同一泄漏在 runall 合并跑中**跨用例**成立（`_v238_target.txt` 里前例 `sorted_object` 污染后例 `sort_builtin_key`）；逐例独立 VM（作者的 `runrepair.mjs`）看不见它，这就是作者验收通过、合并跑失败的原因。
- 机制线索：srtkey 的交换判据读全局 `lsrev`（build239.js:26061），P752 的 sort752 有 lsrev 保存/恢复（p752.txt:46-48）但**显式 `reverse=False` 都压不住泄漏**——说明失败上下文里带 key 的 `.sort` 实际未走 sort752 的 lsrev 写入（或恢复先于延迟排序生效）。精确寄存器与分派路径待下一轮定位。
- 建议方向：① 运行起点（RUN-hat 清单）与 sort752 入口无条件复位 `lsrev`；② 让 srtkey 的 reverse 走参数/专用寄存器而不是共享全局；③ `runrepair.mjs` 增加"合并 VM"档防这类跨语句/跨用例泄漏漏检。

## 4 个非缺陷（`_v238_target.txt` 其余失败）

`factorial_negative` / `factorial_float` / `gcd_float` / `log_domain`：MiniPy 行为正确（负数/浮点按 CPython 抛错），只是①MiniPy 把错误行打印进 Output 而 CPython 走 stderr（对比器需要 expectError 标记/归一化），②我方 CPython 版本与作者的 3.12.14 措辞不同（如 3.12 的 `'float' object cannot be interpreted as an integer`、`expected a positive input`）。非功能缺陷。

## 本地状态

- 本地 main = `2c6e7d28`（v4.239），工作树干净，与远端一致。
- 检验产物：`_work/v41/out239verify/`（清单 33 例全绿对比）、`out239perf/`、`_reg232_239b.json`、`_gap131_239.json`、`_r3h_239.json`、`out239v238t/`、`_sortvar*.txt`/`_sortdisc*.txt`（缺陷复现族）、`_smoke239.json`。
- 上一轮 v4.237 的产物与补丁（p743–p748、MiniPy_v4.237.sb3、更新说明）保持不变，全部为 v4.238/239 的构建基座。
