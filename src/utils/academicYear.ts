export function currentAcademicYear(): string {
  const now = new Date();
  const yr = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${yr}-${String(yr + 1).slice(2)}`;
}

export function generateAcademicYears(): string[] {
  const now = new Date();
  const yr = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 5 }, (_, i) => {
    const y = yr - 3 + i;
    return `${y}-${String(y + 1).slice(2)}`;
  });
}
