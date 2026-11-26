def sieve(n):
    """Return all primes <= n"""
    if n < 2:
        return []
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    for i in range(2, int(n ** 0.5) + 1):
        if is_prime[i]:
            for j in range(i * i, n + 1, i):
                is_prime[j] = False
    return [i for i in range(n + 1) if is_prime[i]]


if __name__ == "__main__":
    primes = sieve(100)
    print("Primes up to 100 ({} total):".format(len(primes)))
    print(primes)
