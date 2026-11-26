class Token:
    def __init__(self, kind, value):
        self.kind = kind
        self.value = value

    def __repr__(self):
        return "Token({}, {!r})".format(self.kind, self.value)


def tokenize(src):
    tokens = []
    i = 0
    n = len(src)
    while i < n:
        ch = src[i]
        if ch.isspace():
            i += 1
            continue
        if ch.isdigit() or ch == ".":
            start = i
            while i < n and (src[i].isdigit() or src[i] == "."):
                i += 1
            tokens.append(Token("NUMBER", float(src[start:i])))
            continue
        if ch in "+-*/()^":
            tokens.append(Token("OP", ch))
            i += 1
            continue
        raise SyntaxError("Unknown char {!r}".format(ch))
    tokens.append(Token("EOF", None))
    return tokens


class AstNode:
    def __init__(self, kind, left=None, right=None, value=None):
        self.kind = kind
        self.left = left
        self.right = right
        self.value = value

    def __repr__(self):
        return self._repr(0)

    def _repr(self, depth):
        pad = "  " * depth
        if self.kind == "NUM":
            return pad + "Num({})".format(self.value)
        return pad + self.kind + "\n" + self.left._repr(depth + 1) + "\n" + self.right._repr(depth + 1)


class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.i = 0

    def peek(self):
        return self.tokens[self.i]

    def consume(self):
        tok = self.tokens[self.i]
        self.i += 1
        return tok

    def expect(self, value):
        tok = self.consume()
        if tok.value != value:
            raise SyntaxError("Expected {!r} got {!r}".format(value, tok.value))
        return tok

    def parse(self):
        node = self.expr()
        if self.peek().kind != "EOF":
            raise SyntaxError("Trailing tokens: {!r}".format(self.peek()))
        return node

    def expr(self):
        node = self.term()
        while self.peek().kind == "OP" and self.peek().value in "+-":
            op = self.consume().value
            right = self.term()
            node = AstNode(op, node, right)
        return node

    def term(self):
        node = self.power()
        while self.peek().kind == "OP" and self.peek().value in "*/":
            op = self.consume().value
            right = self.power()
            node = AstNode(op, node, right)
        return node

    def power(self):
        node = self.unary()
        if self.peek().kind == "OP" and self.peek().value == "^":
            self.consume()
            right = self.power()
            node = AstNode("^", node, right)
        return node

    def unary(self):
        if self.peek().kind == "OP" and self.peek().value == "-":
            self.consume()
            inner = self.unary()
            return AstNode("neg", inner)
        return self.primary()

    def primary(self):
        tok = self.peek()
        if tok.kind == "NUMBER":
            self.consume()
            return AstNode("NUM", value=tok.value)
        if tok.kind == "OP" and tok.value == "(":
            self.consume()
            inner = self.expr()
            self.expect(")")
            return inner
        raise SyntaxError("Unexpected token: {!r}".format(tok))


def evaluate_ast(node):
    if node.kind == "NUM":
        return node.value
    if node.kind == "neg":
        return -evaluate_ast(node.left)
    left = evaluate_ast(node.left)
    right = evaluate_ast(node.right)
    if node.kind == "+":
        return left + right
    if node.kind == "-":
        return left - right
    if node.kind == "*":
        return left * right
    if node.kind == "/":
        return left / right
    if node.kind == "^":
        return left ** right
    raise ValueError("Unknown node: {}".format(node.kind))


if __name__ == "__main__":
    src = "-(2 + 3) * 4 ^ 2 + 10 / 5"
    print("Input:", src)
    tokens = tokenize(src)
    print("Tokens:")
    for t in tokens:
        print("  ", t)
    tree = Parser(tokens).parse()
    print("\nAST:")
    print(tree)
    print("\nValue:", evaluate_ast(tree))
