// src/lib/config.ts

// Pega do .env automaticamente (Expo injeta variáveis EXPO_PUBLIC_)
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('Defina EXPO_PUBLIC_API_URL no arquivo .env');
}

// Remove barra no final se houver, para evitar urls como http://...//auth
export const API_BASE_URL = apiUrl.replace(/\/+$/, '');