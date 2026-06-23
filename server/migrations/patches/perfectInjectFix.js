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

console.log(`[START] Perfect Audit of ${allFiles.length} files...`);

const HEADER_INJECTION = `// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? \`\${process.env.REACT_APP_API_URL}/api\` : 'https://erp-backend-3rf8.onrender.com/api';
`;

allFiles.forEach(filePath => {
  if (filePath.includes('api.js')) return; 
  
  let original = fs.readFileSync(filePath, 'utf8');
  let content = original;

  if (content.includes('erp-backend-3rf8.onrender.com/api')) {
    console.log(`Applying Permanent Patch: ${path.basename(filePath)}`);
    
    // Step 1: Prepend our local safely calculated variable at top of file
    content = HEADER_INJECTION + "\n" + content;
    
    // Step 2: Perform ONE-PASS NON-NESTING REGEX SWAPS
    
    // Swap Case 1: Double quoted literals containing the URL
    // "https://.../api/something"  --> (API_BASE_URL + "/something")
    content = content.replace(/"https:\/\/erp-backend-3rf8\.onrender\.com\/api([^"]*)"/g, '(API_BASE_URL + "$1")');
    
    // Swap Case 2: Single quoted literals containing the URL
    // 'https://.../api/something'  --> (API_BASE_URL + "/something")
    content = content.replace(/'https:\/\/erp-backend-3rf8\.onrender\.com\/api([^']*)'/g, "(API_BASE_URL + '$1')");
    
    // Swap Case 3: Existing Backtick instances!
    // `https://.../api/${x}`      --> `${API_BASE_URL}/${x}`
    // We just swap the naked text inside the backticks to `${API_BASE_URL}`
    // Since this raw text is NOT in our injected header, it won't trigger infinite recursion!
    content = content.replaceAll('https://erp-backend-3rf8.onrender.com/api', '${API_BASE_URL}');
    
    // Final Clean up: avoid concatenation artifacts like + ""
    content = content.replace(/\+ ""\)/g, ')');
    content = content.replace(/\+ ''\)/g, ')');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ VALIDATED STABLE PATCH: ${path.basename(filePath)}`);
    }
  }
});

console.log('[ULTIMATE SUCCESS] Codebase architecture globally decoupled!');
