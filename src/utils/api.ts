import { SCHOOLS } from '../config/schools';

export function getAPI(): string {
  const id = localStorage.getItem('cbas_school_id');
  return SCHOOLS.find(s => s.id === id)?.api ?? SCHOOLS[0].api;
}

export function getSchoolName(): string {
  const id = localStorage.getItem('cbas_school_id');
  return SCHOOLS.find(s => s.id === id)?.name ?? SCHOOLS[0].name;
}
