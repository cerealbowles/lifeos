export type ListDTO = {
  id: string;
  name: string;
  listType: string;
};

export type ListItemDTO = {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  notes: string | null;
  checked: boolean;
};
