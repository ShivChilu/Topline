const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'app', 'admin');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Layout level background swaps
  content = content.replace(/bg-\[\#07080b\]/g, 'bg-[#f8fafc]');
  content = content.replace(/bg-\[\#0c0d12\]/g, 'bg-white');
  content = content.replace(/bg-\[\#12141f\]/g, 'bg-slate-50/50');
  content = content.replace(/bg-\[\#161822\]/g, 'bg-slate-50');
  content = content.replace(/bg-\[\#1a1c29\]/g, 'bg-slate-50');
  content = content.replace(/bg-\[\#161a2b\]/g, 'bg-slate-100');

  // Border adjustments
  content = content.replace(/border-gray-800/g, 'border-slate-200');
  content = content.replace(/border-gray-850/g, 'border-slate-200');
  content = content.replace(/border-gray-700/g, 'border-slate-200');

  // Text adjustments (ignoring specific button class formats)
  content = content.replace(/text-white\b(?!.*(?:px-|py-|bg-red-|bg-emerald-|bg-slate-900|bg-slate-800|rounded|font-bold|w-full))/g, 'text-slate-900');
  content = content.replace(/text-gray-400/g, 'text-slate-500');
  content = content.replace(/text-gray-300/g, 'text-slate-650');
  content = content.replace(/text-gray-500/g, 'text-slate-450');

  // Inputs
  content = content.replace(/placeholder-gray-600/g, 'placeholder-slate-400');
  content = content.replace(/text-white\b/g, 'text-slate-900'); // Clean up inputs that need slate text
  content = content.replace(/text-slate-900 px-5/g, 'text-white px-5'); // Keep buttons white text
  content = content.replace(/text-slate-900 px-4/g, 'text-white px-4'); // Keep buttons white text
  content = content.replace(/text-slate-900 px-3/g, 'text-white px-3'); // Keep buttons white text
  content = content.replace(/text-slate-900 block/g, 'text-white block'); // Keep block buttons white text
  content = content.replace(/text-slate-900 text-xs font-bold/g, 'text-white text-xs font-bold');

  // Specific header overrides
  content = content.replace(/text-white uppercase/g, 'text-slate-900 uppercase');
  content = content.replace(/text-white hover:text-red-700/g, 'text-slate-900 hover:text-red-700');
  content = content.replace(/text-white mt-4/g, 'text-slate-900 mt-4');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated Admin File: ${filePath}`);
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

console.log("Transforming Admin Panel directories to Light Theme...");
if (fs.existsSync(targetDir)) {
  walkDir(targetDir);
}

// Special update to layout.tsx menu active state
const layoutPath = path.join(__dirname, 'src', 'components', 'Navbar.tsx'); // Let's check admin layout
const adminLayoutPath = path.join(__dirname, 'src', 'app', 'admin', 'layout.tsx');
if (fs.existsSync(adminLayoutPath)) {
  let content = fs.readFileSync(adminLayoutPath, 'utf8');
  content = content.replace(/isActive\s*\?\s*["']bg-red-600 text-black["']\s*:\s*["']text-gray-400 hover:text-white hover:bg-gray-800\/40["']/g, 
    'isActive ? "bg-red-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"');
  content = content.replace(/text-red-400 hover:text-white hover:bg-red-950\/20/g, 'text-red-600 hover:bg-red-50');
  fs.writeFileSync(adminLayoutPath, content, 'utf8');
  console.log("Updated Admin Layout navigation styles.");
}

console.log("\n================================================");
console.log("SUCCESS: Changed Admin Panel to Light Theme!");
console.log("================================================");
