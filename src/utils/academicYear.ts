function startYear(): number {
  const now = new Date();
  // Switch to next academic year on April 1 (month index 3) for 2-month pre-work window
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export function currentAcademicYear(): string {
  const yr = startYear();
  return `${yr}-${String(yr + 1).slice(2)}`;
}

// past + current + future — always relative to today
export function generateAcademicYears(past = 2, future = 2): string[] {
  const yr = startYear();
  return Array.from({ length: past + 1 + future }, (_, i) => {
    const y = yr - past + i;
    return `${y}-${String(y + 1).slice(2)}`;
  });
}
