import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get API base URL from centralized configuration
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://127.0.0.1:8000';
const baseURL = `${API_BASE_URL}/api`;

const client = axios.create({ baseURL });

// Interceptor to add Token to every request
client.interceptors.request.use(async (config) => {
    let token;
    if (Platform.OS === 'web') {
        token = window.localStorage.getItem('userToken'); // Simple storage for Web
    } else {
        token = await SecureStore.getItemAsync('userToken'); // Secure storage for Mobile
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default client;