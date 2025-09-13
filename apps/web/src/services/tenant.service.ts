import { apiClient, ApiResponse } from '@/lib/api-client'
import { 
  Tenant, 
  TenantUser, 
  TenantInvitation, 
  TenantUsage, 
  TenantSettings,
  CreateTenantData,
  UpdateTenantData,
  InviteUserData
} from '@/types/tenant'

// Tipo para atualização de role de usuário
interface UpdateUserRoleData {
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'VIEWER'
}

export class TenantService {
  // Tenant management
  static async getTenants(): Promise<Tenant[]> {
    const response = await apiClient.get<ApiResponse<Tenant[]>>('/organizations')
    return response.data
  }

  static async getTenant(tenantId: string): Promise<Tenant> {
    const response = await apiClient.get<ApiResponse<Tenant>>(`/organizations/${tenantId}`)
    return response.data
  }

  static async createTenant(data: CreateTenantData): Promise<Tenant> {
    const response = await apiClient.post<ApiResponse<Tenant>>('/organizations', data)
    return response.data
  }

  static async updateTenant(tenantId: string, data: UpdateTenantData): Promise<Tenant> {
    const response = await apiClient.put<ApiResponse<Tenant>>(`/organizations/${tenantId}`, data)
    return response.data
  }

  static async deleteTenant(tenantId: string): Promise<void> {
    await apiClient.delete(`/organizations/${tenantId}`)
  }

  // User management
  static async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    const response = await apiClient.get<ApiResponse<TenantUser[]>>(`/organizations/${tenantId}/users`)
    return response.data
  }

  static async inviteUser(tenantId: string, data: InviteUserData): Promise<TenantInvitation> {
    const response = await apiClient.post<ApiResponse<TenantInvitation>>(`/organizations/${tenantId}/invitations`, data)
    return response.data
  }

  static async updateUserRole(tenantId: string, userId: string, data: UpdateUserRoleData): Promise<TenantUser> {
    const response = await apiClient.put<ApiResponse<TenantUser>>(`/organizations/${tenantId}/users/${userId}/role`, data)
    return response.data
  }

  static async removeUser(tenantId: string, userId: string): Promise<void> {
    await apiClient.delete(`/organizations/${tenantId}/users/${userId}`)
  }

  // Invitations
  static async getTenantInvitations(tenantId: string): Promise<TenantInvitation[]> {
    const response = await apiClient.get<ApiResponse<TenantInvitation[]>>(`/organizations/${tenantId}/invitations`)
    return response.data
  }

  static async resendInvitation(tenantId: string, invitationId: string): Promise<void> {
    await apiClient.post(`/organizations/${tenantId}/invitations/${invitationId}/resend`)
  }

  static async cancelInvitation(tenantId: string, invitationId: string): Promise<void> {
    await apiClient.delete(`/organizations/${tenantId}/invitations/${invitationId}`)
  }

  static async acceptInvitation(token: string): Promise<{ tenant: Tenant; user: TenantUser }> {
    const response = await apiClient.post<ApiResponse<{ tenant: Tenant; user: TenantUser }>>('/invitations/accept', { token })
    return response.data
  }

  // Usage and limits
  static async getTenantUsage(tenantId: string): Promise<TenantUsage> {
    const response = await apiClient.get<ApiResponse<TenantUsage>>(`/organizations/${tenantId}/usage`)
    return response.data
  }

  // Settings
  static async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    const response = await apiClient.get<ApiResponse<TenantSettings>>(`/organizations/${tenantId}/settings`)
    return response.data
  }

  static async updateTenantSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<TenantSettings> {
    const response = await apiClient.put<ApiResponse<TenantSettings>>(`/organizations/${tenantId}/settings`, settings)
    return response.data
  }

  // API Keys
  static async generateApiKey(tenantId: string, name: string): Promise<{ key: string; id: string }> {
    const response = await apiClient.post<ApiResponse<{ key: string; id: string }>>(`/organizations/${tenantId}/api-keys`, { name })
    return response.data
  }

  static async revokeApiKey(tenantId: string, keyId: string): Promise<void> {
    await apiClient.delete(`/organizations/${tenantId}/api-keys/${keyId}`)
  }

  static async getApiKeys(tenantId: string): Promise<Array<{ id: string; name: string; createdAt: string; lastUsed?: string }>> {
    const response = await apiClient.get<ApiResponse<Array<{ id: string; name: string; createdAt: string; lastUsed?: string }>>>(`/organizations/${tenantId}/api-keys`)
    return response.data
  }

  // Logo upload
  static async uploadLogo(tenantId: string, file: File): Promise<{ logoUrl: string }> {
    const formData = new FormData()
    formData.append('logo', file)
    
    const response = await apiClient.post<ApiResponse<{ logoUrl: string }>>(`/organizations/${tenantId}/logo`, formData)
    return response.data
  }

  // Switch tenant context
  static async switchTenant(tenantId: string): Promise<void> {
    await apiClient.post('/auth/switch-tenant', { tenantId })
  }
}