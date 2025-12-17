
export interface User {
  id: string;
  username: string;
  email: string;
  campus_slug: string;
  payoutsEnabled: boolean;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  price: {
    amount: number;
    currency: string;
  };
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  campus_slug: string;
  posted_by: {
    id: string;
    username: string;
    email: string;
  };
  assigned_to?: {
    id: string;
    username: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  user_id: string;
  username: string;
  email: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';
