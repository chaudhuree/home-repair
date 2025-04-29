export interface ISupplyTransaction {
  id?: string;
  supplyId: string;
  employeeId: string;
  quantity: number;
  type: 'assigned' | 'returned';
  date?: Date;
  notes?: string;
}

export interface ISupplyTransactionFilter {
  employeeId?: string;
  supplyId?: string;
  type?: 'assigned' | 'returned';
  startDate?: Date;
  endDate?: Date;
}
