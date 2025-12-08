// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import client from '../api/client'; // Import your axios client
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is already logged in on app launch
    useEffect(() => {
        const loadUser = async () => {
            let token;
            if (Platform.OS === 'web') token = localStorage.getItem('userToken');
            else token = await SecureStore.getItemAsync('userToken');

            if (token) {
                try {
                    // Verify token is still valid by fetching user
                    const { data } = await client.get('/user');
                    setUser(data);
                } catch (e) {
                    // Token invalid/expired
                    logout();
                }
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const login = async (email, name, password) => {
        const device_name = Platform.OS === 'web' ? 'web' : 'mobile';
        const { data } = await client.post('/login', { email, name, password, device_name });

        // Save Token
        if (Platform.OS === 'web') localStorage.setItem('userToken', data.token);
        else await SecureStore.setItemAsync('userToken', data.token);

        setUser(data.user);
    };

    const logout = async () => {
        if (Platform.OS === 'web') localStorage.removeItem('userToken');
        else await SecureStore.deleteItemAsync('userToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);