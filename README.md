<div align="center">

<img src="https://capsule-render.vercel.app/api?type=venom&height=240&text=LINKEDIN%20COMMENT%0AASSISTANT&color=0:0a66c2,100:004182&fontSize=36&fontColor=ffffff&stroke=ffffff" alt="LinkedIn Comment Assistant banner" />

### **COMMENTS ◆ REPLIES ◆ TONES**

*Chrome extension ◆ OpenAI GPT-4o-mini ◆ 8 writing styles*

<br/>

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://www.google.com/chrome/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white)](https://platform.openai.com/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Feed%20%26%20Threads-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br/>

**Browse LinkedIn. Pick a tone. Get a short comment or reply — inserted right in the composer.**

[Quick start](#quick-start) · [Capabilities](#capabilities) · [Install](#install) · [Tones](#tones) · [Layout](#layout) · [Privacy](#privacy)

</motion>

---

## What is LinkedIn Comment Assistant?

**LinkedIn Comment Assistant** is a **Chrome extension** that adds an **AI Comment** or **AI Reply** button inside LinkedIn’s comment box. It reads the **post** (and **thread context** when you reply), generates a **one-sentence** response in your chosen **tone**, and **inserts it** into the editor — you review and post.

No subscription service. **Your OpenAI API key** stays in the browser. **No backend** — only your machine talks to OpenAI.

---

## Quick start

1. **Load** the extension from the `Linkedin-Assistent` folder ([Install](#install)).
2. **Open** the extension popup → paste your **OpenAI API key** → **Save Settings**.
3. Go to **[LinkedIn](https://www.linkedin.com)** → open a post → click **Comment** or **Reply**.
4. Click **AI Comment** or **AI Reply** → choose a **tone** → edit if needed → post.

<details>
<summary><b>Optional — custom prompts per tone</b></summary>

<br/>

1. Extension popup → **Custom Prompts** tab  
2. Add instructions per tone (e.g. *“Mention my fintech background”*)  
3. **Save Custom Prompts**

</details>

---

## Capabilities

| | Feature |
|---|---------|
| 💬 | **Feed comments** — Extracts post text + author; generates a short, contextual comment |
| ↩️ | **Thread replies** — Detects reply context; button becomes **AI Reply** for that person |
| 🎨 | **8 tones** — Professional, Casual, Supportive, Thought Leader, CEO, Question, Agree, Disagree |
| ✏️ | **Custom style** — Per-tone instructions merged into prompts |
| ⚡ | **Inline UI** — Button in the comment toolbar; works with TipTap / ProseMirror composers |
| 🌓 | **Dark mode** — Dropdown and controls adapt to system theme |
| 🔒 | **Local key** — `chrome.storage.local` only; direct calls to `api.openai.com` |
| 📏 | **Short by design** — ~10–15 words; tuned to avoid generic AI praise |

---

## Install

1. Clone or download this repo.
2. Open **`chrome://extensions`** in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the **`Linkedin-Assistent`** folder (contains `manifest.json`).

> **Requirements:** Chrome (or Chromium), [OpenAI API key](https://platform.openai.com/api-keys) with credits, logged-in LinkedIn session.

---

## Tones

<div align="center">

| Tone | | Best for |
|:--|:-:|---|
| **Professional** | 💼 | Business discussions, networking |
| **Casual** | 😊 | Friendly, light engagement |
| **Supportive** | 🙌 | Celebrating wins and milestones |
| **Thought Leader** | 🧠 | Insights and perspective |
| **CEO / Executive** | 👔 | Leadership and strategy angle |
| **Curious / Question** | ❓ | Thoughtful questions |
| **Agree & Amplify** | ✅ | Reinforce and add your take |
| **Respectful Disagree** | 🤔 | Polite alternative viewpoint |

</div>

---

## Layout

```
Linkedin-Assistent/
├── manifest.json       # MV3 manifest
├── background.js       # OpenAI API, tones, storage
├── content.js          # DOM injection, extraction, UI
├── content.css         # Inline button, dropdown, dark mode
├── popup/              # Settings + custom prompts
├── utils/prompts.js    # Default tone definitions
└── icons/              # 16 · 48 · 128
```

| Component | Role |
|-----------|------|
| **Content script** | Finds composers, injects UI, extracts post/reply context |
| **Service worker** | Builds prompts, calls OpenAI, returns generated text |
| **Popup** | Saves API key and custom prompts |

---

## Privacy

- API key and custom prompts → **browser local storage only**
- Post/comment text → **OpenAI API** (from your extension, not a third-party server)
- **No analytics**, no separate backend in this project

---

## Troubleshooting

<details>
<summary><b>Common issues</b></summary>

<br/>

| Issue | Fix |
|-------|-----|
| “Please set your OpenAI API key” | Popup → Settings → save `sk-...` key |
| “Invalid API key” | Verify key and account credits at [OpenAI](https://platform.openai.com/api-keys) |
| Button not showing | Refresh LinkedIn; enable extension; open comment/reply box |
| Weak post context | Refresh page; check console for `LCA:` logs |
| Rate limit | Wait and retry |

</details>

---

## Cost

You pay **OpenAI** directly. With **gpt-4o-mini** and short outputs, each generation is typically a **fraction of a cent**.

---

<div align="center">

**Made for people who engage on LinkedIn — faster, on-brand, and still human.**

<br/>

MIT License — free to use and modify.

</div>
