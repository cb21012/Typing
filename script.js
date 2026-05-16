const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const DIFFICULTIES = {
    'training': { id: 0, cps: 0.2, startLevel: 0 },
    'easy': { id: 1, cps: 1, startLevel: 1 },
    'normal': { id: 2, cps: 2, startLevel: 4 },
    'hard': { id: 3, cps: 3.6, startLevel: 7 },
    'insane': { id: 4, cps: 5, startLevel: 10 }
};

let typingData = window.typingData || [];

let currentDifficulty = 'normal';
let currentWord = "";
let currentTyped = "";
let level = 0;
let score = 0;
let timeLeft = 0;
let timeLimitBase = 0;
let timerInterval;
let isPlaying = false;
let isInputLocked = true;

let sessionTypos = 0;
let sessionChars = 0;

let currentCps = 1;
let questionsSolved = 0;
let isAccMode = false;
let isSpcMode = false;

const accModeCpsMul = 0.80;
const spcModeCpsMul = 1.35;

const maxHp = 160;
let hp = maxHp;

const damageMistake = 12;
const damageMistakeAcc = 2 ** 52;
const damageTimeupSpc = 2 ** 52;
const damageMistakeSpc = 2;
const damageTimeup = 110;
const healSuccess = 4;

const comboStartThreshold = 20;
const comboAddThreshold = 5;
const comboBonus = 1.05;
const comboHeal = 1;

let totalCharsTyped = 0;
let gameStartTime = 0;

let highScore = 0;
let maxLevel = 1;

// Global Player Stats
let playerLevel = 0;
let playerXp = 0;
let statsMaxCps = 0;
let statsTotalChars = 0;
let statsTotalTypos = 0;
let statsTotalTime = 0; // seconds
let statsMaxCombo = 0;

let currentCombo = 0;
let sessionMaxCombo = 0;

let statsViewAcc = false;
let statsViewSpc = false;

let bestRecords = {
    'std': { 'training': null, 'easy': null, 'normal': null, 'hard': null, 'insane': null },
    'acc': { 'training': null, 'easy': null, 'normal': null, 'hard': null, 'insane': null },
    'spc': { 'training': null, 'easy': null, 'normal': null, 'hard': null, 'insane': null },
    'both': { 'training': null, 'easy': null, 'normal': null, 'hard': null, 'insane': null }
};

const LEADERBOARD_SIZE = 8;

function notatVal(v) {
    const len = Math.floor(Math.log10(v) / 3);
    if (len < 1) return v;
    const sufi = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"][len];
    return v > 1e4 ? (v / (1e3 ** len)).toFixed(3 + Math.floor(1 - Math.log10(v)) % 3) + sufi : v;
}

function generateRandomName() {
    const chars = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Ti", "V", "Cr", "Fe", "Ni", "Cu", "Zn", "Br", "Ag", "I", "W", "Pt", "Au", "Hg"];
    const nums = ["", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];
    let result = '';
    const len = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < len; i++) {
        let rand = Math.floor(Math.random() * chars.length);
        result += chars[rand];
        chars.splice(rand, 1);
        result += nums[Math.floor(Math.random() * nums.length)];
    }
    return result;
}

function generateRandomWordFromData() {
    if (!typingData || typingData.length === 0) {
        return "LOADING";
    }
    const currentMaxLvl = Math.min(level, 17);

    // 各レベル(0〜currentMaxLvl)の重みを計算
    let totalWeight = 0;
    let weights = [];
    for (let i = 0; i <= currentMaxLvl; i++) {
        let w = (i > 11 ? 2.4 : 1) * (i + 4) ** 2;
        weights.push(w);
        totalWeight += w;
    }

    // 重みに基づいてレベルをランダムに決定
    let r = Math.random() * totalWeight;
    let selectedLvl = 0;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) {
            selectedLvl = i;
            break;
        }
    }

    // 決定したレベルの問題を抽出
    let pool = typingData.filter(d => d.Lvl === selectedLvl);

    if (pool.length === 0) {
        // 該当するレベルの問題がない場合のフォールバック
        pool = typingData.filter(d => d.Lvl <= currentMaxLvl);
        if (pool.length === 0) return "ERROR";
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
}

function loadRecords() {
    highScore = parseInt(localStorage.getItem(`typingHighScore_${currentDifficulty}`)) || 0;
    maxLevel = parseInt(localStorage.getItem(`typingMaxLevel_${currentDifficulty}`)) || 1;
    document.getElementById('highScoreText').innerText = notatVal(highScore);

    playerLevel = parseInt(localStorage.getItem('typingPlayerLevel')) || 0;
    playerXp = parseInt(localStorage.getItem('typingPlayerXp')) || 0;
    statsMaxCps = parseFloat(localStorage.getItem('typingStatsMaxCps')) || 0;
    statsTotalChars = parseInt(localStorage.getItem('typingStatsTotalChars')) || 0;
    statsTotalTypos = parseInt(localStorage.getItem('typingStatsTotalTypos')) || 0;
    statsTotalTime = parseFloat(localStorage.getItem('typingStatsTotalTime')) || 0;
    statsMaxCombo = parseInt(localStorage.getItem('typingStatsMaxCombo')) || 0;

    Object.keys(bestRecords).forEach(mode => {
        const saved = localStorage.getItem(`typingBestRoundV2_${mode}`);
        if (saved) {
            bestRecords[mode] = JSON.parse(saved);
        } else if (mode === 'std') {
            // Legacy support for the old format
            const oldSaved = localStorage.getItem('typingBestRound'); // This was likely missing or different, but we try to migrate std records
            const diffs = ['training', 'easy', 'normal', 'hard', 'insane'];
            diffs.forEach(d => {
                const legacy = localStorage.getItem(`typingBestRound_${d}`);
                if (legacy) bestRecords['std'][d] = JSON.parse(legacy);
            });
        }
    });

    updatePlayerLevelUI();
}

//Lvl
function playerLvlXp(lvl) {
    return Math.round(((4 * (lvl ** 2) + 16 * lvl + 128) * 1.08 ** Math.floor(lvl / 32)) ** (lvl > 99 ? Math.min(1.42, 0.7 + (lvl * 0.003)) : 1));
}

function updatePlayerLevelUI() {
    const nextXp = playerLvlXp(playerLevel);
    document.getElementById('displayPlayerLevel').innerText = playerLevel;
    document.getElementById('xpText').innerText = `${notatVal(playerXp)} / ${notatVal(nextXp)} XP`;
    const pct = (playerXp / nextXp) * 100;
    document.getElementById('xpGaugeBar').style.width = Math.min(100, pct) + '%';
}

function addXp(amount) {
    playerXp += amount;
    let nextXp = playerLvlXp(playerLevel);
    while (playerXp >= nextXp) {
        playerXp -= nextXp;
        playerLevel++;
        nextXp = playerLvlXp(playerLevel);
        // Level up effect could go here
    }
    savePlayerStats();
    updatePlayerLevelUI();
}

function savePlayerStats() {
    localStorage.setItem('typingPlayerLevel', playerLevel);
    localStorage.setItem('typingPlayerXp', playerXp);
    localStorage.setItem('typingStatsMaxCps', statsMaxCps);
    localStorage.setItem('typingStatsTotalChars', statsTotalChars);
    localStorage.setItem('typingStatsTotalTypos', statsTotalTypos);
    localStorage.setItem('typingStatsTotalTime', statsTotalTime);
    localStorage.setItem('typingStatsMaxCombo', statsMaxCombo);

    Object.keys(bestRecords).forEach(mode => {
        localStorage.setItem(`typingBestRoundV2_${mode}`, JSON.stringify(bestRecords[mode]));
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
    }
    updateDifficultyDescription();
});

document.getElementById('openSettingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('show');
});
document.getElementById('darkModeBtn').addEventListener('click', () => {
    document.body.classList.add('dark-mode');
    saveSettings();
});
document.getElementById('lightModeBtn').addEventListener('click', () => {
    document.body.classList.remove('dark-mode');
    saveSettings();
});
document.getElementById('deleteRecordsBtn').addEventListener('click', () => {
    if (confirm("Are you sure you want to delete all records?")) {
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
            if (k.startsWith('typingHighScore_') || k.startsWith('typingMaxLevel_') || k.startsWith('typingLeaderboard_') || k.startsWith('typingPlayer') || k.startsWith('typingStats') || k.startsWith('typingBestRound')) {
                localStorage.removeItem(k);
            }
        });
        bestRecords = {
            'std': { 'training': null, 'easy': null, 'normal': null, 'hard': null, 'insane': null },
            'acc': { 'training': null, 'easy': null, 'normal': null, 'hard': null, 'insane': null },
            'spc': { 'training': null, 'easy': null, 'normal': null, 'hard': null, 'insane': null },
            'both': { 'training': null, 'easy': null, 'normal': null, 'hard': null, 'insane': null }
        };
        statsMaxCombo = 0;
        loadRecords();
        alert("Records deleted.");
    }
});

document.getElementById('playerLevelContainer').addEventListener('click', () => {
    statsViewAcc = false;
    statsViewSpc = false;
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

function updateStatsModal() {
    // Player Name
    const playerName = document.getElementById('globalPlayerName').value.trim() || "Statistics";
    document.getElementById('statsPlayerName').innerText = playerName;

    // Player Level and XP
    const nextXp = playerLvlXp(playerLevel);
    document.getElementById('statsPlayerLevel').innerText = playerLevel;
    document.getElementById('statsXpText').innerText = `${notatVal(playerXp)} / ${notatVal(nextXp)} XP`;
    const pct = (playerXp / nextXp) * 100;
    document.getElementById('statsXpGaugeBar').style.width = Math.min(100, pct) + '%';

    document.getElementById('statsMaxCps').innerText = statsMaxCps.toFixed(2);
    const avgCps = statsTotalTime > 0 ? (statsTotalChars / statsTotalTime) : 0;
    document.getElementById('statsAvgCps').innerText = avgCps.toFixed(2);
    document.getElementById('statsTotalChars').innerText = notatVal(statsTotalChars);
    document.getElementById('statsTotalTypos').innerText = notatVal(statsTotalTypos);
    document.getElementById('statsMaxCombo').innerText = statsMaxCombo;

    // Determine mode key for display
    let modeKey = 'std';
    if (statsViewAcc && statsViewSpc) modeKey = 'both';
    else if (statsViewAcc) modeKey = 'acc';
    else if (statsViewSpc) modeKey = 'spc';

    // UI Feedback for selected toggles
    const accBtn = document.getElementById('statsAccBtn');
    const spcBtn = document.getElementById('statsSpcBtn');

    if (statsViewAcc) accBtn.classList.add('selected');
    else accBtn.classList.remove('selected');

    if (statsViewSpc) spcBtn.classList.add('selected');
    else spcBtn.classList.remove('selected');

    const bestList = document.getElementById('bestRecordsContainer');
    bestList.innerHTML = '';
    const recordsToDisplay = bestRecords[modeKey];
    Object.keys(recordsToDisplay).forEach(diff => {
        const record = recordsToDisplay[diff];
        const div = document.createElement('div');
        div.className = 'br-entry';
        if (record) {
            div.innerHTML = `
                <div class="br-title">
                    <span>${diff.toUpperCase()}</span>
                    <span>Score: ${notatVal(record.score)}</span>
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
    } else if (currentDifficulty === "hard") {
        detail = "Intense pace for experienced typists";
    } else if (currentDifficulty === "insane") {
        detail = "Unforgiving speed for true masters";
    }

    descArea.innerHTML = `
        <div class="desc-main">Difficulty: <span class="desc-highlight">${currentDifficulty.toUpperCase()}</span> <span class="desc-highlight">${ruleStr}</span></div>
        <div class="desc-sub">Starting Level: ${diffData.startLevel} | CPS: ${effectiveCps.toFixed(2)}</div>
        <div class="desc-detail">${detail}</div>
        <div class="desc-sp-detail">${sp_detail}</div>
    `;
}

// Remove leaderboard button listener and related
/*
document.getElementById('openLeaderboardBtn').addEventListener('click', () => {
    document.getElementById('leaderboardModal').classList.add('show');
    document.querySelectorAll('#leaderboardTabs .diff-btn').forEach(b => b.classList.remove('selected'));
    const activeBtn = document.querySelector(`#leaderboardTabs .diff-btn[data-lb-diff="${currentDifficulty}"]`);
    if (activeBtn) activeBtn.classList.add('selected');
    renderLeaderboard(currentDifficulty);
});
*/

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

/*
document.querySelectorAll('#leaderboardTabs .diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('#leaderboardTabs .diff-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        renderLeaderboard(e.target.getAttribute('data-lb-diff'));
    });
});
*/

document.querySelectorAll('#difficultySelect .diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!document.getElementById('startBtn').style.display || document.getElementById('startBtn').style.display === 'inline-block') {
            document.querySelectorAll('#difficultySelect .diff-btn').forEach(b => b.classList.remove('selected'));
            const targetBtn = e.currentTarget;
            targetBtn.classList.add('selected');
            currentDifficulty = targetBtn.getAttribute('data-diff');
            loadRecords();
            updateDifficultyDescription();
        }
    });
});

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

function startGame() {
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

    score = 0;
    totalCharsTyped = 0;
    hp = maxHp;
    updateHpUI();

    const rawName = document.getElementById('globalPlayerName').value.trim();
    const n = rawName || generateRandomName();
    document.getElementById('globalPlayerName').value = n;
    localStorage.setItem('typingPlayerName', n);

    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('difficultySelect').style.display = 'none';
    document.getElementById('accModeBtn').parentElement.style.display = 'none';
    document.getElementById('playerSetupArea').style.display = 'none';

    document.getElementById('recordDisplay').style.display = 'none';
    document.getElementById('difficultyDescriptionArea').style.display = 'none';

    let count = 3;
    const display = document.getElementById('display');
    display.innerText = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            display.innerText = count;
        } else if (count === 0) {
            display.innerText = "GO!";
        } else {
            clearInterval(interval);
            display.innerText = "";
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

        if (score > highScore) {
            highScore = score;
            localStorage.setItem(`typingHighScore_${currentDifficulty}`, highScore);
            document.getElementById('highScoreText').innerText = notatVal(highScore);
        }
        if (level > maxLevel) {
            maxLevel = level;
            localStorage.setItem(`typingMaxLevel_${currentDifficulty}`, maxLevel);
        }

        const goMain = document.getElementById('gameOverMain');
        document.body.classList.add('game-over-active');
        goMain.style.display = 'block';
        goMain.classList.add('go-slide-in');
        document.getElementById('mainReasonText').innerText = reasonStr;

        document.getElementById('mainFinalScore').innerText = notatVal(score);
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

        if (!bestRecords[modeKey][currentDifficulty] || score > bestRecords[modeKey][currentDifficulty].score) {
            bestRecords[modeKey][currentDifficulty] = {
                score: score,
                level: level,
                avgCps: averageCps,
                chars: sessionChars,
                mistakes: sessionTypos,
                accuracy: accuracy,
                time: realTimeElapsed
            };
        }

        savePlayerStats();

        document.getElementById('mainFinalScore').innerText = notatVal(score);
        document.getElementById('mainFinalLevel').innerText = level;
        document.getElementById('mainSessionMaxCombo').innerText = sessionMaxCombo;
        document.getElementById('mainCharsTyped').innerText = totalCharsTyped;
        document.getElementById('mainAvgCps').innerText = averageCps.toFixed(2);
        document.getElementById('mainMistakes').innerText = sessionTypos;
        document.getElementById('mainAccuracy').innerText = accuracy.toFixed(2) + "%";
        document.getElementById('mainTime').innerText = realTimeElapsed.toFixed(2) + "s";

        const failedHTML = `<span class="text-green-important">${currentTyped}</span><span style="color:#d9534f">${currentWord.substring(currentTyped.length)}</span>`;
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

    document.getElementById('display').innerText = "Press Start to Play!";
    document.getElementById('startBtn').style.display = 'inline-block';
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
    document.getElementById('score').innerText = notatVal(score);

    const item = generateRandomWordFromData();
    currentWord = item.Text;
    const jpTranslation = item.Japanese || "";

    currentTyped = "";
    document.getElementById('wordTranslation').innerText = jpTranslation;
    updateWordDisplay();

    timeLimitBase = (currentWord.length / currentCps) + 1.0;

    isInputLocked = false;
    startTimer();
}

function updateWordDisplay() {
    const display = document.getElementById('wordDisplay');
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
    const targetChar = currentWord[currentTyped.length].toUpperCase();

    // 空白とアンダーバーを同一視して判定
    const isMatch = (inputChar === targetChar) ||
        (targetChar === " " && inputChar === "_") ||
        (targetChar === "_" && inputChar === " ");

    if (isMatch) {
        let actualChar = currentWord[currentTyped.length];
        // 入力済み(currentTyped)の部分は空白をアンダーバーとして保持
        currentTyped += (actualChar === " ") ? "_" : actualChar;
        totalCharsTyped++;
        sessionChars++;
        currentCombo++;
        if (currentCombo > sessionMaxCombo) sessionMaxCombo = currentCombo;
        if (currentCombo > statsMaxCombo) {
            statsMaxCombo = currentCombo;
            savePlayerStats();
        }
        updateComboUI();
        updateWordDisplay();

        if (currentTyped.length === currentWord.length) {
            const multiplier = comboBonus ** Math.max(0, Math.floor((currentCombo - comboStartThreshold) / comboAddThreshold));
            const levelMult = 1.35 ** (level - DIFFICULTIES[currentDifficulty].startLevel);
            const addedScore = Math.round(currentCps * currentWord.length * 10 * multiplier * levelMult);
            score += addedScore;
            addXp(addedScore);
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
    } else {
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

    if (currentCombo > comboStartThreshold - 1) {
        comboTxt.style.display = 'inline';
        comboTxt.innerText = `COMBO: ${currentCombo}`;

        if (currentCombo % comboAddThreshold === 0) {
            const multiplier = comboBonus ** Math.floor(currentCombo / comboAddThreshold);
            const bonusPct = (multiplier - 1) * 100;
            bonusMsg.innerText = `Score bonus +${bonusPct.toFixed(2)}%`;
            if (currentCombo % comboStartThreshold === 0) {
                hp += comboHeal;
                updateHpUI();
            }
        }
    } else {
        comboTxt.style.display = 'none';
        bonusMsg.innerText = '';
    }
}