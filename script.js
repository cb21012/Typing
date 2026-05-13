const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const DIFFICULTIES = {
    'training': { id: 0, cps: 0.01, startLevel: 0 },
    'easy': { id: 1, cps: 1, startLevel: 1 },
    'normal': { id: 2, cps: 2, startLevel: 4 },
    'hard': { id: 3, cps: 4, startLevel: 7 },
    'insane': { id: 4, cps: 6, startLevel: 10 }
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

const accModeCpsMul = 0.8;

const maxHp = 128;
let hp = maxHp;

const damageMistake = 10;
const damageMistakeAcc = 95;
const damageTimeup = 72;
const healSuccess = 4;

const comboThreshold = 10;
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

let bestRecords = {
    'training': null,
    'easy': null,
    'normal': null,
    'hard': null,
    'insane': null
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
    const targetLvl = Math.min(level, 11);
    const pool = typingData.filter(d => d.Lvl === targetLvl);
    if (pool.length === 0) return "ERROR";
    const item = pool[Math.floor(Math.random() * pool.length)];
    return item.Text;
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

    Object.keys(bestRecords).forEach(diff => {
        const saved = localStorage.getItem(`typingBestRound_${diff}`);
        if (saved) {
            bestRecords[diff] = JSON.parse(saved);
        }
    });

    updatePlayerLevelUI();
}

//Lvl
function playerLvlXp(lvl) {
    return 2 * (lvl ** 2) + 10 * lvl + 26;
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

    Object.keys(bestRecords).forEach(diff => {
        if (bestRecords[diff]) {
            localStorage.setItem(`typingBestRound_${diff}`, JSON.stringify(bestRecords[diff]));
        }
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
        bestRecords = { 'training': null, 'easy': null, 'normal': null, 'hard': null, 'insane': null };
        statsMaxCombo = 0;
        loadRecords();
        alert("Records deleted.");
    }
});

document.getElementById('playerLevelContainer').addEventListener('click', () => {
    updateStatsModal();
    document.getElementById('statsModal').classList.add('show');
});

function updateStatsModal() {
    document.getElementById('statsMaxCps').innerText = statsMaxCps.toFixed(2);
    const avgCps = statsTotalTime > 0 ? (statsTotalChars / statsTotalTime) : 0;
    document.getElementById('statsAvgCps').innerText = avgCps.toFixed(2);
    document.getElementById('statsTotalChars').innerText = notatVal(statsTotalChars);
    document.getElementById('statsTotalTypos').innerText = notatVal(statsTotalTypos);
    document.getElementById('statsMaxCombo').innerText = statsMaxCombo;

    const bestList = document.getElementById('bestRecordsContainer');
    bestList.innerHTML = '';
    Object.keys(bestRecords).forEach(diff => {
        const record = bestRecords[diff];
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
        }
    });
});

document.getElementById('accModeBtn').addEventListener('click', () => {
    isAccMode = !isAccMode;
    const btn = document.getElementById('accModeBtn');
    if (isAccMode) {
        btn.classList.add('selected');
        btn.innerText = "Accuracy Mode: On";
    } else {
        btn.classList.remove('selected');
        btn.innerText = "Accuracy Mode: Off";
    }
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

            if (isAccMode) {
                currentCps *= accModeCpsMul;
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

            // Time up penalty: -damageTimeup HP
            hp -= damageTimeup;
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

        // Check Best Round for Difficulty
        if (!bestRecords[currentDifficulty] || score > bestRecords[currentDifficulty].score) {
            bestRecords[currentDifficulty] = {
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
        resetGuide();
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

    currentWord = generateRandomWordFromData();
    currentTyped = "";

    timeLimitBase = (currentWord.length / currentCps) + 1.0;

    updateWordDisplay();
    isInputLocked = false;
    startTimer();
}

function updateWordDisplay() {
    const display = document.getElementById('wordDisplay');
    display.innerHTML = `<span class="text-green-important">${currentTyped}</span><span>${currentWord.substring(currentTyped.length)}</span>`;

    updateKeyboardHighlight();
}

function updateKeyboardHighlight() {
    resetGuide();
    if (isPlaying && !isInputLocked && currentWord[currentTyped.length]) {
        showGuide(currentWord[currentTyped.length].toUpperCase());
    }
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

    if (inputChar === targetChar) {
        currentTyped += currentWord[currentTyped.length];
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
            const multiplier = comboBonus ** Math.floor(currentCombo / comboThreshold);
            const addedScore = Math.round(currentCps * currentWord.length * 10 * multiplier);
            score += addedScore;
            addXp(addedScore);
            questionsSolved++;
            nxtSound();

            // Success reward: +healSuccess HP
            hp = Math.min(maxHp, hp + healSuccess);
            updateHpUI();

            if (questionsSolved % 3 === 0) {
                level++;
                currentCps += 0.05;
                currentCps *= 1.04;
            }
            nextQuestion();
        }
    } else {
        // Mistake penalty: -damageMistake HP
        hp -= isAccMode ? damageMistakeAcc : damageMistake;
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
    osc.frequency.setValueAtTime(820, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.2);

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

// ── Virtual Keyboard Logic ──

const KEY_MAP = {
    'Tab': ['Tab'],
    'CLK': ['CLK'],
    'LCtrl': ['LCtrl'],
    'RCtrl': ['RCtrl'],
    'LAlt': ['LAlt'],
    'RAlt': ['RAlt'],
    'LShift': ['LShift'],
    'RShift': ['RShift'],
    'Enter': ['Enter'],
    'NumEnter': ['NumEnter'],
    'Bs': ['Bs'],
    'Left': ['Num4'],
    'Right': ['Num6'],
    'Up': ['Num8'],
    'Down': ['Num2'],
    'Space': ['Space'],
    'Esc': ['Esc'],
};

const NUMPAD_CHARS = {
    '0': 'Num0', '1': 'Num1', '2': 'Num2', '3': 'Num3', '4': 'Num4',
    '5': 'Num5', '6': 'Num6', '7': 'Num7', '8': 'Num8', '9': 'Num9',
    '.': 'NumDot', '/': 'Num/', '*': 'Num*', '-': 'Num-', '+': 'Num+',
};

function showGuide(key) {
    key = key.toUpperCase();
    if (KEY_MAP[key]) {
        KEY_MAP[key].forEach(dataKey => {
            document.querySelectorAll('.key').forEach(el => {
                if (el.dataset.keys === dataKey) el.classList.add('highlight');
            });
        });
        return;
    }

    document.querySelectorAll('.key').forEach(el => {
        const dk = el.dataset.keys || '';
        // 1. Exact match (e.g. "A" === "A")
        if (dk === key) {
            el.classList.add('highlight');
            return;
        }
        // 2. Pair match (e.g. "1!" contains "1" or "!")
        // Exclude named special keys by checking length or content
        const isSpecial = dk.length > 2; 
        if (!isSpecial && dk.includes(key)) {
            el.classList.add('highlight');
        }
    });

    if (NUMPAD_CHARS[key]) {
        document.querySelectorAll('.key').forEach(el => {
            if (el.dataset.keys === NUMPAD_CHARS[key]) el.classList.add('highlight');
        });
    }
}

function resetGuide() {
    document.querySelectorAll('.key.highlight').forEach(el => el.classList.remove('highlight'));
}

function updateComboUI() {
    const comboTxt = document.getElementById('comboText');
    const bonusMsg = document.getElementById('comboBonusMsg');

    if (currentCombo > comboThreshold - 1) {
        comboTxt.style.display = 'inline';
        comboTxt.innerText = `COMBO: ${currentCombo}`;

        if (currentCombo % comboThreshold === 0) {
            const multiplier = comboBonus ** Math.floor(currentCombo / comboThreshold);
            const bonusPct = (multiplier - 1) * 100;
            bonusMsg.innerText = `Score bonus +${bonusPct.toFixed(2)}%`;
            hp += comboHeal;
            updateHpUI();
        }
    } else {
        comboTxt.style.display = 'none';
        bonusMsg.innerText = '';
    }
}