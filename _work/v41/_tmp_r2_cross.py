import re
lines = ["err: disk", "ok: net", "err: mem"]
errs = []
for ln in lines:
    m = re.match(r"err: (.+)", ln)
    if m:
        errs.append(m.group(1))
print(len(errs), errs)
