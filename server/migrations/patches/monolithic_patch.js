const fs = require('fs');
const path = 'd:\\Erp-System\\client\\src\\Pages\\Accounts.jsx';
let text = fs.readFileSync(path, 'utf8');

console.log("Step 1: Reducer Rewrite via Whole useMemo hook targeting");
const mStart = text.indexOf("const paymentSummary = useMemo(() => {");
const mEndKey = "}, [filteredSales, filteredInvestments, filteredCloseouts, filteredSupplierPayments, filteredGeneralExpenses, filteredSalaries, filteredRents, filteredOtherExpenses, filteredAccounts]);";
const mEnd = text.indexOf(mEndKey);

if (mStart > -1 && mEnd > -1) {
    const fullEnd = mEnd + mEndKey.length;
    const pre = text.substring(0, mStart);
    const post = text.substring(fullEnd);
    
    const newMemo = `const paymentSummary = useMemo(() => {
    const rawList = [
      ...filteredSales, 
      ...filteredInvestments.map(i => ({ ...i, isIncome: true, payment_type: 'Cash' })),
      ...filteredCloseouts.map(e => ({ ...e, isExpense: true })),
      ...filteredSupplierPayments.map(p => ({ ...p, isExpense: true, amount: p.paid_amount })),
      ...filteredSupplierPayments.filter(p => parseFloat(p.delivery_charges) > 0).map(p => ({
        ...p, isExpense: true, isTransportFare: true, amount: p.delivery_charges, payment_type: p.fare_payment_type || 'Cash'
      })),
      ...filteredGeneralExpenses.filter(e => e.expense_type !== 'Galla Closeout' && e.expense_type !== 'Admin Payment').map(e => ({ ...e, isExpense: true })),
      ...filteredGeneralExpenses.filter(e => e.expense_type === 'Admin Payment').map(e => ({ ...e, isIncome: true, payment_type: e.payment_type })),
      ...filteredSalaries.map(s => ({ ...s, isExpense: true, payment_type: 'Cash' })),
      ...filteredRents.map(r => ({ ...r, isExpense: true, payment_type: 'Cash' })),
      ...filteredOtherExpenses.map(o => ({ ...o, isExpense: true, payment_type: o.payment_method }))
    ].sort((a, b) => new Date(a.created_at || a.expense_date || a.purchase_date || a.date) - new Date(b.created_at || b.expense_date || b.purchase_date || b.date));

    const initial = filteredAccounts.filter(b => b.module_type !== 'Admin Recipient').reduce((acc, b) => {
      acc[b.id] = parseFloat(b.opening_balance) || 0;
      return acc;
    }, { 'Cash': 0 });

    const res = rawList.reduce((acc, s) => {
      const method = s.payment_type || 'Cash';
      let cleanMethod = method.replace('Bank - ', '').trim();
      
      const isCash = cleanMethod.toLowerCase() === 'cash' || cleanMethod === 'Cash Account';
      let targetKey = 'UNMATCHED_GHOST';
      
      if (isCash) {
         targetKey = 'Cash';
      } else {
         const match = filteredAccounts.find(b => {
             const digits = b.account_number ? b.account_number.slice(-4) : '';
             const cl = cleanMethod.toLowerCase();
             if (digits && cl.includes(digits)) return true;
             const bl = b.bank_name.toLowerCase();
             return cl.includes(bl) || bl.includes(cl);
         });
         if (match) targetKey = match.id;
      }
      
      const amt = getTransactionAmount(s);
      if (!acc[targetKey]) acc[targetKey] = 0;
      
      if (s.isExpense) {
         acc[targetKey] -= amt;
         if (targetKey === 'Cash' && acc[targetKey] < 0) acc[targetKey] = 0; 
      } else {
         acc[targetKey] += amt;
      }
      return acc;
    }, initial);

    return res;
  }, [filteredSales, filteredInvestments, filteredCloseouts, filteredSupplierPayments, filteredGeneralExpenses, filteredSalaries, filteredRents, filteredOtherExpenses, filteredAccounts]);`;

    text = pre + newMemo + post;
    console.log("SUCCESSFULLY INJECTED COMPLETE USEMEMO OVERRIDE!");
} else {
    console.error("COULD NOT LOCATE FULL USEMEMO CONTAINER.");
    process.exit(1);
}

console.log("Step 2: Update totalBank definition logic");
const tbStart = text.indexOf("const totalBank = Object.entries(paymentSummary)");
if(tbStart > -1) {
    const tbEnd = text.indexOf(".reduce((sum, [, v]) => sum + v, 0);", tbStart);
    const fullEnd = tbEnd + ".reduce((sum, [, v]) => sum + v, 0);".length;
    
    text = text.substring(0, tbStart) + 
           `const totalBank = filteredAccounts.filter(acc => !acc.isCash && acc.module_type !== 'Admin Recipient').reduce((sum, acc) => sum + Math.max(0, paymentSummary[acc.id] || 0), 0);` + 
           text.substring(fullEnd);
    console.log("SUCCESSFULLY REWRITTEN TOTALBANK LOGIC!");
}

console.log("Step 3: Modify Grid Balances lookup system");
const rLook = "const cleanName = acc.bank_name.replace(' Account', '');";
const searchIdx = text.indexOf(rLook);
if (searchIdx > -1) {
    const rEndStr = "let bal = summaryKey ? paymentSummary[summaryKey] : 0;";
    const lineEndIdx = text.indexOf(rEndStr, searchIdx);
    if (lineEndIdx > -1) {
       const fullLength = lineEndIdx + rEndStr.length - searchIdx;
       const originalChunk = text.substr(searchIdx, fullLength);
       text = text.replace(originalChunk, `let bal = acc.isCash ? (paymentSummary['Cash'] || 0) : (paymentSummary[acc.id] || 0);`);
       console.log("SUCCESSFULLY REWIRED GRID BALANCE SYSTEM!");
    }
}

fs.writeFileSync(path, text, 'utf8');
console.log("ALL DONE! FILE WRITTEN.");
