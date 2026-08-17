export const STAGE_GRADES: Record<string, string[]> = {
  Foundation:  ['Pre-KG', 'LKG', 'UKG', 'Nursery', 'Grade 1', 'Grade 2'],
  Preparatory: ['Grade 3', 'Grade 4', 'Grade 5'],
  Middle:      ['Grade 6', 'Grade 7', 'Grade 8'],
  Secondary:   ['Grade 9', 'Grade 10'],
};

export function deriveAHMStage(mappings: any): { stage: string; grades: string[] } | null {
  const teacherGrades: string[] = (mappings?.mappings || []).map((m: any) => m.grade as string);
  if (!teacherGrades.length) return null;

  let bestStage = '';
  let bestCount = 0;
  for (const [stage, stageGrades] of Object.entries(STAGE_GRADES)) {
    const count = teacherGrades.filter(g => stageGrades.includes(g)).length;
    if (count > bestCount) {
      bestCount = count;
      bestStage = stage;
    }
  }
  if (!bestStage) return null;
  return { stage: bestStage, grades: STAGE_GRADES[bestStage] };
}
