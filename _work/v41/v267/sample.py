def mat_mul(A, B):
    """Multiply two matrices (list of lists)"""
    rows_a, cols_a = len(A), len(A[0])
    rows_b, cols_b = len(B), len(B[0])
    assert cols_a == rows_b, "Shape mismatch"
    result = [[0] * cols_b for _ in range(rows_a)]
    for i in range(rows_a):
        for k in range(cols_a):
            if A[i][k] == 0:
                continue
            for j in range(cols_b):
                result[i][j] += A[i][k] * B[k][j]
    return result


def mat_transpose(A):
    return [list(row) for row in zip(*A)]


def print_mat(M):
    for row in M:
        print("  " + " ".join("{:4d}".format(v) for v in row))


if __name__ == "__main__":
    A = [[1, 2, 3],
         [4, 5, 6]]
    B = [[7, 8],
         [9, 10],
         [11, 12]]
    print("A * B =")
    print_mat(mat_mul(A, B))
    print("\nA^T =")
    print_mat(mat_transpose(A))
