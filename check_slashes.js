const fs = require('fs');
const src = fs.readFileSync('client/src/pages/Locator.tsx', 'utf8');
const lines = src.split('\n');
lines.forEach((line, i) => {
  if (line.includes('/')) {
    let text = line.replace(/\/\/.*/, ''); 
    text = text.replace(/<\/[A-Za-z0-9_.-]+>/g, ''); 
    text = text.replace(/\/>/g, ''); 
    text = text.replace(/{\/\*.*?\*\/}/g, ''); 
    text = text.replace(/\/\*.*?\*\//g, ''); 
    text = text.replace(/https?:\/\/[^\s\"\'\`]+/g, ''); 
    if (text.includes('/')) {
      console.log('Line ' + (i+1) + ': ' + text.trim());
    }
  }
});
