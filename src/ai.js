/* ═══════════════════════════════════════════════════
   AI Service — TokenRouter API Integration
   Conversational AI for news discussion
   Supports multi-language responses
   ═══════════════════════════════════════════════════ */

const TOKENROUTER_API = 'https://api.tokenrouter.com/v1/chat/completions';

const LANGUAGE_NAMES = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French', de: 'German',
  ja: 'Japanese', pt: 'Portuguese', ar: 'Arabic', zh: 'Chinese', ko: 'Korean',
};

export class AIService {
  constructor(apiKey, language = 'en') {
    this.apiKey = apiKey;
    this.language = language;
  }

  getSystemPrompt(context) {
    const langName = LANGUAGE_NAMES[this.language] || 'English';
    return `You are NewsTalk AI, a sophisticated voice-controlled news assistant. You help users understand, discuss, and explore the news.

CRITICAL RULES:
1. Always respond in ${langName} (language code: ${this.language}).
2. Keep responses concise and conversational — they will be read aloud.
3. Maximum 2-3 sentences per response unless the user asks for details.
4. Be engaging, informative, and opinionated when appropriate.
5. When discussing news, provide context, analysis, and relevant background.
6. If the user asks to switch topics, categories, or navigate, acknowledge and help.
7. You can suggest related stories or deeper dives on topics.
8. Be warm and professional, like a personal news anchor.

VOICE COMMANDS YOU UNDERSTAND:
- "next" / "skip" — move to next article
- "previous" / "back" — go back
- "read" / "start" — begin reading current article
- "stop" / "pause" — pause reading
- "refresh" — get latest news
- Category names (business, tech, sports, etc.) — switch category
- Any question about the current article

CURRENT CONTEXT:
${context}`;
  }

  async chat(userMessage, context, history = []) {
    if (!this.apiKey) {
      return this.fallbackResponse(userMessage);
    }

    const messages = [
      { role: 'system', content: this.getSystemPrompt(context) },
      ...history.slice(-10),
      { role: 'user', content: userMessage },
    ];

    try {
      const response = await fetch(TOKENROUTER_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-5.4',
          messages: messages,
          max_tokens: 300,
          temperature: 0.7,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('TokenRouter API error:', response.status, errText);
        return this.fallbackResponse(userMessage);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || this.fallbackResponse(userMessage);
    } catch (err) {
      console.error('AI chat error:', err);
      return this.fallbackResponse(userMessage);
    }
  }

  async translate(text, targetLang) {
    if (targetLang === 'en') return text;
    
    if (!this.apiKey) return text;

    try {
      const response = await fetch(TOKENROUTER_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-5.4',
          messages: [
            { role: 'system', content: `Translate the following text to ${LANGUAGE_NAMES[targetLang] || 'English'}. Return only the translation, nothing else.` },
            { role: 'user', content: text },
          ],
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      if (!response.ok) return text;
      const data = await response.json();
      return data.choices?.[0]?.message?.content || text;
    } catch {
      return text;
    }
  }

  fallbackResponse(userMessage) {
    const lower = userMessage.toLowerCase();
    
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return "Hello! I'm NewsTalk AI. Ask me about any news story, or say 'read' to start hearing the headlines.";
    }
    if (lower.includes('what') || lower.includes('tell me') || lower.includes('explain')) {
      return "I'd love to help you understand this story better. Could you be more specific about what you'd like to know?";
    }
    if (lower.includes('summary') || lower.includes('summarize')) {
      return "Let me summarize the current article for you. This story covers the latest developments — say 'read' for the full details.";
    }
    
    return "I understand. Would you like me to continue reading the news, or is there something specific you'd like to discuss?";
  }
}
