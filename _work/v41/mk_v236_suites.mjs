// Generate the four _v236_* suites.
import fs from 'fs';
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const E9 = String.fromCharCode(233);
const Q = String.fromCharCode(39);

const hof2 = [
  { name: 'kf_map_group', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'ab-12 cd-34'))${NL}print(list(map(lambda m: m.group(2), ms)))` },
  { name: 'kf_sorted_group', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'b2-a1 x9-c3'))${NL}print([m.group(1) for m in sorted(ms, key=lambda m: m.group(1))])` },
  { name: 'kf_filter_span', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'ab-12 cd-345'))${NL}print([m.span() for m in filter(lambda m: m.group(2) == '345', ms)])` },
  { name: 'kf_min_group', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'cd-34 ab-12'))${NL}print(min(ms, key=lambda m: m.group(2)).group(1))` },
  { name: 'kf_map_match_str', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)', 'ab cd'))${NL}print(list(map(lambda m: m.group(1).upper(), ms)))` },
  { name: 'kf_map_nested_attr', code: `class P:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ps = [P(2), P(1)]${NL}print(list(map(lambda p: p.v * 10, ps)))` },
  { name: 'kf_map_two_args_method', code: `ws = ['a-b-c', 'd-e-f']${NL}print(list(map(lambda s: s.replace('-', '+'), ws)))` },
  { name: 'kf_map_startswith_arg', code: `ws = ['ab1', 'cd2', 'ab3']${NL}print(list(map(lambda s: s.startswith('ab'), ws)))` },
  { name: 'kf_map_method_chain_arg', code: `ws = [' a ', ' b ']${NL}print(list(map(lambda s: s.strip().ljust(4, '.'), ws)))` },
];

const fmt2 = [
  { name: 'fs_obj_custom', code: `class P:${NL}    def __format__(self, spec):${NL}        return '[' + spec + ']'${NL}p = P()${NL}print(f'{p:x}')` },
  { name: 'fs_format_call_custom', code: `class P:${NL}    def __format__(self, spec):${NL}        return '[' + spec + ']'${NL}p = P()${NL}print('{0:x}'.format(p))` },
  { name: 'fs_obj_str_conv', code: `class P:${NL}    def __format__(self, spec):${NL}        return '[' + spec + ']'${NL}    def __str__(self):${NL}        return 'S'${NL}p = P()${NL}print(f'{p!s}')` },
  { name: 'fs_obj_repr_conv', code: `class P:${NL}    def __format__(self, spec):${NL}        return '[' + spec + ']'${NL}    def __repr__(self):${NL}        return 'R'${NL}p = P()${NL}print(f'{p!r}')` },
  { name: 'fs_obj_no_fmt_spec_err', code: `class P:${NL}    def __str__(self):${NL}        return 'S'${NL}p = P()${NL}print(f'{p:x}')`, expectError: true },
  { name: 'fs_str_fmt', code: `print(f'{"ab":>6}')` },
  { name: 'fs_num_fmt', code: `print(f'{42:06d}')` },
  { name: 'input_ascii_esc', code: `s = input()${NL}print(ascii(s), '%a' % s, f'{s!a}')`, inputs: ['h' + E9 + 'llo'] },
  { name: 'input_ascii_quote', code: `s = input()${NL}print(ascii(s))`, inputs: ['it' + Q + 's'] },
];

const num2 = [
  { name: 'float_overflow', code: `print(float('1e309'))` },
  { name: 'float_overflow_neg', code: `print(float('-1e309'))` },
  { name: 'float_overflow_arith', code: `x = float('1e309')${NL}print(x + 1, x * 2)` },
  { name: 'float_overflow_cmp', code: `x = float('1e309')${NL}print(x > 1e308)` },
  { name: 'float_inf_text', code: `print(float('inf'), float('-inf'))` },
  { name: 'float_underflow', code: `print(float('1e-320'))` },
  { name: 'lit_435e18', code: `print(4.35e18 == 4350000000000000000)` },
  { name: 'lit_subnormal', code: `print(1e-320, 5e-324)` },
];

const chain2 = [
  { name: 'br_attr_set', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns = [N(1)]${NL}def f():${NL}    return ns[0]${NL}(f()).v = 3${NL}print(ns[0].v)` },
  { name: 'br_attr_set_lit', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns = [N(1)]${NL}def f():${NL}    return ns[0]${NL}(f()).v = 'x' + 'y'${NL}print(ns[0].v)` },
  { name: 'br_plain_paren', code: `x = 1${NL}(x) = 5${NL}print(x)` },
  { name: 'br_deep_call', code: `class N:${NL}    def __init__(self, v, nx=None):${NL}        self.v = v${NL}        self.nx = nx${NL}n = N(1, N(2))${NL}def f():${NL}    return n${NL}(f()).nx.v = 7${NL}print(n.nx.v)` },
  { name: 'br_two_targets', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns = [N(1), N(2)]${NL}def f(i):${NL}    return ns[i]${NL}(f(0)).v = 10${NL}(f(1)).v = 20${NL}print(ns[0].v, ns[1].v)` },
  { name: 'br_unpack_still_works', code: `a, b = 1, 2${NL}print(a, b)` },
  { name: 'br_tuple_unpack', code: `p = (1, 2)${NL}a, b = p${NL}print(a, b)` },
];

fs.writeFileSync('_work/v41/_v236_hof.json', JSON.stringify(hof2, null, 1));
fs.writeFileSync('_work/v41/_v236_fmt.json', JSON.stringify(fmt2, null, 1));
fs.writeFileSync('_work/v41/_v236_num.json', JSON.stringify(num2, null, 1));
fs.writeFileSync('_work/v41/_v236_chain.json', JSON.stringify(chain2, null, 1));
console.log('suites:', hof2.length, fmt2.length, num2.length, chain2.length);
