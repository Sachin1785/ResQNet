"use client";

import { useEffect, useState, useRef } from "react";
import { TickData } from "../lib/simulation";

export function useSimulationStream(enabled: boolean = true) {
  const [ticksHistory, setTicksHistory] = useState<TickData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setIsConnected(false);
      setError(null);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      return;
    }

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      
      const wsUrl = process.env.NEXT_PUBLIC_SIMULATION_WS_URL || "ws://127.0.0.1:8000/ws/simulate";
      try {
        const ws = new WebSocket(wsUrl);
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

        ws.onerror = () => {
          if (!isMounted) return;
          setError("Simulation server offline (ws://localhost:8000)");
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds if still enabled
          if (enabled) {
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
          }
        };
      } catch (e) {
        if (!isMounted) return;
        setError("Simulation server offline");
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled]);

  return { ticksHistory, isConnected, error };
}
