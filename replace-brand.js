const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'src'),
  path.join(__dirname, 'public'),
];

const targetFiles = [
  path.join(__dirname, 'update-guidelines.js'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '.env.example'),
];

// Perform replacements
function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replacement patterns
  content = content.replace(/Top\s+Line\s+Catering/gi, 'TOPLINE ODC');
  content = content.replace(/Topline\s+Catering/gi, 'TOPLINE ODC');
  content = content.replace(/TOP\s+LINE\s+CATERING/gi, 'TOPLINE ODC');
  content = content.replace(/topline\s+catering/gi, 'TOPLINE ODC');

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

console.log("Starting brand identity replacements to TOPLINE ODC...");

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
console.log("SUCCESS: Replaced all brand references with TOPLINE ODC!");
console.log("================================================");
