import React from 'react';
import ReactDOM from 'react-dom/client';
import "primereact/resources/themes/lara-light-blue/theme.css";     
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";                                         
import "primeflex/primeflex.css";
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { PrimeReactProvider } from 'primereact/api';

// Centralized Live API redirect and 401 response monkey-patch
const originalFetch = window.fetch;
window.fetch = async function (url, options) {
  if (typeof url === 'string' && url.includes('https://erp-backend-3rf8.onrender.com')) {
    const apiURL = process.env.REACT_APP_API_URL || 'https://erp-backend-3rf8.onrender.com';
    url = url.replace('https://erp-backend-3rf8.onrender.com', apiURL);
  }

  // Auto-inject or correct the Authorization token from sessionStorage if localStorage token is missing/null
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    options = options || {};
    if (!options.headers) {
      options.headers = {};
    }
    
    if (options.headers instanceof Headers) {
      const auth = options.headers.get('Authorization');
      if (!auth || auth === 'Bearer null' || auth === 'Bearer undefined') {
        options.headers.set('Authorization', `Bearer ${token}`);
      }
    } else if (Array.isArray(options.headers)) {
      let hasAuth = false;
      for (let i = 0; i < options.headers.length; i++) {
        if (options.headers[i][0].toLowerCase() === 'authorization') {
          const val = options.headers[i][1];
          if (val === 'Bearer null' || val === 'Bearer undefined') {
            options.headers[i][1] = `Bearer ${token}`;
          }
          hasAuth = true;
          break;
        }
      }
      if (!hasAuth) {
        options.headers.push(['Authorization', `Bearer ${token}`]);
      }
    } else if (typeof options.headers === 'object') {
      const authKey = Object.keys(options.headers).find(k => k.toLowerCase() === 'authorization');
      if (authKey) {
        const val = options.headers[authKey];
        if (!val || val === 'Bearer null' || val === 'Bearer undefined') {
          options.headers[authKey] = `Bearer ${token}`;
        }
      } else {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }

  try {
    const response = await originalFetch(url, options);
    if (response.status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return response;
  } catch (err) {
    throw err;
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PrimeReactProvider>
      <App />
    </PrimeReactProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
