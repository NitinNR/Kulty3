import User from '../models/User.js';

export const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findOne({ firebaseUid: req.user.uid });

      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userDoc = user;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Role check failed' });
    }
  };
};
