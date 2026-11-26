"""Repaired versions of the five pasted Python examples.

The examples are kept independent so each one can be copied into MiniPy on its own.
"""

from __future__ import annotations

import math
import operator
import re
from collections import deque


# ---------------------------------------------------------------------------
# 1. Matrix operations


def _matrix_shape(matrix, name):
    if not isinstance(matrix, (list, tuple)):
        raise TypeError(f"{name} must be a list or tuple of rows")
    if not matrix:
        return 0, 0
    if not all(isinstance(row, (list, tuple)) for row in matrix):
        raise TypeError(f"{name} must contain list/tuple rows")
    cols = len(matrix[0])
    if any(len(row) != cols for row in matrix):
        raise ValueError(f"{name} must be rectangular")
    return len(matrix), cols


def mat_mul(A, B):
    """Multiply two rectangular matrices represented by lists of lists."""
    rows_a, cols_a = _matrix_shape(A, "A")
    rows_b, cols_b = _matrix_shape(B, "B")
    if cols_a != rows_b:
        raise ValueError(
            f"Shape mismatch: A is {rows_a}x{cols_a}, B is {rows_b}x{cols_b}"
        )
    if rows_a == 0:
        return []
    result = [[0] * cols_b for _ in range(rows_a)]
    for i in range(rows_a):
        for k in range(cols_a):
            value = A[i][k]
            if value == 0:
                continue
            for j in range(cols_b):
                result[i][j] += value * B[k][j]
    return result


def mat_transpose(A):
    """Return the transpose of a rectangular matrix."""
    _matrix_shape(A, "A")
    return [list(row) for row in zip(*A)]


def print_mat(M):
    """Print a matrix without assuming that every value is an integer."""
    for row in M:
        print("  " + " ".join(f"{value!s:>4}" for value in row))


# ---------------------------------------------------------------------------
# 2. Sieve of Eratosthenes


def sieve(n):
    """Return all prime integers less than or equal to *n*."""
    try:
        n = operator.index(n)
    except TypeError as exc:
        raise TypeError("n must be an integer") from exc
    if n < 2:
        return []
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    for i in range(2, math.isqrt(n) + 1):
        if is_prime[i]:
            is_prime[i * i : n + 1 : i] = [False] * (((n - i * i) // i) + 1)
    return [i for i, prime in enumerate(is_prime) if prime]


# ---------------------------------------------------------------------------
# 3. Maze generation, solving and rendering


def generate_maze(rows, cols, seed):
    """Generate a deterministic perfect maze using randomized DFS."""
    if not isinstance(rows, int) or not isinstance(cols, int):
        raise TypeError("rows and cols must be integers")
    if rows <= 0 or cols <= 0:
        raise ValueError("rows and cols must be positive")

    # Each cell has four wall flags: [N, E, S, W]; True means wall.
    walls = [[[True] * 4 for _ in range(cols)] for _ in range(rows)]
    visited = [[False] * cols for _ in range(rows)]
    state = operator.index(seed) & 0x7FFFFFFF

    def rand():
        nonlocal state
        state = (state * 1103515245 + 12345) & 0x7FFFFFFF
        return state

    stack = [(0, 0)]
    visited[0][0] = True
    directions = [
        (-1, 0, 0, 2),
        (0, 1, 1, 3),
        (1, 0, 2, 0),
        (0, -1, 3, 1),
    ]

    while stack:
        r, c = stack[-1]
        neighbors = []
        for dr, dc, w1, w2 in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and not visited[nr][nc]:
                neighbors.append((nr, nc, w1, w2))
        if not neighbors:
            stack.pop()
            continue
        nr, nc, w1, w2 = neighbors[rand() % len(neighbors)]
        walls[r][c][w1] = False
        walls[nr][nc][w2] = False
        visited[nr][nc] = True
        stack.append((nr, nc))
    return walls


def _check_maze_dimensions(walls, rows, cols):
    if not isinstance(rows, int) or not isinstance(cols, int):
        raise TypeError("rows and cols must be integers")
    if rows <= 0 or cols <= 0:
        raise ValueError("rows and cols must be positive")
    if len(walls) != rows or any(len(row) != cols for row in walls):
        raise ValueError("walls dimensions do not match rows and cols")
    if any(len(cell) != 4 for row in walls for cell in row):
        raise ValueError("each maze cell must contain four wall flags")


def _check_position(position, rows, cols, name):
    if (
        not isinstance(position, tuple)
        or len(position) != 2
        or not all(isinstance(value, int) for value in position)
    ):
        raise TypeError(f"{name} must be a (row, column) tuple")
    r, c = position
    if not (0 <= r < rows and 0 <= c < cols):
        raise ValueError(f"{name} is outside the maze")


def solve_maze(walls, start, goal, rows, cols):
    """Return the shortest path as a list of cells, or None when unreachable."""
    _check_maze_dimensions(walls, rows, cols)
    _check_position(start, rows, cols, "start")
    _check_position(goal, rows, cols, "goal")

    queue = deque([start])
    prev = {start: None}
    directions = [(-1, 0, 0), (0, 1, 1), (1, 0, 2), (0, -1, 3)]
    while queue:
        r, c = queue.popleft()
        if (r, c) == goal:
            path = []
            current = goal
            while current is not None:
                path.append(current)
                current = prev[current]
            return list(reversed(path))
        for dr, dc, wall_index in directions:
            if walls[r][c][wall_index]:
                continue
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in prev:
                prev[(nr, nc)] = (r, c)
                queue.append((nr, nc))
    return None


def render(walls, rows, cols, path=None):
    """Render a maze as ASCII art."""
    _check_maze_dimensions(walls, rows, cols)
    path_set = set(path or ())
    for position in path_set:
        _check_position(position, rows, cols, "path position")

    lines = ["+" + "---+" * cols]
    for r in range(rows):
        line = "|"
        bottom = "+"
        for c in range(cols):
            line += " * " if (r, c) in path_set else "   "
            line += "|" if walls[r][c][1] else " "
            bottom += "---+" if walls[r][c][2] else "   +"
        lines.extend((line, bottom))
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 4. Direct recursive-descent expression evaluator

_NUMBER_RE = re.compile(r"(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?")


class Lexer:
    def __init__(self, text):
        self.text = text
        self.pos = 0

    def peek(self):
        while self.pos < len(self.text) and self.text[self.pos].isspace():
            self.pos += 1
        return self.text[self.pos] if self.pos < len(self.text) else ""

    def next(self):
        ch = self.peek()
        if ch:
            self.pos += 1
        return ch

    def next_number(self):
        self.peek()
        match = _NUMBER_RE.match(self.text, self.pos)
        if not match:
            raise SyntaxError(f"Expected a number at position {self.pos}")
        self.pos = match.end()
        return float(match.group())


class Parser:
    """Recursive descent with standard precedence and right-associative power."""

    def __init__(self, text):
        self.lexer = Lexer(text)

    def parse(self):
        result = self.expr()
        if self.lexer.peek():
            raise SyntaxError(f"Unexpected char: {self.lexer.peek()!r}")
        return result

    def expr(self):
        value = self.term()
        while self.lexer.peek() in ("+", "-"):
            op = self.lexer.next()
            right = self.term()
            value = value + right if op == "+" else value - right
        return value

    def term(self):
        value = self.unary()
        while self.lexer.peek() in ("*", "/"):
            op = self.lexer.next()
            right = self.unary()
            if op == "*":
                value *= right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                value /= right
        return value

    def power(self):
        value = self.primary()
        if self.lexer.peek() == "^":
            self.lexer.next()
            value **= self.unary()
        return value

    def unary(self):
        ch = self.lexer.peek()
        if ch == "-":
            self.lexer.next()
            return -self.unary()
        if ch == "+":
            self.lexer.next()
            return self.unary()
        return self.power()

    def primary(self):
        ch = self.lexer.peek()
        if ch == "(":
            self.lexer.next()
            value = self.expr()
            if self.lexer.peek() != ")":
                raise SyntaxError("Missing )")
            self.lexer.next()
            return value
        return self.lexer.next_number()


def evaluate(text):
    return Parser(text).parse()


# ---------------------------------------------------------------------------
# 5. Tokenize -> AST -> evaluate expression evaluator


class Token:
    def __init__(self, kind, value):
        self.kind = kind
        self.value = value

    def __repr__(self):
        return f"Token({self.kind!r}, {self.value!r})"


def tokenize(src):
    tokens = []
    i = 0
    while i < len(src):
        ch = src[i]
        if ch.isspace():
            i += 1
            continue
        if ch.isdigit() or ch == ".":
            match = _NUMBER_RE.match(src, i)
            if not match:
                raise SyntaxError(f"Invalid number at position {i}")
            i = match.end()
            tokens.append(Token("NUMBER", float(match.group())))
            continue
        if ch in "+-*/()^":
            tokens.append(Token("OP", ch))
            i += 1
            continue
        raise SyntaxError(f"Unknown char {ch!r}")
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
            return pad + f"Num({self.value})"
        if self.kind == "neg":
            return pad + "neg\n" + self.left._repr(depth + 1)
        return (
            pad + self.kind + "\n"
            + self.left._repr(depth + 1) + "\n"
            + self.right._repr(depth + 1)
        )


class TokenParser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.i = 0

    def peek(self):
        return self.tokens[self.i]

    def consume(self):
        token = self.tokens[self.i]
        self.i += 1
        return token

    def expect(self, value):
        token = self.consume()
        if token.kind != "OP" or token.value != value:
            raise SyntaxError(f"Expected {value!r}, got {token.value!r}")
        return token

    def parse(self):
        node = self.expr()
        if self.peek().kind != "EOF":
            raise SyntaxError(f"Trailing tokens: {self.peek()!r}")
        return node

    def expr(self):
        node = self.term()
        while self.peek().kind == "OP" and self.peek().value in "+-":
            op = self.consume().value
            node = AstNode(op, node, self.term())
        return node

    def term(self):
        node = self.unary()
        while self.peek().kind == "OP" and self.peek().value in "*/":
            op = self.consume().value
            node = AstNode(op, node, self.unary())
        return node

    def unary(self):
        if self.peek().kind == "OP" and self.peek().value in "+-":
            op = self.consume().value
            node = self.unary()
            return node if op == "+" else AstNode("neg", node)
        return self.power()

    def power(self):
        node = self.primary()
        if self.peek().kind == "OP" and self.peek().value == "^":
            self.consume()
            node = AstNode("^", node, self.unary())
        return node

    def primary(self):
        token = self.peek()
        if token.kind == "NUMBER":
            self.consume()
            return AstNode("NUM", value=token.value)
        if token.kind == "OP" and token.value == "(":
            self.consume()
            node = self.expr()
            self.expect(")")
            return node
        raise SyntaxError(f"Unexpected token: {token!r}")


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
        if right == 0:
            raise ZeroDivisionError("division by zero")
        return left / right
    if node.kind == "^":
        return left ** right
    raise ValueError(f"Unknown node: {node.kind}")


# Convenient name for the AST evaluator.
def evaluate_ast_text(text):
    return evaluate_ast(TokenParser(tokenize(text)).parse())


if __name__ == "__main__":
    A = [[1, 2, 3], [4, 5, 6]]
    B = [[7, 8], [9, 10], [11, 12]]
    print("A * B =")
    print_mat(mat_mul(A, B))
    print("\nPrimes up to 20:", sieve(20))

    rows, cols = 4, 6
    walls = generate_maze(rows, cols, seed=42)
    path = solve_maze(walls, (0, 0), (rows - 1, cols - 1), rows, cols)
    print("\nPath length:", len(path) if path else "unreachable")
    print(render(walls, rows, cols, path))

    for source in ("1 + 2 * 3", "2 ^ 3 ^ 2", "-2 ^ 2", "2 ^ -2"):
        print(f"{source} = {evaluate(source)} = {evaluate_ast_text(source)}")


