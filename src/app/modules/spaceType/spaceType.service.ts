import { PrismaClient } from '@prisma/client';
import { ISpaceType } from './spaceType.interface';
import { IPaginationOptions } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';

const prisma = new PrismaClient();

export async function createSpaceType(payload: ISpaceType) {
  return prisma.spaceType.create({ data: payload });
}

export async function getAllSpaceTypes(options: IPaginationOptions) {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const result = await prisma.spaceType.findMany({
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      createdAt: 'desc',
    },
  });

  const total = await prisma.spaceType.count();

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
}

export async function updateSpaceType(id: string, payload: ISpaceType) {
  return prisma.spaceType.update({
    where: { id },
    data: payload,
  });
}

export async function deleteSpaceType(id: string) {
  return prisma.spaceType.delete({
    where: { id },
  });
}