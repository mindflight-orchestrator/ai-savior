/**
 * Script to download favicons from remote URLs and save them locally
 * Run with: node scripts/download-favicons.js
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const favicons = [
  { name: 'chatgpt', urls: ['https://chat.openai.com/favicon.ico', 'https://www.chatgpt.com/favicon.ico'] },
  { name: 'claude', urls: ['https://claude.ai/favicon.ico'] },
  { name: 'perplexity', urls: ['https://www.perplexity.ai/favicon.ico'] },
  { name: 'kimi', urls: ['https://www.kimi.com/favicon.ico'] },
  { name: 'mistral', urls: ['https://chat.mistral.ai/favicon.ico', 'https://mistral.ai/favicon.ico'] },
  { name: 'deepseek', urls: ['https://chat.deepseek.com/favicon.ico'] },
  { name: 'qwen', urls: ['https://chat.qwen.ai/favicon.ico'] },
  { name: 'manus', urls: ['https://manus.im/favicon.ico'] },
  { name: 'grok', urls: ['https://grok.com/favicon.ico'] },
];

const faviconsDir = path.join(__dirname, '..', 'icons', 'favicons');

// Create directory if it doesn't exist
if (!fs.existsSync(faviconsDir)) {
  fs.mkdirSync(faviconsDir, { recursive: true });
}

function downloadFavicon(name, url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error(`Too many redirects for ${name}`));
      return;
    }
    
    const protocol = url.startsWith('https') ? https : http;
    const filePath = path.join(faviconsDir, `${name}.ico`);
    
    const file = fs.createWriteStream(filePath);
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    protocol.get(url, options, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ Downloaded ${name}.ico`);
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        // Handle redirects
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        const redirectUrl = response.headers.location;
        const absoluteUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).href;
        downloadFavicon(name, absoluteUrl, maxRedirects - 1).then(resolve).catch(reject);
      } else {
        file.close();
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        reject(new Error(`Failed to download ${name}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(err);
    });
  });
}

async function downloadFaviconWithFallback(name, urls) {
  for (const url of urls) {
    try {
      await downloadFavicon(name, url);
      return; // Success, exit
    } catch (error) {
      // Try next URL
      continue;
    }
  }
  // All URLs failed
  throw new Error(`All URLs failed for ${name}`);
}

async function downloadAll() {
  console.log('Downloading favicons...\n');
  
  for (const favicon of favicons) {
    try {
      await downloadFaviconWithFallback(favicon.name, favicon.urls);
    } catch (error) {
      console.error(`✗ Failed to download ${favicon.name}: ${error.message}`);
    }
  }
  
  console.log('\nDone!');
}

downloadAll();
