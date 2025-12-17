
import { User, Job, Application } from '@/types';

// This is a placeholder API service that will be configured with actual endpoints
// All endpoints should be configurable via environment variables or config

export class ApiService {
  private baseUrl: string = '';
  private token: string | null = null;

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    console.log(`API Request: ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      throw new Error(error || 'API request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async sendVerificationCode(email: string): Promise<{ success: boolean }> {
    return this.request('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyCode(email: string, code: string): Promise<{ token: string; user: User }> {
    return this.request('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async createAccount(data: {
    email: string;
    name: string;
    campus_slug: string;
  }): Promise<{ token: string; user: User }> {
    return this.request('/auth/create-account', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Job endpoints
  async getJobs(filters?: {
    search?: string;
    status?: string;
    campus_slug?: string;
  }): Promise<Job[]> {
    const params = new URLSearchParams(filters as any);
    return this.request(`/jobs?${params}`);
  }

  async getJob(jobId: string): Promise<Job> {
    return this.request(`/jobs/${jobId}`);
  }

  async createJob(data: {
    title: string;
    description: string;
    price: { amount: number; currency: string };
    campus_slug: string;
  }): Promise<Job> {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateJob(jobId: string, data: Partial<Job>): Promise<Job> {
    return this.request(`/jobs/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeJob(jobId: string): Promise<Job> {
    return this.request(`/jobs/${jobId}/complete`, {
      method: 'POST',
    });
  }

  // Application endpoints
  async getApplications(jobId: string): Promise<Application[]> {
    return this.request(`/jobs/${jobId}/applications`);
  }

  async applyToJob(jobId: string, message: string): Promise<Application> {
    return this.request(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async acceptApplication(jobId: string, applicationId: string): Promise<Application> {
    return this.request(`/jobs/${jobId}/applications/${applicationId}/accept`, {
      method: 'POST',
    });
  }

  // User endpoints
  async getUser(userId: string): Promise<User> {
    return this.request(`/users/${userId}`);
  }

  async getUserJobs(userId: string): Promise<{ posted: Job[]; accepted: Job[] }> {
    return this.request(`/users/${userId}/jobs`);
  }

  // Payout endpoints
  async checkPayoutStatus(): Promise<{ payoutsEnabled: boolean }> {
    return this.request('/payouts/status');
  }

  // Stream chat endpoints
  async getStreamToken(): Promise<{ token: string }> {
    return this.request('/chat/token');
  }

  async getConversationId(jobId: string, userId: string): Promise<{ conversationId: string }> {
    return this.request(`/chat/conversation?jobId=${jobId}&userId=${userId}`);
  }

  // Report endpoints
  async reportIssue(data: {
    type: 'job' | 'user';
    id: string;
    reason: string;
  }): Promise<{ success: boolean }> {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiService = new ApiService();
