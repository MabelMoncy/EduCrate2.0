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
    'GAMAT301 - Mathematics for Computer and Information Science 3 (BSC)',
    'PCCST302 - Theory of Computation (PCC)',
    'PCCST303 - Data Structures and Algorithms (PCC)',
    'PBCST304 - Object Oriented Programming (ESC)',
    'GAEST305 - Digital Electronics and Logic Design (ESC)',
    'UCHUT346 - Economics for Engineers (HSC)',
    'UCHUT347 - Engineering Ethics and Sustainable Development (HSC)',
    'PCCSL307 - Data Structures Lab (PCC)',
    'PCCSL308 - Digital Lab (PCC)',
  ],
  S4: [
    'GAMAT401 - Mathematics for Computer and Information Science 4 (BSC)',
    'PCCST402 - Database Management Systems (PCC)',
    'PCCST403 - Operating Systems (PCC)',
    'PBCST404 - Computer Organization and Architecture (ESC)',
    'PECST411 - Software Engineering (PEC)',
    'PECST412 - Pattern Recognition (PEC)',
    'PECST413 - Functional Programming (PEC)',
    'PECST414 - Coding Theory (PEC)',
    'PECST415 - VLSI Design (PEC)',
    'PECST416 - Signals and Systems (PEC)',
    'PECST417 - Soft Computing (PEC)',
    'PECST418 - Computational Geometry (PEC)',
    'PECST419 - Cyber Ethics, Privacy and Legal Issues (PEC)',
    'PECST495 - Advanced Data Structures (PEC)',
    'UCHUT347 - Engineering Ethics and Sustainable Development (HSC)',
    'PCCSL407 - Operating Systems Lab (PCC)',
    'PCCSL408 - DBMS Lab (PCC)',
  ],
  S5: [
    'PCCST501 - Computer Networks (PCC)',
    'PCCST502 - Design and Analysis of Algorithms (PCC)',
    'PCCST503 - Machine Learning (PCC)',
    'PBCST504 - Microcontrollers (ESC)',
    'PECST521 - Software Project Management (PEC)',
    'PECST522 - Artificial Intelligence (PEC)',
    'PECST523 - Data Analytics (PEC)',
    'PECST524 - Data Compression (PEC)',
    'PECST525 - Data Mining (PEC)',
    'PECST526 - Digital Signal Processing (PEC)',
    'PECST527 - Computer Graphics and Multimedia (PEC)',
    'PECST528 - Advanced Computer Architecture (PEC)',
    'PECST595 - Advanced Graph Algorithms (PEC)',
    'PCCSL507 - Networks Lab (PCC)',
    'PCCSL508 - Machine Learning Lab (PCC)',
  ],
  S6: [
    'PCCST601 - Compiler Design (PCC)',
    'PCCST602 - Advanced Computing Systems (PCC)',
    'PBCST604 - Fundamentals of Cyber Security (ESC)',
    'PECST631 - Software Testing (PEC)',
    'PECST632 - Deep Learning (PEC)',
    'PECST633 - Wireless and Mobile Computing (PEC)',
    'PECST634 - Advanced Database Systems (PEC)',
    'PECST635 - Cloud Computing (PEC)',
    'PECST636 - Digital Image Processing (PEC)',
    'PECST637 - Fundamentals of Cryptography (PEC)',
    'PECST638 - Quantum Computing (PEC)',
    'PECST639 - Randomized Algorithms (PEC)',
    'PECST695 - Mobile Application Development (PEC)',
    'OECST611 - Data Structures (OEC)',
    'OECST612 - Data Communication (OEC)',
    'OECST613 - Foundations of Cryptography (OEC)',
    'OECST614 - Machine Learning for Engineers (OEC)',
    'OECST615 - Object Oriented Programming (OEC)',
    'PCCSL607 - Systems Lab (PCC)',
  ],
  S7: [
    'PECST741 - Formal Methods in Software Engineering (PEC)',
    'PECST742 - Web Programming (PEC)',
    'PECST743 - Bioinformatics (PEC)',
    'PECST744 - Information Security (PEC)',
    'PECST745 - Computer Vision (PEC)',
    'PECST746 - Embedded Systems (PEC)',
    'PECST747 - Blockchain and Cryptocurrencies (PEC)',
    'PECST748 - Real Time Systems (PEC)',
    'PECST749 - Approximation Algorithms (PEC)',
    'PECST751 - Advanced Computer Networks (PEC)',
    'PECST752 - Responsible Artificial Intelligence (PEC)',
    'PECST753 - Fuzzy Systems (PEC)',
    'PECST753 - Game Theory and Mechanism Design (PEC)',
    'PECST754 - Digital Forensics (PEC)',
    'PECST755 - Internet of Things (PEC)',
    'PECST757 - High Performance Computing (PEC)',
    'PECST758 - Programming Languages (PEC)',
    'PECST759 - Parallel Algorithms (PEC)',
    'PECST785 - Algorithms for Data Science (PEC)',
    'PECST795 - Topics in Theoretical Computer Science (PEC)',
    'OECST721 - Cyber Security (OEC)',
    'OECST722 - Cloud Computing (OEC)',
    'OECST723 - Software Engineering (OEC)',
    'OECST724 - Computer Networks (OEC)',
    'OECST725 - Mobile Application Development (OEC)',
  ],
  S8: [
    'PECST861 - Software Architectures (PEC)',
    'PECST862 - Natural Language Processing (PEC)',
    'PECST863 - Topics in Security (PEC)',
    'PECST864 - Computational Complexity (PEC)',
    'PECST865 - Next Generation Interaction Design (PEC)',
    'PECST866 - Speech and Audio Processing (PEC)',
    'PECST867 - Storage Systems (PEC)',
    'PECST868 - Prompt Engineering (PEC)',
    'PECST869 - Computational Number Theory (PEC)',
    'OECST831 - Introduction to Algorithms (OEC)',
    'OECST832 - Web Programming (OEC)',
    'OECST833 - Software Testing (OEC)',
    'OECST834 - Internet of Things (OEC)',
    'OECST835 - Computer Graphics (OEC)',
  ],
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
