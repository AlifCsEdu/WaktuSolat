import { useState, useEffect } from "react";

/**
 * Custom React hook that returns the current time, updating it every second.
 */
export function useTime(): Date {
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return currentTime;
}
