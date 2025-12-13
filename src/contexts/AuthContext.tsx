"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { X, Check, AlertCircle, Info } from "lucide-react";

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

    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = "http://localhost:3000/api";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => {
            setToast(null);
        }, 4000);
    }, []);

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
            // Show toast instead of throwing error as requested
            showToast("Unable to verify session. Please log in again.", 'error');
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
        <AuthContext.Provider value={{ user, session, loading, login, register, logout, refreshSession, showToast }}>
            {children}
            {/* Global Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[10000] animate-slide-up">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${toast.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-700' :
                        toast.type === 'success' ? 'bg-green-50/90 border-green-100 text-green-700' :
                            'bg-blue-50/90 border-blue-100 text-blue-700'
                        }`}>
                        {toast.type === 'success' && <Check className="w-5 h-5 shrink-0" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
                        {toast.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
                        <span className="font-medium text-sm">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="p-1 hover:bg-black/5 rounded-full transition-colors ml-2">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
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
