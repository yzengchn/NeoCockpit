import React, { useState } from 'react';
import { Typography, Image } from 'antd';
import { imageFrame, imageLabel } from '@/constants/styles';
import { toResourceUrl } from '@/utils/url';

const { Text } = Typography;

interface ImageBlockProps {
  label: string;
  src?: string;
  alt: string;
}

const previewButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: 0,
  border: 0,
  background: 'transparent',
  cursor: 'zoom-in',
  lineHeight: 0,
};

const stableImageStyle: React.CSSProperties = {
  width: '100%',
  display: 'block',
  objectFit: 'contain',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
};

/** Reusable labeled image block (used in TaskDetailPage generated results). */
export const ImageBlock: React.FC<ImageBlockProps> = ({ label, src, alt }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const imageSrc = src ? toResourceUrl(src) : '';

  if (!src || !imageSrc) return null;

  return (
    <>
      <Text className="task-detail-image-block__label" style={imageLabel}>{label}</Text>
      <div className="task-detail-image-block__frame" style={imageFrame}>
        <button
          className="task-detail-image-block__button"
          type="button"
          aria-label={`查看${label}大图`}
          title="点击查看大图"
          onClick={() => setPreviewOpen(true)}
          style={previewButtonStyle}
        >
          <img src={imageSrc} alt={alt} loading="lazy" decoding="async" style={stableImageStyle} />
        </button>
      </div>
      <Image
        src={imageSrc}
        alt={alt}
        wrapperStyle={{ display: 'none' }}
        preview={{
          src: imageSrc,
          visible: previewOpen,
          onVisibleChange: (visible) => setPreviewOpen(visible),
        }}
      />
    </>
  );
};
