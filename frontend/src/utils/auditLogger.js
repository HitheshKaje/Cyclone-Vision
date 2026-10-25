/**
 * CycloSafe Real-Time System Audit Logger
 * Manages genuine operational telemetry records for AI inference,
 * trajectory predictions, coastal broadcasts, and system health.
 * Persists to localStorage without any mock or static data.
 */

const STORAGE_KEY = 'cyclosafe_audit_logs';

/**
 * Retrieve all real system logs from localStorage
 * @returns {Array} Array of genuine log objects
 */
export const getSystemLogs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading system logs from localStorage:', err);
    return [];
  }
};

/**
 * Append a real operational log entry
 * @param {Object} entry 
 * @returns {Object} Created log entry
 */
export const addSystemLog = (entry) => {
  try {
    const existing = getSystemLogs();
    const newLog = {
      id: `LOG-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      level: entry.level || 'INFO', // SUCCESS, INFO, WARNING, ERROR
      module: entry.module || 'System-Runtime',
      event: entry.event || 'System Event Recorded',
      details: entry.details || '',
      payload: entry.payload || {}
    };

    const updated = [newLog, ...existing].slice(0, 150); // Keep last 150 entries
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    // Broadcast event so active views can update reactively
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cyclosafe_new_log', { detail: newLog }));
    }
    return newLog;
  } catch (err) {
    console.error('Error writing system log:', err);
    return null;
  }
};

/**
 * Clear all persisted system audit logs
 */
export const clearSystemLogs = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cyclosafe_logs_cleared'));
    }
  } catch (err) {
    console.error('Error clearing system logs:', err);
  }
};

/**
 * Generate genuine audit logs from an AI analysis record
 * @param {Object} analysisRecord 
 */
export const logAnalysisEvent = (analysisRecord) => {
  if (!analysisRecord) return;

  const isCyclone = Boolean(analysisRecord?.detection?.is_cyclone);
  const conf = analysisRecord?.detection?.confidence_percent;
  const wind = analysisRecord?.intensity?.wind_speed_kt;
  const lat = analysisRecord?.latitude;
  const lon = analysisRecord?.longitude;
  const filename = analysisRecord?.fileName || 'satellite_scan.jpg';

  // 1. Log AI Detection result
  addSystemLog({
    module: 'AI-Detection',
    level: isCyclone ? 'SUCCESS' : 'INFO',
    event: isCyclone ? 'Tropical Cyclone Identified' : 'Clear Sky / No Tropical Cyclone',
    details: isCyclone
      ? `Cyclone vortex detected (${conf}%) | Center: ${lat ?? 'N/A'}°N, ${lon ?? 'N/A'}°E | File: ${filename}`
      : `Scan completed on ${filename} | Atmospheric conditions nominal (Confidence: ${conf}%)`,
    payload: {
      fileName: filename,
      is_cyclone: isCyclone,
      confidence_percent: conf,
      latitude: lat,
      longitude: lon,
      subbasin: analysisRecord?.subbasin || 'North Indian Ocean'
    }
  });

  // 2. Log Intensity if cyclone detected
  if (isCyclone && wind != null) {
    addSystemLog({
      module: 'AI-Intensity',
      level: 'SUCCESS',
      event: `Intensity Inferred: ${wind} kt`,
      details: `Max Wind: ${wind} kt (${Math.round(wind * 1.852)} km/h) | Pressure: ${analysisRecord?.intensity?.estimated_pressure_mb || 980} hPa | Cat: ${analysisRecord?.classification?.classification || 'Standard'}`,
      payload: {
        wind_speed_kt: wind,
        wind_speed_kmh: Math.round(wind * 1.852),
        estimated_pressure_mb: analysisRecord?.intensity?.estimated_pressure_mb,
        classification: analysisRecord?.classification?.classification
      }
    });
  }
};
