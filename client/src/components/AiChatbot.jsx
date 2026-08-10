import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bot, Send, Volume2, VolumeX, X, Sparkles, ArrowRight, MessageSquare, PhoneCall
} from 'lucide-react';
import '../Styles/AiChatbot.scss';

const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://erp-backend-3rf8.onrender.com/api';

const formatItemName = (brand, name) => {
  const b = (brand || '').trim();
  const n = (name || '').trim();
  if (!b || b === 'undefined') return n;
  if (!n) return b;
  const bLower = b.toLowerCase();
  const nLower = n.toLowerCase();
  if (nLower.includes(bLower)) return n;
  if (bLower.includes(nLower)) return b;
  return `${b} ${n}`;
};

// Public Customer Support Knowledge Base for Website Visitors
const PUBLIC_CUSTOMER_KB = [
  {
    keywords: ['cement', 'brand', 'rate', 'price', 'bori', 'bag', 'dg', 'maple', 'fauji', 'flying', 'bestway', 'cherat'],
    title: '🧱 Cement Brands & Bulk Supply',
    response: 'Hum Pakistan ke tamam top cement brands ki direct factory & wholesale supply karte hain:\n• DG Khan Cement\n• Maple Leaf Cement\n• Fauji Cement\n• Bestway & Flying Cement\n\nDaily wholesale rates aur bulk site delivery ke liye niche contact number par call karein ya chat par message karein!'
  },
  {
    keywords: ['location', 'address', 'depot', 'dukan', 'branch', 'lahore', 'sharaqpur', 'kot abdul malik', 'kahan'],
    title: '📍 Humare Main Depots & Branches',
    response: 'Humare 2 main locations hain jahan se aap visit kar sakte hain ya delivery mangwa sakte hain:\n1. Main Depot: Kot Abdul Malik, Lahore Bypass.\n2. Branch Depot: Adda Tredewali, Near Sharaqpur Sharif.\n\nTiming: Mon - Sat (8:00 AM se 8:00 PM tak).'
  },
  {
    keywords: ['delivery', 'gaari', 'truck', 'trolley', 'site', 'freight', 'kharcha'],
    title: '🚚 Fast Site Delivery Service',
    response: 'Hum poore Lahore, Sharaqpur, Sheikhupura aur Punjab ke tamam ilaqon mein direct aap ki construction site par mazdoor & transport trolley ke sath fast delivery provide karte hain.'
  },
  {
    keywords: ['order', 'kharidna', 'buy', 'quote', 'rate', 'order kaise karein', 'samaan'],
    title: '🛒 Cement Order & Rate Inquiry',
    response: 'Order dene ya aaj ka rate jaan-ne ke liye:\n1. Top menu se "Request a Quote" button dabayein.\n2. Apni location aur jitni bori (bags) chahiyein likh kar bhejein.\n3. Humari sales team aap ko fawran wholesale rate SMS/Call kar de gi.'
  },
  {
    keywords: ['contact', 'phone', 'number', 'mobile', 'whatsapp', 'email', 'rabta', 'call'],
    title: '📞 Rabta & Support Team',
    response: 'Sales & Inquiries ke liye hum se direct rabta karein:\n• Phone: 0300-1234567 / 0321-7654321\n• WhatsApp: Available 24/7\n• Address: Kot Abdul Malik, Lahore'
  },
  {
    keywords: ['steel', 'sariya', 'crush', 'bajri', 'sand', 'ret', 'brick', 'eent', 'material'],
    title: '🏗️ Building Materials (Steel, Bricks, Sand)',
    response: 'Cement ke ilawa hum Awwal Eent (Bricks), Margalla/Sargodha Crush (Bajri), Chenab/Ravi Sand (Ret) aur High Grade Steel (Sariya) bhi direct site par supply karte hain.'
  }
];

// Internal ERP System Knowledge Base for Staff Portal
const INTERNAL_STAFF_KB = [
  {
    keywords: ['bill', 'billing', 'pos', 'receipt', 'sale', 'bech', 'dukan', 'invoice'],
    title: 'Sale Bill Kaise Banayein?',
    response: 'Sale Bill banane ke liye:\n1. Top menu se "Billing / POS" par jayein.\n2. Customer select karein ya Walk-in rehne dein.\n3. Products search karke cart mein add karein.\n4. Price aur Qty adjust karein.\n5. Payment Method select karke "Save & Print Receipt" daba dein.',
    actionRoute: '/billing',
    actionLabel: 'Go to Billing Page'
  },
  {
    keywords: ['customer', 'grahak', 'ledger', 'khata', 'vasooli', 'customer balance'],
    title: 'Customer Ledger & Payments',
    response: 'Customer khata dekhne ya payment receive karne ke liye:\n1. "Customers" page par jayein.\n2. Customer search karein aur "Ledger" button dabayein.\n3. Wahan har sale, payment, aur running balance ka poora record dikhayega.',
    actionRoute: '/customers',
    actionLabel: 'Go to Customers'
  },
  {
    keywords: ['supplier', 'vendor', 'purchases', 'kharidari', 'maal aana'],
    title: 'Supplier & Purchase Management',
    response: 'Suppliers ka balance aur purchase entries sambhalne ke liye:\n1. "Suppliers" page par jayein.\n2. Nayi Purchase add karne ke liye "Add Purchase" daba kar bill amount aur payment enter karein.',
    actionRoute: '/suppliers',
    actionLabel: 'Go to Suppliers'
  },
  {
    keywords: ['salary', 'staff', 'tankhwah', 'advance', 'pay', 'employee'],
    title: 'Staff Salary & Advance Payment',
    response: 'Staff ki salary ke liye "Salary" page open karein aur "Record Payment" karein.',
    actionRoute: '/salary',
    actionLabel: 'Go to Salary Page'
  },
  {
    keywords: ['expense', 'kharcha', 'office expense', 'daily expense'],
    title: 'Office & Daily Expenses Record',
    response: 'Dukan ke kharche add karne ke liye "Expenses" page par jayein.',
    actionRoute: '/expenses',
    actionLabel: 'Go to Expenses'
  },
  {
    keywords: ['profit', 'loss', 'munafa', 'report', 'hisab'],
    title: 'Profit & Loss Reports',
    response: 'Karobar ka munafa dekhne ke liye "Profit / Reports" page par jayein.',
    actionRoute: '/profit',
    actionLabel: 'Go to Profit Reports'
  }
];

const AiChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isPublicPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/portal-admin' || location.pathname === '/forgot';

  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [erpProducts, setErpProducts] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch live products from ERP database
  useEffect(() => {
    const fetchLiveProducts = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/products`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setErpProducts(data);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch live ERP products for Chatbot:', e);
      }
    };

    fetchLiveProducts();
  }, []);

  // Set initial greeting based on Public Customer vs Staff Portal
  useEffect(() => {
    if (isPublicPage) {
      setMessages([
        {
          id: 1,
          sender: 'bot',
          title: '🏗️ Data Waley Cement Support',
          text: 'Assalam-o-Alaikum! Data Waley Cement & Building Materials Customer Support mein khush-amdeed. Taza tareen cement rates, available products, bulk orders, ya delivery ke baare mein poochein!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } else {
      setMessages([
        {
          id: 1,
          sender: 'bot',
          title: '⚙️ ERP System Guide',
          text: 'Assalam-o-Alaikum! Main aapka ERP System Guide Chatbot hoon. System ke baare mein koi bhi sawaal poochein ya step-by-step madad lein!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [location.pathname, isPublicPage]);

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

    // Dynamic ERP Products Inquiry Handler
    if (isPublicPage && (query.includes('product') || query.includes('products') || query.includes('samaan') || query.includes('list') || query.includes('rates') || query.includes('rate') || query.includes('price') || query.includes('maal') || query.includes('kya kya') || query.includes('items'))) {
      if (erpProducts && erpProducts.length > 0) {
        let catalogText = "Humari Live ERP Inventory mein yeh active products & brands available hain:\n\n";
        erpProducts.slice(0, 12).forEach((p) => {
          const name = formatItemName(p.brand, p.name || p.item_name);
          const price = p.retail_price || p.sale_price || p.price || p.wholesale_price;
          const priceDisplay = price ? `Rs. ${price}` : 'Wholesale Market Rate';
          catalogText += `• ${name} — ${priceDisplay}\n`;
        });
        catalogText += "\nDirect order placement & bulk delivery ke liye Call / WhatsApp: 0300-1234567 / 0321-7654321!";

        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          title: '📦 Available Products & Wholesale Rates',
          text: catalogText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
        speakText(catalogText);
        return;
      }
    }

    const targetKb = isPublicPage ? PUBLIC_CUSTOMER_KB : INTERNAL_STAFF_KB;
    let bestMatch = null;
    let maxMatchScore = 0;

    for (const kb of targetKb) {
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
      const fallbackText = isPublicPage
        ? "Shukriya aap ke message ka! Aap humari Sales Team se direct rabta kar sakte hain (Phone: 0300-1234567 / Kot Abdul Malik, Lahore). Hum DG, Maple Leaf, Fauji Cement wholesale supply karte hain."
        : "Main aapka System Guide Chatbot hoon. Aap mujhse pucch sakte hain: 'Bill kaise banayein?', 'Customer ledger kaise dekhein?', 'Salary payment kaise karein?'.";

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
          title={isPublicPage ? "Data Waley Cement Customer Support" : "ERP System Help Chatbot"}
        >
          <div className="btn-glow" />
          <Sparkles className="sparkle-icon" size={20} />
          <span className="btn-text">{isPublicPage ? 'Customer Support' : 'ERP Chatbot'}</span>
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
                <h4>{isPublicPage ? 'Data Waley Support' : 'ERP System Chatbot'}</h4>
                <span className="status-online"><span className="dot" /> Online 24/7 Support</span>
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

          {/* Quick Shortcuts Bar for Visitors */}
          {isPublicPage ? (
            <div className="ai-quick-shortcuts">
              <button onClick={() => processQuery('Consay products aur rates hain?')}>📦 Available Products</button>
              <button onClick={() => processQuery('Cement brands aur rates batayein')}>🧱 Cement Rates</button>
              <button onClick={() => processQuery('Depot ki location kahan hai')}>📍 Branch Locations</button>
              <button onClick={() => processQuery('Sales team ka phone number')}>📞 Contact Info</button>
            </div>
          ) : (
            <div className="ai-quick-shortcuts">
              <button onClick={() => processQuery('Bill kaise banayein?')}>🧾 Sale Bill Guide</button>
              <button onClick={() => processQuery('Customer ledger dekho')}>👥 Customer Khata</button>
              <button onClick={() => processQuery('Salary entry kaise karein?')}>💵 Salary Payment</button>
              <button onClick={() => processQuery('Expenses page open karo')}>📉 Expenses</button>
            </div>
          )}

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

                  {!isPublicPage && msg.actionRoute && (
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
              placeholder={isPublicPage ? "Products, rates, ya order ke baare mein poochein..." : "System ke baare mein sawaal likhein..."}
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
