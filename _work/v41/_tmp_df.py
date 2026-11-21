import re, datetime
m = re.search(r"\d{4}-\d{2}-\d{2}", "2024-01-05")
print(datetime.date.fromisoformat(m.group()).isoformat())
