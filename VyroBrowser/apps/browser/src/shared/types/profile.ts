export interface Profile {
  id: string;
  name: string;
  avatar: string | null;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}
