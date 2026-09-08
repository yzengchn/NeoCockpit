import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag, Typography, Space } from 'antd';
import { EyeOutlined, HeartFilled } from '@ant-design/icons';
import { TaskListItem, TaskType } from '@/types/task';
import { TASK_TYPE_CONFIG } from '@/constants/taskType';
import { toResourceUrl } from '@/utils/url';
import { statusConfig } from '@/constants/status';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;

interface TaskCardProps {
  task: TaskListItem;
  showLikes?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (taskId: string) => void;
}

export const TaskCard = React.memo<TaskCardProps>(({
  task,
  showLikes = false,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}) => {
  const navigate = useNavigate();
  const cfg = statusConfig[task.status];
  const typeConfig = TASK_TYPE_CONFIG[task.task_type];
  const isDigitalHuman = task.task_type === TaskType.DIGITAL_HUMAN;
  const coverImageUrl = toResourceUrl(task.background_image_url || '');
  const hasImage = Boolean(coverImageUrl);
  const typeIcon = React.cloneElement(typeConfig.icon as React.ReactElement<{ style?: React.CSSProperties }>, {
    style: {
      fontSize: 36,
      color: typeConfig.accent,
      opacity: 0.6,
      filter: `drop-shadow(0 0 12px ${typeConfig.accent}50)`,
    },
  });
  const taskHref = `/tasks/${task.task_id}`;

  const handleOpenTask = () => {
    if (selectionMode) {
      onToggleSelect?.(task.task_id);
      return;
    }
    navigate(taskHref);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (selectionMode) {
        onToggleSelect?.(task.task_id);
      } else {
        navigate(taskHref);
      }
    }
  };

  return (
    <div
      className={[
        'task-card-link',
        selectionMode ? 'is-selectable' : '',
        selected ? 'is-selected' : '',
      ].filter(Boolean).join(' ')}
      role={selectionMode ? 'checkbox' : 'link'}
      tabIndex={0}
      aria-checked={selectionMode ? selected : undefined}
      aria-label={selectionMode ? `${selected ? '取消选择' : '选择'}任务：${task.user_input}` : `查看任务详情：${task.user_input}`}
      onClick={handleOpenTask}
      onKeyDown={handleKeyDown}
      style={{
        display: 'block',
        height: '100%',
        color: 'inherit',
        textDecoration: 'none',
        cursor: selectionMode ? 'pointer' : undefined,
      }}
    >
    <Card
      className="task-card"
      hoverable
      style={{
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--c-border)',
        boxShadow: 'var(--shadow-card)',
        cursor: 'pointer',
        background: 'var(--c-bg-card-solid)',
      }}
      styles={{ body: { padding: 0 } }}
      cover={
        <div className="task-card__cover" style={{ height: 232, overflow: 'hidden', background: cfg.bg, position: 'relative' }}>
          {hasImage ? (
            <img
              alt="preview"
              src={coverImageUrl}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {typeIcon}
            </div>
          )}

          {/* ── Scan overlays ── */}
          <div className="task-card__scan-left" />
          <div className="task-card__scan-bottom" />

          {selectionMode && (
            <div className="task-card__select-mark" aria-hidden="true">
              <span />
            </div>
          )}

          {/* status badge */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: `${cfg.color}20`, border: `1px solid ${cfg.color}40`,
            color: cfg.color, padding: '4px 14px', borderRadius: 'var(--radius-sm)',
            fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
            letterSpacing: '0.3px',
            boxShadow: `0 0 12px ${cfg.color}15`,
          }}>
            {React.cloneElement(cfg.icon as React.ReactElement, { style: { fontSize: 12 } })}
            {' '}{cfg.text}
          </div>
        </div>
      }
    >
      <div className="task-card__body" style={{ padding: '12px 14px 14px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size={6}>
          <Text ellipsis style={{
            fontSize: 13, lineHeight: '22px', fontWeight: 500,
            color: 'var(--c-text)', height: 22, display: 'block',
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>
            {task.user_input}
          </Text>
          <div className="task-card__meta" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 8, borderTop: '1px solid var(--c-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Tag className="neon-tag" style={{
                background: typeConfig.gradient,
                color: '#fff',
                margin: 0,
              }}>
                {typeConfig.label}
              </Tag>
              {isDigitalHuman && (
                <Tag className="neon-tag" style={{
                  background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                  color: '#fff',
                  margin: 0,
                }}>
                  肖像
                </Tag>
              )}
              {task.ai_provider && (
                <Tag className="neon-tag" style={{
                  background: task.ai_provider.toLowerCase() === 'openai'
                    ? 'linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%)'
                    : task.ai_provider.toLowerCase() === 'doubao'
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : task.ai_provider.toLowerCase() === 'dashscope'
                    ? 'linear-gradient(135deg, #ff6a00 0%, #ee5a00 100%)'
                    : 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-accent) 100%)',
                  color: '#fff',
                  margin: 0,
                }}>
                  {task.ai_provider.toUpperCase()}
                </Tag>
              )}
            </div>
            <div className="task-card__metrics" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginLeft: 'auto', flexShrink: 0,
            }}>
              <span style={{
                fontSize: 12, fontWeight: 500, color: 'var(--c-text-muted)',
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: 'var(--font-mono)',
              }}>
                <EyeOutlined style={{ fontSize: 12 }} />
                {task.views ?? 0}
              </span>
              {showLikes && (task.likes ?? 0) > 0 && (
                <span style={{
                  fontSize: 12, fontWeight: 500, color: '#ef4444',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontFamily: 'var(--font-mono)',
                }}>
                  <HeartFilled style={{ fontSize: 12 }} />
                  {task.likes}
                </span>
              )}
              <Text style={{ fontSize: 12, color: 'var(--c-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {dayjs(task.created_at).fromNow()}
              </Text>
            </div>
          </div>
        </Space>
      </div>
    </Card>
    </div>
  );
});
