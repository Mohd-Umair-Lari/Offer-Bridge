const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', '.migration-backup', 'public');
const destDir = path.join(__dirname, '..', 'public');

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    console.log(`Copied ${file} to public/`);
  }
}
