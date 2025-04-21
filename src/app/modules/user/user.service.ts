import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { IPaginationOptions, IGenericResponse } from '../../interface/pagination';
import { UserRole } from '@prisma/client';
import { PaymentService } from '../payment/payment.service';

interface UserWithOptionalPassword extends Omit<User, 'password'> {
  password?: string;
}

interface IUserFilters {
  searchTerm?: string;
  [key: string]: any;
}

const calculatePagination = (options: IPaginationOptions) => {
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 10);
  const skip = (page - 1) * limit;
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';
  return { page, limit, skip, sortBy, sortOrder };
};

const registerUserIntoDB = async (payload: any) => {
  const hashedPassword: string = await bcrypt.hash(payload.password, 12);

  // check if user exists
  const isUserExists = await prisma.user.findUnique({
    where: { email: payload.email }
  });
  if (isUserExists) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User already exists');
  }

  // Create Stripe customer
  const stripeCustomer = await PaymentService.createStripeCustomer(
    payload.email,
    `${payload.firstName} ${payload.lastName}`
  );

  const userData: Prisma.UserCreateInput = {
    name: `${payload.firstName} ${payload.lastName}`,
    email: payload.email,
    password: hashedPassword,
    role: 'user',
    stripeCustomerId: stripeCustomer.id,
    profile: {
      create: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        contactNo: payload.contactNo || null,
        profileImg: payload.profileImg || "https://nyc3.digitaloceanspaces.com/smtech-space/files/219b517a-5d6c-4846-a33e-b94aedb2dfd2.png",
        bio: payload.bio || null
      }
    }
  };

  const result = await prisma.user.create({
    data: userData,
    include: {
      profile: true
    }
  });

  const userWithOptionalPassword = result as UserWithOptionalPassword;
  delete userWithOptionalPassword.password;

  return userWithOptionalPassword;
};

const getAllUsersFromDB = async (
  filters: IUserFilters,
  options: IPaginationOptions
): Promise<IGenericResponse<Omit<User, 'password'>[]>> => {
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const andConditions: Prisma.UserWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          email: {
            contains: searchTerm,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
        {
          name: {
            contains: searchTerm,
            mode: 'insensitive' as Prisma.QueryMode,
          }
        }
      ],
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.entries(filterData).map(([key, value]) => ({
        [key]: {
          equals: value,
        },
      })),
    });
  }

  const whereConditions: Prisma.UserWhereInput = 
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.user.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      otp: true,
      otpExpiry: true,
      stripeCustomerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });

  const totalPage = Math.ceil(total / limit);

  return {
    success: true,
    statusCode: 200,
    message: 'Users retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    data: result,
  };
};

const getMyProfileFromDB = async (id: string) => {
  const result = await prisma.user.findFirst({
    where: {
      id: id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          contactNo: true,
          address: true,
          bio: true,
          profileImg: true,
        }
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

const getUserDetailsFromDB = async (id: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
};

const updateMyProfileIntoDB = async (id: string, payload: any) => {
  const { firstName, lastName, ...profileData } = payload;

  // update user data with profile
  const result = await prisma.user.update({
    where: {
      id,
      role: 'user',
    },
    data: {
      name: `${firstName} ${lastName}`,
      profile: {
        update: {
          firstName,
          lastName,
          ...profileData
        }
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profile: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

const updateUserStatusIntoDB = async (id: string, payload: { role: UserRole }) => {
  // Validate if the user exists
  const existingUser = await prisma.user.findUnique({
    where: { id }
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Validate the role
  if (!Object.values(UserRole).includes(payload.role)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Invalid role. Role must be one of: ' + Object.values(UserRole).join(', ')
    );
  }

  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      role: payload.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

const changePassword = async (user: any, payload: any) => {
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });

  // Ensure both current and new passwords are provided
  if (!payload.oldPassword || !payload.newPassword) {
    throw new Error('Current and new passwords are required');
  }

  const isCorrectPassword: boolean = await bcrypt.compare(
    payload.oldPassword, 
    userData.password || '' 
  );

  if (!isCorrectPassword) {
    throw new Error('Current password is incorrect');
  }

  const hashedPassword: string = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: {
      id: userData.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  return {
    message: 'Password changed successfully!',
  };
};

const getAllEmployees = async (
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<User[]>> => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = paginationOptions;

  const skip = (page - 1) * limit;

  const employees = await prisma.user.findMany({
    where: {
      role: 'employee'
    },
    include: {
      profile: true
    },
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  const total = await prisma.user.count({
    where: {
      role: 'employee'
    }
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Employees retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: employees,
  };
};

export const UserServices = {
  registerUserIntoDB,
  getAllUsersFromDB,
  getMyProfileFromDB,
  getUserDetailsFromDB,
  updateMyProfileIntoDB,
  updateUserStatusIntoDB,
  changePassword,
  getAllEmployees,
};
