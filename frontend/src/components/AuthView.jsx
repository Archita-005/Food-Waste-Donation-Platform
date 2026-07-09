import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Phone, Building, Store, Heart, Truck, ShieldCheck } from 'lucide-react';

export default function AuthView({ onAuthSuccess, showToast }) {
  const [activeTab, setActiveTab] = useState('login');
  const [role, setRole] = useState('donor');
  
  // Login method toggle ('password' or 'otp')
  const [loginMethod, setLoginMethod] = useState('password');

  // Form values
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // OTP modal flow state
  const [showOtpOverlay, setShowOtpOverlay] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpPurpose, setOtpPurpose] = useState('register'); // 'register' or 'login'

  const API_URL = ''; // Relative

  // Send OTP trigger
  const sendOtpCode = (email, purpose) => {
    if (!email) {
      showToast('Input Required', 'Please enter a valid email address first.', 'error');
      return;
    }
    fetch(`${API_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status === 200) {
        showToast('OTP Sent', 'Check your email inbox or backend console log.');
        setOtpPurpose(purpose);
        setOtpCode('');
        setShowOtpOverlay(true);
      } else {
        showToast('OTP Failed', data.error || 'Failed to send OTP code.', 'error');
      }
    })
    .catch(err => {
      console.error(err);
      showToast('Network Error', 'Could not send verification code.', 'error');
    });
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginMethod === 'otp') {
      // Trigger OTP flow for login
      sendOtpCode(loginEmail, 'login');
    } else {
      // Standard Password Login
      fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200) {
          onAuthSuccess(data.token, data.user);
          showToast('Logged In', `Welcome back, ${data.user.name}!`);
        } else {
          showToast('Login Failed', data.error || 'Invalid credentials.', 'error');
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Network Error', 'Could not reach server.', 'error');
      });
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    // Instead of registering directly, we send an OTP first!
    sendOtpCode(regEmail, 'register');
  };

  const handleOtpVerifyAndSubmit = (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      showToast('Invalid Code', 'OTP must be exactly 6 digits.', 'error');
      return;
    }

    if (otpPurpose === 'register') {
      const payload = {
        name: regName,
        email: regEmail,
        password: regPassword,
        role: role,
        phone: regPhone,
        organization: regOrg,
        otp: otpCode
      };

      fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 201) {
          setShowOtpOverlay(false);
          onAuthSuccess(data.token, data.user);
          showToast('Registered Successfully', `Account created! Welcome, ${data.user.name}.`);
        } else {
          showToast('Registration Failed', data.error || 'Failed to verify OTP.', 'error');
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Network Error', 'Could not verify OTP.', 'error');
      });
    } else if (otpPurpose === 'login') {
      fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, otp: otpCode })
      })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200) {
          setShowOtpOverlay(false);
          onAuthSuccess(data.token, data.user);
          showToast('Logged In', `Welcome back, ${data.user.name}!`);
        } else {
          showToast('Login Failed', data.error || 'Invalid OTP code.', 'error');
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Network Error', 'Could not verify login code.', 'error');
      });
    }
  };

  return (
    <section className="view-section">
      <div className="auth-wrapper">
        <div className="auth-container">
          {/* Tab headers */}
          <div className="auth-tabs">
            <button 
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => setActiveTab('login')}
            >
              Sign In
            </button>
            <button 
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => setActiveTab('register')}
            >
              Register
            </button>
          </div>

          {/* Login Panel */}
          {activeTab === 'login' && (
            <div className="auth-form-panel active">
              <form onSubmit={handleLoginSubmit}>
                <h2>Welcome Back</h2>
                <p className="form-desc">Sign in to coordinate donations or browse rescues.</p>
                
                {/* Login Method Toggle */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--bg-input)', padding: '4px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('password')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      backgroundColor: loginMethod === 'password' ? 'var(--bg-card)' : 'transparent',
                      color: loginMethod === 'password' ? 'var(--primary)' : 'var(--text-muted)',
                      boxShadow: loginMethod === 'password' ? 'var(--shadow-sm)' : 'none'
                    }}
                  >
                    Password Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('otp')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      backgroundColor: loginMethod === 'otp' ? 'var(--bg-card)' : 'transparent',
                      color: loginMethod === 'otp' ? 'var(--primary)' : 'var(--text-muted)',
                      boxShadow: loginMethod === 'otp' ? 'var(--shadow-sm)' : 'none'
                    }}
                  >
                    Passwordless OTP
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="login-email">Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} />
                    <input 
                      type="email" 
                      id="login-email" 
                      required 
                      placeholder="name@organization.org"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                {loginMethod === 'password' ? (
                  <div className="form-group">
                    <label htmlFor="login-password">Password</label>
                    <div className="input-wrapper">
                      <Lock size={18} />
                      <input 
                        type="password" 
                        id="login-password" 
                        required 
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                    An OTP (One-Time Password) verification code will be sent to this email address to log in.
                  </div>
                )}
                
                <button type="submit" className="btn btn-primary btn-block">
                  {loginMethod === 'password' ? 'Sign In' : 'Send Verification OTP'}
                </button>
              </form>
            </div>
          )}

          {/* Register Panel */}
          {activeTab === 'register' && (
            <div className="auth-form-panel active">
              <form onSubmit={handleRegisterSubmit}>
                <h2>Join ShareMeal</h2>
                <p className="form-desc">Create your profile to start donating, claiming, or delivering food.</p>
                
                <div className="form-group">
                  <label>Select User Type</label>
                  <div className="role-selector">
                    <div 
                      className={`role-option ${role === 'donor' ? 'active' : ''}`}
                      onClick={() => setRole('donor')}
                    >
                      <Store size={20} />
                      <span>Food Donor</span>
                    </div>
                    
                    <div 
                      className={`role-option ${role === 'recipient' ? 'active' : ''}`}
                      onClick={() => setRole('recipient')}
                    >
                      <Heart size={20} />
                      <span>NGO Recipient</span>
                    </div>
                    
                    <div 
                      className={`role-option ${role === 'volunteer' ? 'active' : ''}`}
                      onClick={() => setRole('volunteer')}
                    >
                      <Truck size={20} />
                      <span>Volunteer</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="register-name">Full Name</label>
                  <div className="input-wrapper">
                    <UserIcon size={18} />
                    <input 
                      type="text" 
                      id="register-name" 
                      required 
                      placeholder="John Doe"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="register-email">Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={18} />
                    <input 
                      type="email" 
                      id="register-email" 
                      required 
                      placeholder="john@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="register-phone">Phone Number</label>
                  <div className="input-wrapper">
                    <Phone size={18} />
                    <input 
                      type="tel" 
                      id="register-phone" 
                      required 
                      placeholder="+1 (555) 000-0000"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="register-org">
                    {role === 'donor' ? 'Business / Restaurant Name' : role === 'recipient' ? 'NGO / Organization Name' : 'Volunteer Handle Name'}
                  </label>
                  <div className="input-wrapper">
                    <Building size={18} />
                    <input 
                      type="text" 
                      id="register-org" 
                      required 
                      placeholder="e.g. Green Palace Food Bank"
                      value={regOrg}
                      onChange={(e) => setRegOrg(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="register-password">Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} />
                    <input 
                      type="password" 
                      id="register-password" 
                      required 
                      minLength={6}
                      placeholder="Min. 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block">Create Account</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* OTP verification Overlay Dialog */}
      {showOtpOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(9, 13, 22, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="dashboard-card" style={{
            maxWidth: '420px',
            width: '100%',
            padding: '2.5rem 2rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', marginBottom: '1.25rem' }}>
              <ShieldCheck size={28} />
            </div>
            
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Confirm Verification Code</h3>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.75rem', lineHeight: '1.5' }}>
              We have sent a 6-digit OTP code to <strong>{otpPurpose === 'register' ? regEmail : loginEmail}</strong>. Please enter it below to complete.
            </p>

            <form onSubmit={handleOtpVerifyAndSubmit}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div className="input-wrapper" style={{ display: 'flex', justifyContent: 'center' }}>
                  <input 
                    type="text" 
                    id="otp-input" 
                    required 
                    maxLength={6} 
                    pattern="\d{6}"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      fontSize: '1.6rem',
                      textAlign: 'center',
                      letterSpacing: '8px',
                      fontWeight: 800,
                      backgroundColor: 'var(--bg-input)',
                      border: '2px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-dark)',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => setShowOtpOverlay(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                >
                  Verify
                </button>
              </div>
            </form>
            
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Didn't receive code? </span>
              <button 
                type="button"
                onClick={() => sendOtpCode(otpPurpose === 'register' ? regEmail : loginEmail, otpPurpose)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Resend Code
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
