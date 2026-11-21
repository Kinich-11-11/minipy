# MiniPy v4.29 更新说明

本轮补上缺口清单的**最后一条 A4「类 / `__init__` / 方法 / `self` 属性」**：

```
class A:
    def __init__(self, v):
        self.v = v
    def get(self):
        return self.v
print(A(5).get())        # 5
```

产物 `MiniPy_v4.29.sb3`：Interpreter 8,894 → **9,213** 块，合计 **10,548**，`check41` errors=0。

## 0. 效果

| 用例集 | v4.28 | **v4.29** |
|---|---|---|
| 缺口清单 `gaps`（39 条） | 38/39 | **39/39 —— 全部关闭** |
| 类 `cls`（新套件，12 条） | — | **12/12** |
| 其余 22 个套件 | — | 无回退 |

## 1. 对象模型（P55）：够用就好

值与变量都是「类型字符 + 文本」的字符串，所以没有做真正的堆对象：

* `class A:` 在 execute 里注册：遍历类体各行，把每个 def 交给已有的 `regdef`，但名字写成 **`A.m`**
  （于是 `lookup`/`calluser`/`fpush` 全部复用），并用全局标志 `curcls` 告诉 `regdef`「这是方法」，
  让它在记录形参时删掉开头的 self（`delAt(DefPar,1)` / `delAt(DefDef,1)`）；
* **实例 = 一个小整数 id**：`InstCls[id]` 是它的类名，属性是 `IAttrId/IAttrName/IAttrVal/IAttrType` 里的行；
  调用值本身用类型码 **`O`** 表示；
* `A(5)`：`callfn` 发现名字在 `ClsName` 里 → 分配 id、绑定 self、有 `A.__init__` 就调用、返回 id（类型 `O`）；
* `obj.m(args)`：`methodcall` 的类型守卫放宽到 `O` → `callmeth` 用 `InstCls[id]` 拼出 `A.m` → `calluser`；
* `self.v` 读取走 `eval` 的新分支，`self.v = x` 写入走 `execute` 的新分支（都是查属性表）。

self 通过 `assign("self", id, "O")` 绑定（不能用裸 `setV`，否则解释器的 `Types` 表不知道它的类型），
嵌套方法调用前后用 `VStack` 保存/恢复。

## 2. 本轮踩的坑

1. **`obj.m()` 的分派**：`A(5).get()` 的第一个记号后面是 `(` 而不是 `.`，原来直接落到「函数调用」分支，
   把 `5).get(` 当成参数区间。修法：在 `eval` 里先扫出**顶层第一个 `.`**（深度记 `(`/`[`），
   若区间以 `)` 结尾就交给新的 `methodcall2`：它先把接收者求值到 `mcval/mctype`，置 `mcpre=1`，
   再以 `methodcall(mdot-1, hi)` 复用原来的方法分派（`mcpre` 路径正是为此存在的）。
2. **`regdef` 读的是 `count`**：类体里我 `tokenize` 了方法行，却没同步 `count`，于是形参扫描全错
   （表现为 `TypeError: too many arguments`）。补 `count = length of Tok`。
3. **self 不能只用 `setV`**：`lookup`/`Types` 只认 `assign` 写进去的变量，裸变量设置会让解释器看不到 self。
4. **`return [1, 2]` 被下标赋值分支抢走**：`Kind[1]=="I" and Tok[2]=="["` 那条分支不看 `pending`，
   而 `return` 自己的分支排在它后面。修法：给该分支补 `NOT(Tok[1] in {return, yield, raise, print})`。
5. **谓词形状又踩一次**：`Kind[1]` 是「列表第 N 项」比较，必须用 item 版谓词（`hasItemEq`），
   用变量版（`varNameOf`）会静默 0 命中。

## 3. 未支持 / 已知限制（A4 相关）

* 继承、类属性、`__repr__`、绑定方法值、`a[0].v`（列表元素上的属性访问）、实例参与运算符——都不支持。
* 其余历史限制不变：字典值里带顶层运算符、字面量直接接下标、函数体以循环结尾、`one2` 嵌套单行 `if`，
  以及 `math`/`dict` 套件中属于测试台边界的 4 条（CPython 抛异常时 stdout 为空）。

## 4. 复现

```
node _work/v41/assemble.cjs        # ... + p52 + p54 + p55 + tail.txt -> build41.js
node _work/v41/build41.js         # -> MiniPy_v4.29.sb3
node _work/v41/check41.cjs MiniPy_v4.29.sb3
node _work/v41/run.mjs MiniPy_v4.29.sb3 _work/v41/cls.json
node _work/v41/run.mjs MiniPy_v4.29.sb3 _work/v41/gaps.json
```
