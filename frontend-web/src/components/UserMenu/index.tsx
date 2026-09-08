import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Popover } from 'antd';
import {
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';

import { NotificationPanel } from '@/components/NotificationPanel';
import type { UserInfo, UserNotification } from '@/types/task';
import './UserMenu.css';

interface UserMenuProps {
  user: UserInfo;
  notifications: UserNotification[];
  unreadCount: number;
  notificationLoading: boolean;
  onMarkMessageRead: (item: UserNotification) => void;
  onMarkAllNotificationsRead: () => void;
  onOpenNotificationLink: (item: UserNotification) => void;
  onNotificationPanelOpen?: () => void;
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  notifications,
  unreadCount,
  notificationLoading,
  onMarkMessageRead,
  onMarkAllNotificationsRead,
  onOpenNotificationLink,
  onNotificationPanelOpen,
  onLogout,
}) => {
  const navigate = useNavigate();
  const hasUnread = unreadCount > 0;
  const handleNotificationOpenChange = React.useCallback((open: boolean) => {
    if (open) onNotificationPanelOpen?.();
  }, [onNotificationPanelOpen]);

  return (
    <div className="user-menu">
      <Popover
        content={(
          <NotificationPanel
            items={notifications}
            unreadCount={unreadCount}
            loading={notificationLoading}
            onMarkRead={onMarkMessageRead}
            onMarkAllRead={onMarkAllNotificationsRead}
            onOpenLink={onOpenNotificationLink}
          />
        )}
        trigger="click"
        placement="bottomRight"
        rootClassName="notification-popover"
        onOpenChange={handleNotificationOpenChange}
      >
        <Badge
          className="user-menu__notification-badge"
          count={unreadCount}
          size="small"
          overflowCount={99}
        >
          <Button
            type="text"
            size="small"
            icon={<BellOutlined />}
            aria-label="通知"
            className={[
              'user-menu__notification-btn',
              hasUnread ? 'user-menu__notification-btn--active' : '',
            ].filter(Boolean).join(' ')}
          />
        </Badge>
      </Popover>
      <Popover
        content={(
          <div className="user-menu-popover" role="menu">
            <button
              type="button"
              className="user-menu-popover__item"
              onClick={() => navigate('/profile')}
              role="menuitem"
            >
              <UserOutlined className="user-menu-popover__icon user-menu-popover__icon--profile" />
              个人中心
            </button>
            <button
              type="button"
              className="user-menu-popover__item user-menu-popover__item--danger"
              onClick={onLogout}
              role="menuitem"
            >
              <LogoutOutlined className="user-menu-popover__icon user-menu-popover__icon--logout" />
              退出登录
            </button>
          </div>
        )}
        trigger="click"
        placement="bottom"
        rootClassName="user-menu-popover-root"
      >
        <button type="button" className="user-menu__account" aria-label="用户菜单">
          <UserOutlined />
          <span>{user.nick_name}</span>
        </button>
      </Popover>
    </div>
  );
};

export default UserMenu;
