values = [1]
record = {"n": 2}
old_values = values
old_record = record
original = ValueError(values, record)
key_error = KeyError(values)
values = ["new"]
record = {"n": 99}
print("old_identity", original.args[0] is old_values, original.args[1] is old_record, key_error.args[0] is old_values)
print("not_rebound", original.args[0] is values, original.args[1] is record)
print("old", original.args, str(original), repr(original))
print("new", values, record)
old_values.append(3)
old_record["n"] = 4
print("old_alias_mutation", original.args, str(original), repr(original))
print("old_key", key_error.args, str(key_error), repr(key_error))
print("new_unchanged", values, record)
