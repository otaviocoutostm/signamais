// API Configuration
// Em produção (Render), usa a URL fixa da API
// Em desenvolvimento, usa localhost
const DEV_API = 'http://localhost:3001';
const PROD_API = 'https://signamais-api.onrender.com';

const isBrowser = typeof window !== 'undefined';
const isDev = isBrowser && window.location.hostname === 'localhost';

export const API_URL = isDev ? DEV_API : PROD_API;
export const WS_URL = API_URL.replace('http', 'ws');
