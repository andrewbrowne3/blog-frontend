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
      <div className="login-background">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <div className="brand-logo">
                <div className="logo-icon">📊</div>
                <div className="brand-text">
                  <h1>SEOblogger.io</h1>
                  <span className="brand-tagline">AI-Powered Content Creation</span>
                </div>
              </div>
              <div className="welcome-text">
                <h2>Welcome Back!</h2>
                <p>Sign in to continue creating SEO-optimized blog content with AI</p>
              </div>
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
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
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
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
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
                  <>
                    <span>Sign In to SEOblogger.io</span>
                    <span className="button-arrow">→</span>
                  </>
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
                  <span>New to SEOblogger.io? </span>
                  <button
                    type="button"
                    className="link-button register-link"
                    onClick={onSwitchToRegister}
                    disabled={authLoading}
                  >
                    Create your account
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="login-features">
            <div className="features-header">
              <h3>🚀 Powerful SEO Features</h3>
              <p>Everything you need to create high-ranking content</p>
            </div>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">🤖</div>
                <div className="feature-content">
                  <h4>AI Blog Generation</h4>
                  <p>Create SEO-optimized content with advanced AI</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎨</div>
                <div className="feature-content">
                  <h4>Visual Content</h4>
                  <p>Add contextual images with DALL-E integration</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <div className="feature-content">
                  <h4>SEO Analytics</h4>
                  <p>Track performance and optimize for search</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📝</div>
                <div className="feature-content">
                  <h4>Content Editor</h4>
                  <p>Professional editing with Canva-style tools</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 