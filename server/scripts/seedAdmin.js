import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed an admin');
  }

  await connectDB();

  const hashedPassword = await bcrypt.hash(password, 12);
  const existingAdmin = await User.findOne({ email });

  if (existingAdmin) {
    existingAdmin.password = hashedPassword;
    existingAdmin.role = 'admin';
    await existingAdmin.save();
    console.log(`Updated admin user: ${email}`);
  } else {
    await User.create({ email, password: hashedPassword, role: 'admin' });
    console.log(`Created admin user: ${email}`);
  }

  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
