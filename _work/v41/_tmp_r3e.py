import datetime
try:
    datetime.date(2023, 13, 1)
except ValueError as e:
    print("month" in str(e))
