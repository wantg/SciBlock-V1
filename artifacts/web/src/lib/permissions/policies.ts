/**
 * 权限策略 - 集中管理所有权限规则
 * 
 * 这是唯一需要修改权限逻辑的地方。
 * 所有权限判断都应该通过这里的策略，而不是分散在组件中。
 * 
 * 策略设计原则：
 * 1. 优先使用角色策略（instructorOnly 等）处理粗粒度权限
 * 2. 对需要细粒度控制的资源使用 ownerOrInstructor 等策略
 * 3. 保持策略纯粹，不依赖外部状态
 */

import type { 
  ResourceType, 
  ActionType, 
  PermissionContext, 
  PermissionResult,
  StudentPermissions,
  GlobalPermissions,
  UserRole,
} from '@/types/permissions';

// ============================================================================
// 角色判断辅助函数
// ============================================================================

function isInstructor(ctx: PermissionContext): boolean {
  return ctx.currentUser?.role === 'instructor';
}

function isAdmin(ctx: PermissionContext): boolean {
  return ctx.currentUser?.role === 'admin';
}

function isStudent(ctx: PermissionContext): boolean {
  return ctx.currentUser?.role === 'student';
}

function isRole(ctx: PermissionContext, role: UserRole): boolean {
  return ctx.currentUser?.role === role;
}

function isResourceOwner(ctx: PermissionContext): boolean {
  if (!ctx.currentUser || !ctx.resourceOwnerId) return false;
  return ctx.currentUser.id === ctx.resourceOwnerId;
}

function isAuthenticated(ctx: PermissionContext): boolean {
  return ctx.currentUser !== null;
}

// ============================================================================
// 基础权限策略
// ============================================================================

/** 需要登录 */
function requireAuth(ctx: PermissionContext): PermissionResult {
  if (!isAuthenticated(ctx)) {
    return { allowed: false, reason: '需要登录' };
  }
  return { allowed: true };
}

/** 通用查看权限：所有已登录用户 */
function canViewDefault(ctx: PermissionContext): PermissionResult {
  return requireAuth(ctx);
}

/** 仅导师 */
function instructorOnly(ctx: PermissionContext): PermissionResult {
  const base = requireAuth(ctx);
  if (!base.allowed) return base;
  
  if (isInstructor(ctx) || isAdmin(ctx)) {
    return { allowed: true };
  }
  return { allowed: false, reason: '需要导师权限' };
}

/** 仅学生 */
function studentOnly(ctx: PermissionContext): PermissionResult {
  const base = requireAuth(ctx);
  if (!base.allowed) return base;
  
  if (isStudent(ctx)) {
    return { allowed: true };
  }
  return { allowed: false, reason: '需要学生权限' };
}

/** 本人或导师 */
function ownerOrInstructor(ctx: PermissionContext): PermissionResult {
  const base = requireAuth(ctx);
  if (!base.allowed) return base;
  
  if (isInstructor(ctx) || isAdmin(ctx)) {
    return { allowed: true };
  }
  if (isResourceOwner(ctx)) {
    return { allowed: true };
  }
  return { allowed: false, reason: '只能操作自己的资源' };
}

/** 仅限本人 */
function ownerOnly(ctx: PermissionContext): PermissionResult {
  const base = requireAuth(ctx);
  if (!base.allowed) return base;
  
  if (isResourceOwner(ctx)) {
    return { allowed: true };
  }
  return { allowed: false, reason: '只能操作自己的资源' };
}

/** 任何人都可（包括未登录） */
function allowAll(): PermissionResult {
  return { allowed: true };
}

// ============================================================================
// 策略表
// ============================================================================

type PolicyFn = (ctx: PermissionContext) => PermissionResult;
// 每个资源只需要定义需要的操作，不是所有操作都必须定义
type PolicyMap = Partial<Record<ResourceType, Partial<Record<ActionType, PolicyFn>>>>;

/**
 * 权限策略表
 * 
 * 键格式: "模块.资源"
 * 值: 各操作对应的策略函数
 */
const POLICIES: PolicyMap = {
  // ==========================================================================
  // 导航权限
  // ==========================================================================
  'nav.team_reports': {
    view: instructorOnly,
  },
  'nav.member_manage': {
    view: canViewDefault, // 所有人都能看到成员管理
  },

  // ==========================================================================
  // 团队模块
  // ==========================================================================
  'team.members': {
    view: canViewDefault,
    manage: instructorOnly,
  },
  'team.invite': {
    create: instructorOnly,
  },
  'team.profile': {
    view: canViewDefault,
    edit: ownerOrInstructor,
    manage: instructorOnly,
  },
  'team.status': {
    view: canViewDefault,
    edit: instructorOnly,  // 目前只有导师可以修改状态
    manage: instructorOnly,
  },
  'team.papers': {
    view: canViewDefault,
    create: ownerOrInstructor,
    edit: ownerOrInstructor,
    delete: ownerOrInstructor,
    manage: instructorOnly,
  },
  'team.reports': {
    view: canViewDefault,
    create: ownerOrInstructor,
    edit: ownerOrInstructor,
    delete: instructorOnly,
    manage: instructorOnly,
  },
  'team.experiments': {
    view: canViewDefault,
    create: ownerOrInstructor,
    edit: ownerOrInstructor,
    delete: ownerOrInstructor,
    manage: instructorOnly,
  },

  // ==========================================================================
  // 周报模块
  // ==========================================================================
  'report.view': {
    view: canViewDefault,
  },
  'report.create': {
    create: ownerOrInstructor,
  },
  'report.edit': {
    edit: ownerOrInstructor,
  },
  'report.delete': {
    delete: instructorOnly,
  },
  'report.comment': {
    create: canViewDefault,  // 能看就能评论
    edit: ownerOnly,         // 只能编辑自己的评论
    delete: ownerOrInstructor,
  },

  // ==========================================================================
  // 实验记录模块
  // ==========================================================================
  'experiment.view': {
    view: canViewDefault,
  },
  'experiment.create': {
    create: ownerOrInstructor,
  },
  'experiment.edit': {
    edit: ownerOrInstructor,
  },
  'experiment.delete': {
    delete: ownerOrInstructor,
  },

  // ==========================================================================
  // 消息模块
  // ==========================================================================
  'message.view': {
    view: requireAuth,
  },
  'message.send': {
    create: requireAuth,
  },
  'message.delete': {
    delete: ownerOnly,
  },
};

// ============================================================================
// 主权限检查函数
// ============================================================================

/**
 * 检查特定资源和操作的权限
 * 
 * @example
 * const result = checkPermission('team.profile', 'edit', {
 *   currentUser: { id: 'u1', role: 'student', ... },
 *   resourceOwnerId: 'u1'
 * });
 * // result = { allowed: true }
 */
export function checkPermission(
  resource: ResourceType,
  action: ActionType,
  context: PermissionContext
): PermissionResult {
  // 如果没有该资源的策略，默认拒绝
  const resourcePolicies = POLICIES[resource];
  if (!resourcePolicies) {
    return { allowed: false, reason: '未知资源类型' };
  }
  
  // 如果没有该操作的策略，尝试使用 manage 策略
  let policy = resourcePolicies[action];
  if (!policy) {
    policy = resourcePolicies['manage'];
  }
  
  // 如果还没有，默认拒绝
  if (!policy) {
    return { allowed: false, reason: '未知操作类型' };
  }
  
  return policy(context);
}

/**
 * 便捷函数：检查是否有权限（返回 boolean）
 * 
 * @example
 * if (hasPermission('team.invite', 'create', ctx)) {
 *   showInviteButton();
 * }
 */
export function hasPermission(
  resource: ResourceType,
  action: ActionType,
  context: PermissionContext
): boolean {
  return checkPermission(resource, action, context).allowed;
}

// ============================================================================
// 便捷函数 - 学生详情页权限
// ============================================================================

export function getStudentPermissions(
  currentUser: PermissionContext['currentUser'],
  studentUserId: string | null
): StudentPermissions {
  const ctx: PermissionContext = {
    currentUser,
    resourceOwnerId: studentUserId,
  };
  
  return {
    canViewProfile: hasPermission('team.profile', 'view', ctx),
    canEditProfile: hasPermission('team.profile', 'edit', ctx),
    canEditStatus: hasPermission('team.status', 'edit', ctx),
    canViewPapers: hasPermission('team.papers', 'view', ctx),
    canAddPaper: hasPermission('team.papers', 'create', ctx),
    canEditPaper: hasPermission('team.papers', 'edit', ctx),
    canDeletePaper: hasPermission('team.papers', 'delete', ctx),
    canViewReports: hasPermission('team.reports', 'view', ctx),
    canAddReport: hasPermission('team.reports', 'create', ctx),
    canViewExperiments: hasPermission('team.experiments', 'view', ctx),
  };
}

// ============================================================================
// 便捷函数 - 全局权限
// ============================================================================

export function getGlobalPermissions(
  currentUser: PermissionContext['currentUser']
): GlobalPermissions {
  const ctx: PermissionContext = { currentUser, resourceOwnerId: null };
  
  return {
    canSeeTeamReportsNav: hasPermission('nav.team_reports', 'view', ctx),
    canSeeMemberManageNav: hasPermission('nav.member_manage', 'view', ctx),
    canInviteMember: hasPermission('team.invite', 'create', ctx),
    canCreateExperiment: hasPermission('experiment.create', 'create', ctx),
  };
}

// ============================================================================
// 便捷函数 - 导航权限检查
// ============================================================================

/**
 * 检查导航项是否应该显示
 * 
 * @example
 * const navItems = NAV_GROUPS.filter(nav => 
 *   nav.required ? hasNavPermission(nav.required, ctx) : true
 * );
 */
export function hasNavPermission(
  resource: ResourceType,
  ctx: PermissionContext
): boolean {
  return hasPermission(resource, 'view', ctx);
}

// ============================================================================
// 角色快捷判断（兼容旧代码）
// ============================================================================

export function isInstructorRole(role?: string): boolean {
  return role === 'instructor' || role === 'admin';
}

export function isStudentRole(role?: string): boolean {
  return role === 'student';
}
