// Exception-object combinations. Every case must run successfully in CPython.
// No expectError, traceback, chaining, output normalization, or fallback results.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const R = String.raw;
const cases = [];
const add = (name, tag, code) => cases.push({ name, tag, code });

// KeyError's one-argument str uses repr(argument); two or more use str(args).
const argumentsMatrix = [
  ['zero', ''],
  ['single_text', '"missing"'],
  ['multiple', '"bad", 2.5, None'],
  ['number', '-7'],
  ['none', 'None'],
  ['empty_text', '""'],
  ['tuple', '("x", 7)'],
  ['list', '["x", 7, None]'],
  ['dict', '{"x": 7, "empty": ""}'],
];
for (const cls of ['Exception', 'ValueError', 'KeyError']) {
  for (const [suffix, args] of argumentsMatrix) {
    add(`${cls.toLowerCase()}_${suffix}`, 'construction', `e = ${cls}(${args})
print("args", e.args)
print("length", len(e.args))
print("str", str(e))
print("repr", repr(e))`);
  }
}

add('keyerror_quoted_and_escaped_text', 'keyerror-special', R`for text in ["can't", 'say "hi"', "both'\"", "a\nb\tc\\d"]:
    e = KeyError(text)
    print("raw", e.args[0] == text)
    print("str", str(e))
    print("repr_str", repr(str(e)))
    print("repr", repr(e))`);

add('keyerror_one_tuple_versus_many_args', 'keyerror-special', R`one = KeyError(("x",))
many = KeyError("x", "y")
nested = KeyError(("x", "y"), "z")
print("one", one.args, str(one), repr(one))
print("many", many.args, str(many), repr(many))
print("nested", nested.args, str(nested), repr(nested))
print("single_rule", str(one) == repr(one.args[0]))
print("multiple_rule", str(many) == str(many.args))`);

add('args_index_and_slice', 'args-flow', R`for e in [Exception("a", 4, None), ValueError("b", 5, None), KeyError("c", 6, None)]:
    print(e.args[0], e.args[1] + 10, e.args[-1] is None)
    print(e.args[:2], e.args[1:], e.args[::-1])`);

add('args_unpack_raw_values', 'args-flow', R`e = ValueError(7, None, ("x", 2))
number, absent, pair = e.args
print(number + 1, absent is None, pair[1])
key, values = KeyError("row", [3, 4]).args
print(key, values[0] + values[1])
empty = Exception().args
print(empty == ())`);

add('args_pass_and_star_call', 'args-flow', R`def consume_args(args):
    return args[0] + args[1], args[2] is None
def consume_values(a, b, c):
    return a * b, c is None
e = Exception(3, 4, None)
print(consume_args(e.args))
print(consume_values(*e.args))
print(consume_values(*ValueError(5, 6, None).args))`);

add('args_return_from_function', 'args-flow', R`def extract(e):
    return e.args
def make_args():
    return KeyError("field", {"id": 8}).args
args = extract(ValueError(4, None))
print(args, args[0] + 1, args[1] is None)
key, data = make_args()
print(key, data["id"])
print(extract(Exception()) == ())`);

add('exception_return_and_forward', 'args-flow', R`def build(label, value):
    return KeyError(label, value)
def forward(e):
    return e
e = build("id", 7)
f = forward(e)
print(f is e, f.args)
print(str(f), repr(f))
print(build("blank", None).args[1] is None)`);

add('args_and_exceptions_in_containers', 'args-flow', R`e = ValueError("bad", 8)
k = KeyError("missing")
items = [e, k]
record = {"error": e, "args": k.args}
pair = (e.args, k.args)
print(items)
print(record)
print(pair)
print(items[0] is record["error"], record["args"][0])
print(str(items[1]), repr(record["error"]))`);

add('args_keep_mutable_payload_identity', 'args-flow', R`values = [1, 2]
record = {"count": 3}
e = Exception(values, record)
k = KeyError(record)
print(e.args[0] is values, e.args[1] is record, k.args[0] is record)
values.append(4)
record["count"] = 9
print(e.args, str(e), repr(e))
print(k.args, str(k), repr(k))`);

add('str_repr_through_functions', 'formatting', R`def render(e):
    return str(e), repr(e)
for e in [Exception(), ValueError(""), KeyError("x"), KeyError("x", 2)]:
    text, representation = render(e)
    print("render", text, representation)
    print("nested", repr(text), str((e,)))`);

add('fstring_default_s_r', 'formatting', R`for e in [Exception(), ValueError("bad", 3), KeyError(""), KeyError("x"), KeyError("x", 3)]:
    print(f"default=<{e}> s=<{e!s}> r=<{e!r}>")
    print(f"args=<{e.args!r}>")`);

add('format_builtin_and_string_method', 'formatting', R`for e in [Exception(), ValueError("bad"), KeyError("x"), KeyError("x", 2)]:
    print("builtin", "<" + format(e, "") + ">")
    print("default=<{0}> s=<{0!s}> r=<{0!r}>".format(e))
    print("padded=<{0!s:>12}> repr=<{0!r:<24}>".format(e))`);

add('percent_s_r_and_mapping', 'formatting', R`for e in [Exception(), ValueError(7, None), KeyError("x"), KeyError("x", 2)]:
    print("s=<%s> r=<%r>" % (e, e))
    print("single=<%s>" % e)
    print("mapping=<%(error)s> repr=<%(error)r>" % {"error": e})`);

add('join_converted_exceptions_and_args', 'formatting', R`errors = [Exception(), ValueError("bad", 2), KeyError("x"), KeyError("x", "y")]
texts = []
representations = []
for e in errors:
    texts.append(str(e))
    representations.append(repr(e))
print("strings", "|".join(texts))
print("representations", ";".join(representations))
print("args", ":".join(str(x) for x in ValueError(3, None, "").args))`);

add('raise_constructed_three_types', 'raise-catch', R`try:
    raise Exception()
except Exception as e:
    print("exception", e.args, str(e), repr(e))
try:
    raise ValueError("bad", 7)
except ValueError as e:
    print("value", e.args, str(e), repr(e))
try:
    raise KeyError("missing")
except KeyError as e:
    print("key", e.args, str(e), repr(e))`);

add('raise_existing_instance_identity', 'raise-catch', R`payload = [1, 2]
original = KeyError(payload)
try:
    raise original
except KeyError as caught:
    print(caught is original, caught.args[0] is payload)
    payload.append(3)
    print(caught.args, str(caught), repr(caught))
print(original.args, str(original))`);

add('raise_class_zero_args', 'raise-catch', R`try:
    raise Exception
except Exception as e:
    print("exception", e.args, repr(e), "<" + str(e) + ">")
try:
    raise ValueError
except ValueError as e:
    print("value", e.args, repr(e), "<" + str(e) + ">")
try:
    raise KeyError
except KeyError as e:
    print("key", e.args, repr(e), "<" + str(e) + ">")`);

add('bare_raise_keeps_instance', 'raise-catch', R`original = ValueError("bad", 6)
try:
    try:
        raise original
    except ValueError as inner:
        print("inner", inner is original, inner.args)
        raise
except ValueError as outer:
    print("outer", outer is original, outer.args, str(outer), repr(outer))`);

add('nested_except_restores_outer_bare_raise', 'raise-catch', R`original = KeyError("outer")
try:
    try:
        raise original
    except KeyError as outer:
        print("outer_before", outer.args, str(outer))
        try:
            raise ValueError("inner", 2)
        except ValueError as inner:
            print("inner", inner.args, str(inner), repr(inner))
        print("outer_after", outer is original, outer.args)
        raise
except KeyError as final:
    print("reraised", final is original, final.args, str(final), repr(final))`);

add('raise_from_function_preserves_raw_args', 'raise-catch', R`def fail(e):
    raise e
original = Exception(None, {"n": 3})
try:
    fail(original)
except Exception as e:
    print(e is original, e.args[0] is None, e.args[1]["n"])
    print(str(e), repr(e))`);

add('custom_exception_inherited_constructor', 'custom-exception', R`class AppError(Exception):
    pass
for e in [AppError(), AppError("bad"), AppError("bad", 4, None)]:
    print(e.args, str(e), repr(e))
try:
    raise AppError("raised", 5)
except Exception as e:
    print("caught_base", e.args, str(e), repr(e))`);

add('custom_valueerror_multilevel_inheritance', 'custom-exception', R`class InputError(ValueError):
    pass
class FieldError(InputError):
    pass
original = FieldError("age", 7)
print(original.args, str(original), repr(original))
try:
    raise original
except ValueError as e:
    print(e is original, e.args, str(e), repr(e))`);

add('custom_keyerror_inherits_str_rule', 'custom-exception', R`class MissingKey(KeyError):
    pass
for e in [MissingKey(), MissingKey("x"), MissingKey(("x",)), MissingKey("x", 2)]:
    print(e.args, "<" + str(e) + ">", repr(e))
try:
    raise MissingKey("field")
except KeyError as e:
    print("caught_base", e.args, str(e), repr(e))`);

add('custom_exception_explicit_base_init', 'custom-exception', R`class CodedError(Exception):
    def __init__(self, number, data):
        self.number = number
        Exception.__init__(self, number, data, None)
payload = {"field": "age"}
original = CodedError(7, payload)
print(original.number, original.args, original.args[1] is payload)
print(str(original), repr(original))
try:
    raise original
except CodedError as e:
    print(e is original, e.number, e.args, str(e), repr(e))`);

add('custom_keyerror_explicit_exception_init', 'custom-exception', R`class MissingField(KeyError):
    def __init__(self, field):
        self.field = field
        Exception.__init__(self, field)
e = MissingField("item")
print(e.field, e.args, str(e), repr(e))
Exception.__init__(e, "item", 8)
print(e.field, e.args, str(e), repr(e))`);

add('exception_init_reinitializes_builtin_args', 'args-modification', R`for e in [Exception("old"), ValueError("old"), KeyError("old")]:
    print("before", e.args, str(e), repr(e))
    result = Exception.__init__(e, "new", 8, None)
    print("result", result is None)
    print("after", e.args, str(e), repr(e))
    Exception.__init__(e)
    print("empty", e.args, "<" + str(e) + ">", repr(e))`);

add('args_replace_tuple_three_types', 'args-modification', R`for e in [Exception("old"), ValueError("old"), KeyError("old")]:
    old = e.args
    e.args = (7, None, {"x": 2})
    print("old", old)
    print("new", e.args, e.args[0] + 1, e.args[1] is None)
    print(str(e), repr(e))`);

add('keyerror_args_change_arity', 'args-modification', R`e = KeyError("start")
for args in [(), ("",), ("x",), ("x", "y"), (("x",),), (None,), (7,)]:
    e.args = args
    print("args", e.args)
    print("str", "<" + str(e) + ">")
    print("repr", repr(e))
    if len(args) == 1:
        print("single_rule", str(e) == repr(args[0]))
    elif len(args) > 1:
        print("multiple_rule", str(e) == str(args))`);

add('args_list_assignment_copies_outer_iterable', 'args-modification', R`payload = [2]
source = ["x", payload]
e = ValueError("old")
e.args = source
print(e.args, e.args == ("x", payload), e.args[1] is payload)
source.append(9)
source[0] = "changed"
payload.append(3)
print(e.args, str(e), repr(e))
k = KeyError()
k.args = ["only"]
print(k.args, str(k), repr(k))`);

add('args_string_assignment_iterates_characters', 'args-modification', R`e = Exception("old")
e.args = "ab"
print(e.args, str(e), repr(e))
k = KeyError("old")
k.args = "x"
print(k.args, str(k), repr(k))
k.args = "xy"
print(k.args, str(k), repr(k))
k.args = ""
print(k.args, "<" + str(k) + ">", repr(k))`);

add('args_augmented_assignment', 'args-modification', R`e = ValueError(3)
old = e.args
e.args += (None, "tail")
print(old, e.args, str(e), repr(e))
k = KeyError("x")
print("single", str(k))
k.args += ("y",)
print("multiple", k.args, str(k), repr(k))`);

add('args_modified_before_raise', 'args-modification', R`original = KeyError("old")
original.args = ("new", 4)
try:
    raise original
except KeyError as e:
    print(e is original, e.args, str(e), repr(e))
    e.args = ("single",)
    print("inside", e.args, str(e), repr(e))
print("outside", original.args, str(original), repr(original))`);

add('args_modified_in_except_then_bare_raise', 'args-modification', R`original = ValueError("old", 1)
old_args = original.args
try:
    try:
        raise original
    except ValueError as e:
        e.args = (None, [2, 3])
        print("changed", e.args, str(e), repr(e))
        raise
except ValueError as again:
    print("same", again is original, again.args[0] is None)
    print("reraised", again.args, str(again), repr(again))
print("saved", old_args)`);

if (cases.length !== 60 || new Set(cases.map(c => c.name)).size !== cases.length) {
  throw new Error('Expected exactly 60 uniquely named cases');
}
for (const c of cases) {
  if (typeof c.code !== 'string' || !c.code.trim() || c.expectError) {
    throw new Error(`Invalid case: ${c.name}`);
  }
}
const output = new URL('./_exc232.json', import.meta.url);
fs.writeFileSync(output, JSON.stringify(cases, null, 2) + '\n');
const python = process.env.PYEXE || 'python';
const invalid = [];
for (const c of cases) {
  try {
    execFileSync(python, ['-I', '-B', '-c', c.code], {
      encoding: 'utf8',
      timeout: 20000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error) {
    invalid.push(c.name);
    console.error(`${c.name}: ${String(error.stderr || error.message).trim()}`);
  }
}
if (invalid.length) {
  throw new Error(`CPython failed ${invalid.length}/${cases.length}: ${invalid.join(', ')}`);
}
console.log(`Written ${cases.length} cases; CPython ${cases.length}/${cases.length} successful: ${output.pathname}`);
