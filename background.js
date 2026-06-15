// Background service worker for API calls

// Import prompts (in extension context, we'll include this inline)
const DEFAULT_PROMPTS = {
  professional: {
    name: "Professional",
    emoji: "💼",
    systemPrompt: `You are a professional LinkedIn commenter. Write formal, business-appropriate comments that add value to the conversation. Be articulate, insightful, and maintain a polished tone. Avoid slang and casual language.`
  },
  casual: {
    name: "Casual",
    emoji: "😊",
    systemPrompt: `You are a friendly LinkedIn commenter. Write warm, conversational comments that feel genuine and approachable. Use a relaxed tone while still being respectful and relevant.`
  },
  supportive: {
    name: "Supportive",
    emoji: "🙌",
    systemPrompt: `You are an encouraging LinkedIn commenter. Write positive, uplifting comments that celebrate achievements and offer genuine support. Be enthusiastic but authentic.`
  },
  thoughtLeader: {
    name: "Thought Leader",
    emoji: "🧠",
    systemPrompt: `You are an insightful thought leader on LinkedIn. Add unique perspectives, share relevant insights, and demonstrate expertise. Your comments should provoke deeper thinking and add substantial value.`
  },
  ceo: {
    name: "CEO / Executive",
    emoji: "👔",
    systemPrompt: `You are a C-level executive commenting on LinkedIn. Write with authority, strategic vision, and leadership presence. Your comments should reflect experience, wisdom, and a high-level perspective on business matters.`
  },
  question: {
    name: "Curious / Question",
    emoji: "❓",
    systemPrompt: `You are a curious professional on LinkedIn. Ask thoughtful, engaging questions that spark discussion and show genuine interest in the topic. Your questions should encourage the author to elaborate.`
  },
  agree: {
    name: "Agree & Amplify",
    emoji: "✅",
    systemPrompt: `You are a supportive LinkedIn commenter who agrees with the post. Express agreement while adding your own perspective or experience that reinforces the author's point. Be genuine, not sycophantic.`
  },
  disagree: {
    name: "Respectful Disagree",
    emoji: "🤔",
    systemPrompt: `You are a respectful LinkedIn commenter offering an alternative viewpoint. Disagree politely and constructively, presenting your perspective with evidence or reasoning. Never be rude or dismissive.`
  }
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "generateComment") {
    handleGenerateComment(request)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === "generateReply") {
    handleGenerateReply(request)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (request.action === "getTones") {
    sendResponse({ tones: DEFAULT_PROMPTS });
    return true;
  }
});

async function handleGenerateComment({ toneKey, postContent, authorName }) {
  // Get API key and custom prompts from storage
  const storage = await chrome.storage.local.get(['openaiApiKey', 'customPrompts']);
  
  if (!storage.openaiApiKey) {
    throw new Error("Please set your OpenAI API key in the extension settings (click extension icon)");
  }
  
  if (!storage.openaiApiKey.startsWith('sk-')) {
    throw new Error("Invalid API key format. Please check your OpenAI API key in settings");
  }
  
  const tone = DEFAULT_PROMPTS[toneKey];
  if (!tone) {
    throw new Error("Invalid tone selected");
  }
  
  // Build system prompt with user's custom additions
  let systemPrompt = tone.systemPrompt + `

CRITICAL - YOU MUST FOLLOW THESE RULES:
1. Write ONLY 1 short sentence (15 words max)
2. DO NOT mention the author in this comment - their mention will be added automatically
3. DO NOT compliment or praise the author AT ALL
4. DO NOT use ANY dash characters in comments, including "-" or "–"
5. DO NOT use ANY of these patterns:
   - "Your [noun] on/about X..."
   - "Your emphasis on..."
   - "You've captured..."
   - "Your insight/perspective/point..."
   - "This resonates..."
   - "Powerful reminder..."
   - "Spot on..."
   - "Game changer..."
   - "Looking forward..."
6. INSTEAD: Share a quick thought, personal take, question, observation, or add a related idea
7. Sound like a real person dropping a quick comment, not an AI generating praise
8. Keep it conversational, natural, and human
9. Never start with generic praise or agreement
10. Do not repeat the author's main point word for word
11. Output only the comment text with no quotes, emojis, hashtags, or extra formatting`;

  const customPrompts = storage.customPrompts || {};
  
  if (customPrompts[toneKey] && customPrompts[toneKey].trim()) {
    systemPrompt += `\n\nUser's personal style: ${customPrompts[toneKey].trim()}`;
  }
  
  const userPrompt = `Post topic: "${postContent}"

Write 1 short reaction (15 words max) that ADDS something to the conversation. 
Share YOUR take, a related thought, or build on their idea.
DO NOT mention the author, DO NOT praise them. DO NOT say "your X is Y". Just add value.`;

  // Call OpenAI API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${storage.openaiApiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 50,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your OpenAI API key in settings.");
    }
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    throw new Error(errorData.error?.message || "Failed to generate comment");
  }
  
  const data = await response.json();
  let comment = data.choices[0]?.message?.content?.trim();
  
  if (!comment) {
    throw new Error("No comment generated. Please try again.");
  }
  
  // Remove any leading author name if the model still added it
  const authorFirstName = authorName.split(' ')[0];
  if (comment.toLowerCase().startsWith(authorFirstName.toLowerCase())) {
    comment = comment.substring(authorFirstName.length).replace(/^[,\s]+/, '');
  }
  
  return { comment };
}

async function handleGenerateReply({ toneKey, postContent, authorName, originalComment, theirReply, replierName }) {
  // Get API key from storage
  const storage = await chrome.storage.local.get(['openaiApiKey', 'customPrompts']);
  
  if (!storage.openaiApiKey) {
    throw new Error("Please set your OpenAI API key in the extension settings (click extension icon)");
  }
  
  if (!storage.openaiApiKey.startsWith('sk-')) {
    throw new Error("Invalid API key format. Please check your OpenAI API key in settings");
  }
  
  const tone = DEFAULT_PROMPTS[toneKey];
  if (!tone) {
    throw new Error("Invalid tone selected");
  }
  
  // Build a reply-specific system prompt
  let systemPrompt = `You are replying to someone who commented on a LinkedIn thread. Write short, direct replies.
STRICT RULES:
- Write ONLY 1 sentence (max 10-15 words)
- Be conversational and genuine
- Directly address what they said
- NEVER use AI-sounding phrases like "great point", "love this perspective", "couldn't agree more"
- Sound like a real person texting back`;

  const customPrompts = storage.customPrompts || {};
  if (customPrompts[toneKey] && customPrompts[toneKey].trim()) {
    systemPrompt += `\n\nUser's personal style: ${customPrompts[toneKey].trim()}`;
  }
  
  // Build the user prompt with full context
  const replierFirstName = (replierName || 'there').split(' ')[0];
  
  let userPrompt = `CONTEXT:
Post by ${authorName}: "${postContent?.substring(0, 300) || 'N/A'}"

`;

  if (theirReply) {
    // Full reply-to-reply context
    userPrompt += `Original comment in thread: "${originalComment?.substring(0, 200) || 'N/A'}"

${replierName} replied: "${theirReply.substring(0, 200)}"

Write ONE short reply (10-15 words max) to ${replierFirstName}. Be direct and reference what they specifically said.`;
  } else {
    // Just replying to a single comment
    userPrompt += `Comment by ${replierName}: "${originalComment?.substring(0, 200) || 'N/A'}"

Write ONE short reply (10-15 words max) to ${replierFirstName}. Be direct and conversational.`;
  }

  // Call OpenAI API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${storage.openaiApiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 40,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your OpenAI API key in settings.");
    }
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    throw new Error(errorData.error?.message || "Failed to generate reply");
  }
  
  const data = await response.json();
  const comment = data.choices[0]?.message?.content?.trim();
  
  if (!comment) {
    throw new Error("No reply generated. Please try again.");
  }
  
  return { comment };
}
