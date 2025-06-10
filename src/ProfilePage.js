import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import './ProfilePage.css';

const ProfilePage = ({ onBack, onNavigate, onEditBlog, savedBlogs, onLoadSavedBlogs, user, userBlogs }) => {
  const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
  const [blogStats, setBlogStats] = useState({
    totalBlogs: 0,
    totalWords: 0,
    avgWordsPerBlog: 0,
    mostUsedTopic: '',
    recentActivity: ''
  });

  const authUser = useSelector(state => state.auth.user);
  const currentUser = user || authUser;

  const calculateBlogStats = useCallback(() => {
    const allBlogs = [...(savedBlogs || []), ...(userBlogs || [])];
    
    if (allBlogs.length === 0) {
      setBlogStats({
        totalBlogs: 0,
        totalWords: 0,
        avgWordsPerBlog: 0,
        mostUsedTopic: 'None',
        recentActivity: 'No blogs yet'
      });
      return;
    }

    const totalWords = allBlogs.reduce((sum, blog) => {
      const content = blog.content || blog.html_content || '';
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      return sum + wordCount;
    }, 0);

    const topics = allBlogs.map(blog => blog.topic || blog.title || 'Untitled').filter(Boolean);
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {});
    
    const mostUsedTopic = Object.keys(topicCounts).length > 0 
      ? Object.keys(topicCounts).reduce((a, b) => topicCounts[a] > topicCounts[b] ? a : b)
      : 'None';

    const recentBlog = allBlogs.sort((a, b) => new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0))[0];
    const recentActivity = recentBlog 
      ? `Last blog: ${new Date(recentBlog.created_at || recentBlog.updated_at).toLocaleDateString()}`
      : 'No recent activity';

    setBlogStats({
      totalBlogs: allBlogs.length,
      totalWords,
      avgWordsPerBlog: Math.round(totalWords / allBlogs.length),
      mostUsedTopic,
      recentActivity
    });
  }, [savedBlogs, userBlogs]);

  useEffect(() => {
    if (currentUser) {
      calculateBlogStats();
    }
  }, [currentUser, calculateBlogStats]);

  const handleLoadBlogs = async () => {
    setIsLoadingBlogs(true);
    try {
      await onLoadSavedBlogs();
    } catch (error) {
      console.error('Error loading blogs:', error);
    } finally {
      setIsLoadingBlogs(false);
    }
  };

  const handleEditBlog = (blog) => {
    if (onEditBlog) {
      onEditBlog(blog);
    }
  };

  const formatContent = (content, maxLength = 150) => {
    if (!content) return 'No content available';
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...'
      : textContent;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!currentUser) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <button className="back-button" onClick={onBack}>
            ← Back to Blog
          </button>
          <h1>Profile</h1>
        </div>
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Blog
        </button>
        <h1>Profile</h1>
      </div>

      <div className="profile-content">
        {/* User Info Card */}
        <div className="user-info-card">
          <div className="user-avatar">
            {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '👤'}
          </div>
          <div className="user-details">
            <h2>{currentUser.username || 'User'}</h2>
            <p className="user-email">{currentUser.email || 'No email provided'}</p>
            <p className="user-joined">
              Member since {currentUser.created_at ? formatDate(currentUser.created_at) : 'Unknown'}
            </p>
          </div>
        </div>

        {/* Blog Statistics */}
        <div className="stats-section">
          <h3>📊 Blog Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{blogStats.totalBlogs}</div>
              <div className="stat-label">Total Blogs</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{blogStats.totalWords.toLocaleString()}</div>
              <div className="stat-label">Total Words</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{blogStats.avgWordsPerBlog}</div>
              <div className="stat-label">Avg Words/Blog</div>
            </div>
            <div className="stat-card">
              <div className="stat-topic">{blogStats.mostUsedTopic}</div>
              <div className="stat-label">Most Used Topic</div>
            </div>
          </div>
          <div className="recent-activity">
            <p>{blogStats.recentActivity}</p>
          </div>
        </div>

        {/* Saved Blogs Section */}
        <div className="saved-blogs-section">
          <div className="section-header">
            <h3>📝 Saved Blogs</h3>
            <button 
              className="load-blogs-btn"
              onClick={handleLoadBlogs}
              disabled={isLoadingBlogs}
            >
              {isLoadingBlogs ? '🔄 Loading...' : '🔄 Refresh Blogs'}
            </button>
          </div>

          {isLoadingBlogs ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Loading your saved blogs...</p>
            </div>
          ) : savedBlogs && savedBlogs.length > 0 ? (
            <div className="blogs-grid">
              {savedBlogs.map((blog) => (
                <div key={blog.id} className="blog-card">
                  <div className="blog-card-header">
                    <h4 className="blog-title">
                      {blog.title || blog.topic || 'Untitled Blog'}
                    </h4>
                    <span className="blog-date">
                      {formatDate(blog.created_at || blog.updated_at)}
                    </span>
                  </div>
                  <div className="blog-preview">
                    {formatContent(blog.content || blog.html_content)}
                  </div>
                  <div className="blog-meta">
                    {blog.topic && <span className="blog-topic">📂 {blog.topic}</span>}
                    {blog.target_audience && <span className="blog-audience">👥 {blog.target_audience}</span>}
                    {blog.tone && <span className="blog-tone">🎭 {blog.tone}</span>}
                  </div>
                  <div className="blog-actions">
                    <button 
                      className="edit-blog-btn"
                      onClick={() => handleEditBlog(blog)}
                    >
                      ✏️ Edit in Canva
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-blogs">
              <p>No saved blogs found. Start creating some amazing content!</p>
              <button 
                className="create-blog-btn"
                onClick={() => onNavigate('blog')}
              >
                ✨ Create Your First Blog
              </button>
            </div>
          )}
        </div>

        {/* Marketing Insights */}
        <div className="marketing-section">
          <h3>📈 Marketing Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <h4>Content Performance</h4>
              <p>Your blogs average {blogStats.avgWordsPerBlog} words, which is {blogStats.avgWordsPerBlog > 1000 ? 'excellent for SEO' : 'good for quick reads'}.</p>
            </div>
            <div className="insight-card">
              <h4>Topic Focus</h4>
              <p>You write most about "{blogStats.mostUsedTopic}". Consider diversifying topics to reach broader audiences.</p>
            </div>
            <div className="insight-card">
              <h4>Publishing Consistency</h4>
              <p>{blogStats.totalBlogs > 5 ? 'Great job staying consistent!' : 'Try to publish more regularly for better engagement.'}</p>
            </div>
          </div>
        </div>

        {/* SEO Tips */}
        <div className="seo-section">
          <h3>🔍 SEO Tips</h3>
          <div className="seo-tips">
            <div className="tip">
              <span className="tip-icon">💡</span>
              <p>Aim for 1,500-2,500 words per blog post for better search rankings.</p>
            </div>
            <div className="tip">
              <span className="tip-icon">🎯</span>
              <p>Use your main keyword in the title, first paragraph, and conclusion.</p>
            </div>
            <div className="tip">
              <span className="tip-icon">🔗</span>
              <p>Include internal links to your other blog posts to improve site navigation.</p>
            </div>
            <div className="tip">
              <span className="tip-icon">📱</span>
              <p>Ensure your content is mobile-friendly and loads quickly.</p>
            </div>
          </div>
        </div>

        {/* Future Features Preview */}
        <div className="future-features">
          <h3>🚀 Coming Soon</h3>
          <div className="feature-preview">
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <div>
                <h4>Advanced Analytics</h4>
                <p>Track views, engagement, and performance metrics</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🤝</span>
              <div>
                <h4>Collaboration Tools</h4>
                <p>Share and collaborate on blog posts with team members</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎨</span>
              <div>
                <h4>Custom Templates</h4>
                <p>Create and save your own blog post templates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 