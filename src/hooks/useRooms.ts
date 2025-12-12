"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface PinnedAnswer {
    messageId: string;
    content: string;
    pinnedAt: string;
}

export interface Room {
    id: string;
    title: string;
    aiAnswers: string[];
    userAnswers: string[];
    pinAnswer: PinnedAnswer[] | null;
    created_at: string;
    updated_at?: string;
}

const API_BASE = "http://localhost:3000/api";

export function useRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch all rooms
    const fetchRooms = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/room`);
            const data = await response.json();

            if (data.success) {
                setRooms(data.rooms || []);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch rooms");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Set up realtime subscription
    useEffect(() => {
        // Initial fetch
        fetchRooms();

        // Subscribe to realtime changes on the history table
        const channel = supabase
            .channel('history-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'history'
                },
                (payload) => {
                    console.log('Realtime update:', payload);

                    if (payload.eventType === 'INSERT') {
                        setRooms(prev => [payload.new as Room, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setRooms(prev =>
                            prev.map(room =>
                                room.id === (payload.new as Room).id
                                    ? payload.new as Room
                                    : room
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setRooms(prev =>
                            prev.filter(room => room.id !== (payload.old as Room).id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchRooms]);

    // Get a single room by ID
    const getRoom = useCallback(async (id: string): Promise<Room | null> => {
        try {
            const response = await fetch(`${API_BASE}/room/${id}`);
            const data = await response.json();

            if (data.success) {
                return data.room;
            }
            return null;
        } catch (err) {
            console.error("Failed to get room:", err);
            return null;
        }
    }, []);

    // Create a new room
    const createRoom = useCallback(async (
        title: string,
        userAnswers: string[],
        aiAnswers: string[]
    ): Promise<Room | null> => {
        try {
            const response = await fetch(`${API_BASE}/room`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    userAnswers,
                    aiAnswers,
                }),
            });

            const data = await response.json();

            if (data.success) {
                return data.room;
            }
            return null;
        } catch (err) {
            console.error("Failed to create room:", err);
            return null;
        }
    }, []);

    // Update an existing room
    const updateRoom = useCallback(async (
        id: string,
        updates: {
            title?: string;
            userAnswers?: string[];
            aiAnswers?: string[];
        }
    ): Promise<Room | null> => {
        try {
            const response = await fetch(`${API_BASE}/room/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            const data = await response.json();

            if (data.success) {
                return data.room;
            }
            return null;
        } catch (err) {
            console.error("Failed to update room:", err);
            return null;
        }
    }, []);

    // Delete a room
    const deleteRoom = useCallback(async (id: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE}/room/${id}`, {
                method: 'DELETE',
            });

            const data = await response.json();
            return data.success;
        } catch (err) {
            console.error("Failed to delete room:", err);
            return false;
        }
    }, []);

    return {
        rooms,
        isLoading,
        error,
        getRoom,
        createRoom,
        updateRoom,
        deleteRoom,
        refetch: fetchRooms,
    };
}
