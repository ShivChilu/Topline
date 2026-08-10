const fs = require('fs');
const path = require('path');

const publicPages = [
  path.join(__dirname, 'src', 'app', 'about', 'page.tsx'),
  path.join(__dirname, 'src', 'app', 'contact', 'page.tsx'),
  path.join(__dirname, 'src', 'app', 'gallery', 'page.tsx'),
  path.join(__dirname, 'src', 'app', 'how-it-works', 'page.tsx'),
  path.join(__dirname, 'src', 'app', 'dos-donts', 'page.tsx'),
  path.join(__dirname, 'src', 'app', 'privacy', 'page.tsx'),
  path.join(__dirname, 'src', 'app', 'terms', 'page.tsx'),
];

const blobsHtml = `
      {/* Decorative Blur Blobs */}
      <div className="absolute top-[10%] left-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
      <div className="absolute top-[50%] right-[-10%] w-[35vw] h-[35vw] bg-red-600/5 rounded-full floating-blob -z-10 pointer-events-none"></div>
`;

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Swap main background container to have relative grid-bg overflow-hidden
  content = content.replace(/className="flex flex-col min-h-screen bg-\[#07080b\] text-white"/g, 'className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden"');
  content = content.replace(/className="flex flex-col min-h-screen bg-\[#06070a\] text-white"/g, 'className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden"');
  content = content.replace(/className="flex flex-col min-h-screen bg-slate-50 text-slate-800"/g, 'className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-700 relative grid-bg overflow-hidden"');

  // 2. Add floating blobs right after <Navbar />
  if (content.includes('<Navbar />') && !content.includes('floating-blob')) {
    content = content.replace('<Navbar />', `<Navbar />\n${blobsHtml}`);
  }

  // 3. Swap standard heading to gradient-text headings
  content = content.replace(/text-4xl font-extrabold text-red-600 uppercase/g, 'text-4xl font-extrabold uppercase text-slate-900');
  content = content.replace(/text-3xl font-bold text-red-600 uppercase/g, 'text-3xl font-bold uppercase text-slate-900');
  
  // Wrap headers in gradient-text spans
  content = content.replace(/<h1 className="text-4xl font-extrabold text-slate-900 uppercase tracking-wider">\s*(.*?)\s*<\/h1>/g, 
    '<h1 className="text-4xl font-extrabold uppercase tracking-wider"><span className="gradient-text">$1</span></h1>');
  content = content.replace(/<h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-wider">\s*(.*?)\s*<\/h1>/g, 
    '<h1 className="text-3xl font-extrabold uppercase tracking-wider"><span className="gradient-text">$1</span></h1>');

  // 4. Change cards inside layouts to light panels
  content = content.replace(/bg-\[\#0c0d12\] p-6 rounded-xl border border-gray-800/gi, 'light-panel p-6 rounded-2xl relative overflow-hidden group');
  content = content.replace(/bg-\[\#0c0d12\]/gi, 'light-panel rounded-2xl');
  content = content.replace(/border-gray-800/gi, 'border-slate-200');
  content = content.replace(/text-gray-400/gi, 'text-slate-500');
  content = content.replace(/text-gray-300/gi, 'text-slate-600');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Unified Theme: ${filePath}`);
  }
}

console.log("Applying unified theme to public pages...");
for (const file of publicPages) {
  processFile(file);
}

console.log("\n================================================");
console.log("SUCCESS: Unified theme applied across all pages!");
console.log("================================================");
