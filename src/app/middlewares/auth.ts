import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import AppError from '../errors/AppError';
import prisma from '../utils/prisma';
import { verifyToken } from '../utils/verifyToken';

const auth = (...requiredRoles: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Check if authorization header exists
      const token = req.headers.authorization;
      if (!token) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'You are not authorized! Please login first.'
        );
      }

      // Extract the token from Bearer format
      const tokenWithoutBearer = token.startsWith('Bearer ')
        ? token.slice(7)
        : token;

      // Verify token
      const verifiedUser = verifyToken(
        tokenWithoutBearer,
        config.jwt.access_secret as Secret,
      );

      // Check if user exists in database
      const user = await prisma.user.findUnique({
        where: {
          id: verifiedUser.id,
        },
      });

      if (!user) {
        throw new AppError(
          httpStatus.UNAUTHORIZED,
          'User does not exist! Please login again.'
        );
      }

      // Check role authorization
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          `Only ${requiredRoles.join(', ')} can access this resource`
        );
      }

      // Set user in request object
      req.user = verifiedUser;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
