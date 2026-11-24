# v4.255 / MP-62：码点级字符串位置

在仓库根目录执行。作品本身不需要 Python、插件或修改过的 Scratch VM。构建只读取 SHA-256 匹配的正式 v4.254 和入库数据，不访问网络。复测环境：Node 22.19.0、scratch-vm 5.0.300、CPython 3.12.16。

## 构建与校验

```powershell
node _work/v41/v255/build.cjs
node _work/v41/check41.cjs MiniPy_v4.255.sb3
node _work/v41/v255/check-package.cjs MiniPy_v4.254.sb3 MiniPy_v4.255.sb3
New-Item -ItemType Directory -Force _work/v41/v255/local | Out-Null
node _work/v41/v255/build.cjs _work/v41/v255/local/rebuilt.sb3
Get-FileHash MiniPy_v4.255.sb3, _work/v41/v255/local/rebuilt.sb3
```

- `runtime.js` 只在 Python 字符语义的边界合并相邻高、低代理项；词法器和显示代码中原有的 UTF-16 游标不变。字符串下标先求接收者，再按顺序求边界，使用过程参数保存值，避免嵌套求值覆盖外层状态。字符串迭代走统一拆分，或在生成器自己的游标上前进一个完整码点。普通非字符串容器仍走原路径。
- `ord()` 单码元解码使用 256 个有序搜索页；代理对分别解析高、低码元后按标准公式相加。为绕开 Scratch 忽略大小写的比较，先用精确造型名处理有大小写冲突的字符，复用原有映射，新增名称共享已有 SVG。页里以完整的字符对存储代理码元；Scratch 导入器会移除字面退格，因此单独编码 U+0008。`pivot-exceptions.txt` 只记录 JS 比较时不能直接作为搜索基准的 BMP 码元，不改动 v4.254 的 Python 大小写折叠数据。可选：用 Unicode 16.0 的 Node 执行 `node _work/v41/v255/freeze-pivots.cjs` 重新冻结比较例外。
- `check-package.cjs` 核对资源引用、MD5 和 SHA-256，比较旧造型及非解释器角色，再从实际 VM 导入后的列表和造型名读取搜索页。使用 Scratch 的 `Cast.compare` 穷举 65,536 个码元，独立查验其序号。此项不替代下面的真实解释器运行。

## 报告和边界程序

```powershell
node _work/v41/v253/replay.cjs MiniPy_v4.254.sb3 _work/v41/v255/report-cases.json
node _work/v41/v253/replay.cjs MiniPy_v4.255.sb3 _work/v41/v255/report-cases.json
node _work/v41/v253/replay.cjs MiniPy_v4.255.sb3 _work/v41/v255/edge-cases.json
```

第一条预期退出码非零：两个报告用例和两个隔离诊断在原版均失败。边界程序的预期值用 `python -X utf8 _work/v41/v255/make-cases.py`（CPython 3.12）独立生成，其中包括 226 个取样序号、补充平面的全部 16 个平面、组合序列及负向切片。7 项用原始字符填入 VM 的源码列表，单独验证孤立代理项或控制字符，不将 Python 源码转义解析与 `ord()` 混为一谈。

## 上版与历史归档

```powershell
node _work/v41/v253/replay.cjs MiniPy_v4.255.sb3 _work/v41/v253/report-cases.json
node _work/v41/v253/replay.cjs MiniPy_v4.255.sb3 _work/v41/v253/edge-cases.json
node _work/v41/v253/replay.cjs MiniPy_v4.255.sb3 _work/v41/v254/report-o.json
node _work/v41/v253/replay.cjs MiniPy_v4.255.sb3 _work/v41/v254/edge-cases.json
python -X utf8 _work/v41/v254/fold-suite.py _work/v41/v255/local/fold.json
node _work/v41/v253/replay.cjs MiniPy_v4.255.sb3 _work/v41/v255/local/fold.json
node _work/v41/v253/archive-suite.cjs _work/v41/v255/local/archive.json
node _work/v41/v253/replay.cjs MiniPy_v4.255.sb3 _work/v41/v255/local/archive.json
```

`verification.json` 记录实际计数、报告用例的原版与新版输出、以及历史归档中两版同样不匹配的 10 个条目（因此最后一条预期非零）。以上套件不累加。`local/` 不进仓库。

### 独立的旧解析器限制

`known-parser.json` 单列 3 个额外探针：例如字典字面量 `d={"]":1,":":2}`，以及将 `"]"` 直接作为嵌套 `len()` 的实参。两版都在表达式解析阶段报相同的 `SyntaxError`，与索引是否拆分代理对无关。把键先存在变量里，再用 `s[d["]"]]` 或 `s[:d[":"]]` 取字符的程序已纳入本次通过的边界集。可单独在两版运行这些已知失败的探针：

```powershell
node _work/v41/v253/replay.cjs MiniPy_v4.254.sb3 _work/v41/v255/known-parser.json
node _work/v41/v253/replay.cjs MiniPy_v4.255.sb3 _work/v41/v255/known-parser.json
```
