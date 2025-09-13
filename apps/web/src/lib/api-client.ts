import { getSession } from "next-auth/react"

class ApiClient {
  private baseURL: string

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1') {
    this.baseURL = baseURL
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await getSession()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (session?.user) {
      // For now, we'll use a placeholder token or implement proper token handling
      // headers.Authorization = `Bearer ${session.user.accessToken}`
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }

    return response.text() as unknown as T
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const headers = await this.getAuthHeaders()
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    })

    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers,
    })

    return this.handleResponse<T>(response)
  }
}

// Instância singleton do cliente API
export const apiClient = new ApiClient()

// Tipos para as respostas da API
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  success: boolean
}

// Tipos para filtros e parâmetros comuns
export interface DateRangeFilter {
  startDate?: string
  endDate?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface SearchParams {
  search?: string
}

export type ApiFilters = DateRangeFilter & PaginationParams & SearchParams