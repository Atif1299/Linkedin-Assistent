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
    }
    
    return context;
  }
  
  // Extract author name from post container
  function extractAuthorName(postElement) {
    if (!postElement) {
      return "the author";
    }
    
    let authorName = "the author";
    
    // First try to find all links that have /in/ in href
    const profileLinks = postElement.querySelectorAll('a[href*="/in/"]');
    
    for (let i = 0; i < profileLinks.length; i++) {
      const profileLink = profileLinks[i];
      
      // Try to get all text content from the link
      const linkText = (profileLink.innerText || profileLink.textContent || '').replace(/\s+/g, ' ').trim();
      
      // Clean up link text by removing common LinkedIn phrases
      let cleanedLinkText = linkText
        .replace(/premium profile/i, '')
        .replace(/following/i, '')
        .replace(/view profile/i, '')
        .replace(/^view/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanedLinkText && cleanedLinkText.length >= 2) {
        authorName = cleanedLinkText;
        return authorName;
      }
      
      // Also try aria-label
      const ariaLabel = profileLink.getAttribute('aria-label');
      if (ariaLabel) {
        let cleanedAriaLabel = ariaLabel
          .replace(/premium profile/i, '')
          .replace(/following/i, '')
          .replace(/view profile/i, '')
          .replace(/^view/i, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanedAriaLabel && cleanedAriaLabel.length >= 2) {
          authorName = cleanedAriaLabel;
          return authorName;
        }
      }
      
      // Look for any span or p inside or near the link
      const nameElements = profileLink.querySelectorAll('span, p');
      for (const el of nameElements) {
        const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (text && text.length >= 2 && !/^(premium|following|view|profile|connection)$/i.test(text)) {
          authorName = text.split('\n')[0].trim();
          return authorName;
        }
      }
    }
    
    // If profile link not found, try existing selectors as fallback
    const authorSelectors = [
      '.update-components-actor__name',
      '.feed-shared-actor__name',
      '.update-components-actor__title',
      '[data-test-id="main-feed-activity-card__entity-lockup"] span[dir="ltr"]',
      'a[aria-label][href*="/in/"] span[dir="ltr"]',
      'a[href*="/in/"] span[dir="ltr"]'
    ];
    
    for (const selector of authorSelectors) {
      const authorEl = postElement.querySelector(selector);
      if (authorEl) {
        const name = (authorEl?.innerText || authorEl?.textContent || '').replace(/\s+/g, ' ').trim();
        if (name) {
          authorName = name.split('\n')[0].trim();
          break;
        }
      }
    }
    
    return authorName;
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
    // Normalize: sometimes we’re handed the inner editor element, not the whole comment box.
    // The injection logic expects a container that also includes the toolbar/actions area.
    const normalizedBox =
      // New LinkedIn TipTap comment composer wrapper
      commentBox?.closest?.('[data-testid="ui-core-tiptap-text-editor-wrapper"]') ||
      // Comment box root (recent builds often use a componentkey prefix)
      commentBox?.closest?.('[componentkey^="commentBox-"]') ||
      commentBox?.closest?.('.comments-comment-box') ||
      commentBox?.closest?.('.comments-comment-texteditor') ||
      commentBox?.closest?.('.comment-box') ||
      commentBox;

    // Check if already injected anywhere in this comment box area
    if (
      normalizedBox?.querySelector?.('.lca-inline-btn') ||
      normalizedBox?.parentElement?.querySelector?.('.lca-inline-btn')
    )
      return;
    
    // Find the toolbar/actions area inside the comment box (where emoji and image buttons are)
    const toolbarSelectors = [
      // Newer LinkedIn builds often render a bottom action row near the editor
      '[data-testid*="text-editor"] button',
      '.comments-comment-box__controls',
      '.comments-comment-texteditor__toolbar',
      '.comment-box__actions',
      '[class*="comment"][class*="controls"]',
      '[class*="comment"][class*="toolbar"]',
      '.ql-editor-toolbar'
    ];
    
    let toolbar = null;
    for (const selector of toolbarSelectors) {
      toolbar = normalizedBox?.querySelector?.(selector) || null;
      if (!toolbar) toolbar = normalizedBox?.parentElement?.querySelector?.(selector) || null;
      if (toolbar) break;
    }
    
    // If no toolbar found, try to find emoji button and insert next to it
    if (!toolbar) {
      const emojiBtn =
        normalizedBox?.querySelector?.('[data-test-icon="emoji-small"]') ||
        normalizedBox?.querySelector?.('[data-test-icon="smiley-face-small"]') ||
        normalizedBox?.querySelector?.('button[class*="emoji"]') ||
        // New DOM: the "Post comment" / related controls often sit near the TipTap wrapper
        normalizedBox?.querySelector?.('[data-testid*="text-editor"]')?.querySelector?.('button') ||
        // Less specific fallback: any nearby button
        normalizedBox?.querySelector?.('button') ||
        normalizedBox?.parentElement?.querySelector?.('[data-test-icon="emoji-small"]') ||
        normalizedBox?.parentElement?.querySelector?.('[data-test-icon="smiley-face-small"]') ||
        normalizedBox?.parentElement?.querySelector?.('button[class*="emoji"]') ||
        normalizedBox?.parentElement?.querySelector?.('button');
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
      const inputWrapper =
        // New TipTap wrapper (matches your DOM snippet)
        normalizedBox?.querySelector?.('[data-testid="ui-core-tiptap-text-editor-wrapper"]') ||
        (normalizedBox?.matches?.('[data-testid="ui-core-tiptap-text-editor-wrapper"]') ? normalizedBox : null) ||
        normalizedBox?.querySelector?.('.comments-comment-box-comment__text-editor') ||
        // If normalizedBox *is* the editor, allow it directly
        (normalizedBox?.matches?.('.comments-comment-box-comment__text-editor') ? normalizedBox : null) ||
        normalizedBox?.querySelector?.('[class*="text-editor"]') ||
        normalizedBox?.querySelector?.('.ql-container') ||
        // New editor surface: TipTap/ProseMirror
        normalizedBox?.querySelector?.('.tiptap.ProseMirror') ||
        normalizedBox?.parentElement?.querySelector?.('.comments-comment-box-comment__text-editor') ||
        normalizedBox?.parentElement?.querySelector?.('[class*="text-editor"]') ||
        normalizedBox?.parentElement?.querySelector?.('.ql-container');
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
            // Final fallback for hashed/new DOM: anchor inside the editor wrapper
            // so the button is visible even with no recognizable toolbar.
            try {
              const computed = window.getComputedStyle(parent);
              if (computed.position === 'static') parent.style.position = 'relative';
            } catch (_) {}
            btnWrapper.style.position = 'absolute';
            btnWrapper.style.right = '8px';
            btnWrapper.style.bottom = '8px';
            btnWrapper.style.zIndex = '9999';
            parent.appendChild(btnWrapper);
          }
        }
      } else {
        // Last fallback - just don't inject if we can't find the right place
        return;
      }
    }
    
    // Setup event listeners
    setupEventListeners(btnWrapper, normalizedBox);
  }
  
  function setupEventListeners(container, commentBox) {
    const generateBtn = container.querySelector('.lca-inline-btn');
    const dropdown = container.querySelector('.lca-dropdown');
    const loading = container.querySelector('.lca-loading');
    const error = container.querySelector('.lca-error');
    const errorText = container.querySelector('.lca-error-text');
    const errorClose = container.querySelector('.lca-error-close');
    const toneButtons = container.querySelectorAll('.lca-tone-btn');

    function sendExtensionMessage(payload) {
      const runtime =
        globalThis?.chrome?.runtime ||
        globalThis?.browser?.runtime ||
        null;

      const sendMessage = runtime?.sendMessage;
      if (typeof sendMessage !== 'function') {
        return Promise.reject(
          new Error(
            'Extension messaging unavailable. Reload the extension and refresh LinkedIn.'
          )
        );
      }

      return new Promise((resolve, reject) => {
        try {
          sendMessage.call(runtime, payload, (response) => {
            const lastError = globalThis?.chrome?.runtime?.lastError;
            if (lastError) {
              return reject(new Error(lastError.message));
            }
            resolve(response);
          });
        } catch (err) {
          reject(err);
        }
      });
    }

    // In the new LinkedIn feed composer, ancestors often have overflow clipping.
    // To ensure the dropdown is visible, we "portal" it to document.body and position it
    // under the button using getBoundingClientRect().
    const dropdownPortalState = {
      isOpen: false,
      isPortaled: false,
      originalParent: null,
      originalNextSibling: null
    };

    function positionDropdown() {
      if (!dropdown) return;
      const rect = generateBtn.getBoundingClientRect();
      dropdown.style.position = 'fixed';
      dropdown.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 220))}px`;
      dropdown.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - 20)}px`;
      dropdown.style.zIndex = '2147483647';
    }

    function ensureDropdownPortaled() {
      if (!dropdown || dropdownPortalState.isPortaled) return;
      dropdownPortalState.originalParent = dropdown.parentElement;
      dropdownPortalState.originalNextSibling = dropdown.nextSibling;
      document.body.appendChild(dropdown);
      dropdownPortalState.isPortaled = true;
    }

    function openDropdown() {
      if (!dropdown) return;
      ensureDropdownPortaled();
      positionDropdown();
      dropdown.style.display = 'block';
      dropdownPortalState.isOpen = true;
    }

    function closeDropdown() {
      if (!dropdown) return;
      dropdown.style.display = 'none';
      dropdownPortalState.isOpen = false;
    }
    
    // Toggle dropdown
    generateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dropdownPortalState.isOpen) openDropdown();
      else closeDropdown();
      error.style.display = 'none';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (dropdownPortalState.isOpen) {
        if (!container.contains(target) && !dropdown.contains(target)) closeDropdown();
      }
    });

    window.addEventListener('scroll', () => {
      if (dropdownPortalState.isOpen) positionDropdown();
    }, true);

    window.addEventListener('resize', () => {
      if (dropdownPortalState.isOpen) positionDropdown();
    });
    
    // Handle tone selection
    toneButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const toneKey = btn.dataset.tone;
        
        closeDropdown();
        loading.style.display = 'flex';
        error.style.display = 'none';
        generateBtn.style.display = 'none';
        
        try {
          const postData = await extractPostContent(container);
          
          // Check if we're in a reply-to-reply context
          const replyContext = detectReplyContext(commentBox);
          
          let response;
          if (replyContext.isReplyToReply) {
            // Use the reply-specific action
            response = await sendExtensionMessage({
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
            response = await sendExtensionMessage({
              action: "generateComment",
              toneKey: toneKey,
              postContent: postData.content,
              authorName: postData.author
            });
          }
          
          if (response.error) {
            throw new Error(response.error);
          }
          
          await insertComment(commentBox, response.comment, postData.author);
          
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
  
  async function extractPostContent(container) {
    // Find the post container - add more selectors
    let postContainer = container.closest('.feed-shared-update-v2') || 
                        container.closest('.occludable-update') ||
                        container.closest('[data-urn]') ||
                        container.closest('[data-urn^="urn:li:activity:"]') ||
                        container.closest('[data-urn^="urn:li:share:"]') ||
                        container.closest('[role="article"]') ||
                        container.closest('[data-testid*="feed-update"]') ||
                        container.closest('[data-testid*="post"]') ||
                        // Matches what your Playwright scraper uses in main.py
                        container.closest("div[role='listitem']") ||
                        container.closest('.scaffold-finite-scroll__content');
    
    // Try to find the actual post element if we're too high up
    if (!postContainer || postContainer.classList.contains('scaffold-finite-scroll__content')) {
      postContainer = container.closest('.feed-shared-update-v2__description-wrapper')?.closest('.feed-shared-update-v2') ||
                      container.parentElement?.closest('.feed-shared-update-v2') ||
                      container.closest('[data-testid*="feed-update"]') ||
                      container.closest('[data-testid*="post"]');
    }
    
    let content = "Unable to extract post content";
    let author = "the author";
    
    if (postContainer) {
      // First, try to click "see more" if it exists to expand the post (try multiple selectors!)
      const seeMoreBtnSelectors = [
        'button.see-more', 
        '[data-testid*="see-more"]',
        'button:has-text("see more")',
        'button:has-text("See more")',
        'button:has-text("...see more")'
      ];
      
      for (const sel of seeMoreBtnSelectors) {
        let btn;
        try {
          btn = postContainer.querySelector(sel);
        } catch (e) {
          // has-text is css-in-js, might not work, skip
        }
        if (!btn) {
          // Try a more brute force approach to find any button with "see more" text
          const buttons = postContainer.querySelectorAll('button');
          for (const b of buttons) {
            if ((b.textContent || b.innerText || '').toLowerCase().includes('see more')) {
              btn = b;
              break;
            }
          }
        }
        if (btn) {
          btn.click();
          await new Promise(r => setTimeout(r, 500)); // Wait longer for expand
          break;
        }
      }
      
      // Extract post text - try multiple selectors and pick the longest valid one
      const textSelectors = [
        // Matches what your Playwright scraper uses in main.py (high-signal for feed posts)
        'span[data-testid="expandable-text-box"]',
        // Common/stable testids (newer builds)
        '[data-testid*="commentary"]',
        '[data-testid*="post-content"]',
        '[data-testid*="feed-shared-update"] [data-testid*="commentary"]',
        // Legacy selectors
        '.feed-shared-update-v2__description',
        '.feed-shared-text',
        '.update-components-text',
        '[data-test-id="main-feed-activity-card__commentary"]',
        '.break-words',
        // Generic fallbacks for text blocks
        'span[dir="ltr"]',
        'div[dir="auto"]',
        // Last resort: look for any element that might contain the main post text
        'div[class*="text"], span[class*="text"], p[class*="text"]'
      ];
      
      let longestText = '';
      for (const selector of textSelectors) {
        const textEl = postContainer.querySelector(selector);
        // Use textContent first to avoid innerText truncation issues!
        let text = (textEl?.textContent || textEl?.innerText || '').trim();
        // Replace line breaks and multiple spaces with single spaces
        text = text.replace(/\s+/g, ' ');
        if (text && text.length >= 30 && !/^(\d+\s+reactions?|comment|like|share)$/i.test(text)) {
          if (text.length > longestText.length) {
            longestText = text;
          }
        }
      }
      
      if (longestText.length > 0) {
        content = longestText;
      }

      if (content === "Unable to extract post content") {
        try {
          const candidates = Array.from(
            postContainer.querySelectorAll('span, div, p')
          )
            .filter(el => {
              const role = el.getAttribute('role') || '';
              if (role === 'button' || role === 'img') return false;
              const tag = el.tagName.toLowerCase();
              if (tag === 'button') return false;
              const ariaHidden = el.getAttribute('aria-hidden');
              if (ariaHidden === 'true') return false;
              return true;
            })
            .map(el => ({
              el,
              text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
            }))
            .filter(x => x.text.length >= 40)
            .filter(x => !/^(comment|like|share|repost|send)$/i.test(x.text))
            .sort((a, b) => b.text.length - a.text.length);

          if (candidates[0]?.text) {
            content = candidates[0].text;
          }
        } catch (_) {}
      }
      
      // Extract author name using helper function
      author = extractAuthorName(postContainer);
    }
    
    return { content, author };
  }
  
  function showExtractToast(text) {
    try {
      const existing = document.getElementById('lca-extract-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'lca-extract-toast';
      toast.style.cssText =
        'position:fixed;bottom:16px;right:16px;z-index:2147483647;' +
        'max-width:420px;max-height:240px;overflow:auto;' +
        'background:#111827;color:#fff;padding:12px 14px;border-radius:10px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.28);font-size:12px;line-height:1.35;' +
        'white-space:pre-wrap;';
      toast.textContent = text || '(empty)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 6000);
    } catch (_) {}
  }

  function injectTestExtractor() {
    // Put a "Test Extract" button next to the feed's Comment action.
    // This avoids relying on hashed classnames and anchors to svg#comment-small from your DOM snippet.
    const commentIcons = document.querySelectorAll('svg#comment-small');
    commentIcons.forEach(icon => {
      const btn = icon.closest('button');
      if (!btn) return;

      // Anchor in the same action bar container that holds the comment button.
      const actionBar = btn.parentElement;
      if (!actionBar) return;

      if (actionBar.querySelector('.lca-test-extract-btn')) return;

      const testBtn = document.createElement('button');
      testBtn.type = 'button';
      testBtn.className = 'lca-test-extract-btn';
      testBtn.textContent = 'Test Extract';
      testBtn.style.cssText =
        'margin-left:8px;padding:4px 10px;border-radius:14px;border:1px solid rgba(0,0,0,.18);' +
        'background:linear-gradient(135deg,#0a66c2 0%,#004182 100%);color:#fff;font-weight:600;font-size:12px;cursor:pointer;height:28px;';

      testBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const post = actionBar.closest('[role="article"]') || actionBar.closest("div[role='listitem']") || actionBar.closest('[data-urn]');
        const data = await extractPostContent(post || actionBar);
        showExtractToast(
          `Author: ${data.author}\n\nExtracted text (${(data.content || '').length} chars):\n${data.content}`
        );
      });

      actionBar.appendChild(testBtn);
    });
  }

  // Helper function to simulate typing into contenteditable more reliably
  function typeText(element, text) {
    element.focus();
    
    // Use execCommand because it works well with LinkedIn's editor
    document.execCommand('insertText', false, text);
    
    // Trigger input event
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Helper function to wait for an element to appear
  function waitForMentionDropdown(timeout = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const check = () => {
        // Look for any possible mention dropdown selectors
        const dropdown = 
          document.querySelector('[role="listbox"][aria-label*="Mention suggestions"]') ||
          document.querySelector('[role="listbox"][data-testid*="mention"]') ||
          document.querySelector('[role="listbox"]') ||
          document.querySelector('[data-testid="typeahead-results-container"]') ||
          document.querySelector('[aria-label*="Mention suggestions"]');
        
        if (dropdown) {
          resolve(dropdown);
          return;
        }
        
        if (Date.now() - startTime < timeout) {
          setTimeout(check, 100);
        } else {
          resolve(null);
        }
      };
      
      check();
    });
  }

  // Helper function to insert a real LinkedIn mention
  async function insertLinkedInMention(editableDiv, authorName) {
    if (!authorName || authorName === "the author") {
      return false;
    }
    
    try {
      // Clear the field and prepare
      editableDiv.focus();
      editableDiv.innerHTML = '';
      
      // Type '@' character
      typeText(editableDiv, '@');
      await new Promise(r => setTimeout(r, 400));
      
      // Type the author's first name for better matching (LinkedIn often matches on first name)
      const firstName = authorName.split(' ')[0];
      typeText(editableDiv, firstName);
      await new Promise(r => setTimeout(r, 700));
      
      // Wait for mention dropdown
      const mentionDropdown = await waitForMentionDropdown();
      
      if (mentionDropdown) {
        // Find first option with role="option"
        let firstOption = mentionDropdown.querySelector('[role="option"]');
        if (!firstOption) {
          // Fallback: find any clickable element inside dropdown
          firstOption = mentionDropdown.querySelector('div, li, button')?.closest('[role="option"]') || 
                        mentionDropdown.querySelector('div, li, button');
        }
        
        if (firstOption) {
          // Try to click the option
          firstOption.click();
          
          // Also try simulating Enter press as backup
          const enterEvent = new KeyboardEvent('keydown', { 
            bubbles: true, 
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13
          });
          editableDiv.dispatchEvent(enterEvent);
          
          await new Promise(r => setTimeout(r, 400));
          
          // Type a space to separate mention from comment
          typeText(editableDiv, ' ');
          
          return true;
        }
      }
    } catch (err) {
    }
    
    // Fallback: just insert the author name as plain text @mention
    editableDiv.innerHTML = '';
    typeText(editableDiv, `@${authorName} `);
    return false;
  }

  async function insertComment(commentBox, comment, authorName) {
    // LinkedIn uses contenteditable divs or input fields
    const editableDiv = commentBox.querySelector('[contenteditable="true"]') ||
                        commentBox.querySelector('.ql-editor') ||
                        commentBox.querySelector('div[role="textbox"]');
    
    if (editableDiv) {
      // For contenteditable
      editableDiv.focus();
      
      if (authorName && authorName !== "the author") {
        // Try to insert a real mention first
        await insertLinkedInMention(editableDiv, authorName);
      } else {
        // No author name, just clear the editor
        editableDiv.innerHTML = '';
      }
      
      // Then type the rest of the comment
      typeText(editableDiv, comment);
      
      // Trigger input event to notify LinkedIn
      editableDiv.dispatchEvent(new Event('input', { bubbles: true }));
      editableDiv.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Fallback: try to find any input/textarea
      const input = commentBox.querySelector('input, textarea');
      if (input) {
        if (authorName && authorName !== "the author") {
          input.value = `@${authorName} ${comment}`;
        } else {
          input.value = comment;
        }
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
      '.comments-comment-box-comment__text-editor',
      // New feed comment composer (TipTap)
      '[data-testid="ui-core-tiptap-text-editor-wrapper"]',
      // New editor surface (TipTap/ProseMirror)
      '[contenteditable="true"][role="textbox"][aria-label*="Text editor for creating comment"]',
      '.tiptap.ProseMirror',
      // Some builds provide a stable componentkey
      '[componentkey^="commentBox-"]'
    ];
    
    commentBoxSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(box => {
        // Normalize nested editor elements up to their actual comment box container.
        const normalized =
          box.closest('[componentkey^="commentBox-"]') ||
          box.closest('[data-testid="ui-core-tiptap-text-editor-wrapper"]') ||
          box.closest('.comments-comment-box') ||
          box.closest('.comments-comment-texteditor') ||
          box.closest('.comment-box') ||
          box;
        createAssistantUI(normalized);
      });
    });

    // Debug helper for new DOM extraction validation
    injectTestExtractor();
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
})();
