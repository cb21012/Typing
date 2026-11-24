const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const DIFFICULTIES = {
    'training': { id: 0, cps: 0.16, startLevel:  0, consTime: 4.00, scorePow: 1.0 },
    'easy':     { id: 1, cps: 1.00, startLevel:  2, consTime: 3.20, scorePow: 1.1 },
    'normal':   { id: 2, cps: 1.80, startLevel:  5, consTime: 2.40, scorePow: 1.2 },
    'advanced': { id: 3, cps: 3.00, startLevel:  7, consTime: 2.00, scorePow: 1.4 },
    'hard':     { id: 4, cps: 4.50, startLevel:  9, consTime: 1.60, scorePow: 1.7 },
    'expert':   { id: 5, cps: 6.25, startLevel: 11, consTime: 1.30, scorePow: 2.1 },
    'insane':   { id: 6, cps: 9.00, startLevel: 13, consTime: 1.00, scorePow: 2.5 },
    'lunatic':  { id: 7, cps: 13.5, startLevel: 16, consTime: 0.80, scorePow: 3.0 },
};

const inputJapanese = {
    "、": [","], "。": ["."], "ー":["-", "~", "_"],
    "あ": ["a"], "い": ["i", "yi"], "う": ["u", "wu"], "え": ["e"], "お": ["o"],
    "か": ["ka", "ca"], "き": ["ki"], "く": ["ku", "cu", "qu"], "け": ["ke"], "こ": ["ko", "co"],
    "さ": ["sa"], "し": ["shi", "si", "ci"], "す": ["su"], "せ": ["se", "ce"], "そ": ["so"],
    "た": ["ta"], "ち": ["chi", "ti"], "つ": ["tsu", "tu"], "て": ["te"], "と": ["to"],
    "な": ["na"], "に": ["ni"], "ぬ": ["nu"], "ね": ["ne"], "の": ["no"],
    "は": ["ha"], "ひ": ["hi"], "ふ": ["fu", "hu"], "へ": ["he"], "ほ": ["ho"],
    "ま": ["ma"], "み": ["mi"], "む": ["mu"], "め": ["me"], "も": ["mo"],
    "や": ["ya"], "ゆ": ["yu"], "よ": ["yo"],
    "ら": ["ra"], "り": ["ri"], "る": ["ru"], "れ": ["re"], "ろ": ["ro"],
    "わ": ["wa"], "を": ["wo"], "ん": ["n", "nn", "n'", "xn"],
    "が": ["ga"], "ぎ": ["gi"], "ぐ": ["gu"], "げ": ["ge"], "ご": ["go"],
    "ざ": ["za"], "じ": ["ji", "zi"], "ず": ["zu"], "ぜ": ["ze"], "ぞ": ["zo"],
    "だ": ["da"], "ぢ": ["di"], "づ": ["du", "dzu"], "で": ["de"], "ど": ["do"],
    "ば": ["ba"], "び": ["bi"], "ぶ": ["bu"], "べ": ["be"], "ぼ": ["bo"],
    "ぱ": ["pa"], "ぴ": ["pi"], "ぷ": ["pu"], "ぺ": ["pe"], "ぽ": ["po"],
    "ゔ": ["vu"], "いぇ": ["ye"],
    "うぃ": ["wi", "whi", "wyi"], "うぇ": ["we", "whe", "wye"], "うぉ": ["who"],
    "ゔぁ": ["va"], "ゔぃ": ["vi", "vyi"], "ゔぇ": ["ve", "vye"], "ゔぉ": ["vo"],
    "ゔゃ": ["vya"], "ゔゅ": ["vyu"], "ゔょ": ["vyo"],
    "くぁ": ["qa", "qwa", "kwa"], "くぃ": ["qi", "qwi", "qyi"], "くぅ": ["qwu"], "くぇ": ["qe", "qwe", "qye"], "くぉ": ["qo", "qwo"],
    "ぐぁ": ["gwa"], "ぐぃ": ["gwi"], "ぐぅ": ["gwu"], "ぐぇ": ["gwe"], "ぐぉ": ["gwo"],
    "しぃ": ["syi"], "じぃ": ["zyi", "jyi"],
    "すぁ": ["swa"], "すぃ": ["swi"], "すぅ": ["swu"], "すぇ": ["swe"], "すぉ": ["swo"],
    "ずぁ": ["zwa"], "ずぃ": ["zwi"], "ずぅ": ["zwu"], "ずぇ": ["zwe"], "ずぉ": ["zwo"],
    "ちぃ": ["tyi", "cyi"], "ぢぃ": ["dyi"],
    "つぁ": ["tsa"], "つぃ": ["tsi"], "つぇ": ["tse"], "つぉ": ["tso"],
    "てぃ": ["thi"], "てぇ": ["the"], "てゅ": ["thu"], "とぅ": ["twu"],
    "でぃ": ["dhi"], "でぇ": ["dhe"], "でゅ": ["dhu"], "どぅ": ["dwu"],
    "ふぁ": ["fa", "fwa", "hwa"], "ふぃ": ["fi", "fwi", "fyi", "hwi"],
    "ふぇ": ["fe", "fwe", "fye", "hwe"], "ふぉ": ["fo", "fwo", "hwo"], "ふゅ": ["fyu", "hyu"],
    "きゃ": ["kya"], "きゅ": ["kyu"], "きょ": ["kyo"], "きぇ": ["kye"],
    "ぎゃ": ["gya"], "ぎゅ": ["gyu"], "ぎょ": ["gyo"], "ぎぇ": ["gye"],
    "しゃ": ["sha", "sya"], "しゅ": ["shu", "syu"], "しょ": ["sho", "syo"], "しぇ": ["she", "sye"],
    "じゃ": ["ja", "jya", "zya"], "じゅ": ["ju", "jyu", "zyu"], "じょ": ["jo", "jyo", "zyo"], "じぇ": ["je", "jye", "zye"],
    "ちゃ": ["cha", "tya", "cya"], "ちゅ": ["chu", "tyu", "cyu"], "ちょ": ["cho", "tyo", "cyo"], "ちぇ": ["che", "tye", "cye"],
    "ぢゃ": ["dya"], "ぢゅ": ["dyu"], "ぢょ": ["dyo"], "ぢぇ": ["dye"],
    "にゃ": ["nya"], "にゅ": ["nyu"], "にょ": ["nyo"], "にぇ": ["nye"],
    "ひゃ": ["hya"], "ひゅ": ["hyu"], "ひょ": ["hyo"], "ひぇ": ["hye"],
    "びゃ": ["bya"], "びゅ": ["byu"], "びょ": ["byo"], "びぇ": ["bye"],
    "ぴゃ": ["pya"], "ぴゅ": ["pyu"], "ぴょ": ["pyo"], "ぴぇ": ["pye"],
    "みゃ": ["mya"], "みゅ": ["myu"], "みょ": ["myo"], "みぇ": ["mye"],
    "りゃ": ["rya"], "りゅ": ["ryu"], "りょ": ["ryo"], "りぇ": ["rye"],
    "ぁ": ["xa", "la"], "ぃ": ["xi", "li"], "ぅ": ["xu", "lu"], "ぇ": ["xe", "le"], "ぉ": ["xo", "lo"],
    "ゃ": ["xya", "lya"], "ゅ": ["xyu", "lyu"], "ょ": ["xyo", "lyo"],
    "っ": ["xtu", "ltu", "xtsu", "ltsu"], "ゎ": ["xwa", "lwa"],
    "ゕ": ["xka", "lka"], "ゖ": ["xke", "lke"],
    "ゐ": ["wi"], "ゑ": ["we"],
};

let typingData = window.typingData || [];
let typingDataJa = window.typingDataJa || [];

//ingame stats
let currentDifficulty = 'normal', currentWord = "", currentTyped = "", currentJapanesePartial = "", level = 0, timeLeft = 0, timeLimitBase = 0, timerInterval = null;
let sessionTypos = 0, sessionChars = 0, currentCps = 1, questionsSolved = 0, currentCombo = 0, sessionMaxCombo = 0;
let isPlaying = false, isInputLocked = true, isJaGame = false, isAccMode = false, isSpcMode = false, statsViewAcc = false, statsViewSpc = false, statsViewJa = false;
let totalCharsTyped = 0, gameStartTime = 0;
let playerIngameLevel = 1;

//Game mode settings
const accModeCpsMul = 0.70, spcModeCpsMul = 1.35, damageMistake = 12, damageMistakeAcc = 2**52, damageTimeupSpc = 2**52, damageMistakeSpc = 2, damageTimeup = 110, healSuccess = 4;
const japaneseTimeMul = 1.7;

//conbo base stats
const comboStartThreshold =  20, comboAddThreshold = 5, comboBonus = 1.125, comboHeal = 1;
const scombStartThreshold = 100, scombAddThreshold =25, scombBonus = 2;

let highScore = new BigNum(0);
let maxLevel = 1;

// Global Player Stats
const maxHp = 160, MAX_PLAYER_LEVEL = 2**39-1;
let hp = maxHp;
let playerLevel = 0;
let playerXp = new BigNum(0), nextXp = new BigNum(0), statsMaxCps = 0, statsTotalChars = 0, statsTotalTypos = 0, statsTotalTime = 0, statsMaxCombo = 0;

let score = new BigNum(0);
let bestRecords = {
    'std':  { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
    'acc':  { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
    'spc':  { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
    'both': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
    'stdj': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
    'accj': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
    'spcj': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
    'botj': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
};

const LEADERBOARD_SIZE = 8;