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

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

  await prisma.user.update({
    where: { email },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  });

  // Send reset token via email
  await emailService.sendPasswordResetToken(email, resetToken);

  return { 
    message: 'Password reset instructions sent to your email' 
  };
};

const resetPassword = async (
  resetToken: string, 
  newPassword: string
): Promise<{ message: string }> => {
  const user = await prisma.user.findFirst({
    where: {
      resetToken,
      resetTokenExpiry: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid or expired reset token');
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
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