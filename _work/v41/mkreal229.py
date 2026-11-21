# mkreal229.py -- patch mkreal.mjs: A/C-class cases move to the doc's section-5 criteria
# (A: transcendental values compared via round(...,8/10) booleans; C: timezone / PRNG
# differences asserted via timezone-invariant fields / reproducibility + shape)
import io

src = io.open('mkreal.mjs', encoding='utf-8', newline='').read()

def rep(old, new, tag):
    global src
    n = src.count(old)
    assert n == 1, tag + ' count=' + str(n)
    src = src.replace(old, new)

# ---- math: sin / cos / tan / identity -> round-compare booleans ----
rep("""  { name: 'sin', code: R`import math
print(math.sin(0))
print(math.sin(math.pi / 2))
print(math.sin(1))` },""",
"""  // A-class: Scratch trig carries 10 decimals, so compare rounded values (doc section 5)
  { name: 'sin', code: R`import math
print(math.sin(0) == 0.0)
print(round(math.sin(math.pi / 2), 10) == 1.0)
print(round(math.sin(1), 10) == 0.8414709848)` },""", 'm.sin')

rep("""  { name: 'cos', code: R`import math
print(math.cos(0))
print(math.cos(math.pi))
print(math.cos(1))` },""",
"""  { name: 'cos', code: R`import math
print(math.cos(0) == 1.0)
print(round(math.cos(math.pi), 10) == -1.0)
print(round(math.cos(1), 10) == 0.5403023059)` },""", 'm.cos')

rep("""  { name: 'tan', code: R`import math
print(math.tan(0))
print(math.tan(1))` },""",
"""  { name: 'tan', code: R`import math
print(math.tan(0) == 0.0)
print(round(math.tan(1), 10) == 1.5574077247)` },""", 'm.tan')

rep("""  { name: 'identity', code: R`import math
print(math.sin(0.5) ** 2 + math.cos(0.5) ** 2)` },""",
"""  { name: 'identity', code: R`import math
print(round(math.sin(0.5) ** 2 + math.cos(0.5) ** 2, 10) == 1.0)` },""", 'm.identity')

io.open('mkreal.mjs', 'w', encoding='utf-8', newline='\n').write(src)
print('math cases patched')
