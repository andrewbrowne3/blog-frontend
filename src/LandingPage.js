import React, { useState } from 'react';
import './LandingPage.css';

const LandingPage = ({ onComplete }) => {
  const [showFunnel, setShowFunnel] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    email: '',
    company: '',
    
    // Step 2: Blog Goals
    primaryGoal: '',
    targetAudience: '',
    contentFrequency: '',
    
    // Step 3: Content Preferences
    blogTopics: [],
    contentStyle: '',
    tonePreference: '',
    
    // Step 4: SEO & Technical
    seoFocus: '',
    keywordTargets: '',
    competitorSites: '',
    
    // Step 5: Visual Preferences
    imageStyle: '',
    brandColors: '',
    visualElements: [],
    
    // Step 6: Business Context
    industry: '',
    businessSize: '',
    currentChallenges: '',
    
    // Step 7: Final Preferences
    budgetRange: '',
    timeline: '',
    additionalRequirements: ''
  });

  const steps = [
    {
      title: "Welcome! Let's Get Started",
      subtitle: "Tell us about yourself",
      fields: ['name', 'email', 'company']
    },
    {
      title: "What Are Your Blog Goals?",
      subtitle: "Help us understand your objectives",
      fields: ['primaryGoal', 'targetAudience', 'contentFrequency']
    },
    {
      title: "Content Preferences",
      subtitle: "What kind of content do you want?",
      fields: ['blogTopics', 'contentStyle', 'tonePreference']
    },
    {
      title: "SEO & Technical Requirements",
      subtitle: "Let's optimize for search engines",
      fields: ['seoFocus', 'keywordTargets', 'competitorSites']
    },
    {
      title: "Visual & Brand Preferences",
      subtitle: "Make your content visually appealing",
      fields: ['imageStyle', 'brandColors', 'visualElements']
    },
    {
      title: "Business Context",
      subtitle: "Help us understand your business",
      fields: ['industry', 'businessSize', 'currentChallenges']
    },
    {
      title: "Final Details",
      subtitle: "Last few questions to get started",
      fields: ['budgetRange', 'timeline', 'additionalRequirements']
    }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayInputChange = (field, value, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(item => item !== value)
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    setShowFunnel(false);
    if (onComplete) {
      onComplete(formData);
    }
  };

  const isStepValid = () => {
    const currentFields = steps[currentStep].fields;
    return currentFields.every(field => {
      const value = formData[field];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value && value.trim() !== '';
    });
  };

  const openFunnel = () => {
    setShowFunnel(true);
    setCurrentStep(0);
  };

  const closeFunnel = () => {
    setShowFunnel(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="step-content">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your.email@company.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Company/Organization *</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Your company name"
                required
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="step-content">
            <div className="form-group">
              <label>Primary Blog Goal *</label>
              <select
                value={formData.primaryGoal}
                onChange={(e) => handleInputChange('primaryGoal', e.target.value)}
                required
              >
                <option value="">Select your main goal</option>
                <option value="lead-generation">Lead Generation</option>
                <option value="brand-awareness">Brand Awareness</option>
                <option value="thought-leadership">Thought Leadership</option>
                <option value="customer-education">Customer Education</option>
                <option value="seo-traffic">SEO & Organic Traffic</option>
                <option value="customer-retention">Customer Retention</option>
              </select>
            </div>
            <div className="form-group">
              <label>Target Audience *</label>
              <select
                value={formData.targetAudience}
                onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                required
              >
                <option value="">Who are you writing for?</option>
                <option value="business-professionals">Business Professionals</option>
                <option value="entrepreneurs">Entrepreneurs</option>
                <option value="consumers">General Consumers</option>
                <option value="technical-experts">Technical Experts</option>
                <option value="students">Students & Learners</option>
                <option value="industry-specific">Industry-Specific Audience</option>
              </select>
            </div>
            <div className="form-group">
              <label>Content Frequency *</label>
              <select
                value={formData.contentFrequency}
                onChange={(e) => handleInputChange('contentFrequency', e.target.value)}
                required
              >
                <option value="">How often do you want to publish?</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="as-needed">As Needed</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <div className="form-group">
              <label>Blog Topics (Select all that apply) *</label>
              <div className="checkbox-grid">
                {[
                  'Technology & Innovation',
                  'Business Strategy',
                  'Marketing & Sales',
                  'Industry News',
                  'How-to Guides',
                  'Case Studies',
                  'Product Updates',
                  'Company Culture',
                  'Customer Stories',
                  'Thought Leadership'
                ].map(topic => (
                  <label key={topic} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.blogTopics.includes(topic)}
                      onChange={(e) => handleArrayInputChange('blogTopics', topic, e.target.checked)}
                    />
                    <span>{topic}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Content Style *</label>
              <select
                value={formData.contentStyle}
                onChange={(e) => handleInputChange('contentStyle', e.target.value)}
                required
              >
                <option value="">Choose your preferred style</option>
                <option value="educational">Educational & Informative</option>
                <option value="conversational">Conversational & Friendly</option>
                <option value="professional">Professional & Formal</option>
                <option value="storytelling">Storytelling & Narrative</option>
                <option value="data-driven">Data-Driven & Analytical</option>
              </select>
            </div>
            <div className="form-group">
              <label>Tone Preference *</label>
              <select
                value={formData.tonePreference}
                onChange={(e) => handleInputChange('tonePreference', e.target.value)}
                required
              >
                <option value="">Select your preferred tone</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly & Approachable</option>
                <option value="authoritative">Authoritative & Expert</option>
                <option value="casual">Casual & Relaxed</option>
                <option value="inspiring">Inspiring & Motivational</option>
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <div className="form-group">
              <label>SEO Focus *</label>
              <select
                value={formData.seoFocus}
                onChange={(e) => handleInputChange('seoFocus', e.target.value)}
                required
              >
                <option value="">What's your SEO priority?</option>
                <option value="high-volume-keywords">High Volume Keywords</option>
                <option value="long-tail-keywords">Long-tail Keywords</option>
                <option value="local-seo">Local SEO</option>
                <option value="competitor-keywords">Competitor Keywords</option>
                <option value="brand-keywords">Brand Keywords</option>
              </select>
            </div>
            <div className="form-group">
              <label>Target Keywords *</label>
              <textarea
                value={formData.keywordTargets}
                onChange={(e) => handleInputChange('keywordTargets', e.target.value)}
                placeholder="Enter your target keywords (comma-separated)"
                rows="3"
                required
              />
            </div>
            <div className="form-group">
              <label>Competitor Websites</label>
              <textarea
                value={formData.competitorSites}
                onChange={(e) => handleInputChange('competitorSites', e.target.value)}
                placeholder="List competitor websites you'd like to analyze"
                rows="3"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <div className="form-group">
              <label>Image Style Preference *</label>
              <select
                value={formData.imageStyle}
                onChange={(e) => handleInputChange('imageStyle', e.target.value)}
                required
              >
                <option value="">Choose your image style</option>
                <option value="professional-photography">Professional Photography</option>
                <option value="illustrations">Custom Illustrations</option>
                <option value="infographics">Infographics & Data Viz</option>
                <option value="stock-photos">High-Quality Stock Photos</option>
                <option value="mixed-media">Mixed Media Approach</option>
              </select>
            </div>
            <div className="form-group">
              <label>Brand Colors</label>
              <input
                type="text"
                value={formData.brandColors}
                onChange={(e) => handleInputChange('brandColors', e.target.value)}
                placeholder="Enter your brand colors (e.g., #FF5733, #3498DB)"
              />
            </div>
            <div className="form-group">
              <label>Visual Elements (Select all that apply)</label>
              <div className="checkbox-grid">
                {[
                  'Charts & Graphs',
                  'Screenshots',
                  'Product Images',
                  'Team Photos',
                  'Behind-the-scenes',
                  'Customer Photos',
                  'Process Diagrams',
                  'Before/After Images'
                ].map(element => (
                  <label key={element} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.visualElements.includes(element)}
                      onChange={(e) => handleArrayInputChange('visualElements', element, e.target.checked)}
                    />
                    <span>{element}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="step-content">
            <div className="form-group">
              <label>Industry *</label>
              <select
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                required
              >
                <option value="">Select your industry</option>
                <option value="technology">Technology</option>
                <option value="healthcare">Healthcare</option>
                <option value="finance">Finance</option>
                <option value="education">Education</option>
                <option value="retail">Retail</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="consulting">Consulting</option>
                <option value="real-estate">Real Estate</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Business Size *</label>
              <select
                value={formData.businessSize}
                onChange={(e) => handleInputChange('businessSize', e.target.value)}
                required
              >
                <option value="">Choose your business size</option>
                <option value="startup">Startup (1-10 employees)</option>
                <option value="small">Small Business (11-50 employees)</option>
                <option value="medium">Medium Business (51-200 employees)</option>
                <option value="large">Large Business (200+ employees)</option>
                <option value="enterprise">Enterprise (1000+ employees)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Current Content Challenges *</label>
              <textarea
                value={formData.currentChallenges}
                onChange={(e) => handleInputChange('currentChallenges', e.target.value)}
                placeholder="What challenges are you facing with content creation?"
                rows="4"
                required
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="step-content">
            <div className="form-group">
              <label>Budget Range *</label>
              <select
                value={formData.budgetRange}
                onChange={(e) => handleInputChange('budgetRange', e.target.value)}
                required
              >
                <option value="">Select your budget range</option>
                <option value="under-500">Under $500/month</option>
                <option value="500-1000">$500 - $1,000/month</option>
                <option value="1000-2500">$1,000 - $2,500/month</option>
                <option value="2500-5000">$2,500 - $5,000/month</option>
                <option value="over-5000">Over $5,000/month</option>
              </select>
            </div>
            <div className="form-group">
              <label>Timeline *</label>
              <select
                value={formData.timeline}
                onChange={(e) => handleInputChange('timeline', e.target.value)}
                required
              >
                <option value="">When do you want to start?</option>
                <option value="immediately">Immediately</option>
                <option value="within-week">Within a week</option>
                <option value="within-month">Within a month</option>
                <option value="within-quarter">Within 3 months</option>
                <option value="planning-phase">Still in planning phase</option>
              </select>
            </div>
            <div className="form-group">
              <label>Additional Requirements</label>
              <textarea
                value={formData.additionalRequirements}
                onChange={(e) => handleInputChange('additionalRequirements', e.target.value)}
                placeholder="Any specific requirements or questions?"
                rows="4"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (showFunnel) {
    return (
      <div className="funnel-overlay">
        <div className="funnel-modal">
          <div className="funnel-header">
            <button className="close-funnel" onClick={closeFunnel}>×</button>
            <h2>Let's Create Your Perfect Blog</h2>
            <div className="progress-bar">
              <div className="progress-steps">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`progress-step ${index <= currentStep ? 'active' : ''} ${index === currentStep ? 'current' : ''}`}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
              <div className="progress-line">
                <div 
                  className="progress-fill"
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="funnel-content">
            <div className="step-header">
              <h3>{steps[currentStep].title}</h3>
              <p>{steps[currentStep].subtitle}</p>
            </div>

            {renderStepContent()}

            <div className="step-navigation">
              {currentStep > 0 && (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={prevStep}
                >
                  ← Previous
                </button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={nextStep}
                  disabled={!isStepValid()}
                >
                  Next →
                </button>
              ) : (
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={handleSubmit}
                  disabled={!isStepValid()}
                >
                  Start Creating Blogs! 🎉
                </button>
              )}
            </div>
          </div>

          <div className="funnel-footer">
            <p>Step {currentStep + 1} of {steps.length}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="container">
          <div className="logo">
            <span className="logo-icon">✍️</span>
            <span className="logo-text">SEOBlogger</span>
          </div>
          <nav className="nav">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <button className="cta-button" onClick={openFunnel}>Get Started</button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>Create SEO-Optimized Blogs in Minutes with AI</h1>
              <p>Transform your content strategy with our AI-powered blog writer that generates engaging, SEO-optimized articles with custom images tailored to your brand.</p>
              <div className="hero-buttons">
                <button className="cta-button primary" onClick={openFunnel}>
                  Start Creating Free
                </button>
                <button className="cta-button secondary">
                  Watch Demo
                </button>
              </div>
              <div className="hero-stats">
                <div className="stat">
                  <span className="stat-number">10,000+</span>
                  <span className="stat-label">Blogs Created</span>
                </div>
                <div className="stat">
                  <span className="stat-number">95%</span>
                  <span className="stat-label">SEO Optimized</span>
                </div>
                <div className="stat">
                  <span className="stat-number">5 min</span>
                  <span className="stat-label">Average Time</span>
                </div>
              </div>
            </div>
            <div className="hero-image">
              <div className="hero-visual">
                <div className="floating-card card-1">
                  <div className="card-icon">📝</div>
                  <div className="card-text">AI Writing</div>
                </div>
                <div className="floating-card card-2">
                  <div className="card-icon">🎯</div>
                  <div className="card-text">SEO Optimized</div>
                </div>
                <div className="floating-card card-3">
                  <div className="card-icon">🖼️</div>
                  <div className="card-text">Custom Images</div>
                </div>
                <div className="hero-main-visual">
                  <div className="blog-preview">
                    <div className="blog-header"></div>
                    <div className="blog-lines">
                      <div className="line"></div>
                      <div className="line"></div>
                      <div className="line short"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2>Everything You Need for Perfect Blogs</h2>
            <p>Our AI-powered platform handles every aspect of blog creation</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Writing</h3>
              <p>Advanced AI creates engaging, human-like content tailored to your audience and brand voice.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>SEO Optimization</h3>
              <p>Built-in SEO tools ensure your content ranks higher with keyword optimization and meta tags.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🖼️</div>
              <h3>Custom Images</h3>
              <p>AI-generated images and graphics that perfectly complement your content and brand aesthetic.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Generate complete blog posts in under 5 minutes, saving hours of writing and editing time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analytics Ready</h3>
              <p>Built-in tracking and analytics integration to measure your content's performance.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3>Brand Consistency</h3>
              <p>Maintains your brand voice, style, and visual identity across all generated content.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Three simple steps to create amazing blog content</p>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Answer Quick Questions</h3>
                <p>Tell us about your business, goals, and content preferences through our guided questionnaire.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>AI Creates Your Blog</h3>
                <p>Our advanced AI generates SEO-optimized content with custom images tailored to your specifications.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Review & Publish</h3>
                <p>Review your content, make any adjustments, and publish directly to your website or export as needed.</p>
              </div>
            </div>
          </div>
          <div className="cta-section">
            <button className="cta-button primary" onClick={openFunnel}>
              Start Your First Blog
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2>What Our Users Say</h2>
            <p>Join thousands of satisfied content creators</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial">
              <div className="testimonial-content">
                <p>"SEOBlogger has revolutionized our content strategy. We're publishing 3x more content with better SEO results."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">SM</div>
                <div className="author-info">
                  <div className="author-name">Sarah Mitchell</div>
                  <div className="author-title">Marketing Director, TechCorp</div>
                </div>
              </div>
            </div>
            <div className="testimonial">
              <div className="testimonial-content">
                <p>"The quality of AI-generated content is incredible. It perfectly matches our brand voice and saves us hours every week."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">JD</div>
                <div className="author-info">
                  <div className="author-name">James Davis</div>
                  <div className="author-title">Content Manager, StartupXYZ</div>
                </div>
              </div>
            </div>
            <div className="testimonial">
              <div className="testimonial-content">
                <p>"From zero to hero in content marketing. SEOBlogger helped us establish thought leadership in our industry."</p>
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">ER</div>
                <div className="author-info">
                  <div className="author-name">Emily Rodriguez</div>
                  <div className="author-title">CEO, GrowthAgency</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="final-cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Content Strategy?</h2>
            <p>Join thousands of businesses creating amazing blog content with AI</p>
            <button className="cta-button primary large" onClick={openFunnel}>
              Get Started Free Today
            </button>
            <p className="cta-note">No credit card required • 7-day free trial</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="logo">
                <span className="logo-icon">✍️</span>
                <span className="logo-text">SEOBlogger</span>
              </div>
              <p>Create SEO-optimized blogs with AI-powered writing and custom images.</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#api">API</a></li>
                <li><a href="#integrations">Integrations</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><a href="#about">About</a></li>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="#help">Help Center</a></li>
                <li><a href="#docs">Documentation</a></li>
                <li><a href="#status">Status</a></li>
                <li><a href="#community">Community</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 SEOBlogger. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 