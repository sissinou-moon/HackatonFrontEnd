"use client";

import { useState, useEffect, useCallback } from "react";

export interface PinnedAnswer {
    messageId: string;
    content: string;
}

export interface AIAnswerSource {
    fileName: string;
    lineNumber: number;
    text: string;
    score: number;
}

export interface AIAnswer {
    content: string;
    sources: AIAnswerSource[];
}

export interface Room {
    id: string;
    title: string;
    aiAnswers: AIAnswer[];
    userAnswers: string[];
    pinAnswer: PinnedAnswer[] | null;
    created_at: string;
    updated_at?: string;
}

const API_BASE = "http://localhost:3000/api";

// Helper function to get auth headers
const getAuthHeaders = () => {
    const sessionStr = localStorage.getItem('session');
    if (!sessionStr) {
        throw new Error('No session found. Please log in.');
    }

    const session = JSON.parse(sessionStr);
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
    };
};

export function useRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all rooms
    const fetchRooms = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE}/room`, {
                headers
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch rooms');
            }

            setRooms(data.rooms || []);
        } catch (err: any) {
            console.error("Error fetching rooms:", err);
            setError(err.message);
            setRooms([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch rooms on mount
    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    // Get a single room by ID
    const getRoom = useCallback(async (id: string): Promise<Room | null> => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE}/room/${id}`, {
                headers
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to fetch room');
            }

            return data.room;
        } catch (err: any) {
            console.error("Error fetching room:", err);
            setError(err.message);
            return null;
        }
    }, []);

    // Create a new room
    const createRoom = useCallback(async (
        title: string,
        userAnswers: string[],
        aiAnswers: AIAnswer[]
    ): Promise<Room | null> => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE}/room`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title,
                    userAnswers,
                    aiAnswers
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to create room');
            }

            // Add new room to state
            setRooms(prev => [data.room, ...prev]);
            return data.room;
        } catch (err: any) {
            console.error("Error creating room:", err);
            setError(err.message);
            return null;
        }
    }, []);

    // Update an existing room
    const updateRoom = useCallback(async (
        id: string,
        updates: {
            title?: string;
            userAnswers?: string[];
            aiAnswers?: AIAnswer[];
        }
    ): Promise<Room | null> => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE}/room/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updates)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to update room');
            }

            // Update room in state
            setRooms(prev =>
                prev.map(room => room.id === id ? data.room : room)
            );
            return data.room;
        } catch (err: any) {
            console.error("Error updating room:", err);
            setError(err.message);
            return null;
        }
    }, []);

    // Delete a room
    const deleteRoom = useCallback(async (id: string): Promise<boolean> => {
        try {
            const headers = getAuthHeaders();
            const response = await fetch(`${API_BASE}/room/${id}`, {
                method: 'DELETE',
                headers
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete room');
            }

            // Remove room from state
            setRooms(prev => prev.filter(room => room.id !== id));
            return true;
        } catch (err: any) {
            console.error("Error deleting room:", err);
            setError(err.message);
            return false;
        }
    }, []);

    return {
        rooms,
        isLoading,
        error,
        fetchRooms,
        getRoom,
        createRoom,
        updateRoom,
        deleteRoom,
    };
}
