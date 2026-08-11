import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMobile, useHaptic } from '../../hooks/useMobile';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export const MobileBottomNav: React.FC<{ items: NavItem[] }> = ({ items }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useMobile();
  const { vibrateLight } = useHaptic();

  if (!isMobile) return null;

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => { vibrateLight(); navigate(item.path); }}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
