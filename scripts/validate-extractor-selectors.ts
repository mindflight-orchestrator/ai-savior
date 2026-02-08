/**
 * Validates extractor-defaults.json selectors by visiting each host and
 * evaluating the configured XPaths in the live page context.
 *
 * Run from repo root: pnpm run validate:selectors
 * Optional: HEADED=1 to run browser in headed mode (helps with Cloudflare).
 *
 * Many sites use Cloudflare or similar protection. The script:
 * - Uses launch args to reduce automation detection (e.g. AutomationControlled).
 * - Waits 2.5s after load so challenge pages can complete.
 * - Reports CLOUDFLARE when a challenge/access-protection page is detected.
 * If you see CLOUDFLARE, try HEADED=1 or run with system Chrome (channel: 'chrome').
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, '../chrome_extension/config/extractor-defaults.json');
const REPORT_PATH = path.resolve(__dirname, '../chrome_extension/doc/extractor-validation-report.md');

// First XPath used in extractor special handlers (from extractor.ts)
const SPECIAL_FIRST_XPATH = {
  __kimi_special__:
    '//*[@id="page-layout-container"]/div/div[2]/div/div/div/div[1]/div/div[4]/div/div[2]/div/div[3]/div/div[1]',
  __deepseek_special__:
    '//*[@id="root"]/div/div/div[2]/div[3]/div/div[2]/div/div[2]/div[1]',
} as const;

type HostConfig = {
  source?: string;
  title?: string;
  conversation?: string;
  message?: string;
  selectorType?: string;
  inManifest?: boolean;
  inUrlDetector?: boolean;
  notes?: string;
};

type ValidationResult = {
  host: string;
  url: string;
  status: 'OK' | 'FAIL' | 'SKIP' | 'LOGIN_WALL' | 'CLOUDFLARE';
  conversationValid: boolean;
  conversationNodes: number;
  messageValid: boolean;
  messageNodes: number;
  messageKind: 'xpath' | 'special' | 'empty';
  error?: string;
};

/** Detect Cloudflare (or similar) challenge / "Checking your browser" page */
async function isCloudflareChallenge(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => {
    const title = (document.title || '').toLowerCase();
    const bodyText = (document.body?.innerText || document.body?.textContent || '').toLowerCase();
    const html = (document.documentElement?.innerHTML || '').toLowerCase();
    const indicators = [
      'just a moment',
      'checking your browser',
      'cf-browser-verification',
      'enable javascript and cookies',
      'cloudflare',
      'ray id',
      'ddos protection by perimeterx',
      'access denied',
      'blocked',
    ];
    for (const s of indicators) {
      if (title.includes(s) || bodyText.includes(s) || html.includes(s)) return true;
    }
    return false;
  });
}

function loadConfig(): Record<string, HostConfig> {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const data = JSON.parse(raw) as { hosts?: Record<string, HostConfig> };
  if (!data.hosts || typeof data.hosts !== 'object') {
    throw new Error('Config must have a "hosts" object');
  }
  return data.hosts;
}

/**
 * Evaluate XPaths in browser context. Returns counts and validity.
 * Runs in page.evaluate() so it has access to document.
 */
function getEvaluatePayload(
  conversation: string | undefined,
  message: string | undefined
): { conversation: string; message: string; messageXPath: string; messageKind: 'xpath' | 'special' } | null {
  const conv = conversation ?? '//title';
  if (!message || message === '') {
    return null;
  }
  const isSpecial = message === '__kimi_special__' || message === '__deepseek_special__';
  const messageXPath = isSpecial
    ? (SPECIAL_FIRST_XPATH[message as keyof typeof SPECIAL_FIRST_XPATH] ?? '')
    : message;
  return {
    conversation: conv,
    message,
    messageXPath,
    messageKind: isSpecial ? 'special' : 'xpath',
  };
}

async function validateHost(
  page: import('@playwright/test').Page,
  host: string,
  cfg: HostConfig
): Promise<ValidationResult> {
  const url = `https://${host}`;
  const result: ValidationResult = {
    host,
    url,
    status: 'OK',
    conversationValid: false,
    conversationNodes: 0,
    messageValid: false,
    messageNodes: 0,
    messageKind: 'empty',
  };

  // Skip hosts with no message selector
  if (!cfg.message || cfg.message === '') {
    result.status = 'SKIP';
    result.messageKind = 'empty';
    return result;
  }

  const payload = getEvaluatePayload(cfg.conversation, cfg.message);
  if (!payload) {
    result.status = 'SKIP';
    return result;
  }
  result.messageKind = payload.messageKind;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2500));
  } catch (e) {
    result.status = 'FAIL';
    result.error = e instanceof Error ? e.message : String(e);
    return result;
  }

  const cloudflare = await isCloudflareChallenge(page);
  if (cloudflare) {
    result.status = 'CLOUDFLARE';
    result.error = 'Challenge or access-protection page detected (e.g. Cloudflare). Try HEADED=1 or real Chrome.';
  }

  try {
    const evalResult = await page.evaluate(
      (p: {
        conversation: string;
        messageXPath: string;
      }) => {
        const out: {
          conversationValid: boolean;
          conversationNodes: number;
          messageValid: boolean;
          messageNodes: number;
          error?: string;
        } = {
          conversationValid: false,
          conversationNodes: 0,
          messageValid: false,
          messageNodes: 0,
        };
        try {
          const convResult = document.evaluate(
            p.conversation,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          out.conversationValid = true;
          out.conversationNodes = convResult.singleNodeValue ? 1 : 0;
        } catch (err) {
          out.conversationValid = false;
          out.error = (err as Error).message;
        }
        try {
          const msgResult = document.evaluate(
            p.messageXPath,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          out.messageValid = true;
          out.messageNodes = msgResult.snapshotLength;
        } catch (err) {
          out.messageValid = false;
          out.error = (out.error ? out.error + '; ' : '') + (err as Error).message;
        }
        return out;
      },
      { conversation: payload.conversation, messageXPath: payload.messageXPath }
    );

    result.conversationValid = evalResult.conversationValid;
    result.conversationNodes = evalResult.conversationNodes;
    result.messageValid = evalResult.messageValid;
    result.messageNodes = evalResult.messageNodes;
    if (evalResult.error) result.error = evalResult.error;

    if (result.status !== 'CLOUDFLARE') {
      if (!evalResult.conversationValid || !evalResult.messageValid) {
        result.status = 'FAIL';
      } else if (evalResult.messageNodes === 0) {
        result.status = 'LOGIN_WALL';
      }
    }
  } catch (e) {
    result.status = 'FAIL';
    result.error = e instanceof Error ? e.message : String(e);
  }

  return result;
}

function printReport(results: ValidationResult[]): void {
  console.log('\n--- Extractor selectors validation report ---\n');
  const header =
    'Host'.padEnd(24) +
    'Status'.padEnd(12) +
    'Conv'.padEnd(6) +
    'Conv#'.padEnd(6) +
    'Msg'.padEnd(6) +
    'Msg#'.padEnd(6) +
    'Kind'.padEnd(8);
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const r of results) {
    const conv = r.status === 'SKIP' ? '—' : r.conversationValid ? 'ok' : 'fail';
    const msg = r.status === 'SKIP' ? '—' : r.messageValid ? 'ok' : 'fail';
    const convNum = r.status === 'SKIP' ? '—' : r.conversationNodes.toString();
    const msgNum = r.status === 'SKIP' ? '—' : r.messageNodes.toString();
    const kind = r.messageKind === 'empty' ? '—' : r.messageKind;
    const line =
      r.host.padEnd(24) +
      r.status.padEnd(12) +
      conv.padEnd(6) +
      convNum.padEnd(6) +
      msg.padEnd(6) +
      msgNum.padEnd(6) +
      kind.padEnd(8);
    console.log(line);
    if (r.error) {
      console.log('  Error: ' + r.error);
    }
  }

  const failed = results.filter((r) => r.status === 'FAIL');
  const skip = results.filter((r) => r.status === 'SKIP');
  const loginWall = results.filter((r) => r.status === 'LOGIN_WALL');
  const cloudflare = results.filter((r) => r.status === 'CLOUDFLARE');
  const ok = results.filter((r) => r.status === 'OK');

  console.log('\nSummary:');
  console.log(`  OK (selectors match content): ${ok.length}`);
  console.log(`  LOGIN_WALL (valid, 0 nodes):   ${loginWall.length}`);
  console.log(`  CLOUDFLARE (challenge page): ${cloudflare.length}`);
  console.log(`  SKIP (no message selector):  ${skip.length}`);
  console.log(`  FAIL (invalid or error):      ${failed.length}`);
}

function writeMarkdownReport(results: ValidationResult[]): void {
  const lines: string[] = [
    '# Extractor selectors validation report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '| Host | Status | Conversation | Conv# | Message | Msg# | Kind |',
    '|------|--------|--------------|-------|---------|------|------|',
  ];

  for (const r of results) {
    const conv = r.status === 'SKIP' ? '—' : r.conversationValid ? 'ok' : 'fail';
    const msg = r.status === 'SKIP' ? '—' : r.messageValid ? 'ok' : 'fail';
    const convNum = r.status === 'SKIP' ? '—' : r.conversationNodes.toString();
    const msgNum = r.status === 'SKIP' ? '—' : r.messageNodes.toString();
    const kind = r.messageKind === 'empty' ? '—' : r.messageKind;
    lines.push(
      `| ${r.host} | ${r.status} | ${conv} | ${convNum} | ${msg} | ${msgNum} | ${kind} |`
    );
    if (r.error) {
      lines.push(`| | _${r.error}_ | | | | | |`);
    }
  }

  const failed = results.filter((r) => r.status === 'FAIL');
  const skip = results.filter((r) => r.status === 'SKIP');
  const loginWall = results.filter((r) => r.status === 'LOGIN_WALL');
  const cloudflare = results.filter((r) => r.status === 'CLOUDFLARE');
  const ok = results.filter((r) => r.status === 'OK');

  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **OK** (selectors match content): ${ok.length}`);
  lines.push(`- **LOGIN_WALL** (valid, 0 nodes; possible login required): ${loginWall.length}`);
  lines.push(`- **CLOUDFLARE** (challenge/access-protection page; try HEADED=1 or real Chrome): ${cloudflare.length}`);
  lines.push(`- **SKIP** (no message selector): ${skip.length}`);
  lines.push(`- **FAIL** (invalid or error): ${failed.length}`);

  const dir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log('\nReport written to:', REPORT_PATH);
}

async function main(): Promise<void> {
  const hosts = loadConfig();
  const hostEntries = Object.entries(hosts);
  console.log(`Loaded ${hostEntries.length} hosts from ${CONFIG_PATH}`);
  console.log('Launching browser (headless by default; set HEADED=1 for headed mode)...\n');

  const browser = await chromium.launch({
    headless: !process.env.HEADED,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-zygote',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
    javaScriptEnabled: true,
  });

  const results: ValidationResult[] = [];
  const page = await context.newPage();

  for (const [host, cfg] of hostEntries) {
    if (!cfg) continue;
    process.stdout.write(`Checking ${host}... `);
    const result = await validateHost(page, host, cfg);
    results.push(result);
    console.log(result.status);
  }

  await context.close();
  await browser.close();

  printReport(results);
  writeMarkdownReport(results);

  const hasFail = results.some((r) => r.status === 'FAIL');
  process.exit(hasFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
