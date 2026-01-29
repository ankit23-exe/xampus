import mongoose from 'mongoose';
import User from './models/User.js';
import * as dotenv from 'dotenv';

dotenv.config();

const createAdminAccount = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@jssaten.ac.in' });
    
    if (existingAdmin) {
      console.log('✓ Admin account already exists');
      console.log('Email: admin@jssaten.ac.in');
      console.log('Password: admin123 (if not changed)');
    } else {
      // Create admin account
      const admin = new User({
        name: 'Admin User',
        email: 'admin@gmail.com',
        password: 'admin123',
        role: 'admin'
      });

      await admin.save();
      
      console.log('✓ Admin account created successfully!');
      console.log('Email: admin@gmail.com');
      console.log('Password: admin');
      console.log('\n⚠️  Please change the password after first login');
    }

    await mongoose.disconnect();
    console.log('\nMongoDB disconnected');
  } catch (error) {
    console.error('Error creating admin account:', error);
    process.exit(1);
  }
};

createAdminAccount();
