import { useEffect, useState } from 'react';

interface CompanyAvatarProps {
  name: string;
  logoUrl?: string | null;
  size?: number;
}

export default function CompanyAvatar({ name, logoUrl, size = 30 }: CompanyAvatarProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const radius = size >= 44 ? 8 : 6;
  const fontSize = Math.max(11, Math.round(size * 0.4));

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt=""
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: '#FFFFFF',
            padding: size >= 44 ? 4 : 2,
          }}
        />
      ) : (
        <span style={{ fontSize, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {(name || '?').charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}