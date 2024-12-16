import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
  isAdmin: boolean;
  roles: any;
  email: string;
  password: string;
  phone: string;
  name: string;
  live: boolean;
  createdAt?: Date; // Time of document creation
  updatedAt?: Date; // Time the document was last updated
  // isProxy: boolean
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: false },
    name: { type: String, required: true, unique: true }, // Add unique index to
    // isProxy: { type: Boolean, required: false, default: false },

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
  },
  { timestamps: true },
);

const Proxys = mongoose.model<IUser>('Proxy', userSchema);

export default Proxys;
