import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * Safely format a date.
 * @param {Date|string|number} date 
 * @param {string} formatStr 
 * @returns {string}
 */
export function formatDate(date, formatStr = 'yyyy-MM-dd') {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(parsed)) return '';
  return format(parsed, formatStr);
}

/**
 * Format a date relative to now (e.g. "3 hours ago").
 * @param {Date|string|number} date 
 * @param {object} options 
 * @returns {string}
 */
export function formatRelativeTime(date, options = { addSuffix: true }) {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : new Date(date);
  if (!isValid(parsed)) return '';
  return formatDistanceToNow(parsed, options);
}
