import csv
import json

input_csv = r"C:\Users\daich\Downloads\TypingGame - probs.csv"
output_json = r"C:\Apps\Project\tc\Typing\typingTxt.json"

result = []

with open(input_csv, "r", encoding="utf-8-sig") as csvfile:
    next(csvfile)
    reader = csv.DictReader(csvfile)

    for row in reader:
        result.append({
            "Id": int(row["Id"]),
            "Lvl": int(row["Lvl"]),
            "Text": row["Text"],
            "Japanese": row["Japanese"],
            "Len": int(row["Len"])
        })

with open(output_json, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Saved to {output_json}")