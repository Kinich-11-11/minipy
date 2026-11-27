# 基线功能与回放覆盖索引

对 1665 项回放做 CPython AST 静态标注，再关联同一程序的真实两侧结果。表中“通过”是**含该构造的整个程序**通过；不是构造的实现覆盖率，也不是将失败归因给该构造。不同特征的计数重叠；名字可能被用户遮蔽，未出现在语料不等于作品不支持。完整 Scratch 脚本、路由候选和调用图另见 `reports/*-inventory.json`。

## 语法与运算（73 种）

| 特征 | 涉及程序 | v4.267 通过 | v5 通过 | 一个 v5 未通过的关联程序 |
|---|---:|---:|---:|---|
| `(CPython 编译时拒绝)` | 1 | 0 | 0 | archive-rest:_probe_raw.json:raw_unclosed |
| `Add` | 335 | 328 | 329 | editor:exec_code |
| `And` | 34 | 34 | 34 | — |
| `Assert` | 7 | 7 | 7 | — |
| `Assign` | 865 | 835 | 843 | editor:exec_code |
| `Attribute` | 838 | 796 | 801 | coverage:_new2_algo:permutations recursive |
| `AugAssign` | 82 | 82 | 82 | — |
| `BinOp` | 437 | 422 | 423 | editor:exec_code |
| `BitAnd` | 14 | 14 | 14 | — |
| `BitOr` | 12 | 12 | 12 | — |
| `BitXor` | 10 | 10 | 10 | — |
| `BoolOp` | 45 | 45 | 45 | — |
| `Break` | 14 | 14 | 14 | — |
| `Call` | 1660 | 1600 | 1609 | editor:exec_code |
| `ClassDef` | 164 | 158 | 160 | coverage:_cov6:operator overloading len getitem |
| `Compare` | 365 | 353 | 355 | coverage:_new2_algo:permutations recursive |
| `Continue` | 11 | 11 | 11 | — |
| `Delete` | 10 | 10 | 10 | — |
| `Dict` | 150 | 142 | 142 | coverage:_new6_edge:dict methods battery |
| `DictComp` | 11 | 7 | 7 | coverage:_cov205d:dict comprehension frequency |
| `Div` | 35 | 32 | 33 | coverage:_cov1:zero division caught |
| `Eq` | 182 | 179 | 179 | coverage:_cov205d:map filter composition |
| `Expr` | 1656 | 1600 | 1609 | editor:exec_code |
| `FloorDiv` | 26 | 24 | 24 | coverage:_new6_edge:zero division |
| `For` | 171 | 168 | 168 | coverage:_new2_algo:permutations recursive |
| `FormattedValue` | 32 | 32 | 32 | — |
| `FunctionDef` | 451 | 438 | 443 | coverage:_new2_algo:permutations recursive |
| `GeneratorExp` | 39 | 37 | 37 | coverage:_new5_func:higher order filter map chained |
| `Global` | 3 | 3 | 3 | — |
| `Gt` | 82 | 79 | 79 | coverage:_new5_func:higher order filter map chained |
| `GtE` | 34 | 34 | 34 | — |
| `If` | 160 | 156 | 158 | coverage:_new2_algo:permutations recursive |
| `IfExp` | 16 | 15 | 15 | coverage:_new7_probe:probe list mult rows |
| `Import` | 436 | 412 | 412 | archive:_mods_misc.json:unknown_mod |
| `ImportFrom` | 22 | 22 | 22 | — |
| `In` | 44 | 43 | 43 | coverage:_new6_edge:dict methods battery |
| `Invert` | 4 | 4 | 4 | — |
| `Is` | 32 | 29 | 31 | coverage:_new7_probe:probe list mult rows |
| `IsNot` | 15 | 15 | 15 | — |
| `JoinedStr` | 35 | 35 | 35 | — |
| `LShift` | 6 | 6 | 6 | — |
| `Lambda` | 55 | 52 | 52 | coverage:_new5_func:higher order filter map chained |
| `List` | 545 | 525 | 530 | coverage:_new1_alias:matrix trap rows alias |
| `ListComp` | 84 | 80 | 80 | coverage:_new2_algo:permutations recursive |
| `Lt` | 96 | 96 | 96 | — |
| `LtE` | 44 | 42 | 42 | coverage:_new2_algo:permutations recursive |
| `Mod` | 55 | 51 | 51 | coverage:_cov1:zero division caught |
| `Mult` | 148 | 141 | 141 | coverage:_new1_alias:matrix trap rows alias |
| `Nonlocal` | 7 | 7 | 7 | — |
| `Not` | 19 | 19 | 19 | — |
| `NotEq` | 16 | 16 | 16 | — |
| `NotIn` | 11 | 11 | 11 | — |
| `Or` | 24 | 24 | 24 | — |
| `Pass` | 31 | 27 | 27 | archive:_probe230.json:func repr |
| `Pow` | 37 | 37 | 37 | — |
| `RShift` | 5 | 5 | 5 | — |
| `Raise` | 49 | 48 | 48 | archive-rest:_gap131.v222.json:type e equals E |
| `Return` | 374 | 365 | 370 | coverage:_new2_algo:permutations recursive |
| `Set` | 11 | 11 | 11 | — |
| `SetComp` | 6 | 5 | 5 | coverage:_cov7:dict and set comprehension with condition |
| `Slice` | 58 | 55 | 55 | coverage:_new2_algo:permutations recursive |
| `Starred` | 12 | 12 | 12 | — |
| `Sub` | 88 | 88 | 88 | — |
| `Subscript` | 277 | 271 | 271 | coverage:_new1_alias:matrix trap rows alias |
| `Try` | 142 | 140 | 140 | coverage:_cov1:zero division caught |
| `Tuple` | 142 | 136 | 136 | coverage:_cov205d:dict comprehension frequency |
| `UAdd` | 1 | 1 | 1 | — |
| `USub` | 177 | 174 | 174 | coverage:_cov6:operator overloading len getitem |
| `UnaryOp` | 193 | 190 | 190 | coverage:_cov6:operator overloading len getitem |
| `While` | 48 | 48 | 48 | — |
| `With` | 1 | 1 | 1 | — |
| `Yield` | 40 | 40 | 40 | — |
| `YieldFrom` | 1 | 1 | 1 | — |

## 内置名字的直接调用（50 种）

| 特征 | 涉及程序 | v4.267 通过 | v5 通过 | 一个 v5 未通过的关联程序 |
|---|---:|---:|---:|---|
| `Exception` | 2 | 2 | 2 | — |
| `IndexError` | 6 | 6 | 6 | — |
| `KeyError` | 4 | 4 | 4 | — |
| `RuntimeError` | 2 | 2 | 2 | — |
| `SyntaxError` | 2 | 2 | 2 | — |
| `TypeError` | 1 | 1 | 1 | — |
| `ValueError` | 32 | 32 | 32 | — |
| `ZeroDivisionError` | 1 | 1 | 1 | — |
| `abs` | 18 | 18 | 18 | — |
| `all` | 13 | 13 | 13 | — |
| `any` | 15 | 15 | 15 | — |
| `bin` | 3 | 3 | 3 | — |
| `bool` | 21 | 21 | 21 | — |
| `callable` | 4 | 4 | 4 | — |
| `chr` | 3 | 3 | 3 | — |
| `dict` | 3 | 3 | 3 | — |
| `divmod` | 11 | 11 | 11 | — |
| `enumerate` | 11 | 11 | 11 | — |
| `exec` | 1 | 0 | 0 | editor:exec_code |
| `filter` | 5 | 3 | 3 | coverage:_new5_func:higher order filter map chained |
| `float` | 19 | 19 | 19 | — |
| `frozenset` | 1 | 1 | 1 | — |
| `hex` | 3 | 3 | 3 | — |
| `input` | 1 | 1 | 1 | — |
| `int` | 43 | 43 | 43 | — |
| `isinstance` | 19 | 19 | 19 | — |
| `issubclass` | 5 | 5 | 5 | — |
| `iter` | 13 | 13 | 13 | — |
| `len` | 138 | 132 | 133 | coverage:_new2_algo:permutations recursive |
| `list` | 100 | 98 | 98 | coverage:_new5_func:higher order filter map chained |
| `map` | 11 | 9 | 9 | coverage:_new5_func:higher order filter map chained |
| `max` | 26 | 25 | 25 | coverage:_new5_func:higher order filter map chained |
| `min` | 22 | 22 | 22 | — |
| `next` | 33 | 33 | 33 | — |
| `oct` | 3 | 3 | 3 | — |
| `ord` | 3 | 3 | 3 | — |
| `pow` | 19 | 19 | 19 | — |
| `print` | 1653 | 1598 | 1607 | editor:exec_code |
| `range` | 144 | 137 | 137 | coverage:_new2_algo:permutations recursive |
| `repr` | 17 | 15 | 16 | archive:_probe230b.json:repr str func |
| `reversed` | 6 | 6 | 6 | — |
| `round` | 54 | 54 | 54 | — |
| `set` | 12 | 11 | 11 | coverage:_cov205d:dict comprehension frequency |
| `sorted` | 60 | 57 | 57 | coverage:_new2_algo:permutations recursive |
| `str` | 64 | 63 | 63 | archive:_probe230b.json:repr str func |
| `sum` | 27 | 25 | 25 | coverage:_new5_func:higher order filter map chained |
| `super` | 5 | 5 | 5 | — |
| `tuple` | 3 | 3 | 3 | — |
| `type` | 21 | 20 | 20 | archive-rest:_gap131.v222.json:type e equals E |
| `zip` | 15 | 15 | 15 | — |

## 导入模块（9 种）

| 特征 | 涉及程序 | v4.267 通过 | v5 通过 | 一个 v5 未通过的关联程序 |
|---|---:|---:|---:|---|
| `cmath` | 68 | 67 | 67 | archive-rest:_mods_cp.json:bad |
| `collections` | 8 | 8 | 8 | — |
| `datetime` | 99 | 94 | 94 | archive-rest:_mods20_datetime.json:err_day |
| `math` | 46 | 42 | 42 | archive-rest:_mods20_math.json:domain |
| `os` | 1 | 0 | 0 | archive:_mods_misc.json:unknown_mod |
| `random` | 57 | 53 | 53 | archive-rest:_mods20_random.json:err_order |
| `re` | 99 | 99 | 99 | — |
| `statistics` | 35 | 31 | 31 | archive-rest:_mods20_statistics.json:err_empty |
| `time` | 56 | 51 | 51 | archive:_real_time.json:strftime_date |

## 属性调用（含类型方法和用户方法）（209 种）

| 特征 | 涉及程序 | v4.267 通过 | v5 通过 | 一个 v5 未通过的关联程序 |
|---|---:|---:|---:|---|
| `__bool__` | 1 | 1 | 1 | — |
| `__init__` | 5 | 5 | 5 | — |
| `_repr` | 1 | 1 | 1 | — |
| `a` | 1 | 1 | 1 | — |
| `acos` | 5 | 5 | 5 | — |
| `acosh` | 4 | 4 | 4 | — |
| `add` | 15 | 15 | 15 | — |
| `append` | 170 | 163 | 168 | coverage:_new2_algo:permutations recursive |
| `appendleft` | 2 | 2 | 2 | — |
| `area` | 1 | 1 | 1 | — |
| `asctime` | 3 | 3 | 3 | — |
| `asin` | 5 | 5 | 5 | — |
| `asinh` | 3 | 3 | 3 | — |
| `atan` | 3 | 3 | 3 | — |
| `atanh` | 5 | 5 | 5 | — |
| `b` | 1 | 1 | 1 | — |
| `bump` | 5 | 5 | 5 | — |
| `capitalize` | 2 | 2 | 2 | — |
| `ceil` | 5 | 5 | 5 | — |
| `center` | 2 | 2 | 2 | — |
| `choice` | 3 | 3 | 3 | — |
| `choices` | 4 | 3 | 3 | archive-rest:_real_random.json:choices_empty |
| `clear` | 3 | 3 | 3 | — |
| `collect` | 1 | 1 | 1 | — |
| `compile` | 4 | 4 | 4 | — |
| `consume` | 1 | 1 | 1 | — |
| `copy` | 7 | 7 | 7 | — |
| `cos` | 8 | 8 | 8 | — |
| `cosh` | 3 | 3 | 3 | — |
| `count` | 10 | 9 | 9 | coverage:_cov205d:dict comprehension frequency |
| `ctime` | 8 | 8 | 8 | — |
| `date` | 71 | 66 | 66 | archive-rest:_mods20_datetime.json:err_day |
| `datetime` | 12 | 12 | 12 | — |
| `deposit` | 2 | 2 | 2 | — |
| `describe` | 2 | 2 | 2 | — |
| `difference` | 1 | 1 | 1 | — |
| `discard` | 2 | 2 | 2 | — |
| `drive` | 1 | 1 | 1 | — |
| `end` | 1 | 1 | 1 | — |
| `endswith` | 5 | 5 | 5 | — |
| `escape` | 2 | 2 | 2 | — |
| `exp` | 7 | 7 | 7 | — |
| `expect` | 1 | 1 | 1 | — |
| `expr` | 2 | 2 | 2 | — |
| `extend` | 7 | 7 | 7 | — |
| `extendleft` | 1 | 1 | 1 | — |
| `f` | 6 | 4 | 6 | — |
| `fabs` | 3 | 3 | 3 | — |
| `find` | 3 | 3 | 3 | — |
| `findall` | 33 | 33 | 33 | — |
| `finditer` | 17 | 17 | 17 | — |
| `fireball` | 1 | 1 | 1 | — |
| `first` | 1 | 1 | 1 | — |
| `floor` | 7 | 7 | 7 | — |
| `fmean` | 2 | 2 | 2 | — |
| `fmod` | 3 | 3 | 3 | — |
| `foo` | 4 | 3 | 3 | archive-rest:_mods_cp.json:bad |
| `format` | 23 | 23 | 23 | — |
| `fromisoformat` | 3 | 3 | 3 | — |
| `fullmatch` | 3 | 3 | 3 | — |
| `gauss` | 3 | 3 | 3 | — |
| `geometric_mean` | 2 | 2 | 2 | — |
| `get` | 17 | 16 | 16 | coverage:_new6_edge:dict methods battery |
| `getrandbits` | 4 | 4 | 4 | — |
| `gmtime` | 1 | 1 | 1 | — |
| `go` | 1 | 1 | 1 | — |
| `group` | 31 | 31 | 31 | — |
| `harmonic_mean` | 2 | 2 | 2 | — |
| `has` | 2 | 2 | 2 | — |
| `hello` | 1 | 1 | 1 | — |
| `hi` | 2 | 2 | 2 | — |
| `hit` | 1 | 1 | 1 | — |
| `inc` | 1 | 1 | 1 | — |
| `index` | 5 | 5 | 5 | — |
| `inorder` | 4 | 4 | 4 | — |
| `ins` | 6 | 6 | 6 | — |
| `insert` | 4 | 4 | 4 | — |
| `intersection` | 1 | 1 | 1 | — |
| `intro` | 1 | 1 | 1 | — |
| `isalnum` | 4 | 4 | 4 | — |
| `isalpha` | 2 | 2 | 2 | — |
| `isdigit` | 5 | 5 | 5 | — |
| `isdisjoint` | 1 | 1 | 1 | — |
| `isinf` | 2 | 2 | 2 | — |
| `islower` | 2 | 2 | 2 | — |
| `isnan` | 2 | 2 | 2 | — |
| `iso` | 1 | 1 | 1 | — |
| `isoformat` | 16 | 16 | 16 | — |
| `isspace` | 3 | 3 | 3 | — |
| `issubset` | 1 | 1 | 1 | — |
| `issuperset` | 1 | 1 | 1 | — |
| `isupper` | 2 | 2 | 2 | — |
| `items` | 19 | 12 | 12 | coverage:_new6_edge:dict methods battery |
| `join` | 26 | 25 | 25 | coverage:_new2_algo:permutations recursive |
| `keys` | 14 | 13 | 13 | coverage:_new6_edge:dict methods battery |
| `kind` | 1 | 1 | 1 | — |
| `length` | 1 | 1 | 1 | — |
| `ljust` | 2 | 2 | 2 | — |
| `localtime` | 4 | 4 | 4 | — |
| `log` | 9 | 7 | 7 | archive-rest:_mods20_math.json:log_zero |
| `log10` | 3 | 3 | 3 | — |
| `lower` | 10 | 10 | 10 | — |
| `lstrip` | 2 | 2 | 2 | — |
| `m` | 3 | 3 | 3 | — |
| `mark` | 1 | 1 | 1 | — |
| `match` | 4 | 4 | 4 | — |
| `mean` | 11 | 9 | 9 | archive-rest:_mods20_statistics.json:err_empty |
| `median` | 3 | 3 | 3 | — |
| `median_high` | 2 | 2 | 2 | — |
| `median_low` | 2 | 2 | 2 | — |
| `mode` | 3 | 3 | 3 | — |
| `monotonic` | 2 | 2 | 2 | — |
| `monotonic_ns` | 1 | 1 | 1 | — |
| `multimode` | 2 | 2 | 2 | — |
| `name` | 2 | 2 | 2 | — |
| `next` | 1 | 1 | 1 | — |
| `next_number` | 1 | 1 | 1 | — |
| `nope` | 1 | 0 | 0 | archive-rest:_mods_misc.json:unknown_attr |
| `norm2` | 1 | 1 | 1 | — |
| `parse` | 2 | 2 | 2 | — |
| `peek` | 3 | 3 | 3 | — |
| `perf_counter` | 3 | 3 | 3 | — |
| `perf_counter_ns` | 1 | 1 | 1 | — |
| `phase` | 3 | 3 | 3 | — |
| `plus` | 1 | 1 | 1 | — |
| `polar` | 15 | 15 | 15 | — |
| `pop` | 28 | 27 | 27 | coverage:_new6_edge:dict methods battery |
| `popitem` | 1 | 1 | 1 | — |
| `popleft` | 5 | 5 | 5 | — |
| `pow` | 6 | 6 | 6 | — |
| `power` | 2 | 2 | 2 | — |
| `primary` | 2 | 2 | 2 | — |
| `process_time` | 2 | 2 | 2 | — |
| `process_time_ns` | 1 | 1 | 1 | — |
| `pstdev` | 3 | 3 | 3 | — |
| `push` | 4 | 4 | 4 | — |
| `put` | 2 | 2 | 2 | — |
| `pvariance` | 2 | 2 | 2 | — |
| `randint` | 9 | 6 | 6 | archive-rest:_mods20_random.json:err_order |
| `random` | 9 | 9 | 9 | — |
| `randrange` | 6 | 6 | 6 | — |
| `rect` | 3 | 3 | 3 | — |
| `remove` | 4 | 4 | 4 | — |
| `replace` | 4 | 4 | 4 | — |
| `result` | 1 | 1 | 1 | — |
| `reverse` | 4 | 4 | 4 | — |
| `rfind` | 2 | 2 | 2 | — |
| `rindex` | 1 | 1 | 1 | — |
| `rjust` | 2 | 2 | 2 | — |
| `rotate` | 1 | 1 | 1 | — |
| `rsplit` | 1 | 1 | 1 | — |
| `rstrip` | 2 | 2 | 2 | — |
| `sample` | 6 | 6 | 6 | — |
| `search` | 21 | 21 | 21 | — |
| `seed` | 45 | 45 | 45 | — |
| `send` | 1 | 1 | 1 | — |
| `set` | 1 | 1 | 1 | — |
| `setdefault` | 2 | 1 | 1 | coverage:_new6_edge:dict methods battery |
| `setk` | 2 | 2 | 2 | — |
| `setl_then_r` | 1 | 1 | 1 | — |
| `setr` | 1 | 1 | 1 | — |
| `shuffle` | 5 | 5 | 5 | — |
| `sin` | 9 | 9 | 9 | — |
| `sinh` | 3 | 3 | 3 | — |
| `size` | 2 | 2 | 2 | — |
| `sleep` | 4 | 4 | 4 | — |
| `sort` | 16 | 16 | 16 | — |
| `speak` | 3 | 3 | 3 | — |
| `split` | 18 | 18 | 18 | — |
| `splitlines` | 2 | 2 | 2 | — |
| `sqrt` | 29 | 27 | 27 | archive-rest:_mods20_math.json:domain |
| `start` | 4 | 4 | 4 | — |
| `startswith` | 7 | 7 | 7 | — |
| `stdev` | 2 | 2 | 2 | — |
| `strftime` | 29 | 24 | 24 | archive:_real_time.json:strftime_date |
| `strip` | 13 | 13 | 13 | — |
| `sub` | 12 | 12 | 12 | — |
| `swapcase` | 2 | 2 | 2 | — |
| `symmetric_difference` | 1 | 1 | 1 | — |
| `t` | 5 | 5 | 5 | — |
| `tan` | 6 | 6 | 6 | — |
| `tanh` | 3 | 3 | 3 | — |
| `term` | 2 | 2 | 2 | — |
| `text` | 3 | 3 | 3 | — |
| `time` | 4 | 4 | 4 | — |
| `time_ns` | 3 | 3 | 3 | — |
| `timedelta` | 16 | 16 | 16 | — |
| `title` | 4 | 4 | 4 | — |
| `to_list` | 2 | 2 | 2 | — |
| `today` | 1 | 1 | 1 | — |
| `toordinal` | 7 | 7 | 7 | — |
| `total` | 1 | 1 | 1 | — |
| `total_seconds` | 1 | 1 | 1 | — |
| `trunc` | 4 | 4 | 4 | — |
| `u` | 1 | 1 | 1 | — |
| `unary` | 2 | 2 | 2 | — |
| `uniform` | 4 | 4 | 4 | — |
| `union` | 1 | 1 | 1 | — |
| `update` | 6 | 5 | 5 | coverage:_new6_edge:dict methods battery |
| `upper` | 13 | 12 | 12 | coverage:_new5_func:higher order filter map chained |
| `vals` | 2 | 2 | 2 | — |
| `values` | 13 | 10 | 10 | coverage:_new6_edge:dict methods battery |
| `variance` | 3 | 2 | 2 | archive-rest:_mods20_statistics.json:err_single |
| `walk` | 1 | 1 | 1 | — |
| `weekday` | 5 | 5 | 5 | — |
| `when` | 1 | 1 | 1 | — |
| `who` | 3 | 3 | 3 | — |
| `withdraw` | 2 | 2 | 2 | — |
| `zfill` | 5 | 5 | 5 | — |
