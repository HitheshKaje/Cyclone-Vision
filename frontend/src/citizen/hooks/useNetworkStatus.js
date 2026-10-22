import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/apiConfig';

/**
 * Hook to track both browser network connectivity and backend reachability
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isBackendReachable, setIsBackendReachable] = useState(true);
  const [lastChecked, setLastChecked] = useState(Date.now());

  const checkBackendHealth = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsBackendReachable(false);
      return false;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${baseUrl}/`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const reachable = res.ok;
      setIsBackendReachable(reachable);
      setLastChecked(Date.now());
      return reachable;
    } catch {
      setIsBackendReachable(false);
      setLastChecked(Date.now());
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkBackendHealth();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsBackendReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkBackendHealth();

    // Health check heartbeat every 20 seconds
    const interval = setInterval(checkBackendHealth, 20000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkBackendHealth]);

  return {
    isOnline,
    isBackendReachable,
    lastChecked,
    checkBackendHealth
  };
};

export default useNetworkStatus;
