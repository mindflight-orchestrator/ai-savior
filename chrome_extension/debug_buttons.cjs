// Debug copy buttons in Perplexity template
const fs = require('fs');
const path = require('path');

// Read the template file
const templatePath = path.join(__dirname, 'doc/templates/perplexity.html');
const html = fs.readFileSync(templatePath, 'utf8');

console.log('Debugging copy buttons...\n');

// Look for any button tags
const allButtons = html.match(/<button[^>]*>[\s\S]*?<\/button>/gi);
console.log('Total buttons found:', allButtons ? allButtons.length : 0);

// Look for buttons containing "Copier" or "Copy"
const copyButtons = allButtons ? allButtons.filter(btn => /Copier|Copy/i.test(btn)) : [];
console.log('Copy buttons found:', copyButtons.length);

copyButtons.forEach((btn, index) => {
  console.log(`\nCopy Button ${index + 1}:`);
  console.log(btn.substring(0, 200) + (btn.length > 200 ? '...' : ''));

  // Extract button text
  const textMatch = btn.match(/>([^<]*Copier[^<]*)</i);
  if (textMatch) {
    console.log('Button text:', textMatch[1].trim());
  }
});

// Look for the specific XPath structure from the user
console.log('\n=== Looking for specific XPath structures ===');

// The user provided: //*[@id="radix-:ree:-content-thread"]/div/div/div[3]/div[1]/button[3]
const specificPattern1 = /id="radix-:ree:-content-thread"[\s\S]*?<\/div>/g;
const specificMatch1 = html.match(specificPattern1);
if (specificMatch1) {
  console.log('Found radix-:ree:-content-thread structure');
  console.log('Length:', specificMatch1[0].length);

  // Look for button[3] in this structure
  const button3Pattern = /<button[^>]*>[\s\S]*?<\/button>/gi;
  const buttonsInThread = specificMatch1[0].match(button3Pattern);
  console.log('Buttons in radix-:ree:-content-thread:', buttonsInThread ? buttonsInThread.length : 0);
}

const specificPattern2 = /id="radix-:re0:-content-thread"[\s\S]*?<\/div>/g;
const specificMatch2 = html.match(specificPattern2);
if (specificMatch2) {
  console.log('Found radix-:re0:-content-thread structure');
  console.log('Length:', specificMatch2[0].length);

  // Look for button[3] in this structure
  const button3Pattern = /<button[^>]*>[\s\S]*?<\/button>/gi;
  const buttonsInThread = specificMatch2[0].match(button3Pattern);
  console.log('Buttons in radix-:re0:-content-thread:', buttonsInThread ? buttonsInThread.length : 0);
}