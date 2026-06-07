const assert = require('assert');

const checkAccountMatch = (paymentMethod, acc) => {
  if (!paymentMethod || !acc) return false;
  const cl = paymentMethod.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();
  
  const isCashPT = cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account';
  const isCashAcc = (acc.bank_name || '').toLowerCase().trim() === 'cash' || (acc.bank_name || '').toLowerCase().trim() === 'cash account';
  
  if (isCashPT) {
    return isCashAcc;
  }
  if (isCashAcc) return false;

  // Match by last 4 digits of account number
  const digits = acc.account_number ? acc.account_number.slice(-4) : '';
  const starDigitsMatch = cl.match(/\*\*\*\*(\d+)/);
  const generalDigitsMatch = cl.match(/\d{4,}/);
  const paymentDigits = starDigitsMatch ? starDigitsMatch[1] : (generalDigitsMatch ? generalDigitsMatch[0] : null);

  if (paymentDigits) {
    return digits === paymentDigits;
  }

  const bl = (acc.bank_name || '').toLowerCase().trim();
  
  // Exact or contains match
  if (cl.includes(bl) || bl.includes(cl)) {
    return true;
  }

  // Normalize strings by removing non-alphanumeric characters
  const normCl = cl.replace(/[^a-z0-9]/g, '');
  const normBl = bl.replace(/[^a-z0-9]/g, '');
  
  if (normCl && normBl && (normCl.includes(normBl) || normBl.includes(normCl))) {
    return true;
  }

  // Special prefix match for jazz / jazz cash
  if (normCl.startsWith('jazz') && normBl.startsWith('jazz')) {
    return true;
  }

  return false;
};

// Define test cases
const account1 = { bank_name: "UBL", account_number: "PK79UNIL0109000204295044" }; // ending in 5044
const account2 = { bank_name: "UBL", account_number: "PK94UNIL0109000345604471" }; // ending in 4471
const cashAccount = { bank_name: "Cash" };

try {
  // Test Case 1: Specific UBL 5044 payment method
  assert.strictEqual(checkAccountMatch("Bank - UBL (****5044)", account1), true, "5044 payment should match account1 (5044)");
  assert.strictEqual(checkAccountMatch("Bank - UBL (****5044)", account2), false, "5044 payment should NOT match account2 (4471)");

  // Test Case 2: Specific UBL 4471 payment method
  assert.strictEqual(checkAccountMatch("Bank - UBL (****4471)", account1), false, "4471 payment should NOT match account1 (5044)");
  assert.strictEqual(checkAccountMatch("Bank - UBL (****4471)", account2), true, "4471 payment should match account2 (4471)");

  // Test Case 3: Backward compatibility (generic UBL match without digits)
  assert.strictEqual(checkAccountMatch("Bank - UBL", account1), true, "Generic UBL should match account1");
  assert.strictEqual(checkAccountMatch("Bank - UBL", account2), true, "Generic UBL should match account2");

  // Test Case 4: Cash matching
  assert.strictEqual(checkAccountMatch("Cash", cashAccount), true, "Cash should match cash account");
  assert.strictEqual(checkAccountMatch("Cash", account1), false, "Cash should NOT match bank account");
  assert.strictEqual(checkAccountMatch("Bank - UBL (****5044)", cashAccount), false, "Bank payment should NOT match cash account");

  console.log("All unit tests passed successfully!");
} catch (error) {
  console.error("Test failed:", error.message);
  process.exit(1);
}
