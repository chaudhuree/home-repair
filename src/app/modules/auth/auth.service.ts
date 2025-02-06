import * as bcrypt from 'bcrypt';
import crypto from 'crypto';
import httpStatus from 'http-status';
import { User, UserRole } from '@prisma/client';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { generateToken } from '../../utils/generateToken';
import prisma from '../../utils/prisma';
import { emailService } from '../../utils/email.util';

interface ILoginUser {
  email: string;
  password: string;
}

interface ILoginUserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accessToken: string;
}

interface ITokenUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const loginUser = async (payload: ILoginUser): Promise<ILoginUserResponse> => {
  const { email, password } = payload;
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: true
    }
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not exist');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Password is incorrect');
  }

  const tokenData: ITokenUser = {
    id: user.id,
    firstName: user.profile?.firstName || '',
    lastName: user.profile?.lastName || '',
    email: user.email,
    role: user.role
  };

  const accessToken = await generateToken(
    tokenData,
    config.jwt.access_secret as string,
    config.jwt.access_expires_in as string
  );

  return {
    id: user.id,
    name: user.profile?.firstName + ' ' + user.profile?.lastName,
    email: user.email,
    role: user.role,
    accessToken
  };
};

const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Generate OTP
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 300000); // 5 minutes from now

  // Type assertion to handle Prisma types
  const updateData = {
    otp,
    otpExpiry,
  } as const;

  await prisma.user.update({
    where: { email },
    data: updateData,
  });

  // Send OTP via email
  await emailService.sendEmail({
    to: email,
    subject: 'Password Reset OTP',
    body: `Your OTP for password reset is: ${otp}. This OTP will expire in 5 minutes.`,
  });

  return { 
    message: 'OTP has been sent to your email' 
  };
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string
): Promise<{ message: string }> => {
  const currentDate = new Date();
  
  const user = await prisma.user.findFirst({
    where: {
      AND: [
        { email },
        { otp },
        {
          otpExpiry: {
            gt: currentDate
          }
        }
      ]
    }
  });

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid or expired OTP');
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      otp: null,
      otpExpiry: null,
    },
  });

  return {
    message: 'Password reset successful',
  };
};

export const AuthServices = {
  loginUser,
  forgotPassword,
  resetPassword
};