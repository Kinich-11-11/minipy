class Lexer:
    def __init__(self, text):
        self.text = text
        self.pos = 0

    def peek(self):
        while self.pos < len(self.text) and self.text[self.pos] == " ":
            self.pos += 1
        if self.pos < len(self.text):
            return self.text[self.pos]
        return ""

    def next(self):
        ch = self.peek()
        if ch:
            self.pos += 1
        return ch

    def next_number(self):
        self.peek()
        start = self.pos
        while self.pos < len(self.text) and (self.text[self.pos].isdigit()
                                             or self.text[self.pos] == "."):
            self.pos += 1
        return float(self.text[start:self.pos])


class Parser:
    """Recursive descent: expr := term (+|- term)*; term := power (*|/ power)*;
       power := unary (^ power)?; unary := (+|-) unary | primary;
       primary := number | '(' expr ')'"""

    def __init__(self, text):
        self.lexer = Lexer(text)

    def parse(self):
        result = self.expr()
        if self.lexer.peek() != "":
            raise SyntaxError("Unexpected char: {!r}".format(self.lexer.peek()))
        return result

    def expr(self):
        val = self.term()
        while self.lexer.peek() in ("+", "-"):
            op = self.lexer.next()
            right = self.term()
            val = val + right if op == "+" else val - right
        return val

    def term(self):
        val = self.power()
        while self.lexer.peek() in ("*", "/"):
            op = self.lexer.next()
            right = self.power()
            if op == "*":
                val *= right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                val /= right
        return val

    def power(self):
        val = self.unary()
        if self.lexer.peek() == "^":
            self.lexer.next()
            exp = self.power()  # right associative
            return val ** exp
        return val

    def unary(self):
        ch = self.lexer.peek()
        if ch == "-":
            self.lexer.next()
            return -self.unary()
        if ch == "+":
            self.lexer.next()
            return self.unary()
        return self.primary()

    def primary(self):
        ch = self.lexer.peek()
        if ch == "(":
            self.lexer.next()
            val = self.expr()
            if self.lexer.peek() != ")":
                raise SyntaxError("Missing )")
            self.lexer.next()
            return val
        return self.lexer.next_number()


def evaluate(text):
    return Parser(text).parse()


if __name__ == "__main__":
    cases = [
        "1 + 2 * 3",
        "(1 + 2) * 3",
        "2 ^ 3 ^ 2",
        "-(3 + 4) * 2",
        "10 / 4",
        "1.5 + 2.25 * 2",
    ]
    for c in cases:
        print("{:<20s} = {}".format(c, evaluate(c)))

    try:
        evaluate("1 / 0")
    except ZeroDivisionError as e:
        print("Error:", e)
