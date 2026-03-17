/**
 * 权限管理系统 - 统一导出
 * 
 * 使用示例：
 * 
 * ```tsx
 * // 1. 使用 Hooks（推荐）
 * import { useGlobalPermissions, useStudentPermissions, useHasPermission } from '@/lib/permissions';
 * 
 * function MyComponent() {
 *   const { canInviteMember } = useGlobalPermissions();
 *   const perms = useStudentPermissions(student.userId);
 *   const canEdit = useHasPermission('team.profile', 'edit', student.userId);
 * }
 * 
 * // 2. 使用策略函数（用于非组件场景）
 * import { hasPermission, checkPermission, getStudentPermissions } from '@/lib/permissions';
 * 
 * if (hasPermission('team.invite', 'create', context)) {
 *   // ...
 * }
 * 
 * // 3. 使用类型
 * import type { ResourceType, ActionType, PermissionContext } from '@/lib/permissions';
 * ```
 */

// 类型导出
export type { 
  ResourceType, 
  ActionType, 
  PermissionContext, 
  PermissionResult,
  StudentPermissions,
  GlobalPermissions,
  UserRole,
  TeamResource,
  ReportResource,
  ExperimentResource,
  MessageResource,
  NavigationResource,
} from '@/types/permissions';

// Hooks 导出
export {
  usePermission,
  useHasPermission,
  useStudentPermissions,
  useGlobalPermissions,
  useSelfPermissions,
  useIsInstructor,
  useIsStudent,
  useUserRole,
} from './usePermissions';

// 策略函数导出
export {
  checkPermission,
  hasPermission,
  getStudentPermissions,
  getGlobalPermissions,
  hasNavPermission,
  isInstructorRole,
  isStudentRole,
} from './policies';
