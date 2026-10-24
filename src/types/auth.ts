export type UserRole = 'super_admin' | 'sub_admin' | 'manager' | 'distributor' | 'operator' | 'agent';

export interface User {
  id: number;
  uuid: string;
  role: UserRole;
  full_name: string;
  mobile: string;
  email?: string | null;
  shop_name?: string | null;
  aadhaar_number?: string | null;
  district?: string | null;
  tehsil?: string | null;
  ward_no?: string | null;
  address?: string | null;
  wallet_balance?: number;
  approval_status?: 'pending' | 'approved' | 'rejected';
  is_active?: boolean;
  is_online?: boolean;
}

export interface AuthResponse {
  status: string;
  message: string;
  token?: string;
  redirect_url?: string;
  user?: User;
  data?: any;
}
