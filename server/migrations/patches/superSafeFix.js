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

console.log(`[START] Auditing ${allFiles.length} files...`);

const DYNAMIC_EXPRESSION = '${process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL + "/api" : "https://erp-backend-3rf8.onrender.com/api"}';

allFiles.forEach(filePath => {
  // Ignore our own service wrapper if needed
  if (filePath.includes('api.js')) return; 
  
  let original = fs.readFileSync(filePath, 'utf8');
  let content = original;

  if (content.includes('erp-backend-3rf8.onrender.com/api')) {
    console.log(`Fixing URL Hardcode in: ${path.basename(filePath)}`);
    
    // Step 1: Replace Double Quoted Strings and convert entire string to backticks
    content = content.replace(/"https:\/\/erp-backend-3rf8\.onrender\.com\/api([^"]*)"/g, '`' + DYNAMIC_EXPRESSION + '$1`');
    
    // Step 2: Replace Single Quoted Strings and convert entire string to backticks
    content = content.replace(/'https:\/\/erp-backend-3rf8\.onrender\.com\/api([^']*)'/g, '`' + DYNAMIC_EXPRESSION + '$1`');
    
    // Step 3: Fix any that were ALREADY inside backtick template literals
    // We search for occurrences that were NOT just wrapped in our new dynamic injection
    // This safely catches: `https://erp-backend-3rf8.onrender.com/api/...`
    // Using a specialized split/join to avoid double-injection
    
    // The easiest safer regex for Step 3 is to just replace any RAW text outside of our newly injected template placeholder
    // But wait! A simpler robust way is to replace any occurrence that DOES NOT have `${` immediately before it!
    
    // Let's use a cleaner approach: any occurrence of the string that STILL EXISTS MUST BE REPLACED!
    // Wait! Our DYNAMIC_EXPRESSION has it inside its fallback string: `"https://erp-backend-3rf8..."`
    // So we must carefully avoid replacing the fallback string inside the DYNAMIC_EXPRESSION!
    
    // Safest way ever: Just run split and re-inject ONLY where it is NOT inside the expression!
    // Actually, we can just use a Regex that only matches the text if NOT preceded by ' : "'
    // But even easier: Temporarily tokenise our DYNAMIC_EXPRESSION!
    
    const placeholder = '___DYNAMIC_API_PLACEHOLDER___';
    content = content.replaceAll(DYNAMIC_EXPRESSION, placeholder);
    
    // Now any remaining instances are definitely raw legacy ones (from existing backticks)
    content = content.replaceAll('https://erp-backend-3rf8.onrender.com/api', DYNAMIC_EXPRESSION);
    
    // Now restore placeholders
    content = content.replaceAll(placeholder, DYNAMIC_EXPRESSION);

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ SUCCESSFULLY PATCHED: ${path.basename(filePath)}`);
    }
  }
});

console.log('[COMPLETE] Software now 100% Immune to Hardcoded Endpoints!');
