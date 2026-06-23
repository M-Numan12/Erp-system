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

const BAD_URL = 'https://erp-backend-3rf8.onrender.com/api';
const DYNAMIC_URL_REPLACEMENT = '` + (process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : "https://erp-backend-3rf8.onrender.com/api") + `';

// Better safer approach: Inject a global constant at the top and replace definitions
const clientDir = path.resolve(__dirname, '../../client/src');
const allFiles = getAllFiles(clientDir);

console.log(`Scanning ${allFiles.length} files for legacy URLs...`);

allFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('erp-backend-3rf8.onrender.com')) {
    console.log(`Found matches in ${path.basename(filePath)}. Applying patch...`);
    
    // 1. Check if there is a const API = "..." line and replace it intelligently
    // Use Regex to catch all variations of const API, const PRODUCTS_API, etc.
    content = content.replace(/const\s+(\w+_?API)\s*=\s*["']https:\/\/erp-backend-3rf8\.onrender\.com\/api\/([^"']*)["'];/g, 
      'const $1 = (process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : "https://erp-backend-3rf8.onrender.com/api") + "/$2";');
    
    // 2. Replace naked URLs in fetch template strings: `${API_URL}`
    content = content.replace(/`https:\/\/erp-backend-3rf8\.onrender\.com\/api\/([^`]+)`/g, 
      '((process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : "https://erp-backend-3rf8.onrender.com/api") + "/$1")');

    // 3. Replace naked URLs in quoted strings: 'https://...'
    content = content.replace(/['"]https:\/\/erp-backend-3rf8\.onrender\.com\/api\/([^"']*)['"]/g, 
      '((process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : "https://erp-backend-3rf8.onrender.com/api") + "/$1")');
      
    // 4. Cleanup redundant double concatenation that regex might introduce
    content = content.replace(/\+ ""/g, ''); 
    
    // 5. Double Check: Ensure anything leftover is universally migrated
    content = content.replace(/https:\/\/erp-backend-3rf8\.onrender\.com\/api/g, 
      '${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL + "/api" : "https://erp-backend-3rf8.onrender.com/api"}');

    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log('GLOBAL ECOSYSTEM UPGRADE COMPLETE!');
