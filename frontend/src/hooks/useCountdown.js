import { useState, useEffect } from 'react';

export function useCountdown(targetIso) {
  const [display, setDisplay] = useState('--:--');

  useEffect(() => {
    if (!targetIso) { setDisplay('--:--'); return; }

    const tick = () => {
      const remaining = new Date(targetIso).getTime() - Date.now();
      if (remaining <= 0) { setDisplay('00:00'); return; }
      const m = String(Math.floor(remaining / 60000)).padStart(2, '0');
      const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
      setDisplay(`${m}:${s}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return display;
}
