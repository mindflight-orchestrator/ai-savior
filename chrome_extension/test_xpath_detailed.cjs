// Detailed XPath test for Perplexity
const fs = require('fs');
const path = require('path');

// Read the template file
const templatePath = path.join(__dirname, 'doc/templates/perplexity.html');
const html = fs.readFileSync(templatePath, 'utf8');

console.log('Testing XPath patterns for Perplexity extraction...\n');

// Test the current XPath pattern from extractor.ts
const currentXpath = '//div[contains(@id, "radix-") and contains(@id, "-content-thread")]/div/div/div[3]/div[1]/following-sibling::div';
console.log('Current XPath pattern:', currentXpath);

// Look for the structure around the content threads
const threadPattern = /radix-[^"]*-content-thread[^>]*>([\s\S]*?)<\/div>/g;
let match;
let threadCount = 0;

while ((match = threadPattern.exec(html)) !== null) {
  threadCount++;
  const threadContent = match[1];
  console.log(`\n=== Thread ${threadCount} ===`);
  console.log('Thread content length:', threadContent.length);

  // Look for div[3] structures
  const div3Pattern = /<div[^>]*>[\s\S]*?<div[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/g;
  const div3Matches = threadContent.match(div3Pattern);

  if (div3Matches) {
    console.log('Found div[3] structures:', div3Matches.length);
    div3Matches.forEach((div3Match, index) => {
      console.log(`div[3] ${index + 1} content preview:`, div3Match.substring(0, 200) + '...');
    });
  }

  // Look for button structures
  const buttonPattern = /<button[^>]*>([\s\S]*?)<\/button>/g;
  const buttonMatches = threadContent.match(buttonPattern);
  console.log('Buttons in thread:', buttonMatches ? buttonMatches.length : 0);

  if (buttonMatches) {
    buttonMatches.forEach((button, index) => {
      console.log(`Button ${index + 1}:`, button.substring(0, 100) + '...');
    });
  }
}

console.log(`\nTotal threads found: ${threadCount}`);

// Test alternative XPath patterns
console.log('\n=== Testing alternative patterns ===');

// Look for all divs that might contain messages
const messageDivs = html.match(/<div[^>]*(?:class|id)="[^"]*(?:message|content|response|answer)[^"]*"[^>]*>[\s\S]*?<\/div>/gi);
console.log('Message-like divs found:', messageDivs ? messageDivs.length : 0);

// Look for specific patterns around copy buttons
const copyButtonContext = html.match(/[\s\S]{0,500}button[^>]*copy|copier[\s\S]{0,500}/gi);
if (copyButtonContext) {
  console.log('Copy button contexts found:', copyButtonContext.length);
  copyButtonContext.forEach((context, index) => {
    console.log(`Context ${index + 1}:`, context.replace(/\s+/g, ' ').substring(0, 150) + '...');
  });
}