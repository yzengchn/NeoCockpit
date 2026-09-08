import React, { useMemo } from 'react';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import { isUserLoggedIn, socialApi } from '@/services/api';
import type { SocialTargetType } from '@/types/task';
import './LikeSection.css';

interface LikeSectionProps {
  targetType: SocialTargetType;
  targetId?: string;
  likes: number;
  containerStyle?: React.CSSProperties;
  invalidateQueryKeys?: QueryKey[];
  onLiked?: () => void;
}

const LIKE_ENERGY_PARTICLES = Array.from({ length: 16 }, (_, index) => index);

export const LikeSection: React.FC<LikeSectionProps> = ({
  targetType,
  targetId,
  likes,
  containerStyle,
  invalidateQueryKeys,
  onLiked,
}) => {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const resolvedTargetId = targetId ?? '';
  const likedIdsQueryKey = useMemo<QueryKey>(() => ['socialLikedIds', targetType], [targetType]);

  const { data: likedTargetIds } = useQuery({
    queryKey: likedIdsQueryKey,
    queryFn: () => socialApi.listMyLikedTargetIds(targetType),
    enabled: isUserLoggedIn() && Boolean(resolvedTargetId),
    staleTime: 60_000,
  });

  const likedByMe = likedTargetIds?.includes(resolvedTargetId) ?? false;

  const likeMutation = useMutation({
    mutationFn: () => socialApi.like(targetType, resolvedTargetId),
    onSuccess: () => {
      const queryKeys = invalidateQueryKeys ?? [
        ...(targetType === 'theme_package'
          ? [
              ['themes'],
              ['themes', 'detail', resolvedTargetId],
            ]
          : [
              ['task', resolvedTargetId],
              ['inspirationDetail', resolvedTargetId],
              ['tasks'],
              ['inspiration'],
            ]),
      ];
      queryKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
      queryClient.invalidateQueries({ queryKey: likedIdsQueryKey });
      onLiked?.();
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 401) {
        message.warning('请先登录后再点赞');
      } else if (err?.response?.status === 409) {
        message.info(detail || '你已经点赞过该作品');
      } else {
        message.error(detail || '点赞失败，请稍后再试');
      }
    },
  });

  const disabled = !resolvedTargetId || likedByMe || likeMutation.isPending;

  const handleLike = () => {
    if (!resolvedTargetId || likedByMe || likeMutation.isPending) return;
    if (!isUserLoggedIn()) {
      message.warning('请先登录后再点赞');
      return;
    }
    likeMutation.mutate();
  };

  const buttonClassName = [
    'task-detail-like-button',
    likedByMe ? 'task-detail-like-button--liked' : '',
    likeMutation.isPending ? 'task-detail-like-button--pending' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className="task-detail-like-section"
      style={containerStyle}
    >
      <button
        type="button"
        aria-label={likedByMe ? `已点赞，当前${likes}个赞` : `点赞，当前${likes}个赞`}
        onClick={handleLike}
        disabled={disabled}
        className={buttonClassName}
      >
        <span className="task-detail-like-button__particles" aria-hidden="true">
          {LIKE_ENERGY_PARTICLES.map((index) => (
            <span key={index} className="task-detail-like-button__particle" />
          ))}
        </span>
        {likedByMe ? (
          <HeartFilled className="task-detail-like-button__icon" />
        ) : (
          <HeartOutlined className="task-detail-like-button__icon" />
        )}
      </button>
      <div className="task-detail-like-summary" aria-hidden="true">
        <span className="task-detail-like-summary__line" />
        <span className="task-detail-like-button__count">{likes}</span>
        <span className="task-detail-like-summary__line" />
      </div>
    </div>
  );
};
