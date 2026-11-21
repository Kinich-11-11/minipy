# MiniPy v4.239 更新说明：MP-05

基于 v4.238（提交 `ad6df474a28e87278d9793086aa928329bfbf2c5`），继续处理函数星号参数与双星号关键字参数的兼容性问题。

## 修复内容（P757）

原 P105 的 `fhas` 在 P100 的未知关键字检查之后才计算。因此，首次调用带 `**kwargs` 的函数会错误拒绝未知关键字；后续调用可能又沿用前次函数的 `fhas` 状态。

本轮在参数绑定前根据本次调用的签名重新验证：

- 区分 `*args` 与 `**kwargs`，分别控制额外位置和关键字参数的接收。
- `*args` 绑定为 Python 元组（包括空元组），`**kwargs` 仍为字典。
- 检查普通参数被位置和关键字重复绑定、重复显式关键字、双星号解包产生的重复关键字、位置参数过多及未知关键字。
- 对关键字名称进行大小写敏感的比较，避免 `a` 和 `A` 串绑。
- 保留既有参数求值、帧展开与回收、别名处理路径；错误后仍可被调用者捕获并继续执行。

原复现：

```python
def f(a,*args,**kw):
    return a + sum(args) + kw.get('z',0)
print(f(1,2,3,z=4))
```

v4.238 在隔离 Scratch VM 环境中报 `TypeError: unexpected keyword argument z`。v4.239 输出 `10`，与 CPython 一致。

## 构建与验收

```bash
node _work/v41/assemble239.cjs
node _work/v41/build239.js
node _work/v41/check41.cjs MiniPy_v4.239.sb3
node _work/v41/runrepair.mjs MiniPy_v4.239.sb3 _work/v41/_v239_mp05.txt
node _work/v41/runrepair.mjs MiniPy_v4.239.sb3 _work/v41/_v237_bl.txt
```

可用 `assemble239.cjs --delta` 在 v4.238 SB3 上生成增量构建器 `build239delta.js`。实际测试使用 Linux Scratch VM 5.0.300、CPython 3.12.14。最终完整重建包含 55,600 个积木，结构检查 0 错误。

| 验收套件 | 结果 |
|---|---:|
| MP-05 定向用例（去重） | 19/19 |
| 原修复清单功能用例 | 33/33 |
| 最终 SB3 参数绑定烟测 | 6/6 |
| 既有高阶函数组合套件 `_real3_hof.json` | 16/16 |

上述结果及实际/预期输出见 `_work/v41/_v239_results.json`。历史 267/873/593 全量套件未重新逐项运行。

MP-17、MP-18 的剩余性能目标及 v4.238 的其他兼容性边界未在本轮宣称完成。
