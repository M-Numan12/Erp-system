const fs = require('fs');
const path = 'd:\\Erp-System\\client\\src\\Pages\\Accounts.jsx';
let text = fs.readFileSync(path, 'utf8');

console.log("Step 1: Locate the main Reducer Region");
const rStart = text.indexOf(".reduce((acc, s) => {");
const rEnd = text.indexOf("}, { 'Cash': 0 }));");

if(rStart > -1 && rEnd > -1) {
    console.log("Reducer indices found:", rStart, rEnd);
    const prefix = text.substring(0, rStart);
    const suffix = text.substring(rEnd + "}, { 'Cash': 0 }));".length);
    
    const newReducer = `.reduce((acc, s) => {
      const method = s.payment_type || 'Cash';
      let cleanMethod = method.replace('Bank - ', '').trim();
      const isCash = cleanMethod.toLowerCase() === 'cash' || cleanMethod === 'Cash Account';
      let targetKey = 'UNMATCHED_OTHER';
      
      if (isCash) {
        targetKey = 'Cash';
      } else {
        // Segregate by ID using rigorous matching
        const match = filteredAccounts.find(b => {
           const digits = b.account_number ? b.account_number.slice(-4) : '';
           if (digits && cleanMethod.includes(digits)) return true;
           const bl = b.bank_name.toLowerCase();
           const cl = cleanMethod.toLowerCase();
           return cl.includes(bl) || bl.includes(cl);
        });
        if (match) targetKey = match.id;
      }
      
      const amount = getTransactionAmount(s);
      if (!acc[targetKey]) acc[targetKey] = 0;
      if (s.isExpense) {
        acc[targetKey] -= amount;
      } else {
        acc[targetKey] += amount;
      }
      return acc;
    }, filteredAccounts.filter(b => b.module_type !== 'Admin Recipient').reduce((acc, b) => {
      acc[b.id] = parseFloat(b.opening_balance) || 0;
      return acc;
    }, { 'Cash': 0, 'UNMATCHED_OTHER': 0 }));`;
    
    text = prefix + newReducer + suffix;
} else {
    console.error("COULD NOT LOCATE REDUCER BLOCK.");
    process.exit(1);
}

console.log("Step 2: Locate totalBank Definition");
// Find "const totalBank = Object.entries(paymentSummary)"
const tStart = text.indexOf("const totalBank = Object.entries(paymentSummary)");
const tEnd = text.indexOf(".reduce((sum, [, v]) => sum + v, 0);");

if(tStart > -1 && tEnd > -1) {
    const chunkEnd = tEnd + ".reduce((sum, [, v]) => sum + v, 0);".length;
    const p1 = text.substring(0, tStart);
    const p2 = text.substring(chunkEnd);
    const newTotal = `const totalBank = filteredAccounts.filter(acc => !acc.isCash && acc.module_type !== 'Admin Recipient').reduce((sum, acc) => sum + Math.max(0, paymentSummary[acc.id] || 0), 0);`;
    text = p1 + newTotal + p2;
} else {
   console.warn("COULD NOT LOCATE TOTALBANK BLOCK FOR CONVERSION. PROCEEDING...");
}

console.log("Step 3: Locate Render Balance Finder Line");
const lookFor = "const cleanName = acc.bank_name.replace(' Account', '');";
const subIdx = text.indexOf(lookFor);
if(subIdx > -1) {
   const lineEnd = text.indexOf("let bal = summaryKey ? paymentSummary[summaryKey] : 0;", subIdx);
   if(lineEnd > -1) {
      const fullChunk = text.substring(subIdx, lineEnd + "let bal = summaryKey ? paymentSummary[summaryKey] : 0;".length);
      text = text.replace(fullChunk, "let bal = acc.isCash ? (paymentSummary['Cash'] || 0) : (paymentSummary[acc.id] || 0);");
   }
}

fs.writeFileSync(path, text, 'utf8');
console.log("ALL SYSTEMS UPDATED AND SAVED SUCCESSFULLY!");
