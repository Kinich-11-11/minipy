# MiniPy v4 测试 harness

这些脚本用**真实 scratch-vm 5.0.300**（`D:\users\OneDrive\Desktop\scratch-vm-test\node_modules`）无头加载 `MiniPy_v4.sb3`，
注入鼠标/键盘/输入框事件并断言输出，可复现回归。

**这些脚本 `import 'scratch-vm'`，ESM 按"脚本自己所在的目录"向上找包，所以必须把脚本放在带 scratch-vm 的目录里跑**
（`cd` 过去是不够的；`_work/tests/` 里那份只是源，改了以后拷过去）：

```powershell
$sv = 'D:\users\OneDrive\Desktop\scratch-vm-test'
$mp = 'D:\编程\scratch\ai\minipython'
Copy-Item "$mp\_work\tests\*.mjs" $sv -Force     # 或只拷要跑的那个
node "$sv\mp_verify_fast.mjs" "$mp\MiniPy_v4.129.sb3" "$mp\_work\cases.json"   # 语言语义 10 例（含报错用例）
node "$sv\mp_new.mjs"         "$mp\MiniPy_v4.130.sb3"   # HELP / CASE 大小写 / 13 个示例 30 项
node "$sv\mp_keys2.mjs"       "$mp\MiniPy_v4.129.sb3"   # 指针选区 + ↑/↓ 逐行滚动 23 项
node "$sv\mp_buttons.mjs"     "$mp\MiniPy_v4.129.sb3"   # 符号键盘与 CASE 按钮 15 项
node "$sv\mp_isolation.mjs"   "$mp\MiniPy_v4.129.sb3"   # 区域隔离压力测试 11 项
node "$sv\mp_review6.mjs"     "$mp\MiniPy_v4.129.sb3"   # 评审项：控制台跟随 / 行号双击编辑 / IMPORT 转义 11 项
node "$sv\mp_review2.mjs"     "$mp\MiniPy_v4.129.sb3"   # 评审项：快慢速对比 / pow、round 上限 / 表达式深度 13 项
node "$sv\mp_list13.mjs"      "$mp\MiniPy_v4.129.sb3"   # Python 列表：字面量/len/sum/下标/for-in 13 项
node "$sv\mp_list14.mjs"      "$mp\MiniPy_v4.129.sb3"   # 列表方法 append/pop/extend/clear + 表达式语句 14 项
node "$sv\mp_list15.mjs"      "$mp\MiniPy_v4.129.sb3"   # 列表元素赋值 a[i] = v（含负下标/越界） 12 项
node "$sv\mp_list16.mjs"      "$mp\MiniPy_v4.129.sb3"   # 删除元素 del a[i]（含负下标/越界） 11 项
```

最近一次全量结果（v4.129）：语言 10/10、列表 13/13、列表方法 14/14、元素赋值 12/12、元素删除 11/11、
HELP+CASE+13 示例 **30/30**、键盘 23/23、按钮 15/15、隔离 11/11、评审 UI 11/11。
（mp_review2 在本机为 9/13：其中 4 项失败在打补丁前的旧构建上完全一样，属于该脚本自身依赖 sleep 时序的已知不稳定项，不是回归。）

**2026-09 合并后修过的部分**（这些断言曾随 P56 / P199 / PCLIP 变旧）：
* `mp_new.mjs`：HELP 行数 19 → 120、`Aa button` → `CASE=A/a`、`8 samples` → `13 samples`；
  Aa 按钮坐标改成 CASE 的新位置 (205.5, -129.5)；"符号按钮"改成物理键盘 `*`（P199 之后屏幕上没有符号键了）；
  示例块从 8 个改成 **13 个**并换成当前构建的实测输出（第 13 个是唯一会调用 `input()` 的）。
* `mp_buttons.mjs` / `mp_keys2.mjs` 仍按 **P199 之前**的旧键盘坐标断言（那次改版把 2×12 符号键换成了
  一行 TAB/ENTER/BACKSPACE/CASE/SPEED，PCLIP 之后又是两行）——它们需要各自过一次，本次未动。

---

## 2026-09 合并（v4.129）带进来的界面探针

这六个用**绝对路径** `import` scratch-vm，所以在仓库里直接跑就行（不用拷贝）：

```powershell
node _work/tests/mp_clip.mjs   MiniPy_v4.130.sb3   # 拖拽选取 / COPY / PASTE 11 组
node _work/tests/mp_export.mjs MiniPy_v4.130.sb3   # EXPORT/IMPORT 往返（\n、\\、老 | 格式）6 组
node _work/tests/mp_click.mjs  MiniPy_v4.130.sb3   # 点击 → 行列、横向滚动窗口
node _work/tests/mp_keys3.mjs  MiniPy_v4.130.sb3   # 两行按钮栏 13 项（含死区）
node _work/tests/mp_undo.mjs   MiniPy_v4.130.sb3   # 50 步撤销 / 10 字符与 2 秒断步 / 0 行保护
node _work/tests/mp_font.mjs   MiniPy_v4.130.sb3   # 26 列折行 + HELP 屏与 help.json 逐行一致
node _work/tests/mp_indent.mjs MiniPy_v4.130.sb3   # ENTER 自动缩进 27 项（含行中间回车与撤销）
```

> `mp_export.mjs` 里 IMPORT 走的是 Scratch 提问气泡：无头环境要**跨一个宏任务**
> （`await new Promise(r => setTimeout(r, 0))`）才会收到 `ANSWER`，否则线程永远停在提问上。
> 另外 EXPORT 按钮是**开关**（再点一次只是收起列表），探针里每次先 `exportShown = 0` 再点。
