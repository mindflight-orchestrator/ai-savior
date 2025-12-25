export type SourceType = 'chatgpt' | 'claude' | 'perplexity' | 'kimi' | 'mistral' | 'deepseek' | 'qwen' | 'manus' | 'grok' | 'other';

export function detectSourceFromUrl(urlString: string): SourceType {
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    if (host === 'chat.openai.com' || host === 'chatgpt.com' || host === 'www.chatgpt.com') return 'chatgpt';
    if (host === 'claude.ai') return 'claude';
    if (host === 'www.perplexity.ai') return 'perplexity';
    if (host === 'kimi.moonshot.cn' || host === 'www.kimi.com' || host === 'kimi.com') return 'kimi';
    if (host === 'chat.mistral.ai') return 'mistral';
    if (host === 'chat.deepseek.com') return 'deepseek';
    if (host === 'chat.qwen.ai') return 'qwen';
    if (host === 'manus.im') return 'manus';
    if (host === 'grok.com') return 'grok';
    return 'other';
  } catch {
    return 'other';
  }
}

/**
 * Canonicalize a URL for deduplication:
 * - remove hash
 * - remove common tracking params
 * - keep pathname
 */
export function normalizeUrl(urlString: string): string {
  const url = new URL(urlString);
  url.hash = '';

  // remove common tracking params
  const trackingParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'ref',
    'ref_src',
    'source',
  ];
  for (const p of trackingParams) url.searchParams.delete(p);

  // keep search params order stable
  const sorted = new URLSearchParams();
  [...url.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([k, v]) => sorted.append(k, v));
  url.search = sorted.toString() ? `?${sorted.toString()}` : '';

  return url.toString();
}

/**
 * Extract hostname from URL string
 */
export function getDomainFromUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

