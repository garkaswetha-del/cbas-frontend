export const SCHOOLS = [
  {
    id: 'nanjangudu',
    name: 'Wisdom School, Nanjangudu',
    location: 'Nanjangudu',
    api: 'https://cbas-backend-production.up.railway.app',
  },
  {
    id: 'krnagar',
    name: 'Wisdom School, KR Nagar',
    location: 'KR Nagar',
    api: 'https://heartfelt-friendship-production.up.railway.app',
  },
] as const;

export type School = typeof SCHOOLS[number];
