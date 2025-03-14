const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiService {
  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          throw new Error('Unauthorized');
        }
        throw new Error(await response.text());
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Device Management
  async getDevices() {
    return this.fetchWithAuth('/api/devices');
  }

  async getDevice(deviceId: string) {
    return this.fetchWithAuth(`/api/devices/${deviceId}`);
  }

  async lockDevice(deviceId: string) {
    return this.fetchWithAuth(`/api/devices/${deviceId}/lock`, {
      method: 'POST',
    });
  }

  async updateDeviceSettings(deviceId: string, settings: any) {
    return this.fetchWithAuth(`/api/devices/${deviceId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getDeviceActivities(deviceId: string) {
    return this.fetchWithAuth(`/api/devices/${deviceId}/activities`);
  }

  // User Management
  async getCurrentUser() {
    return this.fetchWithAuth('/api/users/me');
  }

  async updateUserProfile(data: any) {
    return this.fetchWithAuth('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Activity Logs
  async getActivityLogs(params: { page?: number; limit?: number } = {}) {
    const queryParams = new URLSearchParams(params as any).toString();
    return this.fetchWithAuth(`/api/activities?${queryParams}`);
  }
}

export const api = new ApiService(); 