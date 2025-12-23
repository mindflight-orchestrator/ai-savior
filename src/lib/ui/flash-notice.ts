/**
 * Flash Notice (Toast) UI Component
 * Displays temporary notifications on web pages for Beast Mode status
 */

export interface FlashNoticeOptions {
  message: string;
  type?: 'success' | 'info' | 'warning';
  duration?: number; // milliseconds, default 5000
}

/**
 * Show a flash notice (toast) on the current page
 * Returns a function to dismiss the notice
 */
export function showFlashNotice(options: FlashNoticeOptions): () => void {
  const { message, type = 'success', duration = 5000 } = options;

  // Remove any existing flash notice
  const existing = document.getElementById('ai-saver-flash-notice');
  if (existing) {
    existing.remove();
  }

  // Create flash notice element
  const notice = document.createElement('div');
  notice.id = 'ai-saver-flash-notice';
  notice.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    max-width: 350px;
    padding: 12px 16px;
    background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: auto;
    word-wrap: break-word;
  `;
  notice.textContent = message;

  // Append to body
  document.body.appendChild(notice);

  // Trigger animation (slide in from bottom)
  requestAnimationFrame(() => {
    notice.style.opacity = '1';
    notice.style.transform = 'translateY(0)';
  });

  // Auto-dismiss after duration
  let dismissTimeout: NodeJS.Timeout | null = setTimeout(() => {
    dismiss();
  }, duration);

  // Dismiss function
  const dismiss = () => {
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      dismissTimeout = null;
    }
    notice.style.opacity = '0';
    notice.style.transform = 'translateY(20px)';
    setTimeout(() => {
      if (notice.parentNode) {
        notice.parentNode.removeChild(notice);
      }
    }, 300);
  };

  // Dismiss on click
  notice.addEventListener('click', dismiss);

  return dismiss;
}

/**
 * Show Beast Mode success notification (when conversation is saved)
 */
export function showBeastModeSaved(source: string, version?: number): void {
  const sourceNames: Record<string, string> = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    perplexity: 'Perplexity',
    kimi: 'Kimi',
    mistral: 'Mistral',
    deepseek: 'DeepSeek',
    qwen: 'Qwen',
    manus: 'Manus',
    grok: 'Grok',
  };
  const sourceName = sourceNames[source] || source;
  const versionText = version ? ` (v${version})` : '';
  
  showFlashNotice({
    message: `✅ Conversation sauvegardée${versionText} – ${sourceName}`,
    type: 'success',
    duration: 4000,
  });
}
