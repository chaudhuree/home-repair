export type ITodoItem = {
  id?: string;
  content: string;
  isDone?: boolean;
};

export type ITodo = {
  id?: string;
  employeeId: string;
  date: Date;
  todoItems: ITodoItem[];
};

export type ITodoFilter = {
  employeeId?: string;
  date?: string;
};

export type ITodoItemUpdate = {
  isDone: boolean;
};
