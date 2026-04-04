import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const srcDir = 'src/app/components';
const destDir = 'components';

// Create destination directories
const dirs = ['ui', 'modals', 'figma'];
dirs.forEach(dir => {
  const path = join(destDir, dir);
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
});

// Copy and update UI components
const uiDir = join(srcDir, 'ui');
const files = readdirSync(uiDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(file => {
  const srcPath = join(uiDir, file);
  const destPath = join(destDir, 'ui', file);
  let content = readFileSync(srcPath, 'utf-8');
  
  // Update the utils import to use @/lib/utils
  content = content.replace(/from ["']\.\/utils["']/g, 'from "@/lib/utils"');
  
  writeFileSync(destPath, content);
  console.log(`Copied ${file}`);
});

// Copy modals
const modalsDir = join(srcDir, 'modals');
if (existsSync(modalsDir)) {
  const modalFiles = readdirSync(modalsDir).filter(f => f.endsWith('.tsx'));
  modalFiles.forEach(file => {
    const srcPath = join(modalsDir, file);
    const destPath = join(destDir, 'modals', file);
    let content = readFileSync(srcPath, 'utf-8');
    // Update relative imports
    content = content.replace(/from ["']\.\.\/ui\//g, 'from "@/components/ui/');
    content = content.replace(/from ["']\.\.\/\.\.\/context\//g, 'from "@/context/');
    writeFileSync(destPath, content);
    console.log(`Copied ${file}`);
  });
}

// Copy figma
const figmaDir = join(srcDir, 'figma');
if (existsSync(figmaDir)) {
  const figmaFiles = readdirSync(figmaDir).filter(f => f.endsWith('.tsx'));
  figmaFiles.forEach(file => {
    const srcPath = join(figmaDir, file);
    const destPath = join(destDir, 'figma', file);
    const content = readFileSync(srcPath, 'utf-8');
    writeFileSync(destPath, content);
    console.log(`Copied ${file}`);
  });
}

console.log('Done copying components!');
