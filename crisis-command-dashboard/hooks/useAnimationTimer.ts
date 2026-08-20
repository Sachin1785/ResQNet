"use client";
import { useEffect, useRef, useState } from "react";

export function useAnimationTimer(
  isPlaying: boolean,
  speed: number,
  maxTick: number,
  currentTickRef: React.MutableRefObject<number>
) {
  const [currentTick, setCurrentTick] = useState(0);
  const reqRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) return;

    const animate = (time: number) => {
      if (lastTimeRef.current !== 0) {
        const deltaMs = time - lastTimeRef.current;
        const deltaTicks = (deltaMs / 1000) * speed; 
        
        currentTickRef.current = Math.min(
          maxTick,
          currentTickRef.current + deltaTicks
        );
        setCurrentTick(currentTickRef.current);
      }
      lastTimeRef.current = time;

      if (currentTickRef.current < maxTick) {
        reqRef.current = requestAnimationFrame(animate);
      }
    };

    reqRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(reqRef.current);
      lastTimeRef.current = 0;
    };
  }, [isPlaying, speed, maxTick, currentTickRef]);

  return currentTick;
}
