import Student from '../models/Student.js';

const sanitizeString = (str, maxLen = 200) => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^><]*>/g, '').trim().substring(0, maxLen);
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const { displayName, institution } = req.body;
    
    // We expect the student to be attached by the protectStudent middleware
    if (!req.student) {
      res.status(401);
      throw new Error('Not authorized');
    }

    const updates = {};
    if (displayName !== undefined) {
      updates.displayName = sanitizeString(displayName, 100);
    }
    if (institution !== undefined) {
      updates.institution = sanitizeString(institution, 200);
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.student._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      _id: updatedStudent._id,
      email: updatedStudent.email,
      displayName: updatedStudent.displayName,
      institution: updatedStudent.institution,
      purchasedPYQs: updatedStudent.purchasedPYQs,
    });
  } catch (error) {
    next(error);
  }
};
