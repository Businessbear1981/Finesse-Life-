'use client';

import {useState} from 'react';

interface ProfileTabsProps {
  publicContent: React.ReactNode;
  privateContent: React.ReactNode;
}

export function ProfileTabs({publicContent, privateContent}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');

  return (
    <div className="w-full">
      {/* Tab switcher */}
      <div
        className="flex mb-6 w-full max-w-xs mx-auto"
        style={{borderBottom: '1px solid rgba(201,169,97,0.1)'}}
      >
        {(['public', 'private'] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="relative flex-1 py-3 font-label text-[9px] tracking-[0.35em] uppercase transition-colors duration-200"
              style={{
                color: active ? '#C9A961' : 'rgba(244,232,208,0.2)',
                background: 'transparent',
              }}
            >
              {tab === 'private' ? (
                <>
                  Private{' '}
                  <span
                    style={{
                      fontSize: '8px',
                      letterSpacing: '0.15em',
                      color: active ? '#FF4D7D' : 'rgba(255,77,125,0.35)',
                      verticalAlign: 'middle',
                    }}
                  >
                    ✦
                  </span>
                </>
              ) : (
                'Public'
              )}
              {active && (
                <span
                  className="absolute bottom-0 left-0 w-full h-[2px]"
                  style={{background: tab === 'private' ? '#FF4D7D' : '#C9A961'}}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="w-full">
        {activeTab === 'public' ? publicContent : privateContent}
      </div>
    </div>
  );
}
