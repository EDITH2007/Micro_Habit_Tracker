/**
 * Streak Guardian — Micro-Habit Tracker
 * Single-Page Vanilla JavaScript Logic
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'habitTracker_v1';

  // Default initial state
  const defaultState = {
    petName: 'Spark',
    habits: [],
    onboarded: false
  };

  // State instance
  let state = loadState();

  // DOM Elements cache
  const elements = {
    setupView: document.getElementById('setup-view'),
    trackerView: document.getElementById('tracker-view'),
    setupForm: document.getElementById('setup-form'),
    petNameInput: document.getElementById('pet-name-input'),
    setupHabitsList: document.getElementById('setup-habits-list'),
    
    // Header Buttons
    btnInfo: document.getElementById('btn-info'),
    btnEditHabits: document.getElementById('btn-edit-habits'),
    btnReset: document.getElementById('btn-reset'),

    // Guardian Section
    petMoodBadge: document.getElementById('pet-mood-badge'),
    petLevelBadge: document.getElementById('pet-level-badge'),
    speechBubble: document.getElementById('speech-bubble'),
    speechText: document.getElementById('speech-text'),
    petDisplayWrapper: document.getElementById('pet-display-wrapper'),
    petDisplay: document.getElementById('pet-display'),
    petGrid: document.getElementById('pet-grid'),
    displayPetName: document.getElementById('display-pet-name'),
    healthBarFill: document.getElementById('health-bar-fill'),
    healthPercent: document.getElementById('health-percent'),
    todayDateBadge: document.getElementById('today-date-badge'),
    habitsList: document.getElementById('habits-list'),

    // Modals
    modalEdit: document.getElementById('modal-edit'),
    editForm: document.getElementById('edit-form'),
    editPetName: document.getElementById('edit-pet-name'),
    editHabitsInputs: document.getElementById('edit-habits-inputs'),
    btnAddEditHabit: document.getElementById('btn-add-edit-habit'),
    closeEditModal: document.getElementById('close-edit-modal'),
    cancelEditModal: document.getElementById('cancel-edit-modal'),

    modalReset: document.getElementById('modal-reset'),
    resetPetName: document.getElementById('reset-pet-name'),
    confirmResetBtn: document.getElementById('confirm-reset-btn'),
    closeResetModal: document.getElementById('close-reset-modal'),
    cancelResetModal: document.getElementById('cancel-reset-modal'),

    modalInfo: document.getElementById('modal-info'),
    closeInfoModal: document.getElementById('close-info-modal'),
    btnCloseInfo: document.getElementById('btn-close-info'),

    particleContainer: document.getElementById('particle-container')
  };

  /* ==========================================================================
     Date Helper Utilities
     ========================================================================== */

  function getTodayStr() {
    const now = new Date();
    return formatDate(now);
  }

  function getYesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  }

  function getDateOffsetStr(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return formatDate(d);
  }

  function formatDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getFormattedDisplayDate() {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  }

  /* ==========================================================================
     State & Persistence Engine
     ========================================================================== */

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return validateAndUpdateState(parsed);
      }
    } catch (e) {
      console.warn('Could not read state from localStorage', e);
    }
    return JSON.parse(JSON.stringify(defaultState));
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Could not save state to localStorage', e);
    }
  }

  /**
   * Evaluates habit streaks on app startup or date change
   */
  function validateAndUpdateState(parsedState) {
    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    if (parsedState.habits && Array.isArray(parsedState.habits)) {
      parsedState.habits.forEach(habit => {
        if (!habit.history) habit.history = {};

        // Check if last completion was before yesterday (broken streak edge case)
        if (habit.lastCompletedDate) {
          if (habit.lastCompletedDate !== today && habit.lastCompletedDate !== yesterday) {
            // Streak broken due to missed days
            habit.currentStreak = 0;
          }
        } else {
          habit.currentStreak = 0;
        }
      });
    }

    return parsedState;
  }

  /* ==========================================================================
     Pet Mood & Dialogue Engine
     ========================================================================== */

  const MOOD_STAGES = [
    { level: 0, name: 'Sleepy', cssClass: 'pet-stage-0', badgeClass: 'mood-sleepy', title: 'Lvl 0 • Neglected' },
    { level: 1, name: 'Okay', cssClass: 'pet-stage-1', badgeClass: 'mood-okay', title: 'Lvl 1 • Guardian' },
    { level: 2, name: 'Happy', cssClass: 'pet-stage-2', badgeClass: 'mood-happy', title: 'Lvl 2 • Lively' },
    { level: 3, name: 'Excited', cssClass: 'pet-stage-3', badgeClass: 'mood-excited', title: 'Lvl 3 • Glowing' },
    { level: 4, name: 'Thriving', cssClass: 'pet-stage-4', badgeClass: 'mood-thriving', title: 'Lvl 4 • Legendary ✨' }
  ];

  const DIALOGUES = {
    0: [
      "Yawn... I feel so weak. Can we do a quick habit today?",
      "I missed you! Even 1 small habit will wake me up...",
      "Zzz... don't give up! We can start fresh right now!",
      "One tiny step is all it takes to revive our streak!"
    ],
    1: [
      "Good to see you! Every small habit counts.",
      "We're laying a great foundation today!",
      "One day at a time, we are building consistency!",
      "Feeling steady! Ready for today's check-in?"
    ],
    2: [
      "3+ days strong! I can feel our energy rising!",
      "Look at us go! Consistency feels amazing!",
      "You're crushing it! Let me feel that momentum!",
      "High five! You're making awesome progress!"
    ],
    3: [
      "A whole week streak! You are UNSTOPPABLE!",
      "I'm bursting with excitement! Look how far we've come!",
      "7+ days of micro-habits! You're a habit master!",
      "WOOHOO! Let's lock in today's victory!"
    ],
    4: [
      "LEGENDARY STREAK! We are true habit champions!",
      "✨ Pure habit magic! Nothing can break our focus now!",
      "12+ days of greatness! I'm so proud of you!",
      "You've mastered the daily micro-habit lifestyle! ✨"
    ],
    click: [
      "Teehee! That tickles! *Happy bounce*",
      "I believe in you! Keep going! 💖",
      "Purrr... thank you for taking care of me!",
      "Habit streak powers activate! ⚡",
      "Sending extra positive vibes your way! ✨"
    ]
  };

  function calculateAverageStreak() {
    if (!state.habits || state.habits.length === 0) return 0;
    const total = state.habits.reduce((acc, h) => acc + (h.currentStreak || 0), 0);
    return total / state.habits.length;
  }

  function getPetStageInfo() {
    const avgStreak = calculateAverageStreak();

    let stageIndex = 0;
    if (avgStreak >= 12) stageIndex = 4;
    else if (avgStreak >= 7) stageIndex = 3;
    else if (avgStreak >= 3) stageIndex = 2;
    else if (avgStreak >= 1) stageIndex = 1;
    else stageIndex = 0;

    // Health percentage calculation (for visual bar)
    let healthPercent = Math.min(100, Math.round((avgStreak / 12) * 100));
    if (avgStreak > 0 && healthPercent < 15) healthPercent = 15;

    return {
      stage: MOOD_STAGES[stageIndex],
      avgStreak: avgStreak,
      healthPercent: healthPercent
    };
  }

  /* ==========================================================================
     CSS Pixel Art Rendering Engine (16x16 Grid Map)
     ========================================================================== */

  /**
   * Generates 16x16 pixel color matrix for pet depending on mood stage
   */
  function renderPixelPetGrid(stageLevel) {
    elements.petGrid.innerHTML = '';

    // Color definitions
    const C = {
      _ : 'transparent',
      K : '#1e2640', // Outline dark
      W : '#ffffff', // Eye shine / white
      R : '#ff7675', // Blush / rosy cheeks
      Y : '#ffeaa7', // Crown / sparkles
      G : '#fdcb6e', // Crown gold
    };

    // Body colors per stage
    let B, B_dark;
    if (stageLevel === 0) { // Sleepy - Lavender Slate
      B = '#a29bfe'; B_dark = '#6c5ce7';
    } else if (stageLevel === 1) { // Okay - Mint
      B = '#55efc4'; B_dark = '#00b894';
    } else if (stageLevel === 2) { // Happy - Warm Yellow
      B = '#ffeaa7'; B_dark = '#fdcb6e';
    } else if (stageLevel === 3) { // Excited - Coral Pink
      B = '#ff7675'; B_dark = '#d63031';
    } else { // Thriving - Golden Violet
      B = '#a29bfe'; B_dark = '#fdcb6e';
    }

    // 16x16 Grid maps per stage
    let gridMap = [];

    if (stageLevel === 0) {
      // Sleepy Droopy Creature
      gridMap = [
        ['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_'],
        ['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_'],
        ['_','_','_','K','K','_','_','_','_','_','K','K','_','_','_','_'],
        ['_','_','K','B','B','K','_','_','_','K','B','B','K','_','_','_'],
        ['_','_','K','B','B','K','_','_','_','K','B','B','K','_','_','_'],
        ['_','K','B','B','B','B','K','K','K','B','B','B','B','K','_','_'],
        ['_','K','B','B','B','B','B','B','B','B','B','B','B','K','_','_'],
        ['_','K','B','B','B','B','B','B','B','B','B','B','B','K','_','_'],
        ['_','K','B','K','K','B','B','B','B','B','K','K','B','K','_','_'], // Closed sleeping eyes
        ['_','K','B','B','B','B','B','K','B','B','B','B','B','K','_','_'],
        ['_','K','B','B','R','B','B','K','B','B','R','B','B','K','_','_'],
        ['_','_','K','B','B','B','B','B','B','B','B','B','K','_','_','_'],
        ['_','_','K','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','K','_','_','_'],
        ['_','_','_','K','K','K','K','K','K','K','K','K','_','_','_','_'],
        ['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_'],
        ['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_'],
      ];
    } else if (stageLevel === 4) {
      // Thriving - Legendary with Crown
      gridMap = [
        ['_','_','_','_','_','G','Y','G','Y','G','_','_','_','_','_','_'], // Crown
        ['_','_','_','_','_','K','G','G','G','K','_','_','_','_','_','_'],
        ['_','_','_','K','K','_','K','K','K','_','K','K','_','_','_','_'],
        ['_','_','K','B','B','K','B','B','B','K','B','B','K','_','_','_'],
        ['_','_','K','B','B','K','B','B','B','K','B','B','K','_','_','_'],
        ['_','K','B','B','B','B','B','B','B','B','B','B','B','K','_','_'],
        ['_','K','B','B','B','B','B','B','B','B','B','B','B','K','_','_'],
        ['_','K','B','W','K','B','B','B','B','B','W','K','B','K','_','_'], // Sparkle eyes
        ['_','K','B','K','K','B','B','K','B','B','K','K','B','K','_','_'],
        ['_','K','B','R','R','B','K','K','K','B','R','R','B','K','_','_'], // Cheeks
        ['_','K','B','B','B','B','B','B','B','B','B','B','B','K','_','_'],
        ['_','_','K','B','B','B','B','B','B','B','B','B','K','_','_','_'],
        ['_','_','K','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','K','_','_','_'],
        ['_','_','_','K','K','K','K','K','K','K','K','K','_','_','_','_'],
        ['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_'],
        ['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_'],
      ];
    } else {
      // Standard Cute Blob (Happy / Excited / Okay)
      gridMap = [
        ['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_'],
        ['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_'],
        ['_','_','_','K','K','_','_','_','_','_','K','K','_','_','_','_'],
        ['_','_','K','B','B','K','_','_','_','K','B','B','K','_','_','_'],
        ['_','_','K','B','B','K','_','_','_','K','B','B','K','_','_','_'],
        ['_','K','B','B','B','B','K','K','K','B','B','B','B','K','_','_'],
        ['_','K','B','B','B','B','B','B','B','B','B','B','B','K','_','_'],
        ['_','K','B','B','B','B','B','B','B','B','B','B','B','K','_','_'],
        ['_','K','B','K','K','B','B','B','B','B','K','K','B','K','_','_'], // Eyes
        ['_','K','B','W','K','B','B','K','B','B','W','K','B','K','_','_'], // Eye shine
        ['_','K','B','R','R','B','B','K','B','B','R','R','B','K','_','_'], // Rosy Cheeks
        ['_','_','K','B','B','B','B','B','B','B','B','B','K','_','_','_'],
        ['_','_','K','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','B_dark','K','_','_','_'],
        ['_','_','_','K','K','K','K','K','K','K','K','K','_','_','_','_'],
        ['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_'],
        ['_','_','_','_','_','_','_','_','_','_','_','_','_','_','_','_'],
      ];
    }

    const fragment = document.createDocumentFragment();

    gridMap.forEach(row => {
      row.forEach(cell => {
        const pixel = document.createElement('div');
        pixel.className = 'pixel-cell';
        let color = C[cell] || cell;
        if (cell === 'B') color = B;
        if (cell === 'B_dark') color = B_dark;
        pixel.style.backgroundColor = color;
        fragment.appendChild(pixel);
      });
    });

    elements.petGrid.appendChild(fragment);
  }

  /* ==========================================================================
     UI Render Engine
     ========================================================================== */

  function renderApp() {
    if (!state.onboarded) {
      elements.setupView.classList.remove('hidden');
      elements.trackerView.classList.add('hidden');
      elements.btnEditHabits.classList.add('hidden');
      elements.btnReset.classList.add('hidden');
      return;
    }

    elements.setupView.classList.add('hidden');
    elements.trackerView.classList.remove('hidden');
    elements.btnEditHabits.classList.remove('hidden');
    elements.btnReset.classList.remove('hidden');

    // Today date badge
    elements.todayDateBadge.textContent = getFormattedDisplayDate();

    // Render Guardian
    updateGuardianUI();

    // Render Habits
    renderHabitsList();
  }

  function updateGuardianUI() {
    const { stage, healthPercent } = getPetStageInfo();

    // Update Pet Name
    elements.displayPetName.textContent = state.petName || 'Spark';

    // Update Mood & Level Badges
    elements.petMoodBadge.textContent = `Mood: ${stage.name}`;
    elements.petMoodBadge.className = `mood-badge ${stage.badgeClass}`;
    elements.petLevelBadge.textContent = stage.title;

    // Update Pet CSS Animation & Grid
    elements.petDisplay.className = `pixel-pet ${stage.cssClass}`;
    renderPixelPetGrid(stage.level);

    // Update Health Bar
    elements.healthBarFill.style.width = `${healthPercent}%`;
    elements.healthPercent.textContent = `${healthPercent}%`;

    // Pick speech line
    setRandomSpeech(stage.level);
  }

  function setRandomSpeech(stageLevel, customText = null) {
    if (customText) {
      elements.speechText.textContent = customText;
      return;
    }
    const lines = DIALOGUES[stageLevel] || DIALOGUES[1];
    const randomLine = lines[Math.floor(Math.random() * lines.length)];
    elements.speechText.textContent = randomLine;
  }

  function renderHabitsList() {
    elements.habitsList.innerHTML = '';
    const today = getTodayStr();

    if (!state.habits || state.habits.length === 0) {
      elements.habitsList.innerHTML = '<p class="input-hint">No habits configured. Click Edit to add habits!</p>';
      return;
    }

    state.habits.forEach((habit, index) => {
      const isCompletedToday = habit.lastCompletedDate === today;

      const card = document.createElement('div');
      card.className = 'habit-card glass-card';

      // 7-day matrix calculation
      const matrixDotsHTML = render7DayMatrix(habit);

      card.innerHTML = `
        <div class="habit-card-top">
          <div class="habit-info">
            <div class="habit-icon">${getIconForHabit(habit.name)}</div>
            <div class="habit-title-container">
              <div class="habit-name">${escapeHTML(habit.name)}</div>
              <div class="habit-streak-counts">
                <span class="streak-current">🔥 ${habit.currentStreak || 0}d streak</span>
                <span class="streak-best">🏆 Best: ${habit.bestStreak || 0}d</span>
              </div>
            </div>
          </div>
        </div>

        <div class="habit-matrix-container">
          <div class="matrix-label">Recent 7 Days</div>
          <div class="matrix-dots">
            ${matrixDotsHTML}
          </div>
        </div>

        <button class="btn-checkin ${isCompletedToday ? 'completed' : 'pending'}" 
                data-index="${index}" 
                ${isCompletedToday ? 'disabled' : ''}>
          ${isCompletedToday ? '✓ Completed Today' : 'Mark Done Today ✨'}
        </button>
      `;

      elements.habitsList.appendChild(card);
    });

    // Attach check-in listeners
    const checkinBtns = elements.habitsList.querySelectorAll('.btn-checkin');
    checkinBtns.forEach(btn => {
      btn.addEventListener('click', handleHabitCheckin);
    });
  }

  /**
   * Generates 7-day history matrix HTML for a habit
   */
  function render7DayMatrix(habit) {
    const today = getTodayStr();
    let dotsHTML = '';

    // Generate past 7 days (index 6 = 6 days ago, index 0 = today)
    for (let i = 6; i >= 0; i--) {
      const dateStr = getDateOffsetStr(i);
      const isToday = i === 0;

      // Day name label (e.g. M, T, W)
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLetter = d.toLocaleDateString('en-US', { weekday: 'narrow' });

      let dotClass = 'dot-empty';
      let symbol = '';

      if (habit.history && habit.history[dateStr]) {
        dotClass = 'dot-done';
        symbol = '✓';
      } else if (isToday) {
        dotClass = 'dot-pending';
        symbol = '';
      } else if (habit.createdAt && dateStr >= habit.createdAt) {
        // Date is after habit creation, but not done => missed
        dotClass = 'dot-missed';
        symbol = '×';
      }

      dotsHTML += `
        <div class="matrix-dot-wrapper" title="${dateStr}">
          <div class="matrix-dot ${dotClass}">${symbol}</div>
          <span class="matrix-dot-day">${isToday ? 'Today' : dayLetter}</span>
        </div>
      `;
    }

    return dotsHTML;
  }

  function getIconForHabit(name) {
    const lower = name.toLowerCase();
    if (lower.includes('code') || lower.includes('dev') || lower.includes('program')) return '⚡';
    if (lower.includes('water') || lower.includes('drink')) return '💧';
    if (lower.includes('read') || lower.includes('book') || lower.includes('page')) return '📖';
    if (lower.includes('meditat') || lower.includes('zen') || lower.includes('breathe')) return '🧘';
    if (lower.includes('walk') || lower.includes('run') || lower.includes('exercise')) return '🏃';
    if (lower.includes('sleep') || lower.includes('bed')) return '🌙';
    if (lower.includes('write') || lower.includes('journal')) return '✍️';
    return '🎯';
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  /* ==========================================================================
     Event Handlers & User Actions
     ========================================================================== */

  function handleHabitCheckin(e) {
    const btn = e.currentTarget;
    const habitIndex = parseInt(btn.dataset.index, 10);
    const habit = state.habits[habitIndex];
    if (!habit) return;

    const today = getTodayStr();

    if (habit.lastCompletedDate === today) return; // Already completed

    // Update habit state
    habit.lastCompletedDate = today;
    habit.history[today] = true;
    habit.currentStreak = (habit.currentStreak || 0) + 1;

    if (habit.currentStreak > (habit.bestStreak || 0)) {
      habit.bestStreak = habit.currentStreak;
    }

    saveState();

    // Trigger celebration effects
    spawnParticles(btn);
    triggerPetWiggle();

    // Update UI
    renderApp();

    // Custom reaction speech
    const { stage } = getPetStageInfo();
    const celebrationLines = [
      `Yay! You completed "${habit.name}"! 🎉`,
      `Awesome work! That's ${habit.currentStreak} days strong! 🔥`,
      `Streak boosted! I feel healthier! ✨`
    ];
    setRandomSpeech(stage.level, celebrationLines[Math.floor(Math.random() * celebrationLines.length)]);
  }

  function triggerPetWiggle() {
    elements.petDisplay.classList.remove('pet-wiggle');
    void elements.petDisplay.offsetWidth; // Force reflow
    elements.petDisplay.classList.add('pet-wiggle');
  }

  // Interactive Pet Click
  elements.petDisplayWrapper.addEventListener('click', (e) => {
    triggerPetWiggle();
    spawnHeartParticles(e.clientX, e.clientY);
    const clickLines = DIALOGUES.click;
    const randomClickLine = clickLines[Math.floor(Math.random() * clickLines.length)];
    elements.speechText.textContent = randomClickLine;
  });

  /* ==========================================================================
     Particle Celebrations (Soundless micro-animations)
     ========================================================================== */

  function spawnParticles(targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const symbols = ['✨', '🌟', '💖', '🎉', '✓'];

    for (let i = 0; i < 18; i++) {
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      particle.style.left = `${startX}px`;
      particle.style.top = `${startY}px`;

      const dx = (Math.random() - 0.5) * 200;
      const dy = -Math.random() * 150 - 50;

      particle.style.setProperty('--dx', `${dx}px`);
      particle.style.setProperty('--dy', `${dy}px`);

      elements.particleContainer.appendChild(particle);

      setTimeout(() => particle.remove(), 1200);
    }
  }

  function spawnHeartParticles(x, y) {
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.textContent = Math.random() > 0.5 ? '💖' : '✨';
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;

      const dx = (Math.random() - 0.5) * 120;
      const dy = -Math.random() * 100 - 30;

      particle.style.setProperty('--dx', `${dx}px`);
      particle.style.setProperty('--dy', `${dy}px`);

      elements.particleContainer.appendChild(particle);

      setTimeout(() => particle.remove(), 1200);
    }
  }

  /* ==========================================================================
     Onboarding Setup Handlers
     ========================================================================== */

  // Setup Presets Tags Click
  document.querySelectorAll('.preset-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const text = tag.dataset.preset;
      const inputs = elements.setupHabitsList.querySelectorAll('.setup-habit-input');
      
      // Find first empty input or overwrite first
      let filled = false;
      for (const input of inputs) {
        if (!input.value.trim()) {
          input.value = text;
          filled = true;
          break;
        }
      }
      if (!filled && inputs[0]) {
        inputs[0].value = text;
      }
    });
  });

  // Handle Setup Form Submit
  elements.setupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const petName = elements.petNameInput.value.trim() || 'Spark';
    const inputEls = elements.setupHabitsList.querySelectorAll('.setup-habit-input');

    const habits = [];
    const today = getTodayStr();

    inputEls.forEach(input => {
      const val = input.value.trim();
      if (val) {
        habits.push({
          id: 'habit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: val,
          createdAt: today,
          currentStreak: 0,
          bestStreak: 0,
          lastCompletedDate: null,
          history: {}
        });
      }
    });

    if (habits.length === 0) {
      alert('Please add at least 1 habit!');
      return;
    }

    state.petName = petName;
    state.habits = habits.slice(0, 3); // Max 3
    state.onboarded = true;

    saveState();
    renderApp();
  });

  /* ==========================================================================
     Modals Management (Edit, Reset, Info)
     ========================================================================== */

  // Edit Modal Handlers
  elements.btnEditHabits.addEventListener('click', () => {
    elements.editPetName.value = state.petName;
    renderEditHabitsInputs();
    elements.modalEdit.classList.remove('hidden');
  });

  function renderEditHabitsInputs() {
    elements.editHabitsInputs.innerHTML = '';
    state.habits.forEach((habit, idx) => {
      const row = document.createElement('div');
      row.className = 'edit-habit-row';
      row.innerHTML = `
        <input type="text" class="edit-habit-input" value="${escapeHTML(habit.name)}" maxlength="35" required>
        ${state.habits.length > 1 ? `<button type="button" class="btn-remove-habit" data-idx="${idx}" title="Remove habit">&times;</button>` : ''}
      `;
      elements.editHabitsInputs.appendChild(row);
    });

    // Toggle Add button visibility
    if (state.habits.length >= 3) {
      elements.btnAddEditHabit.style.display = 'none';
    } else {
      elements.btnAddEditHabit.style.display = 'inline-block';
    }

    // Attach remove listeners
    elements.editHabitsInputs.querySelectorAll('.btn-remove-habit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        state.habits.splice(idx, 1);
        renderEditHabitsInputs();
      });
    });
  }

  elements.btnAddEditHabit.addEventListener('click', () => {
    if (state.habits.length < 3) {
      state.habits.push({
        id: 'habit_' + Date.now(),
        name: 'New Habit',
        createdAt: getTodayStr(),
        currentStreak: 0,
        bestStreak: 0,
        lastCompletedDate: null,
        history: {}
      });
      renderEditHabitsInputs();
    }
  });

  elements.editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPetName = elements.editPetName.value.trim() || 'Spark';
    const inputEls = elements.editHabitsInputs.querySelectorAll('.edit-habit-input');

    inputEls.forEach((input, idx) => {
      if (state.habits[idx]) {
        state.habits[idx].name = input.value.trim();
      }
    });

    state.petName = newPetName;
    saveState();
    elements.modalEdit.classList.add('hidden');
    renderApp();
  });

  elements.closeEditModal.addEventListener('click', () => elements.modalEdit.classList.add('hidden'));
  elements.cancelEditModal.addEventListener('click', () => elements.modalEdit.classList.add('hidden'));

  // Reset Modal Handlers
  elements.btnReset.addEventListener('click', () => {
    elements.resetPetName.textContent = state.petName || 'Spark';
    elements.modalReset.classList.remove('hidden');
  });

  elements.confirmResetBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    state = JSON.parse(JSON.stringify(defaultState));
    elements.modalReset.classList.add('hidden');
    renderApp();
  });

  elements.closeResetModal.addEventListener('click', () => elements.modalReset.classList.add('hidden'));
  elements.cancelResetModal.addEventListener('click', () => elements.modalReset.classList.add('hidden'));

  // Info Modal Handlers
  elements.btnInfo.addEventListener('click', () => elements.modalInfo.classList.remove('hidden'));
  elements.closeInfoModal.addEventListener('click', () => elements.modalInfo.classList.add('hidden'));
  elements.btnCloseInfo.addEventListener('click', () => elements.modalInfo.classList.add('hidden'));

  // Close modals on background click
  window.addEventListener('click', (e) => {
    if (e.target === elements.modalEdit) elements.modalEdit.classList.add('hidden');
    if (e.target === elements.modalReset) elements.modalReset.classList.add('hidden');
    if (e.target === elements.modalInfo) elements.modalInfo.classList.add('hidden');
  });

  /* ==========================================================================
     Initial App Startup
     ========================================================================== */

  renderApp();

})();
