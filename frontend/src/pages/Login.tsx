import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Lock, User as UserIcon } from 'lucide-react';
import { api } from '../services/api';

interface LoginProps {
  onLoginSuccess: (user: {
    username: string;
    name: string;
    role: string;
    department: string;
  }, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.login(username, password);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Unable to authenticate. Is the C++ server running?');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userType: 'admin' | 'employee') => {
    if (userType === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('employee');
      setPassword('emp123');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 40%, rgba(99, 102, 241, 0.12) 0%, rgba(14, 165, 233, 0.05) 50%, var(--bg-primary) 100%)',
      padding: '20px'
    }}>
      <div className="glass-panel animate-slide" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '44px 40px',
        boxShadow: 'var(--shadow-glass), var(--shadow-lg)',
        borderRadius: '20px'
      }}>
        {/* Brand */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'var(--primary-gradient)',
            color: '#fff',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px var(--primary-glow)',
            transition: 'transform var(--transition-normal)'
          }}>
            <ShieldAlert size={32} />
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.75px', textAlign: 'center' }}>
            CrisisCommand
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '-4px', fontWeight: 500 }}>
            Corporate Crisis Resource Allocation Portal
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--color-critical-bg)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            color: 'var(--color-critical)',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '24px',
            lineHeight: '1.4',
            animation: 'fadeIn var(--transition-normal) forwards'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.82rem', 
              fontWeight: 700, 
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon size={18} style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none'
              }} />
              <input
                type="text"
                className="glass-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.82rem', 
              fontWeight: 700, 
              color: 'var(--text-secondary)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none'
              }} />
              <input
                type="password"
                className="glass-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="glass-btn" 
            disabled={loading}
            style={{ 
              marginTop: '10px',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              gap: '8px'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Fast Logins */}
        <div style={{
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border-primary)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
            Demo Profiles (Click to prefill)
          </span>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginTop: '14px'
          }}>
            <button
              onClick={() => fillCredentials('admin')}
              className="glass-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <ShieldCheck size={15} style={{ color: 'var(--color-critical)' }} />
              Admin Portal
            </button>

            <button
              onClick={() => fillCredentials('employee')}
              className="glass-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <UserIcon size={15} style={{ color: 'var(--color-low)' }} />
              Employee Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
