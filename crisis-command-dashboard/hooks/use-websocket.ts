"use client"

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

interface UseWebSocketOptions {
    autoConnect?: boolean;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const { autoConnect = true } = options;
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    // Keep latest callbacks in refs to avoid re-connecting when they change
    const optionsRef = useRef(options);
    optionsRef.current = options;

    useEffect(() => {
        // Only run on client side to prevent SSR issues
        if (typeof window === 'undefined') return;
        if (!autoConnect) return;

        // Create socket connection
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            extraHeaders: {
                "ngrok-skip-browser-warning": "true"
            },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        const socket = socketRef.current;

        // Connection events
        socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            setIsConnected(true);
            optionsRef.current.onConnect?.();
        });

        socket.on('disconnect', () => {
            console.log('❌ WebSocket disconnected');
            setIsConnected(false);
            optionsRef.current.onDisconnect?.();
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            optionsRef.current.onError?.(error);
        });

        socket.on('connection_established', (data) => {
            console.log('Connection established:', data);
        });

        // Cleanup on unmount
        return () => {
            socket.disconnect();
        };
    }, [autoConnect]); // Removed callback dependencies

    const emit = (event: string, data: any) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        } else {
            console.warn('Socket not connected, cannot emit:', event);
        }
    };

    const on = (event: string, callback: (data: any) => void) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    };

    const off = (event: string, callback?: (data: any) => void) => {
        if (socketRef.current) {
            socketRef.current.off(event, callback);
        }
    };

    const joinIncident = (incidentId: number) => {
        emit('join_incident', { incident_id: incidentId });
    };

    const leaveIncident = (incidentId: number) => {
        emit('leave_incident', { incident_id: incidentId });
    };

    const updateLocation = (personnelId: number, lat: number, lng: number) => {
        emit('location_update', { personnel_id: personnelId, lat, lng });
    };

    const updateIncident = (incidentId: number, type: string, data: any) => {
        emit('incident_update', {
            incident_id: incidentId,
            type,
            data,
            timestamp: new Date().toISOString(),
        });
    };

    const sendMessage = (incidentId: number, message: string, senderName: string) => {
        emit('new_message', {
            incident_id: incidentId,
            message,
            sender_name: senderName,
            timestamp: new Date().toISOString(),
        });
    };

    const updateStatus = (personnelId: number, status: string) => {
        emit('status_update', { personnel_id: personnelId, status });
    };

    return {
        socket: socketRef.current,
        isConnected,
        emit,
        on,
        off,
        joinIncident,
        leaveIncident,
        updateLocation,
        updateIncident,
        sendMessage,
        updateStatus,
    };
}
