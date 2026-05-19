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
  S1: [
    'Mathematics for Information Science-1',
    'Physics for Information Science',
    'Chemistry for Information Science',
    'Engineering Graphics and Computer Aided Drawing',
    'Introduction to Electrical & Electronics Engineering',
    'Algorithmic Thinking with Python',
    'Health and Wellness',
    'Life Skills and Professional Communication',
    'Skill Enhancement Course: Digital 101 (NASSCOM)',
    'Basic Electrical and Electronics Engineering Workshop',
  ],
  S2: [
    'Mathematics for Information Science-2',
    'Physics for Information Science',
    'Chemistry for Information Science',
    'Foundations of Computing',
    'Programming in C',
    'Discrete Mathematics',
    'Engineering Entrepreneurship & IPR',
    'Health and Wellness',
    'Life Skills and Professional Communication',
    'Skill Enhancement Course: Digital 101 (NASSCOM)',
    'IT Workshop',
  ],
  S3: [
    'Mathematics for Information Science-3',
    'Theory of Computation',
    'Data Structures and Algorithms',
    'Object Oriented Programming',
    'Digital Electronics & Logic Design',
    'Economics for Engineers',
    'Engineering Ethics and Sustainable Development',
  ],
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
  // Keep S5-S8 open for now. The upload UI allows a custom subject until
  // the official curriculum is added here.
  S5: [],
  S6: [],
  S7: [],
  S8: [],
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
