import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  registerUser, 
  loginUser, 
  saveQuestionnaireData, 
  logout,
  selectUser,
  selectIsAuthenticated,
  selectTokens,
  // selectCurrentUser, // Remove unused import
  // selectAuthLoading,
  // selectAuthError,
  clearError
} from './store/slices/authSlice';
import useAuthCheck from './hooks/useAuthCheck';
import './App.css';
import './Navigation.css';
import './ProfilePage.css';
import LandingPage from './LandingPage';
import LoginPage from './LoginPage';
import ProfilePage from './ProfilePage';

// NEW: Canva-style Editor Component
const CanvaEditor = ({ 
  content, 
  onContentChange, 
  onSave, 
  onExit, 
  onDrop,
  isDragging,
  draggedImage,
  elementStyles,
  onUpdateElementStyle,
  selectedElement,
  onSelectElement,
  canvasSettings,
  onUpdateCanvasSettings,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const [editingElementId, setEditingElementId] = useState(null);
  
  const handleElementClick = (e, elementId, elementType) => {
    e.stopPropagation();
    onSelectElement(elementId, elementType);
  };

  const handleElementDoubleClick = (e, elementId) => {
    e.stopPropagation();
    setEditingElementId(elementId);
  };

  const renderEditableContent = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const elements = Array.from(doc.body.children);
    
    return elements.map((element, index) => {
      const elementId = `element-${index}`;
      const isSelected = selectedElement?.id === elementId;
      const isEditing = editingElementId === elementId;
      const styles = elementStyles[elementId] || {};
      
      return (
        <div
          key={elementId}
          className={`canva-element ${isSelected ? 'selected' : ''} ${element.tagName.toLowerCase()}`}
          style={{
            position: 'relative',
            margin: styles.margin || '10px 0',
            padding: styles.padding || '5px',
            fontSize: styles.fontSize || 'inherit',
            color: styles.color || 'inherit',
            backgroundColor: styles.backgroundColor || 'transparent',
            border: isSelected ? '2px solid #0ea5e9' : '1px solid transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            ...styles
          }}
          onClick={(e) => handleElementClick(e, elementId, element.tagName)}
          onDoubleClick={(e) => handleElementDoubleClick(e, elementId)}
          onDragOver={isDragging ? (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('canva-drag-over');
          } : undefined}
          onDragLeave={isDragging ? (e) => {
            e.currentTarget.classList.remove('canva-drag-over');
          } : undefined}
          onDrop={isDragging ? (e) => {
            e.currentTarget.classList.remove('canva-drag-over');
            onDrop(e);
          } : undefined}
          data-position={index}
        >
          {isEditing ? (
            <div className="inline-editor">
              <textarea
                value={element.textContent}
                onChange={(e) => {
                  const newContent = content.replace(element.outerHTML, 
                    element.outerHTML.replace(element.textContent, e.target.value)
                  );
                  onContentChange(newContent);
                }}
                onBlur={() => setEditingElementId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    setEditingElementId(null);
                  }
                }}
                autoFocus
                style={{
                  width: '100%',
                  minHeight: '50px',
                  border: 'none',
                  background: 'transparent',
                  resize: 'vertical',
                  fontSize: 'inherit',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: element.innerHTML }} />
          )}
          
          {/* Selection handles */}
          {isSelected && (
            <div className="selection-handles">
              <div className="handle top-left"></div>
              <div className="handle top-right"></div>
              <div className="handle bottom-left"></div>
              <div className="handle bottom-right"></div>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="canva-editor">
      {/* Editor Header */}
      <div className="canva-header">
        <div className="canva-header-left">
          <button onClick={onExit} className="exit-btn">
            ← Back to Chat
          </button>
          <h2>🎨 Canva-Style Editor</h2>
        </div>
        <div className="canva-header-center">
          <button onClick={onUndo} disabled={!canUndo} className="undo-btn">
            ↶ Undo
          </button>
          <button onClick={onRedo} disabled={!canRedo} className="redo-btn">
            ↷ Redo
          </button>
        </div>
        <div className="canva-header-right">
          <button onClick={onSave} className="save-btn">
            💾 Save Changes
          </button>
        </div>
      </div>

      <div className="canva-workspace">
        {/* Left Sidebar - Properties Panel */}
        <div className="canva-sidebar-left">
          <div className="properties-panel">
            <h3>Properties</h3>
            {selectedElement ? (
              <div className="element-properties">
                <h4>Selected: {selectedElement.type}</h4>
                
                {/* Font Size */}
                <div className="property-group">
                  <label>Font Size</label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    value={parseInt(elementStyles[selectedElement.id]?.fontSize) || 16}
                    onChange={(e) => onUpdateElementStyle(selectedElement.id, 'fontSize', `${e.target.value}px`)}
                  />
                  <span>{parseInt(elementStyles[selectedElement.id]?.fontSize) || 16}px</span>
                </div>

                {/* Text Color */}
                <div className="property-group">
                  <label>Text Color</label>
                  <input
                    type="color"
                    value={elementStyles[selectedElement.id]?.color || '#000000'}
                    onChange={(e) => onUpdateElementStyle(selectedElement.id, 'color', e.target.value)}
                  />
                </div>

                {/* Background Color */}
                <div className="property-group">
                  <label>Background</label>
                  <input
                    type="color"
                    value={elementStyles[selectedElement.id]?.backgroundColor || '#ffffff'}
                    onChange={(e) => onUpdateElementStyle(selectedElement.id, 'backgroundColor', e.target.value)}
                  />
                </div>

                {/* Margin */}
                <div className="property-group">
                  <label>Margin</label>
                  <input
                    type="text"
                    placeholder="10px 0"
                    value={elementStyles[selectedElement.id]?.margin || ''}
                    onChange={(e) => onUpdateElementStyle(selectedElement.id, 'margin', e.target.value)}
                  />
                </div>

                {/* Padding */}
                <div className="property-group">
                  <label>Padding</label>
                  <input
                    type="text"
                    placeholder="5px"
                    value={elementStyles[selectedElement.id]?.padding || ''}
                    onChange={(e) => onUpdateElementStyle(selectedElement.id, 'padding', e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <p>Select an element to edit its properties</p>
            )}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="canva-canvas">
          <div 
            className="canvas-content"
            style={{
              backgroundColor: canvasSettings.backgroundColor,
              padding: canvasSettings.padding,
              maxWidth: canvasSettings.maxWidth,
              fontFamily: canvasSettings.fontFamily,
              margin: '0 auto',
              minHeight: '600px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
            onClick={() => onSelectElement(null, null)} // Deselect when clicking canvas
          >
            {renderEditableContent()}
            
            {/* Drop zones for images */}
            {isDragging && (
              <>
                <div 
                  className="canva-drop-zone start"
                  data-position="start"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('canva-drag-over');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('canva-drag-over');
                  }}
                  onDrop={onDrop}
                >
                  <span>📍 Drop image at start</span>
                </div>
                <div 
                  className="canva-drop-zone end"
                  data-position="end"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('canva-drag-over');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('canva-drag-over');
                  }}
                  onDrop={onDrop}
                >
                  <span>📍 Drop image at end</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar - Canvas Settings */}
        <div className="canva-sidebar-right">
          <div className="canvas-settings">
            <h3>Canvas Settings</h3>
            
            <div className="setting-group">
              <label>Background Color</label>
              <input
                type="color"
                value={canvasSettings.backgroundColor}
                onChange={(e) => onUpdateCanvasSettings(prev => ({
                  ...prev,
                  backgroundColor: e.target.value
                }))}
              />
            </div>

            <div className="setting-group">
              <label>Max Width</label>
              <input
                type="text"
                value={canvasSettings.maxWidth}
                onChange={(e) => onUpdateCanvasSettings(prev => ({
                  ...prev,
                  maxWidth: e.target.value
                }))}
              />
            </div>

            <div className="setting-group">
              <label>Padding</label>
              <input
                type="text"
                value={canvasSettings.padding}
                onChange={(e) => onUpdateCanvasSettings(prev => ({
                  ...prev,
                  padding: e.target.value
                }))}
              />
            </div>

            <div className="setting-group">
              <label>Font Family</label>
              <select
                value={canvasSettings.fontFamily}
                onChange={(e) => onUpdateCanvasSettings(prev => ({
                  ...prev,
                  fontFamily: e.target.value
                }))}
              >
                <option value="Inter, sans-serif">Inter</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="'Courier New', monospace">Courier New</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  // Redux state
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const tokens = useSelector(selectTokens);
  // const authLoading = useSelector(selectAuthLoading);
  // const authError = useSelector(selectAuthError);
  
  // Use the auth check hook for automatic token validation
  useAuthCheck();

  // Debug authentication state
  useEffect(() => {
    console.log('🔐 Authentication state changed:', {
      isAuthenticated,
      user: user ? { id: user.id, username: user.username, email: user.email } : null,
      tokens: tokens ? { 
        access_token: tokens.access_token ? 'present' : 'missing',
        refresh_token: tokens.refresh_token ? 'present' : 'missing'
      } : null
    });
  }, [isAuthenticated, user, tokens]);

  // Authentication flow state
  const [authMode, setAuthMode] = useState(() => {
    // Check if user has completed questionnaire before
    const completedLanding = localStorage.getItem('completedLanding');
    const hasTokens = localStorage.getItem('authTokens');
    
    if (isAuthenticated) {
      return 'app'; // Already authenticated, go to main app
    } else if (completedLanding && hasTokens) {
      return 'login'; // Has been here before, show login
    } else {
      return 'register'; // New user, show questionnaire
    }
  });

  // Local state for UI
  const [welcomeMessage, setWelcomeMessage] = useState('');

  // Landing page state - check localStorage first
  // const [showLandingPage, setShowLandingPage] = useState(() => {
  //   const saved = localStorage.getItem('completedLanding');
  //   return saved !== 'true'; // Show landing page if not completed
  // });
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "👋 Hi! I'm your AI blog generator. Give me a topic and I'll create a comprehensive blog post for you!",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmProvider, setLlmProvider] = useState('local');
  const [availableModels, setAvailableModels] = useState({ local: [], cloud: [] });
  const [selectedModel, setSelectedModel] = useState('');
  
  // New state variables for blog customization
  const [targetAudience, setTargetAudience] = useState('general');
  const [tone, setTone] = useState('professional');
  const [numSections, setNumSections] = useState(5);
  
  // Auto-scroll control
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Add image generation state variables
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [showImageSidebar, setShowImageSidebar] = useState(true);
  const [draggedImage, setDraggedImage] = useState(null);
  const [blogSections, setBlogSections] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Add Google Images search state variables
  const [googleImages, setGoogleImages] = useState([]);
  const [isSearchingGoogleImages, setIsSearchingGoogleImages] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  
  // NEW: Canva-style editor state variables
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [editorHistory, setEditorHistory] = useState([]);
  const [editorHistoryIndex, setEditorHistoryIndex] = useState(-1);
  const [elementStyles, setElementStyles] = useState({});
  const [canvasSettings, setCanvasSettings] = useState({
    backgroundColor: '#ffffff',
    padding: '40px',
    maxWidth: '800px',
    fontFamily: 'Inter, sans-serif'
  });
  
  // Add missing state variables for Canva editor
  const [editingContent, setEditingContent] = useState('');
  const [currentEditingMessageId, setCurrentEditingMessageId] = useState(null);
  
  // NEW: Navigation state
  const [currentPage, setCurrentPage] = useState('blog'); // 'blog', 'profile', 'editor', 'saved'
  
  const messagesEndRef = useRef(null);

  // NEW: Database connection functions
  const saveBlogToDatabase = async (blogContent, title) => {
    if (!user || !tokens?.access_token) {
      alert('Please log in to save blogs');
      return;
    }

    // For now, show a message that this feature is coming soon
    // The backend currently only supports saving blogs that were generated through the AI system
    alert('Blog saving from the frontend is not yet implemented. This feature requires backend updates to support direct blog saving from the frontend interface.');
    
    // TODO: Implement direct blog saving once backend endpoint is available
    // This would require either:
    // 1. A new endpoint like /api/blog/save-direct that accepts blog content directly
    // 2. Or modifying the existing /api/blog/save endpoint to work without thread state
    
    console.log('Blog content to save:', { title, content: blogContent });
    return null;
  };

  const loadSavedBlogs = async () => {
    console.log('🔍 Checking authentication state:', { 
      user: user ? 'exists' : 'null', 
      tokens: tokens ? 'exists' : 'null',
      access_token: tokens?.access_token ? 'exists' : 'missing',
      isAuthenticated 
    });
    
    if (!user || !tokens?.access_token) {
      alert('Please log in to load saved blogs');
      return;
    }

    try {
      // Use the correct blog saved endpoint with user_id parameter
      const response = await fetch(getApiUrl(`/api/blog/saved?user_id=${user.id}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Loaded blogs from database:', result);
        
        // Handle the response format - it should be a BlogListResponse with blogs array
        const blogs = result.blogs || [];
        
        // Convert saved blogs back to message format and add to messages
        const blogMessages = blogs.map((blog, index) => ({
          id: Date.now() + index,
          type: 'bot',
          content: blog.content,
          topic: blog.topic || blog.title,
          threadId: blog.thread_id,
          timestamp: new Date(blog.created_at || Date.now()),
          savedBlogId: blog.id
        }));

        if (blogMessages.length > 0) {
          setMessages(prev => [...prev, ...blogMessages]);
          alert(`Loaded ${blogMessages.length} saved blogs!`);
        } else {
          alert('No saved blogs found.');
        }
        
        return blogs;
      } else {
        const errorText = await response.text();
        console.error('Failed to load saved blogs:', response.status, errorText);
        alert(`Failed to load blogs: ${response.status} - ${errorText}`);
        return [];
      }
    } catch (error) {
      console.error('Error loading saved blogs:', error);
      alert(`Error loading blogs: ${error.message}`);
      return [];
    }
  };

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const apiUrl = process.env.NODE_ENV === 'production' 
          ? 'https://blog.andrewbrowne.org/api/blog/models'
          : 'http://localhost:4000/api/blog/models';
        
        const response = await fetch(apiUrl, {
          headers: {
            ...(tokens?.access_token && {
              'Authorization': `Bearer ${tokens.access_token}`
            })
          }
        });
        if (response.ok) {
          const models = await response.json();
          console.log('Received models:', models);
          
          // Map API response to expected formatt
          const mappedModels = {
            local: models.local_models || [],
            cloud: models.cloud_models || []
          };
          
          setAvailableModels(mappedModels);
          
          // Set default model based on provider
          if (llmProvider === 'local' && mappedModels.local && mappedModels.local.length > 0) {
            setSelectedModel(mappedModels.local[0]);
          } else if (llmProvider === 'cloud' && mappedModels.cloud && mappedModels.cloud.length > 0) {
            setSelectedModel(mappedModels.cloud[0]);
          }
        } else {
          console.error('Failed to fetch models, status:', response.status);
          // Don't set any fallback - leave models empty
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
        // Don't set any fallback - leave models empty
      }
    };
    
    fetchModels();
  }, [llmProvider, tokens]);

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

  // Authentication and API functions
  const getApiUrl = (endpoint) => {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://blog.andrewbrowne.org'
      : 'http://localhost:4000';
    return `${baseUrl}${endpoint}`;
  };

  const mapFormDataToQuestionnaire = (formData) => {
    return {
      industry: formData.industry || '',
      content_goals: formData.contentGoals || '',
      target_audience: formData.targetAudience || '',
      tone_preference: formData.tonePreference || 'professional',
      content_length: formData.contentLength || 'medium',
      posting_frequency: formData.postingFrequency || 'weekly',
      content_types: formData.contentTypes || [],
      pain_points: formData.painPoints || [],
      success_metrics: formData.successMetrics || [],
      additional_context: formData.additionalContext || ''
    };
  };

  const generateBlogStream = async (topic, onStep, onComplete, onError) => {
    console.log('🚀 Starting streaming request...');
      
      const apiUrl = process.env.NODE_ENV === 'production' 
      ? 'https://blog.andrewbrowne.org/api/blog/stream'
      : 'http://localhost:4000/api/blog/stream';
      
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokens?.access_token && {
            'Authorization': `Bearer ${tokens.access_token}`
          })
        },
        body: JSON.stringify({ 
          topic: topic,
          llm_provider: llmProvider,
          model_name: selectedModel || "gemma3:12b", // Fallback model
          num_sections: parseInt(numSections),
          target_audience: targetAudience,
          tone: tone,
          html_mode: true  // Add this to request HTML format from backend
        })
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
                // Final result - the blog content is in data.content (updated from data.blog)
                console.log('Received final blog:', data);
                onComplete({
                  content: data.content || data.blog, // Use content first, fallback to blog for compatibility
                  format: 'HTML',
                  complete: data.is_complete,
                  thread_id: data.thread_id // Add thread_id from backend response
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

  // Enhanced image generation functions
  const analyzeBlogSections = (content) => {
    // Parse HTML content to extract sections
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    const sections = [];
    const headings = doc.querySelectorAll('h1, h2, h3');
    
    headings.forEach((heading, index) => {
      const sectionText = heading.textContent;
      const tagName = heading.tagName.toLowerCase();
      
      // Get content after this heading until next heading
      let nextSibling = heading.nextElementSibling;
      let sectionContent = '';
      
      while (nextSibling && !['H1', 'H2', 'H3'].includes(nextSibling.tagName)) {
        sectionContent += nextSibling.textContent + ' ';
        nextSibling = nextSibling.nextElementSibling;
      }
      
      sections.push({
        id: `section-${index}`,
        title: sectionText,
        level: tagName,
        content: sectionContent.trim(),
        element: heading,
        selected: false
      });
    });
    
    return sections;
  };

  const generateImagesForSelectedSections = async (sections, blogContent) => {
    setIsGeneratingImages(true);
    
    try {
      const generatedImages = [];
      
      for (const section of sections) {
        try {
          // Generate image for this section using DALL-E
          const apiUrl = process.env.NODE_ENV === 'production' 
            ? 'https://blog.andrewbrowne.org/api/blog/generate-image'
            : 'http://localhost:4000/api/blog/generate-image';
          
          console.log('🎨 Generating image for section:', section.title);
          console.log('📝 Section content:', section.content?.substring(0, 100) + '...');
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: section.content || blogContent,
              section_title: section.title,
              style: 'professional',
              size: '1024x1024'
            })
          });

          console.log('📡 Response status:', response.status);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('📦 Response data:', data);
          
          if (data.success && data.image) {
            console.log('✅ Image generated successfully:', data.image.url);
            generatedImages.push({
              id: `dalle-${section.title}-${Date.now()}`,
              url: data.base64_image || data.image.url,
              description: `AI-generated image for: ${section.title}`,
              sectionTitle: section.title,
              prompt: data.enhanced_prompt,
              source: 'dalle',
              alt: section.title
            });
          } else {
            console.log('❌ Image generation failed for section:', section.title, 'Response:', data);
          }
        } catch (error) {
          console.error(`❌ Error generating image for section "${section.title}":`, error);
        }
      }
      
      console.log('🖼️ Total images generated:', generatedImages.length);
      
      // Add generated images to the state
      setGeneratedImages(prev => [...prev, ...generatedImages]);
      
      if (generatedImages.length > 0) {
        alert(`Successfully generated ${generatedImages.length} images using DALL-E!`);
      } else {
        alert('No images were generated. Please check your OpenAI API configuration.');
      }
      
    } catch (error) {
      console.error('Image generation error:', error);
      alert('Failed to generate images. Please check your API configuration.');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // Google Images search functions
  const searchGoogleImages = async (query, numResults = 5) => {
    setIsSearchingGoogleImages(true);
    
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? 'https://blog.andrewbrowne.org/api/blog/search-google-images'
        : 'http://localhost:4000/api/blog/search-google-images';
      
      console.log('🔍 Searching Google Images for:', query);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          num_results: numResults
        })
      });

      console.log('📡 Google Images response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Google Images response data:', data);
      
      if (data.success && data.results && data.results.length > 0) {
        // Format images for the UI
        const formattedImages = data.results.map((img, index) => ({
          id: `google-${query}-${index}-${Date.now()}`,
          url: img.link || img.url,
          thumbnail: img.thumbnail || img.url,
          description: img.title || `Search result for: ${query}`,
          source: 'google',
          alt: img.title || query,
          contextLink: img.contextLink
        }));
        
        console.log('✅ Google Images found:', formattedImages.length);
        setGoogleImages(formattedImages);
        alert(`Found ${formattedImages.length} images for "${query}"`);
      } else {
        console.log('❌ No Google Images found for:', query);
        setGoogleImages([]);
        alert('No images found. Please try a different search term or check your Google API configuration.');
      }
      
    } catch (error) {
      console.error('❌ Google Images search error:', error);
      setGoogleImages([]);
      alert('Failed to search Google Images. Please check your API configuration.');
    } finally {
      setIsSearchingGoogleImages(false);
    }
  };

  const searchImagesForAllSections = async () => {
    if (!blogSections || blogSections.length === 0) {
      alert('No blog sections available. Please generate a blog post first.');
      return;
    }
    
    setIsGeneratingImages(true);
    
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? 'https://blog.andrewbrowne.org/api/blog/search-images-for-sections'
        : 'http://localhost:4000/api/blog/search-images-for-sections';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: blogSections.map(section => ({
            title: section.title,
            content: section.content
          })),
          num_results_per_section: 3
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.results) {
        // Format images from all sections
        const allImages = [];
        
        Object.entries(data.results).forEach(([sectionTitle, sectionData]) => {
          if (sectionData.images && sectionData.images.length > 0) {
            const formattedImages = sectionData.images.map((img, index) => ({
              id: `section-${sectionTitle}-${index}-${Date.now()}`,
              url: img.link || img.url,
              thumbnail: img.thumbnail || img.url,
              description: img.title || `Image for: ${sectionTitle}`,
              source: 'google-sections',
              alt: img.title || sectionTitle,
              sectionTitle: sectionTitle,
              contextLink: img.contextLink
            }));
            allImages.push(...formattedImages);
          }
        });
        
        setGeneratedImages(prev => [...prev, ...allImages]);
        alert(`Found ${allImages.length} images across ${Object.keys(data.results).length} sections!`);
      } else {
        alert('No images found for the blog sections. Please check your Google API configuration.');
      }
      
    } catch (error) {
      console.error('Section images search error:', error);
      alert('Failed to search images for sections. Please check your API configuration.');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // Enhanced drag and drop handlers
  const handleDragStart = (e, image) => {
    console.log('Drag started:', image);
    setDraggedImage(image);
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', '');
    e.dataTransfer.effectAllowed = 'copy';
    
    // Add visual feedback
    setTimeout(() => {
      document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.add('drag-active');
      });
    }, 0);
  };

  const handleDragEnd = () => {
    console.log('Drag ended');
    setIsDragging(false);
    setDraggedImage(null);
    
    // Remove visual feedback
    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.classList.remove('drag-active', 'drag-over');
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  // NEW: Enhanced handleCanvaDrop function for Canva editor
  const handleCanvaDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('canva-drag-over');
    
    if (!draggedImage) {
      console.log('No dragged image found');
      return;
    }

    setIsDragging(false);
    
    // Get drop position from data attribute
    const dropPosition = e.currentTarget.getAttribute('data-position');
    
    // Create image HTML
    const imageHtml = `
      <div class="blog-image" style="margin: 20px 0; text-align: center;">
        <img src="${draggedImage.url}" alt="${draggedImage.description || draggedImage.alt || ''}" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);" />
        ${draggedImage.description ? `<p style="margin-top: 8px; color: #64748b; font-size: 0.9rem; font-style: italic;">${draggedImage.description}</p>` : ''}
      </div>
    `;

    // Update editing content if in editor mode
    if (currentEditingMessageId && editingContent) {
      let newContent = editingContent;
      
      if (dropPosition === 'start') {
        newContent = imageHtml + editingContent;
      } else if (dropPosition === 'end') {
        newContent = editingContent + imageHtml;
      } else {
        // Insert at specific position
        const parser = new DOMParser();
        const doc = parser.parseFromString(editingContent, 'text/html');
        const elements = Array.from(doc.body.children);
        const position = parseInt(dropPosition);
        
        if (position >= 0 && position < elements.length) {
          elements[position].insertAdjacentHTML('beforebegin', imageHtml);
          newContent = doc.body.innerHTML;
        } else {
          newContent = editingContent + imageHtml;
        }
      }
      
      setEditingContent(newContent);
      
      // Also update the message
      setMessages(prev => prev.map(msg => {
        if (msg.id === currentEditingMessageId) {
          return { ...msg, content: newContent };
        }
        return msg;
      }));
    }

    setDraggedImage(null);
  };

  const handleDrop = (e, messageId, dropZone = null) => {
    console.log('Drop event:', { messageId, dropZone, draggedImage });
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedImage) {
      console.log('No dragged image found');
      return;
    }
    
    // Find the message and add the image at the right location
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.type === 'bot') {
        let updatedContent = msg.content;
        
        const imageHtml = `
          <div class="blog-image" style="margin: 20px 0; text-align: center;">
            <img src="${draggedImage.url}" alt="${draggedImage.description}" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);" />
            <p style="margin-top: 8px; color: #64748b; font-size: 0.9rem; font-style: italic;">${draggedImage.description}</p>
          </div>
        `;
        
        if (dropZone) {
          // Parse the HTML content
          const parser = new DOMParser();
          const doc = parser.parseFromString(updatedContent, 'text/html');
          const elements = Array.from(doc.body.children);
          
          if (dropZone === 'beginning-of-content') {
            // Insert at the very beginning
            if (doc.body.firstChild) {
              doc.body.insertAdjacentHTML('afterbegin', imageHtml);
            } else {
              doc.body.innerHTML = imageHtml;
            }
            updatedContent = doc.body.innerHTML;
            
          } else if (dropZone === 'end-of-content') {
            // Insert at the very end
            doc.body.insertAdjacentHTML('beforeend', imageHtml);
            updatedContent = doc.body.innerHTML;
            
          } else if (dropZone.startsWith('before-section-')) {
            // Insert before a specific section
            const sectionIndex = parseInt(dropZone.split('-')[2]);
            let headingCount = 0;
            
            for (let i = 0; i < elements.length; i++) {
              const element = elements[i];
              if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
                if (headingCount === sectionIndex) {
                  element.insertAdjacentHTML('beforebegin', imageHtml);
                  break;
                }
                headingCount++;
              }
            }
            updatedContent = doc.body.innerHTML;
            
          } else if (dropZone.startsWith('after-section-')) {
            // Insert after a specific section (after its content, before next heading)
            const sectionIndex = parseInt(dropZone.split('-')[2]);
            let headingCount = 0;
            
            for (let i = 0; i < elements.length; i++) {
              const element = elements[i];
              if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
                if (headingCount === sectionIndex) {
                  // Find the end of this section (before next heading or end of content)
                  let insertAfter = element;
                  for (let j = i + 1; j < elements.length; j++) {
                    const nextElement = elements[j];
                    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(nextElement.tagName)) {
                      break; // Found next heading, insert before it
                    }
                    insertAfter = nextElement; // Keep track of last non-heading element
                  }
                  insertAfter.insertAdjacentHTML('afterend', imageHtml);
                  break;
                }
                headingCount++;
              }
            }
            updatedContent = doc.body.innerHTML;
          }
        } else {
          // Fallback: append to end
          updatedContent = msg.content + imageHtml;
        }
        
        return {
          ...msg,
          content: updatedContent
        };
      }
      return msg;
    }));
    
    // Store description before clearing
    const imageDescription = draggedImage.description;
    setDraggedImage(null);
    setIsDragging(false);
    
    // Show success feedback
    const successMessage = {
      id: Date.now(),
      type: 'system',
      content: `✅ Image "${imageDescription}" added to blog at ${dropZone || 'end'}!`,
      timestamp: new Date()
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, successMessage]);
    }, 500);
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
          const completedMessage = {
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
            num_sections: numSections,
            topic: topic, // Add topic for database saving
            thread_id: finalData.thread_id // Add thread_id from streaming response
          };
          
          // Automatically save completed blog to database
          saveBlogToDatabase(completedMessage.content, completedMessage.originalTopic).then(blogId => {
            if (blogId) {
              console.log('✅ Blog automatically saved to database with ID:', blogId);
              // Update the message with the saved blog ID
              setMessages(prevMessages => prevMessages.map(m => 
                m.id === streamingMessageId 
                  ? { ...m, savedBlogId: blogId }
                  : m
              ));
            }
          }).catch(error => {
            console.error('❌ Failed to auto-save blog:', error);
          });
          
          return completedMessage;
        }
        return msg;
      }));
      setIsLoading(false);
      
      // Analyze blog sections for image generation
      if (finalData.content) {
        const sections = analyzeBlogSections(finalData.content);
        setBlogSections(sections);
        setSelectedSections(new Set()); // Reset selection
      }
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

  const formatContent = (content, format = 'HTML', messageId = null) => {
    console.log('Formatting content:', { format, contentLength: content?.length, contentPreview: content?.substring(0, 100), messageId, isDragging });
    
    if (format === 'HTML') {
      // Parse HTML content to identify sections and add drop zones
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      
      // Fix: Get all elements, not just body children
      let elements;
      if (doc.body && doc.body.children.length > 0) {
        elements = Array.from(doc.body.children);
      } else {
        // Fallback: if no body or empty body, get all elements from document
        const allElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, section, article');
        elements = Array.from(allElements);
      }
      
      console.log('Parsed elements:', elements.length, 'isDragging:', isDragging, 'messageId:', messageId);
      console.log('Content length:', content.length, 'Has body:', !!doc.body);
      
      const renderElements = () => {
        const result = [];
        let sectionIndex = 0;
        
        elements.forEach((element, index) => {
          const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName);
          const isParagraph = element.tagName === 'P';
          
          // Add drop zone before each section (at the beginning of headings)
          if (isHeading && isDragging && messageId) {
            console.log('Adding drop zone before section', sectionIndex, 'at element', index);
            result.push(
              <div 
                key={`drop-before-${index}`}
                className="drop-zone section-drop-zone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, messageId, `before-section-${sectionIndex}`)}
              >
                <div className="drop-zone-content">
                  <span className="drop-icon">📍</span>
                  <span className="drop-text">Drop image before section</span>
                </div>
              </div>
            );
          }
          
          // Render the actual element
          result.push(
            <div 
              key={`element-${index}`}
              dangerouslySetInnerHTML={{ __html: element.outerHTML }}
            />
          );
          
          // Add drop zone after paragraphs (between content blocks)
          if (isParagraph && isDragging && messageId) {
            result.push(
              <div 
                key={`drop-after-p-${index}`}
                className="drop-zone section-drop-zone paragraph-drop"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, messageId, `after-paragraph-${index}`)}
              >
                <div className="drop-zone-content">
                  <span className="drop-icon">📝</span>
                  <span className="drop-text">Drop image after paragraph</span>
                </div>
              </div>
            );
          }
          
          // Add drop zone after each section (at the end of sections)
          if (isHeading && isDragging && messageId) {
            // If this is the last element or next element is a heading, add drop zone after
            if (index === elements.length - 1 || 
                (index + 1 < elements.length && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(elements[index + 1].tagName))) {
              result.push(
                <div 
                  key={`drop-after-${index}`}
                  className="drop-zone section-drop-zone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, messageId, `after-section-${sectionIndex}`)}
                >
                  <div className="drop-zone-content">
                    <span className="drop-icon">📍</span>
                    <span className="drop-text">Drop image after section</span>
                  </div>
                </div>
              );
            }
            
            sectionIndex++;
          }
          
          // For non-heading elements, add drop zone after if it's the last element
          if (!isHeading && index === elements.length - 1 && isDragging && messageId) {
            result.push(
              <div 
                key={`drop-end-${index}`}
                className="drop-zone section-drop-zone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, messageId, `end-of-content`)}
              >
                <div className="drop-zone-content">
                  <span className="drop-icon">🖼️</span>
                  <span className="drop-text">Drop image at end of blog</span>
                </div>
              </div>
            );
          }
        });
        
        return result;
      };
      
      return (
        <div className={`html-blog-content ${isDragging ? 'dragging-active' : ''}`}>
          {/* Add drop zone at the very beginning */}
          {isDragging && messageId && (
            <div 
              className="drop-zone section-drop-zone beginning-drop"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, messageId, 'beginning-of-content')}
            >
              <div className="drop-zone-content">
                <span className="drop-icon">🎯</span>
                <span className="drop-text">Drop image at beginning of blog</span>
              </div>
            </div>
          )}
          
          {renderElements()}
        </div>
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

  // NEW: Canva-style editor functions
  const enterEditorMode = (messageId, content) => {
    setEditingContent(content);
    setCurrentEditingMessageId(messageId);
    setIsEditorMode(true);
  };

  const saveToHistory = () => {
    const currentState = {
      elementStyles: { ...elementStyles },
      canvasSettings: { ...canvasSettings },
      timestamp: Date.now()
    };
    
    const newHistory = editorHistory.slice(0, editorHistoryIndex + 1);
    newHistory.push(currentState);
    setEditorHistory(newHistory);
    setEditorHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (editorHistoryIndex > 0) {
      const previousState = editorHistory[editorHistoryIndex - 1];
      setElementStyles(previousState.elementStyles);
      setCanvasSettings(previousState.canvasSettings);
      setEditorHistoryIndex(editorHistoryIndex - 1);
    }
  };

  const redo = () => {
    if (editorHistoryIndex < editorHistory.length - 1) {
      const nextState = editorHistory[editorHistoryIndex + 1];
      setElementStyles(nextState.elementStyles);
      setCanvasSettings(nextState.canvasSettings);
      setEditorHistoryIndex(editorHistoryIndex + 1);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const selectElement = (elementId, elementType) => {
    setSelectedElement({ id: elementId, type: elementType });
  };

  const updateElementStyle = (elementId, styleProperty, value) => {
    setElementStyles(prev => ({
      ...prev,
      [elementId]: {
        ...prev[elementId],
        [styleProperty]: value
      }
    }));
    saveToHistory();
  };

  // Handle landing page completion
  const handleLandingComplete = async (formData) => {
    console.log('Landing page completed with data:', formData);
    
    try {
      let currentUser = user;
      
      // If user is not already authenticated, register and login
      if (!isAuthenticated) {
        try {
          // Try to register the user
          const registrationResult = await dispatch(registerUser(formData)).unwrap();
          console.log('User registered successfully:', registrationResult);
          currentUser = registrationResult;
        } catch (registrationError) {
          console.log('Registration failed, attempting login:', registrationError);
          
          // If registration fails, try to login (user might already exist)
          try {
            const loginResult = await dispatch(loginUser({ 
              email: formData.email,
              username: formData.email.split('@')[0],
              password: 'TempPass123!' // Use the same strong temporary password
            })).unwrap();
            
            currentUser = loginResult.user;
            console.log('User logged in successfully:', currentUser);
          } catch (loginError) {
            console.error('Both registration and login failed:', loginError);
            // Continue with UI update even if authentication fails
          }
        }
      }
      
      // Save questionnaire data if user is authenticated
      if (currentUser?.id) {
        try {
          const questionnaireData = mapFormDataToQuestionnaire(formData);
          await dispatch(saveQuestionnaireData({
            userId: currentUser.id,
            questionnaireData
          })).unwrap();
          console.log('Questionnaire data saved successfully');
        } catch (questionnaireError) {
          console.error('Failed to save questionnaire data:', questionnaireError);
          // Continue with UI update even if questionnaire save fails
        }
      }
      
    } catch (error) {
      console.error('Error during landing completion:', error);
      // Continue with UI update even if backend operations fail
    }
    
    // Update UI state
    setAuthMode('app');
    localStorage.setItem('completedLanding', 'true');
    
    // Set personalized welcome message
    const userName = formData.name || formData.email?.split('@')[0] || 'there';
    setWelcomeMessage(`Welcome ${userName}! Let's create some amazing blog content together.`);
  };

  // Handle switching to register (questionnaire)
  const handleSwitchToRegister = () => {
    setAuthMode('register');
    dispatch(clearError());
  };

  // Handle switching to login
  const handleSwitchToLogin = () => {
    setAuthMode('login');
    dispatch(clearError());
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    // For now, just show an alert - you can implement proper forgot password later
    alert('Please contact support for password reset assistance.');
  };

  // Reset to landing page
  const resetToLandingPage = () => {
    // Clear authentication data using Redux
    dispatch(logout());
    
    // Reset UI state
    setAuthMode('login'); // Show login page instead of questionnaire for returning users
    setWelcomeMessage('');
  };

  const handleLogout = () => {
    resetToLandingPage();
  };

  const handleLoadSavedBlogs = async () => {
    const count = await loadSavedBlogs();
    if (count > 0) {
      alert(`Loaded ${count} saved blogs!`);
    } else {
      alert('No saved blogs found.');
    }
  };

  // Enhanced Image Sidebar Component
  const ImageSidebar = () => {
    return (
      <div className={`image-sidebar ${showImageSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>🎨 AI Images</h3>
          <div className="sidebar-controls">
            <button 
              onClick={() => setShowImageSidebar(!showImageSidebar)}
              className="toggle-sidebar-btn"
            >
              {showImageSidebar ? '→' : '←'}
            </button>
          </div>
        </div>
        
        {/* Google Images Search Section */}
        <div className="google-search-section">
          <h4>🔍 Google Images Search</h4>
          <div className="search-controls">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Search for images..."
                value={googleSearchQuery}
                onChange={(e) => setGoogleSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && googleSearchQuery.trim()) {
                    searchGoogleImages(googleSearchQuery.trim());
                  }
                }}
                className="google-search-input"
              />
              <button
                onClick={() => googleSearchQuery.trim() && searchGoogleImages(googleSearchQuery.trim())}
                disabled={isSearchingGoogleImages || !googleSearchQuery.trim()}
                className="search-btn"
              >
                {isSearchingGoogleImages ? '⏳' : '🔍'}
              </button>
            </div>
            <button
              onClick={searchImagesForAllSections}
              disabled={isGeneratingImages || blogSections.length === 0}
              className="auto-search-btn"
            >
              {isGeneratingImages ? (
                <>
                  <span className="spinner"></span>
                  Searching...
                </>
              ) : (
                <>
                  🤖 Auto-search for sections
                </>
              )}
            </button>
          </div>
          
          {/* Google Images Results */}
          {googleImages.length > 0 && (
            <div className="google-images-section">
              <h5>📸 Google Images ({googleImages.length})</h5>
              <div className="images-grid google-images">
                {googleImages.map((image) => (
                  <div
                    key={image.id}
                    className={`image-item google-image ${isDragging && draggedImage && draggedImage.id === image.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      console.log('Google Image drag start:', image);
                      handleDragStart(e, {
                        ...image,
                        url: image.link,
                        description: image.title,
                        placement: 'inline'
                      });
                    }}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="image-preview">
                      <img 
                        src={image.thumbnail || image.link} 
                        alt={image.title}
                        onError={(e) => {
                          e.target.src = image.link; // Fallback to full image if thumbnail fails
                        }}
                      />
                      <div className="image-overlay">
                        <span className="drag-hint">🖱️ Drag to blog</span>
                      </div>
                    </div>
                    <div className="image-info">
                      <p className="image-description">{image.title}</p>
                      {image.sectionTitle && (
                        <span className="section-tag">📍 {image.sectionTitle}</span>
                      )}
                      {image.query && (
                        <span className="query-tag">🔍 {image.query}</span>
                      )}
                      <span className="source-tag">🌐 Google</span>
                      <div className="image-dimensions">
                        {image.width && image.height && (
                          <span>{image.width}×{image.height}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Existing DALL-E Section */}
        <div className="section-selector">
          <h4>🎨 Generate DALL-E Images</h4>
          {blogSections.length > 0 ? (
            <>
              <p className="section-description">Select blog sections to generate contextual images:</p>
              <div className="sections-list">
                {blogSections.map((section) => (
                  <label key={section.id} className="section-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSections.has(section.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedSections);
                        if (e.target.checked) {
                          newSelected.add(section.id);
                        } else {
                          newSelected.delete(section.id);
                        }
                        setSelectedSections(newSelected);
                      }}
                    />
                    <span className="section-title">{section.title}</span>
                    <span className="section-level">{section.level}</span>
                  </label>
                ))}
              </div>
              <button
                className="generate-selected-btn"
                onClick={() => generateImagesForSelectedSections(
                  blogSections.filter(s => selectedSections.has(s.id)),
                  messages.find(m => m.isComplete) && messages.find(m => m.isComplete).content
                )}
                disabled={selectedSections.size === 0 || isGeneratingImages}
              >
                {isGeneratingImages ? (
                  <>
                    <span className="spinner"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    🎨 Generate DALL-E Images ({selectedSections.size})
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="no-blog-message">
              <p>📝 Generate a blog first to create contextual DALL-E images for specific sections.</p>
              <p>💡 Or use Google Images search above to find existing images!</p>
            </div>
          )}
        </div>

        {isGeneratingImages && (
          <div className="generating-status">
            <div className="loading-spinner"></div>
            <p>🎨 Creating images for selected sections...</p>
          </div>
        )}
        
        <div className="images-grid">
          {generatedImages.map((image) => (
            <div
              key={image.id}
              className={`image-item ${isDragging && draggedImage && draggedImage.id === image.id ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, image)}
              onDragEnd={handleDragEnd}
            >
              <div className="image-preview">
                <img src={image.url} alt={image.description} />
                <div className="image-overlay">
                  <span className="drag-hint">🖱️ Drag to blog</span>
                </div>
              </div>
              <div className="image-info">
                <p className="image-description">{image.description}</p>
                {image.sectionTitle && (
                  <span className="section-tag">📍 {image.sectionTitle}</span>
                )}
                {image.contextual && (
                  <span className="contextual-tag">🎯 Contextual</span>
                )}
                <span className="placement-tag">{image.placement}</span>
                {image.prompt && (
                  <details className="prompt-details">
                    <summary>🎨 DALL-E Prompt</summary>
                    <p className="prompt-text">{image.prompt}</p>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {generatedImages.length === 0 && googleImages.length === 0 && !isGeneratingImages && !isSearchingGoogleImages && blogSections.length === 0 && (
          <div className="empty-state">
            <p>🖼️ No images yet</p>
            <p>Generate a blog or search Google Images!</p>
          </div>
        )}
      </div>
    );
  };

  // Update authMode when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      setAuthMode('app');
    }
  }, [isAuthenticated]);

  // Navigation Header Component
  const NavigationHeader = () => {
    if (!isAuthenticated || authMode !== 'app') return null;
    
    return (
      <nav className="navigation-header">
        <div className="nav-left">
          <div className="nav-logo">🤖 AI Blog Generator</div>
          <div className="nav-subtitle">Powered by ReAct Framework</div>
        </div>
        
        <div className="nav-center">
          <button 
            className={`nav-button ${currentPage === 'blog' ? 'active' : ''}`}
            onClick={() => setCurrentPage('blog')}
          >
            ✍️ Blog Writer
          </button>
          <button 
            className={`nav-button ${currentPage === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentPage('profile')}
          >
            👤 Profile
          </button>
          <button 
            className="nav-button"
            onClick={handleLoadSavedBlogs}
            title="Load saved blogs from database"
          >
            📚 Load Saved
          </button>
          {isEditorMode && (
            <button 
              className={`nav-button ${currentPage === 'editor' ? 'active' : ''}`}
              onClick={() => setCurrentPage('editor')}
            >
              🎨 Editor
            </button>
          )}
        </div>
        
        <div className="nav-right">
          {user && (
            <div className="nav-user-info">
              <div className="nav-user-avatar">
                {user.first_name ? user.first_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
              <div className="nav-user-details">
                <div className="nav-username">{user.first_name || user.username}</div>
                <div className="nav-online-status">
                  <div className="nav-online-dot"></div>
                  Online
                </div>
              </div>
            </div>
          )}
          
          <button 
            className="nav-logout-btn" 
            onClick={handleLogout}
            title="Logout"
          >
            🚪 Logout
          </button>
        </div>
      </nav>
    );
  };

  return (
    <div className="App">
      {authMode === 'login' ? (
        <LoginPage 
          onSwitchToRegister={handleSwitchToRegister}
          onForgotPassword={handleForgotPassword}
        />
      ) : authMode === 'register' ? (
        <LandingPage onComplete={handleLandingComplete} onSwitchToLogin={handleSwitchToLogin} />
      ) : (
        <>
          <NavigationHeader />
          
          {/* Page Content Based on Navigation */}
          {currentPage === 'profile' ? (
            <ProfilePage 
              onBack={() => setCurrentPage('blog')}
              onNavigate={setCurrentPage}
            />
          ) : currentPage === 'editor' || isEditorMode ? (
            <CanvaEditor 
              content={editingContent}
              onContentChange={setEditingContent}
              onSave={() => {
                setMessages(prev => prev.map(msg => {
                  if (msg.id === currentEditingMessageId) {
                    return { ...msg, content: editingContent };
                  }
                  return msg;
                }));
                setIsEditorMode(false);
                setCurrentPage('blog');
              }}
              onExit={() => {
                setIsEditorMode(false);
                setCurrentPage('blog');
              }}
              onDrop={handleCanvaDrop}
              isDragging={isDragging}
              draggedImage={draggedImage}
              elementStyles={elementStyles}
              onUpdateElementStyle={updateElementStyle}
              selectedElement={selectedElement}
              onSelectElement={selectElement}
              canvasSettings={canvasSettings}
              onUpdateCanvasSettings={setCanvasSettings}
              onUndo={undo}
              onRedo={redo}
              canUndo={editorHistoryIndex > 0}
              canRedo={editorHistoryIndex < editorHistory.length - 1}
            />
          ) : (
            // Main Blog Writing Page
            <div className="blog-page">
              {/* Move all your existing main content here */}
              <header className="page-header">
                <div className="header-container">
                  <div className="header-controls">
                    <div className="llm-selector">
                      <label htmlFor="llm-provider">🧠 LLM Provider:</label>
                      <select
                        id="llm-provider"
                        value={llmProvider}
                        onChange={(e) => setLlmProvider(e.target.value)}
                        disabled={isLoading}
                      >
                        <option value="local">Local (Ollama)</option>
                        <option value="cloud">Cloud (Claude)</option>
                      </select>
                    </div>
                    <div className="model-selector">
                      <label htmlFor="model-select">🎯 Model:</label>
                      <select
                        id="model-select"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isLoading || availableModels[llmProvider]?.length === 0}
                      >
                        {availableModels[llmProvider]?.length > 0 ? (
                          availableModels[llmProvider].map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))
                        ) : (
                          <option value="">Loading models...</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              </header>

              {/* All your existing main content */}
              <main className="main-content">
                <div className="chat-container">
                  <div className="chat-header">
                    <div className="chat-title">
                      <h2>Blog Generation Assistant</h2>
                      <p>Enter a topic and watch the AI create a comprehensive blog post using advanced reasoning</p>
                          {welcomeMessage && (
                            <div className="welcome-message">
                              <span className="welcome-icon">👋</span>
                              <span>{welcomeMessage}</span>
                            </div>
                          )}
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
                              <div 
                                className={`message-bubble ${message.isError ? 'error' : ''} ${message.isStreaming ? 'streaming' : ''}`}
                                onDragOver={message.type === 'bot' && message.isComplete ? handleDragOver : undefined}
                                onDragLeave={message.type === 'bot' && message.isComplete ? handleDragLeave : undefined}
                                onDrop={message.type === 'bot' && message.isComplete ? (e) => handleDrop(e, message.id) : undefined}
                              >
                                {/* Debug info */}
                                {message.type === 'bot' && (
                                  <div style={{fontSize: '10px', color: '#999', marginBottom: '5px'}}>
                                    Debug: isComplete={String(message.isComplete)}, isDragging={String(isDragging)}, id={message.id}
                                  </div>
                                )}
                                
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
                                        {formatContent(message.content, message.format, message.id)}
                                    {/* Export button for completed blogs */}
                                    <div className="export-actions">
                                          <button 
                                            className="editor-mode-btn"
                                            onClick={() => enterEditorMode(message.id, message.content)}
                                            title="Edit in Canva-style visual editor"
                                          >
                                            🎨 Edit in Canva Mode
                                          </button>
                                      <button 
                                        className="export-button"
                                        onClick={() => exportToHTML(message.content, message.originalTopic || 'Blog Post')}
                                        title="Download as HTML file"
                                      >
                                        📄 Export HTML
                                      </button>
                                    </div>
                                      </div>
                                      :
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
                                  <option value="general">General</option>
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

              {/* All your existing footer and sidebar */}
              <ImageSidebar />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
