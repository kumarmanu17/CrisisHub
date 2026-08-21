import React from 'react';
import { Sun, Moon, Link } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  theme: string;
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, theme, toggleTheme }) => {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Incident Command Center';
      case 'crises': return 'Active Crisis Management';
      case 'projects': return 'Project Resource Board';
      case 'resources': return 'Corporate Resource Registry';
      case 'reports': return 'Management Analytics & Audit Reports';
      default: return 'Corporate Crisis Allocation System';
    }
  };

  const getTabSubtitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Real-time overview of organization operational health and resource allocations.';
      case 'crises': return 'Report new incidents, track severity weights, and monitor resolution logs.';
      case 'projects': return 'Assign employees and shared resources to projects, then release them on completion.';
      case 'resources': return 'Register critical assets, define operating costs, and audit availability status.';
      case 'reports': return 'Analyze department-level resolution performance and audit history.';
      default: return 'Enterprise Resource Management System';
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="glass-panel" style={{
      padding: '20px 24px',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      zIndex: 5
    }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
          {getTabTitle(currentTab)}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {getTabSubtitle(currentTab)}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Date Display */}
        <div style={{ 
          fontSize: '0.85rem', 
          fontWeight: 600, 
          color: 'var(--text-secondary)',
          background: 'var(--bg-secondary)',
          padding: '8px 16px',
          borderRadius: '20px',
          border: '1px solid var(--border-primary)'
        }}>
          {formattedDate}
        </div>

        {/* Server Connection Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          background: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--color-low)',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: 700,
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}>
          <Link size={14} />
          BACKEND ACTIVE
        </div>

        {/* Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sun size={18} style={{ color: theme === 'light' ? 'var(--primary)' : 'var(--text-tertiary)' }} />
          <label className="theme-switch">
            <input 
              type="checkbox" 
              checked={theme === 'dark'} 
              onChange={toggleTheme} 
            />
            <span className="slider"></span>
          </label>
          <Moon size={18} style={{ color: theme === 'dark' ? 'var(--primary)' : 'var(--text-tertiary)' }} />
        </div>
      </div>
    </header>
  );
};
