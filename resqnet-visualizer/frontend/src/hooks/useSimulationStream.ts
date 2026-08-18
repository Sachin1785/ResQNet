"use client";

import { useEffect, useState, useRef } from "react";
import { TickData } from "../types/simulation";

export function useSimulationStream() {
  const [ticksHistory, setTicksHistory] = useState<TickData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      
      const ws = new WebSocket("ws://127.0.0.1:8000/ws/simulate");
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data: TickData = JSON.parse(event.data);
          setTicksHistory((prev) => {
            if (prev.length > 0 && prev[prev.length - 1].tick === data.tick) {
              return prev;
            }
            return [...prev, data];
          });
        } catch (err) {
          console.error("Failed to parse websocket message", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        // Do not set error badge permanently if we're just reconnecting
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
        // Attempt to reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { ticksHistory, isConnected, error };
}
