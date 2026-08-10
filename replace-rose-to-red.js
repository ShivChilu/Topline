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
  // 1. replace rose HEX codes inside globals.css
  content = content.replace(/#e11d48/g, '#dc2626'); // Red 600
  content = content.replace(/#be123c/g, '#b91c1c'); // Red 700

  // 2. replace Tailwind utility classes
  content = content.replace(/\brose-600\b/g, 'red-600');
  content = content.replace(/\brose-700\b/g, 'red-700');
  content = content.replace(/\brose-800\b/g, 'red-800');
  content = content.replace(/\brose-200\b/g, 'red-200');
  content = content.replace(/\brose-600\/10\b/g, 'red-600/10');
  content = content.replace(/\brose-600\/20\b/g, 'red-600/20');
  content = content.replace(/\bshadow-rose-600\b/g, 'shadow-red-600');

  // Prefix based replacements
  content = content.replace(/\btext-rose-/g, 'text-red-');
  content = content.replace(/\bbg-rose-/g, 'bg-red-');
  content = content.replace(/\bborder-rose-/g, 'border-red-');
  content = content.replace(/\bhover:text-rose-/g, 'hover:text-red-');
  content = content.replace(/\bhover:bg-rose-/g, 'hover:bg-red-');

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

console.log("Replacing Rose/Pink theme with deep Red theme...");

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
console.log("SUCCESS: Changed theme from Rose to Red!");
console.log("================================================");
