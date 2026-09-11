/**
 * Streak Guardian — Habit Companion with Bob
 * Interactive Tamagotchi-Style Habit Tracker Logic Engine
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'streakGuardian_bob_v2';
  const SOUND_KEY = 'streakGuardian_sound_enabled';

  // Default initial companion state
  const defaultState = {
    petName: 'Bob',
    habits: [],
    onboarded: false
  };

  // State instance
  let state = loadState();
  let soundEnabled = localStorage.getItem(SOUND_KEY) !== 'false'; // Default on

  // DOM Elements cache
  const elements = {
    setupView: document.getElementById('setup-view'),
    trackerView: document.getElementById('tracker-view'),
    setupForm: document.getElementById('setup-form'),
    petNameInput: document.getElementById('pet-name-input'),
    setupHabitsList: document.getElementById('setup-habits-list'),
    
    // Header
    headerPetName: document.getElementById('header-pet-name'),
    btnSound: document.getElementById('btn-sound'),
    btnInfo: document.getElementById('btn-info'),
    btnEditHabits: document.getElementById('btn-edit-habits'),
    btnReset: document.getElementById('btn-reset'),

    // Bob Sanctuary Section
    guardianCard: document.getElementById('guardian-card'),
    petMoodBadge: document.getElementById('pet-mood-badge'),
    petLevelBadge: document.getElementById('pet-level-badge'),
    speechBubble: document.getElementById('speech-bubble'),
    speechText: document.getElementById('speech-text'),
    petDisplayWrapper: document.getElementById('pet-display-wrapper'),
    petDisplay: document.getElementById('pet-display'),
    petSvgContainer: document.getElementById('pet-svg-container'),
    petShadow: document.getElementById('pet-shadow'),
    floatingEffects: document.getElementById('floating-effects'),
    displayPetName: document.getElementById('display-pet-name'),
    companionEvolutionTag: document.getElementById('companion-evolution-tag'),

    // Vitality Vessel Care Meter
    healthBarFill: document.getElementById('health-bar-fill'),
    healthPercent: document.getElementById('health-percent'),
    vitalityTierName: document.getElementById('vitality-tier-name'),

    // Habits Section
    todayDateBadge: document.getElementById('today-date-badge'),
    habitsCountPill: document.getElementById('habits-count-pill'),
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
     Web Audio API Synthesizer (Zero external audio files needed!)
     ========================================================================== */
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playChime() {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;
      // Arpeggiated pentatonic chord (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];

      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        // Soft envelope
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.5);
      });
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  function playPop() {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.1);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Audio pop error', e);
    }
  }

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
      // Check for v2 or fall back to v1
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = localStorage.getItem('habitTracker_v1');
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.petName || parsed.petName === 'Spark') {
          parsed.petName = 'Bob';
        }
        return validateAndUpdateState(parsed);
      }
    } catch (e) {
      console.warn('Could not read state from localStorage', e);
    }

    // Default with 3 lovely starter micro-habits if brand new
    const starterState = JSON.parse(JSON.stringify(defaultState));
    starterState.petName = 'Bob';
    starterState.onboarded = true;
    const today = getTodayStr();

    starterState.habits = [
      {
        id: 'habit_code_1',
        name: '⚡ Coded for 15 mins',
        createdAt: getDateOffsetStr(5),
        currentStreak: 4,
        bestStreak: 7,
        lastCompletedDate: getYesterdayStr(),
        history: {
          [getDateOffsetStr(4)]: true,
          [getDateOffsetStr(3)]: true,
          [getDateOffsetStr(2)]: true,
          [getDateOffsetStr(1)]: true
        }
      },
      {
        id: 'habit_water_2',
        name: '💧 Drank 2L water',
        createdAt: getDateOffsetStr(5),
        currentStreak: 3,
        bestStreak: 6,
        lastCompletedDate: getYesterdayStr(),
        history: {
          [getDateOffsetStr(3)]: true,
          [getDateOffsetStr(2)]: true,
          [getDateOffsetStr(1)]: true
        }
      },
      {
        id: 'habit_read_3',
        name: '📖 Read 5 pages',
        createdAt: getDateOffsetStr(5),
        currentStreak: 2,
        bestStreak: 4,
        lastCompletedDate: getYesterdayStr(),
        history: {
          [getDateOffsetStr(2)]: true,
          [getDateOffsetStr(1)]: true
        }
      }
    ];

    return starterState;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Could not save state to localStorage', e);
    }
  }

  function validateAndUpdateState(parsedState) {
    const today = getTodayStr();
    const yesterday = getYesterdayStr();

    if (parsedState.habits && Array.isArray(parsedState.habits)) {
      parsedState.habits.forEach(habit => {
        if (!habit.history) habit.history = {};

        // If last completed date was before yesterday, streak dropped
        if (habit.lastCompletedDate) {
          if (habit.lastCompletedDate !== today && habit.lastCompletedDate !== yesterday) {
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
     Bob Companion Mood & Dialogue Engine
     ========================================================================== */
  const MOOD_STAGES = [
    {
      level: 0,
      moodKey: 'sleepy',
      name: 'Sleepy',
      title: 'Slumbering 💤',
      evolutionTag: 'Drowsy Hatchling',
      cssClass: 'stage-0'
    },
    {
      level: 1,
      moodKey: 'okay',
      name: 'Waking',
      title: 'Sprout Stage 🌿',
      evolutionTag: 'Curious Sprout',
      cssClass: 'stage-1'
    },
    {
      level: 2,
      moodKey: 'happy',
      name: 'Lively',
      title: 'Lively Stage ☀️',
      evolutionTag: 'Happy Guardian',
      cssClass: 'stage-2'
    },
    {
      level: 3,
      moodKey: 'excited',
      name: 'Excited',
      title: 'Blaze Stage 🔥',
      evolutionTag: 'Fiery Champion',
      cssClass: 'stage-3'
    },
    {
      level: 4,
      moodKey: 'thriving',
      name: 'Thriving',
      title: 'Legendary 👑',
      evolutionTag: 'Celestial Legend ✨',
      cssClass: 'stage-4'
    }
  ];

  const DIALOGUES = {
    0: [
      "Yaaawn... Bob feels so sluggish. A tiny habit would wake me up!",
      "Zzz... Is that you? Even 1 quick habit will revive my energy...",
      "Don't give up on us! We can ignite a fresh streak right now!",
      "One small spark is all Bob needs to open his eyes! ✨"
    ],
    1: [
      "Good day! Bob is feeling fresh. Let's feed our habits!",
      "One day at a time! We're growing our sprout together! 🌿",
      "Ready for today's check-in? Bob is hungry for consistency!",
      "Small steps every day create magical results! ✨"
    ],
    2: [
      "3+ days strong! Bob can feel the warm momentum rising! ☀️",
      "Look at us go! Consistency tastes delicious!",
      "High five! Bob is dancing with positive habit energy!",
      "You're building an incredible daily rhythm! Keep it up!"
    ],
    3: [
      "A whole week streak! Bob is blazing with fiery power! 🔥",
      "WOOHOO! 7+ days of micro-habits! We are unstoppable!",
      "Feel that heat? That's our streak blazing bright!",
      "Habit champion! Bob loves this winning energy! ✨"
    ],
    4: [
      "LEGENDARY STATUS! ✨ Bob is wearing the golden crown!",
      "Pure habit mastery! We are unstoppable partners!",
      "12+ days of greatness! Bob bows to your consistency! 👑",
      "Cosmic habit power! Nothing can break our focus now! 🌟"
    ],
    click: [
      "Teehee! That tickles! *Bob wiggles with glee* 💖",
      "Bob loves you! Together we can do anything!",
      "Purrr... habit power surging! ⚡",
      "Warm squishy hugs for our streak master! ✨",
      "*Happy squeak!* Ready for the next victory!"
    ],
    celebrate: [
      "YUM! Bob loved that! Delicious consistency! 🌟 (+1 Streak)",
      "Streak boosted! Bob is growing stronger! 🔥",
      "Awesome check-in! Bob is jumping for joy! 🎉",
      "Streak flame ignited! That's how legends are made! ✨"
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
     Bob's Vector SVG Claymation Generator
     ========================================================================== */
  function renderBobSvg(stageLevel) {
    const container = elements.petSvgContainer;
    const petName = state.petName || 'Bob';

    // Color tokens per mood level
    let bodyGradient = '';
    let accessorySVG = '';
    let eyesSVG = '';
    let mouthSVG = '';
    let cheeksSVG = '';

    if (stageLevel === 0) {
      // Sleepy
      bodyGradient = `
        <radialGradient id="bobBodyGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#cbd5e1"/>
          <stop offset="45%" stop-color="#94a3b8"/>
          <stop offset="100%" stop-color="#475569"/>
        </radialGradient>
      `;

      // Closed droopy sleeping eyes
      eyesSVG = `
        <path d="M 44,66 Q 52,72 60,66" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M 80,66 Q 88,72 96,66" fill="none" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      `;

      // Sleepy droop mouth
      mouthSVG = `
        <path d="M 64,80 Q 70,83 76,80" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
      `;

      // Soft muted cheeks
      cheeksSVG = `
        <ellipse cx="38" cy="74" rx="7" ry="5" fill="#94a3b8" opacity="0.6"/>
        <ellipse cx="102" cy="74" rx="7" ry="5" fill="#94a3b8" opacity="0.6"/>
      `;

      // Sleep cap
      accessorySVG = `
        <g class="bob-sleep-cap" transform="translate(42, 10) rotate(-15)">
          <path d="M 12,20 Q 30,-2 46,14 L 38,28 Q 24,18 12,20 Z" fill="#818cf8"/>
          <circle cx="48" cy="14" r="5" fill="#ffffff"/>
        </g>
      `;

    } else if (stageLevel === 1) {
      // Waking / Sprout
      bodyGradient = `
        <radialGradient id="bobBodyGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#5eead4"/>
          <stop offset="50%" stop-color="#2dd4bf"/>
          <stop offset="100%" stop-color="#0f766e"/>
        </radialGradient>
      `;

      // Curious round blinking eyes
      eyesSVG = `
        <g class="bob-eye">
          <circle cx="52" cy="62" r="6.5" fill="#042f2e"/>
          <circle cx="54" cy="60" r="2.2" fill="#ffffff"/>
        </g>
        <g class="bob-eye">
          <circle cx="88" cy="62" r="6.5" fill="#042f2e"/>
          <circle cx="90" cy="60" r="2.2" fill="#ffffff"/>
        </g>
      `;

      // Sweet smile
      mouthSVG = `
        <path d="M 62,77 Q 70,86 78,77" fill="none" stroke="#042f2e" stroke-width="3.5" stroke-linecap="round"/>
      `;

      cheeksSVG = `
        <ellipse cx="38" cy="71" rx="8" ry="5" fill="#f43f5e" opacity="0.55"/>
        <ellipse cx="102" cy="71" rx="8" ry="5" fill="#f43f5e" opacity="0.55"/>
      `;

      // Tiny green leaf sprout on head
      accessorySVG = `
        <g class="bob-sprout" transform="translate(68, 14)">
          <path d="M 2,12 Q 2,2 2,0" stroke="#15803d" stroke-width="3" stroke-linecap="round"/>
          <path d="M 2,4 C -6,2 -8,-4 0,-4 C 3,-1 3,2 2,4 Z" fill="#22c55e"/>
          <path d="M 2,2 C 10,0 12,-6 4,-6 C 1,-3 1,0 2,2 Z" fill="#4ade80"/>
        </g>
      `;

    } else if (stageLevel === 2) {
      // Happy / Lively
      bodyGradient = `
        <radialGradient id="bobBodyGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="45%" stop-color="#fbbf24"/>
          <stop offset="100%" stop-color="#d97706"/>
        </radialGradient>
      `;

      // Cheerful curved happy eyes
      eyesSVG = `
        <path d="M 44,65 Q 52,54 60,65" fill="none" stroke="#451a03" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M 80,65 Q 88,54 96,65" fill="none" stroke="#451a03" stroke-width="4.5" stroke-linecap="round"/>
      `;

      // Joyful open mouth
      mouthSVG = `
        <path d="M 61,75 Q 70,88 79,75 Z" fill="#dc2626"/>
        <path d="M 65,82 Q 70,84 75,82" fill="#f87171"/>
      `;

      cheeksSVG = `
        <ellipse cx="36" cy="70" rx="9" ry="6" fill="#f87171" opacity="0.75"/>
        <ellipse cx="104" cy="70" rx="9" ry="6" fill="#f87171" opacity="0.75"/>
      `;

      // Little sunny antennas
      accessorySVG = `
        <g transform="translate(70, 16)">
          <circle cx="0" cy="-2" r="5" fill="#fef08a" filter="drop-shadow(0 0 6px #f59e0b)"/>
        </g>
      `;

    } else if (stageLevel === 3) {
      // Excited / Fiery
      bodyGradient = `
        <radialGradient id="bobBodyGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#fecdd3"/>
          <stop offset="45%" stop-color="#fb7185"/>
          <stop offset="100%" stop-color="#be123c"/>
        </radialGradient>
      `;

      // Sparkly star eyes ★
      eyesSVG = `
        <g transform="translate(52, 62) scale(0.9)">
          <polygon points="0,-8 2.5,-2.5 8,0 2.5,2.5 0,8 -2.5,2.5 -8,0 -2.5,-2.5" fill="#fde047"/>
          <circle cx="0" cy="0" r="2" fill="#ffffff"/>
        </g>
        <g transform="translate(88, 62) scale(0.9)">
          <polygon points="0,-8 2.5,-2.5 8,0 2.5,2.5 0,8 -2.5,2.5 -8,0 -2.5,-2.5" fill="#fde047"/>
          <circle cx="0" cy="0" r="2" fill="#ffffff"/>
        </g>
      `;

      // Excited laughing open mouth
      mouthSVG = `
        <path d="M 58,74 Q 70,92 82,74 Z" fill="#881337"/>
        <path d="M 63,82 Q 70,88 77,82 Z" fill="#fb7185"/>
      `;

      cheeksSVG = `
        <ellipse cx="35" cy="70" rx="9" ry="6" fill="#fda4af" opacity="0.85"/>
        <ellipse cx="105" cy="70" rx="9" ry="6" fill="#fda4af" opacity="0.85"/>
      `;

      // Energy flame horn
      accessorySVG = `
        <g transform="translate(70, 12)">
          <path d="M 0,10 Q -6,-2 0,-8 Q 6,-2 0,10 Z" fill="#fde047" filter="drop-shadow(0 0 8px #f43f5e)"/>
          <path d="M 0,8 Q -3,0 0,-4 Q 3,0 0,8 Z" fill="#ffffff"/>
        </g>
      `;

    } else {
      // Thriving / Celestial Legend
      bodyGradient = `
        <radialGradient id="bobBodyGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#f5d0fe"/>
          <stop offset="45%" stop-color="#c084fc"/>
          <stop offset="100%" stop-color="#6b21a8"/>
        </radialGradient>
      `;

      // Starlight sparkling eyes
      eyesSVG = `
        <g transform="translate(52, 62)">
          <circle cx="0" cy="0" r="7" fill="#3b0764"/>
          <polygon points="0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5" fill="#fde047"/>
          <circle cx="2" cy="-2" r="2" fill="#ffffff"/>
        </g>
        <g transform="translate(88, 62)">
          <circle cx="0" cy="0" r="7" fill="#3b0764"/>
          <polygon points="0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5" fill="#fde047"/>
          <circle cx="2" cy="-2" r="2" fill="#ffffff"/>
        </g>
      `;

      // Sweet proud smile
      mouthSVG = `
        <path d="M 60,76 Q 70,88 80,76" fill="none" stroke="#3b0764" stroke-width="4" stroke-linecap="round"/>
      `;

      cheeksSVG = `
        <ellipse cx="35" cy="70" rx="9" ry="6" fill="#f472b6" opacity="0.8"/>
        <ellipse cx="105" cy="70" rx="9" ry="6" fill="#f472b6" opacity="0.8"/>
      `;

      // Floating Shimmering Golden Crown
      accessorySVG = `
        <g class="bob-crown" transform="translate(70, 8)">
          <path d="M -18,8 L -18,-4 L -9,2 L 0,-8 L 9,2 L 18,-4 L 18,8 Z" fill="#fbbf24" stroke="#d97706" stroke-width="1.5"/>
          <circle cx="-18" cy="-5" r="2.5" fill="#ef4444"/>
          <circle cx="0" cy="-9" r="3" fill="#3b82f6"/>
          <circle cx="18" cy="-5" r="2.5" fill="#10b981"/>
          <!-- Sparkles -->
          <circle cx="-24" cy="-10" r="1.5" fill="#fde047" opacity="0.8"/>
          <circle cx="24" cy="-6" r="2" fill="#fde047" opacity="0.8"/>
        </g>
      `;
    }

    // Chubby Pear/Blob Body Path
    const svgHTML = `
      <svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" aria-label="${petName} the companion">
        <defs>
          ${bodyGradient}
          <filter id="bobShineFilter">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="-1" dy="-2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4"/>
            </feComponentTransfer>
            <feMerge> 
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Cute Blob Body with Ears -->
        <g id="bob-character-body">
          <!-- Left Ear Nub -->
          <path d="M 44,36 C 36,22 46,14 54,26 Z" fill="url(#bobBodyGrad)"/>
          <!-- Right Ear Nub -->
          <path d="M 96,36 C 104,22 94,14 86,26 Z" fill="url(#bobBodyGrad)"/>
          
          <!-- Main Body -->
          <path d="M 70,24 C 95,24 114,40 118,66 C 122,92 110,118 70,118 C 30,118 18,92 22,66 C 26,40 45,24 70,24 Z" 
                fill="url(#bobBodyGrad)" />

          <!-- Clay Specular Shine Highlight -->
          <path d="M 45,34 C 60,28 75,30 65,40 C 55,50 40,44 45,34 Z" 
                fill="#ffffff" opacity="0.25" filter="url(#bobShineFilter)"/>

          <!-- Cheeks -->
          ${cheeksSVG}

          <!-- Eyes -->
          ${eyesSVG}

          <!-- Mouth -->
          ${mouthSVG}

          <!-- Mood Accessory -->
          ${accessorySVG}
        </g>
      </svg>
    `;

    container.innerHTML = svgHTML;
  }

  function updateFloatingEffects(stageLevel) {
    elements.floatingEffects.innerHTML = '';

    if (stageLevel === 0) {
      // Float Zzz
      elements.floatingEffects.innerHTML = `
        <span class="floating-zzz">z</span>
        <span class="floating-zzz">Z</span>
        <span class="floating-zzz">Z</span>
      `;
    }
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

    // Update Header
    elements.headerPetName.textContent = state.petName || 'Bob';
    elements.btnSound.textContent = soundEnabled ? '🔊' : '🔇';

    // Update Date
    elements.todayDateBadge.textContent = getFormattedDisplayDate();

    // Render Bob & Sanctuary
    updateGuardianUI();

    // Render Habits
    renderHabitsList();
  }

  function updateGuardianUI() {
    const { stage, healthPercent, avgStreak } = getPetStageInfo();

    // Set Dynamic Mood on Root HTML
    document.documentElement.setAttribute('data-mood', stage.moodKey);

    // Update Pet Name & Title
    elements.displayPetName.textContent = state.petName || 'Bob';
    elements.companionEvolutionTag.textContent = stage.evolutionTag;

    // Update Mood & Level Badges
    elements.petMoodBadge.querySelector('.mood-label-text').textContent = `Mood: ${stage.name}`;
    elements.petLevelBadge.querySelector('.level-label-text').textContent = `${Math.round(avgStreak)}d Avg • ${stage.title}`;

    // Update Bob CSS Stage Class & SVG
    elements.petDisplay.className = `bob-creature ${stage.cssClass}`;
    renderBobSvg(stage.level);
    updateFloatingEffects(stage.level);

    // Update Vitality Care Vessel
    elements.healthBarFill.style.width = `${healthPercent}%`;
    elements.healthPercent.textContent = `${healthPercent}%`;
    elements.vitalityTierName.textContent = stage.name;

    // Highlight milestone pins in vessel
    const pins = document.querySelectorAll('.milestone-pin');
    pins.forEach((pin, i) => {
      if (i <= stage.level) {
        pin.classList.add('active');
      } else {
        pin.classList.remove('active');
      }
    });

    // Random greeting dialogue
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

  /* ==========================================================================
     Habit Category Detective
     ========================================================================== */
  function getHabitCategoryInfo(name) {
    const lower = name.toLowerCase();

    if (lower.includes('code') || lower.includes('dev') || lower.includes('program') || lower.includes('debug') || lower.includes('learn') || lower.includes('study')) {
      return { category: 'code', icon: '⚡', label: 'Focus' };
    }
    if (lower.includes('water') || lower.includes('drink') || lower.includes('hydrat') || lower.includes('tea')) {
      return { category: 'water', icon: '💧', label: 'Health' };
    }
    if (lower.includes('read') || lower.includes('book') || lower.includes('page') || lower.includes('write') || lower.includes('journal')) {
      return { category: 'read', icon: '📖', label: 'Mind' };
    }
    if (lower.includes('meditat') || lower.includes('zen') || lower.includes('breathe') || lower.includes('yoga') || lower.includes('sleep')) {
      return { category: 'zen', icon: '🧘', label: 'Zen' };
    }
    if (lower.includes('walk') || lower.includes('run') || lower.includes('gym') || lower.includes('workout') || lower.includes('exercise') || lower.includes('stretch')) {
      return { category: 'fitness', icon: '🏃', label: 'Energy' };
    }

    return { category: 'general', icon: '🎯', label: 'Habit' };
  }

  /* ==========================================================================
     Habits List & 7-Day Game Reward Flame Trail
     ========================================================================== */
  function renderHabitsList() {
    elements.habitsList.innerHTML = '';
    const today = getTodayStr();

    if (!state.habits || state.habits.length === 0) {
      elements.habitsList.innerHTML = '<p class="input-hint">No habits configured. Click ⚙️ to add your micro-habits!</p>';
      elements.habitsCountPill.textContent = '0/0 Done';
      return;
    }

    let completedCount = 0;

    state.habits.forEach((habit, index) => {
      const isCompletedToday = habit.lastCompletedDate === today;
      if (isCompletedToday) completedCount++;

      const { category, icon, label } = getHabitCategoryInfo(habit.name);

      const card = document.createElement('div');
      card.className = `habit-game-card tactile-card category-${category}`;

      // 7-day flame reward trail calculation
      const trailHTML = render7DayFlameTrail(habit);

      card.innerHTML = `
        <div class="habit-card-header">
          <div class="habit-main-info">
            <div class="habit-icon-token">${icon}</div>
            <div class="habit-text-group">
              <h4 class="habit-title">${escapeHTML(habit.name)}</h4>
              <div class="habit-streak-status">
                <span class="streak-flame-count">🔥 ${habit.currentStreak || 0}d streak</span>
                <span class="streak-best-badge">🏆 Best: ${habit.bestStreak || 0}d</span>
              </div>
            </div>
          </div>
          <span class="habit-category-pill">${label}</span>
        </div>

        <div class="flame-trail-container">
          <div class="flame-trail-label">
            <span>7-Day Reward Trail</span>
            <span>${isCompletedToday ? '✨ Fed Today' : '⏳ Awaiting Feed'}</span>
          </div>
          <div class="flame-trail-track">
            ${trailHTML}
          </div>
        </div>

        <button class="btn-game-checkin ${isCompletedToday ? 'completed' : 'pending'}" 
                data-index="${index}" 
                ${isCompletedToday ? 'disabled' : ''}>
          ${isCompletedToday ? '<span class="check-icon">✓</span> Fed to ' + (state.petName || 'Bob') + '! 🌿' : 'Mark Done Today ✨'}
        </button>
      `;

      elements.habitsList.appendChild(card);
    });

    // Update header count badge
    elements.habitsCountPill.textContent = `${completedCount}/${state.habits.length} Fed to ${state.petName || 'Bob'}`;

    // Attach check-in listeners
    const checkinBtns = elements.habitsList.querySelectorAll('.btn-game-checkin.pending');
    checkinBtns.forEach(btn => {
      btn.addEventListener('click', handleHabitCheckin);
    });
  }

  /**
   * Generates the 7-day game reward flame trail
   */
  function render7DayFlameTrail(habit) {
    const today = getTodayStr();
    let nodesHTML = '';

    // Generate past 7 days (index 6 = 6 days ago, index 0 = today)
    for (let i = 6; i >= 0; i--) {
      const dateStr = getDateOffsetStr(i);
      const isToday = i === 0;

      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLetter = isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'narrow' });

      let totemStateClass = 'state-empty';
      let totemIcon = '·';

      if (habit.history && habit.history[dateStr]) {
        // Ignited Flame Token
        totemStateClass = 'state-ignited';
        totemIcon = '🔥';
      } else if (isToday) {
        // Today pending check-in
        totemStateClass = 'state-today-pending';
        totemIcon = '✨';
      } else if (habit.createdAt && dateStr >= habit.createdAt) {
        // Missed day: cool ash
        totemStateClass = 'state-missed';
        totemIcon = '💨';
      }

      nodesHTML += `
        <div class="trail-node ${isToday ? 'node-today' : ''}" title="${dateStr}">
          <div class="flame-totem ${totemStateClass}">
            <span>${totemIcon}</span>
          </div>
          <span class="trail-day-name">${dayLetter}</span>
        </div>
      `;
    }

    return nodesHTML;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  /* ==========================================================================
     Event Handlers & Micro-Interaction Orchestration
     ========================================================================== */
  function handleHabitCheckin(e) {
    const btn = e.currentTarget;
    const habitIndex = parseInt(btn.dataset.index, 10);
    const habit = state.habits[habitIndex];
    if (!habit) return;

    const today = getTodayStr();
    if (habit.lastCompletedDate === today) return; // Already done

    // 1. Audio Jingle
    playChime();

    // 2. Update habit state
    habit.lastCompletedDate = today;
    habit.history[today] = true;
    habit.currentStreak = (habit.currentStreak || 0) + 1;

    if (habit.currentStreak > (habit.bestStreak || 0)) {
      habit.bestStreak = habit.currentStreak;
    }

    saveState();

    // 3. Celebratory Particle Flight from Button to Bob
    spawnFlyingSpark(btn);
    spawnBurstParticles(btn);

    // 4. Bob's Celebratory Backflip Leap & Sound
    triggerBobLeap();

    // 5. Update UI
    renderApp();

    // 6. Dialogue Bubble Praise
    const celebrationLines = DIALOGUES.celebrate;
    const randomPraise = celebrationLines[Math.floor(Math.random() * celebrationLines.length)];
    setRandomSpeech(null, randomPraise);
  }

  function triggerBobLeap() {
    elements.petDisplay.classList.remove('bob-celebrate-leap');
    elements.petDisplay.classList.remove('bob-pet-squish');
    void elements.petDisplay.offsetWidth; // Force reflow
    elements.petDisplay.classList.add('bob-celebrate-leap');
  }

  function triggerBobSquish() {
    elements.petDisplay.classList.remove('bob-celebrate-leap');
    elements.petDisplay.classList.remove('bob-pet-squish');
    void elements.petDisplay.offsetWidth; // Force reflow
    elements.petDisplay.classList.add('bob-pet-squish');
  }

  // Interactive Pet Clicking
  elements.petDisplayWrapper.addEventListener('click', (e) => {
    playPop();
    triggerBobSquish();
    spawnHearts(e.clientX, e.clientY);

    const clickLines = DIALOGUES.click;
    const randomClickLine = clickLines[Math.floor(Math.random() * clickLines.length)];
    elements.speechText.textContent = randomClickLine;
  });

  /* ==========================================================================
     Particle & Spark Celebrations
     ========================================================================== */
  function spawnFlyingSpark(targetEl) {
    const btnRect = targetEl.getBoundingClientRect();
    const bobRect = elements.petDisplayWrapper.getBoundingClientRect();

    const startX = btnRect.left + btnRect.width / 2;
    const startY = btnRect.top + btnRect.height / 2;

    const endX = bobRect.left + bobRect.width / 2;
    const endY = bobRect.top + bobRect.height / 2;

    for (let i = 0; i < 4; i++) {
      const spark = document.createElement('div');
      spark.className = 'vitality-flying-spark';
      spark.style.left = `${startX + (Math.random() - 0.5) * 30}px`;
      spark.style.top = `${startY + (Math.random() - 0.5) * 20}px`;

      const flyX = endX - startX + (Math.random() - 0.5) * 40;
      const flyY = endY - startY + (Math.random() - 0.5) * 40;

      spark.style.setProperty('--fly-x', `${flyX}px`);
      spark.style.setProperty('--fly-y', `${flyY}px`);
      spark.style.animationDelay = `${i * 0.08}s`;

      elements.particleContainer.appendChild(spark);
      setTimeout(() => spark.remove(), 1000);
    }
  }

  function spawnBurstParticles(targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const symbols = ['✨', '🌟', '🔥', '🌿', '💖', '✓'];

    for (let i = 0; i < 16; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      p.style.left = `${startX}px`;
      p.style.top = `${startY}px`;

      const dx = (Math.random() - 0.5) * 220;
      const dy = -Math.random() * 160 - 40;
      const rot = (Math.random() - 0.5) * 720;

      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);
      p.style.setProperty('--rot', `${rot}deg`);

      elements.particleContainer.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  function spawnHearts(x, y) {
    const symbols = ['💖', '✨', '🐾', '💕'];
    for (let i = 0; i < 7; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;

      const dx = (Math.random() - 0.5) * 120;
      const dy = -Math.random() * 110 - 30;

      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);

      elements.particleContainer.appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }
  }

  /* ==========================================================================
     Header Controls (Sound, Modals)
     ========================================================================== */
  elements.btnSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem(SOUND_KEY, String(soundEnabled));
    elements.btnSound.textContent = soundEnabled ? '🔊' : '🔇';
    if (soundEnabled) playPop();
  });

  /* ==========================================================================
     Onboarding Setup Handlers
     ========================================================================== */
  document.querySelectorAll('.preset-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const text = tag.dataset.preset;
      const inputs = elements.setupHabitsList.querySelectorAll('.setup-habit-input');
      
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
      playPop();
    });
  });

  elements.setupForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const petName = elements.petNameInput.value.trim() || 'Bob';
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
      alert('Please enter at least 1 micro-habit!');
      return;
    }

    state.petName = petName;
    state.habits = habits.slice(0, 3);
    state.onboarded = true;

    saveState();
    playChime();
    renderApp();
  });

  /* ==========================================================================
     Modals Management (Edit, Reset, Info)
     ========================================================================== */
  // Edit Modal
  elements.btnEditHabits.addEventListener('click', () => {
    elements.editPetName.value = state.petName || 'Bob';
    renderEditHabitsInputs();
    elements.modalEdit.classList.remove('hidden');
    playPop();
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

    if (state.habits.length >= 3) {
      elements.btnAddEditHabit.style.display = 'none';
    } else {
      elements.btnAddEditHabit.style.display = 'inline-block';
    }

    elements.editHabitsInputs.querySelectorAll('.btn-remove-habit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        state.habits.splice(idx, 1);
        renderEditHabitsInputs();
        playPop();
      });
    });
  }

  elements.btnAddEditHabit.addEventListener('click', () => {
    if (state.habits.length < 3) {
      state.habits.push({
        id: 'habit_' + Date.now(),
        name: 'New Micro-Habit',
        createdAt: getTodayStr(),
        currentStreak: 0,
        bestStreak: 0,
        lastCompletedDate: null,
        history: {}
      });
      renderEditHabitsInputs();
      playPop();
    }
  });

  elements.editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPetName = elements.editPetName.value.trim() || 'Bob';
    const inputEls = elements.editHabitsInputs.querySelectorAll('.edit-habit-input');

    inputEls.forEach((input, idx) => {
      if (state.habits[idx]) {
        state.habits[idx].name = input.value.trim();
      }
    });

    state.petName = newPetName;
    saveState();
    elements.modalEdit.classList.add('hidden');
    playChime();
    renderApp();
  });

  elements.closeEditModal.addEventListener('click', () => elements.modalEdit.classList.add('hidden'));
  elements.cancelEditModal.addEventListener('click', () => elements.modalEdit.classList.add('hidden'));

  // Reset Modal
  elements.btnReset.addEventListener('click', () => {
    elements.resetPetName.textContent = state.petName || 'Bob';
    elements.modalReset.classList.remove('hidden');
    playPop();
  });

  elements.confirmResetBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('habitTracker_v1');
    state = JSON.parse(JSON.stringify(defaultState));
    elements.modalReset.classList.add('hidden');
    renderApp();
  });

  elements.closeResetModal.addEventListener('click', () => elements.modalReset.classList.add('hidden'));
  elements.cancelResetModal.addEventListener('click', () => elements.modalReset.classList.add('hidden'));

  // Info Modal
  elements.btnInfo.addEventListener('click', () => {
    elements.modalInfo.classList.remove('hidden');
    playPop();
  });
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
