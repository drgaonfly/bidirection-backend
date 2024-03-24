import mongoose, { Document } from 'mongoose';
import { ROLES } from '../constants'; // Adjust the import path as necessary

type ROLE = typeof ROLES[keyof typeof ROLES];

export interface IUser extends Document {
  email: string;
  password: string;
  phone: string;
  avatar: string;
  dateOfBirth: Date;
  verified: boolean;
  name: {
    firstName: string;
    lastName: string;
  };
  role: ROLE;
  live: boolean;
}

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: false },
  avatar: { type: String, required: false },
  dateOfBirth: { type: Date, required: false },
  verified: { type: Boolean, default: false },
  name: { 
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
  },
  role: {
    type: String,
    default: ROLES.Customer,
    enum: Object.values(ROLES),
  },
  live: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const User = mongoose.model<IUser>('User', userSchema);

export default User;
