import React from 'react';
import { CheckOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { NotificationPanelProps } from './types';
import { formatNotificationTime } from './utils';
import './NotificationPanel.css';

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  items,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onOpenLink,
}) => (
  <section className="notification-panel" aria-label="通知" aria-busy={loading}>
    <header className="notification-panel__header">
      <div className="notification-panel__heading">
        <span className="notification-panel__kicker">MESSAGE</span>
        <strong className="notification-panel__title">通知</strong>
        <span className="notification-panel__status">
          {unreadCount > 0 ? `${unreadCount} 条未读` : '暂无未读'}
        </span>
      </div>
      <button
        type="button"
        className="notification-panel__read-all"
        disabled={unreadCount === 0 || loading}
        onClick={onMarkAllRead}
      >
        <CheckOutlined />
        全部已读
      </button>
    </header>

    {items.length === 0 ? (
      <div className="notification-panel__empty">
        <span className="notification-panel__empty-mark">--</span>
        <span>暂无通知</span>
      </div>
    ) : (
      <div className="notification-panel__list">
        {items.map((item) => (
          <article
            key={item.id}
            className={[
              'notification-panel__item',
              `notification-panel__item--${item.level}`,
              item.is_read ? 'notification-panel__item--read' : 'notification-panel__item--unread',
            ].join(' ')}
            onClick={() => { if (!item.is_read) onMarkRead(item); }}
            onKeyDown={(event) => {
              if (item.is_read) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onMarkRead(item);
              }
            }}
            role={item.is_read ? undefined : 'button'}
            tabIndex={item.is_read ? -1 : 0}
            aria-label={`${item.title}${item.is_read ? '' : '，未读'}`}
          >
            <div className="notification-panel__item-head">
              <span className="notification-panel__level-dot" aria-hidden="true" />
              <strong className="notification-panel__item-title">{item.title}</strong>
              <time className="notification-panel__time">{formatNotificationTime(item.created_at)}</time>
            </div>
            <div className="notification-panel__item-body">
              <span className="notification-panel__content">{item.content}</span>
              {item.link_url && (
                <button
                  type="button"
                  aria-label="直达任务详情"
                  className="notification-panel__link"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!item.is_read) onMarkRead(item);
                    onOpenLink(item);
                  }}
                >
                  直达
                  <ArrowRightOutlined />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
);
