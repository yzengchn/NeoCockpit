import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as AntdApp, Card, Row, Col, Table } from 'antd';
import {
  UserOutlined, CalendarOutlined, FireOutlined,
  EyeOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { AppHeader } from '@/components/AppHeader';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { userApi, getStoredSignature } from '@/services/api';
import { useUser } from '@/contexts/UserContext';
import { useNotifications } from '@/hooks/useNotifications';
import { ACTION_LABELS, InkSignature, UserInfo } from '@/types/task';
import { usePresence } from '@/hooks/usePresence';
import AuthModal from '@/components/AuthModal';
import './ProfilePage.css';

const DIR_ARROWS = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

/* ─── SignatureStroke ─── */
const SignatureStroke: React.FC<{ signature: InkSignature; size?: number }> = ({
  signature,
  size = 200,
}) => {
  const pts = signature.raw_points;
  const [hovered, setHovered] = useState(false);

  if (!pts || pts.length < 2) return <SignatureGrid signature={signature} size={size} />;

  const pathData = pts
    .map((p, i) => {
      const x = p.x * size;
      const y = p.y * size;
      return i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div
      style={{ position: 'relative', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width={size} height={size} style={{ borderRadius: 12, background: 'rgba(14,16,24,0.6)' }}>
        {Array.from({ length: 2 }, (_, i) => {
          const pos = ((i + 1) / 3) * size;
          return [
            <line key={`v-${i}`} x1={pos} y1={0} x2={pos} y2={size}
              stroke="rgba(129,140,248,0.1)" strokeWidth={1} strokeDasharray="4 4" />,
            <line key={`h-${i}`} x1={0} y1={pos} x2={size} y2={pos}
              stroke="rgba(129,140,248,0.1)" strokeWidth={1} strokeDasharray="4 4" />,
          ];
        }).flat()}
        <path
          d={pathData}
          fill="none"
          stroke="#818cf8"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
        {(() => {
          const s = pts[0];
          return <circle cx={s.x * size} cy={s.y * size} r={5}
            fill="#22c55e" stroke="rgba(34,197,94,0.3)" strokeWidth={2} />;
        })()}
        {(() => {
          const e = pts[pts.length - 1];
          return <circle cx={e.x * size} cy={e.y * size} r={5}
            fill="#ef4444" stroke="rgba(239,68,68,0.3)" strokeWidth={2} />;
        })()}
      </svg>
      {!hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: 12,
          background: 'rgba(8,9,13,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6,
          color: 'var(--c-text-muted)', fontSize: 12,
          transition: 'opacity 0.2s',
        }}>
          <EyeOutlined style={{ fontSize: 16 }} />
          悬停查看笔迹
        </div>
      )}
    </div>
  );
};

/* ─── SignatureGrid ─── */
const SignatureGrid: React.FC<{ signature: InkSignature; size?: number }> = ({
  signature,
  size = 200,
}) => {
  const [visible, setVisible] = useState(false);
  const gridSize = 3;
  const cellSize = size / gridSize;
  const traversal = signature.grid_traversal;
  const directions = signature.direction_sequence;
  const uniqueCells = useMemo(() => new Set(traversal), [traversal]);

  const cellCenters = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (let i = 0; i < gridSize * gridSize; i++) {
      const col = i % gridSize;
      const row = Math.floor(i / gridSize);
      map.set(i, { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 });
    }
    return map;
  }, [cellSize]);

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        style={{
          width: '100%', minHeight: size,
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--c-text-muted)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, cursor: 'pointer', padding: 12,
        }}
      >
        <EyeOutlined style={{ fontSize: 18, color: 'var(--c-accent)' }} />
        <span style={{ fontSize: 12 }}>点击查看量化路径图</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setVisible(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        width: '100%', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
      }}
    >
      <svg width={size} height={size} style={{ borderRadius: 12, background: 'rgba(14,16,24,0.6)' }}>
        {Array.from({ length: gridSize * gridSize }, (_, i) => {
          const col = i % gridSize;
          const row = Math.floor(i / gridSize);
          const filled = uniqueCells.has(i);
          return (
            <rect key={`cell-${i}`}
              x={col * cellSize + 1} y={row * cellSize + 1}
              width={cellSize - 2} height={cellSize - 2} rx={6}
              fill={filled ? 'rgba(129,140,248,0.25)' : 'rgba(99,102,241,0.05)'}
              stroke={filled ? 'rgba(129,140,248,0.35)' : 'rgba(99,102,241,0.1)'}
              strokeWidth={1}
            />
          );
        })}
        {Array.from({ length: gridSize - 1 }, (_, i) => {
          const pos = (i + 1) * cellSize;
          return [
            <line key={`v-${i}`} x1={pos} y1={0} x2={pos} y2={size}
              stroke="rgba(129,140,248,0.15)" strokeWidth={1} strokeDasharray="4 4" />,
            <line key={`h-${i}`} x1={0} y1={pos} x2={size} y2={pos}
              stroke="rgba(129,140,248,0.15)" strokeWidth={1} strokeDasharray="4 4" />,
          ];
        }).flat()}
        {traversal.length > 1 && (
          <polyline
            points={traversal.map((cell) => `${cellCenters.get(cell)!.x},${cellCenters.get(cell)!.y}`).join(' ')}
            fill="none" stroke="rgba(129,140,248,0.6)" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        {directions.map((dir, i) => {
          if (i >= traversal.length - 1) return null;
          const from = cellCenters.get(traversal[i])!;
          const to = cellCenters.get(traversal[i + 1])!;
          return (
            <text key={`dir-${i}`}
              x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 + 4}
              textAnchor="middle" fill="rgba(167,139,250,0.9)" fontSize={11} fontFamily="monospace"
            >{DIR_ARROWS[dir]}</text>
          );
        })}
        {traversal.length > 0 && (() => {
          const start = cellCenters.get(traversal[0])!;
          const end = cellCenters.get(traversal[traversal.length - 1])!;
          return [
            <circle key="start" cx={start.x} cy={start.y} r={5}
              fill="#22c55e" stroke="rgba(34,197,94,0.3)" strokeWidth={2} />,
            <circle key="end" cx={end.x} cy={end.y} r={5}
              fill="#ef4444" stroke="rgba(239,68,68,0.3)" strokeWidth={2} />,
          ];
        })()}
      </svg>
      <span style={{ color: 'var(--c-text-muted)', fontSize: 10 }}>点击隐藏量化路径图</span>
    </button>
  );
};

/* ─── CheckInCalendar ─── */
const CheckInCalendar: React.FC<{
  checkedDates: string[];
  todayChecked: boolean;
  streak: number;
  month: string;
  onCheckIn: () => void;
  checking: boolean;
}> = ({ checkedDates, todayChecked, streak, month, onCheckIn, checking }) => {
  const checkedSet = useMemo(() => new Set(checkedDates), [checkedDates]);

  const { daysInMonth, firstDayOffset } = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstDow = new Date(y, m - 1, 1).getDay();
    const firstDayOffset = firstDow === 0 ? 6 : firstDow - 1;
    return { daysInMonth, firstDayOffset };
  }, [month]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="profile-checkin__header">
        <CalendarOutlined className="profile-checkin__icon" />
        <span className="profile-checkin__label">签到日历</span>
        <span className="profile-checkin__month">{month}</span>
      </div>

      <div className={`profile-checkin__streak-bar ${todayChecked ? 'profile-checkin__streak-bar--checked' : 'profile-checkin__streak-bar--unchecked'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <FireOutlined className="profile-checkin__streak-fire" style={{ color: streak > 0 ? '#f59e0b' : 'var(--c-text-muted)' }} />
          <span className="profile-checkin__streak-text">
            连续签到 <b className="profile-checkin__streak-count" style={{ color: streak > 0 ? '#f59e0b' : 'var(--c-text-muted)' }}>{streak}</b> 天
          </span>
        </div>
        <button
          type="button"
          className={`profile-checkin__btn ${todayChecked ? 'profile-checkin__btn--done' : 'profile-checkin__btn--active'}`}
          disabled={todayChecked || checking}
          onClick={onCheckIn}
        >
          {todayChecked ? '✓ 已签到' : '签到 +10💰'}
        </button>
      </div>

      <div className="profile-checkin__calendar">
        {WEEKDAYS.map(d => (
          <div key={d} className="profile-checkin__weekday">{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`blank-${idx}`} />;
          const dateStr = `${month}-${String(day).padStart(2, '0')}`;
          const checked = checkedSet.has(dateStr);
          const isToday = dateStr === todayStr;
          let cls = 'profile-checkin__day';
          if (checked) cls += ' profile-checkin__day--checked';
          else if (isToday) cls += ' profile-checkin__day--today';
          else cls += ' profile-checkin__day--normal';
          return (
            <div key={day} className={cls}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── ProfilePage ─── */
const ProfilePage: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { currentUser, login, logout } = useUser();
  const {
    notifications,
    unreadNotificationCount,
    notificationLoading,
    handleNotificationPanelOpen,
    handleMarkMessageRead,
    handleMarkAllNotificationsRead,
  } = useNotifications(currentUser?.id);

  usePresence();

  const handleUserLogin = useCallback((token: string, user: Record<string, unknown>, signature?: InkSignature) => {
    login(token, user as unknown as UserInfo, signature);
    setAuthModalOpen(false);
  }, [login]);

  const handleLogout = useCallback(() => {
    logout();
    queryClient.invalidateQueries();
    navigate('/');
  }, [logout, navigate, queryClient]);

  const user = currentUser;
  const signature = useMemo(() => getStoredSignature(), []);

  const { data: creditsData } = useQuery({
    queryKey: ['user-credits'],
    queryFn: userApi.getCredits,
  });
  const credits = creditsData?.credits;
  const creditPrices = creditsData?.prices;

  const { data: checkInData, refetch: refetchCheckIn } = useQuery({
    queryKey: ['checkIn'],
    queryFn: userApi.getCheckInStatus,
  });

  const { data: creditHistoryData, fetchNextPage: fetchNextCreditPage, hasNextPage: hasMoreCredits } = useInfiniteQuery({
    queryKey: ['creditHistory'],
    queryFn: ({ pageParam = 0 }) => userApi.getCreditHistory(pageParam, 8),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    initialPageParam: 0,
  });
  const creditHistory = creditHistoryData?.pages.flatMap(p => p.items) ?? [];

  const handleCheckIn = useCallback(async () => {
    setChecking(true);
    try {
      await userApi.checkIn();
      message.success('签到成功，+10积分！');
      refetchCheckIn();
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      queryClient.invalidateQueries({ queryKey: ['creditHistory'] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '签到失败');
    } finally {
      setChecking(false);
    }
  }, [message, refetchCheckIn, queryClient]);

  if (!user) {
    return (
      <>
        <AppHeader
          currentUser={currentUser}
          notifications={notifications}
          unreadNotificationCount={unreadNotificationCount}
          notificationLoading={notificationLoading}
          onLogin={() => setAuthModalOpen(true)}
          onLogout={handleLogout}
          onMarkMessageRead={handleMarkMessageRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onNotificationPanelOpen={handleNotificationPanelOpen}
        />
        <div className="web-page-shell profile-page" style={{ maxWidth: 1200, margin: '0 auto', padding: '120px 24px 24px', textAlign: 'center' }}>
          <div style={{ color: 'rgba(200,216,245,0.62)', fontSize: 16, marginBottom: 16 }}>
            登录后可以查看个人中心
          </div>
          <button
            type="button"
            className="profile-logout-btn"
            style={{ width: 'auto', margin: 0, padding: '0 20px' }}
            onClick={() => navigate('/')}
          >
            返回首页
          </button>
        </div>
        <AuthModal
          open={authModalOpen}
          onLogin={handleUserLogin}
          onRegister={userApi.register}
          onLoginBySignature={userApi.login}
          onCancel={() => setAuthModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <AppHeader
        currentUser={currentUser}
        notifications={notifications}
        unreadNotificationCount={unreadNotificationCount}
        notificationLoading={notificationLoading}
        onLogin={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onMarkMessageRead={handleMarkMessageRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNotificationPanelOpen={handleNotificationPanelOpen}
      />
      <div className="web-page-shell profile-page" style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 24px 24px' }}>
        {/* ── Section title ── */}
        <h1 className="profile-section-title" style={{ marginBottom: 24 }}>
          个人中心<span className="profile-section-title__spark">✦</span>
        </h1>

        <Row gutter={[24, 24]}>
          {/* ── Left column ── */}
          <Col xs={24} lg={16}>
            <Card className="profile-page__user-card" styles={{ body: { padding: 28 } }}>
              {/* User hero */}
              <div className="profile-hero">
                <span className="profile-hero__avatar">
                  <UserOutlined />
                </span>
                <div>
                  <div className="profile-hero__name">{user.nick_name}</div>
                  {user.created_at && (
                    <div className="profile-hero__date">
                      注册时间：{new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  )}
                </div>
              </div>

              {/* Credits balance */}
              <div className="profile-credits" style={{ '--accent': '#eab308' } as React.CSSProperties}>
                <div className="profile-credits__glow" />
                <div className="profile-credits__row">
                  <span className="profile-credits__badge"><ThunderboltOutlined /></span>
                  <span className="profile-credits__value">{credits ?? '...'}</span>
                </div>
                <span className="profile-credits__label">积分余额</span>
              </div>

              {/* Price breakdown */}
              {creditPrices && creditPrices.length > 0 && (
                <div className="profile-prices">
                  {creditPrices.map((p: { action: string; price: number; label: string }) => {
                    const canAfford = (credits ?? 0) >= p.price;
                    return (
                      <div key={p.action} className={`profile-price-item ${canAfford ? 'profile-price-item--afford' : 'profile-price-item--cant'}`}>
                        <span className="profile-price-item__label" style={{ color: canAfford ? 'rgba(200,216,245,0.8)' : '#ef4444' }}>{p.label}</span>
                        <span className="profile-price-item__cost" style={{ color: p.price === 0 ? '#22c55e' : canAfford ? '#eab308' : '#ef4444' }}>
                          {p.price === 0 ? '免费' : `${p.price}💰`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Signature display */}
              {signature ? (
                <div>
                  <div className="profile-signature__label">签名图案</div>
                  <div style={{ display: 'flex', gap: 16, width: '100%' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SignatureStroke signature={signature} size={180} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SignatureGrid signature={signature} size={180} />
                    </div>
                  </div>
                  <div className="profile-signature__hint">
                    💡 左侧原始笔迹（悬停查看），右侧量化路径图。绿=起笔，红=收笔。
                  </div>
                </div>
              ) : (
                <div className="profile-empty">签名数据未保存</div>
              )}

              {/* Logout */}
              <button type="button" className="profile-logout-btn" onClick={handleLogout}>
                退出登录
              </button>
            </Card>
          </Col>

          {/* ── Right column ── */}
          <Col xs={24} lg={8}>
            {/* Check-in calendar */}
            {checkInData && (
              <Card className="profile-page__checkin-card" styles={{ body: { padding: 24 } }}>
                <CheckInCalendar
                  checkedDates={checkInData.checked_dates}
                  todayChecked={checkInData.today_checked}
                  streak={checkInData.streak}
                  month={checkInData.month}
                  onCheckIn={handleCheckIn}
                  checking={checking}
                />
              </Card>
            )}

            {/* Credit history */}
            <Card className="profile-page__credits-card" style={{ marginTop: 24 }} styles={{ body: { padding: 24 } }}>
              <div className="profile-card-heading">积分使用记录</div>
              {creditHistory.length > 0 ? (
                <div
                  className="profile-history-scroll"
                  style={{ maxHeight: 440, overflowY: 'auto' }}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (!hasMoreCredits) return;
                    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
                      fetchNextCreditPage();
                    }
                  }}
                >
                  <Table
                    dataSource={creditHistory}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: '操作', dataIndex: 'action', key: 'action', width: 100,
                        render: (action: string) => ACTION_LABELS[action] || action,
                      },
                      {
                        title: '积分变动', dataIndex: 'credits_cost', key: 'credits_cost', width: 80,
                        render: (cost: number) => cost < 0
                          ? <span style={{ color: '#22c55e', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>+{Math.abs(cost)}</span>
                          : <span style={{ color: '#ef4444', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>-{cost}</span>,
                      },
                      {
                        title: '时间', dataIndex: 'created_at', key: 'created_at',
                        render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
                      },
                    ]}
                  />
                  {hasMoreCredits && <div className="profile-load-more">向下滚动加载更多...</div>}
                </div>
              ) : (
                <div className="profile-empty">暂无积分使用记录</div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      <AuthModal
        open={authModalOpen}
        onLogin={handleUserLogin}
        onRegister={userApi.register}
        onLoginBySignature={userApi.login}
        onCancel={() => setAuthModalOpen(false)}
      />
    </>
  );
};

export default ProfilePage;
