import jwt from 'jsonwebtoken';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const generateRefreshToken = (id: string): string => {
  return jwt.sign({ id }, process.env.REFRESH_JWT_SECRET as string, {
    expiresIn: process.env.REFRESH_JWT_EXPIRE,
  });
};

export { generateToken, generateRefreshToken };
