nextXp = playerLvlXp(playerLevel);

function setRandomPlayerName() {
    const playerNameInput = document.getElementById('globalPlayerName');
    const name = generateRandomName();
    playerNameInput.value = name;
    localStorage.setItem('typingPlayerName', name);
}

function generateRandomWordFromData() {
    const data = isJaGame ? typingDataJa : typingData;
    if (!data || data.length === 0) {
        return { Text: "LOADING", Japanese: "", Reqs: "LOADING" };
    }
    const minLevel = DIFFICULTIES[currentDifficulty].minLevel;
    const currentMaxLvl = Math.min(level, 18);

    // Calculate weights for each eligible level
    let totalWeight = 0;
    let weights = [];
    for (let i = minLevel; i <= currentMaxLvl; i++) {
        let w = (i > 11 ? 2.4 : 1) * (i + 4) ** 2;
        weights.push(w);
        totalWeight += w;
    }

    // Determine the level randomly based on weights
    let r = Math.random() * totalWeight;
    let selectedLvl = 0;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) {
            selectedLvl = i + minLevel;
            break;
        }
    }

    // Extract problems of the determined level
    let pool = data.filter(d => d.Lvl === selectedLvl && d.Lvl >= minLevel && d.Lvl <= currentMaxLvl);

    if (pool.length === 0) {
        // Fall back to other eligible levels if the selected level has no problems
        pool = data.filter(d => d.Lvl >= minLevel && d.Lvl <= currentMaxLvl);
        if (pool.length === 0) return { Text: "ERROR", Japanese: "", Reqs: "ERROR" };
    }

    const item = pool[Math.floor(Math.random() * pool.length)];
    return item;
}

function saveSettings() {
    localStorage.setItem('typingDark', document.body.classList.contains('dark-mode'));
}

function loadSettings() {
    const dark = localStorage.getItem('typingDark');
    if (dark === 'false') {
        document.body.classList.remove('dark-mode');
    } else {
        document.body.classList.add('dark-mode');
    }
    updateThemeToggle();
}

function updateThemeToggle() {
    const isDark = document.body.classList.contains('dark-mode');
    const themeToggle = document.getElementById('themeToggleBtn');
    themeToggle.setAttribute('aria-checked', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function loadRecords() {
    // 【修正】highScoreを文字列として読み込み、BigNumに変換
    const languageSuffix = isJaGame ? 'ja' : 'en';
    const savedHighScore = isJaGame
        ? localStorage.getItem(`typingHighScore_${languageSuffix}_${currentDifficulty}`)
        : (localStorage.getItem(`typingHighScore_${languageSuffix}_${currentDifficulty}`)
            || localStorage.getItem(`typingHighScore_${currentDifficulty}`));
    highScore = savedHighScore ? new BigNum(savedHighScore) : new BigNum(0);
    maxLevel = parseInt(
        isJaGame
            ? localStorage.getItem(`typingMaxLevel_${languageSuffix}_${currentDifficulty}`)
            : (localStorage.getItem(`typingMaxLevel_${languageSuffix}_${currentDifficulty}`)
                || localStorage.getItem(`typingMaxLevel_${currentDifficulty}`))
    ) || 1;
    document.getElementById('highScoreText').innerText = notatBn(highScore, true);

    playerLevel = parseInt(localStorage.getItem('typingPlayerLevel')) || 0;
    // 【修正】playerXpを文字列として読み込み、BigNumに変換
    const savedPlayerXp = localStorage.getItem('typingPlayerXp');
    playerXp = savedPlayerXp ? new BigNum(savedPlayerXp) : new BigNum(0);
    statsMaxCps = parseFloat(localStorage.getItem('typingStatsMaxCps')) || 0;
    statsTotalChars = parseInt(localStorage.getItem('typingStatsTotalChars')) || 0;
    statsTotalTypos = parseInt(localStorage.getItem('typingStatsTotalTypos')) || 0;
    statsTotalTime = parseFloat(localStorage.getItem('typingStatsTotalTime')) || 0;
    statsMaxCombo = parseInt(localStorage.getItem('typingStatsMaxCombo')) || 0;

    Object.keys(bestRecords).forEach(mode => {
        const saved = localStorage.getItem(`typingBestRoundV2_${mode}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            // 【修正】保存されたbestRecordsの score を BigNum に変換
            Object.keys(parsed).forEach(diff => {
                if (parsed[diff] && parsed[diff].score) {
                    if (!(parsed[diff].score instanceof BigNum)) {
                        parsed[diff].score = new BigNum(parsed[diff].score);
                    }
                }
            });
            bestRecords[mode] = parsed;
        } else if (mode === 'std') {
            // Legacy support for the old format
            const oldSaved = localStorage.getItem('typingBestRound');
            const diffs = ['training', 'easy', 'normal', 'hard', 'insane'];
            diffs.forEach(d => {
                const legacy = localStorage.getItem(`typingBestRound_${d}`);
                if (legacy) {
                    const parsed = JSON.parse(legacy);
                    if (parsed.score && !(parsed.score instanceof BigNum)) {
                        parsed.score = new BigNum(parsed.score);
                    }
                    bestRecords['std'][d] = parsed;
                }
            });
        }
    });

    updatePlayerLevelUI();
}

function minmax(min, val, max) {
    if (val < min) return min;
    if (val > max) return max;
    return val;
}

function calcComboPow1(lvl) {return (lvl>=2**39-1) ? 1e21 : (lvl**2.208)/1e5;}
function calcComboPow2(lvl) {return (lvl>=2**39-1) ? 1e39 : (Math.max(0, lvl-1e4)**3.478)/1e5;}
function calcComboScoreMultiplier(combo, lvl, accMode) {
    const effectiveCombo = combo * (accMode ? 2 : 1);
    const comboSteps = Math.max(0, Math.floor((effectiveCombo - comboStartThreshold) / comboAddThreshold));
    const scomboSteps = Math.max(0, Math.floor((effectiveCombo - scombStartThreshold) / scombAddThreshold) + 1);
    const comboMultiplier = new BigNum(comboBonus + calcComboPow1(lvl)).pow(comboSteps);
    const scomboMultiplier = new BigNum(scombBonus + calcComboPow2(lvl)).pow(scomboSteps);
    return comboMultiplier.mul(scomboMultiplier);
}
function calcLvScorePow(lvl) {return (lvl>=2**39-1) ? 7500 : (1 + (lvl**.5)/100);}

function updatePlayerLevelUI() {
    const nextXp = playerLvlXp(playerLevel);
    document.getElementById('displayPlayerLevel').innerText = playerLevel;
    document.getElementById('xpText').innerText = `${notatBn(playerXp)} / ${notatBn(nextXp)} XP`;
    // 【修正】playerXpを BigNum.div() で割る
    const pct = (playerXp.div(nextXp)).toNumber() * 100;
    document.getElementById('xpGaugeBar').style.width = Math.min(100, pct) + '%';
    if (playerLevel>=MAX_PLAYER_LEVEL) {
        document.getElementById('xpGaugeBar').style.background = 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #00ffff, #0000ff, #4b0082, #8f00ff, #ff00ea, #ff0000)';
        document.getElementById('xpGaugeBar').style.backgroundSize = '200% auto';
        document.getElementById('xpGaugeBar').style.animation = 'rainbow 7s linear infinite';
        document.getElementById('xpText').innerText = `Max level reached!`;
    }
}

function playerLvlXp(lvl) {
    const base = new BigNum(1.6e-5*(lvl**5) + 2.0e-2*(lvl**4) + 0.25*(lvl**3) + 4*(lvl**2) + 16*lvl + 128);
    const asc  = new BigNum(1.026).pow(lvl);
    if (lvl<=4e3) {
        const pow1 = minmax(1, (lvl- 100) * 0.002, 1.30);
        const pow2 = minmax(1, (lvl- 750) * 0.001, 1.50);
        const pow3 = minmax(1, (lvl-1750) * 0.001, 1.75);
        const pow4 = minmax(1, (lvl-4000) * 0.001, 2.00);
        return new BigNum((base.mul(asc)).pow(pow1*pow2*pow3*pow4)).round()
    } else if (lvl>=MAX_PLAYER_LEVEL) {
        return new BigNum(1);
    }

    return new BigNum(((base.mul(asc)).pow(6.825))).round();
}

function getTXM(startLv, n) {
    let xpm = new BigNum(0);
    const stLv = n>1e4 ? startLv+n-1e4 : startLv;
    const rept = n>1e4 ? 1e4 : n;
    for (let i = stLv; i <= stLv+rept; i++) {
        xpm = xpm.add(playerLvlXp(i).div(playerLvlXp(startLv)));
    }
    return xpm;
}

const dr = [
  [getTXM(4200, 1e2), getTXM(MAX_PLAYER_LEVEL-1e2, 1e2), (getTXM(4200, 1e2).sub(getTXM(MAX_PLAYER_LEVEL-1e2, 1e2))).div(MAX_PLAYER_LEVEL)],
  [getTXM(4200, 1e3), getTXM(MAX_PLAYER_LEVEL-1e3, 1e3), (getTXM(4200, 1e3).sub(getTXM(MAX_PLAYER_LEVEL-1e3, 1e3))).div(MAX_PLAYER_LEVEL)],
  [getTXM(4200, 1e4), getTXM(MAX_PLAYER_LEVEL-1e4, 1e4), (getTXM(4200, 1e4).sub(getTXM(MAX_PLAYER_LEVEL-1e4, 1e4))).div(MAX_PLAYER_LEVEL)],
  [getTXM(4200, 1e5), getTXM(MAX_PLAYER_LEVEL-1e5, 1e5), (getTXM(4200, 1e5).sub(getTXM(MAX_PLAYER_LEVEL-1e5, 1e5))).div(MAX_PLAYER_LEVEL)],
  [getTXM(4200, 1e6), getTXM(MAX_PLAYER_LEVEL-1e6, 1e6), (getTXM(4200, 1e6).sub(getTXM(MAX_PLAYER_LEVEL-1e6, 1e6))).div(MAX_PLAYER_LEVEL)],
  [getTXM(4200, 1e7), getTXM(MAX_PLAYER_LEVEL-1e7, 1e7), (getTXM(4200, 1e7).sub(getTXM(MAX_PLAYER_LEVEL-1e7, 1e7))).div(MAX_PLAYER_LEVEL)],
  [getTXM(4200, 1e8), getTXM(MAX_PLAYER_LEVEL-1e8, 1e8), (getTXM(4200, 1e8).sub(getTXM(MAX_PLAYER_LEVEL-1e8, 1e8))).div(MAX_PLAYER_LEVEL)],
  [getTXM(4200, 1e9), getTXM(MAX_PLAYER_LEVEL-1e9, 1e9), (getTXM(4200, 1e9).sub(getTXM(MAX_PLAYER_LEVEL-1e9, 1e9))).div(MAX_PLAYER_LEVEL)],
  [getTXM(4200, 1e10), getTXM(MAX_PLAYER_LEVEL-1e10, 1e10), (getTXM(4200, 1e10).sub(getTXM(MAX_PLAYER_LEVEL-1e10, 1e10))).div(MAX_PLAYER_LEVEL)]
];

function addXp(amount) {
    playerXp = playerXp.add(new BigNum(amount));
    if (playerLevel>=MAX_PLAYER_LEVEL) {onMaxLevelReached(); return;};

    let diffRate;
    for (let i=8; i>=0; i--) {
        diffRate = (dr[i][1].max(dr[i][0].sub(dr[i][2].mul(playerLevel-4200)))).min(dr[i][0]);
        while (playerLevel>4200 && playerXp.compareTo(nextXp.mul(diffRate)) >= 0) {
            playerXp = playerXp.sub(nextXp.mul(diffRate));
            playerLevel += (10**i);
            diffRate = (dr[i][1].max(dr[i][0].sub(dr[i][2].mul(playerLevel-4200)))).min(dr[i][0]);
            nextXp = playerLvlXp(playerLevel);
            if (playerLevel>=MAX_PLAYER_LEVEL) {onMaxLevelReached(); break;}
        }
    }
    while (playerXp.compareTo(nextXp) >= 0) {
        playerXp = playerXp.sub(nextXp);
        playerLevel++;
        nextXp = playerLvlXp(playerLevel);
        if (playerLevel>4200) {addXp(0); break;}
        if (playerLevel>=MAX_PLAYER_LEVEL) {onMaxLevelReached(); break;}
    }

    savePlayerStats();
    updatePlayerLevelUI();
}

function onMaxLevelReached() {
    playerLevel = MAX_PLAYER_LEVEL;
    savePlayerStats();
    updatePlayerLevelUI();
}

function savePlayerStats() {
    localStorage.setItem('typingPlayerLevel', playerLevel);
    // 【修正】playerXpを文字列として保存
    localStorage.setItem('typingPlayerXp', playerXp.toString());
    localStorage.setItem('typingStatsMaxCps', statsMaxCps);
    localStorage.setItem('typingStatsTotalChars', statsTotalChars);
    localStorage.setItem('typingStatsTotalTypos', statsTotalTypos);
    localStorage.setItem('typingStatsTotalTime', statsTotalTime);
    localStorage.setItem('typingStatsMaxCombo', statsMaxCombo);

    Object.keys(bestRecords).forEach(mode => {
        const toSave = {};
        Object.keys(bestRecords[mode]).forEach(diff => {
            const record = bestRecords[mode][diff];
            if (record && record.score) {
                // 【修正】score を文字列として保存
                toSave[diff] = {
                    ...record,
                    score: record.score.toString()
                };
            } else {
                toSave[diff] = record;
            }
        });
        localStorage.setItem(`typingBestRoundV2_${mode}`, JSON.stringify(toSave));
    });
}

function isMobileView() {
    return window.matchMedia('(max-width: 768px)').matches;
}

window.addEventListener('DOMContentLoaded', () => {
    // typingData is loaded from typingTxt.js
    if (!window.typingData) {
        console.error("typingData is missing!");
    }

    loadSettings();
    loadRecords();

    const savedName = localStorage.getItem('typingPlayerName');
    if (savedName) {
        document.getElementById('globalPlayerName').value = savedName;
    } else {
        setRandomPlayerName();
    }
    updateDifficultyDescription();
});

document.getElementById('randomPlayerNameBtn').addEventListener('click', setRandomPlayerName);
document.getElementById('globalPlayerName').addEventListener('blur', event => {
    const playerNameInput = event.currentTarget;
    const name = playerNameInput.value.trim();
    if (name) {
        playerNameInput.value = name;
        localStorage.setItem('typingPlayerName', name);
    } else {
        setRandomPlayerName();
    }
});

document.getElementById('themeToggleBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    updateThemeToggle();
    saveSettings();
});

document.getElementById('deleteRecordsBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all records?") && confirm("REALLY???")) {
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
            if (k.startsWith('typingHighScore_') || k.startsWith('typingMaxLevel_') || k.startsWith('typingLeaderboard_') || k.startsWith('typingPlayer') || k.startsWith('typingStats') || k.startsWith('typingBestRound')) {
                localStorage.removeItem(k);
            }
        });
        bestRecords = {
            'std': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
            'acc': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
            'spc': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
            'both': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
            'stdj': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
            'accj': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
            'spcj': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) },
            'botj': { 'training': new BigNum(0), 'easy': new BigNum(0), 'normal': new BigNum(0), 'advanced': new BigNum(0), 'hard': new BigNum(0), 'expert': new BigNum(0), 'insane': new BigNum(0), 'lunatic': new BigNum(0) }
        };
        statsMaxCombo = 0;
        loadRecords();
        alert("Records deleted.");
        location.reload();
    }
});

document.getElementById('playerLevelContainer').addEventListener('click', () => {
    statsViewAcc = false;
    statsViewSpc = false;
    statsViewJa = false;
    updateStatsModal();
    document.getElementById('statsModal').classList.add('show');
});

document.getElementById('statsAccBtn').addEventListener('click', () => {
    statsViewAcc = !statsViewAcc;
    updateStatsModal();
});

document.getElementById('statsSpcBtn').addEventListener('click', () => {
    statsViewSpc = !statsViewSpc;
    updateStatsModal();
});

document.getElementById('statsEnBtn').addEventListener('click', () => {
    statsViewJa = false;
    updateStatsModal();
});

document.getElementById('statsJaBtn').addEventListener('click', () => {
    statsViewJa = true;
    updateStatsModal();
});

function updateStatsModal() {
    // Player Name
    const playerName = document.getElementById('globalPlayerName').value.trim() || "Statistics";
    document.getElementById('statsPlayerName').innerText = playerName;

    // Player Level and XP
    const nextXp = playerLvlXp(playerLevel);
    document.getElementById('statsPlayerLevel').innerText = playerLevel;
    // 【修正】playerXp を BigNum として扱う
    document.getElementById('statsXpText').innerText = (playerLevel>=MAX_PLAYER_LEVEL) ? `Max level reached!` : `${notatBn(playerXp)} / ${notatBn(nextXp)} XP`;
    const pct = (playerXp.div(nextXp)).toNumber() * 100;
    document.getElementById('statsXpGaugeBar').style.width = Math.min(100, pct) + '%';
    if (playerLevel>=MAX_PLAYER_LEVEL) {
        document.getElementById('statsXpGaugeBar').style.background = 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #00ffff, #0000ff, #4b0082, #8f00ff, #ff00ea, #ff0000)';
        document.getElementById('statsXpGaugeBar').style.backgroundSize = '200% auto';
        document.getElementById('statsXpGaugeBar').style.animation = 'rainbow 7s linear infinite';
    }

    document.getElementById('statsMaxCps').innerText = statsMaxCps.toFixed(2);
    const avgCps = statsTotalTime > 0 ? (statsTotalChars / statsTotalTime) : 0;
    document.getElementById('statsAvgCps').innerText = avgCps.toFixed(2);
    document.getElementById('statsTotalChars').innerText = notatBn(statsTotalChars);
    document.getElementById('statsTotalTypos').innerText = notatBn(statsTotalTypos);
    document.getElementById('statsMaxCombo').innerText = statsMaxCombo;

    const comboEffectMult = calcComboPow1(playerLevel).toFixed(3);
    document.getElementById('statsComboMult').innerText = `+${notatBn(comboEffectMult)}`;

    const scomboEffectMult = calcComboPow2(playerLevel).toFixed(3);
    document.getElementById('statsScomboMult').innerText = `+${notatBn(scomboEffectMult)}`;

    const scorePow = calcLvScorePow(playerLevel).toFixed(3);
    document.getElementById('statsScorePower').innerText = `${scorePow}`;

    // Determine mode key for display
    let modeKey = 'std';
    if (statsViewAcc && statsViewSpc) modeKey = 'both';
    else if (statsViewAcc) modeKey = 'acc';
    else if (statsViewSpc) modeKey = 'spc';
    if (statsViewJa) modeKey = ({
        'std': 'stdj',
        'acc': 'accj',
        'spc': 'spcj',
        'both': 'botj'
    })[modeKey];

    // UI Feedback for selected toggles
    const accBtn = document.getElementById('statsAccBtn');
    const spcBtn = document.getElementById('statsSpcBtn');
    const enBtn = document.getElementById('statsEnBtn');
    const jaBtn = document.getElementById('statsJaBtn');

    if (statsViewAcc) accBtn.classList.add('selected');
    else accBtn.classList.remove('selected');

    if (statsViewSpc) spcBtn.classList.add('selected');
    else spcBtn.classList.remove('selected');

    enBtn.classList.toggle('selected', !statsViewJa);
    jaBtn.classList.toggle('selected', statsViewJa);

    const bestList = document.getElementById('bestRecordsContainer');
    bestList.innerHTML = '';
    const recordsToDisplay = bestRecords[modeKey];
    Object.keys(recordsToDisplay).forEach(diff => {
        const record = recordsToDisplay[diff];
        const div = document.createElement('div');
        div.className = 'br-entry';

        // 【修正】record が存在し、かつ record.avgCps が undefined でないかチェックする
        if (record && typeof record.avgCps !== 'undefined') {
            div.innerHTML = `
                <div class="br-title">
                    <span>${diff.toUpperCase()}</span>
                    <span>Score: ${notatBn(record.score)}</span>
                </div>
                <div class="br-stats">
                    <span>Lvl: <b>${record.level}</b></span>
                    <span>CPS: <b>${record.avgCps.toFixed(2)}</b></span>
                    <span>Time: <b>${record.time.toFixed(1)}s</b></span>
                    <span>Chars: <b>${record.chars}</b></span>
                    <span>Mistakes: <b>${record.mistakes}</b></span>
                    <span>Acc: <b>${record.accuracy.toFixed(1)}%</b></span>
                </div>
            `;
        } else {
            div.innerHTML = `<div class="br-title"><span>${diff.toUpperCase()}</span><span>No record</span></div>`;
        }
        bestList.appendChild(div);
    });
}

function updateDifficultyDescription() {
    const descArea = document.getElementById('diffDescText');
    if (!descArea) return;

    const diffData = DIFFICULTIES[currentDifficulty];
    let effectiveCps = diffData.cps;

    if (isAccMode && isSpcMode) {
        effectiveCps *= spcModeCpsMul;
    } else if (isAccMode) {
        effectiveCps *= accModeCpsMul;
    } else if (isSpcMode) {
        effectiveCps *= spcModeCpsMul;
    }

    let rules = [];
    if (isAccMode) rules.push("#Accuracy Focus");
    if (isSpcMode) rules.push("#Speed Focus");

    let ruleStr = rules.length > 0 ? rules.join(" ") : "";

    let sp_detail = "";
    if (isAccMode && isSpcMode) {
        sp_detail = "You'll be killed immediately when something goes wrong.";
    } else if (isAccMode) {
        sp_detail = "You have long life but will fall if you make a mistake.";
    } else if (isSpcMode) {
        sp_detail = "To make the most of your short life, don't be afraid of failure.";
    } else {
        sp_detail = "Standard typing rules apply.";
    }

    let detail = "";
    if (currentDifficulty === "training") {
        detail = "For typing practice, very slow";
    } else if (currentDifficulty === "easy") {
        detail = "Casual pace for beginners";
    } else if (currentDifficulty === "normal") {
        detail = "Standard challenge for regular players";
    } else if (currentDifficulty === "advanced") {
        detail = "For expert typists who wants more challenge";
    } else if (currentDifficulty === "hard") {
        detail = "Intense pace for experienced typists";
    } else if (currentDifficulty === "expert") {
        detail = "Extreme challenge for typing experts";
    } else if (currentDifficulty === "insane") {
        detail = "Unforgiving speed for true masters";
    } else if (currentDifficulty === "lunatic") {
        detail = "This is the hardest difficulty level; the sane ones are the first to die.";
    }

    descArea.innerHTML = `
        <div class="desc-main">Difficulty: <span class="desc-highlight">${currentDifficulty.toUpperCase()}</span> <span class="desc-highlight">${ruleStr}</span></div>
        <div class="desc-sub">Starting Level: ${diffData.startLevel} | CPS: ${effectiveCps.toFixed(2)} (+ ${diffData.consTime.toFixed(2)}s)</div>
        <div class="desc-detail">${detail}</div>
        <div class="desc-sp-detail">${sp_detail}</div>
    `;
}

const difficultyNames = ['Training', 'Easy', 'Normal', 'Advanced', 'Hard', 'Expert', 'Insane', 'Lunatic'];
const difficultyKeys = ['training', 'easy', 'normal', 'advanced', 'hard', 'expert', 'insane', 'lunatic'];
const difficultyColors = ['#0ff', '#099', '#4a4', '#8c4', '#fe4', '#f90', '#e44', '#c2b'];
const difficultyShadowColors = ['0, 255, 255', '0, 153, 153', '68, 170, 68', '136, 204, 68', '255, 238, 68', '255, 153, 0', '238, 68, 68', '204, 34, 187'];

function syncDifficultySlider() {
    const slider = document.getElementById('difficultySlider');
    const title = document.getElementById('difficultyTitle');
    if (!slider || !title) return;

    const index = DIFFICULTIES[currentDifficulty].id;
    slider.value = index;
    slider.style.setProperty('--difficulty-color', difficultyColors[index]);
    slider.style.setProperty('--difficulty-shadow-rgb', difficultyShadowColors[index]);
    title.style.setProperty('--difficulty-title-color', difficultyColors[index]);
    slider.setAttribute('aria-valuetext', difficultyNames[index]);
    title.innerHTML = `Difficulty : <span>${difficultyNames[index]}</span>`;
}

document.querySelectorAll('.modal .close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('show');
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
});

const difficultySlider = document.getElementById('difficultySlider');
if (difficultySlider) {
    difficultySlider.addEventListener('input', (event) => {
        if (document.getElementById('startBtn').style.display === 'none') return;

        const index = Number(event.currentTarget.value);
        currentDifficulty = difficultyKeys[index];
        syncDifficultySlider();
        loadRecords();
        updateDifficultyDescription();
    });
    syncDifficultySlider();
}

document.getElementById('accModeBtn').addEventListener('click', () => {
    isAccMode = !isAccMode;
    const btn = document.getElementById('accModeBtn');
    if (isAccMode) {
        btn.classList.add('selected');
        btn.innerText = "Accuracy Focus : On";
    } else {
        btn.classList.remove('selected');
        btn.innerText = "Accuracy Focus : Off";
    }
    updateDifficultyDescription();
});

document.getElementById('spcModeBtn').addEventListener('click', () => {
    isSpcMode = !isSpcMode;
    const btn = document.getElementById('spcModeBtn');
    if (isSpcMode) {
        btn.classList.add('selected');
        btn.innerText = "Speed Focus : On";
    } else {
        btn.classList.remove('selected');
        btn.innerText = "Speed Focus : Off";
    }
    updateDifficultyDescription();
});

document.querySelectorAll('#languageModeSelect .diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (document.getElementById('startBtn').style.display === 'none') return;

        const selectedButton = e.currentTarget;
        isJaGame = selectedButton.dataset.language === 'ja';
        document.querySelectorAll('#languageModeSelect .diff-btn').forEach(modeBtn => {
            modeBtn.classList.toggle('selected', modeBtn === selectedButton);
            modeBtn.setAttribute('aria-pressed', modeBtn === selectedButton ? 'true' : 'false');
        });
        loadRecords();
    });
});

function startGame() {
    playerIngameLevel = playerLevel;
    document.body.classList.remove('game-over-active');

    const diff = DIFFICULTIES[currentDifficulty];
    level = diff.startLevel;
    currentCps = diff.cps;
    questionsSolved = 0;

    currentCombo = 0;
    sessionMaxCombo = 0;
    updateComboUI();

    sessionTypos = 0;
    sessionChars = 0;

    // 【修正】score を BigNum で初期化
    score = new BigNum(0);
    totalCharsTyped = 0;
    hp = maxHp;
    updateHpUI();

    const rawName = document.getElementById('globalPlayerName').value.trim();
    const n = rawName || generateRandomName();
    document.getElementById('globalPlayerName').value = n;
    localStorage.setItem('typingPlayerName', n);

    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('languageModeSelect').style.display = 'none';
    document.getElementById('difficultySelect').style.display = 'none';
    document.getElementById('accModeBtn').parentElement.style.display = 'none';
    document.getElementById('playerSetupArea').style.display = 'none';

    document.getElementById('recordDisplay').style.display = 'none';
    document.getElementById('difficultyDescriptionArea').style.display = 'none';

    let count = 3;
    const countdownText = document.getElementById('countdownText');
    countdownText.innerText = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownText.innerText = count;
        } else if (count === 0) {
            countdownText.innerText = "GO!";
        } else {
            clearInterval(interval);
            countdownText.innerText = "";
            document.getElementById('gameUI').style.display = 'block';
            gameStartTime = Date.now();
            isPlaying = true;

            if (isAccMode && isSpcMode) {
                currentCps *= spcModeCpsMul;
            } else if (isAccMode) {
                currentCps *= accModeCpsMul;
            } else if (isSpcMode) {
                currentCps *= spcModeCpsMul;
            }

            document.getElementById('userInput').focus();
            nextQuestion();
        }
    }, 1000);
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = timeLimitBase;
    updateTimerUI();

    let lastTime = Date.now();
    timerInterval = setInterval(() => {
        const now = Date.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        timeLeft -= dt;

        if (timeLeft <= 0) {
            timeLeft = 0;
            clearInterval(timerInterval);
            updateTimerUI();

            // Time up penalty
            let dmg = damageTimeup;
            if (isSpcMode) dmg = damageTimeupSpc;
            hp -= dmg;
            updateHpUI();
            errSound();

            if (hp <= 0) {
                triggerGameOver("Time's up!");
            } else {
                // If still alive, move to next question
                nextQuestion();
            }
        } else {
            updateTimerUI();
        }
    }, 17);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimerUI() {
    const bar = document.getElementById('timerBar');
    const text = document.getElementById('timerText');
    const pct = (timeLeft / timeLimitBase) * 100;
    bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    text.innerText = timeLeft > 10 ? timeLeft.toFixed(2) + 's' : (timeLeft * 1000).toFixed(0) + 'ms';

    if (isInputLocked) {
        bar.style.backgroundColor = '#6c757d';
    } else {
        if (pct < 20) {
            bar.style.backgroundColor = '#d9534f';
        } else if (pct < 50) {
            bar.style.backgroundColor = '#f0ad4e';
        } else {
            bar.style.backgroundColor = '#28a745';
        }
    }
}

function triggerGameOver(reasonStr) {
    stopTimer();
    isPlaying = false;
    isInputLocked = true;

    document.body.classList.add('wrong-answer-bg');
    setTimeout(() => {
        document.body.classList.remove('wrong-answer-bg');

        document.getElementById('gameUI').style.display = 'none';
        document.getElementById('recordDisplay').style.display = 'none';

        const playerName = document.getElementById('globalPlayerName').value.trim() || 'Anonymous';

        // 【修正】highScore と score を BigNum.compareTo() で比較
        if (score.compareTo(highScore) > 0) {
            highScore = score;
            // 【修正】highScore を文字列として保存
            const languageSuffix = isJaGame ? 'ja' : 'en';
            localStorage.setItem(`typingHighScore_${languageSuffix}_${currentDifficulty}`, highScore.toString());
            document.getElementById('highScoreText').innerText = notatBn(highScore);
        }
        if (level > maxLevel) {
            maxLevel = level;
            const languageSuffix = isJaGame ? 'ja' : 'en';
            localStorage.setItem(`typingMaxLevel_${languageSuffix}_${currentDifficulty}`, maxLevel);
        }

        const goMain = document.getElementById('gameOverMain');
        document.body.classList.add('game-over-active');
        goMain.style.display = 'block';
        goMain.classList.add('go-slide-in');
        document.getElementById('mainReasonText').innerText = reasonStr;

        document.getElementById('mainFinalScore').innerText = notatBn(score);
        document.getElementById('mainFinalLevel').innerText = level;

        let realTimeElapsed = (Date.now() - gameStartTime) / 1000;
        let averageCps = realTimeElapsed > 0 ? (totalCharsTyped / realTimeElapsed) : 0;
        let accuracy = (sessionChars + sessionTypos) > 0 ? (sessionChars / (sessionChars + sessionTypos)) * 100 : 0;

        // Update Global Stats
        statsTotalTime += realTimeElapsed;
        statsTotalChars += totalCharsTyped;
        if (averageCps > statsMaxCps) {
            statsMaxCps = averageCps;
        }

        // Check Best Round for Mode and Difficulty
        let modeKey = 'std';
        if (isAccMode && isSpcMode) modeKey = 'both';
        else if (isAccMode) modeKey = 'acc';
        else if (isSpcMode) modeKey = 'spc';
        if (isJaGame) modeKey = ({
            'std': 'stdj',
            'acc': 'accj',
            'spc': 'spcj',
            'both': 'botj'
        })[modeKey];

        // 【修正】bestRecords の score を BigNum として比較
        if (!bestRecords[modeKey][currentDifficulty] || score.compareTo(bestRecords[modeKey][currentDifficulty].score) > 0) {
            bestRecords[modeKey][currentDifficulty] = {
                score: score,  // BigNum のまま保持
                level: level,
                avgCps: averageCps,
                chars: sessionChars,
                mistakes: sessionTypos,
                accuracy: accuracy,
                time: realTimeElapsed
            };
        }

        savePlayerStats();

        document.getElementById('mainFinalScore').innerText = notatBn(score);
        document.getElementById('mainFinalLevel').innerText = level;
        document.getElementById('mainSessionMaxCombo').innerText = sessionMaxCombo;
        document.getElementById('mainCharsTyped').innerText = totalCharsTyped;
        document.getElementById('mainAvgCps').innerText = averageCps.toFixed(2);
        document.getElementById('mainMistakes').innerText = sessionTypos;
        document.getElementById('mainAccuracy').innerText = accuracy.toFixed(2) + "%";
        document.getElementById('mainTime').innerText = realTimeElapsed.toFixed(2) + "s";

        const failedHTML = isJaGame
            ? `<span class="text-green-important">${currentTyped}</span><span class="text-orange-important">${currentJapanesePartial ? currentWord[currentTyped.length] : ""}</span><span style="color:#d9534f">${currentWord.substring(currentTyped.length + (currentJapanesePartial ? 1 : 0))}</span>`
            : `<span class="text-green-important">${currentTyped}</span><span style="color:#d9534f">${currentWord.substring(currentTyped.length)}</span>`;
        document.getElementById('mainFailedWord').innerHTML = failedHTML;
    }, 500);
}

function retryGame() {
    document.body.classList.remove('game-over-active');
    document.body.classList.remove('wrong-answer-bg');
    const goMain = document.getElementById('gameOverMain');
    goMain.style.display = 'none';
    goMain.classList.remove('go-slide-in');

    document.getElementById('recordDisplay').style.display = 'block';
    document.getElementById('playerSetupArea').style.display = 'block';
    document.getElementById('difficultySelect').style.display = 'flex';
    document.getElementById('accModeBtn').parentElement.style.display = 'flex';
    document.getElementById('difficultyDescriptionArea').style.display = 'block';

    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('languageModeSelect').style.display = 'flex';
}

function quickRetryGame() {
    document.body.classList.remove('game-over-active');
    document.body.classList.remove('wrong-answer-bg');
    const goMain = document.getElementById('gameOverMain');
    goMain.style.display = 'none';
    goMain.classList.remove('go-slide-in');

    startGame();
}

function nextQuestion() {
    document.getElementById('level').innerText = level;
    document.getElementById('cps').innerText = currentCps.toFixed(2);
    document.getElementById('score').innerText = notatBn(score);

    const item = generateRandomWordFromData();
    currentWord = isJaGame ? item.Reqs : item.Text;
    const jpTranslation = isJaGame ? item.Text : (item.Japanese || "");

    currentTyped = "";
    currentJapanesePartial = "";
    document.getElementById('wordTranslation').innerText = jpTranslation;
    updateWordDisplay();

    timeLimitBase = (currentWord.length / currentCps) * (isJaGame ? japaneseTimeMul : 1) + DIFFICULTIES[currentDifficulty].consTime;

    isInputLocked = false;
    startTimer();
}

function updateWordDisplay() {
    const display = document.getElementById('wordDisplay');
    if (isJaGame) {
        const activeKanaEnd = currentJapanesePartial ? currentTyped.length + 1 : currentTyped.length;
        const activeKana = currentJapanesePartial ? currentWord[currentTyped.length] : "";
        display.innerHTML = `<span class="text-green-important">${currentTyped}</span><span class="text-orange-important">${activeKana}</span><span>${currentWord.substring(activeKanaEnd)}</span>`;
        return;
    }
    display.innerHTML = `<span class="text-green-important">${currentTyped}</span><span>${currentWord.substring(currentTyped.length)}</span>`;
}

function updateHpUI() {
    const hpBar = document.getElementById('hpBar');
    const hpText = document.getElementById('hpText');
    if (!hpBar || !hpText) return;

    const pct = Math.max(0, (hp / maxHp) * 100);
    hpBar.style.width = pct + '%';
    hpText.innerText = `Health: ${Math.round(hp)} / ${maxHp}`;
}

function handleInputChar(inputChar) {
    if (isJaGame) {
        handleJapaneseInputChar(inputChar.toLowerCase());
        return;
    }

    const targetChar = currentWord[currentTyped.length].toUpperCase();

    //Treat space and underscore as the same character
    const isMatch = (inputChar === targetChar) ||
        (targetChar === " " && inputChar === "_") ||
        (targetChar === "_" && inputChar === " ");

    if (isMatch) {
        let actualChar = currentWord[currentTyped.length];
        // Space characters in the typed portion (currentTyped) are preserved as underscores
        recordCorrectInput((actualChar === " ") ? "_" : actualChar);
    } else {
        handleInputMistake();
    }
}

function isKanaInAOrNRow(kana) {
    return /^[ぁあいうえおなにぬねの]/.test(kana);
}

function getJapaneseInputOptions(index) {
    const kana = currentWord[index];
    const options = [];
    const addOption = (kanaCount, key) => {
        const nextKana = index + 1 < currentWord.length ? currentWord[index + 1] : "";
        const requiresDoubleN = key === "ん" &&
            (index === currentWord.length - 1 || isKanaInAOrNRow(nextKana));
        const inputs = requiresDoubleN
            ? inputJapanese[key].filter(input => input !== "n")
            : inputJapanese[key];
        if (inputs) options.push({ kanaCount, inputs });
    };

    addOption(1, kana);
    if (index + 1 < currentWord.length) {
        addOption(2, currentWord.substring(index, index + 2));
    }

    if (kana === "っ" && index + 1 < currentWord.length) {
        const nextKana = currentWord[index + 1];
        const nextInputs = [
            ...(inputJapanese[nextKana] || []),
            ...(inputJapanese[currentWord.substring(index + 1, index + 3)] || [])
        ];
        const doubledConsonants = [...new Set(nextInputs
            .map(input => input[0])
            .filter(char => /^[b-df-hj-np-tv-z]$/.test(char))
            .map(char => char + char))];
        if (doubledConsonants.length) options.push({ kanaCount: 1, inputs: doubledConsonants, repeatedConsonant: true });
    }

    return options;
}

function handleJapaneseInputChar(inputChar, countCombo = true) {
    const index = currentTyped.length;
    const options = getJapaneseInputOptions(index);
    const typed = currentJapanesePartial + inputChar;
    const completedOption = options.find(option => option.inputs.includes(typed));

    const deferSingleN = currentWord[index] === "ん" &&
        index + 1 < currentWord.length &&
        currentJapanesePartial === "" &&
        inputChar === "n";

    if (completedOption && !deferSingleN) {
        if (countCombo) incrementCombo();
        currentJapanesePartial = "";
        recordCorrectInput(currentWord.substring(index, index + completedOption.kanaCount));
        if (completedOption.repeatedConsonant) handleJapaneseInputChar(inputChar, false);
        return;
    }

    if (options.some(option => option.inputs.some(input => input.startsWith(typed)))) {
        if (countCombo) incrementCombo();
        currentJapanesePartial = typed;
        updateWordDisplay();
        return;
    }

    if (currentWord[index] === "ん" && currentJapanesePartial === "n") {
        if (index + 1 < currentWord.length &&
            isKanaInAOrNRow(currentWord[index + 1])) {
            currentJapanesePartial = "";
            updateWordDisplay();
            handleInputMistake();
            return;
        }
        currentJapanesePartial = "";
        recordCorrectInput("ん");
        handleJapaneseInputChar(inputChar);
        return;
    }

    currentJapanesePartial = "";
    updateWordDisplay();
    handleInputMistake();
}

function recordCorrectInput(typedText) {
    currentTyped += typedText;
    const completedChars = isJaGame ? typedText.length : 1;
    totalCharsTyped += completedChars;
    sessionChars += completedChars;
    if (!isJaGame) incrementCombo();
    updateWordDisplay();

    if (currentTyped.length === currentWord.length) {
        const cbMul = calcComboScoreMultiplier(sessionMaxCombo, playerIngameLevel, isAccMode);
        const lvMul = new BigNum(1.35).pow(level - DIFFICULTIES[currentDifficulty].startLevel);
        const lvPow = new BigNum(1 + (level/25))
        const cbPow = new BigNum(1 + (Math.floor(sessionMaxCombo/100)**1.25)/10)
        const sp = DIFFICULTIES[currentDifficulty].scorePow;
        const pp = calcLvScorePow(playerIngameLevel);
        const spdMul = new BigNum((5*currentCps) ** (isSpcMode ? 2 : 1));
        const addedScore = new BigNum((((spdMul.mul(currentWord.length).mul(cbMul).mul(lvMul)).pow(sp)).pow(lvPow)).pow(pp).pow(cbPow)).round();
        // 【修正】score に BigNum.add() で加算
        score = score.add(addedScore);
        if (score.isInfinity) score = new BigNum(9.99, 2**53-1);
        if (addedScore.isInfinity) {
            playerLevel=MAX_PLAYER_LEVEL; addXp(new BigNum(1));
        } else {
            addXp(addedScore);
        }
        questionsSolved++;
        nxtSound();

        // Success reward: +healSuccess HP
        hp = Math.min(maxHp, hp + healSuccess);
        updateHpUI();

        if (questionsSolved % 5 === 0) {
            level++;
            currentCps += 0.05;
            currentCps *= 1.06;
        }
        nextQuestion();
    }
}

function incrementCombo() {
    currentCombo++;
    if (currentCombo > sessionMaxCombo) sessionMaxCombo = currentCombo;
    if (currentCombo > statsMaxCombo) {
        statsMaxCombo = currentCombo;
        savePlayerStats();
    }
    updateComboUI();
}

function handleInputMistake() {
    // Mistake penalty
    const dmg = isAccMode ? damageMistakeAcc : isSpcMode ? damageMistakeSpc : damageMistake;
    hp -= dmg;
    statsTotalTypos++;
    sessionTypos++;
    currentCombo = 0;
    updateComboUI();
    savePlayerStats();
    updateHpUI();
    errSound();

    if (hp <= 0) {
        triggerGameOver("Too many mistakes!");
    }
}

function errSound() {
    // Sound effect for mistake
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.13, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.13);

    document.body.classList.add('wrong-answer-bg');
    setTimeout(() => {
        if (isPlaying) document.body.classList.remove('wrong-answer-bg');
    }, 100);
}

function nxtSound() {
    // Sound effect for correct answer
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.07);
}

document.addEventListener('keydown', (e) => {
    if (!isPlaying || isInputLocked) return;

    // Prevent double firing: if the hidden input is focused, it will trigger the 'input' event instead
    if (document.activeElement === document.getElementById('userInput')) {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            return;
        }
    }

    if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;

    handleInputChar(e.key.toUpperCase());
});

document.getElementById('userInput').addEventListener('input', (e) => {
    if (!isPlaying || isInputLocked) return;
    const val = e.target.value;
    e.target.value = "";
    if (!val) return;

    handleInputChar(val[val.length - 1].toUpperCase());
});

// Always keep input focused when playing so mobile keyboard stays open
document.addEventListener('click', () => {
    if (isPlaying) {
        document.getElementById('userInput').focus();
    }
});

function updateComboUI() {
    const comboTxt = document.getElementById('comboText');
    const bonusMsg = document.getElementById('comboBonusMsg');

    const maxEffectiveCombo = sessionMaxCombo * (isAccMode ? 2 : 1);
    const currentEffectiveCombo = currentCombo * (isAccMode ? 2 : 1);

    if (currentEffectiveCombo > comboStartThreshold - 1) {
        comboTxt.style.display = 'inline';
        comboTxt.innerText = `COMBO: ${currentCombo}`;
        if (currentCombo % comboStartThreshold === 0) {
            hp += comboHeal;
            updateHpUI();
        }
    } else {
        comboTxt.style.display = 'none';
    }

    if (maxEffectiveCombo > comboStartThreshold - 1) {
        const multiplier = calcComboScoreMultiplier(sessionMaxCombo, playerIngameLevel, isAccMode);
        const bonusPct = (multiplier.sub(1)).mul(100);
        bonusMsg.innerText = `Score bonus +${notatBn(bonusPct)}%`;
    } else {
        bonusMsg.innerText = '';
    }
}