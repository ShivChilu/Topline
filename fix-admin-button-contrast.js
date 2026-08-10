const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'app', 'admin');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Swapping background buttons in light theme
  content = content.replace(/bg-gray-800\/60/g, 'bg-slate-100');
  content = content.replace(/bg-gray-850\/60/g, 'bg-slate-100');
  content = content.replace(/bg-gray-800/g, 'bg-slate-100');
  content = content.replace(/hover:bg-gray-700/g, 'hover:bg-slate-200');

  // Text contrast on primary color button backgrounds
  content = content.replace(/bg-red-600(.*?)text-black/g, 'bg-red-600$1text-white');
  content = content.replace(/bg-red-700(.*?)text-black/g, 'bg-red-700$1text-white');
  content = content.replace(/bg-emerald-500(.*?)text-black/g, 'bg-emerald-600$1text-white');
  content = content.replace(/bg-amber-500(.*?)text-black/g, 'bg-amber-500$1text-white');
  content = content.replace(/bg-purple-600(.*?)text-black/g, 'bg-purple-600$1text-white');

  // Hover states contrast
  content = content.replace(/hover:bg-red-600 hover:text-black/g, 'hover:bg-red-700 hover:text-white');
  content = content.replace(/hover:bg-emerald-500 hover:text-black/g, 'hover:bg-emerald-600 hover:text-white');
  content = content.replace(/hover:bg-red-500 hover:text-black/g, 'hover:bg-red-650 hover:text-white');
  content = content.replace(/hover:text-black/g, 'hover:text-white');

  // Hover background updates on text
  content = content.replace(/hover:text-slate-900/g, 'hover:text-slate-800');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Contrast Fixed: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx', '.css'].includes(ext)) {
        replaceInFile(fullPath);
      }
    }
  }
}

console.log("Fixing admin panel button contrast configurations...");
if (fs.existsSync(targetDir)) {
  walkDir(targetDir);
}

console.log("\n================================================");
console.log("SUCCESS: Button contrast fixed successfully!");
console.log("================================================");
