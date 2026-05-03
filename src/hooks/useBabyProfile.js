import { useState, useEffect, useCallback, useRef } from 'react';
import { getBabyProfile } from '../db/recordsRepository';

function calcAge(birthday) {
  if (!birthday || typeof birthday !== 'string') return '-';
  const dateStr = birthday.trim().split(' ')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '-';
  // Use T12:00:00 to avoid timezone shift (YYYY-MM-DD alone is parsed as UTC midnight,
  // which shifts in non-UTC timezones and corrupts the date calculation)
  const birth = new Date(dateStr + 'T12:00:00');
  if (isNaN(birth.getTime())) return '-';
  const now = new Date();
  const by = birth.getFullYear();
  const bm = birth.getMonth();
  const bd = birth.getDate();
  const ny = now.getFullYear();
  const nm = now.getMonth();
  const nd = now.getDate();
  let months = (ny - by) * 12 + (nm - bm);
  if (nd < bd) months -= 1;
  if (months < 0) return '-';
  const y = Math.floor(months / 12);
  const m = months % 12;
  // Days: count actual days from birth date to today (approximate, uses day-of-month diff)
  const totalDays = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
  const daysInMonth = new Date(ny, nm, 0).getDate();
  const days = nd >= bd ? nd - bd : nd + (daysInMonth - bd);
  if (y === 0) return `${m}个月${days}天`;
  return `${y}岁${m}个月`;
}

export { calcAge };

export function useBabyProfile() {
  const [profile, setProfile] = useState(null);
  const loadingRef = useRef(false);

  const loadProfile = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const p = await getBabyProfile();
      setProfile(p);
    } catch (err) {
      console.error('Failed to load baby profile:', err);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return { profile, reloadProfile: loadProfile };
}
