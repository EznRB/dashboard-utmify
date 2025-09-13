import { useTenant } from '@/contexts/tenant-context'
import { TenantRole, TenantPermission } from '@/types/tenant'

// Role hierarchy (higher roles inherit permissions from lower roles)
const ROLE_HIERARCHY: Record<TenantRole, number> = {
  VIEWER: 1,
  MANAGER: 2,
  ADMIN: 3,
  OWNER: 4
}

// Permission mappings for each role
const ROLE_PERMISSIONS: Record<TenantRole, TenantPermission[]> = {
  VIEWER: [
    'view_campaigns',
    'create_campaigns',
    'edit_own_campaigns',
    'view_analytics',
    'view_team'
  ],
  MANAGER: [
    'view_campaigns',
    'create_campaigns',
    'edit_own_campaigns',
    'edit_all_campaigns',
    'delete_campaigns',
    'view_analytics',
    'export_data',
    'view_team'
  ],
  ADMIN: [
    'view_campaigns',
    'create_campaigns',
    'edit_own_campaigns',
    'edit_all_campaigns',
    'delete_campaigns',
    'view_analytics',
    'export_data',
    'view_team',
    'invite_users',
    'manage_user_roles',
    'view_billing',
    'manage_integrations'
  ],
  OWNER: [
    'view_campaigns',
    'create_campaigns',
    'edit_own_campaigns',
    'edit_all_campaigns',
    'delete_campaigns',
    'view_analytics',
    'export_data',
    'view_team',
    'invite_users',
    'manage_user_roles',
    'remove_users',
    'view_billing',
    'manage_billing',
    'manage_integrations',
    'manage_organization',
    'delete_organization',
    'manage_api_keys'
  ]
}

export function useTenantPermissions() {
  const { tenant, user } = useTenant()
  
  // Define current state variables
  const currentTenant = tenant
  const currentUserRole = user?.role

  const hasPermission = (permission: TenantPermission): boolean => {
    if (!tenant || !user) {
      return false
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || []
    return userPermissions.includes(permission)
  }

  const hasRole = (role: TenantRole): boolean => {
    if (!user?.role) {
      return false
    }

    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[role]
  }

  const hasAnyRole = (roles: TenantRole[]): boolean => {
    return roles.some(role => hasRole(role))
  }

  const hasAllPermissions = (permissions: TenantPermission[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }

  const hasAnyPermission = (permissions: TenantPermission[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  const canManageUser = (targetUserRole: TenantRole): boolean => {
    if (!currentUserRole) {
      return false
    }

    // Users can only manage users with lower or equal roles
    // Owners can manage everyone, admins can manage members, members can't manage anyone
    return ROLE_HIERARCHY[currentUserRole] > ROLE_HIERARCHY[targetUserRole]
  }

  const canInviteUsers = (): boolean => {
    return hasPermission('invite_users')
  }

  const canManageOrganization = (): boolean => {
    return hasPermission('manage_organization')
  }

  const canManageBilling = (): boolean => {
    return hasPermission('manage_billing')
  }

  const canViewBilling = (): boolean => {
    return hasPermission('view_billing')
  }

  const canManageIntegrations = (): boolean => {
    return hasPermission('manage_integrations')
  }

  const canExportData = (): boolean => {
    return hasPermission('export_data')
  }

  const canDeleteOrganization = (): boolean => {
    return hasPermission('delete_organization')
  }

  const canManageApiKeys = (): boolean => {
    return hasPermission('manage_api_keys')
  }

  const isOwner = (): boolean => {
    return currentUserRole === 'OWNER'
  }

  const isAdmin = (): boolean => {
    return hasRole('ADMIN')
  }

  const isMember = (): boolean => {
    return currentUserRole === 'VIEWER'
  }

  return {
    // Core permission checks
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllPermissions,
    hasAnyPermission,
    
    // User management
    canManageUser,
    canInviteUsers,
    
    // Organization management
    canManageOrganization,
    canDeleteOrganization,
    
    // Billing
    canManageBilling,
    canViewBilling,
    
    // Features
    canManageIntegrations,
    canExportData,
    canManageApiKeys,
    
    // Role checks
    isOwner,
    isAdmin,
    isMember,
    
    // Current state
    currentRole: currentUserRole,
    currentTenant,
    
    // Available permissions for current role
    availablePermissions: currentUserRole ? ROLE_PERMISSIONS[currentUserRole] : []
  }
}

export type UseTenantPermissionsReturn = ReturnType<typeof useTenantPermissions>