import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Send, Volume2, VolumeX, X, Sparkles, ArrowRight
} from 'lucide-react';
import '../Styles/AiChatbot.scss';

// Comprehensive ERP Knowledge Base in Roman Urdu & English
const KNOWLEDGE_BASE = [
  {
    keywords: ['bill', 'billing', 'pos', 'receipt', 'sale', 'bech', 'dukan', 'invoice'],
    title: 'Sale Bill Kaise Banayein?',
    response: 'Sale Bill banane ke liye:\n1. Top menu se "Billing / POS" par jayein.\n2. Customer select karein ya Walk-in rehne dein.\n3. Products search karke cart mein add karein.\n4. Price aur Qty adjust karein.\n5. Payment Method (Cash/Bank) select karke "Save & Print Receipt" daba dein.',
    actionRoute: '/billing',
    actionLabel: 'Go to Billing Page'
  },
  {
    keywords: ['customer', 'grahak', 'ledger', 'khata', 'vasooli', 'customer balance'],
    title: 'Customer Ledger & Payments',
    response: 'Customer khata dekhne ya payment receive karne ke liye:\n1. "Customers" page par jayein.\n2. Customer search karein aur "Ledger" button dabayein.\n3. Wahan har sale, payment, aur running balance ka poora record dikhayega.\n4. "Receive Payment" se payment record kar sakte hain.',
    actionRoute: '/customers',
    actionLabel: 'Go to Customers'
  },
  {
    keywords: ['supplier', 'vendor', 'purchases', 'kharidari', 'maal aana'],
    title: 'Supplier & Purchase Management',
    response: 'Suppliers ka balance aur purchase entries sambhalne ke liye:\n1. "Suppliers" page par jayein.\n2. Naya Supplier add karein ya list mein se select karein.\n3. Nayi Purchase add karne ke liye "Add Purchase" daba kar bill amount, gatepass, aur payment enter karein.',
    actionRoute: '/suppliers',
    actionLabel: 'Go to Suppliers'
  },
  {
    keywords: ['salary', 'staff', 'tankhwah', 'advance', 'pay', 'employee'],
    title: 'Staff Salary & Advance Payment',
    response: 'Staff ki salary aur advance deductions ke liye:\n1. "Salary" page open karein.\n2. Staff member select karke "Record Payment" karein.\n3. Agar pichla advance deduct karna ho toh active deduction select karein.\n4. System auto-calculate karke receipt generate kar dega.',
    actionRoute: '/salary',
    actionLabel: 'Go to Salary Page'
  },
  {
    keywords: ['expense', 'kharcha', 'office expense', 'daily expense', 'paisa gaya'],
    title: 'Office & Daily Expenses Record',
    response: 'Dukan ke kharche add karne ke liye:\n1. "Expenses" ya "Other Expenses" page par jayein.\n2. Expense category (Office, Tea, Fuel, Utility) choose karein.\n3. Amount aur payment type (Cash/Bank) dal kar save karein.',
    actionRoute: '/expenses',
    actionLabel: 'Go to Expenses'
  },
  {
    keywords: ['rent', 'kiraya', 'dukhan kiraya', 'property'],
    title: 'Rent & Property Payments',
    response: 'Shop / Property ka Rent record karne ke liye:\n1. "Rent" page par jayein.\n2. Property/Shop name select karein, rent month choose karein.\n3. Paid amount aur payment method enter karke submit kar dein.',
    actionRoute: '/rent',
    actionLabel: 'Go to Rent Page'
  },
  {
    keywords: ['profit', 'loss', 'munafa', 'report', 'income', 'hisab'],
    title: 'Profit & Loss Reports',
    response: 'Karobar ka munafa aur reports dekhne ke liye:\n1. "Profit / Reports" page par jayein.\n2. Specific Date Range (Today, This Month, Custom) choose karein.\n3. Total Sales, Cost of Goods, Expenses, aur Net Profit auto-calculate ho kar samne aa jayega.',
    actionRoute: '/profit',
    actionLabel: 'Go to Profit Reports'
  },
  {
    keywords: ['stock', 'inventory', 'product', 'rate', 'maal', 'cement', 'steel'],
    title: 'Stock & Product Rates',
    response: 'Stock aur Product rates manage karne ke liye:\n1. "Stock" ya "Products" page open karein.\n2. Naye products add karein, minimum stock set karein, aur cost/retail rates update karein.',
    actionRoute: '/stock',
    actionLabel: 'Go to Stock'
  },
  {
    keywords: ['account', 'bank', 'cash', 'closing', 'dukan balance'],
    title: 'Bank Accounts & Cash Balance',
    response: 'Dukan ke Cash aur Bank Accounts ka balance check karne ke liye:\n1. "Accounts" page par jayein.\n2. Har Bank Account aur Cash in Hand ka real-time balance check karein aur transfer entries karein.',
    actionRoute: '/accounts',
    actionLabel: 'Go to Accounts'
  }
];

const AiChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Assalam-o-Alaikum! Main aapka ERP System Guide Chatbot hoon. System ke baare mein koi bhi sawaal poochein ya step-by-step madad lein!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [speechEnabled, setSpeechEnabled] = useState(false);

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const speakText = (text) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[\*\#\_\`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  const processQuery = (rawQuery) => {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return;

    // Add User Message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: rawQuery,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');

    // Match Knowledge Base
    let bestMatch = null;
    let maxMatchScore = 0;

    for (const kb of KNOWLEDGE_BASE) {
      let score = 0;
      for (const kw of kb.keywords) {
        if (query.includes(kw)) score += 2;
      }
      if (score > maxMatchScore) {
        maxMatchScore = score;
        bestMatch = kb;
      }
    }

    if (bestMatch && maxMatchScore > 0) {
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        title: bestMatch.title,
        text: bestMatch.response,
        actionRoute: bestMatch.actionRoute,
        actionLabel: bestMatch.actionLabel,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      speakText(bestMatch.response);
    } else {
      const fallbackText = "Main aapka System Guide Chatbot hoon. Aap mujhse pucch sakte hain: 'Bill kaise banayein?', 'Customer ledger kaise dekhein?', 'Salary payment kaise karein?', ya koi bhi help le sakte hain.";
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: fallbackText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      speakText(fallbackText);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processQuery(inputQuery);
    }
  };

  return (
    <div className="ai-chatbot-wrapper">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button 
          className="ai-floating-btn" 
          onClick={() => setIsOpen(true)}
          title="Open ERP System Help Chatbot"
        >
          <div className="btn-glow" />
          <Sparkles className="sparkle-icon" size={20} />
          <span className="btn-text">ERP Chatbot</span>
          <div className="pulse-badge" />
        </button>
      )}

      {/* Main Drawer Modal */}
      {isOpen && (
        <div className="ai-chat-drawer">
          {/* Drawer Header */}
          <div className="ai-drawer-header">
            <div className="header-left">
              <div className="ai-avatar">
                <Bot size={22} />
              </div>
              <div className="header-info">
                <h4>ERP System Chatbot</h4>
                <span className="status-online"><span className="dot" /> Online & Ready to Help</span>
              </div>
            </div>

            <div className="header-actions">
              <button 
                className={`icon-btn ${speechEnabled ? 'active' : ''}`} 
                onClick={() => setSpeechEnabled(!speechEnabled)}
                title={speechEnabled ? "Voice Read-Aloud Active" : "Voice Read-Aloud Muted"}
              >
                {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button 
                className="icon-btn close-btn" 
                onClick={() => setIsOpen(false)}
                title="Close Chatbot"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="ai-quick-shortcuts">
            <button onClick={() => processQuery('Bill kaise banayein?')}>🧾 Sale Bill Guide</button>
            <button onClick={() => processQuery('Customer ledger dekho')}>👥 Customer Khata</button>
            <button onClick={() => processQuery('Salary entry kaise karein?')}>💵 Salary Payment</button>
            <button onClick={() => processQuery('Expenses page open karo')}>📉 Expenses</button>
          </div>

          {/* Chat Message History Area */}
          <div className="ai-chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                {msg.sender === 'bot' && (
                  <div className="bot-icon">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className="bubble-content">
                  {msg.title && <div className="msg-title">{msg.title}</div>}
                  <div className="msg-text">{msg.text}</div>

                  {msg.actionRoute && (
                    <button 
                      className="msg-action-btn"
                      onClick={() => {
                        navigate(msg.actionRoute);
                        setIsOpen(false);
                      }}
                    >
                      {msg.actionLabel || 'Open Page'} <ArrowRight size={14} />
                    </button>
                  )}

                  <span className="msg-time">{msg.time}</span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer Area */}
          <div className="ai-chat-footer">
            <input 
              type="text" 
              placeholder="System ke baare mein sawaal likhein..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button 
              className="send-btn" 
              onClick={() => processQuery(inputQuery)}
              disabled={!inputQuery.trim()}
              title="Send Message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiChatbot;
