def knap(ws, vs, cap):
    n = len(ws)
    dp = [[0] * (cap + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for c in range(cap + 1):
            dp[i][c] = dp[i - 1][c]
            if ws[i - 1] <= c:
                take = dp[i - 1][c - ws[i - 1]] + vs[i - 1]
                if take > dp[i][c]:
                    dp[i][c] = take
    return dp[n][cap]
print(knap([2, 3, 4, 5], [3, 4, 5, 6], 8))
print(knap([1, 1, 1], [10, 20, 30], 2))
