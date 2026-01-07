// Test XPath extraction for Perplexity
const fs = require('fs');
const path = require('path');

// Read the template file
const templatePath = path.join(__dirname, 'doc/templates/perplexity.html');
const html = fs.readFileSync(templatePath, 'utf8');

console.log('Template file loaded, length:', html.length);

// Simple XPath-like selector test (since we can't use full XPath in Node.js without DOM)
const xpath = '//div[contains(@id, "radix-") and contains(@id, "-content-thread")]/div/div/div[3]/div[1]/following-sibling::div';

// Test with regex pattern matching
const radixThreadPattern = /id="radix-[^"]*-content-thread"/g;
const matches = html.match(radixThreadPattern);

console.log('Found radix content-thread IDs:', matches ? matches.length : 0);

if (matches) {
  matches.forEach((match, index) => {
    console.log(`Match ${index + 1}: ${match}`);
  });
}

// Look for button patterns
const buttonPattern = /button[^>]*>.*copy|copier.*<\/button>/gi;
const buttonMatches = html.match(buttonPattern);
console.log('Found copy buttons:', buttonMatches ? buttonMatches.length : 0);

// Look for message-like content
const messagePattern = /div[^>]*class="[^"]*message[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
const messageMatches = html.match(messagePattern);
console.log('Found message divs:', messageMatches ? messageMatches.length : 0);