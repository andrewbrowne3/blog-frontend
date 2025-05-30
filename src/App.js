import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import LandingPage from './LandingPage';

function App() {
  // Landing page state - check localStorage first
  const [showLandingPage, setShowLandingPage] = useState(() => {
    const saved = localStorage.getItem('completedLanding');
    return saved !== 'true'; // Show landing page if not completed
  });
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: '👋 Hi! I\'m your AI blog generator. Give me a topic and I\'ll create a comprehensive blog post for you!',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmProvider, setLlmProvider] = useState('local');
  const [availableModels, setAvailableModels] = useState({ local: [], cloud: [] });
  const [selectedModel, setSelectedModel] = useState('');
  
  // New state variables for blog customization
  const [targetAudience, setTargetAudience] = useState('general audience');
  const [tone, setTone] = useState('professional');
  const [numSections, setNumSections] = useState(3);
  
  // Auto-scroll control
  const [autoScroll, setAutoScroll] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const apiUrl = process.env.NODE_ENV === 'production' 
          ? '/api/models'
          : 'http://localhost:4008/models';
        
        const response = await fetch(apiUrl);
        if (response.ok) {
          const models = await response.json();
          setAvailableModels(models);
          
          // Set default model based on provider
          if (llmProvider === 'local' && models.local.length > 0) {
            setSelectedModel(models.local[0]);
          } else if (llmProvider === 'cloud' && models.cloud.length > 0) {
            setSelectedModel(models.cloud[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    
    fetchModels();
  }, [llmProvider]);

  // Update selected model when provider changes
  useEffect(() => {
    const models = availableModels[llmProvider] || [];
    if (models.length > 0 && !models.includes(selectedModel)) {
      setSelectedModel(models[0]);
    }
  }, [llmProvider, availableModels, selectedModel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const shouldAutoScroll = () => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (!messagesContainer) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    // Only auto-scroll if user is within 100px of the bottom
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  useEffect(() => {
    // Only auto-scroll if user has enabled it and is near the bottom
    if (autoScroll && shouldAutoScroll()) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  const generateBlogStream = async (topic, onStep, onComplete, onError) => {
    try {
      console.log('Starting streaming request for topic:', topic);
      
      // Use different API URLs for development vs production
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/blog/stream'  // Production: goes through nginx proxy
        : 'http://localhost:4008/blog/stream';  // Development: direct to backend
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ 
          topic: topic,
          html_mode: true,  // Request HTML format
          llm_provider: llmProvider,  // Use selected LLM provider
          model_name: selectedModel,  // Use selected model
          target_audience: targetAudience,
          tone: tone,
          num_sections: numSections
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.status === 'connected') {
                console.log('Connected to stream for topic:', data.topic);
              } else if (data.type === 'complete') {
                // Final result - the blog content is in data.blog
                console.log('Received final blog:', data);
                onComplete({
                  content: data.blog,
                  format: 'HTML',
                  complete: data.is_complete
                });
              } else if (data.type === 'step') {
                // ReAct step update
                onStep(data);
              } else if (data.type === 'state_update') {
                // State update - could show progress
                console.log('State update:', data);
              } else if (data.type === 'error') {
                // Error occurred
                console.error('Stream error:', data.error);
                onError(new Error(data.error));
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming:', error);
      onError(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const topic = inputValue;
    setInputValue('');
    setIsLoading(true);

    // Add streaming status message
    const streamingMessageId = Date.now() + 1;
    const streamingMessage = {
      id: streamingMessageId,
      type: 'bot',
      content: '🤖 Starting ReAct blog generation...',
      timestamp: new Date(),
      isStreaming: true,
      streamingSteps: [],
      reasoningTrace: []
    };

    setMessages(prev => [...prev, streamingMessage]);

    // Stream callbacks
    const onStep = (stepData) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === streamingMessageId) {
          const newSteps = [...(msg.streamingSteps || []), stepData];
          const newTrace = [...(msg.reasoningTrace || []), stepData];
          
          // Show thought prominently if it's the thinking phase
          const displayContent = stepData.status === 'thinking' 
            ? `💭 Thinking: ${stepData.thought}\n⚡ Planning: ${stepData.action} - ${stepData.action_input}`
            : `🧠 ReAct Step ${stepData.step}: ${stepData.action} - ${stepData.action_input}`;
            
          return {
            ...msg,
            content: displayContent,
            streamingSteps: newSteps,
            reasoningTrace: newTrace,
            currentThought: stepData.thought,
            currentAction: stepData.action
          };
        }
        return msg;
      }));
    };

    const onComplete = (finalData) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === streamingMessageId) {
          return {
            ...msg,
            content: finalData.content,
            format: finalData.format || 'HTML',
            isStreaming: false,
            isComplete: true,
            stepsToken: msg.reasoningTrace?.length || 0,
            timestamp: new Date(),
            originalTopic: topic, // Store the original topic for export
            target_audience: targetAudience,
            tone: tone,
            num_sections: numSections
          };
        }
        return msg;
      }));
      setIsLoading(false);
    };

    const onError = (error) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === streamingMessageId) {
          return {
            ...msg,
            content: '❌ Sorry, I encountered an error while generating your blog. Please make sure the backend is running and try again!',
            isStreaming: false,
            isError: true,
            timestamp: new Date()
          };
        }
        return msg;
      }));
      setIsLoading(false);
    };

    // Start streaming
    try {
      await generateBlogStream(topic, onStep, onComplete, onError);
    } catch (error) {
      onError(error);
    }
  };

  const formatContent = (content, format = 'HTML') => {
    console.log('Formatting content:', { format, contentLength: content?.length, contentPreview: content?.substring(0, 100) });
    
    if (format === 'HTML') {
      // For HTML content, render it directly
      return (
        <div 
          className="html-blog-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    } else {
      // Fallback: Simple markdown-like formatting for non-HTML content
      return content
        .split('\n')
        .map((line, index) => {
          if (line.startsWith('# ')) {
            return <h1 key={index} className="blog-h1">{line.substring(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={index} className="blog-h2">{line.substring(3)}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={index} className="blog-h3">{line.substring(4)}</h3>;
          }
          if (line.startsWith('**') && line.endsWith('**')) {
            return <p key={index} className="blog-bold">{line.slice(2, -2)}</p>;
          }
          if (line.trim() === '') {
            return <br key={index} />;
          }
          return <p key={index} className="blog-p">{line}</p>;
        });
    }
  };

  // Export HTML function
  const exportToHTML = (content, topic = 'Blog Post') => {
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${topic} - AI Generated Blog</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: #f8fafc;
            color: #334155;
        }
        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding: 2rem;
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(14, 165, 233, 0.15);
        }
        .header h1 {
            margin: 0 0 0.5rem 0;
            font-size: 2.5rem;
            font-weight: 700;
        }
        .header p {
            margin: 0;
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .content {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(14, 165, 233, 0.1);
        }
        .content h1 {
            color: #1e293b;
            font-size: 2.25rem;
            font-weight: 700;
            margin: 0 0 1.5rem 0;
            border-bottom: 3px solid #0ea5e9;
            padding-bottom: 0.5rem;
        }
        .content h2 {
            color: #334155;
            font-size: 1.75rem;
            font-weight: 600;
            margin: 2rem 0 1rem 0;
        }
        .content h3 {
            color: #475569;
            font-size: 1.25rem;
            font-weight: 600;
            margin: 1.5rem 0 0.75rem 0;
        }
        .content p {
            margin: 0 0 1rem 0;
            line-height: 1.7;
        }
        .content ul, .content ol {
            margin: 1rem 0 1rem 1.5rem;
        }
        .content li {
            margin: 0.5rem 0;
        }
        .content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1.5rem 0;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding: 1.5rem;
            background: #e2e8f0;
            border-radius: 8px;
            color: #64748b;
            font-size: 0.9rem;
        }
        @media (max-width: 768px) {
            body { padding: 1rem; }
            .header h1 { font-size: 2rem; }
            .content { padding: 2rem; }
            .content h1 { font-size: 1.75rem; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>✨ AI Generated Blog</h1>
        <p>Created with AI Blog Generator using advanced reasoning</p>
    </div>
    <div class="content">
        ${content}
    </div>
    <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} by AI Blog Generator</p>
        <p>Powered by LangGraph & ReAct Framework</p>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_blog.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle landing page completion
  const handleLandingComplete = (formData) => {
    setShowLandingPage(false);
    localStorage.setItem('completedLanding', 'true'); // Save completion state
    console.log('Landing page completed with data:', formData);
    
    // Update the welcome message to be personalized
    setMessages([
      {
        id: 1,
        type: 'bot',
        content: `👋 Welcome ${formData.name}! I'm excited to help ${formData.company} create amazing blog content. Based on your preferences, I'll focus on ${formData.primaryGoal} for ${formData.targetAudience} with a ${formData.tonePreference} tone. Give me a topic and I'll create a comprehensive blog post for you!`,
        timestamp: new Date()
      }
    ]);
    
    // Here you can save to database later
    // Example: await saveUserPreferences(formData);
  };

  // Reset to landing page
  const resetToLandingPage = () => {
    localStorage.removeItem('completedLanding');
    setShowLandingPage(true);
    setMessages([
      {
        id: 1,
        type: 'bot',
        content: '👋 Hi! I\'m your AI blog generator. Give me a topic and I\'ll create a comprehensive blog post for you!',
        timestamp: new Date()
      }
    ]);
  };

  // Show landing page first
  if (showLandingPage) {
    return <LandingPage onComplete={handleLandingComplete} />;
  }

  return (
    <div className="App">
      {/* Main Header */}
      <header className="main-header">
        <div className="header-container">
          <div className="brand">
            <span className="brand-icon">✨</span>
            <h1 className="brand-title">AI Blog Generator</h1>
            <span className="brand-subtitle">Powered by LangGraph & ReAct Framework</span>
          </div>
          <div className="header-controls">
            <div className="model-controls">
              <div className="llm-toggle">
                <span className="toggle-label">Provider:</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="llm-toggle"
                    checked={llmProvider === 'cloud'}
                    onChange={(e) => setLlmProvider(e.target.checked ? 'cloud' : 'local')}
                    disabled={isLoading}
                  />
                  <label htmlFor="llm-toggle" className="toggle-slider">
                    <span className="toggle-option local">🖥️ Local</span>
                    <span className="toggle-option cloud">☁️ Cloud</span>
                  </label>
                </div>
              </div>
              <div className="model-selector">
                <span className="selector-label">Model:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isLoading}
                  className="model-dropdown"
                >
                  {(availableModels[llmProvider] || []).map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button 
              onClick={resetToLandingPage}
              className="reset-landing-btn"
              title="Return to questionnaire"
            >
              📋 Setup
            </button>
            <div className="status-indicator">
              <div className="status-dot"></div>
              <span>Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="chat-container">
          <div className="chat-header">
            <div className="chat-title">
              <h2>Blog Generation Assistant</h2>
              <p>Enter a topic and watch the AI create a comprehensive blog post using advanced reasoning</p>
            </div>
            <div className="chat-controls">
              <div className="auto-scroll-toggle">
                <label htmlFor="auto-scroll" className="toggle-label">
                  <input
                    type="checkbox"
                    id="auto-scroll"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="toggle-checkbox"
                  />
                  <span className="toggle-text">
                    {autoScroll ? '📜 Auto-scroll ON' : '📜 Auto-scroll OFF'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-avatar">
                  {message.type === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  <div className={`message-bubble ${message.isError ? 'error' : ''} ${message.isStreaming ? 'streaming' : ''}`}>
                    {/* Streaming indicator */}
                    {message.isStreaming && (
                      <div className="streaming-indicator">
                        <div className="streaming-dots">
                          <span></span><span></span><span></span>
                        </div>
                        <span className="streaming-text">ReAct Agent Working...</span>
                      </div>
                    )}
                    
                    {message.type === 'bot' && message.content && (message.content.length > 200 || message.isComplete || message.isStreaming) ? 
                      <div className="blog-content">
                        {/* Blog metadata */}
                        {(message.format || message.stepsToken || message.isStreaming) && (
                          <div className="blog-metadata">
                            {message.format && <span className="format-badge">{message.format}</span>}
                            {message.stepsToken && <span className="steps-badge">🔄 {message.stepsToken} steps</span>}
                            {message.isStreaming && <span className="streaming-badge">🔄 Live</span>}
                            {message.imagesFound && <span className="images-badge">🖼️ {message.imagesFound} images</span>}
                          </div>
                        )}
                        
                        {/* Blog content */}
                        {message.isComplete ? 
                          <div>
                            {formatContent(message.content, message.format)}
                            {/* Export button for completed blogs */}
                            <div className="export-actions">
                              <button 
                                className="export-button"
                                onClick={() => exportToHTML(message.content, message.originalTopic || 'Blog Post')}
                                title="Download as HTML file"
                              >
                                📄 Export HTML
                              </button>
                            </div>
                          </div> :
                          <div className="streaming-content">
                            <div className="current-thought">
                              {message.content.split('\n').map((line, idx) => (
                                <p key={idx} className={line.startsWith('💭') ? 'thought-line' : line.startsWith('⚡') ? 'action-line' : ''}>{line}</p>
                              ))}
                            </div>
                            {message.isStreaming && (
                              <div className="current-step">
                                <em>Processing action...</em>
                              </div>
                            )}
                          </div>
                        }
                      </div>
                      : 
                      <p>{message.content}</p>
                    }
                    
                    {/* Display reasoning trace within the message if available */}
                    {message.reasoningTrace && message.reasoningTrace.length > 0 && (
                      <div className="reasoning-trace-inline">
                        <details open={message.isStreaming}>
                          <summary>🧠 View ReAct Reasoning Process ({message.reasoningTrace.length} steps) {message.isStreaming && '(Live)'}</summary>
                          <div className="reasoning-steps">
                            {message.reasoningTrace.map((step, index) => (
                              <div key={index} className={`reasoning-step ${index === message.reasoningTrace.length - 1 && message.isStreaming ? 'current-step' : ''}`}>
                                <div className="step-header">Step {step.step}</div>
                                <div className="thought"><strong>💭 Thought:</strong> {step.thought}</div>
                                <div className="action"><strong>⚡ Action:</strong> {step.action} - {step.action_input}</div>
                                <div className="observation"><strong>👁️ Observation:</strong> {step.observation}</div>
                              </div>
                            ))}
                            {message.isStreaming && (
                              <div className="reasoning-step streaming-step">
                                <div className="step-header">Processing next step...</div>
                                <div className="streaming-dots">
                                  <span></span><span></span><span></span>
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <form onSubmit={handleSubmit} className="input-form">
              {/* Blog Topic Input */}
              <div className="input-wrapper main-input">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter a blog topic (e.g., 'AI trends 2024', 'healthy cooking tips')..."
                  className="message-input"
                  disabled={isLoading}
                />
              </div>
              
              {/* Advanced Options */}
              <div className="advanced-options">
                <div className="options-row">
                  <div className="option-group">
                    <label htmlFor="target-audience" className="option-label">
                      🎯 Target Audience
                    </label>
                    <select
                      id="target-audience"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      disabled={isLoading}
                      className="option-select"
                    >
                      <option value="general audience">General Audience</option>
                      <option value="professionals">Professionals</option>
                      <option value="beginners">Beginners</option>
                      <option value="experts">Experts</option>
                      <option value="students">Students</option>
                    </select>
                  </div>
                  
                  <div className="option-group">
                    <label htmlFor="tone" className="option-label">
                      🎨 Tone
                    </label>
                    <select
                      id="tone"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      disabled={isLoading}
                      className="option-select"
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="friendly">Friendly</option>
                      <option value="authoritative">Authoritative</option>
                      <option value="conversational">Conversational</option>
                      <option value="educational">Educational</option>
                    </select>
                  </div>
                  
                  <div className="option-group">
                    <label htmlFor="num-sections" className="option-label">
                      📝 Sections
                    </label>
                    <select
                      id="num-sections"
                      value={numSections}
                      onChange={(e) => setNumSections(parseInt(e.target.value))}
                      disabled={isLoading}
                      className="option-select"
                    >
                      <option value={3}>3 Sections</option>
                      <option value={4}>4 Sections</option>
                      <option value={5}>5 Sections</option>
                      <option value={6}>6 Sections</option>
                      <option value={7}>7 Sections</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="submit-wrapper">
                <button 
                  type="submit" 
                  className="send-button enhanced"
                  disabled={!inputValue.trim() || isLoading}
                >
                  {isLoading ? (
                    <span className="loading-content">
                      <span className="spinner"></span>
                      Generating...
                    </span>
                  ) : (
                    <span className="submit-content">
                      🚀 Generate Blog
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>AI Blog Generator</h3>
              <p>Advanced blog generation using ReAct framework with LangGraph</p>
            </div>
            <div className="footer-section">
              <h4>Features</h4>
              <ul>
                <li>Real-time reasoning trace</li>
                <li>Multiple LLM providers</li>
                <li>HTML & Markdown output</li>
                <li>Image integration</li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Technology</h4>
              <ul>
                <li>LangGraph</li>
                <li>FastAPI</li>
                <li>React</li>
                <li>Ollama & Claude</li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Status</h4>
              <div className="system-status">
                <div className="status-item">
                  <span className="status-label">Backend:</span>
                  <span className="status-value online">Online</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Provider:</span>
                  <span className="status-value">{llmProvider === 'cloud' ? 'Cloud (Claude)' : 'Local (Ollama)'}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Model:</span>
                  <span className="status-value">{selectedModel || 'Loading...'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 AI Blog Generator. Built with ❤️ using modern AI technologies.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
