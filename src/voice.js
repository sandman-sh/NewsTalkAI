/* ═══════════════════════════════════════════════════
   Voice Recognition Service
   Web Speech API integration for voice commands
   Supports multiple languages
   ═══════════════════════════════════════════════════ */

const LOCALE_MAP = {
  en: 'en-US',
  hi: 'hi-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  pt: 'pt-BR',
  ar: 'ar-SA',
  zh: 'zh-CN',
  ko: 'ko-KR',
};

export class VoiceRecognition {
  constructor(language = 'en') {
    this.language = language;
    this.recognition = null;
    this.isListening = false;
    this.onResult = null;
    this.onStart = null;
    this.onEnd = null;
    this.onError = null;

    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = LOCALE_MAP[this.language] || 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStart) this.onStart();
    };

    this.recognition.onresult = (event) => {
      // Only process final results (not interim)
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          console.log(`Voice: "${transcript}" (confidence: ${(confidence * 100).toFixed(1)}%)`);
          
          if (this.onResult) {
            this.onResult(transcript, confidence);
          }
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('Voice recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        this.isListening = false;
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
        if (this.onError) this.onError(event.error);
        return;
      }
      
      // For recoverable errors (no-speech, audio-capture, network), 
      // let onend handle the restart
      if (this.onError) this.onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
    };
  }

  start() {
    if (!this.recognition) {
      console.warn('Speech Recognition not available');
      // Fallback: show text input prompt
      const text = prompt('Voice not available. Type your command:');
      if (text && this.onResult) {
        this.onResult(text, 1.0);
      }
      return;
    }

    if (this.isListening) return;

    try {
      this.recognition.lang = LOCALE_MAP[this.language] || 'en-US';
      this.recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) return;

    try {
      this.recognition.stop();
    } catch (err) {
      console.error('Failed to stop recognition:', err);
    }
    this.isListening = false;
  }

  setLanguage(lang) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = LOCALE_MAP[lang] || 'en-US';
    }
  }

  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
}
