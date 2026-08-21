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
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={isActive ? '' : 'glass-btn-secondary'}
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
                fontWeight: 600,
                fontSize: '0.95rem',
                background: isActive ? 'var(--primary-gradient)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 12px var(--primary-glow)' : 'none',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Icon size={18} />
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
          padding: '8px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: user.role === 'admin' ? 'var(--color-critical)' : 'var(--color-low)'
          }}>
            {user.role === 'admin' ? <ShieldCheck size={22} /> : <UserCheck size={22} />}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user.name}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-pill ${user.role === 'admin' ? 'pending' : 'resolved'}`} style={{ 
                fontSize: '0.65rem', 
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
            borderColor: 'rgba(244, 63, 94, 0.2)'
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
