// The mobile app called `http://${ipAddress}:8080`. On the web the backend URL
// comes from VITE_API_URL (see .env.example) and defaults to the same server.
export const ipAddress = 'www.aloca.dns-dynamic.net';

export const API_URL = (
  import.meta.env.VITE_API_URL || `http://${ipAddress}:8080`
).replace(/\/+$/, '');
