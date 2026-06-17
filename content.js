// LinkedIn Comment Assistant - Content Script

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.linkedInCommentAssistantLoaded) return;
  window.linkedInCommentAssistantLoaded = true;
  
  // Tone configurations (synced with background.js)
  const TONES = {
    professional: { name: "Professional", emoji: "💼" },
    casual: { name: "Casual", emoji: "😊" },
    supportive: { name: "Supportive", emoji: "🙌" },
    thoughtLeader: { name: "Thought Leader", emoji: "🧠" },
    ceo: { name: "CEO / Executive", emoji: "👔" },
    question: { name: "Curious / Question", emoji: "❓" },
    agree: { name: "Agree & Amplify", emoji: "✅" },
    disagree: { name: "Respectful Disagree", emoji: "🤔" }
  };
  
  // Detect if we're in a reply-to-reply context
  function detectReplyContext(commentBox) {
    const context = {
      isReplyToReply: false,
      originalComment: null,
      theirReply: null,
      replierName: null
    };
    
    try {
      // SIMPLE CHECK: If the comment box is inside a comment container, it's a reply
      const isInsideCommentItem = commentBox.closest('.comments-comment-item') ||
                                   commentBox.closest('.comments-replies-list') ||
                                   commentBox.closest('.comments-comment-entity') ||
                                   commentBox.closest('[class*="replies"]');
      
      if (isInsideCommentItem) {
        context.isReplyToReply = true;
      } else {
        return context; // Not in a reply context
      }
      
      // Strategy: Find all comment elements above this reply box
      // Walk up the DOM to find the comment thread structure
      
      // Method 1: Find the immediate parent comment item (the one we're replying to)
      let currentElement = commentBox.parentElement;
      let foundComments = [];
      
      while (currentElement && foundComments.length < 5) {
        // Check if this element contains comment text
        const commentTextEl = currentElement.querySelector('.comments-comment-item__main-content') ||
                              currentElement.querySelector('.update-components-text') ||
                              currentElement.querySelector('[data-test-id*="comment"]');
        
        if (commentTextEl && !foundComments.includes(commentTextEl)) {
          const text = extractTextFromElement(commentTextEl);
          const nameEl = currentElement.querySelector('.comments-post-meta__name-text') ||
                        currentElement.querySelector('.update-components-actor__name') ||
                        currentElement.querySelector('[class*="actor-name"]') ||
                        currentElement.querySelector('.hoverable-link-text');
          const name = nameEl?.textContent?.trim()?.split('\n')[0] || 'Someone';
          
          if (text && text.length > 5) {
            foundComments.push({ text, name, element: currentElement });
          }
        }
        
        currentElement = currentElement.parentElement;
      }
      
      // Method 2: Also look for sibling comments (replies above us in the same thread)
      const repliesContainer = commentBox.closest('.comments-replies-list') ||
                               commentBox.closest('[class*="replies-list"]');
      
      if (repliesContainer) {
        const allReplies = repliesContainer.querySelectorAll('.comments-comment-item');
        allReplies.forEach(replyEl => {
          const textEl = replyEl.querySelector('.comments-comment-item__main-content') ||
                        replyEl.querySelector('.update-components-text');
          const nameEl = replyEl.querySelector('.comments-post-meta__name-text') ||
                        replyEl.querySelector('.hoverable-link-text');
          
          if (textEl) {
            const text = extractTextFromElement(textEl);
            const name = nameEl?.textContent?.trim()?.split('\n')[0] || 'Someone';
            if (text && text.length > 5 && !foundComments.find(c => c.text === text)) {
              foundComments.push({ text, name, element: replyEl });
            }
          }
        });
      }
      
      console.log('LCA: Found comments in thread:', foundComments.map(c => ({ name: c.name, preview: c.text?.substring(0, 50) })));
      
      // Assign based on what we found
      if (foundComments.length >= 2) {
        // Last one is likely the reply we're responding to
        context.theirReply = foundComments[foundComments.length - 1].text;
        context.replierName = foundComments[foundComments.length - 1].name;
        // First/earlier one is likely the original parent comment
        context.originalComment = foundComments[0].text;
      } else if (foundComments.length === 1) {
        // Just one comment found - this is the one we're replying to
        context.theirReply = foundComments[0].text;
        context.replierName = foundComments[0].name;
      }
      
    } catch (err) {
      console.log('LCA: Error detecting reply context:', err);
    }
    
    return context;
  }
  
  // Extract clean text from a comment element
  function extractTextFromElement(element) {
    if (!element) return null;
    
    // Clone to avoid modifying original
    const clone = element.cloneNode(true);
    
    // Remove "see more" buttons and other non-content elements
    clone.querySelectorAll('button, .see-more, [class*="see-more"]').forEach(el => el.remove());
    
    let text = clone.textContent || clone.innerText || '';
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Remove any leading @mentions (like "Muhammad Atif ")
    text = text.replace(/^@?\w+\s+\w+\s*/, '');
    
    return text.substring(0, 500);
  }
  
  // Extract text content from a comment element (legacy - kept for compatibility)
  function extractCommentContent(commentElement) {
    if (!commentElement) return null;
    
    const contentSelectors = [
      '.comments-comment-item__main-content',
      '.comments-comment-item-content-body',
      '.update-components-text',
      '.feed-shared-text',
      '[class*="comment-item__content"]',
      '.break-words'
    ];
    
    for (const selector of contentSelectors) {
      const el = commentElement.querySelector(selector);
      if (el) {
        return extractTextFromElement(el);
      }
    }
    
    return null;
  }
  
  // Create and inject the assistant UI - INLINE version
  function createAssistantUI(commentBox) {
    // Check if already injected anywhere in this comment box area
    if (commentBox.querySelector('.lca-inline-btn') || 
        commentBox.parentElement?.querySelector('.lca-inline-btn')) return;
    
    // Find the toolbar/actions area inside the comment box (where emoji and image buttons are)
    const toolbarSelectors = [
      '.comments-comment-box__controls',
      '.comments-comment-texteditor__toolbar',
      '.comment-box__actions',
      '[class*="comment"][class*="controls"]',
      '[class*="comment"][class*="toolbar"]',
      '.ql-editor-toolbar'
    ];
    
    let toolbar = null;
    for (const selector of toolbarSelectors) {
      toolbar = commentBox.querySelector(selector);
      if (toolbar) break;
    }
    
    // If no toolbar found, try to find emoji button and insert next to it
    if (!toolbar) {
      const emojiBtn = commentBox.querySelector('[data-test-icon="emoji-small"]') ||
                       commentBox.querySelector('[data-test-icon="smiley-face-small"]') ||
                       commentBox.querySelector('button[class*="emoji"]') ||
                       commentBox.querySelector('button svg') ||
                       commentBox.querySelector('.comments-comment-box-comment__text-editor');
      if (emojiBtn) {
        toolbar = emojiBtn.parentElement;
      }
    }
    
    // Create the inline button
    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'lca-inline-wrapper';
    btnWrapper.style.cssText = 'display: inline-flex; position: relative; margin-left: 4px;';
    
    // Check if this is a reply context to show appropriate label
    const isReplyContext = detectReplyContext(commentBox).isReplyToReply;
    const buttonLabel = isReplyContext ? 'AI Reply' : 'AI Comment';
    const buttonTitle = isReplyContext ? 'Generate AI Reply' : 'Generate AI Comment';
    
    btnWrapper.innerHTML = `
      <button class="lca-inline-btn" title="${buttonTitle}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <span>${buttonLabel}</span>
      </button>
      
      <div class="lca-dropdown" style="display: none;">
        <div class="lca-dropdown-header">Select Tone</div>
        <div class="lca-tone-list">
          ${Object.entries(TONES).map(([key, tone]) => `
            <button class="lca-tone-btn" data-tone="${key}">
              <span class="lca-tone-emoji">${tone.emoji}</span>
              <span class="lca-tone-name">${tone.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
      
      <div class="lca-loading" style="display: none;">
        <div class="lca-spinner"></div>
        <span>Generating...</span>
      </div>
      
      <div class="lca-error" style="display: none;">
        <span class="lca-error-text"></span>
        <button class="lca-error-close">×</button>
      </div>
    `;
    
    // Insert inline - try different placement strategies
    if (toolbar) {
      // Insert as first child of toolbar or before emoji button
      const firstBtn = toolbar.querySelector('button');
      if (firstBtn) {
        toolbar.insertBefore(btnWrapper, firstBtn);
      } else {
        toolbar.insertBefore(btnWrapper, toolbar.firstChild);
      }
    } else {
      // Fallback: Find the comment input wrapper and inject inside it
      const inputWrapper = commentBox.querySelector('.comments-comment-box-comment__text-editor') ||
                          commentBox.querySelector('[class*="text-editor"]') ||
                          commentBox.querySelector('.ql-container');
      if (inputWrapper) {
        // Insert at the end of the input wrapper, positioned inline
        const parent = inputWrapper.parentElement;
        if (parent) {
          // Look for the actions/buttons container next to the input
          const actionsContainer = parent.querySelector('[class*="controls"]') ||
                                   parent.querySelector('[class*="actions"]');
          if (actionsContainer) {
            actionsContainer.insertBefore(btnWrapper, actionsContainer.firstChild);
          } else {
            parent.appendChild(btnWrapper);
          }
        }
      } else {
        // Last fallback - just don't inject if we can't find the right place
        return;
      }
    }
    
    // Setup event listeners
    setupEventListeners(btnWrapper, commentBox);
  }
  
  function setupEventListeners(container, commentBox) {
    const generateBtn = container.querySelector('.lca-inline-btn');
    const dropdown = container.querySelector('.lca-dropdown');
    const loading = container.querySelector('.lca-loading');
    const error = container.querySelector('.lca-error');
    const errorText = container.querySelector('.lca-error-text');
    const errorClose = container.querySelector('.lca-error-close');
    const toneButtons = container.querySelectorAll('.lca-tone-btn');
    
    // Toggle dropdown
    generateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      error.style.display = 'none';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
    
    // Handle tone selection
    toneButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const toneKey = btn.dataset.tone;
        
        dropdown.style.display = 'none';
        loading.style.display = 'flex';
        error.style.display = 'none';
        generateBtn.style.display = 'none';
        
        try {
          const postData = extractPostContent(container);
          
          // Check if we're in a reply-to-reply context
          const replyContext = detectReplyContext(commentBox);
          
          let response;
          if (replyContext.isReplyToReply) {
            // Use the reply-specific action
            console.log('LCA: Detected reply context', replyContext);
            response = await chrome.runtime.sendMessage({
              action: "generateReply",
              toneKey: toneKey,
              postContent: postData.content,
              authorName: postData.author,
              originalComment: replyContext.originalComment,
              theirReply: replyContext.theirReply,
              replierName: replyContext.replierName
            });
          } else {
            // Regular comment generation
            response = await chrome.runtime.sendMessage({
              action: "generateComment",
              toneKey: toneKey,
              postContent: postData.content,
              authorName: postData.author
            });
          }
          
          if (response.error) {
            throw new Error(response.error);
          }
          
          insertComment(commentBox, response.comment);
          
        } catch (err) {
          errorText.textContent = err.message;
          error.style.display = 'flex';
        } finally {
          loading.style.display = 'none';
          generateBtn.style.display = 'inline-flex';
        }
      });
    });
    
    // Close error
    errorClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      error.style.display = 'none';
    });
  }
  
  function extractPostContent(container) {
    // Find the post container
    let postContainer = container.closest('.feed-shared-update-v2') || 
                        container.closest('.occludable-update') ||
                        container.closest('[data-urn]') ||
                        container.closest('.scaffold-finite-scroll__content');
    
    // Try to find the actual post element if we're too high up
    if (!postContainer || postContainer.classList.contains('scaffold-finite-scroll__content')) {
      postContainer = container.closest('.feed-shared-update-v2__description-wrapper')?.closest('.feed-shared-update-v2') ||
                      container.parentElement?.closest('.feed-shared-update-v2');
    }
    
    let content = "Unable to extract post content";
    let author = "the author";
    
    if (postContainer) {
      // Extract post text - try multiple selectors
      const textSelectors = [
        '.feed-shared-update-v2__description',
        '.feed-shared-text',
        '.update-components-text',
        '[data-test-id="main-feed-activity-card__commentary"]',
        '.break-words'
      ];
      
      for (const selector of textSelectors) {
        const textEl = postContainer.querySelector(selector);
        if (textEl && textEl.textContent.trim()) {
          content = textEl.textContent.trim().substring(0, 1500); // Limit length
          break;
        }
      }
      
      // Extract author name
      const authorSelectors = [
        '.update-components-actor__name',
        '.feed-shared-actor__name',
        '.update-components-actor__title',
        '[data-test-id="main-feed-activity-card__entity-lockup"] span[dir="ltr"]'
      ];
      
      for (const selector of authorSelectors) {
        const authorEl = postContainer.querySelector(selector);
        if (authorEl && authorEl.textContent.trim()) {
          author = authorEl.textContent.trim().split('\n')[0].trim();
          break;
        }
      }
    }
    
    return { content, author };
  }
  
  function insertComment(commentBox, comment) {
    // LinkedIn uses contenteditable divs or input fields
    const editableDiv = commentBox.querySelector('[contenteditable="true"]') ||
                        commentBox.querySelector('.ql-editor') ||
                        commentBox.querySelector('div[role="textbox"]');
    
    if (editableDiv) {
      // For contenteditable
      editableDiv.focus();
      editableDiv.innerHTML = '';
      
      // Create a text node and paragraph
      const p = document.createElement('p');
      p.textContent = comment;
      editableDiv.appendChild(p);
      
      // Trigger input event to notify LinkedIn
      editableDiv.dispatchEvent(new Event('input', { bubbles: true }));
      editableDiv.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editableDiv);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      // Fallback: try to find any input/textarea
      const input = commentBox.querySelector('input, textarea');
      if (input) {
        input.value = comment;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }
  
  // Find and process comment boxes
  function findCommentBoxes() {
    // LinkedIn comment box selectors
    const commentBoxSelectors = [
      '.comments-comment-box',
      '.comment-box',
      '[data-test-id="comments-comment-box"]',
      '.comments-comment-texteditor',
      '.feed-shared-update-v2__comments-container .comment-box',
      '.comments-comment-box-comment__text-editor'
    ];
    
    commentBoxSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(box => {
        createAssistantUI(box);
      });
    });
  }
  
  // Observe DOM changes for dynamically loaded content
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        shouldProcess = true;
      }
    });
    
    if (shouldProcess) {
      // Debounce processing
      clearTimeout(window.lcaProcessTimeout);
      window.lcaProcessTimeout = setTimeout(findCommentBoxes, 500);
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Initial scan
  setTimeout(findCommentBoxes, 1000);
  
  // Also process on scroll (for lazy-loaded content)
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(findCommentBoxes, 300);
  });
  
  console.log('LinkedIn Comment Assistant loaded');
})();
