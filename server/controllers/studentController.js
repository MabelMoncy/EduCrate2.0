import Student from '../models/Student.js';

export const updateMyProfile = async (req, res, next) => {
  try {
    const { displayName, institution } = req.body;
    
    // We expect the student to be attached by the protectStudent middleware
    if (!req.student) {
      res.status(401);
      throw new Error('Not authorized');
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.student._id,
      { 
        ...(displayName && { displayName }), 
        ...(institution !== undefined && { institution }) 
      },
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
