// Analyze Perplexity structure around copy buttons
const fs = require('fs');
const path = require('path');

// Read the template file
const templatePath = path.join(__dirname, 'doc/templates/perplexity.html');
const html = fs.readFileSync(templatePath, 'utf8');

console.log('Analyzing structure around copy buttons...\n');

// Find all copy button contexts with more surrounding content
const copyButtonPattern = /([\s\S]{0,1000})<button[^>]*>[^<]*(?:Copier|Copy)[^<]*<\/button>([\s\S]{0,1000})/gi;
const matches = html.matchAll(copyButtonPattern);

let matchCount = 0;
for (const match of matches) {
  matchCount++;
  const before = match[1];
  const after = match[2];

  console.log(`\n=== Copy Button ${matchCount} ===`);
  console.log('Content before button (last 300 chars):', before.slice(-300));
  console.log('Content after button (first 300 chars):', after.slice(0, 300));

  // Look for message content patterns before the button
  const messagePattern = /<div[^>]*>([^<]{50,})<\/div>/g;
  const messageMatches = before.match(messagePattern);
  if (messageMatches) {
    console.log('Potential message content found:', messageMatches.length);
    messageMatches.slice(-3).forEach((msg, i) => {
      console.log(`  Message ${i + 1}: ${msg.substring(0, 150)}...`);
    });
  }
}

console.log(`\nTotal copy buttons analyzed: ${matchCount}`);

// Look for the specific XPath structure mentioned by user
console.log('\n=== Testing user-provided XPath patterns ===');

const userXpath1 = 'radix-:ree:-content-thread';
const userXpath2 = 'radix-:re0:-content-thread';

console.log('Looking for:', userXpath1);
const xpath1Matches = html.match(new RegExp(userXpath1.replace(/[:\-]/g, '[\\:\\-]'), 'g'));
console.log('Found:', xpath1Matches ? xpath1Matches.length : 0);

console.log('Looking for:', userXpath2);
const xpath2Matches = html.match(new RegExp(userXpath2.replace(/[:\-]/g, '[\\:\\-]'), 'g'));
console.log('Found:', xpath2Matches ? xpath2Matches.length : 0);

// Extract content around these specific threads
const threadRegex = new RegExp(`([\\s\\S]{0,2000})id="radix-[^"]*-content-thread"([\\s\\S]{0,5000})<\/div>`, 'g');
const threadMatches = html.matchAll(threadRegex);

let threadMatchCount = 0;
for (const match of threadMatches) {
  threadMatchCount++;
  const content = match[2];
  console.log(`\n=== Thread ${threadMatchCount} Content Analysis ===`);
  console.log('Thread content length:', content.length);

  // Look for div structures within the thread
  const divStructure = content.match(/<div[^>]*>[\s\S]*?<\/div>/g);
  console.log('Div elements in thread:', divStructure ? divStructure.length : 0);

  // Look for the specific path: div[3]/div[1]
  const div3Pattern = /<div[^>]*>[\s\S]*?<div[^>]*>[\s\S]*?<div[^>]*>/g;
  const div3Matches = content.match(div3Pattern);
  if (div3Matches) {
    console.log('Found div[3] structures:', div3Matches.length);
  }
}