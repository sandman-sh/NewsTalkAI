/* ═══════════════════════════════════════════════════
   NewsTalk AI — Main Application Module
   ═══════════════════════════════════════════════════ */
import './style.css';
import { NewsService } from './news.js';
import { ElevenLabsService } from './elevenlabs.js';
import { AIService } from './ai.js';
import { VoiceRecognition } from './voice.js';

/* ── State ─────────────────────────────────────── */
const state = {
  settings: {
    country: 'us',
    language: 'en',
    categories: ['general'],
    elevenLabsKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
    tokenRouterKey: import.meta.env.VITE_TOKENROUTER_API_KEY || '',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel - default ElevenLabs voice
  },
  news: [],
  currentIndex: 0,
  isReading: false,
  isSpeaking: false,
  isListening: false,
  activeCategory: 'general',
  conversationHistory: [],
  continuousVoice: false,
  isThinking: false,
};

/* ── Services ──────────────────────────────────── */
let newsService;
let ttsService;
let aiService;
let voiceRecognition;

/* ── DOM References ────────────────────────────── */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const dom = {};

function cacheDom() {
  dom.onboarding = $('#onboarding-modal');
  dom.settingsBtn = $('#settings-btn');
  dom.saveSettingsBtn = $('#save-settings-btn');
  dom.voiceOrb = $('#voice-orb');
  dom.orbStatus = $('#orb-status');
  dom.chatContainer = $('#chat-container');
  dom.chatMessages = $('#chat-messages');
  dom.micBtn = $('#mic-btn');
  dom.stopBtn = $('#stop-btn');
  dom.voiceToggle = $('#voice-toggle-btn');
  dom.articleTitle = $('#article-title');
  dom.articleDesc = $('#article-desc');
  dom.articleSource = $('#article-source');
  dom.articleTime = $('#article-time');
  dom.articleImage = $('#article-image');
  dom.articleImageWrap = $('#article-image-wrap');
  dom.articleBody = $('#article-body');
  dom.newsQueue = $('#news-queue');
  dom.tickerContent = $('#ticker-content');
  dom.navCategories = $('#nav-categories');
  dom.categoryGrid = $('#category-grid');
  dom.settingCountry = $('#setting-country');
  dom.settingLanguage = $('#setting-language');
  dom.themeToggleBtn = $('#theme-toggle-btn');
  dom.currentArticle = $('#current-article');
  dom.aiPanel = $('#ai-panel');
}

/* ── Init ──────────────────────────────────────── */
function init() {
  cacheDom();
  loadSettings();
  setupEventListeners();
  
  const savedTheme = localStorage.getItem('newstalk_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  }
  
  if (!localStorage.getItem('newstalk_settings')) {
    showOnboarding();
  } else {
    hideOnboarding();
    startApp();
  }
}

/* ── Settings Persistence ──────────────────────── */
function loadSettings() {
  try {
    const saved = localStorage.getItem('newstalk_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (import.meta.env.VITE_ELEVENLABS_API_KEY) {
        parsed.elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      }
      if (import.meta.env.VITE_TOKENROUTER_API_KEY) {
        parsed.tokenRouterKey = import.meta.env.VITE_TOKENROUTER_API_KEY;
      }
      state.settings = { ...state.settings, ...parsed };
    }
  } catch (e) { /* ignore */ }
}

function saveSettings() {
  state.settings.country = dom.settingCountry.value;
  state.settings.language = dom.settingLanguage.value;

  
  // Gather selected categories
  const cats = [];
  dom.categoryGrid.querySelectorAll('.cat-chip.active').forEach(c => cats.push(c.dataset.cat));
  state.settings.categories = cats.length ? cats : ['general'];
  state.activeCategory = state.settings.categories[0];

  localStorage.setItem('newstalk_settings', JSON.stringify(state.settings));
}

/* ── Onboarding ────────────────────────────────── */
function showOnboarding() {
  dom.onboarding.classList.remove('hidden');
  dom.settingCountry.value = state.settings.country;
  dom.settingLanguage.value = state.settings.language;

  
  // Restore category selection
  dom.categoryGrid.querySelectorAll('.cat-chip').forEach(btn => {
    btn.classList.toggle('active', state.settings.categories.includes(btn.dataset.cat));
  });
}

function hideOnboarding() {
  dom.onboarding.classList.add('hidden');
}

/* ── Event Listeners ───────────────────────────── */
function setupEventListeners() {
  // Category chips in modal
  dom.categoryGrid.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
  });
  
  // Save settings
  dom.saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    hideOnboarding();
    startApp();
  });
  
  // Open settings
  dom.settingsBtn.addEventListener('click', () => showOnboarding());
  
  // Mic button
  dom.micBtn.addEventListener('click', toggleListening);
  
  // Stop button
  dom.stopBtn.addEventListener('click', stopEverything);
  
  // Voice toggle in nav
  dom.voiceToggle.addEventListener('click', toggleListening);
  
  // Theme toggle
  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('newstalk_theme', isLight ? 'light' : 'dark');
    });
  }
  
  // Orb click
  dom.voiceOrb.addEventListener('click', toggleListening);
  
  // Mobile panel drag
  if (dom.aiPanel) {
    dom.aiPanel.addEventListener('click', (e) => {
      if (window.innerWidth <= 900) {
        dom.aiPanel.classList.toggle('expanded');
      }
    });
  }
}

/* ── Start App ─────────────────────────────────── */
async function startApp() {
  // Initialize services
  newsService = new NewsService();
  ttsService = new ElevenLabsService(state.settings.elevenLabsKey, state.settings.language);
  aiService = new AIService(state.settings.tokenRouterKey, state.settings.language);
  voiceRecognition = new VoiceRecognition(state.settings.language);
  
  // Setup voice recognition callbacks
  voiceRecognition.onResult = handleVoiceInput;
  voiceRecognition.onStart = () => setOrbState('listening');
  voiceRecognition.onEnd = () => resumeListeningIfContinuous();
  
  // Build nav categories
  buildNavCategories();
  
  // Load news
  await loadNews(state.activeCategory);
  
  // Start with a greeting
  const greeting = getGreeting();
  addMessage('ai', greeting);
  speakText(greeting);
}

function getGreeting() {
  return "Ready.";
}

function getCountryName(code) {
  const names = {
    us: 'United States', gb: 'United Kingdom', in: 'India', ca: 'Canada',
    au: 'Australia', de: 'Germany', fr: 'France', jp: 'Japan',
    br: 'Brazil', za: 'South Africa', ae: 'UAE', sg: 'Singapore'
  };
  return names[code] || code.toUpperCase();
}

/* ── Build Nav ─────────────────────────────────── */
function buildNavCategories() {
  dom.navCategories.innerHTML = '';
  state.settings.categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `nav-cat-btn ${cat === state.activeCategory ? 'active' : ''}`;
    btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    btn.addEventListener('click', () => switchCategory(cat));
    dom.navCategories.appendChild(btn);
  });
}

async function switchCategory(cat, isAuto = false) {
  state.activeCategory = cat;
  state.currentIndex = 0;
  
  // Update active state
  dom.navCategories.querySelectorAll('.nav-cat-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase() === cat);
  });
  
  if (!isAuto) {
    stopEverything();
  }
  
  await loadNews(cat);
  
  if (!isAuto) {
    const msg = `Switching to ${cat} news.`;
    addMessage('ai', msg);
    await speakText(msg);
  } else if (state.continuousVoice) {
    if (state.news.length > 0) {
      await readCurrentArticle();
    } else {
      const allCategories = ['general', 'business', 'technology', 'science', 'health', 'sports', 'entertainment', 'politics'];
      const currentIdx = allCategories.indexOf(cat);
      const nextCat = allCategories[(currentIdx + 1) % allCategories.length];
      await switchCategory(nextCat, true);
    }
  }
}

/* ── News Loading ──────────────────────────────── */
async function loadNews(category) {
  showNewsLoading();
  
  try {
    const articles = await newsService.fetchNews(category, state.settings.country, state.settings.language);
    state.news = articles;
    state.currentIndex = 0;
    
    if (articles.length > 0) {
      await displayCurrentArticle();
      renderQueue();
      updateTicker();
    } else {
      dom.articleTitle.textContent = 'No news found';
      dom.articleDesc.textContent = 'Try a different category or country.';
    }
  } catch (err) {
    console.error('News load error:', err);
    dom.articleTitle.textContent = 'Unable to load news';
    dom.articleDesc.textContent = 'Please check your connection and try again.';
  }
}

function showNewsLoading() {
  dom.articleTitle.textContent = '';
  dom.articleTitle.innerHTML = '<div class="skeleton" style="height:32px;width:80%;margin-bottom:8px"></div><div class="skeleton" style="height:32px;width:60%"></div>';
  dom.articleDesc.innerHTML = '<div class="skeleton" style="height:16px;width:100%;margin-bottom:6px"></div><div class="skeleton" style="height:16px;width:90%"></div>';
  dom.articleSource.textContent = '';
  dom.articleTime.textContent = '';
  dom.articleImageWrap.style.display = 'none';
  dom.articleBody.textContent = '';
  dom.newsQueue.innerHTML = Array(5).fill(0).map(() =>
    `<div class="queue-item"><div class="skeleton" style="width:80px;height:60px"></div><div style="flex:1"><div class="skeleton" style="height:14px;width:90%;margin-bottom:6px"></div><div class="skeleton" style="height:14px;width:60%"></div></div></div>`
  ).join('');
}

/* ── Display Article ───────────────────────────── */
async function displayCurrentArticle() {
  const article = state.news[state.currentIndex];
  if (!article) return;
  
  dom.currentArticle.classList.remove('fade-enter');
  void dom.currentArticle.offsetWidth; // trigger reflow
  dom.currentArticle.classList.add('fade-enter');
  
  // Translate dynamically if not English
  if (state.settings.language !== 'en' && !article._translatedTo?.[state.settings.language]) {
    dom.articleTitle.innerHTML = '<div class="skeleton" style="height:32px;width:80%"></div>';
    dom.articleDesc.innerHTML = '<div class="skeleton" style="height:16px;width:100%"></div>';
    
    try {
      const [tTitle, tDesc, tContent] = await Promise.all([
        aiService.translate(article.title, state.settings.language),
        article.description ? aiService.translate(article.description, state.settings.language) : Promise.resolve(''),
        article.content ? aiService.translate(article.content.substring(0, 500), state.settings.language) : Promise.resolve('')
      ]);
      
      article.title = tTitle;
      article.description = tDesc;
      article.content = tContent;
      
      if (!article._translatedTo) article._translatedTo = {};
      article._translatedTo[state.settings.language] = true;
    } catch (e) {
      console.error("Translation failed", e);
    }
  }
  
  dom.articleTitle.innerHTML = '';
  dom.articleTitle.textContent = article.title;
  dom.articleDesc.textContent = article.description || '';
  dom.articleSource.textContent = article.source;
  dom.articleTime.textContent = timeAgo(article.publishedAt);
  dom.articleBody.textContent = article.content || '';
  
  if (article.image) {
    dom.articleImage.src = article.image;
    dom.articleImage.alt = article.title;
    dom.articleImageWrap.style.display = 'block';
  } else {
    dom.articleImageWrap.style.display = 'none';
  }
}

function renderQueue() {
  dom.newsQueue.innerHTML = '';
  state.news.forEach((article, i) => {
    if (i === state.currentIndex) return;
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.innerHTML = `
      ${article.image ? `<img class="queue-item-img" src="${article.image}" alt="" loading="lazy" />` : `<div class="queue-item-img skeleton"></div>`}
      <div class="queue-item-content">
        <div class="queue-item-title">${escapeHtml(article.title)}</div>
        <div class="queue-item-meta">${article.source} · ${timeAgo(article.publishedAt)}</div>
      </div>
    `;
    item.addEventListener('click', async () => {
      state.currentIndex = i;
      await displayCurrentArticle();
      renderQueue();
      readCurrentArticle();
    });
    dom.newsQueue.appendChild(item);
  });
}

function updateTicker() {
  const headlines = state.news.slice(0, 10).map(a => `<span>${escapeHtml(a.title)}</span>`);
  // Duplicate for seamless scroll
  dom.tickerContent.innerHTML = headlines.join('') + headlines.join('');
}

/* ── Voice / TTS ───────────────────────────────── */
let currentSessionId = 0;
let newsSessionId = 0;

async function speakText(text, isNews = false) {
  if (!state.settings.elevenLabsKey) {
    console.warn('No ElevenLabs key');
    return false;
  }
  
  const sessionId = ++currentSessionId;
  state.isSpeaking = true;
  setOrbState('speaking');
  
  resumeListeningIfContinuous();
  
  try {
    await ttsService.speak(text, state.settings.voiceId, isNews);
  } catch (err) {
    console.error('TTS error:', err);
    addMessage('ai', '⚠️ Voice synthesis unavailable. Reading in text mode.');
  }
  
  if (currentSessionId !== sessionId) return false; // Interrupted
  
  state.isSpeaking = false;
  resumeListeningIfContinuous();
  return true;
}

async function resumeNewsAudio() {
  const sessionId = ++currentSessionId;
  state.isSpeaking = true;
  setOrbState('speaking');
  resumeListeningIfContinuous();
  
  await ttsService.resumeNews();
  
  if (currentSessionId !== sessionId) return false;
  
  state.isSpeaking = false;
  resumeListeningIfContinuous();
  return true;
}

function stopSpeaking(pauseNewsInsteadOfStop = false) {
  currentSessionId++;
  if (ttsService) {
    if (pauseNewsInsteadOfStop) {
      ttsService.pauseNews();
      if (ttsService.chatAudio) { ttsService.chatAudio.pause(); ttsService.chatAudio = null; }
    } else {
      ttsService.stop();
    }
  }
  state.isSpeaking = false;
}

async function readCurrentArticle(resume = false) {
  const currentNewsSession = ++newsSessionId;
  
  const article = state.news[state.currentIndex];
  if (!article) return;
  
  state.isReading = true;
  dom.articleTitle.classList.add('reading');
  
  let completed = false;
  if (resume && ttsService && ttsService.newsAudio) {
    addMessage('ai', `▶️ Resuming: "${article.title}"`);
    completed = await resumeNewsAudio();
  } else {
    const readText = `${article.title}. ${article.description || ''} ${article.content ? article.content.substring(0, 500) : ''}`;
    addMessage('ai', `📰 Reading: "${article.title}"`);
    completed = await speakText(readText, true);
  }
  
  if (currentNewsSession !== newsSessionId) return;
  
  if (!completed) {
     dom.articleTitle.classList.remove('reading');
     state.isReading = false;
     return; // Interrupted
  }
  
  dom.articleTitle.classList.remove('reading');
  state.isReading = false;
  
  if (state.currentIndex < state.news.length - 1 && state.continuousVoice) {
    state.currentIndex++;
    await displayCurrentArticle();
    if (currentNewsSession !== newsSessionId) return;
    renderQueue();
    await readCurrentArticle(); // Loop to next article
  } else if (state.continuousVoice) {
    state.isThinking = true;
    
    const allCategories = ['general', 'business', 'technology', 'science', 'health', 'sports', 'entertainment', 'politics'];
    const currentIdx = allCategories.indexOf(state.activeCategory);
    const nextCat = allCategories[(currentIdx + 1) % allCategories.length];
    
    const nextPrompt = state.settings.language === 'en' 
      ? `We've caught up on ${state.activeCategory} news. Let's move on to ${nextCat}.`
      : await aiService.translate(`We've caught up on ${state.activeCategory} news. Let's move on to ${nextCat}.`, state.settings.language);
      
    if (currentNewsSession !== newsSessionId) return;
    state.isThinking = false;
    addMessage('ai', nextPrompt);
    const msgCompleted = await speakText(nextPrompt, false);
    
    if (msgCompleted && state.continuousVoice && currentNewsSession === newsSessionId) {
      await switchCategory(nextCat, true);
    }
  }
}

/* ── Voice Recognition ─────────────────────────── */
function toggleListening() {
  if (state.continuousVoice) {
    stopEverything();
  } else {
    state.continuousVoice = true;
    try { voiceRecognition.start(); } catch(e) {}
    state.isListening = true;
    dom.micBtn.classList.add('active');
    dom.voiceToggle.classList.add('active');
    setOrbState('listening');
    
    if (!state.isReading && !state.isSpeaking) {
       const msg = "Starting NewsTalk. I will begin reading the news.";
       addMessage('ai', msg);
       speakText(msg).then((completed) => {
          if (completed && state.continuousVoice) {
             readCurrentArticle();
          }
       });
    }
  }
}

function resumeListeningIfContinuous() {
  if (state.continuousVoice && !state.isListening && !state.isThinking) {
    setTimeout(() => {
      if (state.continuousVoice && !state.isListening && !state.isThinking) {
        try { voiceRecognition.start(); state.isListening = true; } catch(e){}
        if (state.isSpeaking) setOrbState('speaking');
        else setOrbState('listening');
      }
    }, 500);
  } else if (!state.continuousVoice && !state.isListening && !state.isSpeaking && !state.isThinking) {
    setOrbState('ready');
  }
}

async function handleVoiceInput(transcript) {
  if (!transcript.trim()) return;
  
  newsSessionId++;
  
  if (state.isSpeaking || state.isReading) {
    stopSpeaking(true); // Pause the news instead of destroying it
  }
  
  state.isListening = false;
  state.isThinking = true;
  dom.micBtn.classList.remove('active');
  dom.voiceToggle.classList.remove('active');
  
  addMessage('user', transcript);
  
  // Check for voice commands
  const lower = transcript.toLowerCase();
  
  // Navigation commands
  if (matchCommand(lower, ['next', 'next news', 'next story', 'change the news', 'change news', 'skip', 'अगला', 'siguiente', 'suivant', 'nächste'])) {
    if (state.currentIndex < state.news.length - 1) {
      state.currentIndex++;
      await displayCurrentArticle();
      renderQueue();
      state.isThinking = false;
      await readCurrentArticle();
    } else {
      state.isThinking = false;
      const allCategories = ['general', 'business', 'technology', 'science', 'health', 'sports', 'entertainment', 'politics'];
      const currentIdx = allCategories.indexOf(state.activeCategory);
      const nextCat = allCategories[(currentIdx + 1) % allCategories.length];
      
      const msg = `That was the last story. Switching to ${nextCat} news.`;
      addMessage('ai', msg);
      const completed = await speakText(msg);
      if (completed && state.continuousVoice) {
         await switchCategory(nextCat, true);
      }
    }
    return;
  }
  
  if (matchCommand(lower, ['previous', 'back', 'go back', 'पिछला', 'anterior', 'précédent', 'vorherige'])) {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      await displayCurrentArticle();
      renderQueue();
      state.isThinking = false;
      await readCurrentArticle();
    }
    state.isThinking = false;
    resumeListeningIfContinuous();
    return;
  }
  
  if (matchCommand(lower, ['read', 'start reading', 'read news', 'start', 'yes', 'continue', 'yep', 'sure', 'ok', 'पढ़ो', 'leer', 'lire', 'lesen', 'हाँ', 'sí', 'oui', 'ja', 'resume'])) {
    state.isThinking = false;
    if (ttsService && ttsService.newsAudio) {
      await readCurrentArticle(true);
    } else {
      await readCurrentArticle();
    }
    return;
  }
  
  if (matchCommand(lower, ['stop', 'pause', 'quiet', 'रुको', 'parar', 'arrêter', 'stopp', 'no'])) {
    stopEverything();
    state.continuousVoice = false;
    const msg = "Paused. Let me know when you'd like to continue.";
    addMessage('ai', msg);
    await speakText(msg);
    return;
  }
  
  if (matchCommand(lower, ['refresh', 'reload', 'new news', 'latest'])) {
    await loadNews(state.activeCategory);
    state.isThinking = false;
    const msg = "Here are the latest headlines.";
    addMessage('ai', msg);
    await speakText(msg);
    await readCurrentArticle();
    return;
  }
  
  // Language switch
  const languages = {
    'english': 'en', 'hindi': 'hi', 'spanish': 'es', 'french': 'fr', 
    'german': 'de', 'japanese': 'ja', 'portuguese': 'pt', 'arabic': 'ar', 
    'chinese': 'zh', 'korean': 'ko'
  };
  for (const [name, code] of Object.entries(languages)) {
    if (lower.includes(name) && (lower.includes('language') || lower.includes('speak') || lower.includes('in '))) {
      if (state.settings.language !== code) {
        state.settings.language = code;
        saveSettings();
        ttsService = new ElevenLabsService(state.settings.elevenLabsKey, state.settings.language);
        aiService = new AIService(state.settings.tokenRouterKey, state.settings.language);
        voiceRecognition = new VoiceRecognition(state.settings.language);
        voiceRecognition.onResult = handleVoiceInput;
        voiceRecognition.onStart = () => setOrbState('listening');
        voiceRecognition.onEnd = () => resumeListeningIfContinuous();
        await loadNews(state.activeCategory);
        state.isThinking = false;
        const msg = code === 'en' ? 'Switched to English.' : 'Language changed.';
        addMessage('ai', msg);
        await speakText(msg);
        await readCurrentArticle();
        return;
      }
    }
  }

  // Country switch
  const countries = {
    'united states': 'us', 'us': 'us', 'usa': 'us', 'america': 'us',
    'united kingdom': 'gb', 'uk': 'gb', 'britain': 'gb', 'england': 'gb',
    'india': 'in', 'indian': 'in',
    'canada': 'ca', 'canadian': 'ca',
    'australia': 'au', 'australian': 'au',
    'germany': 'de', 'german': 'de',
    'france': 'fr', 'french': 'fr',
    'japan': 'jp', 'japanese': 'jp',
    'brazil': 'br', 'brazilian': 'br',
    'south africa': 'za', 'south african': 'za',
    'uae': 'ae', 'dubai': 'ae',
    'singapore': 'sg', 'singaporean': 'sg'
  };
  for (const [name, code] of Object.entries(countries)) {
    if (lower.includes(name) && (lower.includes('country') || lower.includes('news'))) {
      if (state.settings.country !== code) {
        state.settings.country = code;
        saveSettings();
        await loadNews(state.activeCategory);
        state.isThinking = false;
        const msg = `Switched to ${name} news.`;
        addMessage('ai', msg);
        await speakText(msg);
        await readCurrentArticle();
        return;
      }
    }
  }

  // Category switch commands
  const categories = ['general', 'business', 'technology', 'science', 'health', 'sports', 'entertainment', 'politics'];
  for (const cat of categories) {
    if (lower.includes(cat)) {
      state.isThinking = false;
      await switchCategory(cat);
      return;
    }
  }
  
  // Otherwise, send to AI for conversation
  await handleAIConversation(transcript);
}

async function handleAIConversation(userMessage) {
  setOrbState('thinking');
  
  const currentArticle = state.news[state.currentIndex];
  const context = currentArticle 
    ? `Current article: "${currentArticle.title}" - ${currentArticle.description || ''} - ${currentArticle.content || ''}`
    : 'No article currently loaded.';
  
  try {
    const response = await aiService.chat(userMessage, context, state.conversationHistory);
    
    state.conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: response }
    );
    
    // Keep conversation history manageable
    if (state.conversationHistory.length > 20) {
      state.conversationHistory = state.conversationHistory.slice(-16);
    }
    
    state.isThinking = false;
    addMessage('ai', response);
    
    await speakText(response, false);
  } catch (err) {
    state.isThinking = false;
    console.error('AI error:', err);
    const errorMsg = 'I had trouble processing that. Could you try again?';
    addMessage('ai', errorMsg);
    await speakText(errorMsg);
  }
}

/* ── Stop Everything ───────────────────────────── */
function stopEverything() {
  state.continuousVoice = false;
  stopSpeaking();
  if (voiceRecognition) voiceRecognition.stop();
  state.isListening = false;
  state.isSpeaking = false;
  state.isReading = false;
  state.isThinking = false;
  dom.micBtn.classList.remove('active');
  dom.voiceToggle.classList.remove('active');
  dom.articleTitle.classList.remove('reading');
  setOrbState('ready');
}

/* ── Orb State ─────────────────────────────────── */
function setOrbState(s) {
  const orb = dom.voiceOrb;
  const status = dom.orbStatus;
  
  orb.classList.remove('listening', 'speaking', 'thinking');
  status.classList.remove('listening', 'speaking');
  
  switch (s) {
    case 'listening':
      orb.classList.add('listening');
      status.classList.add('listening');
      status.textContent = 'Listening...';
      break;
    case 'speaking':
      orb.classList.add('speaking');
      status.classList.add('speaking');
      status.textContent = 'Speaking';
      break;
    case 'thinking':
      orb.classList.add('speaking');
      status.textContent = 'Thinking...';
      break;
    default:
      status.textContent = 'Ready';
  }
}

/* ── Chat Messages ─────────────────────────────── */
function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
  dom.chatMessages.appendChild(div);
  
  setTimeout(() => {
    dom.chatContainer.scrollTo({
      top: dom.chatContainer.scrollHeight,
      behavior: 'smooth'
    });
  }, 50);
}

/* ── Utilities ─────────────────────────────────── */
function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function matchCommand(text, commands) {
  return commands.some(cmd => text.includes(cmd));
}

/* ── Bootstrap ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
