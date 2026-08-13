import { useState } from 'react';
import LessonPlanPage from './LessonPlanPage';
import TeachingStylePage from './TeachingStylePage';
import NcertLibraryPage from './NcertLibraryPage';
import ReflectionPage from './ReflectionPage';

interface Props {
  user: any;
  mappings?: any;
  academicYear?: string;
  role: 'teacher' | 'ahm' | 'admin';
}

const TEACHER_TABS = [
  { id: 'lesson_plans',   label: 'Lesson Plans' },
  { id: 'teaching_style', label: 'Teaching Style' },
  { id: 'reflections',    label: 'Daily Reflection' },
];

const REVIEWER_TABS = [
  { id: 'lesson_plans',   label: 'Lesson Plans' },
  { id: 'ncert_library',  label: 'NCERT Library' },
  { id: 'reflections',    label: 'Staff Reflections' },
];

export default function LPTabsPage({ user, mappings, academicYear = '', role }: Props) {
  const isTeacher = role === 'teacher';
  const tabs = isTeacher ? TEACHER_TABS : REVIEWER_TABS;
  const [activeSubTab, setActiveSubTab] = useState(tabs[0].id);

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex border-b border-gray-200 bg-white px-4 shrink-0">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px ${
              activeSubTab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === 'lesson_plans' && (
          <LessonPlanPage
            user={user}
            mappings={mappings}
            academicYear={academicYear}
            readOnly={!isTeacher}
          />
        )}
        {activeSubTab === 'teaching_style' && isTeacher && (
          <div className="h-full overflow-y-auto">
            <TeachingStylePage user={user} />
          </div>
        )}
        {activeSubTab === 'ncert_library' && !isTeacher && (
          <div className="h-full overflow-y-auto">
            <NcertLibraryPage user={user} />
          </div>
        )}
        {activeSubTab === 'reflections' && (
          <div className="h-full overflow-y-auto">
            <ReflectionPage user={user} readOnly={!isTeacher} />
          </div>
        )}
      </div>
    </div>
  );
}
