export const formatRelativeUpdate = (lastChanged: string, fallback = 'Actualizado recientemente') => {
  const lastDate = new Date(lastChanged);
  if (Number.isNaN(lastDate.getTime())) {
    return fallback;
  }
  const diffSeconds = Math.max(0, Math.round((Date.now() - lastDate.getTime()) / 1000));
  if (diffSeconds < 60) {
    return `Actualizado hace ${diffSeconds}s`;
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `Actualizado hace ${diffMinutes}m`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  return `Actualizado hace ${diffHours}h`;
};
