import mongoose, { Document } from 'mongoose';

export interface IVideo extends Document {
  id: string;
  url: string;
  name: string;
}

const videoSchema = new mongoose.Schema(
  {
    id: {
      type: String,
    },
    url: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const Video = mongoose.model<IVideo>('Video', videoSchema);

export default Video;
