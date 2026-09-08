import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageOutlined } from '@ant-design/icons';

import { FeedbackModal } from '@/components/FeedbackModal';

export const FeedbackFab: React.FC = () => {
  const [open, setOpen] = useState(false);

  const fab = createPortal(
    <button
      type="button"
      className="feedback-fab"
      onClick={() => setOpen(true)}
      aria-label="建议反馈"
    >
      <span className="feedback-fab__glow" />
      <MessageOutlined className="feedback-fab__icon" />
    </button>,
    document.body,
  );

  return (
    <>
      {fab}
      <FeedbackModal open={open} onCancel={() => setOpen(false)} />
    </>
  );
};

export default FeedbackFab;
