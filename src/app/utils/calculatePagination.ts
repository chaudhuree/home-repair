import { IPaginationOptions } from '../interface/pagination';

interface IOptionsResult {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: string;
}

interface IOptions {
  page?: number;
  limit?: number;
  sortOrder?: string;
  sortBy?: string;
}

const calculatePagination = (options: IPaginationOptions): IOptionsResult => {
  const page: number = Number(options.page || 1);
  const limit: number = Number(options.limit || 10);
  const skip: number = (page - 1) * limit;
  const sortBy: string = options.sortBy || "createdAt";
  const sortOrder: string = options.sortOrder || "desc";

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
  };
};

export const paginationHelper = (options: IPaginationOptions, total: number) => {
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 10);
  const totalPage = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPage,
  };
};

export default calculatePagination;
