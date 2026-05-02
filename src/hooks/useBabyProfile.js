import { useState, useEffect, useCallback } from 'react';
import { getBabyProfile } from '../db/recordsRepository';

function calcAge(birthday) {
  if (!birthday) return '-';
  const birth = new Date(birthday);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 0) return '-';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const days = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
  if (y === 0) return `${m}个月${days % 30}天`;
  return `${y}岁${m}个月`;
}

export { calcAge };

export function useBabyProfile() {
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      const p = await getBabyProfile();
      setProfile(p);
    } catch (err) {
      console.error('Failed to load baby profile:', err);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return { profile, reloadProfile: loadProfile };
}
