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
    this.currentAudio = null;       // Single audio reference — only ONE audio plays at a time
    this.currentAudioUrl = null;    // For revoking object URLs
    this.abortController = null;    // Abort pending fetch requests
    this.isPlaying = false;
    this._speakGeneration = 0;      // Monotonic counter to detect stale completions
  }

  getVoiceId(language) {
    return VOICE_MAP[language] || VOICE_MAP.en;
  }

  /**
   * Immediately kills ALL audio — stops playback, aborts pending fetches,
   * revokes object URLs, resets state. Safe to call multiple times.
   */
  stopAll() {
    // Increment generation so any in-flight speak() calls bail out
    this._speakGeneration++;

    // Abort any pending API request
    if (this.abortController) {
      try { this.abortController.abort(); } catch (_) {}
      this.abortController = null;
    }

    // Kill current audio
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.src = '';
      } catch (_) {}
      this.currentAudio = null;
    }

    // Revoke object URL
    if (this.currentAudioUrl) {
      try { URL.revokeObjectURL(this.currentAudioUrl); } catch (_) {}
      this.currentAudioUrl = null;
    }

    // Kill browser speechSynthesis fallback
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }

    this.isPlaying = false;
  }

  /**
   * Speak text. Automatically stops any previously playing audio first.
   * Returns a promise that resolves when speech finishes, or rejects if interrupted.
   */
  async speak(text, voiceId = null) {
    // ALWAYS stop everything before starting new speech
    this.stopAll();

    if (!this.apiKey) {
      console.warn('ElevenLabs: No API key provided');
      return this.fallbackSpeak(text);
    }

    const vid = voiceId || this.getVoiceId(this.language);
    const generation = this._speakGeneration;

    // Create a new abort controller for this request
    this.abortController = new AbortController();

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
          signal: this.abortController.signal,
        }
      );

      // Check if we were interrupted while waiting for the API
      if (generation !== this._speakGeneration) return false;

      if (!response.ok) {
        return this.fallbackSpeak(text);
      }

      const audioBlob = await response.blob();

      // Check again after blob download
      if (generation !== this._speakGeneration) return false;

      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudioUrl = audioUrl;

      return new Promise((resolve) => {
        // Final check before creating audio
        if (generation !== this._speakGeneration) {
          URL.revokeObjectURL(audioUrl);
          this.currentAudioUrl = null;
          resolve(false);
          return;
        }

        const audio = new Audio(audioUrl);
        this.currentAudio = audio;
        this.isPlaying = true;

        audio.onended = () => {
          if (this.currentAudio === audio) {
            this.currentAudio = null;
            this.currentAudioUrl = null;
            this.isPlaying = false;
          }
          URL.revokeObjectURL(audioUrl);
          resolve(true); // Completed naturally
        };

        audio.onerror = () => {
          if (this.currentAudio === audio) {
            this.currentAudio = null;
            this.currentAudioUrl = null;
            this.isPlaying = false;
          }
          URL.revokeObjectURL(audioUrl);
          resolve(false);
        };

        audio.play().catch(() => {
          this.isPlaying = false;
          this.currentAudio = null;
          this.currentAudioUrl = null;
          URL.revokeObjectURL(audioUrl);
          this.fallbackSpeak(text).then(() => resolve(true)).catch(() => resolve(false));
        });
      });
    } catch (err) {
      // AbortError means we intentionally cancelled — not an error
      if (err.name === 'AbortError') return false;
      return this.fallbackSpeak(text);
    }
  }

  /**
   * Alias for stopAll — used by main.js
   */
  stop() {
    this.stopAll();
  }

  fallbackSpeak(text) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve(true);
        return;
      }

      // Cancel any previous fallback speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.getLocale(this.language);
      utterance.rate = 0.95;
      utterance.onend = () => { this.isPlaying = false; resolve(true); };
      utterance.onerror = () => { this.isPlaying = false; resolve(false); };

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
