// src/lib/roleConfig.js
// Ported 1:1 from app/index.html's ROLE_CONFIG. Same roles, same
// permissions, same tab visibility rules -- nothing about who can do what
// has changed, only how it's consumed (React hook instead of a global fn).

export const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    tabs: ['dashboard', 'analytics', 'calendar', 'biodata', 'leave_management', 'notifications', 'export_import'],
    canEdit: true,
    canApproveLeave: true,
    canExport: true,
    canImport: true,
    canManageRoles: true,
    canViewSalary: true,
    canViewDisciplinary: true,
    canManageEvents: true,
  },
  hrd_staff: {
    label: 'Staf HRD',
    tabs: ['dashboard', 'analytics', 'calendar', 'biodata', 'leave_management', 'notifications', 'export_import'],
    canEdit: true,
    canApproveLeave: true,
    canExport: true,
    canImport: false,
    canManageRoles: false,
    canViewSalary: false,
    canViewDisciplinary: false,
    canManageEvents: false,
  },
  pimpinan: {
    label: 'Pimpinan',
    tabs: ['dashboard', 'analytics', 'calendar', 'biodata', 'notifications'],
    canEdit: false,
    canApproveLeave: false,
    canExport: true,
    canImport: false,
    canManageRoles: false,
    canViewSalary: false,
    canViewDisciplinary: false,
    canManageEvents: false,
  },
}

const FALLBACK = {
  label: 'Pending',
  tabs: [],
  canEdit: false,
  canApproveLeave: false,
  canExport: false,
  canImport: false,
  canManageRoles: false,
  canViewSalary: false,
  canViewDisciplinary: false,
  canManageEvents: false,
}

export function getRoleConfig(role) {
  return ROLE_CONFIG[role] || FALLBACK
}

export function can(role, perm) {
  return !!getRoleConfig(role)[perm]
}

export function hasTab(role, tab) {
  return (getRoleConfig(role).tabs || []).includes(tab)
}
