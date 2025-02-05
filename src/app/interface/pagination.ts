export type IPaginationOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type IMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
};

export type IGenericResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  meta?: IMeta;
  data: T;
};
