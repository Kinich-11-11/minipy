# MiniPy v4.202 更新说明

## 本轮目标

按《已知问题清单_v4.201.md》的"下一步建议 ①"执行：**`nonlocal` 语句**（清单 #1，约 3 例 + 套件外收益）。

结果：**581 全套 43 → 41 失败；补充 82 例 10 → 9 失败；逐例对照修复 3 例、回归 0 例、新增失败 0 例。**

## 一、修好了什么

| 用例 | 之前 | 现在 |
|---|---|---|
| `cov5 nonlocal keyword` | `SyntaxError: unsupported statement` | `1 2 3` |
| `covC nonlocal keyword` | `SyntaxError: unsupported statement` | `1` |
| 补充 `nonlocal counter` | `SyntaxError: unsupported statement` | `1` |

```python
def outer():
    n = 0
    def inc():
        nonlocal n
        n += 1
        return n
    return inc

c = outer()
print(c(), c(), c())    # 1 2 3
```

套件外额外收益（探针验证）：**外层帧还活着**时同样正确——

```python
def outer():
    n = 0
    def inc():
        nonlocal n
        n += 1
    inc(); inc(); inc()
    return n

print(outer())          # 3（CPython 一致）
```

`nonlocal` 声明了但找不到绑定时，按 CPython 报
`SyntaxError: no binding for nonlocal 'q' found`（错误文本逐字一致）。

## 二、根因与修法

帧模型里 `calluser` 返回时把 `Names` 截回 `FrBase`——被调函数内对"继承来的"名字的赋值
在返回时被丢弃；P383 的闭包快照（`CloN/CloV/CloT`）又是**按值**的，`n += 1` 的写只落在
当前 `Names`，快照不更新。所以 `nonlocal` 要打通**两条写回路径**，机制完全镜像 P104 的
global（`GName/GSave*` → `NlN/NlA/NlSave*`）：

| 路径 | 情形 | 做法 |
|---|---|---|
| 快照写回 | 外层帧**已返回**（cov5/covC 的形态） | `assign` 末尾：名字 ∈ `NlN` 时把新值同步进 `CloV/CloT` 的快照槽；后续调用经 P383 回退从快照拿到新值 |
| 跨帧写回 | 外层帧**还活着** | `calluser` 恢复 `Names` 前把 nonlocal 名字在当前表的值存 `NlSave*`；恢复后若名字在恢复出的表里**已存在**则覆盖，**不存在则不追加**（nonlocal 不创建外层绑定，这是与 global 的关键差别） |

语句本身在 `execute` 加分支：fi 取 `FnStack` 顶（P383 在 `pbegin/pend` 间压栈），在该 fi 的
快照区间 `[CloB[fi] .. CloB[fi]+CloL[fi]-1]` 找名字，把 **CloV 绝对下标**记进 `NlN/NlA`
（同名更新，每次调用复用）；支持 `nonlocal a, b` 逗号形式；顶层声明报
`SyntaxError: nonlocal declaration not allowed at top level`。

## 三、实现清单

| 补丁 | 文件 | 内容 |
|---|---|---|
| P499 | `_work/v41/p499.txt` | `execute` 的 nonlocal 分支 + 快照槽登记、`calluser` 跨帧捕获/写回、`assign` 同步闭包快照、运行起点清表 |

`assemble.cjs` 的 parts 链末尾加入 `p499.txt`；`head.txt` 的默认产物/时间戳改为 v4.202。

### 本轮踩的坑（下轮注意）

- `calluser` 里"恢复循环"的锚点不能只按"子树含 `addTo(Names)` 的 `repeat_until`"找——
  P104 的 gij 写回循环、方法补丁的 mij 写回循环也会命中（共 3 个）。按**循环变量 `epI`** 区分；
  且其 OPERAND1 是内联变量输入 `[3,[12,"epI",…],…]`（带 shadow 包装），不是块 id。
- `nonlocal` 语句在 `execute` 的挂点用 P104 同款 `pending==0` 守卫锚点，一次命中。

### 已知近似（与 P104 的 global 同款，套件未覆盖）

`NlN` 是全局表、不按帧区分：某函数声明过 `nonlocal n` 之后，其他帧里同名的局部 `n`
在跨帧恢复时也会被带走。CPython 在这个角落是对的，本模型不是。

## 四、验证

| 项目 | v4.201 | **v4.202** |
|---|---|---|
| 581 全套失败 | 43 | **41** |
| 补充 82 例失败 | 10 | **9** |
| 真实失败合计 | ≈51 | **≈48** |
| 逐例对照（581） | — | **修复 2 例、回归 0 例、新增失败 0 例** |
| 逐例对照（82） | — | **修复 1 例、回归 0 例** |
| `check41.cjs` | 33,385 块 | **33,490 块、errors = 0** |
| `validate_web.cjs` | 悬空 0 | **悬空 0、shadow 误标 0** |

## 五、复现命令

```bash
cd D:/编程/scratch/ai/minipython

# 重新生成（默认输出 MiniPy_v4.202.sb3）
node _work/v41/assemble.cjs && node _work/v41/build41.js

# 结构 / 网页兼容体检
node _work/v41/check41.cjs MiniPy_v4.202.sb3
node _work/v41/validate_web.cjs MiniPy_v4.202.sb3

# 全套 581 例
node _work/v41/runall.mjs MiniPy_v4.202.sb3 _work/v41/_res202 \
  _work/v41/_cov{1,2,3,4,5,6,7,8,9,10,X,Y,Z,C,D}.txt

# 补充 82 例
node _work/v41/run_iso.mjs MiniPy_v4.202.sb3 _work/v41/_gap131.json _work/v41/_gap131_202.out.json g202

# 逐例对照（需要先有 v4.201 的结果目录）
node _work/v41/cmp131.cjs _work/v41/_res202 _work/v41/_res201
node _work/v41/gdiff.cjs _work/v41/_gap131_202.out.json _work/v41/_gap131_201.out.json
```

## 六、下一步建议

1. **`finally` 吞返回**（清单 #5，约 3 例）：`cov6 finally swallows return`、
   `covC finally return on exception path` —— 现在异常路径直接抛出，`finally` 里的
   `return` 应当压过它。
2. **genexp 惰性 / G 化**（清单 #2，约 6 例）：生成器**函数**的游标已修好（P497），
   剩下全卡在 genexp 急切物化为 L。v4.201 试过"括号剥离点把内层含 for 的结果改标 G"，
   G 化本身成功但 `next(g)` 立刻 StopIteration（疑似 printargs 求值顺序/双重求值），已回退；
   重试前先探明 `print(next(g), list(g))` 的实参求值顺序。
3. **`assert` 语句**（1 例）：`cov6 assert statements` 的断言消息没进输出。
4. **UnboundLocalError 产生侧**（2 例一起）：`closure counter attempt without nonlocal`
   需要"函数体内被赋值的名字是本地"的静态判定；`UnboundLocalError name exists`
   是报错了基类 `NameError` 而非子类。

### 已知遗留 / 非真问题

- 闭包读外层变量按**值快照**：同一闭包的多个存活实例共享一份快照（后建覆盖先建），
  "先建先调、再建再调"的顺序用法不受影响（P498 已声明）。
- 补充用例 `type e equals E`：用例本身不合法，不计入真实失败（v4.200 已声明）。
