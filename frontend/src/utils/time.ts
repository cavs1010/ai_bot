// Formats a Date as YYYY-MM-DD HH:MM:SS in the browser's local timezone
export function formatTimestamp(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Converts a UTC / ISO / datetime string into the local display format; "—" when there is none
export function formatToLocalDisplay(rawTimestamp: string | null): string {
  if (!rawTimestamp) return '—';
  try {
    let d: Date;
    if (rawTimestamp.includes('T') || rawTimestamp.endsWith('Z')) {
      d = new Date(rawTimestamp);
    } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(rawTimestamp)) {
      const utcDate = new Date(rawTimestamp.replace(' ', 'T') + 'Z');
      d = !isNaN(utcDate.getTime()) ? utcDate : new Date(rawTimestamp);
    } else {
      d = new Date(rawTimestamp);
    }

    if (isNaN(d.getTime())) {
      return rawTimestamp;
    }
    return formatTimestamp(d);
  } catch {
    return rawTimestamp;
  }
}
