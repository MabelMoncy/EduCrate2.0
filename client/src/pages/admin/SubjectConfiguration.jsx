import React from 'react';
import { AlertCircle } from 'lucide-react';
import { SEMESTER_SUBJECTS, VALID_SEMESTERS } from '../../lib/semesterData';

export default function SubjectConfiguration() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subject Configuration</h2>
        <p className="text-sm text-textMuted">
          Current subject allowlists used by upload forms and backend validation.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
        Subject editing endpoints are not implemented yet. Until that phase is built, update subject lists in both frontend and backend configuration files.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {VALID_SEMESTERS.map(semester => {
          const subjects = SEMESTER_SUBJECTS[semester] || [];
          return (
            <section key={semester} className="rounded-2xl border border-white/8 bg-surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{semester}</h3>
                <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-textMuted">
                  {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
                </span>
              </div>

              {subjects.length > 0 ? (
                <ul className="space-y-2">
                  {subjects.map(subject => (
                    <li key={subject} className="rounded-lg bg-[#111827] px-3 py-2 text-sm text-gray-300">
                      {subject}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg bg-[#111827] px-3 py-3 text-sm text-textMuted">
                  No fixed allowlist. Uploads can use custom subject names.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
