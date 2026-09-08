import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Row, Col, Spin, Empty } from 'antd';
import { FireFilled, HeartFilled } from '@ant-design/icons';
import { TaskCard } from './TaskCard';
import { BulkSelectionBar } from '@/components/BulkSelectionBar';
import { Reveal } from '@/components/Reveal';
import { useScrollLoadMore } from '@/hooks/useScrollLoadMore';
import { TaskType } from '@/types/task';
import type { TaskListItem } from '@/types/task';
import { TASK_TYPE_CONFIG, TASK_TYPE_ORDER } from '@/constants/taskType';

export type TaskFilter = 'all' | 'likeRanking' | 'viewRanking' | TaskType.WALLPAPER | TaskType.THEME | TaskType.DIGITAL_HUMAN | TaskType.STICKER_PACK | TaskType.DIY;

type RankFilter = Extract<TaskFilter, 'all' | 'likeRanking' | 'viewRanking'>;

const RANK_FILTERS: Array<{
  key: RankFilter;
  label: string;
  icon?: 'like' | 'hot';
}> = [
  { key: 'all', label: '我的作品' },
  { key: 'likeRanking', label: '点赞排行', icon: 'like' },
  { key: 'viewRanking', label: '热度排行', icon: 'hot' },
];

interface TaskListProps {
  tasks: TaskListItem[];
  loading: boolean;
  activeFilter: TaskFilter;
  counts: Record<TaskFilter, number>;
  hasMore: boolean;
  loadingMore: boolean;
  isLoggedIn?: boolean;
  selectionMode?: boolean;
  selectedTaskIds?: string[];
  bulkDeleting?: boolean;
  onFilterChange: (filter: TaskFilter) => void;
  onLoadMore: () => void;
  onSelectionChange?: (taskIds: string[]) => void;
  onDeleteSelectedTasks?: (taskIds: string[]) => Promise<void> | void;
}

export const TaskList = React.memo(function TaskList({
  tasks,
  loading,
  activeFilter,
  counts,
  hasMore,
  loadingMore,
  isLoggedIn = true,
  selectionMode = false,
  selectedTaskIds = [],
  bulkDeleting = false,
  onFilterChange,
  onLoadMore,
  onSelectionChange,
  onDeleteSelectedTasks,
}: TaskListProps) {
  const loadMoreRef = useScrollLoadMore<HTMLDivElement>({
    hasMore,
    loadingMore,
    onLoadMore,
    resetDeps: [activeFilter],
  });

  const filterOptions: Array<{
    key: TaskFilter;
    label: string;
    count: number;
  }> = useMemo(() => [
    ...TASK_TYPE_ORDER.map((taskType) => ({
      key: taskType,
      label: TASK_TYPE_CONFIG[taskType].filterLabel,
      count: counts[taskType],
    })),
    { key: 'all' as const, label: '任务', count: counts.all },
  ], [counts]);

  const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds]);
  const selectedTaskIdsRef = useRef(selectedTaskIds);
  useEffect(() => {
    selectedTaskIdsRef.current = selectedTaskIds;
  }, [selectedTaskIds]);
  const visibleTaskIds = useMemo(() => tasks.map((task) => task.task_id), [tasks]);
  const allVisibleSelected = visibleTaskIds.length > 0 && visibleTaskIds.every((taskId) => selectedTaskIdSet.has(taskId));

  const handleToggleVisibleSelection = useCallback(() => {
    if (!onSelectionChange) return;
    const next = new Set(selectedTaskIdsRef.current);
    if (allVisibleSelected) {
      visibleTaskIds.forEach((taskId) => next.delete(taskId));
    } else {
      visibleTaskIds.forEach((taskId) => next.add(taskId));
    }
    onSelectionChange(Array.from(next));
  }, [allVisibleSelected, onSelectionChange, visibleTaskIds]);

  const handleToggleTaskSelection = useCallback((taskId: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedTaskIdsRef.current);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    onSelectionChange(Array.from(next));
  }, [onSelectionChange]);

  const handleConfirmDelete = useCallback(() => {
    return onDeleteSelectedTasks?.(selectedTaskIds);
  }, [onDeleteSelectedTasks, selectedTaskIds]);

  if (loading) {
    return (
      <div className="task-list-section__loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="task-list-section">
      <div className="task-list-toolbar">
        <div className="task-list-rank-tabs">
          {RANK_FILTERS.map((option, index) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onFilterChange(option.key)}
              aria-pressed={activeFilter === option.key}
              className={[
                'task-list-rank-button',
                `task-list-rank-button--${option.key}`,
                activeFilter === option.key ? 'is-active' : '',
                index === 0 ? 'is-first' : '',
                index === RANK_FILTERS.length - 1 ? 'is-last' : '',
              ].filter(Boolean).join(' ')}
            >
              {option.icon === 'like' && <HeartFilled className="task-list-rank-button__icon" />}
              {option.icon === 'hot' && <FireFilled className="task-list-rank-button__icon" />}
              {option.label}
            </button>
          ))}
        </div>
        <div className="task-list-type-filters">
          {filterOptions.map((option) => {
            const active = activeFilter === option.key;
            const className = [
              'task-list-type-button',
              `task-list-type-button--${option.key}`,
              option.key !== 'all' ? 'is-task-type' : '',
              active ? 'is-active' : '',
            ].filter(Boolean).join(' ');

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onFilterChange(option.key)}
                className={className}
                aria-pressed={active}
              >
                <span className="task-list-type-button__count">
                  {option.count}
                </span>
                个{option.label}
              </button>
            );
          })}
        </div>
      </div>
      {selectionMode && (
        <BulkSelectionBar
          selectedCount={selectedTaskIds.length}
          itemLabel="任务"
          visibleCount={tasks.length}
          allVisibleSelected={allVisibleSelected}
          deleting={bulkDeleting}
          deleteTitle="删除选中的任务？"
          onToggleVisibleSelection={handleToggleVisibleSelection}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
      {tasks.length === 0 ? (
        <Empty
          description={
            <span className="task-list-section__empty-text">
              {!isLoggedIn ? '登录后可以查看自己的创作作品' : counts.all === 0 ? '暂无任务，快来创建第一个' : '当前类型暂无任务'}
            </span>
          }
          className="task-list-section__empty"
        />
      ) : (
        <>
          <Row className="task-list-grid" gutter={[16, 16]}>
            {tasks.map((task, i) => (
              <Col key={task.task_id} xs={24} sm={12} md={8} lg={6} className="task-list-grid__item">
                <Reveal variant="up" delay={i * 40}>
                  <TaskCard
                    task={task}
                    showLikes={activeFilter === 'likeRanking'}
                    selectionMode={selectionMode}
                    selected={selectedTaskIdSet.has(task.task_id)}
                    onToggleSelect={handleToggleTaskSelection}
                  />
                </Reveal>
              </Col>
            ))}
          </Row>
          {hasMore && (
            <div
              ref={loadMoreRef}
              className="task-list-section__sentinel"
            >
              {loadingMore && <Spin />}
            </div>
          )}
          {!hasMore && tasks.length > 0 && (
            <div className="task-list-section__end">
              — 已加载全部 —
            </div>
          )}
        </>
      )}
    </div>
  );
});
