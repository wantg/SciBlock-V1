/**
 * 权限管理系统 - 类型定义
 * 
 * 设计原则：
 * 1. 权限与角色解耦 - 不直接判断 role，而是判断权限点
 * 2. 策略集中管理 - 所有权限逻辑在一个地方维护
 * 3. 分层设计 - 导航权限、页面权限、功能权限、数据权限
 * 4. 易于扩展 - 新增权限只需添加类型和策略
 */

// ============================================================================
// 角色类型（系统定义）
// ============================================================================

export type UserRole = 'student' | 'instructor' | 'admin';

// ============================================================================
// 资源类型（按模块划分）
// ============================================================================

// 团队模块
export type TeamResource = 
  | 'team.members'      // 成员管理
  | 'team.invite'       // 邀请成员
  | 'team.profile'      // 成员基本信息
  | 'team.status'       // 成员状态
  | 'team.papers'       // 成员论文
  | 'team.reports'      // 成员周报
  | 'team.experiments'; // 成员实验记录

// 周报模块
export type ReportResource =
  | 'report.view'       // 查看周报
  | 'report.create'     // 创建周报
  | 'report.edit'       // 编辑周报
  | 'report.delete'     // 删除周报
  | 'report.comment';   // 评论周报

// 实验记录模块
export type ExperimentResource =
  | 'experiment.view'
  | 'experiment.create'
  | 'experiment.edit'
  | 'experiment.delete';

// 消息模块
export type MessageResource =
  | 'message.view'
  | 'message.send'
  | 'message.delete';

// 导航权限
export type NavigationResource =
  | 'nav.team_reports'  // 团队周报导航
  | 'nav.member_manage'; // 成员管理导航

// 统一资源类型
export type ResourceType = 
  | TeamResource 
  | ReportResource 
  | ExperimentResource 
  | MessageResource
  | NavigationResource;

// ============================================================================
// 操作类型
// ============================================================================

export type ActionType = 
  | 'view'    // 查看
  | 'create'  // 创建
  | 'edit'    // 编辑
  | 'delete'  // 删除
  | 'manage'; // 管理（包含所有权限）

// ============================================================================
// 权限检查上下文
// ============================================================================

export interface PermissionContext {
  /** 当前登录用户 */
  currentUser: {
    id: string;
    email: string;
    name: string;
    role: string;  // UserRole，但用 string 以兼容现有类型
  } | null;
  /** 被访问资源的所有者用户ID */
  resourceOwnerId?: string | null;
  /** 被访问资源的学生ID（学生记录ID，非用户ID）*/
  resourceStudentId?: string | null;
  /** 额外的上下文数据（如资源状态等）*/
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 权限结果
// ============================================================================

export interface PermissionResult {
  /** 是否允许 */
  allowed: boolean;
  /** 拒绝原因（用于日志或提示） */
  reason?: string;
}

// ============================================================================
// 导航项权限
// ============================================================================

export interface NavPermission {
  /** 导航项标识 */
  id: string;
  /** 所需权限 */
  required?: {
    resource: ResourceType;
    action: ActionType;
  };
  /** 所需角色（简化方式，优先使用 permission） */
  roles?: UserRole[];
}

// ============================================================================
// 便捷类型 - 学生详情页权限集合
// ============================================================================

export interface StudentPermissions {
  // 基本信息
  canViewProfile: boolean;
  canEditProfile: boolean;
  canEditStatus: boolean;
  
  // 论文
  canViewPapers: boolean;
  canAddPaper: boolean;
  canEditPaper: boolean;
  canDeletePaper: boolean;
  
  // 周报
  canViewReports: boolean;
  canAddReport: boolean;
  
  // 实验记录
  canViewExperiments: boolean;
}

// ============================================================================
// 全局权限集合
// ============================================================================

export interface GlobalPermissions {
  // 导航
  canSeeTeamReportsNav: boolean;
  canSeeMemberManageNav: boolean;
  
  // 团队
  canInviteMember: boolean;
  
  // 个人
  canCreateExperiment: boolean;
}
