import axios from 'axios';
import type {
  Task,
  TaskActionResult,
  CreatorTaskPage,
  CreatorStats,
  TaskCreate,
  TaskType,
  QueueStatus,
  PresenceHeartbeatResponse,
  IconDescription,
  AIProviderConfig,
  InkSignature,
  UserInfo,
  AuthTokenResponse,
  NotificationListResponse,
  SocialComment,
  SocialCommentCreate,
  SocialCommentListResponse,
  SocialTargetType,
  FeedbackCreate,
  FeedbackSubmitResponse,
  InspirationQuery,
  InspirationPage,
  InspirationDetail,
  PopularTag,
  TagCategoryTree,
  TagCategoryItem,
  ThemePackageDetail,
  ThemePackagePage,
  ThemePackagePublicPage,
  ThemePackageQuery,
  ThemePackageSort,
} from '@/types/task';
import { safeLocalStorageGet, safeLocalStorageRemove, safeLocalStorageSet } from '@/utils/storage';

const USER_TOKEN_KEY = 'aigc_user_token';
const USER_INFO_KEY = 'aigc_user_info';
const USER_SIGNATURE_KEY = 'aigc_user_signature';
const LAST_NICKNAME_KEY = 'aigc_last_nickname';

interface DownloadTicketResponse {
  url: string;
  expires_at: string;
  ttl_seconds: number;
  credits_cost: number;
  charged: boolean;
}

type CreditPrice = { action: string; price: number };

const normalizeCreditPrices = (data: unknown): CreditPrice[] => {
  if (Array.isArray(data)) return data as CreditPrice[];
  if (data && typeof data === 'object' && Array.isArray((data as { prices?: unknown }).prices)) {
    return (data as { prices: CreditPrice[] }).prices;
  }
  return [];
};

const USER_VERIFY_CACHE_TTL_MS = 15_000;

let userVerifyCache: {
  token: string;
  user: UserInfo;
  expiresAt: number;
} | null = null;

let userVerifyInFlight: {
  token: string;
  promise: Promise<UserInfo>;
} | null = null;

const resetUserVerifyCache = (): void => {
  userVerifyCache = null;
  userVerifyInFlight = null;
};

const isUserVerifyRequest = (url?: string): boolean => {
  if (!url) return false;
  const path = url.startsWith('/api') ? url.slice(4) : url;
  return path === '/user/verify';
};

export const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

// ── Token interceptor: attach user token ─────────────────────────────────
api.interceptors.request.use((config) => {
  const userToken = safeLocalStorageGet(USER_TOKEN_KEY);
  if (userToken) {
    config.headers.Authorization = `Bearer ${userToken}`;
  }
  return config;
});

// ── 401 interceptor: clear user token ────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && isUserVerifyRequest(error?.config?.url)) {
      resetUserVerifyCache();
      safeLocalStorageRemove(USER_TOKEN_KEY);
      safeLocalStorageRemove(USER_INFO_KEY);
      safeLocalStorageRemove(USER_SIGNATURE_KEY);
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Task API
// ---------------------------------------------------------------------------

export const taskApi = {
  createTask: async (data: TaskCreate): Promise<TaskActionResult> => {
    const response = await api.post<TaskActionResult>('/tasks', data);
    return response.data;
  },

  /** 创作中心：当前用户自己的任务列表 */
  listMyCreatorTasks: async (params: { task_type?: TaskType; sort?: 'latest' | 'likes' | 'views'; page?: number; page_size?: number }): Promise<CreatorTaskPage> => {
    const query: Record<string, string> = {};
    if (params.task_type) query.task_type = params.task_type;
    if (params.sort) query.sort = params.sort;
    if (params.page) query.page = String(params.page);
    if (params.page_size) query.page_size = String(params.page_size);
    const response = await api.get<CreatorTaskPage>('/tasks/mine', { params: query });
    return response.data;
  },

  /** 创作中心：当前用户自己的任务统计 */
  getMyCreatorStats: async (): Promise<CreatorStats> => {
    const response = await api.get<CreatorStats>('/tasks/stats/mine');
    return response.data;
  },

  getTask: async (taskId: string): Promise<Task> => {
    const response = await api.get<Task>(`/tasks/${taskId}`);
    return response.data;
  },

  recordView: async (taskId: string): Promise<{ task_id: string; views: number }> => {
    const response = await api.post<{ task_id: string; views: number }>(`/tasks/${taskId}/view`);
    return response.data;
  },

  getQueueStatus: async (): Promise<QueueStatus> => {
    const response = await api.get<QueueStatus>('/tasks/queue/status');
    return response.data;
  },

  retryTask: async (taskId: string): Promise<TaskActionResult> => {
    const response = await api.post<TaskActionResult>(`/tasks/${taskId}/retry`);
    return response.data;
  },

  deleteMyTasks: async (taskIds: string[]): Promise<{ task_ids: string[]; deleted_count: number }> => {
    const response = await api.post<{ task_ids: string[]; deleted_count: number }>('/tasks/batch-delete', {
      task_ids: taskIds,
    });
    return response.data;
  },

  downloadZip: async (taskId: string): Promise<DownloadTicketResponse> => {
    const response = await api.post<DownloadTicketResponse>(`/resource/${taskId}/download`);
    const link = document.createElement('a');
    link.href = response.data.url;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return response.data;
  },

  downloadPackage: async (taskId: string): Promise<string> => {
    const response = await api.post<DownloadTicketResponse>(`/resource/${taskId}/download`);
    return response.data.url;
  },
};

// ---------------------------------------------------------------------------
// Generic social API
// ---------------------------------------------------------------------------

export const socialApi = {
  listMyLikedTargetIds: async (targetType: SocialTargetType): Promise<string[]> => {
    const response = await api.get<string[]>('/social/likes/mine', {
      params: { target_type: targetType },
    });
    return response.data;
  },

  like: async (targetType: SocialTargetType, targetId: string): Promise<{ liked: boolean }> => {
    const response = await api.post<{ liked: boolean }>(`/social/${targetType}/${targetId}/like`);
    return response.data;
  },

  listComments: async (
    targetType: SocialTargetType,
    targetId: string,
    skip = 0,
    limit = 50,
    includeMyReviewing = false,
  ): Promise<SocialCommentListResponse> => {
    const response = await api.get<SocialCommentListResponse>(`/social/${targetType}/${targetId}/comments`, {
      params: { skip, limit, include_my_reviewing: includeMyReviewing },
    });
    return response.data;
  },

  createComment: async (
    targetType: SocialTargetType,
    targetId: string,
    data: SocialCommentCreate,
  ): Promise<SocialComment> => {
    const response = await api.post<SocialComment>(`/social/${targetType}/${targetId}/comments`, data);
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// Presence API
// ---------------------------------------------------------------------------

export const presenceApi = {
  anonymousHeartbeat: async (sessionId: string): Promise<PresenceHeartbeatResponse> => {
    const response = await api.post<PresenceHeartbeatResponse>('/presence/anonymous/heartbeat', { session_id: sessionId });
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// Icon description API (read-only for web)
// ---------------------------------------------------------------------------

export const iconDescriptionApi = {
  list: async (): Promise<IconDescription[]> => {
    const response = await api.get<IconDescription[]>('/icon-descriptions');
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// AI Provider config API (read-only for web)
// ---------------------------------------------------------------------------

export const aiProviderApi = {
  list: async (): Promise<AIProviderConfig[]> => {
    const response = await api.get<AIProviderConfig[]>('/ai-providers');
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// Feedback API
// ---------------------------------------------------------------------------

export const feedbackApi = {
  submit: async (data: FeedbackCreate): Promise<FeedbackSubmitResponse> => {
    const response = await api.post<FeedbackSubmitResponse>('/feedback', data);
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// User / Pen-auth API
// ---------------------------------------------------------------------------

export const userApi = {
  register: async (
    nickName: string,
    signature: InkSignature,
  ): Promise<AuthTokenResponse> => {
    const response = await api.post<AuthTokenResponse>('/user/register', {
      nick_name: nickName,
      signature,
    });
    return response.data;
  },

  login: async (nickName: string, signature: InkSignature): Promise<AuthTokenResponse> => {
    const response = await api.post<AuthTokenResponse>('/user/login', {
      nick_name: nickName,
      signature,
    });
    return response.data;
  },

  verify: async (): Promise<UserInfo> => {
    const token = getUserToken();
    const now = Date.now();
    if (token && userVerifyCache?.token === token && userVerifyCache.expiresAt > now) {
      return userVerifyCache.user;
    }
    if (token && userVerifyInFlight?.token === token) {
      return userVerifyInFlight.promise;
    }

    const promise = api.get<UserInfo>('/user/verify')
      .then((response) => {
        const user = response.data;
        const latestToken = getUserToken();
        if (latestToken) {
          userVerifyCache = {
            token: latestToken,
            user,
            expiresAt: Date.now() + USER_VERIFY_CACHE_TTL_MS,
          };
          safeLocalStorageSet(USER_INFO_KEY, JSON.stringify(user));
        }
        return user;
      })
      .finally(() => {
        if (userVerifyInFlight?.promise === promise) {
          userVerifyInFlight = null;
        }
      });

    if (token) {
      userVerifyInFlight = { token, promise };
    }
    return promise;
  },

  getCredits: async (): Promise<{ credits: number; prices: Array<{ action: string; price: number; label: string }> }> => {
    const res = await api.get('/user/credits');
    return res.data;
  },

  getCreditHistory: async (skip = 0, limit = 8): Promise<{ items: Array<{
    id: string; action: string; target_id: string | null;
    credits_cost: number; created_at: string | null;
  }>; total: number }> => {
    const res = await api.get<{ items: Array<{
      id: string; action: string; target_id: string | null;
      credits_cost: number; created_at: string | null;
    }>; total: number }>('/user/credit-history', { params: { skip, limit } });
    return res.data;
  },

  checkIn: async (): Promise<{ success: boolean; credits_earned: number; credits_after: number; check_date: string }> => {
    const res = await api.post('/user/check-in');
    return res.data;
  },

  getCheckInStatus: async (): Promise<{ today_checked: boolean; streak: number; checked_dates: string[]; month: string }> => {
    const res = await api.get('/user/check-in/status');
    return res.data;
  },

  getSignatureHint: async (nickName: string): Promise<{ anchors: Array<{ x: number; y: number }> | null }> => {
    const res = await api.get('/user/signature-hint', { params: { nick_name: nickName } });
    return res.data;
  },

  getCreditPrices: async (): Promise<CreditPrice[]> => {
    const res = await api.get('/user/credit-prices');
    return normalizeCreditPrices(res.data);
  },
};

// ---------------------------------------------------------------------------
// Notification API
// ---------------------------------------------------------------------------

export const notificationApi = {
  list: async (): Promise<NotificationListResponse> => {
    const response = await api.get<NotificationListResponse>('/notifications');
    return response.data;
  },

  markRead: async (notificationId: string): Promise<void> => {
    await api.post(`/notifications/${notificationId}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },
};

// ---------------------------------------------------------------------------
// Inspiration library
// ---------------------------------------------------------------------------

export const inspirationApi = {
  publish: async (taskId: string, data: { tags: number[] }): Promise<{ task_id: string; is_visible: boolean; tags: number[] | null }> => {
    const response = await api.post(`/inspiration/${taskId}/publish`, data);
    return response.data;
  },

  unpublish: async (taskId: string): Promise<{ task_id: string; is_visible: boolean; tags: number[] | null }> => {
    const response = await api.delete(`/inspiration/${taskId}/publish`);
    return response.data;
  },

  list: async (params: InspirationQuery): Promise<InspirationPage> => {
    const query: Record<string, string> = {};
    if (params.q?.trim()) query.q = params.q.trim();
    if (params.task_type && params.task_type !== 'all') query.task_type = params.task_type;
    if (params.tags?.length) query.tags = params.tags.join(',');
    if (params.sort) query.sort = params.sort;
    if (params.page) query.page = String(params.page);
    if (params.page_size) query.page_size = String(params.page_size);
    const response = await api.get<InspirationPage>('/inspiration', { params: query });
    return response.data;
  },

  detail: async (taskId: string): Promise<InspirationDetail> => {
    const response = await api.get<InspirationDetail>(`/inspiration/${taskId}`);
    return response.data;
  },

  popularTags: async (limit: number = 30): Promise<PopularTag[]> => {
    const response = await api.get<PopularTag[]>('/tags/popular', { params: { limit } });
    return response.data;
  },

  tagTree: async (): Promise<TagCategoryTree[]> => {
    const response = await api.get<TagCategoryTree[]>('/tags/tree');
    return response.data;
  },

  createTag: async (data: { name: string; parent_id: number }): Promise<TagCategoryItem> => {
    const response = await api.post<TagCategoryItem>('/tags', data);
    return response.data;
  },
};

// ---------------------------------------------------------------------------
// Theme package browse APIs. Editor-only create/update/package APIs live in
// frontend-theme-editor.
// ---------------------------------------------------------------------------

export const themePackageApi = {
  list: async (params: ThemePackageQuery = {}): Promise<ThemePackagePublicPage> => {
    const query: Record<string, string> = {};
    if (params.q?.trim()) query.q = params.q.trim();
    if (params.package_type && params.package_type !== 'all') query.package_type = params.package_type;
    if (params.tags?.length) query.tags = params.tags.join(',');
    if (params.has_digital_human !== undefined) query.has_digital_human = String(params.has_digital_human);
    if (params.sort) query.sort = params.sort;
    if (params.page) query.page = String(params.page);
    if (params.page_size) query.page_size = String(params.page_size);
    const response = await api.get<ThemePackagePublicPage>('/theme-packages', { params: query });
    return response.data;
  },

  mine: async (params: { sort?: ThemePackageSort; page?: number; page_size?: number } = {}): Promise<ThemePackagePage> => {
    const response = await api.get<ThemePackagePage>('/theme-packages/mine', { params });
    return response.data;
  },

  detail: async (packageId: string): Promise<ThemePackageDetail> => {
    const response = await api.get<ThemePackageDetail>(`/theme-packages/${packageId}`);
    return response.data;
  },

  recordView: async (packageId: string): Promise<{ package_id: string; views: number }> => {
    const response = await api.post<{ package_id: string; views: number }>(`/theme-packages/${packageId}/view`);
    return response.data;
  },

  deletePackages: async (packageIds: string[]): Promise<{ package_ids: string[]; deleted_count: number }> => {
    const response = await api.post<{ package_ids: string[]; deleted_count: number }>('/theme-packages/batch-delete', {
      package_ids: packageIds,
    });
    return response.data;
  },

};

// ---------------------------------------------------------------------------
// User auth helpers
// ---------------------------------------------------------------------------

export function getUserToken(): string | null {
  return safeLocalStorageGet(USER_TOKEN_KEY);
}

export function getUserInfo(): UserInfo | null {
  const raw = safeLocalStorageGet(USER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUserAuth(token: string, user: UserInfo, signature?: InkSignature): void {
  resetUserVerifyCache();
  userVerifyCache = {
    token,
    user,
    expiresAt: Date.now() + USER_VERIFY_CACHE_TTL_MS,
  };
  safeLocalStorageSet(USER_TOKEN_KEY, token);
  safeLocalStorageSet(USER_INFO_KEY, JSON.stringify(user));
  if (signature) {
    safeLocalStorageSet(USER_SIGNATURE_KEY, JSON.stringify(signature));
  }
  // Persist last nickname so it survives logout
  if (user.nick_name) {
    safeLocalStorageSet(LAST_NICKNAME_KEY, user.nick_name);
  }
  window.dispatchEvent(new CustomEvent('aigc-auth-change'));
}

export function clearUserAuth(): void {
  resetUserVerifyCache();
  safeLocalStorageRemove(USER_TOKEN_KEY);
  safeLocalStorageRemove(USER_INFO_KEY);
  safeLocalStorageRemove(USER_SIGNATURE_KEY);
  window.dispatchEvent(new CustomEvent('aigc-auth-change'));
}

export function isUserLoggedIn(): boolean {
  return !!safeLocalStorageGet(USER_TOKEN_KEY);
}

export function getLastNickname(): string {
  return safeLocalStorageGet(LAST_NICKNAME_KEY) || '';
}

export function getStoredSignature(): InkSignature | null {
  try {
    const raw = safeLocalStorageGet(USER_SIGNATURE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
