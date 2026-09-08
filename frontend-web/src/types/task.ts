export enum TaskStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  GENERATING_BG = 'generating_bg',
  GENERATING_ICONS = 'generating_icons',
  GENERATING_AVATAR = 'generating_avatar',
  GENERATING_TEXTURES = 'generating_textures',
  SLICING = 'slicing',
  COMPOSITING = 'compositing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const ACTIVE_TASK_STATUSES = new Set<TaskStatus>([
  TaskStatus.QUEUED,
  TaskStatus.PROCESSING,
  TaskStatus.GENERATING_BG,
  TaskStatus.GENERATING_ICONS,
  TaskStatus.GENERATING_AVATAR,
  TaskStatus.GENERATING_TEXTURES,
  TaskStatus.SLICING,
  TaskStatus.COMPOSITING,
]);

export const isActiveTaskStatus = (status?: TaskStatus): boolean =>
  status !== undefined && ACTIVE_TASK_STATUSES.has(status);

export enum TaskType {
  WALLPAPER = 'wallpaper',
  THEME = 'theme',
  DIGITAL_HUMAN = 'digital_human',
  DIY = 'diy',
  STICKER_PACK = 'sticker_pack',
}

export enum AIProvider {
  OPENAI = 'openai',
  DOUBAO = 'doubao',
  DASHSCOPE = 'dashscope',
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'error';
  message: string;
}

export interface BuildTreeNode {
  path: string;
  type: 'image' | 'folder' | 'mesh' | 'file';
  size?: [number, number];
  position?: [number, number];
}

export interface BuildTree {
  [key: string]: BuildTreeNode | BuildTree;
}

export interface TaskListItem {
  task_id: string;
  user_input: string;
  task_type: TaskType;
  ai_provider?: string;
  status: TaskStatus;
  background_image_url?: string;
  cover_thumb_url?: string | null;
  avatar_image_url?: string;
  likes: number;
  views: number;
  created_at: string;
  tags?: number[];
  is_visible?: boolean;
  published_at?: string | null;
}

// Creator center types (user's own tasks, all statuses)

export interface CreatorTaskListItem {
  task_id: string;
  user_input: string;
  task_type: TaskType;
  ai_provider?: string;
  status: TaskStatus;
  background_image_url?: string;
  cover_thumb_url?: string | null;
  avatar_image_url?: string;
  likes: number;
  views: number;
  is_visible: boolean;
  tags?: number[];
  created_at: string;
  published_at?: string | null;
}

export interface CreatorTaskPage {
  items: CreatorTaskListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreatorStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  by_type: Partial<Record<TaskType, number>>;
}

export interface TaskActionResult {
  task_id: string;
  task_type: TaskType;
  status: TaskStatus;
}

export interface Task extends TaskListItem {
  id?: number;
  user_id?: string | null;
  author?: string;
  icon_descriptions?: string[];
  updated_at?: string;
  background_prompt?: string;
  icon_prompt?: string;
  normal_detail?: string;
  view_prompts?: {
    character_anchor?: string;
    front?: string;
    right?: string;
    back?: string;
    left?: string;
  };
  icon_image_url?: string;
  avatar_atlas_url?: string;
  view_image_urls?: {
    front?: string;
    right?: string;
    back?: string;
    left?: string;
  };
  texture_albedo_url?: string;
  texture_normal_url?: string;
  logs: LogEntry[];
  output_path?: string;
  build_tree?: BuildTree;
}

export interface TaskCreate {
  user_input: string;
  provider?: string;
  task_type?: TaskType;
  icon_descriptions?: string[];
}

export type SocialTargetType = 'task' | 'theme_package';
export type SocialCommentStatus = 'pending' | 'approved' | 'rejected';

export interface SocialComment {
  id: string;
  target_type: SocialTargetType | string;
  target_id: string;
  user_id: string;
  author: string;
  parent_id?: string | null;
  reply_to_user_id?: string | null;
  reply_to_author?: string | null;
  content: string;
  status: SocialCommentStatus;
  review_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string | null;
}

export interface SocialCommentListResponse {
  items: SocialComment[];
  total: number;
}

export interface SocialCommentCreate {
  content: string;
  parent_id?: string | null;
}

export interface FeedbackCreate {
  title: string;
  content: string;
  contact: string;
}

export interface FeedbackSubmitResponse {
  id: string;
  message: string;
}

export interface QueueStatus {
  processing_count: number;
  queued_count: number;
}

export interface TaskStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  by_type: Partial<Record<TaskType, number>>;
}

export interface PresenceHeartbeatResponse {
  ok: boolean;
  total: number;
}

// Icon description config types

export interface IconDescription {
  name: string;
  description: string;
}

export interface IconDescriptionCreate {
  name: string;
  directory_name: string;
  description: string;
  enabled?: boolean;
  sort_order?: number;
}

export interface IconDescriptionUpdate {
  name?: string;
  directory_name?: string;
  description?: string;
  enabled?: boolean;
  sort_order?: number;
}
// AI Provider config types

export interface AIProviderConfig {
  name: string;
  value: string;
}

export interface AIProviderConfigCreate {
  name: string;
  value: string;
  enabled?: boolean;
  sort_order?: number;
}

export interface AIProviderConfigUpdate {
  name?: string;
  value?: string;
  enabled?: boolean;
  sort_order?: number;
}

// User / Pen-auth types

export interface AnchorPoint {
  x: number;  // [0,1] 标准化坐标
  y: number;
}

export interface InkSignature {
  grid_traversal: number[];        // 有序格子序列（3×3 网格，0-8，保留遍历顺序）
  grid_traversal_coarse: number[]; // 兼容保留，实际为空
  direction_sequence: number[];    // 方向编码序列（0-7），长度 = grid_traversal.length - 1
  unique_cells: number;            // 穿过的唯一格子数
  start?: AnchorPoint;             // 签名起点锚点
  end?: AnchorPoint;               // 签名终点锚点
  raw_points?: { x: number; y: number }[]; // 原始标准化笔迹点序列 [0,1]，用于还原真实笔迹展示
}

export interface UserInfo {
  id: string;
  nick_name: string;
  created_at: string;
}

export type NotificationLevel = 'info' | 'warning' | 'error';
export type NotificationMessageType = 'announcement' | 'notification';

export interface UserNotification {
  id: string;
  title: string;
  content: string;
  link_url?: string | null;
  level: NotificationLevel;
  is_read: boolean;
  created_at: string | null;
}

export interface NotificationListResponse {
  items: UserNotification[];
  unread_count: number;
}

export interface UserAdmin {
  id: string;
  nick_name: string;
  sig_hash: string;
  sig_hash_dir: string | null;
  is_disabled: boolean;
  task_count: number;
  likes_received: number;
  credits: number;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserAdminUpdate {
  nick_name?: string;
  is_disabled?: boolean;
}

export interface SignatureView {
  sig_hash: string;
  sig_hash_dir: string | null;
}

export interface DownloadLog {
  id: string;
  user_id: string;
  task_id: string;
  credits_cost: number;
  created_at: string | null;
}

export interface DownloadStats {
  total_downloads: number;
  total_credits_spent: number;
  unique_users: number;
  unique_tasks: number;
}


// Credit system types

export interface CreditPrice {
  id: string;
  action: string;
  price: number;
  label: string;
  sort_order: number;
  updated_at: string | null;
}

export interface CreditPriceUpdate {
  price?: number;
  label?: string;
  sort_order?: number;
}
 
 export interface CreditPriceCreate {
   action: string;
   price: number;
   label: string;
   sort_order?: number;
 }

export const ACTION_LABELS: Record<string, string> = {
  wallpaper: '车载壁纸',
  theme: '车载主题',
  digital_human: '数字人形象',
  sticker_pack: '贴纸包',
  diy: 'DIY生图',
  download: '打包下载',
  recharge: '充值',
  check_in: '每日签到',
  liked: '被点赞奖励',
};

export interface CreditLogItem {
  id: string;
  user_id: string;
  target_id: string | null;
  action: string;
  credits_cost: number;
  credits_after: number;
  created_at: string | null;
}

export interface CreditStats {
  total_records: number;
  total_credits_spent: number;
  unique_users: number;
  unique_tasks: number;
}

export interface AuthTokenResponse {
  token: string;
  user: UserInfo;
}

// Inspiration library types

export interface InspirationListItem {
  task_id: string;
  user_input: string;
  task_type: TaskType;
  cover_thumb_url?: string | null;
  likes: number;
  views: number;
  tags?: number[];
}

export interface InspirationQuery {
  q?: string;
  task_type?: TaskType | 'all';
  tags?: number[];  // 二级标签ID列表
  sort?: 'latest' | 'likes' | 'views';
  page?: number;
  page_size?: number;
}

export interface InspirationPage {
  items: InspirationListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface InspirationDetail {
  task_id: string;
  user_input: string;
  task_type: TaskType;
  author?: string | null;
  background_prompt?: string;
  icon_prompt?: string;
  normal_detail?: string;
  view_prompts?: {
    character_anchor?: string;
    front?: string;
    right?: string;
    back?: string;
    left?: string;
  };
  background_image_url?: string;
  cover_thumb_url?: string | null;
  avatar_image_url?: string;
  icon_image_url?: string;
  avatar_atlas_url?: string;
  view_image_urls?: {
    front?: string;
    right?: string;
    back?: string;
    left?: string;
  };
  texture_albedo_url?: string;
  texture_normal_url?: string;
  build_tree?: BuildTree;
  likes: number;
  views: number;
  tags?: number[];  // 二级标签ID列表
  published_at?: string | null;
}

export interface PopularTag {
  tag: string;
  count: number;
}

// 标签分类（两级联动）

export interface TagCategoryItem {
  id: number;
  name: string;
  parent_id: number | null;
}

export interface TagCategoryTree {
  id: number;
  name: string;
  children: TagCategoryItem[];
}

// Theme package browse types

export enum ThemePackageType {
  FLAT_COCKPIT = 'flat_cockpit',
  DYNAMIC_COCKPIT = 'dynamic_cockpit',
  COCKPIT_3D = 'cockpit_3d',
}

export enum ThemePackageStatus {
  DRAFT = 'draft',
  PACKAGING = 'packaging',
  READY = 'ready',
  PUBLISHED = 'published',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export type ThemePackageSort = 'latest' | 'likes' | 'views';

export interface ThemePackagePublicItem {
  package_id: string;
  title: string;
  description?: string | null;
  package_type: ThemePackageType | string;
  status: ThemePackageStatus | string;
  author?: string | null;
  cover_thumb_url?: string | null;
  has_wallpaper: boolean;
  has_icons: boolean;
  has_widgets: boolean;
  has_digital_human: boolean;
  likes: number;
  views: number;
  tags?: number[] | null;
  published_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface ThemePackageItem extends ThemePackagePublicItem {
  is_published: boolean;
}

export interface ThemePackageDetail extends ThemePackageItem {
  is_owner?: boolean;
  cover_image_url?: string | null;
  preview_image_urls?: string[] | null;
  package_size?: number | null;
  schema_version?: string;
  target_runtime?: string;
  min_runtime_version?: string;
  assets_count?: number;
  layout_count?: number;
  tokens_count?: number;
  components_count?: number;
}

export interface ThemePackagePage {
  items: ThemePackageItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ThemePackagePublicPage {
  items: ThemePackagePublicItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ThemePackageQuery {
  q?: string;
  package_type?: ThemePackageType | 'all';
  tags?: number[];
  has_digital_human?: boolean;
  sort?: ThemePackageSort;
  page?: number;
  page_size?: number;
}
