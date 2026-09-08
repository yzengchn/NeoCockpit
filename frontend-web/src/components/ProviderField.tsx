import React from 'react';
import { Form, Select, Button, Space } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { AIProviderConfig, TaskType } from '@/types/task';
import { PROVIDER_SELECT_WIDTH } from '@/constants/styles';

interface ProviderFieldProps {
  providers: AIProviderConfig[];
  loading: boolean;
  disabled?: boolean;
  creditCost?: number;
  creditsBalance?: number;
  taskType?: TaskType;
}

/** Reusable provider select + submit button field group. */
export const ProviderField: React.FC<ProviderFieldProps> = ({ providers, loading, disabled = false, creditCost, creditsBalance, taskType }) => (
  <Space size={8} align="center">
    <Form.Item name="provider" style={{ marginBottom: 0 }}>
      <Select
        style={{ width: PROVIDER_SELECT_WIDTH }}
        popupClassName={`clab-provider-dropdown${taskType ? ` clab-provider-dropdown--${taskType}` : ''}`}
      >
        {providers.map((p) => (
          <Select.Option key={p.value} value={p.value}>{p.name}</Select.Option>
        ))}
      </Select>
    </Form.Item>
    <Button
      type="primary"
      htmlType="submit"
      loading={loading}
      disabled={disabled}
      className="neon-btn"
      style={{ height: 40, padding: '0 28px', fontSize: 14, lineHeight: 1 }}
    >
      <RocketOutlined /> 开始生成
    </Button>
    {creditCost !== undefined && creditCost > 0 && (
      <span style={{
        fontSize: 11,
        fontWeight: 500,
        color: (creditsBalance !== undefined && creditsBalance < creditCost) ? '#ef4444' : '#f59e0b',
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
      }}>
        💰 {creditCost} 积分
        {(creditsBalance !== undefined && creditsBalance < creditCost) && ' (不足)'}
      </span>
    )}
    {creditCost === 0 && (
      <span style={{ fontSize: 11, fontWeight: 500, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>
        免费
      </span>
    )}
  </Space>
);
