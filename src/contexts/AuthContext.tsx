"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
    id: string;
    email: string;
    user_metadata?: {
        name?: string;
        [key: string]: any;
    };
}

interface Session {
    access_token: string;
    refresh_token: string;
    user: User;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string, name: string, role: string, metadata?: any) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = "http://localhost:3000/api";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const storedSession = localStorage.getItem('session');
            if (storedSession) {
                const parsedSession: Session = JSON.parse(storedSession);

                // Verify the token is still valid
                const response = await fetch(`${API_BASE}/auth/user`, {
                    headers: {
                        'Authorization': `Bearer ${parsedSession.access_token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setUser(data.data.user);
                        setSession(parsedSession);
                    } else {
                        // Token invalid, try to refresh
                        await refreshSession();
                    }
                } else {
                    // Token invalid, try to refresh
                    await refreshSession();
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
            // Clear invalid session
            localStorage.removeItem('session');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.success) {
                const sessionData: Session = {
                    access_token: data.data.session.access_token,
                    refresh_token: data.data.session.refresh_token,
                    user: data.data.user,
                };

                setSession(sessionData);
                setUser(data.data.user);
                localStorage.setItem('session', JSON.stringify(sessionData));

                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error: any) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const register = async (email: string, password: string, name: string, role: string, metadata?: any) => {
        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, name, role, metadata }),
            });

            const data = await response.json();

            if (data.success) {
                const sessionData: Session = {
                    access_token: data.data.session.access_token,
                    refresh_token: data.data.session.refresh_token,
                    user: data.data.user,
                };

                setSession(sessionData);
                setUser(data.data.user);
                localStorage.setItem('session', JSON.stringify(sessionData));

                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error: any) {
            console.error('Registration error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    };

    const logout = async () => {
        try {
            if (session) {
                await fetch(`${API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setSession(null);
            localStorage.removeItem('session');
        }
    };

    const refreshSession = async () => {
        try {
            const storedSession = localStorage.getItem('session');
            if (!storedSession) return;

            const parsedSession: Session = JSON.parse(storedSession);

            const response = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: parsedSession.refresh_token }),
            });

            const data = await response.json();

            if (data.success) {
                const newSessionData: Session = {
                    access_token: data.data.session.access_token,
                    refresh_token: data.data.session.refresh_token,
                    user: data.data.user,
                };

                setSession(newSessionData);
                setUser(data.data.user);
                localStorage.setItem('session', JSON.stringify(newSessionData));
            } else {
                // Refresh failed, logout
                await logout();
            }
        } catch (error) {
            console.error('Refresh session error:', error);
            await logout();
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, login, register, logout, refreshSession }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
