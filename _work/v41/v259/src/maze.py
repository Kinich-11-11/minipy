def generate_maze(rows, cols, seed):
    """Generate a maze using randomized DFS (recursive backtracker)."""
    # Each cell has 4 wall flags: [N, E, S, W] -- True means wall
    walls = [[[True] * 4 for _ in range(cols)] for _ in range(rows)]
    visited = [[False] * cols for _ in range(rows)]

    # Deterministic pseudo-random
    state = seed

    def rand():
        nonlocal state
        state = (state * 1103515245 + 12345) & 0x7FFFFFFF
        return state

    stack = [(0, 0)]
    visited[0][0] = True
    directions = [(-1, 0, 0, 2), (0, 1, 1, 3), (1, 0, 2, 0), (0, -1, 3, 1)]

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
        idx = rand() % len(neighbors)
        nr, nc, w1, w2 = neighbors[idx]
        walls[r][c][w1] = False
        walls[nr][nc][w2] = False
        visited[nr][nc] = True
        stack.append((nr, nc))

    return walls


def solve_maze(walls, start, goal, rows, cols):
    """BFS solving."""
    from collections import deque
    q = deque([start])
    prev = {start: None}
    while q:
        r, c = q.popleft()
        if (r, c) == goal:
            path = []
            cur = (r, c)
            while cur is not None:
                path.append(cur)
                cur = prev[cur]
            path.reverse()
            return path
        for dr, dc, wi in [(-1, 0, 0), (0, 1, 1), (1, 0, 2), (0, -1, 3)]:
            if walls[r][c][wi]:
                continue
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in prev:
                prev[(nr, nc)] = (r, c)
                q.append((nr, nc))
    return None


def render(walls, rows, cols, path=None):
    path_set = set(path) if path else set()
    lines = []
    # Top border
    top = "+"
    for _ in range(cols):
        top += "---+"
    lines.append(top)

    for r in range(rows):
        line = "|"
        bottom = "+"
        for c in range(cols):
            if (r, c) in path_set:
                cell = " * "
            else:
                cell = "   "
            line += cell
            line += "|" if walls[r][c][1] else " "
            bottom += "---+" if walls[r][c][2] else "   +"
        lines.append(line)
        lines.append(bottom)
    return "\n".join(lines)


if __name__ == "__main__":
    rows, cols = 8, 12
    walls = generate_maze(rows, cols, seed=42)
    path = solve_maze(walls, (0, 0), (rows - 1, cols - 1), rows, cols)
    print("Path length:", len(path))
    print(render(walls, rows, cols, path))
