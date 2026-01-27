import React from "react";
import { useCountUp } from "@/hooks/use-count-up";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  startDelay?: number;
  className?: string;
  formatter?: (value: number) => string | React.ReactNode;
}

export function AnimatedNumber({ 
  value, 
  duration = 2000, 
  startDelay = 0,
  className = "",
  formatter 
}: AnimatedNumberProps) {
  const { count } = useCountUp({ 
    end: value, 
    duration, 
    startDelay,
    enabled: value > 0 
  });

  const displayValue = formatter ? formatter(count) : count;

  return <span className={className}>{displayValue}</span>;
}

