import csv, json
from pathlib import Path

input_csv = Path.home() / "Downloads/TypingGame - probs_ja.csv"
output_json = r"typingTxtJa.js"

result = []

with open(input_csv, "r", encoding="utf-8-sig") as csvfile:
    next(csvfile)
    reader = csv.DictReader(csvfile)

    for row in reader:
        result.append({
            "Id": int(row["Id"]),
            "Lvl": int(row["Lvl"]),
            "Text": row["Text"],
            "Reqs": row["Reqs"],
            "Len": int(row["Len"])
        })

with open(output_json, "w", encoding="utf-8") as f:
    f.write("window.typingDataJa = ")
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Saved to {output_json}")