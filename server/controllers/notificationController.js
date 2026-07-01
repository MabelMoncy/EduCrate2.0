import Notification from '../models/Notification.js';

// @desc    Get My Notifications
// @route   GET /api/students/me/notifications
// @access  User (Student)
export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      studentFirebaseUid: req.firebaseUser.uid,
      isRead: false,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark Notification as Read
// @route   PATCH /api/students/me/notifications/:id/read
// @access  User (Student)
export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, studentFirebaseUid: req.firebaseUser.uid },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404);
      throw new Error('Notification not found');
    }

    res.json(notification);
  } catch (error) {
    next(error);
  }
};
