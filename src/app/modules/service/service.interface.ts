export interface IService {
  id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export type IServiceFilters = {
  searchTerm?: string;
  name?: string;
}
