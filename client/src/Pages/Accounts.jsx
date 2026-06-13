// DYNAMIC API PATCH
const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

import React, { useState, useEffect, useContext, useMemo } from "react";
import { Landmark, Plus, Search, X, Hash, CreditCard } from "lucide-react";
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import ActionMenu from '../components/ActionMenu';
import { AuthContext } from "../context/AuthContext";
import "../Styles/ModulePages.scss";

export default function Accounts() {
  const { user } = useContext(AuthContext);

  const checkIsCash = (acc) => {
    if (!acc) return false;
    return !!(acc.isCash ||
      acc.bank_name?.toLowerCase() === 'cash' ||
      acc.bank_name?.toLowerCase() === 'cash account');
  };

  const checkAccountMatch = (cleanMethod, bankAccount) => {
    if (!cleanMethod || !bankAccount) return false;
    const cl = cleanMethod.replace(/^bank\s*-\s*/i, '').toLowerCase().trim();

    // If it's a cash check
    if (cl === '' || cl.startsWith('cash') || cl.startsWith('credit') || cl === 'cash account') {
      return checkIsCash(bankAccount);
    }

    if (checkIsCash(bankAccount)) return false;

    // Match by last 4 digits of account number
    const digits = bankAccount.account_number ? bankAccount.account_number.slice(-4) : '';
    const starDigitsMatch = cl.match(/\*\*\*\*(\d+)/);
    const generalDigitsMatch = cl.match(/\d{4,}/);
    const paymentDigits = starDigitsMatch ? starDigitsMatch[1] : (generalDigitsMatch ? generalDigitsMatch[1] : null);

    if (paymentDigits) {
      return digits === paymentDigits;
    }

    const bl = (bankAccount.bank_name || '').toLowerCase().trim();

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

  // State for bank accounts
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ bank_name: "", account_title: "", account_number: "", opening_balance: "" });

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // State for sales (payment overview)
  const [sales, setSales] = useState([]);
  const [supplierPayments, setSupplierPayments] = useState([]);
  const [generalExpenses, setGeneralExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [rents, setRents] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);

  // State for active switcher tab (For Admin)
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? 'Wholesale' : (user?.module_type || 'Wholesale'));

  const filteredAccounts = useMemo(() => {
    const recipientAccounts = accounts.filter(a => a.module_type === 'Admin Recipient');
    const targetModule = user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale');
    const isRetailModule = targetModule === 'Retail 1' || targetModule === 'Retail 2';
    const includeRecipients = !isRetailModule;
    return [
      ...accounts.filter(a => (a.module_type || 'Wholesale') === targetModule && (includeRecipients || a.module_type !== 'Admin Recipient')),
      ...(includeRecipients ? recipientAccounts : [])
    ];
  }, [accounts, activeTab, user]);

  const filteredSales = useMemo(() => {
    const targetModule = user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale');
    return sales.filter(s => (s.sale_type || s.module_type || 'Wholesale') === targetModule);
  }, [sales, activeTab, user]);

  const filteredSupplierPayments = useMemo(() => {
    const targetModule = user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale');
    return supplierPayments.filter(p => (p.module_type || 'Wholesale') === targetModule);
  }, [supplierPayments, activeTab, user]);

  const filteredGeneralExpenses = useMemo(() => {
    const targetModule = user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale');
    return generalExpenses.filter(e => (e.module_type || 'Wholesale') === targetModule);
  }, [generalExpenses, activeTab, user]);

  const filteredSalaries = useMemo(() => {
    const targetModule = user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale');
    return salaries.filter(s => (s.module_type || 'Wholesale') === targetModule);
  }, [salaries, activeTab, user]);

  const filteredRents = useMemo(() => {
    const targetModule = user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale');
    return rents.filter(r => (r.module_type || 'Wholesale') === targetModule);
  }, [rents, activeTab, user]);

  const filteredInvestments = useMemo(() => {
    const targetModule = user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale');
    return investments.filter(i => (i.module_type || 'Wholesale') === targetModule);
  }, [investments, activeTab, user]);

  const filteredOtherExpenses = useMemo(() => {
    const targetModule = user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale');
    return otherExpenses.filter(o => (o.module_type || 'Wholesale') === targetModule);
  }, [otherExpenses, activeTab, user]);

  // State for Ledger view
  const [showLedger, setShowLedger] = useState(false);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState(null);
  const [dateFilter, setDateFilter] = useState('All'); // 'Today', 'Week', 'Month', 'All'

  // State for Bill Viewer
  const [showBill, setShowBill] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  // State & Handlers for Galla Closeout
  const [showCloseoutModal, setShowCloseoutModal] = useState(false);
  const [closeoutForm, setCloseoutForm] = useState({
    amount_sent_to_admin: "",
    amount_kept_as_opening: "",
    admin_bank_id: "",
    notes: "",
    payment_type: "Cash"
  });
  const [showAdminBankModal, setShowAdminBankModal] = useState(false);
  const [adminBankForm, setAdminBankForm] = useState({ bank_name: "", account_title: "", account_number: "", opening_balance: "" });
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showBankSelectorModal, setShowBankSelectorModal] = useState(false);

  const [showAdminPaymentModal, setShowAdminPaymentModal] = useState(false);
  const [adminPaymentForm, setAdminPaymentForm] = useState({
    amount: "",
    admin_bank_id: "",
    payment_type: "Cash",
    notes: ""
  });

  const getAdminBankBalance = (acc) => {
    const opening = parseFloat(acc.opening_balance) || 0;
    const received = generalExpenses
      .filter(e => (e.expense_type === 'Galla Closeout' || e.title === 'Galla Closeout' || e.description?.includes('Galla Closeout') || e.notes?.includes('Recipient Bank')) && e.notes?.includes(acc.bank_name) && e.notes?.includes(acc.account_number))
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const paid = generalExpenses
      .filter(e => e.expense_type === 'Admin Payment' && e.notes?.includes(acc.bank_name) && e.notes?.includes(acc.account_number))
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    return opening + received - paid;
  };

  const getSourceBalance = (method) => {
    if (!method) return 0;
    const cleanPT = method.replace(/^Bank - /i, '').toLowerCase().trim();
    if (cleanPT.startsWith('cash') || cleanPT.startsWith('credit') || cleanPT === '') {
      return totalCash;
    }
    const match = filteredAccounts.find(b => checkAccountMatch(method, b));
    if (match) return paymentSummary[match.id] || 0;
    const summaryKey = Object.keys(paymentSummary).find(k => k.toLowerCase() === method.toLowerCase());
    return summaryKey ? paymentSummary[summaryKey] : 0;
  };

  const handleAdminBankSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch((API_BASE_URL + '/banks'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...adminBankForm, opening_balance: parseFloat(adminBankForm.opening_balance) || 0, is_admin_recipient: true })
      });
      if (res.ok) {
        setShowAdminBankModal(false);
        setAdminBankForm({ bank_name: "", account_title: "", account_number: "", opening_balance: "" });
        fetchAccounts();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleOpenCloseout = () => {
    setCloseoutForm({
      amount_sent_to_admin: totalCash,
      amount_kept_as_opening: "",
      admin_bank_id: "",
      notes: "",
      payment_type: "Cash"
    });
    setShowCloseoutModal(true);
  };

  const handlePaymentTypeChange = (method) => {
    const sourceBalance = getSourceBalance(method);
    setCloseoutForm(prev => ({
      ...prev,
      payment_type: method,
      amount_sent_to_admin: sourceBalance,
      amount_kept_as_opening: ""
    }));
  };

  // State for Transfer Funds
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    source_account: "Cash",
    destination_account: "",
    amount: "",
    notes: ""
  });

  const handleOpenTransfer = () => {
    setTransferForm({
      source_account: "Cash",
      destination_account: "",
      amount: "",
      notes: ""
    });
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(transferForm.amount) || 0;
    if (amt <= 0) return alert("Please enter a valid transfer amount!");
    if (transferForm.source_account === transferForm.destination_account) {
      return alert("Source and Destination accounts cannot be the same!");
    }

    // Check if enough balance exists
    const sourceBal = getSourceBalance(transferForm.source_account);
    if (amt > sourceBal) {
      return alert(`Insufficient funds in ${transferForm.source_account}! Available: Rs. ${sourceBal.toLocaleString()}`);
    }

    setLoading(true);
    try {
      const res = await fetch((API_BASE_URL + '/banks/transfer'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          source_account: transferForm.source_account,
          destination_account: transferForm.destination_account,
          amount: amt,
          notes: transferForm.notes,
          module_type: user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale')
        })
      });

      if (res.ok) {
        setShowTransferModal(false);
        fetchAccounts();
        fetchSales();
        fetchSupplierPayments();
        fetchOthers();
        alert("Funds transferred successfully!");
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Transfer failed!");
      }
    } catch (err) {
      console.error(err);
      alert("Transfer failed!");
    }
    setLoading(false);
  };

  const handleCloseoutFieldChange = (field, val) => {
    if (field === 'notes') {
      setCloseoutForm(prev => ({ ...prev, notes: val }));
      return;
    }

    const sourceBalance = getSourceBalance(closeoutForm.payment_type);
    // Strip leading zeroes from the string (e.g. "04" -> "4", "044" -> "44")
    let cleanVal = String(val).replace(/^0+(?=\d)/, '');
    if (cleanVal === '0' && val === '0') {
      cleanVal = '0';
    } else if (cleanVal === '' || isNaN(parseFloat(cleanVal))) {
      setCloseoutForm(prev => ({
        ...prev,
        [field]: "",
        ...(field === 'amount_sent_to_admin' ? { amount_kept_as_opening: sourceBalance } : { amount_sent_to_admin: sourceBalance })
      }));
      return;
    }

    const value = parseFloat(cleanVal) || 0;
    if (field === 'amount_sent_to_admin') {
      const kept = Math.max(0, sourceBalance - value);
      setCloseoutForm(prev => ({ ...prev, amount_sent_to_admin: cleanVal, amount_kept_as_opening: kept === 0 ? "" : kept }));
    } else if (field === 'amount_kept_as_opening') {
      const sent = Math.max(0, sourceBalance - value);
      setCloseoutForm(prev => ({ ...prev, amount_kept_as_opening: cleanVal, amount_sent_to_admin: sent === 0 ? "" : sent }));
    }
  };

  const handleCloseoutSubmit = async (e) => {
    e.preventDefault();
    if (!closeoutForm.admin_bank_id) {
      alert("Please select the recipient Admin Bank Account!");
      return;
    }
    setLoading(true);
    try {
      const selectedBank = displayAccounts.find(acc => acc.id === closeoutForm.admin_bank_id || String(acc.id) === String(closeoutForm.admin_bank_id));
      const bankDetailsText = selectedBank ? `Recipient Bank: ${selectedBank.bank_name} (A/C: ${selectedBank.account_number}, Title: ${selectedBank.account_title || 'N/A'})` : '';
      const submissionData = {
        ...closeoutForm,
        module_type: user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale'),
        notes: bankDetailsText ? `${bankDetailsText}. ${closeoutForm.notes}` : closeoutForm.notes
      };
      const res = await fetch((API_BASE_URL + '/banks/closeout'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submissionData)
      });

      if (res.ok) {
        setShowCloseoutModal(false);
        // Refresh all data
        fetchAccounts();
        fetchSales();
        fetchSupplierPayments();
        fetchOthers();
      }
    } catch (err) {
      console.error('Failed to submit closeout', err);
    }
    setLoading(false);
  };

  const handleAdminPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!adminPaymentForm.admin_bank_id) {
      alert("Please select the source Admin Bank Account!");
      return;
    }
    setLoading(true);
    try {
      const selectedBank = displayAccounts.find(acc => acc.id === adminPaymentForm.admin_bank_id || String(acc.id) === String(adminPaymentForm.admin_bank_id));
      const bankDetailsText = selectedBank ? `Admin Bank: ${selectedBank.bank_name} (A/C: ${selectedBank.account_number}, Title: ${selectedBank.account_title || 'N/A'})` : '';
      const submissionData = {
        amount: parseFloat(adminPaymentForm.amount) || 0,
        payment_type: adminPaymentForm.payment_type,
        module_type: user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale'),
        notes: bankDetailsText ? `${bankDetailsText}. ${adminPaymentForm.notes}` : adminPaymentForm.notes
      };
      const res = await fetch((API_BASE_URL + '/banks/admin-payment'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submissionData)
      });

      if (res.ok) {
        setShowAdminPaymentModal(false);
        setAdminPaymentForm({ amount: "", admin_bank_id: "", payment_type: "Cash", notes: "" });
        fetchAccounts();
        fetchSales();
        fetchSupplierPayments();
        fetchOthers();
      }
    } catch (err) {
      console.error('Failed to submit admin payment', err);
    }
    setLoading(false);
  };

  // Fetch bank accounts
  const fetchAccounts = async () => {
    try {
      const res = await fetch((API_BASE_URL + '/banks?include_recipients=true'), {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const finalData = Array.isArray(data) ? data : [];
      setAccounts(finalData);
      localStorage.setItem('cache_acc_banks', JSON.stringify(finalData));
    } catch (err) {
      console.error('Failed to fetch bank accounts', err);
    }
  };

  // Fetch sales for payment summary
  const fetchSales = async () => {
    try {
      const res = await fetch((API_BASE_URL + '/sales?limit=10000'), {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const finalData = Array.isArray(data) ? data : [];
      setSales(finalData);
      localStorage.setItem('cache_acc_sales', JSON.stringify(finalData));
    } catch (err) {
      console.error('Failed to fetch sales', err);
    }
  };

  // Fetch supplier payments for account deductions
  const fetchSupplierPayments = async () => {
    try {
      const res = await fetch((API_BASE_URL + '/purchases/ledger/all'), {
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error("Could not fetch supplier payments");
      const data = await res.json();
      const finalData = Array.isArray(data) ? data.filter(p => parseFloat(p.paid_amount) > 0 && (!p.product_name)) : [];
      setSupplierPayments(finalData);
      localStorage.setItem('cache_acc_sup_pay', JSON.stringify(finalData));
    } catch (err) {
      console.error('Failed to fetch supplier payments', err);
    }
  };

  // Fetch all other modules
  const fetchOthers = async () => {
    const h = { "Authorization": `Bearer ${localStorage.getItem('token')}` };

    try {
      const res = await fetch((API_BASE_URL + '/salary'), { headers: h });
      if (res.ok) {
        const d = await res.json();
        setSalaries(d);
        localStorage.setItem('cache_acc_salary', JSON.stringify(d));
      }
    } catch (err) { console.error("Failed to fetch salaries:", err); }

    try {
      const res = await fetch((API_BASE_URL + '/rent'), { headers: h });
      if (res.ok) {
        const d = await res.json();
        setRents(d);
        localStorage.setItem('cache_acc_rent', JSON.stringify(d));
      }
    } catch (err) { console.error("Failed to fetch rents:", err); }

    try {
      const res = await fetch((API_BASE_URL + '/investments'), { headers: h });
      if (res.ok) {
        const d = await res.json();
        setInvestments(d);
        localStorage.setItem('cache_acc_invest', JSON.stringify(d));
      }
    } catch (err) { console.error("Failed to fetch investments:", err); }

    try {
      const res = await fetch((API_BASE_URL + '/other-expenses'), { headers: h });
      if (res.ok) {
        const d = await res.json();
        setOtherExpenses(d);
        localStorage.setItem('cache_acc_other_exp', JSON.stringify(d));
      }
    } catch (err) { console.error("Failed to fetch other expenses:", err); }

    try {
      const res = await fetch((API_BASE_URL + '/expenses'), { headers: h });
      if (res.ok) {
        const d = await res.json();
        setGeneralExpenses(d);
        localStorage.setItem('cache_acc_gen_exp', JSON.stringify(d));
      }
    } catch (err) { console.error("Failed to fetch general expenses:", err); }
  };

  // Initialise data on mount
  useEffect(() => {
    try {
      const cBanks = localStorage.getItem('cache_acc_banks');
      const cSales = localStorage.getItem('cache_acc_sales');
      const cSupPay = localStorage.getItem('cache_acc_sup_pay');
      const cSalary = localStorage.getItem('cache_acc_salary');
      const cRent = localStorage.getItem('cache_acc_rent');
      const cInvest = localStorage.getItem('cache_acc_invest');
      const cOtherExp = localStorage.getItem('cache_acc_other_exp');
      const cGenExp = localStorage.getItem('cache_acc_gen_exp');

      if (cBanks) setAccounts(JSON.parse(cBanks));
      if (cSales) setSales(JSON.parse(cSales));
      if (cSupPay) setSupplierPayments(JSON.parse(cSupPay));
      if (cSalary) setSalaries(JSON.parse(cSalary));
      if (cRent) setRents(JSON.parse(cRent));
      if (cInvest) setInvestments(JSON.parse(cInvest));
      if (cOtherExp) setOtherExpenses(JSON.parse(cOtherExp));
      if (cGenExp) setGeneralExpenses(JSON.parse(cGenExp));
    } catch (e) { console.error(e); }

    fetchAccounts();
    fetchSales();
    fetchSupplierPayments();
    fetchOthers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `${API_BASE_URL}/banks/${editId}` : (API_BASE_URL + '/banks');

      const module_type = user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale');
      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...form, module_type })
      });

      setShowModal(false);
      setEditId(null);
      setForm({ bank_name: "", account_title: "", account_number: "", opening_balance: 0 });
      fetchAccounts();
    } catch (err) {
      console.error('Failed to save bank account', err);
    }
    setLoading(false);
  };

  const handleEdit = (acc) => {
    if (user?.role !== 'admin') return;
    setEditId(acc.id);
    setForm({
      bank_name: acc.bank_name,
      account_title: acc.account_title,
      account_number: acc.account_number,
      opening_balance: acc.opening_balance
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/banks/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      });
      fetchAccounts();
    } catch (err) {
      console.error('Failed to delete account', err);
    }
  };

  const handleCashOpeningBalance = () => {
    const targetModule = user?.role === 'admin' ? activeTab : (user?.module_type || 'Wholesale');
    const cashAcc = accounts.find(a =>
      (a.bank_name.toLowerCase() === 'cash' || a.bank_name.toLowerCase() === 'cash account') &&
      (a.module_type || 'Wholesale') === targetModule
    );
    if (cashAcc) {
      handleEdit(cashAcc);
    } else {
      setEditId(null);
      setForm({ bank_name: "Cash", account_title: "Main Counter", account_number: "Cash", opening_balance: 0 });
      setShowModal(true);
    }
  };

  const handlePrintLedger = () => {
    window.print();
  };

  const handleViewBill = (sale) => {
    setSelectedBill(sale);
    setShowBill(true);
  };

  const getTransactionAmount = (s) => {
    if (s.isTransportFare) {
      return parseFloat(s.delivery_charges || s.amount || 0);
    }
    if (s.isExpense) {
      return parseFloat(s.paid_amount || s.amount || 0);
    }
    if (s.isIncome) {
      return parseFloat(s.amount || 0);
    }
    // Sale: Actual cash/bank received is paid_amount
    return parseFloat(s.paid_amount || 0);
  };

  const getAmountKeptAsOpening = (closeout) => {
    if (!closeout) return 0;
    const match = closeout.notes?.match(/Opening balance Rs\.\s*([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const filteredCloseouts = useMemo(() => {
    return filteredGeneralExpenses.filter(e => e.expense_type === 'Galla Closeout');
  }, [filteredGeneralExpenses]);

  const latestCloseout = useMemo(() => {
    if (filteredCloseouts.length === 0) return null;
    return [...filteredCloseouts].sort((a, b) => new Date(a.created_at || a.expense_date || a.date) - new Date(b.created_at || b.expense_date || b.date))[0];
  }, [filteredCloseouts]);

  const latestCloseoutDate = useMemo(() => {
    return latestCloseout ? new Date(latestCloseout.created_at || latestCloseout.expense_date || latestCloseout.date) : null;
  }, [latestCloseout]);

  const paymentSummary = useMemo(() => {
    const rawList = [
      ...filteredSales,
      ...filteredInvestments.map(i => ({ ...i, isIncome: true, payment_type: 'Cash' })),
      ...filteredCloseouts.map(e => ({ ...e, isExpense: true })),
      ...filteredSupplierPayments.map(p => ({ ...p, isExpense: true, amount: p.paid_amount })),
      ...filteredSupplierPayments.filter(p => parseFloat(p.delivery_charges) > 0).map(p => ({
        ...p, isExpense: true, isTransportFare: true, amount: p.delivery_charges, payment_type: p.fare_payment_type || 'Cash'
      })),
      ...filteredGeneralExpenses.filter(e => e.expense_type !== 'Galla Closeout' && e.expense_type !== 'Admin Payment' && e.expense_type !== 'Transfer In' && e.expense_type !== 'Sale Return' && e.expense_type !== 'Sale Return Refund').map(e => ({ ...e, isExpense: true })),
      ...filteredGeneralExpenses.filter(e => e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In').map(e => ({ ...e, isIncome: true, payment_type: e.payment_type })),
      ...filteredSalaries.map(s => ({ ...s, isExpense: true, payment_type: 'Cash' })),
      ...filteredRents.map(r => ({ ...r, isExpense: true, payment_type: 'Cash' })),
      ...filteredOtherExpenses.map(o => ({ ...o, isExpense: true, payment_type: o.payment_method }))
    ].sort((a, b) => new Date(a.created_at || a.expense_date || a.purchase_date || a.date) - new Date(b.created_at || b.expense_date || b.purchase_date || b.date));

    const realCashAcc = filteredAccounts.find(b => (b.bank_name.toLowerCase() === 'cash' || b.bank_name.toLowerCase() === 'cash account') && b.module_type !== 'Admin Recipient');
    const cashOpeningBal = realCashAcc ? (parseFloat(realCashAcc.opening_balance) || 0) : 0;

    const initial = filteredAccounts.filter(b => b.module_type !== 'Admin Recipient').reduce((acc, b) => {
      acc[b.id] = parseFloat(b.opening_balance) || 0;
      return acc;
    }, { 'Cash': cashOpeningBal });

    const thresholdIdx = rawList.findIndex(t =>
      Number(t.id) === 218
    );

    const res = rawList.reduce((acc, s, idx) => {
      if (s.payment_type === 'Deduction') return acc;
      if (s.payment_type === 'Deduction') return acc;
      const method = s.payment_type || 'Cash';

      let targetKey = 'UNMATCHED_GHOST';
      const cleanPT = method.replace(/^Bank - /i, '').toLowerCase().trim();
      const isCash = cleanPT.startsWith('cash') || cleanPT.startsWith('credit') || cleanPT === '';

      if (isCash) {
        targetKey = 'Cash';
      } else {
        const match = filteredAccounts.find(b => checkAccountMatch(method, b));
        if (match) targetKey = match.id;
      }

      const amt = getTransactionAmount(s);
      if (!acc[targetKey]) acc[targetKey] = 0;

      if (s.isExpense) {
        acc[targetKey] -= amt;
        const shouldClamp = (thresholdIdx !== -1 && idx < thresholdIdx);
        if (targetKey === 'Cash' && acc[targetKey] < 0 && shouldClamp) acc[targetKey] = 0;
      } else {
        acc[targetKey] += amt;
      }
      return acc;
    }, initial);

    return res;
  }, [filteredSales, filteredInvestments, filteredCloseouts, filteredSupplierPayments, filteredGeneralExpenses, filteredSalaries, filteredRents, filteredOtherExpenses, filteredAccounts, activeTab]);

  const totalCash = paymentSummary['Cash'] || 0;
  const totalBank = filteredAccounts.filter(acc => !checkIsCash(acc) && acc.module_type !== 'Admin Recipient').reduce((sum, acc) => sum + Math.max(0, paymentSummary[acc.id] || 0), 0);

  const totalAdminReceived = useMemo(() => {
    const isToday = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const today = new Date();
      return d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
    };
    const received = generalExpenses
      .filter(e => isToday(e.created_at || e.expense_date) && (e.expense_type === 'Galla Closeout' || e.title === 'Galla Closeout' || e.description?.includes('Galla Closeout') || e.notes?.includes('Recipient Bank')))
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const paid = generalExpenses
      .filter(e => isToday(e.created_at || e.expense_date) && e.expense_type === 'Admin Payment')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    return received - paid;
  }, [generalExpenses]);

  // Filter all transactions for the selected ledger account (without date filter)
  const allAccountTransactions = useMemo(() => {
    if (!selectedLedgerAccount) return [];

    return [
      ...filteredSales,
      ...filteredSupplierPayments.map(p => ({ ...p, isExpense: true, customer_name: p.supplier_name || 'Supplier', amount: p.paid_amount, created_at: p.created_at || p.purchase_date })),
      ...filteredSupplierPayments.filter(p => parseFloat(p.delivery_charges) > 0).map(p => ({
        ...p, isExpense: true, isTransportFare: true, amount: p.delivery_charges, payment_type: p.fare_payment_type || 'Cash',
        created_at: p.created_at || p.purchase_date, isTransportFare: true
      })),
      ...filteredGeneralExpenses.filter(e => e.expense_type !== 'Sale Return' && e.expense_type !== 'Sale Return Refund').map(e => {
        if (e.expense_type === 'Admin Payment' || e.expense_type === 'Transfer In') {
          return {
            ...e,
            isExpense: false,
            isIncome: true,
            customer_name: e.description || `Received Transfer`,
            created_at: e.created_at || e.expense_date
          };
        }
        return {
          ...e,
          isExpense: true,
          customer_name: e.expense_type === 'Transfer Out' ? (e.description || 'Sent Transfer') : `General Expense: ${e.title || e.description || 'Office Expense'}`,
          created_at: e.created_at || e.expense_date
        };
      }),
      ...filteredSalaries.map(s => ({ ...s, isExpense: true, customer_name: `Salary: ${s.employee_name}`, payment_type: 'Cash', created_at: s.created_at || s.payment_date })),
      ...filteredRents.map(r => ({ ...r, isExpense: true, customer_name: `Rent: ${r.property_name}`, payment_type: 'Cash', created_at: r.created_at || r.rent_date })),
      ...filteredOtherExpenses.map(o => ({ ...o, isExpense: true, customer_name: `Other: ${o.title}`, payment_type: o.payment_method, created_at: o.created_at || o.date })),
      ...filteredInvestments.map(i => ({ ...i, isIncome: true, customer_name: `Invest: ${i.investor}`, payment_type: 'Cash', created_at: i.created_at || i.date }))
    ].map(s => {
      if (selectedLedgerAccount?.module_type === 'Admin Recipient') {
        const isAdminPayment = s.expense_type === 'Admin Payment' || s.title?.includes('Admin Payment') || s.customer_name?.includes('Admin Payment');
        if (isAdminPayment && s.notes?.includes(selectedLedgerAccount.bank_name) && s.notes?.includes(selectedLedgerAccount.account_number)) {
          return {
            ...s,
            isExpense: true,
            isIncome: false,
            customer_name: `Sent Admin Payment`
          };
        }
        const isGallaCloseout = s.expense_type === 'Galla Closeout' || s.customer_name?.includes('Galla Closeout') || s.title?.includes('Galla Closeout') || s.notes?.includes('Recipient Bank');
        if (isGallaCloseout && s.notes?.includes(selectedLedgerAccount.bank_name) && s.notes?.includes(selectedLedgerAccount.account_number)) {
          return {
            ...s,
            isExpense: false,
            isIncome: true,
            customer_name: `Received Galla Handover`
          };
        }
      }
      return s;
    }).filter(s => {
      if (!selectedLedgerAccount) return false;

      if (selectedLedgerAccount.module_type === 'Admin Recipient') {
        return (s.customer_name === 'Received Galla Handover' || s.customer_name === 'Sent Admin Payment') && s.notes?.includes(selectedLedgerAccount.bank_name) && s.notes?.includes(selectedLedgerAccount.account_number);
      }

      const accountMatch = checkAccountMatch(s.payment_type || 'Cash', selectedLedgerAccount);
      return accountMatch;
    }).sort((a, b) => new Date(a.created_at || a.purchase_date || a.date) - new Date(b.created_at || b.purchase_date || b.date));
  }, [filteredSales, filteredSupplierPayments, filteredGeneralExpenses, filteredSalaries, filteredRents, filteredOtherExpenses, filteredInvestments, selectedLedgerAccount]);

  const allCalculatedTransactions = useMemo(() => {
    let currentBal = parseFloat(selectedLedgerAccount?.opening_balance || 0);
    const thresholdIdx = allAccountTransactions.findIndex(t =>
      Number(t.id) === 218
    );

    return allAccountTransactions.map((t, idx) => {
      const amt = getTransactionAmount(t);
      if (t.isExpense) {
        currentBal -= amt;
        const shouldClamp = (thresholdIdx !== -1 && idx < thresholdIdx);
        if (selectedLedgerAccount?.module_type !== 'Admin Recipient' && currentBal < 0 && shouldClamp) {
          currentBal = 0;
        }
      } else {
        currentBal += amt;
      }
      return { ...t, running_balance: currentBal };
    });
  }, [allAccountTransactions, selectedLedgerAccount, activeTab]);

  // Filter calculated transactions by date range for display
  const calculatedTransactions = useMemo(() => {
    return allCalculatedTransactions.filter(s => {
      const saleDate = new Date(s.created_at || s.purchase_date || s.date);
      const now = new Date();
      if (dateFilter === 'Today') return saleDate.toDateString() === now.toDateString();
      if (dateFilter === 'Week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return saleDate >= weekAgo;
      }
      if (dateFilter === 'Month') return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      return true;
    });
  }, [allCalculatedTransactions, dateFilter]);

  // Calculate ledger totals (Opening, Cash In, Cash Out, Closing)
  const ledgerTotals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    calculatedTransactions.forEach(t => {
      const amt = getTransactionAmount(t);
      if (t.isExpense) {
        totalOut += amt;
      } else {
        totalIn += amt;
      }
    });

    let opening = parseFloat(selectedLedgerAccount?.opening_balance || 0);
    if (calculatedTransactions.length > 0) {
      const firstTx = calculatedTransactions[0];
      const idx = allCalculatedTransactions.findIndex(t => t === firstTx || (t.id === firstTx.id && t.created_at === firstTx.created_at && t.customer_name === firstTx.customer_name));
      if (idx > 0) {
        opening = allCalculatedTransactions[idx - 1].running_balance;
      }
    } else {
      if (allCalculatedTransactions.length > 0) {
        opening = allCalculatedTransactions[allCalculatedTransactions.length - 1].running_balance;
      }
    }

    const closing = calculatedTransactions.length > 0
      ? calculatedTransactions[calculatedTransactions.length - 1].running_balance
      : opening;

    return {
      opening,
      totalIn,
      totalOut,
      closing
    };
  }, [calculatedTransactions, allCalculatedTransactions, selectedLedgerAccount]);

  const getRecentTransactionsForAccount = (acc) => {
    const isCash = checkIsCash(acc);
    const accountTransactions = [
      ...filteredSales,
      ...filteredSupplierPayments.map(p => ({ ...p, isExpense: true, customer_name: p.supplier_name || 'Supplier', amount: p.paid_amount, created_at: p.created_at || p.purchase_date })),
      ...filteredSupplierPayments.filter(p => parseFloat(p.delivery_charges) > 0).map(p => ({
        ...p, isExpense: true, customer_name: `Fare: ${p.vehicle_number || 'Vehicle'}`,
        amount: p.delivery_charges, payment_type: p.fare_payment_type || 'Cash',
        created_at: p.created_at || p.purchase_date, isTransportFare: true
      })),
      ...filteredGeneralExpenses.filter(e => e.expense_type !== 'Sale Return' && e.expense_type !== 'Sale Return Refund').map(e => {
        if (e.expense_type === 'Admin Payment') {
          return {
            ...e,
            isExpense: false,
            isIncome: true,
            customer_name: e.description || `Received Admin Payment`,
            created_at: e.created_at || e.expense_date
          };
        }
        return {
          ...e,
          isExpense: true,
          customer_name: `General Expense: ${e.title || e.description || 'Office Expense'}`,
          created_at: e.created_at || e.expense_date
        };
      }),
      ...filteredSalaries.map(s => ({ ...s, isExpense: true, customer_name: `Salary: ${s.employee_name}`, payment_type: 'Cash', created_at: s.created_at || s.payment_date })),
      ...filteredRents.map(r => ({ ...r, isExpense: true, customer_name: `Rent: ${r.property_name}`, payment_type: 'Cash', created_at: r.created_at || r.rent_date })),
      ...filteredOtherExpenses.map(o => ({ ...o, isExpense: true, customer_name: `Other: ${o.title}`, payment_type: o.payment_method, created_at: o.created_at || o.date })),
      ...filteredInvestments.map(i => ({ ...i, isIncome: true, customer_name: `Invest: ${i.investor}`, payment_type: 'Cash', created_at: i.created_at || i.date }))
    ].map(s => {
      if (acc.module_type === 'Admin Recipient') {
        const isGallaCloseout = s.expense_type === 'Galla Closeout' || s.customer_name?.includes('Galla Closeout') || s.title?.includes('Galla Closeout') || s.notes?.includes('Recipient Bank');
        if (isGallaCloseout && s.notes?.includes(acc.bank_name) && s.notes?.includes(acc.account_number)) {
          return {
            ...s,
            isExpense: false,
            isIncome: true,
            customer_name: `Received Galla Handover`
          };
        }
        const isAdminPayment = s.expense_type === 'Admin Payment';
        if (isAdminPayment && s.notes?.includes(acc.bank_name) && s.notes?.includes(acc.account_number)) {
          return {
            ...s,
            isExpense: true,
            isIncome: false,
            customer_name: `Sent Admin Payment`
          };
        }
      }
      return s;
    }).filter(s => {
      if (acc.module_type === 'Admin Recipient') {
        return (s.customer_name === 'Received Galla Handover' || s.customer_name === 'Sent Admin Payment') && s.notes?.includes(acc.bank_name) && s.notes?.includes(acc.account_number);
      }
      return checkAccountMatch(s.payment_type || 'Cash', acc);
    }).sort((a, b) => new Date(b.created_at || b.purchase_date || b.date) - new Date(a.created_at || a.purchase_date || a.date));

    return accountTransactions.slice(0, 3);
  };

  const summarySection = (
    <div className="payment-overview-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
      {/* Cash Card */}
      <div className="stat-card"
        onClick={() => {
          if (user?.role === 'admin') {
            handleCashOpeningBalance();
          }
        }}
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          padding: '24px', borderRadius: '20px', color: '#fff',
          boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: (user?.role === 'admin') ? 'pointer' : 'default', transition: 'transform 0.2s'
        }}
        onMouseEnter={e => {
          if (user?.role === 'admin') {
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={e => {
          if (user?.role === 'admin') {
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        <div>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Cash {(user?.role === 'admin') && "(Click to Set Opening)"}
          </p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 800 }}>Rs. {totalCash.toLocaleString()}</h2>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '16px' }}>
          <CreditCard size={32} />
        </div>
      </div>

      {/* Bank Card */}
      <div className="stat-card"
        onClick={() => {
          if (user?.role === 'admin') {
            setShowBankSelectorModal(true);
          }
        }}
        style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
          padding: '24px', borderRadius: '20px', color: '#fff',
          boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: (user?.role === 'admin') ? 'pointer' : 'default', transition: 'transform 0.2s'
        }}
        onMouseEnter={e => {
          if (user?.role === 'admin') {
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={e => {
          if (user?.role === 'admin') {
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        <div>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Bank Received {(user?.role === 'admin') && "(Click to Edit Banks)"}
          </p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 800 }}>Rs. {totalBank.toLocaleString()}</h2>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '16px' }}>
          <Landmark size={32} />
        </div>
      </div>

      {/* Admin Received Card (Only visible to Admin) */}
      {user?.role === 'admin' && (
        <div className="stat-card"
          style={{
            background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
            padding: '24px', borderRadius: '20px', color: '#fff',
            boxShadow: '0 10px 20px rgba(245, 158, 11, 0.2)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'transform 0.2s'
          }}
        >
          <div>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Received by Admin (All Users)
            </p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem', fontWeight: 800 }}>Rs. {totalAdminReceived.toLocaleString()}</h2>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '16px' }}>
            <Landmark size={32} />
          </div>
        </div>
      )}
    </div>
  );

  // Access guard removed - Backend now handles isolation

  // Combine Bank Accounts with a virtual "Cash" account ONLY if no real Cash account exists
  const displayAccounts = useMemo(() => {
    const hasRealCash = filteredAccounts.some(a => (a.bank_name.toLowerCase() === 'cash' || a.bank_name.toLowerCase() === 'cash account') && a.module_type !== 'Admin Recipient');
    const baseAccounts = hasRealCash ? filteredAccounts : [
      { id: 'cash-id', bank_name: 'Cash Account', account_title: 'Main Counter', account_number: 'N/A', isCash: true, opening_balance: 0 },
      ...filteredAccounts
    ];
    return baseAccounts.map(acc => {
      let bal = checkIsCash(acc) ? (paymentSummary['Cash'] || 0) : (paymentSummary[acc.id] || 0);
      if (acc.module_type === 'Admin Recipient') {
        bal = getAdminBankBalance(acc);
      }
      return { ...acc, calculated_balance: bal };
    });
  }, [filteredAccounts, paymentSummary, generalExpenses, activeTab]);

  const filtered = displayAccounts.filter(acc => acc.bank_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="module-page">
      <div className="module-header no-print">
        <div className="module-title">
          <div className="module-icon" style={{ background: '#e0f2fe', color: '#0ea5e9' }}><Landmark size={28} /></div>
          <div>
            <h1>Financial Accounts</h1>
            <p>Manage cash and bank accounts tracking all inflows</p>
          </div>
        </div>

        {user?.role === 'admin' && user?.role === 'admin' && (
          <div className="counter-switcher">
            <button className={activeTab === 'Wholesale' ? 'active' : ''} onClick={() => setActiveTab('Wholesale')}>Wholesale</button>
            <button className={activeTab === 'Retail 1' ? 'active' : ''} onClick={() => setActiveTab('Retail 1')}>Retail 1</button>
            <button className={activeTab === 'Retail 2' ? 'active' : ''} onClick={() => setActiveTab('Retail 2')}>Retail 2</button>
          </div>
        )}

        <div className="module-actions" style={{ display: 'flex', gap: '10px' }}>
          <Button label="Transfer Funds" icon="pi pi-directions" onClick={handleOpenTransfer} className="p-button-secondary" style={{ borderRadius: '12px', background: '#475569', borderColor: '#475569' }} />
          <Button label="Galla Closeout" icon="pi pi-lock" onClick={handleOpenCloseout} className="p-button-warning" style={{ borderRadius: '12px' }} />
          {user?.role === 'admin' && (
            <Button label="Send Admin Payment" icon="pi pi-download" onClick={() => {
              setAdminPaymentForm({ amount: "", admin_bank_id: "", payment_type: "Cash", notes: "" });
              setShowAdminPaymentModal(true);
            }} className="p-button-info" style={{ borderRadius: '12px' }} />
          )}
          {user?.role === 'admin' && (
            <Button label="Add Recipient Bank" icon="pi pi-plus-circle" onClick={() => { setAdminBankForm({ bank_name: "", account_title: "", account_number: "" }); setShowAdminBankModal(true); }} className="p-button-success" style={{ borderRadius: '12px' }} />
          )}
          <Button label="Add Bank Account" icon="pi pi-plus" onClick={() => { setEditId(null); setForm({ bank_name: "", account_title: "", account_number: "", opening_balance: 0 }); setShowModal(true); }} className="p-button-primary" style={{ borderRadius: '12px' }} />
        </div>

      </div>

      {/* Payment summary */}
      <div className="no-print">
        {summarySection}

        <h3 style={{ margin: '25px 0 15px 0', color: '#1e293b', fontWeight: 800, fontSize: '1.3rem' }}>All Accounts & Recent Activity</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '35px'
        }}>
          {displayAccounts.map(acc => {
            const bal = acc.calculated_balance;
            const recent = getRecentTransactionsForAccount(acc);
            const isAdminRecipient = acc.module_type === 'Admin Recipient';

            return (
              <div key={acc.id}
                onClick={() => { setSelectedLedgerAccount(acc); setDateFilter('All'); setShowLedger(true); }}
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '20px',
                  border: isAdminRecipient ? '1px dashed #f59e0b' : '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '210px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '8px', borderRadius: '10px', background: checkIsCash(acc) ? '#f0fdf4' : (isAdminRecipient ? '#fef3c7' : '#eff6ff'), color: checkIsCash(acc) ? '#16a34a' : (isAdminRecipient ? '#d97706' : '#2563eb') }}>
                        {checkIsCash(acc) ? <CreditCard size={18} /> : <Landmark size={18} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <h4 style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>{acc.bank_name}</h4>
                          {isAdminRecipient && (
                            <span style={{
                              background: '#fef3c7',
                              color: '#d97706',
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '20px',
                              textTransform: 'uppercase',
                              border: '1px solid #fde68a'
                            }}>Admin</span>
                          )}
                        </div>
                        {acc.account_number && acc.account_number !== 'N/A' && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>A/C: {acc.account_number}</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>{acc.account_title || 'Counter'}</span>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{isAdminRecipient ? 'Total Handovers Received' : 'Current Balance'}</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                      Rs. {bal.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Recent Activity</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {recent.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No recent activity</span>
                    ) : recent.map((t, index) => {
                      const amt = getTransactionAmount(t);
                      return (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                          <span style={{ color: '#475569', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                            {t.customer_name.replace('General Expense: ', '').replace('Salary: ', 'Salary - ')}
                          </span>
                          <span style={{ fontWeight: 700, color: t.isExpense ? '#ef4444' : '#16a34a' }}>
                            {t.isExpense ? '-' : '+'} Rs. {amt.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pos-table-actions no-print">
        <div className="search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="module-table-container no-print" style={{ padding: '20px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <DataTable value={filtered} emptyMessage="No accounts found." className="p-datatable-sm" stripedRows
          onRowClick={(e) => { setSelectedLedgerAccount(e.data); setDateFilter('All'); setShowLedger(true); }} rowHover style={{ cursor: 'pointer' }}>
          <Column field="bank_name" header="Account Name" body={acc => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: checkIsCash(acc) ? '#f0fdf4' : '#eff6ff', color: checkIsCash(acc) ? '#16a34a' : '#2563eb' }}>
                {checkIsCash(acc) ? <CreditCard size={16} /> : <Landmark size={16} />}
              </div>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>{acc.bank_name}</div>
            </div>
          )} sortable />
          <Column field="account_title" header="Account Title / No." body={acc => (
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b' }}>{acc.account_title || '—'}</div>
              {acc.account_number && acc.account_number !== 'N/A' && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>A/C: {acc.account_number}</div>
              )}
            </div>
          )} sortable />
          <Column field="opening_balance" header="Opening Bal." body={acc => (
            <div style={{ fontWeight: 700, color: '#64748b' }}>Rs. {parseFloat(acc.opening_balance || 0).toLocaleString()}</div>
          )} sortable />
          <Column header="Current Balance" body={acc => (
            <div style={{ fontWeight: 900, color: '#16a34a', fontSize: '1.1rem' }}>Rs. {acc.calculated_balance.toLocaleString()}</div>
          )} />
          <Column header="" body={acc => {
            const isAdmin = user?.role === 'admin';
            return (
              <ActionMenu
                onEdit={checkIsCash(acc) || !isAdmin ? null : () => handleEdit(acc)}
                onDelete={checkIsCash(acc) || !isAdmin ? null : () => {
                  if (window.confirm(`Are you sure you want to delete ${acc.bank_name}?`)) {
                    handleDelete(acc.id);
                  }
                }}
                bypassConfirm={true}
                extraItems={[
                  {
                    label: 'View Ledger',
                    icon: 'pi pi-book',
                    command: () => { setSelectedLedgerAccount(acc); setDateFilter('All'); setShowLedger(true); }
                  }
                ]}
              />
            );
          }} style={{ textAlign: 'center', width: '60px' }} />
        </DataTable>
      </div>

      {/* Ledger Dialog */}
      <Dialog
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '40px' }}>
            <span>{selectedLedgerAccount ? `Ledger: ${selectedLedgerAccount.bank_name}` : "Ledger"}</span>
            <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
              <Button icon="pi pi-print" label="Print" className="p-button-outlined p-button-secondary" onClick={handlePrintLedger} />
            </div>
          </div>
        }
        visible={showLedger}
        style={{ width: '85vw' }}
        onHide={() => setShowLedger(false)}
        breakpoints={{ '960px': '95vw' }}
        className="ledger-dialog"
      >
        <div className="ledger-content">
          <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <Button label="Today" className={dateFilter === 'Today' ? 'p-button-primary' : 'p-button-outlined'} onClick={() => setDateFilter('Today')} />
            <Button label="This Week" className={dateFilter === 'Week' ? 'p-button-primary' : 'p-button-outlined'} onClick={() => setDateFilter('Week')} />
            <Button label="This Month" className={dateFilter === 'Month' ? 'p-button-primary' : 'p-button-outlined'} onClick={() => setDateFilter('Month')} />
            <Button label="All Time" className={dateFilter === 'All' ? 'p-button-primary' : 'p-button-outlined'} onClick={() => setDateFilter('All')} />
          </div>

          <div style={{
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '15px'
          }}>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Opening Balance</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#475569', marginTop: '4px' }}>
                Rs. {ledgerTotals.opening.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '15px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <span style={{ color: '#166534', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Cash In (+)</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                Rs. {ledgerTotals.totalIn.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '15px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
              <span style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Cash Out (-)</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>
                Rs. {ledgerTotals.totalOut.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '15px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
              <span style={{ color: '#1e40af', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Closing Balance</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1d4ed8', marginTop: '4px' }}>
                Rs. {ledgerTotals.closing.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Print-only Header */}
          <div className="print-only" style={{ marginBottom: '20px', textAlign: 'center' }}>
            <h2 style={{ margin: 0 }}>Account Statement - {selectedLedgerAccount?.bank_name}</h2>
            <p style={{ margin: '5px 0' }}>Filter: {dateFilter} | Date: {new Date().toLocaleDateString()}</p>
            <hr />
          </div>

          <DataTable value={calculatedTransactions} paginator={!window.matchMedia('print').matches} rows={20} className="p-datatable-sm" stripedRows emptyMessage="No transactions found for this period.">
            <Column header="S.No." body={(rowData, options) => <span style={{ fontWeight: 700, color: '#64748b' }}>{options.rowIndex + 1}</span>} style={{ width: '60px' }} />
            <Column field="id" header="Bill #" body={s => (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                {s.id ? (
                  <Button
                    label={`#${s.id}`}
                    text
                    className="p-button-link p-0 font-bold"
                    onClick={() => handleViewBill(s)}
                    style={{ color: '#2563eb' }}
                  />
                ) : <span style={{ color: '#64748b' }}>—</span>}
                {s.status === 'Returned' && <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginTop: '2px' }}>FULL RETURN</span>}
                {s.status === 'Partially Returned' && <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginTop: '2px' }}>PARTIAL</span>}
              </div>
            )} sortable />
            <Column field="created_at" header="Date" body={s => new Date(s.created_at || s.purchase_date || s.date).toLocaleDateString()} sortable />
            <Column field="customer_name" header="Description" body={s => (
              <div>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>{s.customer_name}</div>
                {s.customer_phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.customer_phone}</div>}
              </div>
            )} sortable />
            <Column header="Details/Items" body={s => {
              const text = s.customer_name || '';
              return (
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  {s.isTransportFare ? (
                    <span style={{ fontWeight: 600, color: '#0369a1' }}>🚛 Transport Fare for Stock</span>
                  ) : text.startsWith('Salary:') ? (
                    <span style={{ fontWeight: 600, color: '#b45309' }}>💼 Salary Payment</span>
                  ) : text.startsWith('Rent:') ? (
                    <span style={{ fontWeight: 600, color: '#7c3aed' }}>🏠 Rent Payment</span>
                  ) : text.startsWith('Other:') ? (
                    <span style={{ fontWeight: 600, color: '#475569' }}>💸 Other Expense: {text.replace('Other: ', '')}</span>
                  ) : text.startsWith('General Expense:') ? (
                    <span style={{ fontWeight: 600, color: '#db2777' }}>💸 {text}</span>
                  ) : s.isExpense ? (
                    <span style={{ fontWeight: 600, color: '#e11d48' }}>💸 Paid to Supplier</span>
                  ) : s.isIncome ? (
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>💰 Investment Inflow</span>
                  ) : (
                    Array.isArray(s.items) ? (
                      <span style={{ fontWeight: 600, color: '#0f766e' }}>🛒 Sale: {s.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</span>
                    ) : 'Details not available'
                  )}
                </div>
              );
            }} />
            <Column header="Cash In (Debit)" body={s => {
              if (s.isExpense) return <span style={{ color: '#94a3b8' }}>—</span>;
              const amt = getTransactionAmount(s);
              return <span style={{ fontWeight: 700, color: '#16a34a' }}>+ Rs. {amt.toLocaleString()}</span>;
            }} />
            <Column header="Cash Out (Credit)" body={s => {
              if (!s.isExpense) return <span style={{ color: '#94a3b8' }}>—</span>;
              const amt = getTransactionAmount(s);
              return <span style={{ fontWeight: 700, color: '#ef4444' }}>- Rs. {amt.toLocaleString()}</span>;
            }} />
            <Column header="Balance" body={s => (
              <span style={{ fontWeight: 800, color: '#1e293b' }}>Rs. {parseFloat(s.running_balance).toLocaleString()}</span>
            )} />
          </DataTable>
        </div>
      </Dialog>

      {/* Bill Details Dialog (Professional Receipt View) */}
      <Dialog
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '40px' }}>
            <span>Bill View: #{selectedBill?.id}</span>
            <Button icon="pi pi-print" label="Print Bill" className="p-button-outlined" onClick={() => window.print()} />
          </div>
        }
        visible={showBill}
        style={{ width: '400px' }}
        onHide={() => setShowBill(false)}
        className="bill-viewer-dialog"
      >
        {selectedBill && (
          <div className="thermal-receipt" style={{ padding: '0 10px', color: '#000', fontFamily: 'monospace' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <h2 style={{ margin: '0', fontSize: '22px' }}>DATA WALEY</h2>
              {selectedBill?.sale_type === 'Retail 2' || selectedBill?.module_type === 'Retail 2' ? (
                <>
                  <h3 style={{ margin: '2px 0', fontSize: '14px', fontWeight: 'normal' }}>RETAIL 2</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px' }}>Waqar Butt: 0311-4105840</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px' }}>Mhd Aiss: 0335-1430216</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px' }}>Saifullah: 0333-4714628</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', lineHeight: '1.3' }}>
                    Ada Treadywali Stop Main Jaranwala Road,<br />
                    District Sheikupura.
                  </p>
                </>
              ) : (
                <>
                  <h3 style={{ margin: '2px 0', fontSize: '14px', fontWeight: 'normal' }}>CEMENT DEALER</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px' }}>Tariq Mehmood: 0300-4269347</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px' }}>Mian Shehroz: 0335-4294300</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px' }}>Ziaullah: 0322-4295106</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', lineHeight: '1.3' }}>
                    12-KM Main Lahore Sheikhupura Road,<br />
                    Ada Kot Abdul Malik.
                  </p>
                </>
              )}
            </div>

            {selectedBill && (selectedBill.net_amount !== undefined || Array.isArray(selectedBill.items)) ? (
              <>
                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                <h3 style={{ textAlign: 'center', margin: '5px 0', fontSize: '16px' }}>SALE INVOICE</h3>

                <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bill No</span> <span>: {selectedBill.id}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date</span> <span>: {new Date(selectedBill.created_at || selectedBill.date).toLocaleDateString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Customer</span> <span>: {selectedBill.customer_name}</span></div>
                  {selectedBill.customer_phone && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Phone</span> <span>: {selectedBill.customer_phone}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment</span> <span>: {selectedBill.payment_type}</span></div>
                </div>

                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ paddingBottom: '5px' }}>DESC</th>
                      <th style={{ paddingBottom: '5px', textAlign: 'center' }}>QTY</th>
                      <th style={{ paddingBottom: '5px', textAlign: 'right' }}>AMT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(selectedBill.items) && selectedBill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '4px 0' }}>{item.name}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{(item.price * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>BILL TOTAL</span>
                    <span>Rs. {parseFloat(selectedBill.net_amount || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>PAID NOW</span>
                    <span>Rs. {parseFloat(selectedBill.paid_amount || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>REMAINING</span>
                    <span>Rs. {parseFloat(selectedBill.balance_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
                <h3 style={{ textAlign: 'center', margin: '5px 0', fontSize: '16px' }}>TRANSACTION SLIP</h3>

                <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Slip No</span> <span>: #{selectedBill?.id || 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date</span> <span>: {new Date(selectedBill?.created_at || selectedBill?.purchase_date || selectedBill?.date).toLocaleDateString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Description</span> <span>: {selectedBill?.customer_name || 'N/A'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Payment Method</span> <span>: {selectedBill?.payment_type || selectedBill?.payment_method || 'Cash'}</span></div>
                </div>

                <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

                <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '15px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>TOTAL AMOUNT</span>
                    <span>Rs. {parseFloat(selectedBill?.amount || selectedBill?.paid_amount || 0).toLocaleString()}</span>
                  </div>
                </div>

                {(selectedBill?.notes || selectedBill?.description) && (
                  <div style={{ fontSize: '12px', background: '#f8fafc', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                    <strong>Note:</strong> {selectedBill.notes || selectedBill.description}
                  </div>
                )}
              </>
            )}

            <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>

            <div style={{ textAlign: 'center', fontSize: '12px' }}>
              <p style={{ margin: '5px 0' }}>Software by: Numan</p>
              <p style={{ margin: '0', fontWeight: 'bold' }}>THANKS FOR VISITING!</p>
            </div>
          </div>
        )}
      </Dialog>

      <style jsx="true">{`
        .bank-item-hover:hover {
          transform: translateY(-2px);
          background-color: #e2e8f0 !important;
          border-color: #cbd5e1 !important;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05) !important;
        }
      `}</style>

      {/* Modal for selecting a Bank to edit opening balance */}
      <Dialog
        header="Select Bank Account to Edit"
        visible={showBankSelectorModal}
        style={{ width: '450px', borderRadius: '16px' }}
        modal
        onHide={() => setShowBankSelectorModal(false)}
        className="premium-dialog"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
          {displayAccounts
            .filter(acc => acc.bank_name.toLowerCase() !== 'cash' && acc.bank_name.toLowerCase() !== 'cash account' && acc.module_type !== 'Admin Recipient')
            .map(acc => (
              <div
                key={acc.id}
                onClick={() => {
                  setShowBankSelectorModal(false);
                  handleEdit(acc);
                }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                }}
                className="bank-item-hover"
              >
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '1.05rem' }}>{acc.bank_name}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{acc.account_title || 'Bank Account'} - {acc.account_number}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '1rem' }}>Rs. {parseFloat(acc.calculated_balance || 0).toLocaleString()}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Current Balance</span>
                  <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>Opening: Rs. {parseFloat(acc.opening_balance || 0).toLocaleString()}</span>
                </div>
              </div>
            ))}
          {displayAccounts.filter(acc => acc.bank_name.toLowerCase() !== 'cash' && acc.bank_name.toLowerCase() !== 'cash account' && acc.module_type !== 'Admin Recipient').length === 0 && (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>No bank accounts found.</p>
          )}
        </div>
      </Dialog>

      {/* Modal for adding Bank Account */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? "Edit Bank Account" : "Add New Bank Account"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="custom-form p-fluid">
              <div className="field mb-3">
                <label className="block mb-2 font-bold">Bank Name *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon"><Landmark size={18} /></span>
                  <input type="text" required value={form.bank_name} placeholder="e.g. Meezan Bank"
                    className="p-inputtext p-component"
                    onChange={e => setForm({ ...form, bank_name: e.target.value })} />
                </div>
              </div>

              <div className="field mb-3">
                <label className="block mb-2 font-bold">Account Title</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon"><CreditCard size={18} /></span>
                  <input type="text" value={form.account_title} placeholder="e.g. Ali Traders"
                    className="p-inputtext p-component"
                    onChange={e => setForm({ ...form, account_title: e.target.value })} />
                </div>
              </div>

              <div className="field mb-3">
                <label className="block mb-2 font-bold">Account Number</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon"><Hash size={18} /></span>
                  <input type="text" value={form.account_number} placeholder="e.g. 0123456789"
                    className="p-inputtext p-component"
                    onChange={e => setForm({ ...form, account_number: e.target.value })} />
                </div>
              </div>

              {user?.role === 'admin' && (
                <div className="field mb-4">
                  <label className="block mb-2 font-bold">Opening Balance (PKR) *</label>
                  <div className="p-inputgroup">
                    <span className="p-inputgroup-addon">Rs.</span>
                    <input type="number" required value={form.opening_balance} placeholder="0.00"
                      className="p-inputtext p-component"
                      onChange={e => setForm({ ...form, opening_balance: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="flex justify-content-end gap-2">
                <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => { setShowModal(false); setEditId(null); }} className="p-button-text" />
                <Button type="submit" label={loading ? "Saving..." : (editId ? "Update Account" : "Add Bank")} icon="pi pi-check" loading={loading} />
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', borderRadius: '16px' }}>
            <div className="modal-header">
              <h3>💸 Transfer Funds (Internal)</h3>
              <button className="modal-close" onClick={() => setShowTransferModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleTransferSubmit} className="custom-form p-fluid">
              <div className="field mb-3">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Source Account (From) *</label>
                <select
                  required
                  value={transferForm.source_account}
                  className="p-inputtext p-component"
                  style={{ width: '100%', borderRadius: '8px', padding: '10px' }}
                  onChange={e => setTransferForm({ ...transferForm, source_account: e.target.value })}
                >
                  <option value="Cash">Cash Account (Rs. {totalCash.toLocaleString()})</option>
                  {displayAccounts.filter(acc => acc.module_type !== 'Admin Recipient').map(acc => {
                    if (acc.bank_name.toLowerCase() === 'cash' || acc.bank_name.toLowerCase() === 'cash account') return null;
                    const bal = paymentSummary[acc.id] || 0;
                    const digits = acc.account_number ? acc.account_number.slice(-4) : '';
                    const optionValue = `${acc.bank_name}${digits ? ` (****${digits})` : ''}`;
                    return (
                      <option key={acc.id} value={optionValue}>
                        {acc.bank_name} - {acc.account_title || 'Bank'} (Rs. {bal.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{
                background: '#eff6ff',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                marginBottom: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Available Source Balance</p>
                  <h3 style={{ margin: '3px 0 0 0', fontSize: '1.3rem', fontWeight: 800 }}>
                    Rs. {getSourceBalance(transferForm.source_account).toLocaleString()}
                  </h3>
                </div>
                <div style={{ fontSize: '1.5rem' }}>💰</div>
              </div>

              <div className="field mb-3">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Destination Account (To) *</label>
                <select
                  required
                  value={transferForm.destination_account}
                  className="p-inputtext p-component"
                  style={{ width: '100%', borderRadius: '8px', padding: '10px' }}
                  onChange={e => setTransferForm({ ...transferForm, destination_account: e.target.value })}
                >
                  <option value="">-- Select Receiving Account --</option>
                  <option value="Cash">Cash Account (Rs. {totalCash.toLocaleString()})</option>
                  {displayAccounts.filter(acc => acc.module_type !== 'Admin Recipient').map(acc => {
                    if (acc.bank_name.toLowerCase() === 'cash' || acc.bank_name.toLowerCase() === 'cash account') return null;
                    const bal = paymentSummary[acc.id] || 0;
                    const digits = acc.account_number ? acc.account_number.slice(-4) : '';
                    const optionValue = `${acc.bank_name}${digits ? ` (****${digits})` : ''}`;
                    return (
                      <option key={acc.id} value={optionValue}>
                        {acc.bank_name} - {acc.account_title || 'Bank'} (Rs. {bal.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="field mb-3">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Transfer Amount *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon">Rs.</span>
                  <input type="number" required min="1" value={transferForm.amount} placeholder="0.00"
                    className="p-inputtext p-component"
                    onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })} />
                </div>
              </div>

              <div className="field mb-4">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Note / Reference</label>
                <input type="text" value={transferForm.notes} placeholder="e.g. Deposited Cash to Bank"
                  className="p-inputtext p-component"
                  style={{ padding: '10px', borderRadius: '8px' }}
                  onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })} />
              </div>

              <div className="flex justify-content-end gap-2">
                <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => setShowTransferModal(false)} className="p-button-text" />
                <Button type="submit" label={loading ? "Transferring..." : "Confirm Transfer"} icon="pi pi-check" loading={loading} style={{ background: '#10b981', borderColor: '#10b981' }} />
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseoutModal && (
        <div className="modal-overlay" onClick={() => setShowCloseoutModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Daily Galla Closeout / Transfer to Admin</h3>
              <button className="modal-close" onClick={() => setShowCloseoutModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCloseoutSubmit} className="custom-form p-fluid">
              <div className="field mb-3">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Send From (My Account/Cash) *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon">💸</span>
                  <select
                    required
                    value={closeoutForm.payment_type}
                    className="p-inputtext p-component"
                    style={{ borderRadius: '0 8px 8px 0', padding: '10px' }}
                    onChange={e => handlePaymentTypeChange(e.target.value)}
                  >
                    <option value="Cash">Cash Account (Rs. {totalCash.toLocaleString()})</option>
                    {displayAccounts.filter(acc => acc.module_type !== 'Admin Recipient').map(acc => {
                      const cleanName = acc.bank_name.replace(' Account', '');
                      if (cleanName.toLowerCase() === 'cash') return null;
                      const bal = paymentSummary[acc.id] || 0;
                      return (
                        <option key={acc.id} value={acc.bank_name}>
                          {acc.bank_name} - {acc.account_title || 'Bank'} (Rs. {bal.toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div style={{
                background: '#f0fdf4',
                padding: '15px',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
                color: '#16a34a',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Selected Account Balance</p>
                  <h3 style={{ margin: '5px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>
                    Rs. {getSourceBalance(closeoutForm.payment_type).toLocaleString()}
                  </h3>
                </div>
                <div style={{ fontSize: '1.8rem' }}>💰</div>
              </div>

              <div className="field mb-3">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Amount Sent to Admin *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon">Rs.</span>
                  <input type="number" required value={closeoutForm.amount_sent_to_admin} placeholder="0.00"
                    className="p-inputtext p-component"
                    onChange={e => handleCloseoutFieldChange('amount_sent_to_admin', e.target.value)} />
                </div>
              </div>

              <div className="field mb-3">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Recipient Admin Bank Account *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon">🏦</span>
                  <select
                    required
                    value={closeoutForm.admin_bank_id}
                    className="p-inputtext p-component"
                    style={{ borderRadius: '0 8px 8px 0', padding: '10px' }}
                    onChange={e => setCloseoutForm(prev => ({ ...prev, admin_bank_id: e.target.value }))}
                  >
                    <option value="">-- Select Recipient Admin Account --</option>
                    {displayAccounts.filter(acc => acc.module_type === 'Admin Recipient').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.bank_name} - {acc.account_title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {displayAccounts.find(acc => acc.id === closeoutForm.admin_bank_id || String(acc.id) === String(closeoutForm.admin_bank_id)) && (() => {
                const selectedRecipientBank = displayAccounts.find(acc => acc.id === closeoutForm.admin_bank_id || String(acc.id) === String(closeoutForm.admin_bank_id));
                return (
                  <div style={{
                    background: '#f8fafc',
                    padding: '15px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '20px',
                    fontSize: '0.85rem',
                    color: '#334155'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>✅ Recipient Account Verified Details:</span>
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div><strong>Bank Name:</strong> {selectedRecipientBank.bank_name}</div>
                      <div><strong>Account Title:</strong> {selectedRecipientBank.account_title || 'N/A'}</div>
                      <div style={{ gridColumn: 'span 2' }}><strong>Account Number:</strong> <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{selectedRecipientBank.account_number || 'N/A'}</span></div>
                    </div>
                  </div>
                );
              })()}

              <div className="field mb-3">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Remaining Kept as Opening Balance *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon">Rs.</span>
                  <input type="number" required value={closeoutForm.amount_kept_as_opening} placeholder="0.00"
                    className="p-inputtext p-component"
                    onChange={e => handleCloseoutFieldChange('amount_kept_as_opening', e.target.value)} />
                </div>
                <small style={{ color: '#64748b', marginTop: '5px', display: 'block' }}>This remaining amount will be kept in your drawer for tomorrow's transactions.</small>
              </div>

              <div className="field mb-4">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Notes / Remarks</label>
                <textarea rows="2" value={closeoutForm.notes} placeholder="e.g. Cleared register after end of shift..."
                  className="p-inputtext p-component" style={{ borderRadius: '8px', padding: '10px' }}
                  onChange={e => handleCloseoutFieldChange('notes', e.target.value)} />
              </div>

              <div className="flex justify-content-end gap-2">
                <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => setShowCloseoutModal(false)} className="p-button-text" />
                <Button type="submit" label={loading ? "Submitting..." : "Submit Handover & Close Register"} icon="pi pi-check" loading={loading} className="p-button-warning" />
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdminPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowAdminPaymentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send Admin Payment to Shop</h3>
              <button className="modal-close" onClick={() => setShowAdminPaymentModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdminPaymentSubmit} className="custom-form p-fluid">
              <div className="field mb-3">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Admin Bank Account (Source) *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon">🏦</span>
                  <select
                    required
                    value={adminPaymentForm.admin_bank_id}
                    className="p-inputtext p-component"
                    style={{ borderRadius: '0 8px 8px 0', padding: '10px' }}
                    onChange={e => setAdminPaymentForm(prev => ({ ...prev, admin_bank_id: e.target.value }))}
                  >
                    <option value="">-- Select Source Admin Bank --</option>
                    {displayAccounts.filter(acc => acc.module_type === 'Admin Recipient').map(acc => {
                      const balance = getAdminBankBalance(acc);
                      return (
                        <option key={acc.id} value={acc.id}>{acc.bank_name} - {acc.account_title} (Rs. {balance.toLocaleString()})</option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {displayAccounts.find(acc => acc.id === adminPaymentForm.admin_bank_id || String(acc.id) === String(adminPaymentForm.admin_bank_id)) && (() => {
                const selectedSourceBank = displayAccounts.find(acc => acc.id === adminPaymentForm.admin_bank_id || String(acc.id) === String(adminPaymentForm.admin_bank_id));
                const balance = getAdminBankBalance(selectedSourceBank);
                return (
                  <div style={{
                    background: '#eff6ff',
                    padding: '15px',
                    borderRadius: '12px',
                    border: '1px solid #bfdbfe',
                    color: '#1e40af',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Source Bank Balance</p>
                      <h3 style={{ margin: '5px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>
                        Rs. {balance.toLocaleString()}
                      </h3>
                    </div>
                    <div style={{ fontSize: '1.8rem' }}>💳</div>
                  </div>
                );
              })()}

              <div className="field mb-3">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Receive To (My Account/Cash) *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon">💸</span>
                  <select
                    required
                    value={adminPaymentForm.payment_type}
                    className="p-inputtext p-component"
                    style={{ borderRadius: '0 8px 8px 0', padding: '10px' }}
                    onChange={e => setAdminPaymentForm(prev => ({ ...prev, payment_type: e.target.value }))}
                  >
                    <option value="Cash">Cash Account (Rs. {totalCash.toLocaleString()})</option>
                    {displayAccounts.filter(acc => acc.module_type !== 'Admin Recipient').map(acc => {
                      const cleanName = acc.bank_name.replace(' Account', '');
                      if (cleanName.toLowerCase() === 'cash') return null;
                      const bal = paymentSummary[acc.id] || 0;
                      return (
                        <option key={acc.id} value={acc.bank_name}>
                          {acc.bank_name} - {acc.account_title || 'Bank'} (Rs. {bal.toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="field mb-3">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Amount to Receive *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon">Rs.</span>
                  <input type="number" required value={adminPaymentForm.amount} placeholder="0.00"
                    className="p-inputtext p-component"
                    onChange={e => {
                      const val = e.target.value;
                      let cleanVal = String(val).replace(/^0+(?=\d)/, '');
                      setAdminPaymentForm(prev => ({ ...prev, amount: cleanVal }));
                    }} />
                </div>
              </div>

              <div className="field mb-4">
                <label className="block mb-2 font-bold" style={{ color: '#1e293b' }}>Notes / Remarks</label>
                <textarea rows="2" value={adminPaymentForm.notes} placeholder="e.g. Received for short-balance/change..."
                  className="p-inputtext p-component" style={{ borderRadius: '8px', padding: '10px' }}
                  onChange={e => setAdminPaymentForm(prev => ({ ...prev, notes: e.target.value }))} />
              </div>

              <div className="flex justify-content-end gap-2">
                <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => setShowAdminPaymentModal(false)} className="p-button-text" />
                <Button type="submit" label={loading ? "Processing..." : "Receive Admin Payment"} icon="pi pi-check" loading={loading} className="p-button-info" />
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdminBankModal && (
        <div className="modal-overlay" onClick={() => setShowAdminBankModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Dedicated Admin Recipient Bank</h3>
              <button className="modal-close" onClick={() => setShowAdminBankModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdminBankSubmit} className="custom-form p-fluid">
              <div className="field mb-3">
                <label className="block mb-2 font-bold">Bank Name *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon"><Landmark size={18} /></span>
                  <input type="text" required value={adminBankForm.bank_name} placeholder="e.g. Meezan Bank"
                    className="p-inputtext p-component"
                    onChange={e => setAdminBankForm({ ...adminBankForm, bank_name: e.target.value })} />
                </div>
              </div>

              <div className="field mb-3">
                <label className="block mb-2 font-bold">Account Title *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon"><CreditCard size={18} /></span>
                  <input type="text" required value={adminBankForm.account_title} placeholder="e.g. Admin Head Office"
                    className="p-inputtext p-component"
                    onChange={e => setAdminBankForm({ ...adminBankForm, account_title: e.target.value })} />
                </div>
              </div>

              <div className="field mb-3">
                <label className="block mb-2 font-bold">Account Number *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon"><Hash size={18} /></span>
                  <input type="text" required value={adminBankForm.account_number} placeholder="e.g. 0123456789"
                    className="p-inputtext p-component"
                    onChange={e => setAdminBankForm({ ...adminBankForm, account_number: e.target.value })} />
                </div>
              </div>

              <div className="field mb-3">
                <label className="block mb-2 font-bold">Opening Balance (Amount) *</label>
                <div className="p-inputgroup">
                  <span className="p-inputgroup-addon">Rs.</span>
                  <input type="number" required value={adminBankForm.opening_balance} placeholder="0.00"
                    className="p-inputtext p-component"
                    onChange={e => setAdminBankForm({ ...adminBankForm, opening_balance: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-content-end gap-2">
                <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => setShowAdminBankModal(false)} className="p-button-text" />
                <Button type="submit" label={loading ? "Saving..." : "Add Recipient Bank"} icon="pi pi-check" loading={loading} />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Warning Dialog */}
      <Dialog
        header={<div style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}><span style={{ fontSize: '1.2rem' }}>⚠️</span> CRITICAL WARNING</div>}
        visible={showDeleteWarning}
        style={{ width: '450px' }}
        onHide={() => setShowDeleteWarning(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '10px 0' }}>
            <Button label="Cancel" icon="pi pi-times" onClick={() => setShowDeleteWarning(false)} className="p-button-text p-button-secondary" />
            <Button label="YES, DELETE FOREVER" icon="pi pi-trash" onClick={() => {
              handleDelete(deleteTargetId);
              setShowDeleteWarning(false);
            }} className="p-button-danger" style={{ borderRadius: '12px', background: '#dc2626', borderColor: '#dc2626', padding: '10px 18px', fontWeight: 700 }} />
          </div>
        }
      >
        <div style={{ textAlign: 'center', padding: '20px 0 10px 0' }}>
          <div style={{ fontSize: '4.5rem', color: '#dc2626', marginBottom: '15px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 10px 0', fontWeight: 800, color: '#1e293b', fontSize: '1.3rem' }}>Are you absolutely sure?</h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', margin: 0, padding: '0 10px' }}>
            This action is **irreversible**. Deleting this account will permanently erase its history and ledger transactions from the database. This permission is restricted strictly to the Master Admin.
          </p>
        </div>
      </Dialog>
    </div>
  );
}