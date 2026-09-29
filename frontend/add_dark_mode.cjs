const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const classMap = {
  // Backgrounds
  'bg-[#0f172a]': 'bg-slate-50 dark:bg-[#0f172a]',
  'bg-[#1e293b]': 'bg-white dark:bg-[#1e293b]',
  'bg-slate-950': 'bg-white dark:bg-slate-950',
  'bg-slate-900': 'bg-white dark:bg-slate-900',
  'bg-slate-800': 'bg-slate-50 dark:bg-slate-800',
  'bg-slate-700': 'bg-slate-100 dark:bg-slate-700',
  'bg-slate-800/40': 'bg-slate-50/40 dark:bg-slate-800/40',
  'bg-slate-800/50': 'bg-slate-50/50 dark:bg-slate-800/50',
  'bg-slate-800/60': 'bg-slate-100/60 dark:bg-slate-800/60',
  'bg-slate-800/80': 'bg-slate-100/80 dark:bg-slate-800/80',
  'bg-slate-900/40': 'bg-white/40 dark:bg-slate-900/40',
  'bg-slate-900/50': 'bg-white/50 dark:bg-slate-900/50',
  'hover:bg-slate-800': 'hover:bg-slate-100 dark:hover:bg-slate-800',
  'hover:bg-[#1e293b]': 'hover:bg-slate-100 dark:hover:bg-[#1e293b]',
  
  // Borders
  'border-slate-800': 'border-slate-200 dark:border-slate-800',
  'border-slate-700': 'border-slate-200 dark:border-slate-700',
  'border-slate-600': 'border-slate-300 dark:border-slate-600',
  'border-slate-700/50': 'border-slate-200/50 dark:border-slate-700/50',
  'border-slate-700/30': 'border-slate-200/50 dark:border-slate-700/30',
  'border-slate-700/80': 'border-slate-200/80 dark:border-slate-700/80',
  
  // Text Colors
  'text-white': 'text-slate-900 dark:text-white',
  'text-slate-50': 'text-slate-900 dark:text-slate-50',
  'text-slate-100': 'text-slate-900 dark:text-slate-100',
  'text-slate-200': 'text-slate-800 dark:text-slate-200',
  'text-slate-300': 'text-slate-700 dark:text-slate-300',
  'text-slate-400': 'text-slate-600 dark:text-slate-400',
  'hover:text-slate-200': 'hover:text-slate-800 dark:hover:text-slate-200',
  'hover:text-slate-300': 'hover:text-slate-700 dark:hover:text-slate-300',
  
  // Divide
  'divide-slate-800': 'divide-slate-200 dark:divide-slate-800',
  'divide-slate-700': 'divide-slate-200 dark:divide-slate-700',
  'divide-slate-700/50': 'divide-slate-200/50 dark:divide-slate-700/50',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // For each mapping, only replace if not already part of a dark: modifier or followed by something that implies it shouldn't be mapped.
  Object.keys(classMap).forEach(cls => {
    // Escape string for regex
    const escapedCls = cls.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Regex matches the class if it is NOT preceded by "dark:"
    // and is surrounded by space, quote, or backtick.
    const regex = new RegExp(`(?<!dark:)(?<=['"\\s\`])${escapedCls}(?=['"\\s\`])`, 'g');
    content = content.replace(regex, classMap[cls]);
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

processDirectory(srcDir);
console.log('Done processing JSX files.');
