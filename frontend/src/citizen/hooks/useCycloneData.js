import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLiveCyclones } from '../services/citizenApi';
import { 
  cacheCyclones, 
  getCachedCyclones, 
  evaluateFreshness, 
  DATA_FRESHNESS 
} from '../services/cycloneCache';

/**
 * Hook to manage live cyclone feed with automatic IndexedDB caching and offline fallback
 */
export const useCycloneData = () => {
  const [cyclones, setCyclones] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [freshness, setFreshness] = useState({
    status: DATA_FRESHNESS.UNAVAILABLE,
    label: 'Unavailable',
    ageMinutes: null,
    message: 'Loading...'
  });

  const isMountedRef = useRef(true);

  const loadData = useCallback(async (isUserRefresh = false) => {
    if (isUserRefresh) setLoading(true);

    try {
      // 1. Try to fetch live data from backend
      const result = await fetchLiveCyclones();

      if (!isMountedRef.current) return;

      if (result.success && result.data && result.data.status !== 'error') {
        const liveData = result.data;
        const liveCyclones = liveData.cyclones || [];

        setCyclones(liveCyclones);
        setMetadata({
          updated_at: liveData.updated_at,
          source: liveData.source || 'GDACS',
          cached_at: null
        });
        setIsCached(false);
        setError(null);

        // Update IndexedDB cache in background
        cacheCyclones(liveData);

        // Freshness: Live
        setFreshness(evaluateFreshness(liveData.updated_at, true));
      } else {
        // Backend returned error or was unreachable: fall back to IndexedDB
        console.info('[useCycloneData] Live fetch failed, retrieving from IndexedDB cache...');
        const cached = await getCachedCyclones();

        if (!isMountedRef.current) return;

        if (cached && cached.cyclones && cached.cyclones.length >= 0) {
          setCyclones(cached.cyclones);
          setMetadata({
            updated_at: cached.updated_at,
            source: cached.source,
            cached_at: cached.cached_at
          });
          setIsCached(true);
          setError(result.error || 'Live connection unavailable');
          
          // Evaluate freshness of the cached record
          setFreshness(evaluateFreshness(cached.updated_at || cached.cached_at, false));
        } else {
          // No cache available
          setCyclones([]);
          setMetadata(null);
          setIsCached(false);
          setError(result.error || 'No live or cached cyclone data available');
          setFreshness({
            status: DATA_FRESHNESS.UNAVAILABLE,
            label: 'Unavailable',
            ageMinutes: null,
            message: 'No cyclone observation records available.'
          });
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      // Try IndexedDB on exception
      const cached = await getCachedCyclones();
      if (cached) {
        setCyclones(cached.cyclones || []);
        setMetadata({
          updated_at: cached.updated_at,
          source: cached.source,
          cached_at: cached.cached_at
        });
        setIsCached(true);
        setError(err.message);
        setFreshness(evaluateFreshness(cached.updated_at || cached.cached_at, false));
      } else {
        setCyclones([]);
        setError(err.message);
        setFreshness({
          status: DATA_FRESHNESS.UNAVAILABLE,
          label: 'Unavailable',
          ageMinutes: null,
          message: 'Unable to load cyclone data.'
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    // Poll every 30 seconds for live updates
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [loadData]);

  return {
    cyclones,
    metadata,
    loading,
    error,
    isCached,
    freshness,
    refresh: () => loadData(true)
  };
};

export default useCycloneData;
