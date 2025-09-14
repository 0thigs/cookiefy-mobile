import Constants from 'expo-constants';
const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
if (!extra?.apiBaseUrl) throw new Error('Defina extra.apiBaseUrl em app.json');
export const API_BASE_URL = extra.apiBaseUrl.replace(/\/+$/, '');
