<div align="center">

<img src="assets/header.svg" alt="LinkedIn Comment Assistant" width="100%" />

<br/>

![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?logo=googlechrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?logo=openai&logoColor=white)
![LinkedIn](https://img.shields.io/badge/LinkedIn-Feed%20%26%20Threads-0A66C2?logo=linkedin&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-3178c6)

<br/>

**Browse LinkedIn. Pick a tone. Get a short comment or reply — inserted right in the composer.**

[Quick start](#quick-start) · [Capabilities](#capabilities) · [Install](#install) · [Tones](#tones) · [Layout](#layout) · [Privacy](#privacy)

</motion>

---

## What is LinkedIn Comment Assistant?

**LinkedIn Comment Assistant** is a **Chrome extension** that adds an **AI Comment** or **AI Reply** button inside LinkedIn’s comment box. It reads the **post** (and **thread context** when you reply), generates a **one-sentence** response in your chosen **tone**, and **inserts it** into the editor — you review and post.

No subscription. **Your OpenAI API key** stays in the browser. **No backend** — only your machine talks to OpenAI.

---

## Quick start

1. **Load** the extension from the `Linkedin-Assistent` folder → [Install](#install)
2. **Open** the extension popup → paste your **OpenAI API key** → **Save Settings**
3. Go to **[LinkedIn](https://www.linkedin.com)** → open a post → **Comment** or **Reply**
4. Click **AI Comment** or **AI Reply** → choose a **tone** → edit if needed → post

**Optional:** Popup → **Custom Prompts** → add per-tone instructions → **Save Custom Prompts**

---

## Capabilities

**Feed comments** — Extracts post text and author; generates a short, contextual comment.

**Thread replies** — Detects reply context; the button becomes **AI Reply** aimed at that person.

**Eight tones** — Professional, Casual, Supportive, Thought Leader, CEO / Executive, Curious / Question, Agree & Amplify, Respectful Disagree.

**Custom style** — Per-tone instructions merged into prompts from the popup.

**Inline on LinkedIn** — Button in the comment toolbar; supports TipTap / ProseMirror and legacy composers.

**Short by design** — About one sentence (~10–15 words), tuned to avoid generic AI praise.

**Privacy** — API key in `chrome.storage.local`; requests go only to `api.openai.com`.

---

## Install

1. Clone or download this repository
2. Open **`chrome://extensions`** in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the **`Linkedin-Assistent`** folder (contains `manifest.json`)

**Requirements:** Chrome or Chromium · [OpenAI API key](https://platform.openai.com/api-keys) · logged-in LinkedIn session

---

## Tones

| Tone | | Use when |
|------|:-:|----------|
| Professional | 💼 | Business-appropriate, polished |
| Casual | 😊 | Friendly, conversational |
| Supportive | 🙌 | Celebrating wins |
| Thought Leader | 🧠 | Insights and perspective |
| CEO / Executive | 👔 | Leadership angle |
| Curious / Question | ❓ | Thoughtful questions |
| Agree & Amplify | ✅ | Reinforce and add your take |
| Respectful Disagree | 🤔 | Polite alternative view |

---

## Layout

```
Linkedin-Assistent/
├── manifest.json       # MV3 manifest
├── background.js       # OpenAI API, tones, storage
├── content.js          # DOM injection, extraction, UI
├── content.css         # Button, dropdown, dark mode
├── assets/header.svg   # README banner
├── popup/              # Settings + custom prompts
├── utils/prompts.js    # Default tone definitions
└── icons/              # 16 · 48 · 128
```

| Component | Role |
|-----------|------|
| Content script | Finds composers, injects UI, extracts post/reply context |
| Service worker | Builds prompts, calls OpenAI, returns text |
| Popup | Saves API key and custom prompts |

---

## Privacy

Your **API key** and **custom prompts** stay in browser local storage. Post and comment text used for generation is sent only to **OpenAI’s API** from your extension — not to a third-party server. No analytics backend in this project.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Please set your OpenAI API key | Popup → Settings → save `sk-...` key |
| Invalid API key | Verify key and credits at [OpenAI](https://platform.openai.com/api-keys) |
| Button not showing | Refresh LinkedIn; enable extension; open comment/reply box |
| Weak post context | Refresh page; check console for `LCA:` logs |

---

## Cost

You pay **OpenAI** directly. With **gpt-4o-mini** and short outputs, each generation is typically a fraction of a cent.

---

<div align="center">

MIT License — free to use and modify.

</div>
