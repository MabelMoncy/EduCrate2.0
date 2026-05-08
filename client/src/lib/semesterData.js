/**
 * EduCrate — Static Semester Subject Configuration
 *
 * Add subjects for a semester here and they will automatically
 * appear as folders in the Semester page and as options in the
 * SemesterUploadModal subject dropdown.
 *
 * Subject names MUST match exactly between frontend and backend
 * (the backend validates against this same list via an allowlist).
 */

export const SEMESTER_SUBJECTS = {
  S4: [
    'Computer Organization and Architecture',
    'Operating Systems',
    'Mathematics For Information Science - 4',
    'Engineering Ethics and Sustainable Development',
    'Database Management System',
    'Cyber Ethics, Privacy and Legal Issues',
    'Operating Systems Lab',
    'DBMS Lab',
  ],
  // S1: [], S2: [], S3: [], S5: [], S6: [], S7: [], S8: []
  // Populate above when ready, following the same pattern as S4.
};

/**
 * Returns the subject list for a given semester ID (e.g. 'S4').
 * Returns an empty array if no config exists for that semester.
 */
export const getSubjectsForSemester = (semesterId) =>
  SEMESTER_SUBJECTS[semesterId] ?? [];

/**
 * All valid semester IDs used for backend validation.
 */
export const VALID_SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

/**
 * Valid resource types.
 */
export const VALID_TYPES = ['notes', 'pyq'];
