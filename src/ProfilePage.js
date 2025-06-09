import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUser, selectIsAuthenticated } from './store/slices/authSlice';
import './ProfilePage.css';

const ProfilePage = ({ onBack, onNavigate }) => {
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  // const [userBlogs, setUserBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blogStats, setBlogStats] = useState({
    totalBlogs: 0,
    totalWords: 0,
    averageWords: 0,
    recentActivity: 0
  });

  // API URL helper
  const getApiUrl = (endpoint) => {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-production-domain.com' 
      : 'http://localhost:8000';
    return `${baseUrl}/api/blog${endpoint}`;
  };

  // Load user's saved blogs
  const loadUserBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/saved'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const blogs = await response.json();
        // setUserBlogs(blogs);
        
        // Calculate blog statistics
        const stats = calculateBlogStats(blogs);
        setBlogStats(stats);
      } else {
        console.error('Failed to load blogs');
        // setUserBlogs([]);
      }
    } catch (error) {
      console.error('Error loading blogs:', error);
      // setUserBlogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate blog statistics
  const calculateBlogStats = (blogs) => {
    if (!blogs || blogs.length === 0) {
      return { totalBlogs: 0, totalWords: 0, averageWords: 0, recentActivity: 0 };
    }

    const totalBlogs = blogs.length;
    const totalWords = blogs.reduce((sum, blog) => {
      const wordCount = blog.content.split(/\s+/).length;
      return sum + wordCount;
    }, 0);
    const averageWords = Math.round(totalWords / totalBlogs);

    // Recent activity (blogs in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = blogs.filter(blog => 
      new Date(blog.created_at) > sevenDaysAgo
    ).length;

    return { totalBlogs, totalWords, averageWords, recentActivity };
  };

  // Generate marketing insights based on user profile
  const generateMarketingInsights = () => {
    if (!user) return [];

    const insights = [];

    // Content strategy based on goals
    if (user.content_goals && user.content_goals.length > 0) {
      insights.push({
        title: "Content Strategy Focus",
        description: `Based on your goals (${user.content_goals.join(', ')}), focus on creating content that demonstrates expertise and builds trust with your ${user.target_audience || 'target audience'}.`,
        actionItems: [
          "Create case studies showcasing your expertise",
          "Share behind-the-scenes insights from your industry",
          "Develop how-to guides related to your field"
        ]
      });
    }

    // Frequency recommendations
    if (user.content_frequency) {
      insights.push({
        title: "Publishing Schedule",
        description: `Your preferred ${user.content_frequency} schedule is great for building audience engagement.`,
        actionItems: [
          "Maintain consistency with your publishing schedule",
          "Plan content calendar 2-4 weeks in advance",
          "Batch create content to stay ahead of schedule"
        ]
      });
    }

    // SEO recommendations
    if (user.seo_focus) {
      insights.push({
        title: "SEO Optimization",
        description: "Your focus on SEO will help drive organic traffic to your content.",
        actionItems: [
          "Research long-tail keywords in your industry",
          "Optimize meta descriptions and titles",
          "Build internal linking between related posts"
        ]
      });
    }

    return insights;
  };

  // Generic SEO tips
  const getSEOTips = () => {
    return [
      {
        category: "Keyword Optimization",
        tips: [
          "Use primary keywords in your title and first paragraph",
          "Include related keywords naturally throughout the content",
          "Research competitor keywords using tools like SEMrush or Ahrefs",
          "Target long-tail keywords for better ranking opportunities"
        ]
      },
      {
        category: "Content Structure",
        tips: [
          "Use H1, H2, H3 tags to structure your content hierarchically",
          "Keep paragraphs short (2-3 sentences) for better readability",
          "Include bullet points and numbered lists for scannable content",
          "Add a table of contents for longer articles"
        ]
      },
      {
        category: "Technical SEO",
        tips: [
          "Optimize images with descriptive alt text and file names",
          "Ensure fast page loading speeds (under 3 seconds)",
          "Make your content mobile-friendly and responsive",
          "Use schema markup to help search engines understand your content"
        ]
      },
      {
        category: "Content Quality",
        tips: [
          "Write comprehensive, in-depth content (1500+ words for competitive topics)",
          "Include original research, data, or unique insights",
          "Update old content regularly to keep it fresh and relevant",
          "Link to authoritative sources to build credibility"
        ]
      }
    ];
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadUserBlogs();
    }
  }, [isAuthenticated, loadUserBlogs]);

  if (!isAuthenticated) {
    return (
      <div className="profile-page">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>Please log in to view your profile.</p>
          <button onClick={onBack} className="back-btn">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div className="header-content">
          <button onClick={onBack} className="back-btn">
            ← Back to Blog Writer
          </button>
          <h1>👤 Your Profile & Analytics</h1>
          <div className="header-actions">
            <button 
              onClick={() => onNavigate('blog')} 
              className="nav-btn"
            >
              ✍️ Write New Blog
            </button>
          </div>
        </div>
      </header>

      <main className="profile-content">
        {/* User Information Card */}
        <section className="user-info-card">
          <div className="user-avatar">
            <div className="avatar-circle">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase() || '?'}
            </div>
          </div>
          <div className="user-details">
            <h2>{user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username}</h2>
            <p className="user-email">{user?.email}</p>
            <div className="user-meta">
              <span className="meta-item">
                <strong>Industry:</strong> {user?.industry || 'Not specified'}
              </span>
              <span className="meta-item">
                <strong>Job Title:</strong> {user?.job_title || 'Not specified'}
              </span>
              <span className="meta-item">
                <strong>Experience:</strong> {user?.experience_level || 'Not specified'}
              </span>
            </div>
          </div>
        </section>

        {/* Content Preferences */}
        <section className="content-preferences">
          <h3>📝 Content Preferences</h3>
          <div className="preferences-grid">
            <div className="pref-item">
              <strong>Content Goals:</strong>
              <div className="tags">
                {user?.content_goals?.map((goal, index) => (
                  <span key={index} className="tag">{goal}</span>
                )) || <span className="no-data">Not specified</span>}
              </div>
            </div>
            <div className="pref-item">
              <strong>Target Audience:</strong>
              <span>{user?.target_audience || 'Not specified'}</span>
            </div>
            <div className="pref-item">
              <strong>Preferred Tone:</strong>
              <span>{user?.preferred_tone || 'Not specified'}</span>
            </div>
            <div className="pref-item">
              <strong>Content Frequency:</strong>
              <span>{user?.content_frequency || 'Not specified'}</span>
            </div>
            <div className="pref-item">
              <strong>Topics of Interest:</strong>
              <div className="tags">
                {user?.topics_of_interest?.map((topic, index) => (
                  <span key={index} className="tag">{topic}</span>
                )) || <span className="no-data">Not specified</span>}
              </div>
            </div>
            <div className="pref-item">
              <strong>Writing Style:</strong>
              <span>{user?.writing_style_preference || 'Not specified'}</span>
            </div>
          </div>
        </section>

        {/* Blog Statistics */}
        <section className="blog-statistics">
          <h3>📊 Blog Statistics</h3>
          {loading ? (
            <div className="loading">Loading statistics...</div>
          ) : (
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
                <div className="stat-number">{blogStats.averageWords}</div>
                <div className="stat-label">Avg Words/Blog</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{blogStats.recentActivity}</div>
                <div className="stat-label">Recent Activity (7 days)</div>
              </div>
            </div>
          )}
        </section>

        {/* Marketing Insights */}
        <section className="marketing-insights">
          <h3>💡 Personalized Marketing Insights</h3>
          <div className="insights-container">
            {generateMarketingInsights().map((insight, index) => (
              <div key={index} className="insight-card">
                <h4>{insight.title}</h4>
                <p>{insight.description}</p>
                <div className="action-items">
                  <strong>Action Items:</strong>
                  <ul>
                    {insight.actionItems.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SEO Tips */}
        <section className="seo-tips">
          <h3>🚀 SEO Tips & Best Practices</h3>
          <div className="seo-container">
            {getSEOTips().map((category, index) => (
              <div key={index} className="seo-category">
                <h4>{category.category}</h4>
                <ul>
                  {category.tips.map((tip, tipIndex) => (
                    <li key={tipIndex}>{tip}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Future Features Preview */}
        <section className="future-features">
          <h3>🔮 Coming Soon</h3>
          <div className="feature-preview">
            <div className="preview-item">
              <h4>🤖 AI-Powered SEO Analysis</h4>
              <p>Get personalized SEO recommendations based on your content and industry trends.</p>
            </div>
            <div className="preview-item">
              <h4>📈 Advanced Analytics</h4>
              <p>Track performance metrics, engagement rates, and content ROI.</p>
            </div>
            <div className="preview-item">
              <h4>🎯 Trend-Based Recommendations</h4>
              <p>Receive content suggestions based on current industry trends and search patterns.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage; 