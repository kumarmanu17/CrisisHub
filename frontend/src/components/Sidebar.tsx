import React from 'react';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Briefcase,
  Cpu, 
  FileBarChart2, 
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: {
    username: string;
    name: string;
    role: string;
    department: string;
  } | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, user, onLogout }) => {
  if (!user) return null;

  const menuItems = [
    { id: 'dashboard', name: 'Command Center', icon: LayoutDashboard, roles: ['admin', 'employee'] },
    { id: 'crises', name: 'Active Incidents', icon: ShieldAlert, roles: ['admin', 'employee'] },
    { id: 'projects', name: 'Projects', icon: Briefcase, roles: ['admin', 'employee'] },
    { id: 'resources', name: 'Resource Registry', icon: Cpu, roles: ['admin'] },
    { id: 'reports', name: 'Reports & Audits', icon: FileBarChart2, roles: ['admin', 'employee'] },
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="glass-panel" style={{
      width: '280px',
      height: 'calc(100vh - 32px)',
      position: 'sticky',
      top: '16px',
      left: '16px',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      borderRadius: '16px',
      zIndex: 10,
    }}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '40px',
        padding: '0 8px'
      }}>
        <div style={{
          background: 'var(--primary-gradient)',
          color: '#fff',
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px var(--primary-glow)'
        }}>
          <ShieldAlert size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.5px' }}>CrisisCommand</h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>
            Enterprise RMS
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.95rem',
                position: 'relative',
                overflow: 'hidden',
                background: isActive ? 'var(--primary-gradient)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 14px var(--primary-glow)' : 'none',
                transition: 'transform var(--transition-normal), background-color var(--transition-normal), color var(--transition-normal), box-shadow var(--transition-normal)'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.transform = 'translateX(0px)';
                }
              }}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '15%',
                  bottom: '15%',
                  width: '4px',
                  borderRadius: '0 4px 4px 0',
                  background: '#ffffff'
                }} />
              )}
              <Icon size={18} style={{ opacity: isActive ? 1 : 0.85 }} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* User Information Panel */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '20px',
        borderTop: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          borderRadius: '10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: user.role === 'admin' ? 'var(--color-critical-bg)' : 'var(--color-low-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: user.role === 'admin' ? 'var(--color-critical)' : 'var(--color-low)'
          }}>
            {user.role === 'admin' ? <ShieldCheck size={20} /> : <UserCheck size={20} />}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user.name}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span className={`status-pill ${user.role === 'admin' ? 'pending' : 'resolved'}`} style={{ 
                fontSize: '0.62rem', 
                padding: '2px 6px',
                textTransform: 'uppercase',
                fontWeight: 700
              }}>
                {user.role}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{user.department}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="glass-btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px',
            width: '100%',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: 'var(--color-critical)',
            borderColor: 'rgba(244, 63, 94, 0.2)',
            transition: 'transform var(--transition-normal), background-color var(--transition-normal), border-color var(--transition-normal), box-shadow var(--transition-normal)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-critical-bg)';
            e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.4)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.2)';
            e.currentTarget.style.transform = 'translateY(0px)';
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
