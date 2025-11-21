import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Tablet, Monitor, Moon, Sun } from 'lucide-react';

interface MobilePreviewProps {
  content: string;
  hashtags: string[];
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
}

type Device = 'iphone' | 'android' | 'ipad' | 'desktop';
type Theme = 'light' | 'dark';

export const MobilePreview: React.FC<MobilePreviewProps> = ({
  content,
  hashtags,
  platform
}) => {
  const { t } = useTranslation();
  const [selectedDevice, setSelectedDevice] = useState<Device>('iphone');
  const [theme, setTheme] = useState<Theme>('light');

  const devices = [
    { id: 'iphone' as Device, name: 'iPhone 15 Pro', icon: Smartphone, width: 'w-[375px]', height: 'h-[812px]' },
    { id: 'android' as Device, name: 'Samsung S24', icon: Smartphone, width: 'w-[360px]', height: 'h-[800px]' },
    { id: 'ipad' as Device, name: 'iPad Pro', icon: Tablet, width: 'w-[768px]', height: 'h-[1024px]' },
    { id: 'desktop' as Device, name: 'Desktop', icon: Monitor, width: 'w-full', height: 'h-[600px]' }
  ];

  const platformStyles = {
    instagram: {
      bg: theme === 'light' ? 'bg-white' : 'bg-[#000]',
      text: theme === 'light' ? 'text-black' : 'text-white',
      accent: 'text-pink-500'
    },
    twitter: {
      bg: theme === 'light' ? 'bg-white' : 'bg-[#15202B]',
      text: theme === 'light' ? 'text-[#14171A]' : 'text-white',
      accent: 'text-blue-400'
    },
    linkedin: {
      bg: theme === 'light' ? 'bg-white' : 'bg-[#1B1F23]',
      text: theme === 'light' ? 'text-[#000]' : 'text-white',
      accent: 'text-blue-600'
    },
    facebook: {
      bg: theme === 'light' ? 'bg-white' : 'bg-[#18191A]',
      text: theme === 'light' ? 'text-[#050505]' : 'text-[#E4E6EB]',
      accent: 'text-blue-500'
    }
  };

  const style = platformStyles[platform];
  const device = devices.find(d => d.id === selectedDevice)!;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {devices.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDevice(d.id)}
              className={`p-2 rounded-lg transition ${
                selectedDevice === d.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title={d.name}
            >
              <d.icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </div>

      {/* Device Frame */}
      <div className="flex justify-center">
        <div className={`${device.width} ${device.height} border-8 border-slate-900 rounded-3xl overflow-hidden shadow-2xl relative`}>
          {/* Status Bar (Mobile) */}
          {(selectedDevice === 'iphone' || selectedDevice === 'android') && (
            <div className={`h-10 ${style.bg} flex items-center justify-between px-6 ${style.text} text-xs`}>
              <span>9:41</span>
              <div className="flex gap-1">
                <div className="w-4 h-3 border border-current rounded-sm" />
                <div className="w-4 h-3 border border-current rounded-sm" />
                <div className="w-4 h-3 border border-current rounded-sm" />
              </div>
            </div>
          )}

          {/* App Header */}
          <div className={`h-14 ${style.bg} border-b ${theme === 'light' ? 'border-slate-200' : 'border-slate-700'} flex items-center px-4`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${style.accent} rounded-full flex items-center justify-center font-bold text-white`}>
                {platform[0].toUpperCase()}
              </div>
              <div>
                <div className={`font-semibold ${style.text}`}>Your Account</div>
                <div className="text-xs text-slate-500">2 hours ago</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`${style.bg} p-4 overflow-y-auto`} style={{ height: 'calc(100% - 120px)' }}>
            <div className={`${style.text} text-sm whitespace-pre-wrap mb-3`}>
              {content}
            </div>

            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {hashtags.map((tag, idx) => (
                  <span key={idx} className={`${style.accent} text-sm`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Engagement Bar */}
            <div className={`flex items-center gap-6 pt-3 border-t ${theme === 'light' ? 'border-slate-200' : 'border-slate-700'} ${style.text}`}>
              <button className="flex items-center gap-2 text-sm">
                <span>❤️</span> <span>Like</span>
              </button>
              <button className="flex items-center gap-2 text-sm">
                <span>💬</span> <span>Comment</span>
              </button>
              <button className="flex items-center gap-2 text-sm">
                <span>🔄</span> <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Device Info */}
      <div className="text-center text-sm text-slate-500">
        {device.name} • {theme === 'light' ? 'Light' : 'Dark'} Mode
      </div>
    </div>
  );
};
