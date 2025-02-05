export interface IService {
  id?: string;
  name: string;
  description: string;
  image: string;
}

export type IServiceFilters = {
  searchTerm?: string;
  name?: string;
}
