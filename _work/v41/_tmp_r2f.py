import datetime
def is_future(d):
    return d > datetime.date(2024, 1, 1)
print(is_future(datetime.date(2024, 6, 1)), is_future(datetime.date(2023, 6, 1)))
