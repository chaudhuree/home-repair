import { PrismaClient, Prisma } from '@prisma/client';
import { IAddOn } from './addOn.interface';
import { IPaginationOptions } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';

const prisma = new PrismaClient();

export async function createAddOn(payload: IAddOn) {
  return prisma.addOn.create({ data: payload });
}

export async function getAllAddOns(options: IPaginationOptions, serviceId?: string) {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  
  // Create a filter condition based on serviceId if provided
  const whereCondition: any = {};
  if (serviceId) {
    whereCondition.serviceId = serviceId;
  }
  
  const result = await prisma.addOn.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      createdAt: 'desc',
    }
  });

  const total = await prisma.addOn.count({ where: whereCondition });

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

export async function getAddOnsByServiceId(serviceId: string, options: IPaginationOptions) {
  return getAllAddOns(options, serviceId);
}
