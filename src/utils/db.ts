import dotenv from 'dotenv';
dotenv.config();
import mongoose, {ConnectOptions} from 'mongoose';
const setupDB = async (): Promise<void | null> => {
  try {
    // Connect to MongoDB
    // 如果你正在使用 Mongoose 6.x 或更高版本，简单地移除
    // mongoose.set('useCreateIndex', true);
    await mongoose
      .connect(process.env.MONGODB_URL, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
      } as ConnectOptions)
    console.log(`MongoDB Connected`)
  } catch (error) {
    console.log(error)
  }
};

export default setupDB;
