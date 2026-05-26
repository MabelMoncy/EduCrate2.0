import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured on the server');
  }

  return jwt.sign({ id: userId }, secret, { expiresIn: '1d' });
};

const loginAdmin = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    if (user.role !== 'admin') {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    const token = signToken(user._id);

    res.json({
      token,
      user: {
        id:    user._id,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export { loginAdmin };
