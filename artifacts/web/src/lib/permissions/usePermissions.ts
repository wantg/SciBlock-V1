/**
 * 权限管理 React Hooks
 * 
 * 在组件中使用权限检查：
 * 
 * ```tsx
 * // 1. 使用全局权限（导航、通用功能）
 * function Header() {
 *   const { canInviteMember, canSeeTeamReportsNav } = useGlobalPermissions();
 *   
 *   return (
 *     <nav>
 *       {canSeeTeamReportsNav && <Link to="/home/reports">团队周报</Link>}
 *       {canInviteMember && <InviteButton />}
 *     </nav>
 *   );
 * }
 * 
 * // 2. 使用学生详情页权限
 * function MemberDetailPage({ student }) {
 *   const perms = useStudentPermissions(student.userId);
 *   
 *   return (
 *     <>
 *       <BasicInfoCard editable={perms.canEditProfile} />
 *       <PapersCard canAdd={perms.canAddPaper} />
 *     </>
 *   );
 * }
 * 
 * // 3. 使用通用权限检查
 * function MyComponent() {
 *   const canEdit = useHasPermission('team.profile', 'edit', studentUserId);
 *   return <button disabled={!canEdit}>编辑</button>;
 * }
 * ```
 */

import { useMemo } from 'react';
import { useCurrentUser } from '@/contexts/UserContext';
import type { 
  PermissionContext, 
  ResourceType, 
  ActionType,
  StudentPermissions,
  GlobalPermissions,
} from '@/types/permissions';
import { 
  checkPermission, 
  hasPermission, 
  getStudentPermissions,
  getGlobalPermissions,
} from './policies';

// ============================================================================
// 通用权限检查 Hooks
// ============================================================================

/**
 * 通用权限检查 Hook
 * 
 * @example
 * const { allowed, reason } = usePermission('team.profile', 'edit', studentUserId);
 */
export function usePermission(
  resource: ResourceType,
  action: ActionType,
  resourceOwnerId?: string | null
) {
  const { currentUser } = useCurrentUser();
  
  const context: PermissionContext = useMemo(() => ({
    currentUser,
    resourceOwnerId: resourceOwnerId ?? null,
  }), [currentUser, resourceOwnerId]);
  
  return useMemo(() => 
    checkPermission(resource, action, context),
    [resource, action, context]
  );
}

/**
 * 布尔值权限检查 Hook
 * 
 * @example
 * const canEdit = useHasPermission('team.profile', 'edit', studentUserId);
 */
export function useHasPermission(
  resource: ResourceType,
  action: ActionType,
  resourceOwnerId?: string | null
): boolean {
  const { allowed } = usePermission(resource, action, resourceOwnerId);
  return allowed;
}

// ============================================================================
// 业务场景 Hooks
// ============================================================================

/**
 * 学生详情页权限集合 Hook
 * 
 * @example
 * function MemberDetailPage({ student }) {
 *   const perms = useStudentPermissions(student.userId);
 *   return (
 *     <BasicInfoCard editable={perms.canEditProfile} />
 *   );
 * }
 */
export function useStudentPermissions(studentUserId: string | null | undefined): StudentPermissions {
  const { currentUser } = useCurrentUser();
  
  return useMemo(() => 
    getStudentPermissions(currentUser, studentUserId ?? null),
    [currentUser, studentUserId]
  );
}

/**
 * 全局权限 Hook（导航、通用功能）
 * 
 * @example
 * function AppSidebar() {
 *   const { canSeeTeamReportsNav, canInviteMember } = useGlobalPermissions();
 *   return (
 *     <nav>
 *       {canSeeTeamReportsNav && <NavItem to="/home/reports">团队周报</NavItem>}
 *       {canInviteMember && <InviteButton />}
 *     </nav>
 *   );
 * }
 */
export function useGlobalPermissions(): GlobalPermissions {
  const { currentUser } = useCurrentUser();
  
  return useMemo(() => 
    getGlobalPermissions(currentUser),
    [currentUser]
  );
}

/**
 * 当前登录用户的自身权限
 * 
 * 用于检查当前用户可以对自己做什么
 * 
 * @example
 * function MyProfile() {
 *   const { canEditProfile, canAddPaper } = useSelfPermissions();
 *   return (
 *     <>
 *       {canEditProfile && <EditProfileButton />}
 *       {canAddPaper && <AddPaperButton />}
 *     </>
 *   );
 * }
 */
export function useSelfPermissions(): Pick<
  StudentPermissions, 
  'canEditProfile' | 'canEditStatus' | 'canAddPaper' | 'canEditPaper' | 'canDeletePaper' | 'canAddReport'
> {
  const { currentUser } = useCurrentUser();
  
  return useMemo(() => {
    const perms = getStudentPermissions(currentUser, currentUser?.id ?? null);
    return {
      canEditProfile: perms.canEditProfile,
      canEditStatus: perms.canEditStatus,
      canAddPaper: perms.canAddPaper,
      canEditPaper: perms.canEditPaper,
      canDeletePaper: perms.canDeletePaper,
      canAddReport: perms.canAddReport,
    };
  }, [currentUser]);
}

// ============================================================================
// 角色判断 Hooks（兼容旧代码）
// ============================================================================

/**
 * 检查当前用户是否是导师
 * 
 * @example
 * const isInstructor = useIsInstructor();
 * if (isInstructor) { showInstructorFeatures(); }
 */
export function useIsInstructor(): boolean {
  const { currentUser } = useCurrentUser();
  return currentUser?.role === 'instructor' || currentUser?.role === 'admin';
}

/**
 * 检查当前用户是否是学生
 */
export function useIsStudent(): boolean {
  const { currentUser } = useCurrentUser();
  return currentUser?.role === 'student';
}

/**
 * 获取当前用户角色
 */
export function useUserRole(): { 
  role: string | null; 
  isInstructor: boolean; 
  isStudent: boolean;
  isAdmin: boolean;
} {
  const { currentUser } = useCurrentUser();
  const role = currentUser?.role ?? null;
  
  return useMemo(() => ({
    role,
    isInstructor: role === 'instructor' || role === 'admin',
    isStudent: role === 'student',
    isAdmin: role === 'admin',
  }), [role]);
}
