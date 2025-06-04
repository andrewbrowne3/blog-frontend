import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, selectAuthLoading, selectAuthError, clearError } from './store/slices/authSlice';
import './LoginPage.css';

const LoginPage = ({ onSwitchToRegister, onForgotPassword }) => {
  const dispatch = useDispatch();
  const authLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear any existing errors when user starts typing
    if (authError) {
      dispatch(clearError());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return;
    }

    try {
      await dispatch(loginUser({
        email: formData.email,
        username: formData.email.split('@')[0],
        password: formData.password
      })).unwrap();
      
      // Login successful - App.js will handle the redirect
    } catch (error) {
      console.error('Login failed:', error);
      // Error is handled by Redux state
    }
  };

  const isFormValid = formData.email && formData.password;

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🤖 AI Blog Generator</h1>
          <h2>Welcome Back!</h2>
          <p>Sign in to continue creating amazing blog content</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {authError && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{authError}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="your.email@company.com"
              required
              disabled={authLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter your password"
                required
                disabled={authLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={authLoading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={!isFormValid || authLoading}
          >
            {authLoading ? (
              <span className="loading-content">
                <span className="spinner"></span>
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="login-footer">
            <button
              type="button"
              className="link-button"
              onClick={onForgotPassword}
              disabled={authLoading}
            >
              Forgot your password?
            </button>
            
            <div className="register-prompt">
              <span>New to AI Blog Generator? </span>
              <button
                type="button"
                className="link-button register-link"
                onClick={onSwitchToRegister}
                disabled={authLoading}
              >
                Get started with our questionnaire
              </button>
            </div>
          </div>
        </form>

        <div className="login-features">
          <h3>What you can do:</h3>
          <ul>
            <li>🚀 Generate AI-powered blog posts</li>
            <li>🎨 Add contextual images with DALL-E</li>
            <li>🔍 Search and integrate Google Images</li>
            <li>📝 Edit content with Canva-style editor</li>
            <li>📄 Export to HTML format</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 