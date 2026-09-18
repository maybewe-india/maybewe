// ============================================================
// Solo Traveler — Dynamic Time-Based Atmospheric Theme Hook
// ============================================================
import { useMemo, useState, useEffect } from 'react';
import { TIME_THEMES } from './theme';

export function useTimeTheme() {
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    // Check every minute in case time period transitions
    const interval = setInterval(() => {
      const currentHour = new Date().getHours();
      setHour((prev) => (prev !== currentHour ? currentHour : prev));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (hour >= 5 && hour < 11) {
      return TIME_THEMES.morning;
    } else if (hour >= 11 && hour < 17) {
      return TIME_THEMES.afternoon;
    } else if (hour >= 17 && hour < 20) {
      return TIME_THEMES.sunset;
    } else {
      return TIME_THEMES.night;
    }
  }, [hour]);
}

export default useTimeTheme;
