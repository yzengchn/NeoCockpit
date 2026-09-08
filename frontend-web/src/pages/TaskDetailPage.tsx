import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntdApp, Spin } from 'antd';
import { AppHeader } from '@/components/AppHeader';
import AuthModal from '@/components/AuthModal';
import { PublishModal } from '@/components/PublishModal';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import { usePresence } from '@/hooks/usePresence';
import { useUser } from '@/contexts/UserContext';
import { taskApi, userApi } from '@/services/api';
import { TaskStatus, TaskType, ThemePackageType, isActiveTaskStatus } from '@/types/task';
import type { InkSignature, UserInfo } from '@/types/task';
import type { PreviewViewMode } from '@/components/ImagePreview';
import { statusConfig } from '@/constants/status';
import { toThemeEditorUrl } from '@/utils/themeEditor';
import { toResourceUrl } from '@/utils/url';
import { clearTimeoutSafe, setTimeoutSafe } from '@/utils/timers';
import {
  DigitalHumanTaskDetailPage,
  DiyTaskDetailPage,
  StickerPackTaskDetailPage,
  ThemeTaskDetailPage,
  WallpaperTaskDetailPage,
  type TaskDetailViewProps,
} from './task-details';
import { collectBuildImages, createSingleImageBuildTree, getDefaultPreviewImagePath } from './task-details/resourceUtils';
import './TaskDetailPage.css';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const getApiErrorInfo = (error: unknown) => {
  if (!isRecord(error) || !isRecord(error.response)) {
    return {};
  }

  const { response } = error;
  const data = isRecord(response.data) ? response.data : undefined;

  return {
    status: typeof response.status === 'number' ? response.status : undefined,
    detail: typeof data?.detail === 'string' ? data.detail : undefined,
  };
};


const getDetailProgress = (status: TaskStatus, fallback: number) => {
  if (status === TaskStatus.GENERATING_BG || status === TaskStatus.GENERATING_AVATAR) return 35;
  if (status === TaskStatus.GENERATING_ICONS || status === TaskStatus.GENERATING_TEXTURES) return 55;
  if (status === TaskStatus.SLICING) return 70;
  if (status === TaskStatus.COMPOSITING) return 85;
  if (status === TaskStatus.PROCESSING) return 15;
  if (status === TaskStatus.QUEUED) return 5;
  return fallback;
};

export const TaskDetailPage: FC = () => {
  const { message } = AntdApp.useApp();
  const { taskId } = useParams<{ taskId: string }>();
  const queryClient = useQueryClient();
  const [selectedImagePath, setSelectedImagePath] = useState<string>();
  const [selectedDirectory, setSelectedDirectory] = useState<string>();
  const [previewViewMode, setPreviewViewMode] = useState<PreviewViewMode>('single');
  const [downloading, setDownloading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [retryDisabled, setRetryDisabled] = useState(false);
  const { currentUser, login, logout } = useUser();
  const retryCooldownTimerRef = useRef<ReturnType<typeof setTimeoutSafe>>();
  const { isIdle } = useIdleDetector();
  usePresence();

  const clearRetryCooldownTimer = useCallback(() => {
    if (retryCooldownTimerRef.current === undefined) return;
    clearTimeoutSafe(retryCooldownTimerRef.current);
    retryCooldownTimerRef.current = undefined;
  }, []);

  useEffect(() => () => clearRetryCooldownTimer(), [clearRetryCooldownTimer]);

  const handleUserLogin = useCallback((token: string, user: Record<string, unknown>, signature?: InkSignature) => {
    login(token, user as unknown as UserInfo, signature);
    setAuthModalOpen(false);
  }, [login]);

  const handleLogout = useCallback(() => {
    logout();
    queryClient.invalidateQueries();
  }, [logout, queryClient]);

  const retryMutation = useMutation({
    mutationFn: () => taskApi.retryTask(taskId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['my-credits'] });
      setRetryDisabled(true);
      clearRetryCooldownTimer();
      retryCooldownTimerRef.current = setTimeoutSafe(() => {
        setRetryDisabled(false);
        retryCooldownTimerRef.current = undefined;
      }, 3000);
    },
    onError: (error: unknown) => {
      const { status, detail } = getApiErrorInfo(error);

      if (status === 401) {
        message.warning('请先登录');
        setAuthModalOpen(true);
      } else if (status === 402) {
        message.error(detail || '积分不足');
      } else if (status === 403) {
        message.error('只有任务创建者才能再次生成');
      } else {
        message.error('操作失败，请稍后重试');
      }
    },
  });

  const { data: creditPrices } = useQuery({
    queryKey: ['credit-prices'],
    queryFn: () => userApi.getCreditPrices(),
    staleTime: 60_000,
  });

  useQuery({
    queryKey: ['my-credits'],
    queryFn: () => userApi.getCredits(),
    enabled: Boolean(currentUser),
    staleTime: 10_000,
  });

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId!),
    enabled: !!taskId,
    refetchInterval: isIdle ? false : (query) =>
      isActiveTaskStatus(query.state.data?.status) ? 2000 : false,
  });
  const isLoggedIn = Boolean(currentUser);
  const isOwnTask = Boolean(task?.user_id && currentUser?.id === task.user_id);

  const resourceTree = useMemo(() => {
    if (task?.status !== TaskStatus.COMPLETED) return undefined;
    return task.build_tree ?? createSingleImageBuildTree(task);
  }, [task]);

  const allBuildImages = useMemo(() => {
    if (!resourceTree || task?.status !== TaskStatus.COMPLETED) return undefined;
    const images = collectBuildImages(resourceTree);
    return images.length > 0 ? images : undefined;
  }, [resourceTree, task?.status]);

  const filteredBuildImages = useMemo(() => {
    if (!allBuildImages) return undefined;
    if (!selectedDirectory) return allBuildImages;
    return allBuildImages.filter(img => img.name.startsWith(`${selectedDirectory}/`));
  }, [allBuildImages, selectedDirectory]);

  useEffect(() => {
    setSelectedImagePath(undefined);
    setSelectedDirectory(undefined);
    setPreviewViewMode('single');
  }, [taskId]);

  const defaultPreviewImagePath = useMemo(() => {
    return getDefaultPreviewImagePath(task, resourceTree);
  }, [task, resourceTree]);

  const previewImagePath = selectedImagePath ?? (selectedDirectory ? undefined : defaultPreviewImagePath);

  const handleSelectFile = (path: string, isDirectory: boolean) => {
    if (isDirectory) {
      setSelectedDirectory(path);
      setPreviewViewMode('grid');
      setSelectedImagePath(undefined);
    } else {
      const parentDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
      setSelectedDirectory(parentDir);
      setSelectedImagePath(path);
      setPreviewViewMode('single');
    }
  };

  const appHeader = (
    <AppHeader
      currentUser={currentUser}
      onLogin={() => setAuthModalOpen(true)}
      onLogout={handleLogout}
    />
  );

  const authModal = (
    <AuthModal
      open={authModalOpen}
      onLogin={(token, user, signature) => {
        handleUserLogin(token, user, signature);
        queryClient.invalidateQueries({ queryKey: ['my-credits'] });
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      }}
      onRegister={userApi.register}
      onLoginBySignature={userApi.login}
      onCancel={() => setAuthModalOpen(false)}
    />
  );

  if (isLoading || !task) {
    return (
      <>
        {appHeader}
        <div className="task-detail-cockpit task-detail-cockpit--loading">
          <main className="web-page-shell task-detail-page task-detail-page--loading">
            <Spin size="large" />
          </main>
        </div>
        {authModal}
      </>
    );
  }

  const cfg = statusConfig[task.status] || statusConfig[TaskStatus.QUEUED];
  const canCreateThemePackage = isOwnTask && task.status === TaskStatus.COMPLETED && task.task_type !== TaskType.STICKER_PACK;
  const downloadStartedLabel = task.task_type === TaskType.STICKER_PACK ? '贴纸打印包下载已开始' : '下载已开始';
  const editorPackageType = task.task_type === TaskType.DIGITAL_HUMAN
    ? ThemePackageType.COCKPIT_3D
    : ThemePackageType.FLAT_COCKPIT;
  const themeEditorPath = `/?task_id=${encodeURIComponent(task.task_id)}&type=${editorPackageType}`;
  const themeEditorUrl = toThemeEditorUrl(themeEditorPath);
  const portraitMeshUrl = task.task_type === TaskType.DIGITAL_HUMAN && task.status === TaskStatus.COMPLETED
    ? `/api/resource/${task.task_id}/product/mesh/portrait_3d_mesh.json`
    : undefined;
  const progressPercent = getDetailProgress(task.status, cfg.progress);
  const heroPreviewUrl = defaultPreviewImagePath ? toResourceUrl(defaultPreviewImagePath) : undefined;
  const downloadCreditSuffix = (() => {
    if (isOwnTask) return '';
    const price = creditPrices?.find(c => c.action === 'download');
    if (price && price.price > 0) return ` (${price.price}积分)`;
    return '';
  })();

  const handleDownload = async () => {
    if (!isLoggedIn) {
      setAuthModalOpen(true);
      return;
    }
    if (downloading) return;
    setDownloading(true);
    try {
      const ticket = await taskApi.downloadZip(task.task_id);
      if (ticket.charged && ticket.credits_cost > 0) message.success(`${downloadStartedLabel}（消耗${ticket.credits_cost}积分）`);
      else message.success(downloadStartedLabel);
      if (ticket.charged) queryClient.invalidateQueries({ queryKey: ['my-credits'] });
    } finally {
      setDownloading(false);
    }
  };

  const viewProps: TaskDetailViewProps = {
    task,
    isLoggedIn,
    isOwnTask,
    progressPercent,
    heroPreviewUrl,
    retryLoading: retryMutation.isPending,
    retryDisabled,
    onRetry: () => retryMutation.mutate(),
    onRequireAuth: () => setAuthModalOpen(true),
    onOpenPublish: () => setPublishModalOpen(true),
    canCreateThemePackage,
    themeEditorUrl,
    downloading,
    onDownload: handleDownload,
    downloadCreditSuffix,
    resourceTree,
    allBuildImages,
    filteredBuildImages,
    previewImagePath,
    previewViewMode,
    onSelectFile: handleSelectFile,
    onSelectImage: (path) => setSelectedImagePath(path),
    onViewModeChange: setPreviewViewMode,
    portraitMeshUrl,
  };

  const detailPage = (() => {
    switch (task.task_type) {
      case TaskType.WALLPAPER:
        return <WallpaperTaskDetailPage {...viewProps} />;
      case TaskType.THEME:
        return <ThemeTaskDetailPage {...viewProps} />;
      case TaskType.DIGITAL_HUMAN:
        return <DigitalHumanTaskDetailPage {...viewProps} />;
      case TaskType.DIY:
        return <DiyTaskDetailPage {...viewProps} />;
      case TaskType.STICKER_PACK:
        return <StickerPackTaskDetailPage {...viewProps} />;
      default:
        return <ThemeTaskDetailPage {...viewProps} />;
    }
  })();

  return (
    <>
      {appHeader}
      {detailPage}
      {authModal}
      <PublishModal
        open={publishModalOpen}
        taskId={task.task_id}
        currentTags={task.tags ?? null}
        isVisible={task.is_visible ?? false}
        onSuccess={() => {
          setPublishModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        }}
        onCancel={() => setPublishModalOpen(false)}
      />
    </>
  );
};
