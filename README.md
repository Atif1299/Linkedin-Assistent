# LinkedIn Comment Assistant

A Chrome extension (Manifest V3) that generates short, contextual LinkedIn comments and thread replies using OpenAI. It injects an **AI Comment** or **AI Reply** button directly into LinkedIn’s comment composer on `linkedin.com`.

## What it does

- **Feed comments** — Reads the post text and author from the feed, generates a one-sentence comment in your chosen tone, and inserts it into the comment box.
- **Thread replies** — When you reply inside a comment thread, it detects reply context (parent comment and the message you’re answering), switches to **AI Reply**, and generates a short reply aimed at that person.
- **Eight tones** — Professional, Casual, Supportive, Thought Leader, CEO / Executive, Curious / Question, Agree & Amplify, Respectful Disagree.
- **Custom style per tone** — Optional extra instructions per tone in the popup; these are merged into the system prompt when generating text.
- **Inline on LinkedIn** — Button appears in the comment toolbar (near emoji/actions). Works with LinkedIn’s current TipTap/ProseMirror editors and older comment box layouts via DOM fallbacks and a `MutationObserver` for dynamically loaded posts.
- **Your API key only** — Key is stored in `chrome.storage.local` in your browser. Requests go from the background service worker to `api.openai.com` only.

Generated text is intentionally **brief** (about one sentence, ~10–15 words) and tuned to avoid generic AI praise patterns.

## Requirements

- Google Chrome (or another Chromium browser with extension support)
- An [OpenAI API key](https://platform.openai.com/api-keys) with billing/credits
- Active session on [LinkedIn](https://www.linkedin.com)

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the **`Linkedin-Assistent`** folder (the directory that contains `manifest.json`).

## Setup

1. Click the extension icon in the toolbar.
2. On the **Settings** tab, paste your OpenAI API key (`sk-...`).
3. Click **Save Settings**.

### Custom prompts (optional)

1. Open the extension popup → **Custom Prompts** tab.
2. Add per-tone instructions (e.g. industry focus, topics to mention).
3. Click **Save Custom Prompts**.

Those notes are appended to the default tone prompts in `background.js` when generating comments or replies.

## Usage

1. Go to LinkedIn and open a post.
2. Click **Comment** (or **Reply** on an existing comment) so the composer is visible.
3. Click **AI Comment** (on a post) or **AI Reply** (inside a thread).
4. Pick a tone from the dropdown.
5. Wait for generation; the text is inserted into the editor. Review and edit before posting.

## Tones

| Tone | Emoji | Typical use |
|------|-------|-------------|
| Professional | 💼 | Business-appropriate, polished |
| Casual | 😊 | Friendly, conversational |
| Supportive | 🙌 | Encouraging, celebratory |
| Thought Leader | 🧠 | Insightful, perspective-driven |
| CEO / Executive | 👔 | Leadership / strategic angle |
| Curious / Question | ❓ | Thoughtful questions |
| Agree & Amplify | ✅ | Agree and add your angle |
| Respectful Disagree | 🤔 | Polite alternative view |

## Project structure

```
Linkedin-Assistent/
├── manifest.json       # Extension manifest (MV3)
├── background.js       # OpenAI API calls, tone prompts, storage
├── content.js          # LinkedIn DOM injection, extraction, UI
├── content.css         # Inline button, dropdown, dark mode styles
├── popup/
│   ├── popup.html      # Settings + custom prompts UI
│   ├── popup.js
│   └── popup.css
├── utils/
│   └── prompts.js      # Shared default tone definitions (reference)
└── icons/              # Extension icons (16, 48, 128)
```

## How it works (technical)

| Piece | Role |
|-------|------|
| **Content script** | Finds comment boxes, injects UI, extracts post/author and reply-thread context, sends messages to the background worker. |
| **Background service worker** | Validates API key, builds prompts (default + custom), calls OpenAI Chat Completions (`gpt-4o-mini`), returns generated text. |
| **Popup** | Saves `openaiApiKey` and `customPrompts` to `chrome.storage.local`. |

**Permissions:** `storage`, `activeTab`; host access to `https://www.linkedin.com/*` and `https://api.openai.com/*`.

## Cost

You pay OpenAI directly. With `gpt-4o-mini` and short `max_tokens`, each generation is typically a fraction of a cent; exact cost depends on your OpenAI pricing and usage.

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| “Please set your OpenAI API key” | Extension icon → Settings → save a valid `sk-` key. |
| “Invalid API key” | Confirm the key at [platform.openai.com](https://platform.openai.com/api-keys) and that the account has credits. |
| Button not showing | Refresh LinkedIn; confirm the extension is enabled; open a comment/reply box on a post. |
| Wrong or empty post context | LinkedIn’s DOM changes often; refresh the page. Check the browser console for `LCA:` logs. |
| Rate limit errors | Wait and retry; check OpenAI usage limits. |

## Privacy

- API key and custom prompts stay in your browser (`chrome.storage.local`).
- Post/comment text needed for generation is sent only to OpenAI’s API from your machine via the extension.
- No separate backend or analytics server in this project.

## License

MIT — free to use and modify.
