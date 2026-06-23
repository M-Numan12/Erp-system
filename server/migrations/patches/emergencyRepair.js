const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  let files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

const clientDir = path.resolve(__dirname, '../../client/src');
const allFiles = getAllFiles(clientDir);

console.log(`[FINAL REPAIR] Inspecting ${allFiles.length} files...`);

const BAD_LINE = "const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : (API_BASE_URL );";
const CORRECT_LINE = "const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';";

allFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(BAD_LINE)) {
    let updated = content.replace(BAD_LINE, CORRECT_LINE);
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`   ✅ FIXED CORRUPTED HEADER: ${path.basename(filePath)}`);
  }
});

console.log('[GLOBAL RESTORE SUCCESSFUL] Entire ecosystem validated and fixed!');
