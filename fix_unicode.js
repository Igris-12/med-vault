const fs = require('fs');
let src = fs.readFileSync('client/src/pages/Locator.tsx', 'utf8');

// Replace ALL non-ASCII chars below emoji range (0x1F000) that confuse rolldown
// These appear in JSX text and JS string literals
const map = [
  ['\u2764', '&hearts;'],  // ❤ heart
  ['\u2695', '+'],          // ⚕ medical symbol
  ['\u2605', '*'],          // ★ star
  ['\u2B50', '*'],          // ⭐ star
  ['\u2715', 'x'],          // ✕ cross
  ['\u26A0', '!'],          // ⚠ warning
];

for (const [ch, rep] of map) {
  // In JSX text nodes, replace with HTML entity; in JS strings use ASCII
  src = src.split(ch).join(rep);
}

fs.writeFileSync('client/src/pages/Locator.tsx', src, { encoding: 'utf8' });
console.log('Done. Remaining non-ASCII (>127, <0x1F000):');
let count = 0;
for (const ch of [...src]) {
  const cp = ch.codePointAt(0);
  if (cp > 127 && cp < 0x1F000) count++;
}
console.log(count, 'chars remaining');
