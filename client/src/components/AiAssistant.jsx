import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Bot, Mic, MicOff, Send, Volume2, VolumeX, X, Sparkles,
  HelpCircle, Compass, Zap, ArrowRight, RefreshCw, MessageSquare
} from 'lucide-react';
import '../Styles/AiAssistant.scss';

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

// Direct Voice Commands Navigation Routing Matrix
const VOICE_NAVIGATION_MAP = [
  { match: ['billing', 'pos', 'bill', 'bech', 'selling'], route: '/billing', label: 'Billing' },
  { match: ['wholesale'], route: '/wholesale', label: 'Wholesale Billing' },
  { match: ['retail 1', 'retail1'], route: '/retail1', label: 'Retail 1 Billing' },
  { match: ['retail 2', 'retail2'], route: '/retail2', label: 'Retail 2 Billing' },
  { match: ['customer', 'customers', 'grahak'], route: '/customers', label: 'Customers' },
  { match: ['supplier', 'suppliers', 'vendor'], route: '/suppliers', label: 'Suppliers' },
  { match: ['staff', 'employee', 'mulazim'], route: '/staff', label: 'Staff' },
  { match: ['salary', 'tankhwah', 'pay'], route: '/salary', label: 'Salary' },
  { match: ['expense', 'expenses', 'kharcha'], route: '/expenses', label: 'Expenses' },
  { match: ['rent', 'kiraya'], route: '/rent', label: 'Rent' },
  { match: ['profit', 'report', 'reports', 'munafa'], route: '/profit', label: 'Profit Reports' },
  { match: ['stock', 'inventory', 'maal'], route: '/stock', label: 'Stock' },
  { match: ['product', 'products', 'samaan'], route: '/products', label: 'Products' },
  { match: ['account', 'accounts', 'bank', 'khata'], route: '/accounts', label: 'Accounts' },
  { match: ['labour', 'labours', 'mazdoor'], route: '/labours', label: 'Labours' },
  { match: ['transport', 'gaari', 'vehicle'], route: '/transport', label: 'Transport' },
  { match: ['investment', 'investor'], route: '/investment', label: 'Investment' }
];

const AiAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Assalam-o-Alaikum! Main aapka ERP AI Voice Assistant hoon. Aap mujhse kisi bhi cheez ke baare mein sawaal pooch sakte hain ya voice command se koi bhi page open karwa sakte hain!',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [suggestedActions, setSuggestedActions] = useState([]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'ur-PK'; // Primary Urdu / English Roman speech recognition

      rec.onstart = () => setIsListening(true);
      rec.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInputQuery(transcript);
      };

      rec.onerror = (err) => {
        console.warn('Speech recognition error:', err.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const speakText = (text) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop ongoing speech
      const cleanText = text.replace(/[\*\#\_\`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US'; // Works universally for Roman Urdu / English
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Voice Speech Recognition is not supported by your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInputQuery('');
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current.stop();
      }
    }
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

    // Check 1: Voice Navigation Intent
    let foundRoute = null;
    let foundLabel = '';
    for (const nav of VOICE_NAVIGATION_MAP) {
      if (nav.match.some(m => query.includes(m))) {
        foundRoute = nav.route;
        foundLabel = nav.label;
        break;
      }
    }

    if (foundRoute && (query.includes('open') || query.includes('go') || query.includes('jao') || query.includes('kholo') || query.includes('page') || query.includes('dekho') || query.includes('khojo'))) {
      const botText = `Ji bilkul! Main aapko ${foundLabel} page par le kar ja raha hoon.`;
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botText,
        actionRoute: foundRoute,
        actionLabel: `Open ${foundLabel}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      speakText(botText);
      setTimeout(() => {
        navigate(foundRoute);
      }, 1000);
      return;
    }

    // Check 2: Match Knowledge Base
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
      // General Fallback Guidance
      const fallbackText = "Main aapka rehnuma hoon. Aap mujhse pucch sakte hain: 'Bill kaise banayein?', 'Customer ledger kaise dekhein?', 'Salary payment kaise karein?', ya bol sakte hain 'Expenses page open karo'.";
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
    <div className="ai-assistant-wrapper">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button 
          className="ai-floating-btn" 
          onClick={() => setIsOpen(true)}
          title="Open AI ERP Assistant & Voice Control"
        >
          <div className="btn-glow" />
          <Sparkles className="sparkle-icon" size={20} />
          <span className="btn-text">AI Assistant</span>
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
                <h4>ERP AI Assistant</h4>
                <span className="status-online"><span className="dot" /> Online & Active</span>
              </div>
            </div>

            <div className="header-actions">
              <button 
                className={`icon-btn ${speechEnabled ? 'active' : ''}`} 
                onClick={() => setSpeechEnabled(!speechEnabled)}
                title={speechEnabled ? "Voice Output Active" : "Voice Output Muted"}
              >
                {speechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button 
                className="icon-btn close-btn" 
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
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

          {/* Mic Listening Indicator Bar */}
          {isListening && (
            <div className="listening-bar">
              <div className="sound-wave">
                <span /><span /><span /><span />
              </div>
              <span>Sunte hue... Bolen "Billing open karo" ya koi sawaal poocha</span>
            </div>
          )}

          {/* Input Footer Area */}
          <div className="ai-chat-footer">
            <button 
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              onClick={toggleMic}
              title={isListening ? "Stop Recording" : "Click to Speak"}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <input 
              type="text" 
              placeholder={isListening ? "Sunte hue..." : "Sawaal likhein ya voice se bolein..."}
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

export default AiAssistant;
