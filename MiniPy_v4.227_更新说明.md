# MiniPy v4.227 更新说明

本轮修复 `random` 的三处种子问题（PRNG 算法本身未变）。

## 一、总体变化

| 项目 | v4.226 | v4.227 |
|---|---|---|
| Interpreter 块数 | 43,482 | **43,495** |
| 总块数 | 45,937 | **45,950** |
| 主套件 `_new*` | 168/168 | **168/168** |
| 覆盖套件 `_cov*` | 705/705 | **705/705** |
| 补充套件 `_gap131` | 82/82 | **82/82** |
| 内置 demo 端到端 | 20/20 | **20/20** |
| 旧模块套件 `_mods_*` | 71/71 | **71/71** |
| 新 20 例套件 `_mods20_*` | 140/140 | **140/140** |
| `check41` | errors=0 | **errors=0** |

## 二、未调用 `seed()` 时随机数恒为 0

`zrstate` 初值是 0，而 Lehmer 递推 `state = 48271*state mod (2^31-1)` 在 0 处是不动点，
于是 `random.random()` 一直返回 `0`、`randint(1,6)` 一直返回 `1`（`gauss` 还会因
`ln(0)` 得到 NaN）。

修法：

* `rndnext` 开头若 `zrstate == 0`，用 `floor(timer * 1000003) mod (2^31-1)` 自动播种；
* RUN 启动时把 `zrstate` 复位为 0，保证每次运行都重新自动播种；
* `seed()` 无参路径同样加 `FLOOR`，保持状态为整数。

## 三、`seed("字符串")` 所有字符串得到同一个种子

原实现把 `letterOf(...)` 直接放进算术表达式；Scratch 对非数字字符做数值转换会得到 0，
所以 `seed('abc')`、`seed('xyz')` 与 `seed(0)` 完全一样。

修法：新增 128 项字符表 `RndAscii`（下标 = 码位 + 1），用 `itemnumoflist` 取字符码，
再做 base-131 多项式哈希 `h = (h*131 + code) mod (2^31-1)`，最后 `state = h + 1`。
字符串种子现在可复现且不同字符串不同。

## 四、验证

```bash
node _work/v41/check41.cjs MiniPy_v4.227.sb3                                  # errors=0
node _work/v41/runall.mjs MiniPy_v4.227.sb3 _work/v41/_res227new _work/v41/_new*.txt    # 168/168
node _work/v41/runall.mjs MiniPy_v4.227.sb3 _work/v41/_res227cov _work/v41/_cov*.txt    # 705/705
node _work/v41/run_iso.mjs MiniPy_v4.227.sb3 _work/v41/_gap131.json _work/v41/_gap131_227.out.json g227  # 82/82
node _work/v41/_demo_e2e3.mjs MiniPy_v4.227.sb3                              # ALL 20 OK
node _work/v41/run_iso.mjs MiniPy_v4.227.sb3 _work/v41/_probe_rndseed.json _work/v41/_probe_rndseed_out.json prs
```

种子专项 6 例：未播种范围/两次不同、字符串种子可复现且互异、数字种子可复现且非零、
不同种子不同值、未播种实际输出（最后一项只校验可运行，数值本就不与 CPython 相同）。

> 注意：PRNG 仍是 31 位 Lehmer（`48271` / `2^31-1`），**同种子的数值与 CPython 的
> MT19937 不同**；可复现性、范围、数量、形状与 CPython 一致。原因见更新说明
> v4.223 §random：MT 的 32 位乘法会超出 Scratch 双精度 53 位尾数，无法位级复刻。
