<div align="center">

# 📰 NewsTalk AI

**Profoundly powerful. Effortlessly simple.**

<p align="center">
  A state-of-the-art, voice-controlled news portal engineered with a premium design language. NewsTalk AI transforms how you consume global information by acting as your personal, intelligent news anchor—capable of real-time translation, concurrent listening, and instantaneous conversational interruptions.
</p>

<br />

</div>

---

## ✦ The Architecture of Intelligence

NewsTalk AI isn't just an RSS aggregator; it's a seamless fusion of advanced Large Language Models and ultra-realistic voice synthesis, wrapped in a meticulously crafted, glassmorphic UI.

### Zero-Touch Voice Control
Once activated, the application enters an ambient listening state. It reads the news automatically and listens continuously. You never need to touch the screen or press a button again. 
- **Interrupt at Will:** Ask questions, skip articles, or switch topics *while* the AI is speaking.
- **Conversational Context:** The AI retains the context of the current article, allowing for deep-dive discussions on complex headlines.

### Global Scale Localization
Powered by the TokenRouter API (`openai/gpt-5.4`), NewsTalk AI dynamically translates content and converses in 10 global languages natively.
*Supported:* `English`, `Hindi`, `Spanish`, `French`, `German`, `Japanese`, `Portuguese`, `Arabic`, `Chinese`, `Korean`.

---

## ✦ Aesthetic & Engineering Excellence

We believe that professional tools should feel extraordinary. The interface is dictated by geometric precision and fluid interactions.

*   **Dynamic Theme Engine:** A fully realized CSS variable architecture supporting a high-contrast Day Mode and a deep, OLED-optimized Night Mode.
*   **The Voice Orb:** A central, living component powered by custom `cubic-bezier` keyframes. It pulses, glows, and visually reacts to three distinct states: *Listening*, *Thinking*, and *Speaking*.
*   **Tactile Feedback:** Every interaction, from category chips to navigation modals, features tactile micro-animations and frosted-glass blurs (`backdrop-filter`).

---

## ✦ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Core** | Vanilla JS, HTML5, CSS3 | Pure, lightweight performance without heavy framework overhead. |
| **Build Pipeline** | Vite | Lightning-fast HMR and optimized production bundling. |
| **Cognitive Engine** | TokenRouter | Enterprise routing for the `openai/gpt-5.4` model. |
| **Vocal Synthesis** | ElevenLabs API | Broadcast-grade, emotionally intelligent Text-to-Speech. |
| **Speech Recognition** | Web Speech API | Native browser implementation for zero-latency transcription. |

---

## ✦ Developer Setup

Getting NewsTalk AI running locally requires just a few steps.

### 1. Prerequisites
Ensure you have Node.js (v18+) installed, along with active API credentials for:
*   [ElevenLabs](https://elevenlabs.io/) (for Voice Synthesis)
*   [TokenRouter](https://tokenrouter.com/) (provisioned for `openai/gpt-5.4`)

### 2. Initialization
```bash
# Clone the repository
git clone https://github.com/sandman-sh/NewsTalkAI.git

# Enter directory and install dependencies
cd NewsTalkAI
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root to securely inject your credentials at runtime:
```env
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key_here
VITE_TOKENROUTER_API_KEY=your_tokenrouter_key_here
```

### 4. Launch
```bash
npm run dev
```
Navigate to `http://localhost:5173` to experience the application.

---

## ✦ Voice Command Lexicon

The application's command router interprets natural language intents instantly:

- **Navigation:** *"Next article"*, *"Skip"*, *"Go back"*, *"Previous"*
- **Playback Control:** *"Stop"*, *"Pause"*, *"Start reading"*, *"Yes, continue"*
- **Content Routing:** *"Switch to Business News"*, *"Change country to Japan"*, *"Refresh headlines"*
- **Localization:** *"Speak in French"*, *"Change language to Spanish"*
- **Conversational Queries:** *"Can you explain what this means?"*, *"Give me a summary of this."*

---

<div align="center">
  <small>Engineered with precision. Designed for the future of news.</small><br>
  <small>&copy; 2026 NewsTalk AI.</small>
</div>
