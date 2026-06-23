const fs = require('fs');
const path = 'd:\\Erp-System\\client\\src\\Pages\\Accounts.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetText = `      const method = s.payment_type || 'Cash';
      let cleanMethod = method.replace('Bank - ', '');
      if (cleanMethod === 'Cash Account' || cleanMethod.toLowerCase() === 'cash') {
        cleanMethod = 'Cash';
      }
      
      const amount = getTransactionAmount(s);`;

const replaceText = `      const method = s.payment_type || 'Cash';
      let cleanMethod = method.replace('Bank - ', '').trim();
      if (cleanMethod === 'Cash Account' || cleanMethod.toLowerCase() === 'cash') {
        cleanMethod = 'Cash';
      }
      
      // FIX: Match dirty dynamic names back to visual bank cards
      if (cleanMethod !== 'Cash') {
        const cLower = cleanMethod.toLowerCase();
        const matchedBank = filteredAccounts.find(b => {
           const bLower = b.bank_name.toLowerCase();
           return cLower.includes(bLower) || bLower.includes(cLower);
        });
        if (matchedBank) {
          let fixN = matchedBank.bank_name.replace(' Account', '');
          if (fixN.toLowerCase() === 'cash') fixN = 'Cash';
          cleanMethod = fixN;
        }
      }
      
      const amount = getTransactionAmount(s);`;

// We will not rely on template literals which might have different line endings.
// Let's use a regex that handles the variation seamlessly!
const regex = /      const method = s\.payment_type \|\| 'Cash';\r?\n      let cleanMethod = method\.replace\('Bank - ', ''\);\r?\n      if \(cleanMethod === 'Cash Account' \|\| cleanMethod\.toLowerCase\(\) === 'cash'\) {\r?\n        cleanMethod = 'Cash';\r?\n      }\r?\n\s*\r?\n      const amount = getTransactionAmount\(s\);/;

if (regex.test(content)) {
    content = content.replace(regex, replaceText);
    fs.writeFileSync(path, content, 'utf8');
    console.log("SUCCESSFULLY PATCHED!");
} else {
    console.error("REGEX FAILED TO MATCH CONTENT!");
    // Fallback attempt to overwrite via line indexing
    const lines = content.split('\n');
    let found = false;
    for(let i=0; i<lines.length; i++) {
        if(lines[i].includes("let cleanMethod = method.replace('Bank - ', '')") && lines[i+5].includes("getTransactionAmount(s)")) {
            console.log("FOUND TARGET BY LINE INDEX AT ", i);
            lines.splice(i, 6, 
`      let cleanMethod = method.replace('Bank - ', '').trim();
      if (cleanMethod === 'Cash Account' || cleanMethod.toLowerCase() === 'cash') {
        cleanMethod = 'Cash';
      }
      if (cleanMethod !== 'Cash') {
        const cLower = cleanMethod.toLowerCase();
        const matchedBank = filteredAccounts.find(b => {
           const bLower = b.bank_name.toLowerCase();
           return cLower.includes(bLower) || bLower.includes(cLower);
        });
        if (matchedBank) {
          let fixN = matchedBank.bank_name.replace(' Account', '');
          if (fixN.toLowerCase() === 'cash') fixN = 'Cash';
          cleanMethod = fixN;
        }
      }
      const amount = getTransactionAmount(s);`);
            fs.writeFileSync(path, lines.join('\n'), 'utf8');
            console.log("SUCCESSFULLY PATCHED VIA LINE OVERLAY!");
            found = true;
            break;
        }
    }
    if(!found) {
        console.error("ALL PATCH ATTEMPTS FAILED.");
    }
}
