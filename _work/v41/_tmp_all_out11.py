def match(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    st = []
    for ch in s:
        if ch in '([{':
            st.append(ch)
        elif ch in pairs:
            if not st or st.pop() != pairs[ch]:
                return False
    return len(st) == 0
print(match('{[()]}'), match('(]'), match('([)]'), match('((()))'), match(''))
