import React, { useState } from 'react';

const LoginForm = ({ onLogin, onSwitchToRegister }) => {
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      alert('Please enter both email and password');
      return;
    }

    setIsLoggingIn(true);
    const success = await onLogin(loginData);
    setIsLoggingIn(false);
    
    if (!success) {
      setLoginData({ ...loginData, password: '' }); // Clear password on failed login
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🤖 AI Blog Generator</h1>
          <p>Sign in to access your dashboard</p>
        </div>
        
        <form onSubmit={handleLoginSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData({
                ...loginData,
                email: e.target.value
              })}
              placeholder="Enter your email"
              disabled={isLoggingIn}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData({
                ...loginData,
                password: e.target.value
              })}
              placeholder="Enter your password"
              disabled={isLoggingIn}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="login-btn"
            disabled={isLoggingIn || !loginData.email || !loginData.password}
          >
            {isLoggingIn ? (
              <span className="loading-content">
                <span className="spinner"></span>
                Signing in...
              </span>
            ) : (
              '🚀 Sign In'
            )}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Don't have an account?</p>
          <button 
            className="register-link"
            onClick={onSwitchToRegister}
            disabled={isLoggingIn}
          >
            Create Account with Questionnaire
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 