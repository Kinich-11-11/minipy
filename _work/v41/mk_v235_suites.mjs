// Generate the four _v235_* suites (JSON via node, never shell quoting).
import fs from 'fs';
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const E9 = String.fromCharCode(233);

const hof = [
  { name: 'map_obj_attr', code: `class P:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ps = [P(2), P(1)]${NL}print(list(map(lambda p: p.v, ps)))` },
  { name: 'sorted_obj_attr', code: `class P:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ps = [P(2), P(1), P(3)]${NL}print([q.v for q in sorted(ps, key=lambda p: p.v)])` },
  { name: 'filter_obj_attr', code: `class P:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ps = [P(1), P(2)]${NL}print([q.v for q in filter(lambda p: p.v > 1, ps)])` },
  { name: 'minmax_obj_attr', code: `class P:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ps = [P(3), P(1), P(2)]${NL}print(min(ps, key=lambda p: p.v).v, max(ps, key=lambda p: p.v).v)` },
  { name: 'sorted_obj_chain', code: `class P:${NL}    def __init__(self, v):${NL}        self.v = v${NL}    def name(self):${NL}        return 'n' + str(self.v)${NL}ps = [P(2), P(1)]${NL}print([q.v for q in sorted(ps, key=lambda p: p.name())])` },
  { name: 'map_fn_value', code: `def a():${NL}    return 'a'${NL}def b():${NL}    return 'b'${NL}fns = [b, a]${NL}print([g() for g in map(lambda f: f, fns)])` },
  { name: 'sorted_fn_value', code: `def a():${NL}    return 1${NL}def b():${NL}    return 2${NL}fns = [b, a]${NL}print([g() for g in sorted(fns, key=lambda f: f())])` },
  { name: 'map_obj_sub', code: `class P:${NL}    def __init__(self, v):${NL}        self.v = v${NL}d = {'k': P(5)}${NL}print(list(map(lambda q: q.v, [d['k']])))` },
  { name: 'sorted_nested_attr', code: `class P:${NL}    def __init__(self, v, nx=None):${NL}        self.v = v${NL}        self.nx = nx${NL}ps = [P(1, P(9)), P(2, P(8))]${NL}print([q.v for q in sorted(ps, key=lambda p: p.nx.v)])` },
  { name: 'map_lambda_two_chains', code: `ws = ['  aB ', ' cD ']${NL}print(list(map(lambda s: s.strip().lower(), ws)))` },
  { name: 'filter_chain_pred', code: `ws = ['ab', ' cd', 'ax']${NL}print(list(filter(lambda s: s.strip().startswith('a'), ws)))` },
  { name: 'map_regex_groups', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'ab-12 cd-34'))${NL}print([m.group(2) for m in ms])` },
];

const fmt = [
  { name: 'pct_a_str', code: `print('%a' % 'abc')` },
  { name: 'pct_a_ctrl', code: `print('%a' % 'a${BS}nb${BS}t')` },
  { name: 'pct_a_num', code: `print('%a' % 255, '%a' % 2.5)` },
  { name: 'pct_a_obj', code: `class P:${NL}    def __repr__(self):${NL}        return 'R'${NL}    def __str__(self):${NL}        return 'S'${NL}print('%a' % P())` },
  { name: 'pct_a_width', code: `print('[%8a]' % 'ab')` },
  { name: 'pct_A_unsupported', code: `print('%A' % 'x')`, expectError: true },
  { name: 'ascii_builtin', code: `print(ascii('a${BS}nb'), ascii('plain'))` },
  { name: 'fstring_a_conv', code: `v = 'a${BS}nb'${NL}print(f'{v!a}')` },
  { name: 'format_a_conv', code: `print('{0!a}'.format('a${BS}nb'))` },
  { name: 'fmt_obj_custom', code: `class P:${NL}    def __format__(self, spec):${NL}        return '[' + spec + ']'${NL}p = P()${NL}print(format(p, 'x'))` },
  { name: 'fmt_obj_empty_spec', code: `class P:${NL}    def __format__(self, spec):${NL}        return '[' + spec + ']'${NL}p = P()${NL}print(format(p))` },
  { name: 'fmt_obj_no_dunder_str', code: `class P:${NL}    def __format__(self, spec):${NL}        return 'F'${NL}p = P()${NL}print(format(p))` },
  { name: 'fmt_obj_spec_no_method', code: `class P:${NL}    def __str__(self):${NL}        return 'S'${NL}p = P()${NL}print(format(p, 'x'))`, expectError: true },
  { name: 'fmt_str_spec', code: `print(format('ab', '>6'), format(42, '06d'))` },
  { name: 'input_ascii_repr', code: `s = input()${NL}print(repr(s))`, inputs: ['hi there'] },
  { name: 'input_nonascii_repr', code: `s = input()${NL}print(repr(s))`, inputs: ['h' + E9 + 'llo'] },
  { name: 'input_nonascii_ascii', code: `s = input()${NL}print(ascii(s))`, inputs: ['h' + E9 + 'llo'] },
  { name: 'input_nonascii_pct_a', code: `s = input()${NL}print('%a' % s)`, inputs: ['h' + E9 + 'llo'] },
  { name: 'input_nonascii_fstring_a', code: `s = input()${NL}print(f'{s!a}')`, inputs: ['h' + E9 + 'llo'] },
  { name: 'input_nonascii_format', code: `class P:${NL}    def __format__(self, spec):${NL}        return '<' + ascii(spec) + '>'${NL}p = P()${NL}print(format(p, 'q'))`, inputs: [] },
];

const num = [
  { name: 'lit_435e18', code: `print(4.35e18)` },
  { name: 'lit_435e18_int', code: `print(int(4.35e18))` },
  { name: 'lit_435e18_eq', code: `print(4.35e18 == 4350000000000000000)` },
  { name: 'lit_1e320_under', code: `print(1e-320)` },
  { name: 'lit_5e324_under', code: `print(5e-324)` },
  { name: 'lit_25e324_round', code: `print(2.5e-324)` },
  { name: 'lit_1e309_inf', code: `print(1e309)` },
  { name: 'lit_inf_arith', code: `x = 1e309${NL}print(x + 1)` },
  { name: 'lit_inf_fn', code: `print(float('inf'), float('-inf'), float('1e-320'))` },
  { name: 'lit_boundary_max', code: `print(1.7976931348623157e308)` },
  { name: 'lit_neg_exp_dot', code: `print(3.14159e-10)` },
  { name: 'lit_big_mantissa', code: `print(1.23456789012345678e5)` },
  { name: 'lit_regression_small', code: `print(1e-5, 1e21, 2.675e0)` },
  { name: 'lit_float_fn', code: `print(float('1e-320'), float('4.35e18'))` },
  { name: 'lit_pct_e', code: `print('%.2e' % 4.35e18)` },
  { name: 'lit_round_trip', code: `x = 3.14159e-10${NL}print(x)` },
];

const chain = [
  { name: 'callroot_attr_set', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns = [N(1)]${NL}def f():${NL}    return ns[0]${NL}f().v = 3${NL}print(ns[0].v)` },
  { name: 'callroot_attr_set_deep', code: `class N:${NL}    def __init__(self, v, nx=None):${NL}        self.v = v${NL}        self.nx = nx${NL}n = N(1, N(2))${NL}def f():${NL}    return n${NL}f().nx.v = 7${NL}print(n.nx.v)` },
  { name: 'callroot_attr_aug', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns = [N(1)]${NL}def f():${NL}    return ns[0]${NL}f().v += 5${NL}print(ns[0].v)` },
  { name: 'callroot_attr_aug_deep', code: `class N:${NL}    def __init__(self, v, nx=None):${NL}        self.v = v${NL}        self.nx = nx${NL}n = N(1, N(2))${NL}def f():${NL}    return n${NL}f().nx.v += 3${NL}print(n.nx.v)` },
  { name: 'callroot_sub_attr_set', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}d = {'k': N(1)}${NL}def f():${NL}    return d${NL}f()['k'].v = 9${NL}print(d['k'].v)` },
  { name: 'callroot_obj_elem_set', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}    def bag(self):${NL}        return self.items${NL}    def __init2(self):${NL}        pass${NL}n = N(0)${NL}n.items = [1, 2]${NL}def f():${NL}    return n${NL}f().items[0] = 9${NL}print(n.items)` },
  { name: 'methodroot_attr_set', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}    def twin(self):${NL}        return N(self.v * 2)${NL}n = N(3)${NL}ns = [None]${NL}n.save = ns${NL}class M:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns2 = [M(1)]${NL}def g():${NL}    return ns2[0]${NL}g().v = 5${NL}print(ns2[0].v)` },
  { name: 'callroot_attr_read_aug_mix', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns = [N(1)]${NL}def f():${NL}    return ns[0]${NL}x = f().v${NL}x += 5${NL}f().v = x${NL}print(ns[0].v)` },
  { name: 'callroot_two_objs', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns = [N(1), N(2)]${NL}def f(i):${NL}    return ns[i]${NL}f(0).v = 10${NL}f(1).v = 20${NL}print(ns[0].v, ns[1].v)` },
  { name: 'callroot_attr_set_str', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns = [N(1)]${NL}def f():${NL}    return ns[0]${NL}f().v = 'x' + 'y'${NL}print(ns[0].v)` },
];

fs.writeFileSync('_work/v41/_v235_hof.json', JSON.stringify(hof, null, 1));
fs.writeFileSync('_work/v41/_v235_fmt.json', JSON.stringify(fmt, null, 1));
fs.writeFileSync('_work/v41/_v235_num.json', JSON.stringify(num, null, 1));
fs.writeFileSync('_work/v41/_v235_chain.json', JSON.stringify(chain, null, 1));
console.log('suites:', hof.length, fmt.length, num.length, chain.length);
