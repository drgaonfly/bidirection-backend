import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
  isAdmin: boolean;
  roles: any;
  email: string;
  password: string;
  name: string;
  createdAt?: Date; // Time of document creation
  updatedAt?: Date; // Time the document was last updated
  topic: mongoose.Types.ObjectId;
  live: boolean;
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: false },
    live: {
      type: Boolean,
      default: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role', // Reference the Role model
      },
    ],
    topics: [
      {
        topic: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Topic',
        },
        status: {
          type: String,
          enum: ['pending', 'success', 'fail'],
          default: 'pending',
        },
      },
    ],
  },
  { timestamps: true },
);

const User = mongoose.model<IUser>('User', userSchema);

export default User;
