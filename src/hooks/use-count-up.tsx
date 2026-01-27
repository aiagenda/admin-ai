import { useEffect, useState, useRef } from "react";

interface UseCountUpOptions {
  end: number;
  duration?: number; // milliszekundumban, default: 2000ms
  startDelay?: number; // milliszekundumban, default: 0ms
  enabled?: boolean; // default: true
}

export function useCountUp({ 
  end, 
  duration = 2000, 
  startDelay = 0,
  enabled = true 
}: UseCountUpOptions) {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || end === 0) {
      setCount(end);
      return;
    }

    // Start delay
    const delayTimeout = setTimeout(() => {
      setIsAnimating(true);
      startTimeRef.current = Date.now();
      
      const animate = () => {
        if (!startTimeRef.current) return;
        
        const now = Date.now();
        const elapsed = now - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function: easeOutCubic (gyors indulás, lassú befejezés)
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentCount = Math.floor(easeOutCubic * end);
        
        setCount(currentCount);
        
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setCount(end);
          setIsAnimating(false);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }, startDelay);

    return () => {
      clearTimeout(delayTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [end, duration, startDelay, enabled]);

  return { count, isAnimating };
}

