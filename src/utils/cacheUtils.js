const PREFIX = 'ust_bollinger_';

export function getCached(key, ttlHours) {
  try {
    const data = localStorage.getItem(PREFIX + key + '_data');
    const ts = localStorage.getItem(PREFIX + key + '_ts');
    if (!data || !ts) return null;
    const ageHours = (Date.now() - Number(ts)) / 3_600_000;
    if (ageHours > ttlHours) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setCached(key, data) {
  try {
    localStorage.setItem(PREFIX + key + '_data', JSON.stringify(data));
    localStorage.setItem(PREFIX + key + '_ts', String(Date.now()));
  } catch {
    // localStorage quota exceeded — fail silently
  }
}

export function clearCached(key) {
  localStorage.removeItem(PREFIX + key + '_data');
  localStorage.removeItem(PREFIX + key + '_ts');
}
