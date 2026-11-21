// v4.236 摸底探针（四类缺口）— JSON 由 node 写（铁律）。
import fs from 'fs';
const NL = String.fromCharCode(10);
const BS = String.fromCharCode(92);
const E9 = String.fromCharCode(233);

const a = [
  // 类 1：键函数帧方法实参
  { name: 'kf_map_group', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'ab-12 cd-34'))${NL}print([m.group(2) for m in ms])${NL}print(list(map(lambda m: m.group(2), ms)))` },
  { name: 'kf_sorted_group', code: `import re${NL}ms = list(re.finditer(r'([a-z]+)-([0-9]+)', 'b2 a1'))${NL}print([m.group(1) for m in sorted(ms, key=lambda m: m.group(1))])` },
  { name: 'kf_map_split', code: `ws = ['a,b', 'c,d']${NL}print(list(map(lambda s: s.split(','), ws)))` },
  { name: 'kf_map_replace', code: `ws = ['aXb', 'cXd']${NL}print(list(map(lambda s: s.replace('X', '-'), ws)))` },
  { name: 'kf_map_find', code: `ws = ['hello', 'world']${NL}print(list(map(lambda s: s.find('l'), ws)))` },
  { name: 'kf_map_join2', code: `pairs = [('a', 'b')]${NL}print(list(map(lambda p: '-'.join(p), pairs)))` },
  { name: 'kf_map_method_noarg', code: `ws = [' a ', ' b ']${NL}print(list(map(lambda s: s.strip().upper(), ws)))` },
  // 类 2：f-string __format__
  { name: 'fs_obj_custom', code: `class P:${NL}    def __format__(self, spec):${NL}        return '[' + spec + ']'${NL}p = P()${NL}print(f'{p:x}')` },
  { name: 'fs_obj_custom_empty', code: `class P:${NL}    def __format__(self, spec):${NL}        return '[' + spec + ']'${NL}p = P()${NL}print(f'{p}')` },
  { name: 'fs_obj_custom_width', code: `class P:${NL}    def __format__(self, spec):${NL}        return '<' + spec + '>'${NL}p = P()${NL}print(f'{p:>8}')` },
  { name: 'format_call_custom', code: `class P:${NL}    def __format__(self, spec):${NL}        return '[' + spec + ']'${NL}p = P()${NL}print('{0:x}'.format(p))` },
  { name: 'format_str_a_err', code: `print(format('ab', 'a'))`, expectError: true },
  // 类 3：float 溢出 / inf
  { name: 'float_overflow', code: `print(float('1e309'))` },
  { name: 'float_overflow_arith', code: `x = float('1e309')${NL}print(x + 1)` },
  { name: 'float_underflow', code: `print(float('1e-320'))` },
  // 类 4：括号根赋值
  { name: 'bracket_attr_set', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns = [N(1)]${NL}def f():${NL}    return ns[0]${NL}(f()).v = 3${NL}print(ns[0].v)` },
  { name: 'bracket_attr_aug', code: `class N:${NL}    def __init__(self, v):${NL}        self.v = v${NL}ns = [N(1)]${NL}def f():${NL}    return ns[0]${NL}(f()).v += 5${NL}print(ns[0].v)` },
  { name: 'bracket_sub_set', code: `d = {'k': 1}${NL}def f():${NL}    return d${NL}(f())['k'] = 9${NL}print(d['k'])` },
  { name: 'paren_plain_set', code: `x = 1${NL}(x) = 5${NL}print(x)` },
];
fs.writeFileSync('_work/v41/_probe_a236.json', JSON.stringify(a, null, 1));
console.log('ok', a.length);
