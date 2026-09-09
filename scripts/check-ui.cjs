const fs = require('fs');
const path = require('path');

const ROOT_SRC = path.resolve(__dirname, '../src');
const BANNED_PATTERNS = [
  'bg-gradient-to-',
  'glow-accent',
  'glow-sparkle',
  'glow-cyan',
  'backdrop-blur-',
  'rounded-2xl',
  'rounded-xl'
];

const EXTENSIONS = new Set(['.tsx', '.css']);
let violations = 0;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    for (const pattern of BANNED_PATTERNS) {
      if (line.includes(pattern)) {
        console.error(`UI GUARDRAIL FAIL: Found "${pattern}" in ${path.relative(process.cwd(), filePath)}:${index + 1}`);
        console.error(`  ${line.trim()}`);
        violations++;
      }
    }
  });
}

scanDir(ROOT_SRC);

if (violations > 0) {
  console.error(`\nFound ${violations} UI guardrail violation(s). Build aborted.`);
  process.exit(1);
} else {
  console.log('UI guardrails clean');
  process.exit(0);
}
