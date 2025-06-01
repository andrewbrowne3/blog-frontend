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
  const [selectedSections, setSelectedSections] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dropZones, setDropZones] = useState([]);
  
  // Add Google Images search state variables
  const [googleImages, setGoogleImages] = useState([]);
  const [isSearchingGoogleImages, setIsSearchingGoogleImages] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  
  const messagesEndRef = useRef(null);

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const apiUrl = process.env.NODE_ENV === 'production' 
          ? '/api/models'
          : 'http://localhost:4000/models';
        
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
        : 'http://localhost:4000/blog/stream';  // Development: direct to backend
      
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
    const newImages = [];
    
    try {
      for (const section of sections) {
        if (!selectedSections.has(section.id)) continue;
        
        // Create contextual content for this specific section
        const sectionContext = `
          Section Title: ${section.title}
          Section Content: ${section.content}
          
          Full Blog Context: ${blogContent.substring(0, 1000)}...
        `;
        
        const apiUrl = process.env.NODE_ENV === 'production' 
          ? '/api/blog/suggest-images'
          : 'http://localhost:4000/blog/suggest-images';
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            content: sectionContext,
            section_title: section.title,
            style: 'professional'
          }),
        });

        if (!response.ok) {
          console.error(`Failed to get suggestions for section: ${section.title}`);
          continue;
        }

        const data = await response.json();
        
        // Generate actual image for the first suggestion
        if (data.suggestions && data.suggestions.length > 0) {
          const suggestion = data.suggestions[0];
          
          try {
            const imageApiUrl = process.env.NODE_ENV === 'production' 
              ? '/api/blog/generate-image'
              : 'http://localhost:4000/blog/generate-image';
            
            const imageResponse = await fetch(imageApiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                content: sectionContext,
                section_title: section.title,
                style: 'professional',
                size: '1024x1024'
              }),
            });

            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              
              console.log(`Generated contextual image for "${section.title}":`, imageData.enhanced_prompt);
              
              newImages.push({
                id: `img-${Date.now()}-${section.id}`,
                url: imageData.image.url,
                base64: imageData.base64_image,
                prompt: imageData.enhanced_prompt || suggestion.prompt,
                description: suggestion.description,
                sectionId: section.id,
                sectionTitle: section.title,
                placement: suggestion.placement || 'after-heading',
                timestamp: new Date(),
                contextual: true // Mark as contextually generated
              });
            } else {
              console.error(`Failed to generate image for section: ${section.title}`);
            }
          } catch (error) {
            console.error('Failed to generate image for section:', section.title, error);
          }
        }
      }
      
      setGeneratedImages(prev => [...prev, ...newImages]);
      if (newImages.length > 0) {
        setShowImageSidebar(true);
        
        // Show success message with details
        const successMessage = {
          id: Date.now(),
          type: 'system',
          content: `🎨 Generated ${newImages.length} contextual images for selected sections: ${newImages.map(img => img.sectionTitle).join(', ')}`,
          timestamp: new Date()
        };
        
        setTimeout(() => {
          setMessages(prev => [...prev, successMessage]);
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error generating contextual images:', error);
      
      // Show error message
      const errorMessage = {
        id: Date.now(),
        type: 'system',
        content: '❌ Failed to generate contextual images. Please try again.',
        timestamp: new Date()
      };
      
      setTimeout(() => {
        setMessages(prev => [...prev, errorMessage]);
      }, 500);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // Google Images search functions
  const searchGoogleImages = async (query, numResults = 10) => {
    setIsSearchingGoogleImages(true);
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/blog/search-google-images'
        : 'http://localhost:4000/blog/search-google-images';

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGoogleImages(data.results || []);
      return data;
    } catch (error) {
      console.error('Error searching Google Images:', error);
      alert('Failed to search Google Images. Please check your API configuration.');
      return { results: [] };
    } finally {
      setIsSearchingGoogleImages(false);
    }
  };

  const searchImagesForAllSections = async () => {
    if (blogSections.length === 0) {
      alert('No blog sections available. Generate a blog first!');
      return;
    }

    setIsSearchingGoogleImages(true);
    try {
      const sectionsData = blogSections.map(section => ({
        title: section.title,
        content: section.content || ''
      }));

      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/blog/search-images-for-sections'
        : 'http://localhost:4000/blog/search-images-for-sections';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: sectionsData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Flatten all images from all sections
      const allImages = [];
      Object.entries(data.results || {}).forEach(([sectionTitle, sectionData]) => {
        sectionData.images.forEach((image, index) => {
          allImages.push({
            ...image,
            id: `google-${sectionTitle}-${index}`,
            sectionTitle: sectionTitle,
            query: sectionData.query,
            source: 'google'
          });
        });
      });

      setGoogleImages(allImages);
      return data;
    } catch (error) {
      console.error('Error searching images for sections:', error);
      alert('Failed to search images for sections. Please check your API configuration.');
    } finally {
      setIsSearchingGoogleImages(false);
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
      const elements = Array.from(doc.body.children);
      
      console.log('Parsed elements:', elements.length, 'isDragging:', isDragging, 'messageId:', messageId);
      
      const renderElements = () => {
        const result = [];
        let sectionIndex = 0;
        
        elements.forEach((element, index) => {
          const isHeading = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName);
          
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
          
          // Add drop zone after each section (at the end of sections)
          if (isHeading && isDragging && messageId) {
            // Look ahead to see if there's content after this heading before the next heading
            let hasContentAfter = false;
            for (let i = index + 1; i < elements.length; i++) {
              const nextElement = elements[i];
              if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(nextElement.tagName)) {
                break; // Found next heading
              }
              if (nextElement.textContent.trim()) {
                hasContentAfter = true;
                break;
              }
            }
            
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
              disabled={isSearchingGoogleImages || blogSections.length === 0}
              className="auto-search-btn"
            >
              {isSearchingGoogleImages ? (
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
                    className="image-item google-image"
                    draggable
                    onDragStart={(e) => handleDragStart(e, {
                      ...image,
                      url: image.link,
                      description: image.title,
                      placement: 'inline'
                    })}
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

        {/* Google Custom Search Widget */}
        <div className="google-custom-search-section">
          <h4>🌐 Google Custom Search</h4>
          <p className="search-widget-description">
            Use Google's search widget to find and drag images directly:
          </p>
          <div className="custom-search-container">
            <div className="gcse-search" data-resultsUrl="/search-results" data-newWindow="true"></div>
          </div>
          <p className="search-widget-note">
            💡 Tip: Right-click images from search results and drag them to your blog!
          </p>
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

      {/* Image Sidebar */}
      {/* Floating Sidebar Toggle Button */}
      <button 
        className="floating-sidebar-toggle"
        onClick={() => setShowImageSidebar(!showImageSidebar)}
        title={showImageSidebar ? "Close Image Sidebar" : "Open Image Sidebar"}
      >
        {showImageSidebar ? '🖼️ ×' : '🖼️ ☰'}
      </button>
      
      <ImageSidebar />
    </div>
  );
}

export default App;
