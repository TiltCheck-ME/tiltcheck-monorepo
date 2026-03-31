import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Image metadata
export const alt = 'TiltCheck — The Degen Audit Layer';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0B0F19', // Obsidian Black
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          border: '4px solid #17C3B2', // Teal Border
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          {/* Mock Logo Mark - A Teal and Gold badge */}
          <div
            style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#17C3B2', // Teal
              borderRadius: '8px',
              marginRight: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFD700', // Gold Accent
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#0B0F19', // Obsidian
                transform: 'rotate(45deg)',
              }}
            />
          </div>
          <div
            style={{
              fontSize: '80px',
              fontWeight: '900',
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
            }}
          >
            TiltCheck
          </div>
        </div>

        <div
          style={{
            fontSize: '40px',
            color: '#17C3B2', // Teal
            fontWeight: '600',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}
        >
          The Degen Audit Layer
        </div>

        <div
          style={{
            fontSize: '32px',
            color: '#9CA3AF',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
          }}
        >
          The house has an edge. Now you do too.
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            color: '#FFD700', // Gold Accent
            fontSize: '24px',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          [ TELEMETRY ACTIVE ]
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
