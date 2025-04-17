import { PrismaClient } from '@prisma/client';
import { IPackageType } from './packageType.interface';
import { IPaginationOptions } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';

const prisma = new PrismaClient();

export async function createPackageType(payload: IPackageType) {
  return prisma.packageType.create({ data: payload });
}

export async function getAllPackageTypes(options: IPaginationOptions) {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const result = await prisma.packageType.findMany({
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      createdAt: 'desc',
    },
  });

  const total = await prisma.packageType.count();

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
}

export async function updatePackageType(id: string, payload: IPackageType) {
  return prisma.packageType.update({
    where: { id },
    data: payload,
  });
}

export async function deletePackageType(id: string) {
  return prisma.packageType.delete({
    where: { id },
  });
}