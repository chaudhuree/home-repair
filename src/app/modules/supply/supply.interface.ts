export interface ISupply {
  id?: string;
  name: string;
  category: string;
  measureUnit: string;
  quantity: number;
  status?: boolean;
}

export interface ISupplyAssignment {
  id?: string;
  supplyId: string;
  userId: string;
  quantity: number;
  isReturned?: boolean;
  assignDate?: Date;
  returnDate?: Date;
}

export interface ISupplyReturn {
  supplyId: string;
  userId: string;
  quantity: number;
  returnDate?: Date;
}
