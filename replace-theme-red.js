const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'src'),
];

const targetFiles = [
  path.join(__dirname, 'update-guidelines.js'),
];

// Perform replacements
function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replacement patterns
  // 1. replace amber CSS variables inside globals.css
  content = content.replace(/#d97706/g, '#e11d48'); // Rose 600
  content = content.replace(/#b45309/g, '#be123c'); // Rose 700

  // 2. replace Tailwind utility classes
  content = content.replace(/\bamber-500\b/g, 'rose-600');
  content = content.replace(/\bamber-600\b/g, 'rose-700');
  content = content.replace(/\bamber-700\b/g, 'rose-800');
  content = content.replace(/\bamber-250\b/g, 'rose-200');
  content = content.replace(/\bamber-500\/10\b/g, 'rose-600/10');
  content = content.replace(/\bamber-500\/20\b/g, 'rose-600/20');
  content = content.replace(/\bshadow-amber-500\b/g, 'shadow-rose-600');

  // Prefix based replacements
  content = content.replace(/\btext-amber-/g, 'text-rose-');
  content = content.replace(/\bbg-amber-/g, 'bg-rose-');
  content = content.replace(/\bborder-amber-/g, 'border-rose-');
  content = content.replace(/\bhover:text-amber-/g, 'hover:text-rose-');
  content = content.replace(/\bhover:bg-amber-/g, 'hover:bg-rose-');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walkDir(fullPath);
      }
    } else {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md', '.html'].includes(ext)) {
        replaceInFile(fullPath);
      }
    }
  }
}

console.log("Replacing Orange/Amber theme with Red/Rose theme...");

// Process directories
for (const dir of targetDirs) {
  if (fs.existsSync(dir)) {
    walkDir(dir);
  }
}

// Process separate files
for (const file of targetFiles) {
  if (fs.existsSync(file)) {
    replaceInFile(file);
  }
}

console.log("\n================================================");
console.log("SUCCESS: Changed theme to Red across entire app!");
console.log("================================================");
