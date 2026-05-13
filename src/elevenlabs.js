/* ═══════════════════════════════════════════════════
   ElevenLabs TTS Service
   Text-to-Speech with streaming audio playback
   Supports multiple languages via voice selection
   ═══════════════════════════════════════════════════ */

// Language to ElevenLabs voice ID mapping
// These are multilingual voices that support the respective languages
const VOICE_MAP = {
  en: '21m00Tcm4TlvDq8ikWAM',   // Rachel
  hi: 'pFZP5JQG7iQjIQuC4Bku',   // Lily (multilingual)
  es: 'pFZP5JQG7iQjIQuC4Bku',   // Lily
  fr: 'pFZP5JQG7iQjIQuC4Bku',   // Lily
  de: 'pFZP5JQG7iQjIQuC4Bku',   // Lily
  ja: 'pFZP5JQG7iQjIQuC4Bku',   // Lily
  pt: 'pFZP5JQG7iQjIQuC4Bku',   // Lily
  ar: 'pFZP5JQG7iQjIQuC4Bku',   // Lily
  zh: 'pFZP5JQG7iQjIQuC4Bku',   // Lily
  ko: 'pFZP5JQG7iQjIQuC4Bku',   // Lily
};

export class ElevenLabsService {
  constructor(apiKey, language = 'en') {
    this.apiKey = apiKey;
    this.language = language;
    this.newsAudio = null;
    this.chatAudio = null;
    this.isPlaying = false;
  }

  getVoiceId(language) {
    return VOICE_MAP[language] || VOICE_MAP.en;
  }

  async speak(text, voiceId = null, isNews = false) {
    if (!this.apiKey) {
      console.warn('ElevenLabs: No API key provided');
      return this.fallbackSpeak(text, isNews);
    }

    const vid = voiceId || this.getVoiceId(this.language);
    
    // Stop previous audio of the same type
    if (isNews) {
      if (this.newsAudio) { this.newsAudio.pause(); this.newsAudio = null; }
    } else {
      if (this.chatAudio) { this.chatAudio.pause(); this.chatAudio = null; }
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        return this.fallbackSpeak(text, isNews);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        if (isNews) this.newsAudio = audio;
        else this.chatAudio = audio;
        
        this.isPlaying = true;

        audio.onended = () => {
          if (isNews && this.newsAudio === audio) this.newsAudio = null;
          if (!isNews && this.chatAudio === audio) this.chatAudio = null;
          this.isPlaying = (this.newsAudio !== null || this.chatAudio !== null);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onerror = (err) => {
          if (isNews && this.newsAudio === audio) this.newsAudio = null;
          if (!isNews && this.chatAudio === audio) this.chatAudio = null;
          this.isPlaying = (this.newsAudio !== null || this.chatAudio !== null);
          URL.revokeObjectURL(audioUrl);
          reject(err);
        };

        audio.play().catch(err => {
          this.isPlaying = false;
          this.fallbackSpeak(text, isNews).then(resolve).catch(reject);
        });
      });
    } catch (err) {
      return this.fallbackSpeak(text, isNews);
    }
  }

  pauseNews() {
    if (this.newsAudio) {
      this.newsAudio.pause();
      this.isPlaying = (this.chatAudio !== null);
      return true;
    }
    if (window.speechSynthesis) window.speechSynthesis.pause();
    return false;
  }

  resumeNews() {
    if (this.newsAudio) {
      this.isPlaying = true;
      return new Promise((resolve) => {
         const oldEnded = this.newsAudio.onended;
         this.newsAudio.onended = () => {
            if (oldEnded) oldEnded();
            resolve();
         };
         this.newsAudio.play().catch(() => resolve());
      });
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
      this.isPlaying = true;
      return Promise.resolve(); // Simple fallback
    }
    return Promise.resolve();
  }

  stop() {
    if (this.newsAudio) { this.newsAudio.pause(); this.newsAudio = null; }
    if (this.chatAudio) { this.chatAudio.pause(); this.chatAudio = null; }
    this.isPlaying = false;
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  fallbackSpeak(text, isNews) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.getLocale(this.language);
      utterance.rate = 0.95;
      utterance.onend = () => { this.isPlaying = false; resolve(); };
      utterance.onerror = () => { this.isPlaying = false; resolve(); };

      this.isPlaying = true;
      window.speechSynthesis.speak(utterance);
    });
  }

  getLocale(lang) {
    const locales = {
      en: 'en-US', hi: 'hi-IN', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
      ja: 'ja-JP', pt: 'pt-BR', ar: 'ar-SA', zh: 'zh-CN', ko: 'ko-KR',
    };
    return locales[lang] || 'en-US';
  }
}
