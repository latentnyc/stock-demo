import React, { createContext, useContext, useState, useEffect } from 'react';
import { googleLogout } from '@react-oauth/google';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            console.log('AuthContext: Token changed, validating...');
            // Validate token or just decode if we trust it for UI updates
            // For now, we'll decode and set user. In a real app, verify with backend.
            try {
                const decoded = jwtDecode(token);
                console.log('AuthContext: Token decoded successfully', decoded);
                // The token payload matches what we set in backend: { id, email, name, picture }
                setUser(decoded);
            } catch (error) {
                console.error('Invalid token during decode', error);
                logout();
            }
        }
        setLoading(false);
    }, [token]);

    const login = async (googleToken) => {
        try {
            const res = await axios.post('http://localhost:3002/api/auth/google', { token: googleToken });
            const { token: sessionToken, user: userData } = res.data;

            localStorage.setItem('token', sessionToken);
            setToken(sessionToken);
            setUser(userData);
            return true;
        } catch (error) {
            console.error('Login failed', error);
            return false;
        }
    };

    const logout = () => {
        googleLogout();
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
