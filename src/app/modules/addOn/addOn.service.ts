import { PrismaClient } from '@prisma/client';
import { IAddOn } from './addOn.interface';
import { IPaginationOptions } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';

const prisma = new PrismaClient();

export async function createAddOn(payload: IAddOn) {
  return prisma.addOn.create({ data: payload });
}

export async function getAllAddOns(options: IPaginationOptions) {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const result = await prisma.addOn.findMany({
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      createdAt: 'desc',
    },
  });

  const total = await prisma.addOn.count();

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
}

export async function updateAddOn(id: string, payload: IAddOn) {
  return prisma.addOn.update({
    where: { id },
    data: payload,
  });
}

export async function deleteAddOn(id: string) {
  return prisma.addOn.delete({
    where: { id },
  });
}
