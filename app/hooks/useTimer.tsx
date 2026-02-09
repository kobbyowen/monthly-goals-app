"use client";
import { useEffect, useRef, useState } from "react";

export default function useTimer(initial = 0) {
  const [seconds, setSeconds] = useState(initial);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (ref.current) window.clearInterval(ref.current);
      ref.current = null;
    };
  }, [running]);

  function start() {
    setRunning(true);
  }
  function stop() {
    setRunning(false);
  }
  function reset() {
    setRunning(false);
    setSeconds(0);
  }

  return { seconds, running, start, stop, reset };
}
