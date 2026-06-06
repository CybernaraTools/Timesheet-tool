/**
 * Convert minutes to hours and minutes string (e.g., 130 -> "2h 10m").
 * @param {number} minutes 
 * @returns {string}
 */
export function formatDuration(minutes) {
  const mins = Number(minutes);
  if (isNaN(mins) || mins <= 0) return '0h 0m';
  const hrs = Math.floor(mins / 60);
  const remainingMins = Math.round(mins % 60);
  return `${hrs}h ${remainingMins}m`;
}

/**
 * Convert minutes to decimal hours string (e.g., 130 -> "2.17 hrs").
 * @param {number} minutes 
 * @returns {string}
 */
export function formatDurationDecimal(minutes) {
  const mins = Number(minutes);
  if (isNaN(mins) || mins <= 0) return '0.00 hrs';
  const hrs = mins / 60;
  return `${hrs.toFixed(2)} hrs`;
}
