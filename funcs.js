function formatTime(seconds, short=true) {
    const s = short, j = clang===1;
    const Y = s ? "y" : j ? "年" : "years, ", D = s ? "d" : j ? "日" : "day", H = s ? "h" : j ? "時間" : "hr ", M = s ? "m" : j ? "分" : "min ", S = s ? "s" : j ? "秒" : "sec";
    if (seconds>31536e4) return `${Math.floor(seconds / 31536e3)}${Y}${Math.floor((seconds % 31536e3) / 86400)}${D}${!j?((seconds % 31536e3)/86400)>2?"s":"":""}`;
    if (seconds>864e3) return `${Math.floor(seconds / 86400)}${D}${j?"":"s "}${String(Math.floor((seconds % 86400) / 3600)).padStart(2, '0')}${H}`;
    if (seconds>36e3) return `${Math.floor(seconds / 3600)}${H}${String(Math.floor((seconds/60) % 60)).padStart(2, '0')}${M}`;
    if (seconds>600) return `${Math.floor(seconds / 60)}${M}${String(Math.floor(seconds % 60)).padStart(2, '0')}${S}`;
    if (seconds>10) return `${Math.floor(seconds)}.${String(Math.floor((seconds * 100)%100)).padStart(2, '0')}${S}`;
    return `${Math.floor(seconds*1000)}ms`;
}


function notatVal(val, dig=0) {
    if (val<1e4) return val.toFixed(dig);
    const sufi = ['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc','Ud','Dd','Td','Qad','Qid','Sxd','Spd','Ocd','Nod','Vg','Uvg','Dvg','Tvg','Qag','Qig','Sxg','Spg'];
    const exp = Math.floor(Math.log10(val)/3);
    const num = val / (1000**exp);
    return num.toFixed(2) + sufi[exp];
}

//Random name
function generateRandomName() {
    const j = clang===1;
    const key1 = !j? [
            "Cynical", "Funny", "Foolish", "Ergonomic", "Introvert", "Extrovert", "Omnivert", "Original", "Replicated", "Perfect",
            "Immortal", "Epic", "Delusional", "Apeirophobic", "Random", "Suspicious", "Common", "Ancestral", "Geometric", "Cooked",
            "Distorted", "Baloney", "Binary", "Censored", "Schrödinger's", "Bad", "Heartless", "Golden", "Inexistent", "Japanese-made",
            "Lazy", "Intimidating", "Yandere", "A bucket of", "M0R1", "M6R5", "Compiled", "Clueless", "Sound-speed", "Sfw", 
            "Bugged", "Unclear", "Attic", "Vengeful", "Endangered", "Rugged", "Wild"
        ] : [
            "冷笑系", "面白い", "愚かな", "人間工学に基づいた", "内向的な", "外向的な", "両向的な", "独創的な", "複製体", "完全な",
            "不滅の", "すごい", "妄想の", "無限恐怖症の", "どこかの", "疑わしい", "ありふれた", "先祖代々の", "幾何学的な", "調理された", 
            "音割れ", "でたらめな", "バイナリ形式の", "検閲済みの", "シュレーディンガーの", "悪い", "心ない", "金の", "存在しない", "日本産の",
            "怠けた", "威圧的な", "ヤンデレな", "バケツ1杯の", "無凸餅の", "完凸", "コンパイルされた", "何も知らない", "音速の", "健全な",
            "バグった", "滑舌の悪い", "屋根裏の", "復讐心に燃える", "絶滅危惧種の", "無骨な", "野生の"
        ];
    const key2 = !j? [
            "Steve", "Alex", "Michael", "Mary", "John", "Sato", "Tanaka", "Suzuki", "Takahashi", "Ito",
            "Marmot", "Cat", "Dog", "Shark", "Hornet", "Arthropods", "Polar bear", "Pig", "Goat", "Cockroach", 
            "Hydrogen", "Sodium", "Xenon", "Zinc", "Plutonium", "Trans fatty acids", "Hydrochloric acid", "TNT", "Glucose",
            "Imposter", "Mirage", "Apple", "Landmine", "Fried rice", "Tomato", "Potato", "Lemon", "Tofu", "Almond",
            "Pull request", "Vibe coding", "JavaScript", "php", "Python", "Linux", "Commit", "Conflict", "404 Error", "User Interface",
            "Appraiser", "Traveler", "Rover", "Cb", "Hero", "Illusionist", "Saboteur", "Angel", "Idiot", "Barbarian",
            "Parallel isotope", "Dopamine brat", "Gunma Empire", "SCP", "Debater", "Commander", "Logician", "Architect", "Advocate", "Mediator", 
            "Protagonist", "Campaigner", "Logistician", "Defender", "Executive", "Consul", "Virtuoso", "Adventurer", "Entrepreneur", "Entertainer", 
            "Proxy", "Trailblazer"
        ] : [
            "スティーブ", "アレックス", "マイケル", "メアリー", "ジョン", "サトウ", "スズキ", "タナカ", "タカハシ", "イトウ", 
            "マーモット", "猫", "犬", "サメ", "雀蜂", "節足動物", "ホッキョクグマ", "豚", "山羊", "ゴキブリ", 
            "水素", "ナトリウム", "キセノン", "亜鉛", "プルトニウム", "トランス脂肪酸", "塩化水素", "トリニトロトルエン", "ぶどう糖",
            "詐欺師", "蜃気楼", "林檎", "地雷", "炒飯", "トマト", "ポテト", "檸檬", "豆腐", "アーモンド",
            "プルリクエスト", "バイブコーディング", "JavaScript", "php", "Python", "Linux", "コミット", "コンフリクト", "404エラー", "ユーザーインターフェース",
            "鑑定士", "旅人", "漂泊者", "勇者", "Cb", "イリュージョナー", "破壊工作員", "天使", "大馬鹿者", "野蛮人",
            "並行同位体", "ドパガキ", "グンマー帝国", "SCP", "討論者", "司令官", "論理学者", "建築家", "提唱者", "調停者", 
            "主人公", "運動家", "管理人", "守護者", "上司", "領事", "巨匠", "冒険家", "起業家", "エンターテイナー",
            "プロキシ", "開拓者"
        ];
    let result = '';
    result += key1[Math.floor(Math.random() * key1.length)];
    if (!j) result += " ";
    result += key2[Math.floor(Math.random() * key2.length)];
    if (result.includes("ユーザーインターフェース") && result.length>18) result = result.replace("ユーザーインターフェース", "UI")
    return result;
}