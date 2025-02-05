import { IPaginationOptions } from '../interface/pagination';

const paginationHelper = (options: IPaginationOptions, total: number) => {
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

export default paginationHelper;
