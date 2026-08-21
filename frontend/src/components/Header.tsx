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
      padding: '20px 28px',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      zIndex: 5
    }}>
      <div>
        <h1 style={{ 
          fontSize: '1.65rem', 
          fontWeight: 800, 
          letterSpacing: '-0.5px',
          background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {getTabTitle(currentTab)}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
          {getTabSubtitle(currentTab)}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {/* Date Display */}
        <div style={{ 
          fontSize: '0.82rem', 
          fontWeight: 600, 
          color: 'var(--text-secondary)',
          background: 'var(--bg-secondary)',
          padding: '8px 16px',
          borderRadius: '20px',
          border: '1px solid var(--border-primary)',
          transition: 'transform var(--transition-normal), border-color var(--transition-normal)'
        }}>
          {formattedDate}
        </div>

        {/* Server Connection Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          background: 'rgba(16, 185, 129, 0.12)',
          color: 'var(--color-low)',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)'
        }}>
          <span className="alert-pulse-container" style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-low)' }}>
            <span className="alert-pulse" style={{ backgroundColor: 'var(--color-low)' }}></span>
          </span>
          <Link size={13} style={{ marginLeft: '2px' }} />
          BACKEND ACTIVE
        </div>

        {/* Theme Toggle */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          background: 'var(--bg-secondary)',
          padding: '6px 12px',
          borderRadius: '20px',
          border: '1px solid var(--border-primary)'
        }}>
          <Sun size={17} style={{ color: theme === 'light' ? 'var(--primary)' : 'var(--text-tertiary)', transition: 'color var(--transition-normal)' }} />
          <label className="theme-switch">
            <input 
              type="checkbox" 
              checked={theme === 'dark'} 
              onChange={toggleTheme} 
            />
            <span className="slider"></span>
          </label>
          <Moon size={17} style={{ color: theme === 'dark' ? 'var(--primary)' : 'var(--text-tertiary)', transition: 'color var(--transition-normal)' }} />
        </div>
      </div>
    </header>
  );
};
