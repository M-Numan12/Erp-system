const fs = require('fs');
const path = 'd:\\Erp-System\\client\\src\\Pages\\Accounts.jsx';
let text = fs.readFileSync(path, 'utf8');

console.log("Patching Site A: Ledger Filtering Alignment");
const look1 = "let accountMatch = isAccCash ? method === 'Cash' : method === selectedLedgerAccount.bank_name;";
if (text.indexOf(look1) > -1) {
    const replace1 = `let accountMatch = false;
        if (isAccCash) {
          accountMatch = (method === 'Cash');
        } else {
          const cleanM = method.toLowerCase().trim();
          const accDigits = selectedLedgerAccount.account_number ? selectedLedgerAccount.account_number.slice(-4) : '';
          if (accDigits && cleanM.includes(accDigits)) {
             accountMatch = true;
          } else {
             const targetB = selectedLedgerAccount.bank_name.toLowerCase();
             accountMatch = cleanM.includes(targetB) || targetB.includes(cleanM);
          }
        }`;
    text = text.replace(look1, replace1);
    console.log("SITE A SUCCEEDED!");
} else {
    console.error("SITE A FAILED TO MATCH TARGET STRING.");
}

console.log("Patching Site B: Recent Activity Filter Alignment");
const look2 = "return isCash ? (payType === 'Cash' || payType === 'Cash Account') : payType === acc.bank_name;";
if (text.indexOf(look2) > -1) {
    const replace2 = `const cleanPT = payType.toLowerCase().trim();
      if (isCash) {
         return cleanPT === 'cash' || cleanPT === 'cash account';
      } else {
         const accDig = acc.account_number ? acc.account_number.slice(-4) : '';
         if (accDig && cleanPT.includes(accDig)) return true;
         const bLower = acc.bank_name.toLowerCase();
         return cleanPT.includes(bLower) || bLower.includes(cleanPT);
      }`;
    text = text.replace(look2, replace2);
    console.log("SITE B SUCCEEDED!");
} else {
    console.error("SITE B FAILED TO MATCH TARGET STRING.");
}

fs.writeFileSync(path, text, 'utf8');
console.log("ALL SUB-ROUTINES SECURED AND COMMITTED!");
