const WHITE = 0; const BLACK = 1;
const API_URL = 'leaderboard.php';

const MODES = {
    'short': { rows: 4, cols: 8, name: '4x8', scale: 0.42 },
    'classic': { rows: 8, cols: 8, name: '8x8', scale: 1.0 },
    'long': { rows: 16, cols: 8, name: '16x8', scale: 2.3 },
    'double': { rows: 8, cols: 8, name: 'double', scale: 1.1 },
    'ultra': { rows: 32, cols: 8, name: '32x8', scale: 5.0 },
    'zebra': { rows: 8, cols: 8, name: 'Zebra', scale: 1.0 },
    '2step': { rows: 8, cols: 8, name: '2-Step', scale: 1.2 },
    'split': { rows: 8, cols: 8, name: 'Split', scale: 1.0 },
    'consistency': { rows: 12, cols: 8, name: 'Consistency', scale: 1.5 }
};

const BASE_TIERS = [
    { baseLimit: 6.0, name: "S", color: "text-rose-500" },
    { baseLimit: 7.0, name: "A+", color: "text-red-500" },
    { baseLimit: 8.0, name: "A", color: "text-orange-500" },
    { baseLimit: 10.0, name: "B", color: "text-blue-500" },
    { baseLimit: 12.0, name: "C", color: "text-teal-500" },
    { baseLimit: 15.0, name: "D", color: "text-yellow-500" },
    { baseLimit: 9999, name: "F", color: "text-gray-400" }
];

const RANK_DISTRIBUTION = [
    { name: "Netherite", color: "#4F46E5", percentile: 0.01, minScore: 900000 },
    { name: "Diamond", color: "#3B82F6", percentile: 0.05, minScore: 660000 },
    { name: "Gold II", color: "#F59E0B", percentile: 0.15, minScore: 100000 },
    { name: "Gold I", color: "#FBBF24", percentile: 0.30, minScore: 50000 },
    { name: "Silver", color: "#C0C0C0", percentile: 0.50, minScore: 25000 },
    { name: "Bronze", color: "#CD7F32", percentile: 0.75, minScore: 10000 },
    { name: "Honorable", color: "#60A5FA", percentile: 0.95, minScore: 5000 },
    { name: "Unranked", color: "#9CA3AF", percentile: 1.00, minScore: 0 }
];

const BLOCKED_WORDS = ['NIGG', 'NIGGER', 'NIGGA', 'FAGGOT', 'FAG'];

let currentModeKey = 'classic';
let GRID_ROWS = 8; let GRID_COLS = 8;
let grid = []; let currentRow = 0; let currentCol = 0;
let isGameActive = false; let startTime = 0; let timerInterval = null;
let lastFinishedTime = 0;
let currentLbType = 'time';

// Progress State
let currentLevel = 1; let currentXP = 0; let xpToNextLevel = 2;
let totalGamesPlayed = 0;
let totalRowsCleared = 0;

let penaltyTime = 0;
let lastPlayerName = '';
let canonicalPlayerName = '';

// Key Mapping State - FOR REMAPPING ONLY
let isRemappingMode = false;
let remapTarget = null; // 'white', 'black', or 'undo'
let remapWhiteKey = '1';
let remapBlackKey = '0';
let remapUndoKey = 'Backspace';
let mappedKeys = new Set(); // Tracks which keys are already mapped
const keyMap = new Map(); // Stores key to action mappings

// KPS Tracking
let totalClicks = 0;
let kpsDisplay = document.getElementById('kps-display');
let kpsValue = document.querySelector('.kps-value');
let modalKps = document.getElementById('modal-kps');

// Skill Rank State
let currentSkillScore = 0;
let currentRank = 'Unranked';
let currentRankColor = '#9ca3af';
let rankPosition = '--';

const gridContainer = document.getElementById('game-grid');
const timerDisplay = document.getElementById('timer');
const statusMessage = document.getElementById('status-message');
const successModal = document.getElementById('success-modal');
const modalTime = document.getElementById('modal-time');
const modalRank = document.getElementById('modal-rank');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const leaderboardBody = document.getElementById('leaderboard-body');
const modalPointsPreview = document.getElementById('modal-points-preview');
const levelDisplay = document.getElementById('level-display');
const xpText = document.getElementById('xp-text');
const xpBarFill = document.getElementById('xp-bar-fill');
const syncStatus = document.getElementById('sync-status');
const rankCountdownEl = document.getElementById('rank-countdown');
const totalPlayersEl = document.getElementById('total-players');

// Skill rank elements
const rankBadge = document.getElementById('rank-badge');
const rankPositionEl = document.getElementById('rank-position');
const skillScoreValue = document.getElementById('skill-score-value');
const rankProgressBar = document.getElementById('rank-progress-bar');
const xpFactorEl = document.getElementById('xp-factor');
const rankPointsEl = document.getElementById('rank-points');
const rankDistributionSection = document.getElementById('rank-distribution-section');
const rankDistributionList = document.getElementById('rank-distribution-list');

// Error elements
const duplicateError = document.getElementById('duplicate-error');
const slurError = document.getElementById('slur-error');

// Modal elements
const remapModal = document.getElementById('remap-modal');
const remapErrorMessage = document.getElementById('remap-error-message');

// Collapsible career stats
const careerStatsContent = document.getElementById('career-stats-content');
const collapseIcon = document.querySelector('.collapse-icon');

// Initialize mapped keys with default values
function initMappedKeys() {
    mappedKeys.clear();
    keyMap.clear();
    mappedKeys.add(remapWhiteKey);
    mappedKeys.add(remapBlackKey);
    mappedKeys.add(remapUndoKey);
    keyMap.set(remapWhiteKey, 'White');
    keyMap.set(remapBlackKey, 'Black');
    keyMap.set(remapUndoKey, 'Undo');
}

// Page navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const selectedPage = document.getElementById(pageId + '-page');
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.textContent.trim().toLowerCase().replace(/\s+/g, '') === pageId) {
            link.classList.add('active');
        }
    });

    // If home page, ensure game works
    if (pageId === 'home') {
        document.body.classList.add('game-active');
    } else {
        document.body.classList.remove('game-active');
    }
}

// Mobile menu toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    mobileMenu.classList.toggle('open');
    hamburgerBtn.classList.toggle('open');
}

// Theme toggle
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
}

function toggleCareerStats() {
    if (careerStatsContent.style.maxHeight === '0px' || !careerStatsContent.style.maxHeight) {
        careerStatsContent.style.maxHeight = careerStatsContent.scrollHeight + 'px';
        collapseIcon.classList.remove('collapsed');
    } else {
        careerStatsContent.style.maxHeight = '0px';
        collapseIcon.classList.add('collapsed');
    }
}

function createCanonicalName(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 15);
}

// REMAPPING FUNCTIONS
function startRemapping(target) {
    if (!isGameActive) {
        alert('Start a game first!');
        return;
    }
    isRemappingMode = true;
    remapTarget = target;
    updateStatus(`Press any key to remap ${target}...`, null);
}

function checkKeyConflict(key, target) {
    if (mappedKeys.has(key)) {
        const existingAction = keyMap.get(key);
        if (existingAction !== target) {
            // Show remap modal with error
            remapErrorMessage.textContent = `⚠️ Key '${key}' already mapped to ${existingAction}!`;
            remapModal.classList.add('open');
            return true;
        }
    }
    return false;
}

function applyRemap(key) {
    if (!isRemappingMode || !remapTarget) return false;

    // Remove old mapping
    let oldKey;
    if (remapTarget === 'White') {
        oldKey = remapWhiteKey;
        remapWhiteKey = key;
    } else if (remapTarget === 'Black') {
        oldKey = remapBlackKey;
        remapBlackKey = key;
    } else if (remapTarget === 'Undo') {
        oldKey = remapUndoKey;
        remapUndoKey = key;
    }

    // Update mapped keys
    mappedKeys.delete(oldKey);
    mappedKeys.add(key);
    keyMap.delete(oldKey);
    keyMap.set(key, remapTarget);

    // updateStatus(`✓ ${remapTarget} remapped to '${key}'`, true);

    // Save to localStorage
    saveRemapSettings();

    isRemappingMode = false;
    remapTarget = null;
    return true;
}

function saveRemapSettings() {
    localStorage.setItem('remapWhiteKey', remapWhiteKey);
    localStorage.setItem('remapBlackKey', remapBlackKey);
    localStorage.setItem('remapUndoKey', remapUndoKey);
}

function loadRemapSettings() {
    const savedWhite = localStorage.getItem('remapWhiteKey');
    const savedBlack = localStorage.getItem('remapBlackKey');
    const savedUndo = localStorage.getItem('remapUndoKey');

    if (savedWhite) remapWhiteKey = savedWhite;
    if (savedBlack) remapBlackKey = savedBlack;
    if (savedUndo) remapUndoKey = savedUndo;

    initMappedKeys();
}

function closeRemapModal() {
    remapModal.classList.remove('open');
}

function getOrdinalSuffix(n) {
    if (n % 100 >= 11 && n % 100 <= 13) return 'th';
    switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

function displayRankDistribution(skillData) {
    if (!skillData || skillData.length === 0) {
        rankDistributionSection.style.display = 'none';
        return;
    }

    rankDistributionSection.style.display = 'block';
    rankDistributionList.innerHTML = '';

    const sortedData = [...skillData].sort((a, b) => b.stat - a.stat);
    const totalPlayers = sortedData.length;

    RANK_DISTRIBUTION.forEach((rank, index) => {
        const playerIndex = Math.floor(totalPlayers * rank.percentile) - 1;
        const player = sortedData[Math.max(0, playerIndex)];
        const scoreAtPercentile = player ? player.stat : 0;
        const percentage = (rank.percentile - (index > 0 ? RANK_DISTRIBUTION[index - 1].percentile : 0)) * 100;

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center';
        div.innerHTML = `
                    <div class="flex items-center gap-1">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${rank.color}"></div>
                        <span class="font-bold" style="color: ${rank.color}">${rank.name}</span>
                    </div>
                    <div class="text-gray-600">
                        <span class="font-bold">${scoreAtPercentile.toLocaleString()}</span>
                        <span class="text-gray-400 ml-1">(${percentage.toFixed(1)}%)</span>
                    </div>
                `;
        rankDistributionList.appendChild(div);
    });
}

function blockNumpadKeys(e) {
    if (e.keyCode >= 96 && e.keyCode <= 111) {
        e.preventDefault();
        return false;
    }

    const numpadKeys = [
        'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4',
        'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
        'NumpadMultiply', 'NumpadAdd', 'NumpadSubtract',
        'NumpadDecimal', 'NumpadDivide'
    ];

    if (numpadKeys.includes(e.key)) {
        e.preventDefault();
        return false;
    }

    return true;
}

function containsSlur(name) {
    const nameUpper = name.toUpperCase();
    for (const word of BLOCKED_WORDS) {
        if (nameUpper.includes(word)) {
            return true;
        }
    }
    return false;
}

function detectMobile() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
        document.getElementById('mobile-controls').style.display = 'flex';
        document.getElementById('mobile-reset-btn').classList.remove('hidden');
        document.getElementById('desktop-controls').classList.add('hidden');

        const blackBtn = document.getElementById('mobile-black-btn');
        const whiteBtn = document.getElementById('mobile-white-btn');
        const resetBtn = document.getElementById('mobile-reset-btn');
        const backspaceBtn = document.getElementById('mobile-backspace-btn');

        blackBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(BLACK); blackBtn.classList.add('scale-95'); });
        blackBtn.addEventListener('touchend', () => blackBtn.classList.remove('scale-95'));
        whiteBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(WHITE); whiteBtn.classList.add('scale-95'); });
        whiteBtn.addEventListener('touchend', () => whiteBtn.classList.remove('scale-95'));
        resetBtn.addEventListener('click', initializeGame);
        backspaceBtn.addEventListener('click', handleBackspace);
    }
}

function loadStats() {
    totalGamesPlayed = parseInt(localStorage.getItem('totalGamesPlayed') || '0');
    totalRowsCleared = parseInt(localStorage.getItem('totalRowsCleared') || '0');
    lastPlayerName = localStorage.getItem('lastPlayerName') || '';
    canonicalPlayerName = createCanonicalName(lastPlayerName);

    document.getElementById('player-display-name').textContent = lastPlayerName || 'PLAYER';
    updateStatsPanel();

    if (lastPlayerName) {
        syncUserData(lastPlayerName);
    }
}

function updateStatsPanel() {
    document.getElementById('stat-total-games').textContent = totalGamesPlayed.toLocaleString();
    document.getElementById('stat-total-lines').textContent = totalRowsCleared.toLocaleString();
    document.getElementById('stat-total-xp').textContent = currentXP.toLocaleString();

    const modes = ['short', 'classic', 'long', 'double', 'ultra', 'zebra', '2step', 'split', 'consistency'];
    modes.forEach(m => {
        const best = localStorage.getItem(`bestTime_${m}`);
        const el = document.getElementById(`stat-best-${m}`);
        if (el) {
            el.textContent = best ? parseFloat(best).toFixed(3) + 's' : '--';
        }
    });
}

async function syncUserData(name) {
    try {
        const canonicalName = createCanonicalName(name);
        const url = `${API_URL}?action=stats&name=${canonicalName}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data && data.user && data.user.xp) {
            const serverXP = parseInt(data.user.xp);
            const serverGames = parseInt(data.user.games);
            const serverRows = parseInt(data.user.rows);

            if (!isNaN(serverXP) && serverXP > currentXP) {
                currentXP = serverXP;
                currentLevel = getLevelFromTotalXP(currentXP);
                saveXPState();
                updateXPDisplay();
            }

            if (!isNaN(serverGames) && serverGames > totalGamesPlayed) {
                totalGamesPlayed = serverGames;
                localStorage.setItem('totalGamesPlayed', totalGamesPlayed);
            }

            if (!isNaN(serverRows) && serverRows > totalRowsCleared) {
                totalRowsCleared = serverRows;
                localStorage.setItem('totalRowsCleared', totalRowsCleared);
            }

            updateStatsPanel();

            syncStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Data Synced`;
            syncStatus.classList.add('text-green-600');

            updateSkillRank();
        }
    } catch (e) { console.log("Database sync skipped", e); }
}

function loadXPState() {
    currentLevel = parseInt(localStorage.getItem('userLevel') || '1');
    currentXP = parseInt(localStorage.getItem('userXP') || '0');
    xpToNextLevel = currentLevel * (currentLevel + 1);
}
function saveXPState() {
    localStorage.setItem('userLevel', currentLevel.toString());
    localStorage.setItem('userXP', currentXP.toString());
}
function updateXPDisplay() {
    xpToNextLevel = currentLevel * (currentLevel + 1);

    let previousLevelXP = 0;
    for (let i = 1; i < currentLevel; i++) { previousLevelXP += i * (i + 1); }

    let xpForCurrent = 0;
    for (let i = 1; i < currentLevel; i++) xpForCurrent += i * (i + 1);

    let xpForNext = xpForCurrent + (currentLevel * (currentLevel + 1));

    let progressInLevel = currentXP - xpForCurrent;
    let neededInLevel = xpForNext - xpForCurrent;

    let percentage = Math.min(100, Math.max(0, (progressInLevel / neededInLevel) * 100));

    levelDisplay.textContent = `Lv. ${currentLevel}`;
    xpText.textContent = `${parseInt(progressInLevel)} / ${neededInLevel} XP`;
    document.getElementById('xp-req-text').textContent = (neededInLevel - progressInLevel);
    xpBarFill.style.width = `${percentage}%`;
}

function checkLevelUp(finalTime, mode) {
    const xpGained = calculatePointsJS(finalTime, mode);
    currentXP += xpGained;

    let cost = currentLevel * (currentLevel + 1);
    let xpForNext = 0;
    for (let i = 1; i <= currentLevel; i++) xpForNext += i * (i + 1);

    while (true) {
        let xpNeededForNext = 0;
        for (let i = 1; i <= currentLevel; i++) xpNeededForNext += i * (i + 1);

        if (currentXP >= xpNeededForNext) {
            currentLevel++;
        } else {
            break;
        }
    }

    saveXPState();
    updateXPDisplay();

    const xpEl = document.getElementById('stat-total-xp');
    xpEl.classList.add('text-green-500', 'scale-110');
    setTimeout(() => xpEl.classList.remove('text-green-500', 'scale-110'), 500);

    return xpGained;
}

function getLevelFromTotalXP(totalXP) {
    let lvl = 1;
    while (true) {
        let cost = lvl * (lvl + 1);
        if (totalXP >= cost) {
            totalXP -= cost;
            lvl++;
        } else {
            return lvl;
        }
    }
}

function setMode(modeKey) {
    currentModeKey = modeKey;
    GRID_ROWS = MODES[modeKey].rows;
    GRID_COLS = MODES[modeKey].cols;

    ['short', 'classic', 'long', 'double', 'ultra', 'zebra', '2step', 'split', 'consistency'].forEach(k => {
        const btn = document.getElementById(`btn-${k}`);
        if (!btn) return;

        btn.className = "py-3 text-sm font-bold rounded-lg border transition-all shadow-sm opacity-60 grayscale hover:opacity-100 hover:grayscale-0";

        if (k === modeKey) {
            btn.className = "py-3 text-sm font-bold rounded-lg border-2 shadow-md transform scale-105 z-10 ";
            if (k === 'ultra') btn.classList.add('bg-purple-600', 'text-white', 'border-purple-700');
            else if (k === 'double') btn.classList.add('bg-indigo-600', 'text-white', 'border-indigo-700');
            else if (['zebra', '2step', 'split', 'consistency'].includes(k)) btn.classList.add('bg-gray-800', 'text-white', 'border-black');
            else btn.classList.add('bg-blue-600', 'text-white', 'border-blue-700');
        } else {
            if (k === 'ultra') btn.classList.add('text-purple-700', 'bg-purple-50', 'border-purple-200');
            else if (k === 'double') btn.classList.add('text-indigo-700', 'bg-indigo-50', 'border-indigo-200');
            else btn.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
        }
    });

    const bsHint = document.getElementById('backspace-hint');
    const mobileBsBtn = document.getElementById('mobile-backspace-btn');
    if (modeKey === 'ultra') {
        if (bsHint) bsHint.classList.remove('hidden');
        if (mobileBsBtn) mobileBsBtn.classList.remove('hidden');
    } else {
        if (bsHint) bsHint.classList.add('hidden');
        if (mobileBsBtn) mobileBsBtn.classList.add('hidden');
    }

    if (currentLbType === 'time') refreshLeaderboard();

    const gridEl = document.getElementById('game-grid');
    if (modeKey === 'long' || modeKey === 'ultra' || modeKey === 'consistency') {
        gridEl.classList.add('overflow-y-auto', 'custom-scroll');
        gridEl.style.maxHeight = '400px';
    } else {
        gridEl.classList.remove('overflow-y-auto', 'custom-scroll');
        gridEl.style.maxHeight = 'none';
    }

    initializeGame();
}

function previewPattern() {
    if (isGameActive && startTime > 0) return;

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const index = r * GRID_COLS + c;
            const cell = gridContainer.children[index];
            if (!cell) continue;

            let correctValue = getCorrectValue(r, c);

            cell.classList.remove('bg-gray-200', 'bg-white', 'bg-black');
            cell.classList.add(correctValue === BLACK ? 'bg-black' : 'bg-white');
        }
    }

    setTimeout(() => {
        if (!isGameActive || startTime === 0) {
            for (let i = 0; i < gridContainer.children.length; i++) {
                const cell = gridContainer.children[i];
                cell.classList.remove('bg-white', 'bg-black');
                cell.classList.add('bg-gray-200');
            }
        }
    }, 1000);
}

function getCorrectValue(r, c) {
    if (currentModeKey === 'double') return ((Math.floor(r / 2) + Math.floor(c / 2)) % 2 === 0 ? BLACK : WHITE);
    if (currentModeKey === 'zebra') return (r % 2 === 0 ? BLACK : WHITE);
    if (currentModeKey === '2step') return (Math.floor(c / 2) % 2 === 0 ? BLACK : WHITE);
    if (currentModeKey === 'split') return (c < (GRID_COLS / 2) ? BLACK : WHITE);
    if (currentModeKey === 'consistency') return (c % 2 === 0 ? BLACK : WHITE);
    return ((r + c) % 2 === 0 ? BLACK : WHITE);
}

function initializeGame() {
    successModal.classList.remove('open');
    grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    currentRow = 0; currentCol = 0; isGameActive = true; startTime = 0;
    penaltyTime = 0;
    totalClicks = 0;
    kpsDisplay.classList.add('hidden');
    renderGrid();
    updateTimerDisplay(0);
    updateStatus("Press '0' to start");
    highlightCell(0, 0);
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    loadXPState();
    updateXPDisplay();
    loadStats();
    loadRemapSettings();

    const bestKey = `bestTime_${currentModeKey}`;
    const localBest = localStorage.getItem(bestKey);
    const winDisplay = document.getElementById('winning-time');
    if (localBest) {
        winDisplay.innerHTML = `<span class="opacity-70">BEST:</span> ${parseFloat(localBest).toFixed(3)}s`;
        winDisplay.classList.remove('hidden');
    } else { winDisplay.classList.add('hidden'); }

    updateSkillRank();
    checkPendingStatus();
}

function renderGrid() {
    gridContainer.innerHTML = '';
    gridContainer.style.gridTemplateColumns = `repeat(${GRID_COLS}, 1fr)`;
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell', 'bg-gray-200');
            gridContainer.appendChild(cell);
        }
    }
}

function handleInput(colorValue) {
    if (!isGameActive) return;
    if (currentRow === 0 && currentCol === 0 && startTime === 0) { startTimer(); updateStatus("GO!"); }
    const index = currentRow * GRID_COLS + currentCol;
    const cell = gridContainer.children[index];
    cell.classList.remove('bg-gray-200', 'bg-white', 'bg-black');
    cell.classList.add(colorValue === BLACK ? 'bg-black' : 'bg-white');
    grid[currentRow][currentCol] = colorValue;
    currentCol++;
    totalClicks++;
    if (currentCol >= GRID_COLS) { currentCol = 0; currentRow++; }
    if (currentRow >= GRID_ROWS) endGame();
    else highlightCell(currentRow, currentCol);
}

function handleBackspace() {
    if (!isGameActive || currentModeKey !== 'ultra') return;
    if (currentRow === 0 && currentCol === 0) return;
    currentCol--;
    if (currentCol < 0) { currentRow--; currentCol = GRID_COLS - 1; }
    if (currentRow < 0) { currentRow = 0; currentCol = 0; }
    const index = currentRow * GRID_COLS + currentCol;
    const cell = gridContainer.children[index];
    cell.classList.remove('bg-black', 'bg-white');
    cell.classList.add('bg-gray-200');
    grid[currentRow][currentCol] = null;
    penaltyTime += 0.25;
    totalClicks++;
    highlightCell(currentRow, currentCol);

    timerDisplay.classList.add('text-red-500');
    setTimeout(() => timerDisplay.classList.remove('text-red-500'), 100);
}

function endGame() {
    isGameActive = false;
    clearInterval(timerInterval);
    const finalTime = ((performance.now() - startTime) / 1000) + penaltyTime;
    updateTimerDisplay(finalTime);
    document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('highlight-current'));

    let mismatches = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            let correctValue = getCorrectValue(r, c);
            if (grid[r][c] !== correctValue) mismatches++;
        }
    }
    if (mismatches === 0) {
        updateStatus("Success!", true);
        const xp = checkLevelUp(finalTime, currentModeKey);

        totalGamesPlayed++;
        totalRowsCleared += MODES[currentModeKey].rows;

        localStorage.setItem('totalGamesPlayed', totalGamesPlayed);
        localStorage.setItem('totalRowsCleared', totalRowsCleared);

        const bestKey = `bestTime_${currentModeKey}`;
        const currentBest = localStorage.getItem(bestKey);
        if (!currentBest || finalTime < parseFloat(currentBest)) {
            localStorage.setItem(bestKey, finalTime);
        }
        updateStatsPanel();
        showSuccessModal(finalTime, xp);
    } else { updateStatus(`Fail - ${mismatches} errors`, false); }
}

async function checkDuplicateUsername(name) {
    const canonicalName = createCanonicalName(name);
    if (!canonicalName || canonicalName === '') {
        duplicateError.classList.add('hidden');
        slurError.classList.add('hidden');
        return false;
    }

    if (containsSlur(name)) {
        slurError.classList.remove('hidden');
        duplicateError.classList.add('hidden');
        return true;
    } else {
        slurError.classList.add('hidden');
    }

    try {
        const url = `${API_URL}?action=check_duplicate&name=${encodeURIComponent(canonicalName)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data && data.duplicate === true) {
            duplicateError.classList.remove('hidden');
            return true;
        } else {
            duplicateError.classList.add('hidden');
            return false;
        }
    } catch (e) {
        console.error("Error checking duplicate:", e);
        duplicateError.classList.add('hidden');
        return false;
    }
}

function showSuccessModal(finalTime, xp) {
    lastFinishedTime = finalTime;
    modalTime.textContent = `${finalTime.toFixed(3)}s`;

    const totalCells = GRID_ROWS * GRID_COLS;
    const kps = totalClicks / finalTime;
    kpsDisplay.classList.remove('hidden');
    kpsValue.textContent = kps.toFixed(2);
    modalKps.textContent = `KPS: ${kps.toFixed(2)}`;

    const storedName = localStorage.getItem('lastPlayerName');
    if (storedName) {
        playerNameInput.value = storedName;
        playerNameInput.disabled = true;
        if (containsSlur(storedName)) {
            slurError.classList.remove('hidden');
            duplicateError.classList.add('hidden');
        } else {
            slurError.classList.add('hidden');
            duplicateError.classList.add('hidden');
        }
    } else {
        playerNameInput.value = '';
        playerNameInput.disabled = false;
        duplicateError.classList.add('hidden');
        slurError.classList.add('hidden');
    }

    modalPointsPreview.textContent = `+${xp} XP`;
    document.getElementById('modal-mode-label').textContent = MODES[currentModeKey].name;

    const scale = MODES[currentModeKey].scale;
    const tier = BASE_TIERS.find(t => finalTime < t.baseLimit * scale) || BASE_TIERS[BASE_TIERS.length - 1];
    modalRank.textContent = tier.name;
    modalRank.className = `text-8xl font-black italic rank-pop drop-shadow-md mb-2 ${tier.color}`;

    saveScoreBtn.disabled = false;
    saveScoreBtn.textContent = "SAVE SCORE";
    saveScoreBtn.classList.remove('bg-gray-500');
    saveScoreBtn.classList.add('bg-gray-900');

    successModal.classList.add('open');

    if (!playerNameInput.disabled && !detectMobileCheck()) {
        playerNameInput.focus();
    }

    if (!storedName) {
        playerNameInput.addEventListener('input', async function () {
            const name = this.value.trim();
            if (name.length >= 1) {
                await checkDuplicateUsername(name);
            } else {
                duplicateError.classList.add('hidden');
                slurError.classList.add('hidden');
            }
        });
    }
}

function calculatePointsJS(time, mode) {
    let adjTime = time;
    if (mode === 'short') adjTime = time * 2.4;
    if (mode === 'long') adjTime = time * 0.44;
    if (mode === 'ultra') adjTime = time * 0.21;
    if (mode === 'consistency') adjTime = time * 0.95;

    let score = 0;
    if (adjTime < 4.35) score = 500;
    else score = 75 / (adjTime - 4.2);

    if (mode === 'short') score *= 0.5;
    if (mode === 'long') score *= 5.0;
    if (mode === 'double') score *= 2.0;
    if (mode === 'ultra') score *= 12.0;
    if (mode === 'consistency') score *= 1.5;

    return Math.ceil(Math.max(0, score));
}

function setLeaderboardType(type) {
    currentLbType = type;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${type}`).classList.add('active');

    const formula = document.getElementById('skill-formula');
    if (formula) formula.style.display = (type === 'skill') ? 'block' : 'none';

    const header = document.getElementById('lb-header-val');
    if (type === 'time') header.textContent = 'Time';
    else if (type === 'skill') header.textContent = 'Score';
    else if (type === 'points') header.textContent = 'XP';
    else if (type === 'level') header.textContent = 'Lv';
    refreshLeaderboard();
}

async function updateSkillRank() {
    const name = localStorage.getItem('lastPlayerName');
    if (!name || name === '') {
        skillScoreValue.textContent = '--';
        rankBadge.textContent = 'Unranked';
        rankBadge.style.backgroundColor = '#9ca3af';
        rankPositionEl.textContent = 'Sign in to see rank';
        xpFactorEl.textContent = '--';
        rankPointsEl.textContent = '--';
        rankProgressBar.style.width = '0%';
        return;
    }

    const searchName = createCanonicalName(name);

    try {
        const url = `${API_URL}?type=skill&mode=${currentModeKey}`;
        const res = await fetch(url);
        const skillData = await res.json();

        if (!skillData || !skillData.length) {
            showNoRankData();
            return;
        }

        try {
            const rankUrl = `${API_URL}?action=get_ranks`;
            const rankRes = await fetch(rankUrl);
            const rankConfig = await rankRes.json();

            if (rankConfig && rankConfig.length > 0) {
                displayRankDistribution(skillData, rankConfig);
            }
        } catch (e) {
            console.error("Error fetching rank config:", e);
            displayFallbackDistribution(skillData);
        }

        const playerEntry = skillData.find(entry => entry.name === searchName);

        if (playerEntry) {
            currentSkillScore = playerEntry.stat;
            currentRank = playerEntry.rank_name || 'Unranked';
            currentRankColor = playerEntry.rank_color || '#9ca3af';

            const playerIndex = skillData.findIndex(entry => entry.name === searchName);
            const position = playerIndex + 1;
            const suffix = getOrdinalSuffix(position);
            rankPosition = `${position}${suffix} of ${skillData.length} players`;

            const xpContribution = Math.floor(playerEntry.xp * 0.25) || 0;
            const rankPoints = currentSkillScore - xpContribution;

            skillScoreValue.textContent = currentSkillScore.toLocaleString();
            rankBadge.textContent = currentRank;
            rankBadge.style.backgroundColor = currentRankColor;

            xpFactorEl.textContent = xpContribution.toLocaleString();
            rankPointsEl.textContent = rankPoints.toLocaleString();

            try {
                const rankUrl = `${API_URL}?action=get_ranks`;
                const rankRes = await fetch(rankUrl);
                const rankConfig = await rankRes.json();

                if (rankConfig && rankConfig.length > 0) {
                    let currentRankInfo = rankConfig[0];
                    let nextRankInfo = null;

                    for (let i = 0; i < rankConfig.length; i++) {
                        if (currentSkillScore >= rankConfig[i].min_score) {
                            currentRankInfo = rankConfig[i];
                            if (i + 1 < rankConfig.length) {
                                nextRankInfo = rankConfig[i + 1];
                            }
                        }
                    }

                    if (nextRankInfo) {
                        const progressInCurrentRank = currentSkillScore - currentRankInfo.min_score;
                        const totalNeededForNextRank = nextRankInfo.min_score - currentRankInfo.min_score;
                        const progressPercent = Math.min(100, Math.max(0, (progressInCurrentRank / totalNeededForNextRank) * 100));

                        rankProgressBar.style.width = `${progressPercent}%`;
                        rankProgressBar.style.backgroundColor = currentRankColor;

                        const positionPercent = (100 - ((skillData.length - playerIndex) / skillData.length * 100)).toFixed(1);

                        rankPositionEl.innerHTML = `${position}${suffix} / ${skillData.length}${getOrdinalSuffix(skillData.length)} (${positionPercent}%)<br>${Math.floor(progressPercent)}% to next`;
                    } else {
                        rankProgressBar.style.width = '100%';
                        rankProgressBar.style.backgroundColor = currentRankColor;

                        const positionPercent = (100 - ((skillData.length - playerIndex) / skillData.length * 100)).toFixed(1);

                        rankPositionEl.innerHTML = `${position}${suffix} / ${skillData.length}${getOrdinalSuffix(skillData.length)} (${positionPercent}%)<br>Max Rank`;
                    }
                } else {
                    calculateFallbackProgress(playerIndex, position, suffix, skillData.length);
                }
            } catch (e) {
                console.error("Error fetching rank config:", e);
                calculateFallbackProgress(playerIndex, position, suffix, skillData.length);
            }

        } else {
            showNoRankData();
        }

    } catch (e) {
        console.error("Error fetching skill rank:", e);
        skillScoreValue.textContent = 'Error';
        rankPositionEl.textContent = 'Connection failed';
    }
}

function displayRankDistribution(skillData, rankConfig) {
    if (!skillData || skillData.length === 0 || !rankConfig || rankConfig.length === 0) {
        rankDistributionSection.style.display = 'none';
        return;
    }

    rankDistributionSection.style.display = 'block';
    rankDistributionList.innerHTML = '';

    const sortedData = [...skillData].sort((a, b) => b.stat - a.stat);
    const totalPlayers = sortedData.length;

    const sortedRanks = [...rankConfig].sort((a, b) => b.min_score - a.min_score);

    sortedRanks.forEach((rank, index) => {
        let playersInRank = 0;
        if (index === 0) {
            playersInRank = sortedData.filter(p => p.stat >= rank.min_score).length;
        } else {
            const nextHigherMin = sortedRanks[index - 1].min_score;
            playersInRank = sortedData.filter(p => p.stat >= rank.min_score && p.stat < nextHigherMin).length;
        }

        const playersAtOrAbove = sortedData.filter(p => p.stat >= rank.min_score).length;
        const percentage = (playersAtOrAbove / totalPlayers * 100).toFixed(1);

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center mb-1';
        div.innerHTML = `
                    <div class="flex items-center gap-1">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${rank.color_hex || '#9ca3af'}"></div>
                        <span class="font-bold text-[10px]" style="color: ${rank.color_hex || '#9ca3af'}">${rank.rank_name}</span>
                    </div>
                    <div class="text-[10px] text-gray-600">
                        <span class="font-bold">${rank.min_score.toLocaleString()}+</span>
                        <span class="text-gray-400 ml-1">(${percentage}%)</span>
                    </div>
                `;
        rankDistributionList.appendChild(div);
    });
}

function displayFallbackDistribution(skillData) {
    if (!skillData || skillData.length === 0) {
        rankDistributionSection.style.display = 'none';
        return;
    }

    rankDistributionSection.style.display = 'block';
    rankDistributionList.innerHTML = '';

    const sortedData = [...skillData].sort((a, b) => b.stat - a.stat);
    const totalPlayers = sortedData.length;

    const fallbackRanks = [
        { rank_name: 'Diamond', min_score: 660000, color_hex: '#3b82f6' },
        { rank_name: 'Gold 2', min_score: 100000, color_hex: '#f59e0b' },
        { rank_name: 'Gold 1', min_score: 50000, color_hex: '#fbbf24' },
        { rank_name: 'Silver', min_score: 25000, color_hex: '#c0c0c0' },
        { rank_name: 'Bronze', min_score: 10000, color_hex: '#cd7f32' },
        { rank_name: 'Honorable', min_score: 5000, color_hex: '#60a5fa' },
        { rank_name: 'Unranked', min_score: 0, color_hex: '#9ca3af' }
    ];

    fallbackRanks.forEach((rank, index) => {
        let playersInRank = 0;
        if (index === 0) {
            playersInRank = sortedData.filter(p => p.stat >= rank.min_score).length;
        } else {
            const nextHigherMin = fallbackRanks[index - 1].min_score;
            playersInRank = sortedData.filter(p => p.stat >= rank.min_score && p.stat < nextHigherMin).length;
        }

        const playersAtOrAbove = sortedData.filter(p => p.stat >= rank.min_score).length;
        const percentage = (playersAtOrAbove / totalPlayers * 100).toFixed(1);

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center mb-1';
        div.innerHTML = `
                    <div class="flex items-center gap-1">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${rank.color_hex}"></div>
                        <span class="font-bold text-[10px]" style="color: ${rank.color_hex}">${rank.rank_name}</span>
                    </div>
                    <div class="text-[10px] text-gray-600">
                        <span class="font-bold">${rank.min_score.toLocaleString()}+</span>
                        <span class="text-gray-400 ml-1">(${percentage}%)</span>
                    </div>
                `;

        rankDistributionList.appendChild(div);
    });
}

function calculateFallbackProgress(playerIndex, position, suffix, totalPlayers) {
    const rankThresholds = [
        { rank_key: 'none', rank_name: 'Unranked', min_score: 0, color_hex: '#9ca3af' },
        { rank_key: 'honorable', rank_name: 'Honorable Mention', min_score: 5000, color_hex: '#60a5fa' },
        { rank_key: 'bronze', rank_name: 'Bronze', min_score: 10000, color_hex: '#cd7f32' },
        { rank_key: 'silver', rank_name: 'Silver', min_score: 25000, color_hex: '#c0c0c0' },
        { rank_key: 'gold1', rank_name: 'Gold 1', min_score: 50000, color_hex: '#fbbf24' },
        { rank_key: 'gold2', rank_name: 'Gold 2', min_score: 100000, color_hex: '#f59e0b' },
        { rank_key: 'diamond', rank_name: 'Diamond', min_score: 660000, color_hex: '#3b82f6' }
    ];

    let currentRankInfo = rankThresholds[0];
    let nextRankInfo = null;

    for (let i = 0; i < rankThresholds.length; i++) {
        if (currentSkillScore >= rankThresholds[i].min_score) {
            currentRankInfo = rankThresholds[i];
            if (i + 1 < rankThresholds.length) {
                nextRankInfo = rankThresholds[i + 1];
            }
        }
    }

    if (nextRankInfo) {
        const progressInCurrentRank = currentSkillScore - currentRankInfo.min_score;
        const totalNeededForNextRank = nextRankInfo.min_score - currentRankInfo.min_score;
        const progressPercent = Math.min(100, Math.max(0, (progressInCurrentRank / totalNeededForNextRank) * 100));

        rankProgressBar.style.width = `${progressPercent}%`;
        rankProgressBar.style.backgroundColor = currentRankInfo.color_hex;

        const positionPercent = (100 - ((totalPlayers - playerIndex) / totalPlayers * 100)).toFixed(1);

        rankPositionEl.innerHTML = `${position}${suffix} / ${totalPlayers}${getOrdinalSuffix(totalPlayers)} (${positionPercent}%)<br>${Math.floor(progressPercent)}% to next`;
    } else {
        rankProgressBar.style.width = '100%';
        rankProgressBar.style.backgroundColor = currentRankInfo.color_hex;

        const positionPercent = (100 - ((totalPlayers - playerIndex) / totalPlayers * 100)).toFixed(1);

        rankPositionEl.innerHTML = `${position}${suffix} / ${totalPlayers}${getOrdinalSuffix(totalPlayers)} (${positionPercent}%)<br>Max Rank`;
    }
}

function showNoRankData() {
    skillScoreValue.textContent = '--';
    rankBadge.textContent = 'Unranked';
    rankBadge.style.backgroundColor = '#9ca3af';
    rankPositionEl.textContent = 'No rank data available';
    xpFactorEl.textContent = '--';
    rankPointsEl.textContent = '--';
    rankProgressBar.style.width = '0%';
    rankDistributionSection.style.display = 'none';
}

async function checkPendingStatus() {
    const name = localStorage.getItem('lastPlayerName');
    if (!name || name === '') return;

    const canonicalName = createCanonicalName(name);
    try {
        const url = `${API_URL}?action=pending&name=${canonicalName}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data && data.pending === true) {
            document.getElementById('pending-modal').style.display = 'flex';
            document.getElementById('pending-modal').classList.add('open');
        }
    } catch (e) {
        // Silent fail
    }
}

function closePendingModal() {
    document.getElementById('pending-modal').style.display = 'none';
    document.getElementById('pending-modal').classList.remove('open');
}

async function refreshLeaderboard() {
    leaderboardBody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-gray-300"><div class="animate-spin h-6 w-6 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto"></div></td></tr>';
    try {
        const url = `${API_URL}?type=${currentLbType}&mode=${currentModeKey}`;
        const res = await fetch(url);
        const data = await res.json();
        leaderboardBody.innerHTML = '';

        if (!data || !data.length) {
            totalPlayersEl.textContent = `Total: 0`;
            leaderboardBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-400 text-xs italic">No records found</td></tr>';
            return;
        }

        const totalCount = data.length;
        totalPlayersEl.textContent = `Total: ${totalCount}`;

        let validRank = 1;
        data.forEach((entry) => {
            if (entry.name === 'ANON') return;

            let displayVal = entry.stat;
            if (currentLbType === 'time') displayVal = parseFloat(displayVal).toFixed(3) + 's';
            else if (currentLbType === 'skill') displayVal = parseInt(displayVal).toLocaleString();
            else if (currentLbType === 'points') displayVal = parseInt(displayVal).toLocaleString() + ' XP';
            else if (currentLbType === 'level') {
                const totalXP = parseInt(displayVal);
                displayVal = "Lv. " + getLevelFromTotalXP(totalXP);
            }

            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0';

            if (currentLbType === 'skill') {
                const rankNum = validRank;
                const rankName = entry.rank_name || entry.medal_name || '';
                const rankColor = entry.rank_color || entry.medal_color || '#9ca3af';
                const badgeHTML = rankName ? `<span class="skill-badge" style="background:${rankColor}">${rankName}</span>` : `<span class="no-badge"></span>`;

                tr.innerHTML = `
                            <td class="py-2 pl-2 text-center font-bold">${rankNum}</td>
                            <td class="py-2 font-bold uppercase text-gray-700 text-xs sm:text-sm tracking-wide">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    ${badgeHTML}
                                    <span style="display:inline-block;">${entry.name}</span>
                                </div>
                            </td>
                            <td class="py-2 pr-2 font-mono text-right text-gray-800 font-bold">${displayVal}</td>
                        `;
            } else {
                let rankIcon = validRank;
                if (validRank === 1) rankIcon = '🥇';
                else if (validRank === 2) rankIcon = '🥈';
                else if (validRank === 3) rankIcon = '🥉';

                tr.innerHTML = `
                            <td class="py-2 pl-2 text-center font-bold">${rankIcon}</td>
                            <td class="py-2 font-bold uppercase text-gray-700 text-xs sm:text-sm tracking-wide">${entry.name}</td>
                            <td class="py-2 pr-2 font-mono text-right text-gray-800 font-bold">${displayVal}</td>
                        `;
            }

            leaderboardBody.appendChild(tr);
            validRank++;
        });
    } catch (e) { console.error(e); leaderboardBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-red-300 text-xs">Connection Failed</td></tr>'; }
}

async function saveScore() {
    const rawName = playerNameInput.value.trim() || "PLAYER";
    const canonicalName = createCanonicalName(rawName);

    const storedName = localStorage.getItem('lastPlayerName');
    const isNewUsername = !storedName || rawName.toUpperCase() !== storedName.toUpperCase();

    if (isNewUsername) {
        const isDuplicateOrSlur = await checkDuplicateUsername(rawName);
        if (isDuplicateOrSlur) {
            saveScoreBtn.disabled = false;
            saveScoreBtn.textContent = "SAVE SCORE";
            saveScoreBtn.classList.remove('bg-gray-500');
            saveScoreBtn.classList.add('bg-gray-900');
            return;
        }
    } else {
        if (containsSlur(rawName)) {
            slurError.classList.remove('hidden');
            duplicateError.classList.add('hidden');
            saveScoreBtn.disabled = false;
            saveScoreBtn.textContent = "SAVE SCORE";
            saveScoreBtn.classList.remove('bg-gray-500');
            saveScoreBtn.classList.add('bg-gray-900');
            return;
        }
    }

    localStorage.setItem('lastPlayerName', rawName);
    localStorage.setItem('lastPlayerNameCanonical', canonicalName);

    document.getElementById('player-display-name').textContent = rawName || 'PLAYER';

    saveScoreBtn.disabled = true;
    saveScoreBtn.textContent = "SAVING...";
    saveScoreBtn.classList.add('bg-gray-500');

    try {
        const res = await fetch(API_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: canonicalName,
                raw_name: rawName,
                time: lastFinishedTime,
                mode: currentModeKey,
                total_xp: currentXP,
                total_games: totalGamesPlayed,
                total_rows: totalRowsCleared
            })
        });
        const result = await res.json();
        if (result.status === 'success') {
            setLeaderboardType(currentLbType);
            initializeGame();
            syncUserData(rawName);
        }
        else {
            alert(result.msg || 'Error saving score.');
            saveScoreBtn.disabled = false;
            saveScoreBtn.textContent = "TRY AGAIN";
        }
    } catch (e) {
        console.error(e);
        alert('Connection failed.');
        saveScoreBtn.disabled = false;
        saveScoreBtn.textContent = "TRY AGAIN";
    }
}

function highlightCell(r, c) {
    document.querySelectorAll('.grid-cell').forEach(c => c.classList.remove('highlight-current'));
    const cell = gridContainer.children[r * GRID_COLS + c];
    if (cell) {
        cell.classList.add('highlight-current');
        if (MODES[currentModeKey].rows > 8) cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
function startTimer() {
    if (timerInterval) return;
    startTime = performance.now();
    timerInterval = setInterval(() => {
        if (isGameActive) {
            const currentT = (performance.now() - startTime) / 1000 + penaltyTime;
            updateTimerDisplay(currentT);
        }
    }, 30);
}
function updateTimerDisplay(t) { timerDisplay.textContent = t.toFixed(2); }
function updateStatus(msg, good) {
    statusMessage.textContent = msg;
    if (good === true) statusMessage.className = "text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full";
    else if (good === false) statusMessage.className = "text-sm font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full";
    else statusMessage.className = "text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full";
}
function detectMobileCheck() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; }

document.getElementById('reset-button').onclick = initializeGame;
saveScoreBtn.onclick = saveScore;

// Add remap button functionality
document.getElementById('remap-button').addEventListener('click', () => {
    if (!isGameActive) {
        alert('Start a game first!');
        return;
    }
    // Simulate remapping conflict for demo
    // remapErrorMessage.textContent = "⚠️ Key '0' already mapped to Black! Only the first mapping will work.";
    remapModal.classList.add('open');
});

document.addEventListener('keydown', (e) => {
    if (blockNumpadKeys(e) === false) {
        return;
    }

    if (e.repeat) return;

    if (successModal.classList.contains('open')) {
        if (e.key === 'Enter') saveScore();
        return;
    }

    if (remapModal.classList.contains('open')) {
        if (e.key === 'Escape') {
            closeRemapModal();
        }
        return;
    }

    // Clear mappings on reset
    if (e.key === 'r' || e.key === 'Tab') {
        e.preventDefault();
        initializeGame();
        return;
    }

    // Use remapped keys for gameplay
    if (e.key === remapBlackKey) {
        e.preventDefault();
        handleInput(BLACK);
        return;
    }
    if (e.key === remapWhiteKey) {
        e.preventDefault();
        handleInput(WHITE);
        return;
    }
    if (e.key === remapUndoKey) {
        e.preventDefault();
        handleBackspace();
        return;
    }
});

function startRankCountdown() {
    function getNowICT() {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ictMs = utc + (7 * 60 * 60 * 1000);
        return new Date(ictMs);
    }
    function computeNextMonday730ICT() {
        const nowICT = getNowICT();
        const day = nowICT.getDay();
        let daysUntil = (1 - day + 7) % 7;
        if (daysUntil === 0) {
            if (nowICT.getHours() < 7 || (nowICT.getHours() === 7 && nowICT.getMinutes() < 30)) {
                daysUntil = 0;
            } else {
                daysUntil = 7;
            }
        }
        const next = new Date(nowICT);
        next.setDate(nowICT.getDate() + daysUntil);
        next.setHours(7, 30, 0, 0);
        return next;
    }

    function update() {
        const nowICT = getNowICT();
        const target = computeNextMonday730ICT();
        let diff = Math.floor((target - nowICT) / 1000);
        if (diff < 0) diff = 0;
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        rankCountdownEl.textContent = `Next rank update: ${days}d ${hours}h ${minutes}m ${seconds}s (ICT)`;
    }
    update();
    setInterval(update, 1000);
}

window.onload = () => {
    loadTheme();
    detectMobile();
    setMode('classic');
    refreshLeaderboard();
    startRankCountdown();
    updateSkillRank();
    showPage('home');
    loadRemapSettings();
};

document.addEventListener('DOMContentLoaded', function () {
    careerStatsContent.style.maxHeight = '0px';
    collapseIcon.classList.add('collapsed');
});
