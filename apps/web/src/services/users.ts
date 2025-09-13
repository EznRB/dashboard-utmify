import { apiClient, ApiResponse } from '@/lib/api-client'
import { User, UserProfile, AppSettings, Notification } from '@/types'

export interface UpdateProfileData {
  name?: string
  company?: string
  phone?: string
  timezone?: string
  language?: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface UpdateNotificationSettings {
  email?: boolean
  push?: boolean
  sms?: boolean
}

class UserService {
  private readonly endpoint = '/users'

  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return apiClient.get<ApiResponse<UserProfile>>(`${this.endpoint}/me`)
  }

  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<UserProfile>> {
    return apiClient.patch<ApiResponse<UserProfile>>(`${this.endpoint}/me`, data)
  }

  async changePassword(data: ChangePasswordData): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>(`${this.endpoint}/me/change-password`, data)
  }

  async uploadAvatar(file: File): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData()
    formData.append('avatar', file)

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}${this.endpoint}/me/avatar`, {
      method: 'POST',
      body: formData,
      headers: {
        // Não definir Content-Type para FormData
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro ao fazer upload' }))
      throw new Error(errorData.message || 'Erro ao fazer upload da imagem')
    }

    return response.json()
  }

  async deleteAvatar(): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${this.endpoint}/me/avatar`)
  }

  async getSettings(): Promise<ApiResponse<AppSettings>> {
    return apiClient.get<ApiResponse<AppSettings>>(`${this.endpoint}/me/settings`)
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<ApiResponse<AppSettings>> {
    return apiClient.patch<ApiResponse<AppSettings>>(`${this.endpoint}/me/settings`, settings)
  }

  async updateNotificationSettings(settings: UpdateNotificationSettings): Promise<ApiResponse<UserProfile['notifications']>> {
    return apiClient.patch<ApiResponse<UserProfile['notifications']>>(
      `${this.endpoint}/me/notifications`,
      settings
    )
  }

  async getNotifications(page = 1, limit = 20): Promise<ApiResponse<{
    notifications: Notification[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      unreadCount: number
    }
  }>> {
    const params = {
      page: page.toString(),
      limit: limit.toString()
    }
    return apiClient.get<ApiResponse<{
      notifications: Notification[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        unreadCount: number
      }
    }>>(`${this.endpoint}/me/notifications`, params)
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return apiClient.patch<ApiResponse<void>>(`${this.endpoint}/me/notifications/${notificationId}/read`)
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return apiClient.patch<ApiResponse<void>>(`${this.endpoint}/me/notifications/read-all`)
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${this.endpoint}/me/notifications/${notificationId}`)
  }

  async clearAllNotifications(): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${this.endpoint}/me/notifications`)
  }

  async enable2FA(): Promise<ApiResponse<{
    qrCode: string
    backupCodes: string[]
    secret: string
  }>> {
    return apiClient.post<ApiResponse<{
      qrCode: string
      backupCodes: string[]
      secret: string
    }>>(`${this.endpoint}/me/2fa/enable`)
  }

  async verify2FA(token: string): Promise<ApiResponse<{
    backupCodes: string[]
  }>> {
    return apiClient.post<ApiResponse<{
      backupCodes: string[]
    }>>(`${this.endpoint}/me/2fa/verify`, { token })
  }

  async disable2FA(password: string): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>(`${this.endpoint}/me/2fa/disable`, { password })
  }

  async regenerateBackupCodes(): Promise<ApiResponse<{
    backupCodes: string[]
  }>> {
    return apiClient.post<ApiResponse<{
      backupCodes: string[]
    }>>(`${this.endpoint}/me/2fa/backup-codes/regenerate`)
  }

  async getActiveSessions(): Promise<ApiResponse<Array<{
    id: string
    device: string
    browser: string
    os: string
    ip: string
    location: string
    current: boolean
    lastActive: string
    createdAt: string
  }>>> {
    return apiClient.get<ApiResponse<Array<{
      id: string
      device: string
      browser: string
      os: string
      ip: string
      location: string
      current: boolean
      lastActive: string
      createdAt: string
    }>>>(`${this.endpoint}/me/sessions`)
  }

  async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${this.endpoint}/me/sessions/${sessionId}`)
  }

  async revokeAllSessions(): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${this.endpoint}/me/sessions`)
  }

  async deleteAccount(password: string): Promise<ApiResponse<void>> {
    return apiClient.post<ApiResponse<void>>(`${this.endpoint}/me/delete`, { password })
  }

  async exportData(): Promise<ApiResponse<{ downloadUrl: string }>> {
    return apiClient.post<ApiResponse<{ downloadUrl: string }>>(`${this.endpoint}/me/export`)
  }
}

export const userService = new UserService()