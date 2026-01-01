import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Use localhost for iOS simulator, specific IP for Android emulator, or your domain
const baseURL = __DEV__
    ? 'http://127.0.0.1:8000/api' // Or http://10.0.2.2:8000/api for Android
    : 'https://api.storywriter.net/api';

//const baseURL = 'http://127.0.0.1:8000/api';

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