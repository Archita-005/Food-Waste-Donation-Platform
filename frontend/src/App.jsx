import React, { useState, useEffect } from 'react';
import { Leaf, Sun, Moon, LogOut, HelpCircle } from 'lucide-react';
import LandingView from './components/LandingView';
import DashboardView from './components/DashboardView';
import AuthView from './components/AuthView';
import BrowseView from './components/BrowseView';
import DonateView from './components/DonateView';
import ActivityView from './components/ActivityView';
import VolunteerDeliveriesView from './components/VolunteerDeliveriesView';
import AdminView from './components/AdminView';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [currentView, setCurrentView] = useState('landing');
  const [stats, setStats] = useState(null);
  
  // Toast notifications state
  const [toast, setToast] = useState({
    show: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Fetch stats from backend
  const fetchStats = () => {
    fetch('/api/stats')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
      })
      .then(data => {
        setStats(data);
      })
      .catch(err => {
        console.error('Error fetching statistics:', err);
      });
  };

  // Sync stats on load and navigation
  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Theme synchronization with body class
  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Handle Authentication Success
  const handleAuthSuccess = (newToken, newUserObj) => {
    setToken(newToken);
    setUser(newUserObj);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUserObj));
    setCurrentView('dashboard');
    fetchStats();
  };

  // Handle Logout
  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentView('landing');
    showToast('Logged Out', 'You have been successfully logged out.', 'info');
  };

  // Toast Helper
  const showToast = (title, message, type = 'success') => {
    setToast({
      show: true,
      title,
      message,
      type
    });
  };

  // Close toast automatically
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Handle Navigation
  const navigateTo = (view) => {
    const protectedViews = ['dashboard', 'donate', 'browse', 'activity', 'deliveries', 'admin'];
    if (protectedViews.includes(view) && !token) {
      setCurrentView('auth');
      showToast('Authentication Required', 'Please sign in or register to access that page.', 'info');
    } else {
      setCurrentView(view);
    }
  };

  // Navigation Links based on role
  const renderNavLinks = () => {
    if (!token) {
      return (
        <div className="guest-nav-links">
          <button 
            className={`nav-link ${currentView === 'landing' ? 'active' : ''}`}
            onClick={() => navigateTo('landing')}
          >
            Home
          </button>
          <button 
            className={`nav-link ${currentView === 'auth' ? 'active' : ''}`}
            onClick={() => navigateTo('auth')}
          >
            Join ShareMeal
          </button>
        </div>
      );
    }

    return (
      <div className="auth-nav-links">
        <button 
          className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => navigateTo('dashboard')}
        >
          Dashboard
        </button>

        {user?.role === 'donor' && (
          <>
            <button 
              className={`nav-link ${currentView === 'donate' ? 'active' : ''}`}
              onClick={() => navigateTo('donate')}
            >
              Donate Food
            </button>
            <button 
              className={`nav-link ${currentView === 'activity' ? 'active' : ''}`}
              onClick={() => navigateTo('activity')}
            >
              My Contributions
            </button>
          </>
        )}

        {user?.role === 'recipient' && (
          <>
            <button 
              className={`nav-link ${currentView === 'browse' ? 'active' : ''}`}
              onClick={() => navigateTo('browse')}
            >
              Find Food
            </button>
            <button 
              className={`nav-link ${currentView === 'activity' ? 'active' : ''}`}
              onClick={() => navigateTo('activity')}
            >
              My Claims
            </button>
          </>
        )}

        {user?.role === 'volunteer' && (
          <button 
            className={`nav-link ${currentView === 'deliveries' ? 'active' : ''}`}
            onClick={() => navigateTo('deliveries')}
          >
            Delivery Jobs
          </button>
        )}

        {user?.role === 'admin' && (
          <button 
            className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => navigateTo('admin')}
          >
            Admin Panel
          </button>
        )}
      </div>
    );
  };

  // Main view content router
  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingView onNavigate={navigateTo} stats={stats} />;
      case 'auth':
        return <AuthView onAuthSuccess={handleAuthSuccess} showToast={showToast} />;
      case 'dashboard':
        return <DashboardView user={user} stats={stats} onNavigate={navigateTo} />;
      case 'donate':
        return <DonateView token={token} showToast={showToast} onNavigate={navigateTo} />;
      case 'browse':
        return <BrowseView user={user} token={token} showToast={showToast} />;
      case 'activity':
        return <ActivityView user={user} token={token} showToast={showToast} />;
      case 'deliveries':
        return <VolunteerDeliveriesView token={token} showToast={showToast} />;
      case 'admin':
        return <AdminView token={token} showToast={showToast} />;
      default:
        return <LandingView onNavigate={navigateTo} stats={stats} />;
    }
  };

  // Initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="app-header">
        <div className="header-container">
          <div className="logo-area" onClick={() => navigateTo('landing')}>
            <div className="logo-icon">
              <Leaf size={22} fill="white" />
            </div>
            <span className="logo-text">Share<span>Meal</span></span>
          </div>

          <nav className="main-nav">
            {renderNavLinks()}
          </nav>

          <div className="header-actions">
            <button 
              className="theme-toggle" 
              onClick={toggleTheme} 
              aria-label="Toggle Theme"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {token && user && (
              <div className="user-profile-menu">
                <div className="user-avatar" title={`${user.name} (${user.role})`}>
                  {getUserInitials()}
                </div>
                <div className="user-menu-dropdown">
                  <div className="dropdown-header">
                    <div className="user-dropdown-name">{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {user.role} {user.organization ? `| ${user.organization}` : ''}
                    </div>
                  </div>
                  <hr />
                  <button className="dropdown-item" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        {renderView()}
      </main>

      <footer style={{ 
        borderTop: '1px solid var(--border-color)', 
        padding: '2rem 1rem', 
        textAlign: 'center', 
        fontSize: '0.85rem', 
        color: 'var(--text-muted)',
        backgroundColor: 'var(--bg-card)',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>&copy; {new Date().getFullYear()} ShareMeal MERN. Rescuing food, preserving nature.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigateTo('landing')}>About</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>

      {toast.show && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' && <Leaf size={18} />}
              {toast.type === 'error' && <HelpCircle size={18} style={{ transform: 'rotate(180deg)', color: 'var(--error)' }} />}
              {toast.type === 'info' && <HelpCircle size={18} style={{ color: 'var(--accent-blue)' }} />}
            </div>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
