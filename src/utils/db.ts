import dotenv from 'dotenv';
dotenv.config();
import mongoose, { ConnectOptions } from 'mongoose';
const setupDB = async (): Promise<void | null> => {
  try {
    // Connect to MongoDB
    // 如果你正在使用Mongoose 6.x或更高版本，简单地移除
    // mongoose.set('useCreateIndex', true);

    const options: ConnectOptions = {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    };

    if (
      process.env.NODE_ENV === 'development' &&
      process.env.MONGODB_PROXYPORT
    ) {
      options.proxyHost = '127.0.0.1';
      options.proxyPort = Number(process.env.MONGODB_PROXYPORT);
    }

    await mongoose.connect(process.env.MONGODB_URL, options);
    console.log('MongoDB Connected');
  } catch (error) {
    console.log(error);
  }
};

export default setupDB;
