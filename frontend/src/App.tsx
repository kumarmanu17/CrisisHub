import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CrisisManagement } from './pages/CrisisManagement';
import { Projects } from './pages/Projects';
import { ResourceManagement } from './pages/ResourceManagement';
import { Reports } from './pages/Reports';

interface User {
  username: string;
  name: string;
  role: string;
  department: string;
}

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark'); // Default to enterprise dark mode!

  // Sync theme with HTML attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load session from local storage on boot
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    const savedTheme = localStorage.getItem('theme');

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User, token: string) => {
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setCurrentTab('dashboard');
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // Render Page Content based on selected tab
  const renderTabContent = () => {
    if (!user) return null;
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'crises':
        return <CrisisManagement user={user} />;
      case 'projects':
        return <Projects />;
      case 'resources':
        return <ResourceManagement />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard user={user} />;
    }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      gap: '24px',
      padding: '16px',
      maxWidth: '1600px',
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Sidebar Navigation */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* Main Command Workspace */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0 // Prevents grid overflow issues
      }}>
        {/* Workspace Top Header */}
        <Header 
          currentTab={currentTab} 
          theme={theme} 
          toggleTheme={toggleTheme} 
        />

        {/* Page Tab Workspace */}
        <div style={{ flex: 1 }}>
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
