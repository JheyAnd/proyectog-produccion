import apiClient from './client';
import { UserRole } from '../../stores/authStore';

// User Management APIs
export const listUsersAPI = async () => {
  const response = await apiClient.get('/auth/users');
  return response.data;
};

export const createUserAPI = async (data: any) => {
  const response = await apiClient.post('/auth/users', data);
  return response.data;
};

export const updateUserAPI = async (userId: string, data: any) => {
  const response = await apiClient.put(`/auth/users/${userId}`, data);
  return response.data;
};

export const deleteUserAPI = async (userId: string) => {
  const response = await apiClient.delete(`/auth/users/${userId}`);
  return response.data;
};

export const resetPasswordAPI = async (userId: string, data: any) => {
  const response = await apiClient.post(`/auth/users/${userId}/reset-password`, data);
  return response.data;
};

export const searchTenantUsersAPI = async (search?: string) => {
  const params = search ? { search } : {};
  const response = await apiClient.get('/auth/tenant-users', { params });
  return response.data;
};

// Profile APIs
export const updateProfileAPI = async (data: any) => {
  const response = await apiClient.patch('/auth/profile', data);
  return response.data;
};
