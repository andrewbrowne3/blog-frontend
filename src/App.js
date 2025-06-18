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
// Import Monaco Editor
import Editor from '@monaco-editor/react';

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
  canRedo,
  blogSections,
  generatedImages,
  googleImages,
  isGeneratingImages,
  isSearchingGoogleImages,
  googleSearchQuery,
  setGoogleSearchQuery,
  generateImagesForSelectedSections,
  searchGoogleImages,
  searchImagesForAllSections,
  handleDragStart,
  handleDragEnd,
  // NEW: Add helper function props
  generateOptimizedImageHtml,
  copyToClipboard,
  insertImageIntoCode
}) => {
  // Existing state
  const [viewMode, setViewMode] = useState('visual');
  const [showPurePreview, setShowPurePreview] = useState(false); // NEW: Pure HTML preview toggle
  const [editingElementId, setEditingElementId] = useState(null);

  // NEW: Enhanced Canva-like state
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [draggedElementId, setDraggedElementId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
  const [alignmentGuides, setAlignmentGuides] = useState([]);
  const [elementPositions, setElementPositions] = useState({});
  const [hoveredElementId, setHoveredElementId] = useState(null);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [floatingToolbarPosition, setFloatingToolbarPosition] = useState({ x: 0, y: 0 });

  // Grid settings
  const GRID_SIZE = 20;
  const SNAP_THRESHOLD = 10;

  // Helper function to snap to grid
  const snapToGridPosition = (x, y) => {
    if (!snapToGrid) return { x, y };
    return {
      x: Math.round(x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(y / GRID_SIZE) * GRID_SIZE
    };
  };

  // Helper function to find alignment guides
  const findAlignmentGuides = (draggedElement, allElements) => {
    const guides = [];
    const draggedRect = draggedElement.getBoundingClientRect();
    const canvasRect = document.getElementById('korean-canvas-content').getBoundingClientRect();
    
    allElements.forEach(element => {
      if (element === draggedElement) return;
      
      const rect = element.getBoundingClientRect();
      const tolerance = 5;
      
      // Vertical alignment guides
      if (Math.abs(rect.left - draggedRect.left) < tolerance) {
        guides.push({
          type: 'vertical',
          position: rect.left - canvasRect.left,
          color: '#ff4081'
        });
      }
      if (Math.abs(rect.right - draggedRect.right) < tolerance) {
        guides.push({
          type: 'vertical',
          position: rect.right - canvasRect.left,
          color: '#ff4081'
        });
      }
      if (Math.abs((rect.left + rect.right) / 2 - (draggedRect.left + draggedRect.right) / 2) < tolerance) {
        guides.push({
          type: 'vertical',
          position: (rect.left + rect.right) / 2 - canvasRect.left,
          color: '#ff4081'
        });
      }
      
      // Horizontal alignment guides
      if (Math.abs(rect.top - draggedRect.top) < tolerance) {
        guides.push({
          type: 'horizontal',
          position: rect.top - canvasRect.top,
          color: '#ff4081'
        });
      }
      if (Math.abs(rect.bottom - draggedRect.bottom) < tolerance) {
        guides.push({
          type: 'horizontal',
          position: rect.bottom - canvasRect.top,
          color: '#ff4081'
        });
      }
      if (Math.abs((rect.top + rect.bottom) / 2 - (draggedRect.top + draggedRect.bottom) / 2) < tolerance) {
        guides.push({
          type: 'horizontal',
          position: (rect.top + rect.bottom) / 2 - canvasRect.top,
          color: '#ff4081'
        });
      }
    });
    
    return guides;
  };

  // Handle element drag start
  const handleElementDragStart = (e, elementId) => {
    e.stopPropagation();
    setIsDraggingElement(true);
    setDraggedElementId(elementId);
    setShowGrid(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    // Store initial position
    const canvasRect = document.getElementById('korean-canvas-content').getBoundingClientRect();
    setElementPositions(prev => ({
      ...prev,
      [elementId]: {
        x: rect.left - canvasRect.left,
        y: rect.top - canvasRect.top
      }
    }));
  };

  // Handle element drag
  const handleElementDrag = (e) => {
    if (!isDraggingElement || !draggedElementId) return;
    
    const canvasRect = document.getElementById('korean-canvas-content').getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;
    
    const snappedPosition = snapToGridPosition(newX, newY);
    
    setElementPositions(prev => ({
      ...prev,
      [draggedElementId]: snappedPosition
    }));
    
    // Update alignment guides
    if (showAlignmentGuides) {
      const draggedElement = document.querySelector(`[data-element-id="${draggedElementId}"]`);
      const allElements = document.querySelectorAll('.canva-draggable-element');
      const guides = findAlignmentGuides(draggedElement, Array.from(allElements));
      setAlignmentGuides(guides);
    }
  };

  // Handle element drag end
  const handleElementDragEnd = (e) => {
    if (!isDraggingElement || !draggedElementId) return;
    
    setIsDraggingElement(false);
    setDraggedElementId(null);
    setShowGrid(false);
    setAlignmentGuides([]);
    
    // Update content with new positions
    updateContentWithPositions();
  };

  // Update HTML content with new element positions
  const updateContentWithPositions = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const elements = Array.from(doc.body.children);
    
    elements.forEach((element, index) => {
      const elementId = `element-${index}`;
      const position = elementPositions[elementId];
      
      if (position) {
        element.style.position = 'absolute';
        element.style.left = `${position.x}px`;
        element.style.top = `${position.y}px`;
        element.style.transform = 'none';
      }
    });
    
    const newContent = doc.body.innerHTML;
    onContentChange(newContent);
  };

  // Handle double-click for inline editing
  const handleElementDoubleClick = (e, elementId) => {
    e.stopPropagation();
    setEditingElementId(elementId);
    setShowFloatingToolbar(false);
  };

  // Handle element selection with floating toolbar
  const handleElementClick = (e, elementId, elementType) => {
    e.stopPropagation();
    onSelectElement({ id: elementId, type: elementType }, elementType);
    
    // Show floating toolbar
    const rect = e.currentTarget.getBoundingClientRect();
    setFloatingToolbarPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 50
    });
    setShowFloatingToolbar(true);
  };

  // Handle element hover
  const handleElementHover = (elementId, isHovering) => {
    setHoveredElementId(isHovering ? elementId : null);
  };

  // Enhanced renderEditableContent with Canva-like functionality
  const renderEditableContent = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const elements = Array.from(doc.body.children);
    
    return (
      <div className="canva-elements-container" style={{ position: 'relative', minHeight: '600px' }}>
        {/* Grid overlay */}
        {showGrid && (
          <div className="canva-grid-overlay">
            {Array.from({ length: Math.ceil(800 / GRID_SIZE) }, (_, i) => (
              <div
                key={`v-${i}`}
                className="grid-line vertical"
                style={{ left: `${i * GRID_SIZE}px` }}
              />
            ))}
            {Array.from({ length: Math.ceil(600 / GRID_SIZE) }, (_, i) => (
              <div
                key={`h-${i}`}
                className="grid-line horizontal"
                style={{ top: `${i * GRID_SIZE}px` }}
              />
            ))}
          </div>
        )}
        
        {/* Alignment guides */}
        {alignmentGuides.map((guide, index) => (
          <div
            key={index}
            className={`alignment-guide ${guide.type}`}
            style={{
              [guide.type === 'vertical' ? 'left' : 'top']: `${guide.position}px`,
              backgroundColor: guide.color
            }}
          />
        ))}
        
        {/* Draggable elements */}
        {elements.map((element, index) => {
          const elementId = `element-${index}`;
          const isSelected = selectedElement?.id === elementId;
          const isEditing = editingElementId === elementId;
          const isHovered = hoveredElementId === elementId;
          const isDragged = draggedElementId === elementId;
          const position = elementPositions[elementId] || { x: 0, y: index * 60 };
          const styles = elementStyles[elementId] || {};
          
          return (
            <div
              key={elementId}
              data-element-id={elementId}
              className={`canva-draggable-element ${element.tagName.toLowerCase()} ${
                isSelected ? 'selected' : ''
              } ${isHovered ? 'hovered' : ''} ${isDragged ? 'dragging' : ''}`}
              style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                minWidth: '200px',
                minHeight: '40px',
                padding: styles.padding || '12px 16px',
                fontSize: styles.fontSize || (element.tagName === 'H1' ? '32px' : element.tagName === 'H2' ? '24px' : element.tagName === 'H3' ? '20px' : '16px'),
                color: styles.color || '#333',
                backgroundColor: styles.backgroundColor || 'transparent',
                border: isSelected ? '2px solid #0ea5e9' : isHovered ? '2px solid #0ea5e9aa' : '2px solid transparent',
                borderRadius: '8px',
                cursor: isDraggingElement ? 'grabbing' : 'grab',
                userSelect: 'none',
                transition: isDragged ? 'none' : 'all 0.2s ease',
                transform: isDragged ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isDragged ? '0 8px 25px rgba(0,0,0,0.15)' : isHovered ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                zIndex: isDragged ? 1000 : isSelected ? 100 : 10,
                ...styles
              }}
              draggable={!isEditing}
              onDragStart={(e) => handleElementDragStart(e, elementId)}
              onDrag={handleElementDrag}
              onDragEnd={handleElementDragEnd}
              onClick={(e) => handleElementClick(e, elementId, element.tagName)}
              onDoubleClick={(e) => handleElementDoubleClick(e, elementId)}
              onMouseEnter={() => handleElementHover(elementId, true)}
              onMouseLeave={() => handleElementHover(elementId, false)}
            >
              {/* Drag handle */}
              {(isHovered || isSelected) && !isEditing && (
                <div className="drag-handle" title="Drag to move">
                  ⋮⋮
                </div>
              )}
              
              {/* Content */}
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
                      if (e.key === 'Escape') {
                        setEditingElementId(null);
                      }
                    }}
                    autoFocus
                    style={{
                      width: '100%',
                      minHeight: '40px',
                      border: 'none',
                      background: 'transparent',
                      resize: 'none',
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                      color: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>
              ) : (
                <div 
                  className="element-content"
                  dangerouslySetInnerHTML={{ __html: element.innerHTML }}
                />
              )}
              
              {/* Element type indicator */}
              {(isHovered || isSelected) && !isEditing && (
                <div className="element-type-indicator">
                  {element.tagName === 'H1' ? '📝 Heading 1' : 
                   element.tagName === 'H2' ? '📝 Heading 2' : 
                   element.tagName === 'H3' ? '📝 Heading 3' : 
                   element.tagName === 'P' ? '📄 Paragraph' : 
                   element.tagName}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Floating toolbar */}
        {showFloatingToolbar && selectedElement && (
          <div 
            className="floating-toolbar"
            style={{
              position: 'fixed',
              left: `${floatingToolbarPosition.x}px`,
              top: `${floatingToolbarPosition.y}px`,
              transform: 'translateX(-50%)',
              zIndex: 2000
            }}
          >
            <div className="toolbar-buttons">
              <button 
                onClick={() => setEditingElementId(selectedElement.id)}
                className="toolbar-btn edit-btn"
                title="Edit text (Double-click)"
              >
                ✏️
              </button>
              <button 
                onClick={() => {
                  // Duplicate element logic
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(content, 'text/html');
                  const elements = Array.from(doc.body.children);
                  const elementIndex = parseInt(selectedElement.id.split('-')[1]);
                  const elementToDuplicate = elements[elementIndex];
                  
                  if (elementToDuplicate) {
                    const cloned = elementToDuplicate.cloneNode(true);
                    doc.body.appendChild(cloned);
                    onContentChange(doc.body.innerHTML);
                  }
                }}
                className="toolbar-btn duplicate-btn"
                title="Duplicate element"
              >
                📋
              </button>
              <button 
                onClick={() => {
                  // Delete element logic
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(content, 'text/html');
                  const elements = Array.from(doc.body.children);
                  const elementIndex = parseInt(selectedElement.id.split('-')[1]);
                  
                  if (elements[elementIndex]) {
                    elements[elementIndex].remove();
                    onContentChange(doc.body.innerHTML);
                    onSelectElement(null, null);
                    setShowFloatingToolbar(false);
                  }
                }}
                className="toolbar-btn delete-btn"
                title="Delete element"
              >
                🗑️
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // NEW: State for image panel functionality
  const [selectedSections, setSelectedSections] = useState(new Set());
  const [activeImageTab, setActiveImageTab] = useState('settings'); // 'settings', 'generate', or 'search'
  
  // NEW: Add view mode state for Code View
  const [debouncedContent, setDebouncedContent] = useState(content);
  
  // Debounce content updates for live preview (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContent(content);
    }, 300);

    return () => clearTimeout(timer);
  }, [content]);
  
  // Handle Monaco Editor content change
  const handleCodeChange = (value) => {
    if (value !== undefined) {
      onContentChange(value);
    }
  };

  // Enhanced HTML generation for dropped images with better styling and options
  const generateImageHtml = (image, options = {}) => {
    const {
      width = 'auto',
      height = 'auto',
      alignment = 'center',
      caption = true,
      lazy = true,
      responsive = true,
      className = 'blog-image'
    } = options;
    
    const imageUrl = image.url || image.link;
    const altText = image.description || image.alt || image.title || 'Generated image';
    const captionText = caption && image.description ? image.description : '';
    
    // Build responsive styles
    const responsiveStyles = responsive 
      ? 'max-width: 100%; height: auto;' 
      : `width: ${width}; height: ${height};`;
    
    // Build the img tag with proper attributes
    const imgAttributes = [
      `src="${imageUrl}"`,
      `alt="${altText}"`,
      lazy ? 'loading="lazy"' : '',
      `style="${responsiveStyles} border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);"`
    ].filter(Boolean).join(' ');
    
    // Create the complete HTML structure with better styling
    const imageHtml = `
      <figure class="${className}" style="margin: 20px 0; text-align: ${alignment}; clear: both;">
        <img ${imgAttributes} />
        ${captionText ? `<figcaption style="margin-top: 12px; color: #64748b; font-size: 0.9rem; font-style: italic; line-height: 1.4;">${captionText}</figcaption>` : ''}
      </figure>
    `;
    
    return imageHtml.trim();
  };

  // Enhanced onDrop function to handle both Visual and Code modes with precise positioning
  const handleEditorDrop = (e) => {
    console.log('Drop event triggered:', {
      draggedImage,
      viewMode,
      target: e.target,
      currentTarget: e.currentTarget
    });
    
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    if (!draggedImage) {
      console.log('No dragged image found');
      return;
    }

    if (viewMode === 'code') {
      // Code mode: Insert HTML at precise cursor position
      const imageHtml = generateImageHtml(draggedImage);
      
      // Try to get Monaco Editor instance for precise cursor positioning
      const monacoEditor = document.querySelector('.monaco-editor');
      if (monacoEditor && window.monaco) {
        try {
          // Get the Monaco editor instance
          const editor = window.monaco.editor.getEditors()[0];
          if (editor) {
            const position = editor.getPosition();
            const model = editor.getModel();
            
            // Insert at cursor position
            const range = {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            };
            
            // Insert the image HTML with proper formatting
            editor.executeEdits('drag-drop-image', [{
              range: range,
              text: '\n' + imageHtml + '\n'
            }]);
            
            // Update the content state
            onContentChange(model.getValue());
            console.log('Image inserted at cursor position in code mode');
          }
        } catch (error) {
          console.log('Monaco editor integration failed, using fallback:', error);
          // Fallback to append method
          const currentContent = content || '';
          const newContent = currentContent + '\n' + imageHtml + '\n';
          onContentChange(newContent);
        }
      } else {
        // Fallback: Insert at drop position or append to end
        const currentContent = content || '';
        
        // Try to determine drop position based on mouse coordinates
        const dropY = e.clientY;
        const editorElement = e.currentTarget;
        const editorRect = editorElement.getBoundingClientRect();
        const relativeY = dropY - editorRect.top;
        
        // Simple heuristic: if dropped in upper half, insert at beginning
        if (relativeY < editorRect.height / 2) {
          const newContent = imageHtml + '\n' + currentContent;
          onContentChange(newContent);
          console.log('Image inserted at beginning in code mode');
        } else {
          const newContent = currentContent + '\n' + imageHtml + '\n';
          onContentChange(newContent);
          console.log('Image inserted at end in code mode');
        }
      }
    } else {
      // Visual mode: Enhanced drop behavior with precise positioning
      const dropY = e.clientY;
      const dropX = e.clientX;
      
      // Find the closest element to insert the image
      const elements = document.querySelectorAll('.canva-draggable-element, p, h1, h2, h3, h4, h5, h6, div');
      let closestElement = null;
      let minDistance = Infinity;
      let insertPosition = 'after';
      
      elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const distance = Math.abs(dropY - centerY);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestElement = element;
          insertPosition = dropY < centerY ? 'before' : 'after';
        }
      });
      
      if (closestElement) {
        const imageHtml = generateImageHtml(draggedImage);
        
        if (insertPosition === 'before') {
          closestElement.insertAdjacentHTML('beforebegin', imageHtml);
        } else {
          closestElement.insertAdjacentHTML('afterend', imageHtml);
        }
        
        // Update content with new HTML
        const editorContent = document.querySelector('.canva-canvas');
        if (editorContent) {
          onContentChange(editorContent.innerHTML);
        }
        
        console.log('Image inserted in visual mode at precise position');
      } else {
        // Fallback: Use existing drop behavior
        if (onDrop) {
          onDrop(e);
        }
      }
    }
    
    // Show success feedback
    if (e.currentTarget) {
      e.currentTarget.classList.add('drop-success');
      setTimeout(() => {
        e.currentTarget.classList.remove('drop-success');
      }, 600);
    }
    
    // Reset drag state using the existing prop
    handleDragEnd();
  };

  // NEW: State for code editing tools
  const [showPreview, setShowPreview] = useState(true);
  const [showFindReplace, setShowFindReplace] = useState(false);

  // NEW: Code formatting and validation functions
  const formatHTML = () => {
    try {
      // Simple HTML formatting - add proper indentation
      const formatted = content
        .replace(/></g, '>\n<')
        .replace(/^\s+|\s+$/g, '')
        .split('\n')
        .map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return '';
          
          // Calculate indentation level
          const openTags = (content.substring(0, content.indexOf(trimmed)) || '').match(/<(?!\/)[\w\s="':;-]*>/g) || [];
          const closeTags = (content.substring(0, content.indexOf(trimmed)) || '').match(/<\/[\w\s]*>/g) || [];
          const indentLevel = Math.max(0, openTags.length - closeTags.length);
          
          return '  '.repeat(indentLevel) + trimmed;
        })
        .join('\n');
      
      onContentChange(formatted);
    } catch (error) {
      alert('Error formatting HTML: ' + error.message);
    }
  };

  const validateHTML = () => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const errors = doc.querySelectorAll('parsererror');
      
      if (errors.length > 0) {
        alert('HTML validation errors found:\n' + Array.from(errors).map(e => e.textContent).join('\n'));
      } else {
        alert('✅ HTML is valid!');
      }
    } catch (error) {
      alert('Error validating HTML: ' + error.message);
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const openFindReplace = () => {
    setShowFindReplace(true);
  };

  // NEW: Keyboard shortcuts handler
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          onSave();
          break;
        case 'z':
          if (e.shiftKey) {
            e.preventDefault();
            onRedo();
          } else {
            e.preventDefault();
            onUndo();
          }
          break;
        case 'y':
          e.preventDefault();
          onRedo();
          break;
        case 'f':
          if (viewMode === 'code') {
            e.preventDefault();
            openFindReplace();
          }
          break;
        default:
          break;
      }
    }
  };

  // Add keyboard event listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, canUndo, canRedo]);

  return (
    <div className="canva-editor" id="korean-canva-editor">
      {/* Editor Header */}
      <div className="canva-header" id="korean-canva-header">
        <div className="canva-header-left">
          <button onClick={onExit} className="exit-btn" id="korean-exit-btn">
            ← Back to Chat
          </button>
          <h2>🎨 Canva-Style Editor</h2>
        </div>
        <div className="canva-header-center">
          {/* Existing buttons - always visible */}
          <button onClick={onUndo} disabled={!canUndo} className="undo-btn" id="korean-undo-btn" title="Undo (Ctrl+Z)">
            ↶ Undo
          </button>
          <button onClick={onRedo} disabled={!canRedo} className="redo-btn" id="korean-redo-btn" title="Redo (Ctrl+Y)">
            ↷ Redo
          </button>
          
          {/* NEW: View Mode Toggle */}
          <div className="view-mode-toggle">
            <button 
              className={`mode-btn ${viewMode === 'visual' ? 'active' : ''}`}
              onClick={() => setViewMode('visual')}
              id="korean-visual-mode-btn"
            >
              👁️ Visual
            </button>
            <button 
              className={`mode-btn ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
              id="korean-code-mode-btn"
            >
              💻 Code
            </button>
          </div>

          {/* NEW: Code Mode Tools - Only visible in Code mode */}
          {viewMode === 'code' && (
            <div className="code-tools-group">
              <button 
                onClick={formatHTML} 
                className="code-tool-btn format-btn" 
                title="Format HTML (beautify and indent)"
              >
                🎨 Format
              </button>
              <button 
                onClick={validateHTML} 
                className="code-tool-btn validate-btn" 
                title="Validate HTML for errors"
              >
                ✅ Validate
              </button>
              <button 
                onClick={togglePreview} 
                className={`code-tool-btn preview-toggle-btn ${showPreview ? 'active' : ''}`}
                title="Toggle live preview panel"
              >
                {showPreview ? '👁️ Hide Preview' : '👁️ Show Preview'}
              </button>
              <button 
                onClick={openFindReplace} 
                className="code-tool-btn find-btn" 
                title="Find and Replace (Ctrl+F)"
              >
                🔍 Find
              </button>
            </div>
          )}

          {/* NEW: Keyboard shortcuts indicator */}
          <div className="keyboard-shortcuts-hint">
            <span className="shortcuts-text">
              💡 Ctrl+S: Save | Ctrl+Z: Undo | Ctrl+Y: Redo
              {viewMode === 'code' && ' | Ctrl+F: Find'}
            </span>
          </div>
        </div>
        <div className="canva-header-right">
          <button onClick={onSave} className="save-btn" id="korean-save-btn" title="Save Changes (Ctrl+S)">
            💾 Save Changes
          </button>
        </div>
      </div>

      <div className="canva-workspace" id="korean-canva-workspace">
        {/* Left Sidebar - Properties Panel */}
        <div className="canva-sidebar-left" id="korean-sidebar-left">
          <div className="properties-panel" id="korean-properties-panel">
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

        {/* Main Canvas - Conditional rendering based on view mode */}
        <div className="canva-canvas" id="korean-canva-canvas">
          {viewMode === 'visual' ? (
            // Visual Mode - Existing canvas content with responsive preview
            <div className="responsive-canvas-wrapper" style={{
              transform: `scale(${canvasSettings.zoomLevel / 100})`,
              transformOrigin: 'top center',
              width: `${canvasSettings.viewportWidth}px`,
              maxWidth: '100%',
              margin: '0 auto',
              transition: 'all 0.3s ease'
            }}>
              {/* Canvas Controls */}
              <div className="canva-controls">
                <button 
                  className={`canva-control-btn ${showGrid ? 'active' : ''}`}
                  onClick={() => setShowGrid(!showGrid)}
                  title="Toggle Grid"
                >
                  📐 Grid
                </button>
                <button 
                  className={`canva-control-btn ${snapToGrid ? 'active' : ''}`}
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  title="Toggle Snap to Grid"
                >
                  🧲 Snap
                </button>
                <button 
                  className={`canva-control-btn ${showAlignmentGuides ? 'active' : ''}`}
                  onClick={() => setShowAlignmentGuides(!showAlignmentGuides)}
                  title="Toggle Alignment Guides"
                >
                  📏 Guides
                </button>
                <button 
                  className={`canva-control-btn ${showPurePreview ? 'active' : ''}`}
                  onClick={() => setShowPurePreview(!showPurePreview)}
                  title="Toggle Pure HTML Preview (matches Code mode exactly)"
                >
                  🎯 Pure Preview
                </button>
              </div>
              
              {canvasSettings.showDeviceFrame && (
                <div className={`device-frame ${canvasSettings.deviceType}`}>
                  <div className="device-screen">
                    <div 
                      className="canvas-content"
                      id="korean-canvas-content"
                      style={{
                        backgroundColor: canvasSettings.backgroundColor,
                        padding: canvasSettings.padding,
                        maxWidth: canvasSettings.maxWidth,
                        fontFamily: canvasSettings.fontFamily,
                        margin: '0 auto',
                        minHeight: '600px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                      onClick={() => {
                        onSelectElement(null, null);
                        setShowFloatingToolbar(false);
                      }} // Deselect when clicking canvas
                    >
                      {/* Korean Blog Content Wrapper - Separate ID namespace for blog content */}
                      <div className="korean-blog-wrapper" id="blog-content-container">
                        <div className="blog-content-inner" id="blog-rendered-content">
                          {showPurePreview ? (
                            // Pure HTML rendering (matches Code mode exactly)
                            <div 
                              className="pure-preview-content"
                              dangerouslySetInnerHTML={{ __html: content }}
                              style={{
                                // Remove any canvas-specific styling for pure preview
                                position: 'static',
                                padding: 0,
                                margin: 0
                              }}
                            />
                          ) : (
                            // Existing editable content with drag functionality
                            renderEditableContent()
                          )}
                        </div>
                      </div>
                      
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
                </div>
              )}
              
              {!canvasSettings.showDeviceFrame && (
                <div 
                  className="canvas-content"
                  id="korean-canvas-content"
                  style={{
                    backgroundColor: canvasSettings.backgroundColor,
                    padding: canvasSettings.padding,
                    maxWidth: canvasSettings.maxWidth,
                    fontFamily: canvasSettings.fontFamily,
                    margin: '0 auto',
                    minHeight: '600px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  onClick={() => {
                    onSelectElement(null, null);
                    setShowFloatingToolbar(false);
                  }} // Deselect when clicking canvas
                >
                  {/* Korean Blog Content Wrapper - Separate ID namespace for blog content */}
                  <div className="korean-blog-wrapper" id="blog-content-container">
                    <div className="blog-content-inner" id="blog-rendered-content">
                      {showPurePreview ? (
                        // Pure HTML rendering (matches Code mode exactly)
                        <div 
                          className="pure-preview-content"
                          dangerouslySetInnerHTML={{ __html: content }}
                          style={{
                            // Remove any canvas-specific styling for pure preview
                            position: 'static',
                            padding: 0,
                            margin: 0
                          }}
                        />
                      ) : (
                        // Existing editable content with drag functionality
                        renderEditableContent()
                      )}
                    </div>
                  </div>
                  
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
              )}
            </div>
          ) : (
            // Code Mode - Monaco Editor with responsive live preview
            <div className="code-editor-container" id="korean-code-editor">
              <div className={`code-editor-layout ${!showPreview ? 'full-width' : ''}`}>
                {/* Code Editor Panel */}
                <div className="code-editor-panel">
                  <div className="code-editor-header">
                    <h4>💻 HTML Source Code</h4>
                    <div className="code-editor-info">
                      <span>Edit the HTML directly - changes sync with visual mode</span>
                    </div>
                  </div>
                  <div 
                    className={`monaco-editor-wrapper ${isDragging ? 'drag-active' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                      e.currentTarget.classList.add('drag-over');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('drag-over');
                    }}
                    onDrop={handleEditorDrop}
                  >
                    {/* Drop indicator overlay for code mode */}
                    {isDragging && viewMode === 'code' && (
                      <div className="code-drop-indicator">
                        <div className="drop-message">
                          <span className="drop-icon">📝</span>
                          <span>Drop image to insert HTML code</span>
                        </div>
                      </div>
                    )}
                    
                    <Editor
                      height="600px"
                      defaultLanguage="html"
                      value={content}
                      onChange={handleCodeChange}
                      onMount={(editor, monaco) => {
                        // Store editor instance globally for insertImageIntoCode function
                        window.monacoEditorInstance = editor;
                        window.monaco = monaco;
                        console.log('✅ Monaco Editor instance stored globally');
                      }}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        roundedSelection: false,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        formatOnPaste: true,
                        formatOnType: true,
                        tabSize: 2,
                        insertSpaces: true
                      }}
                    />
                  </div>
                </div>
                
                {/* Live Preview Panel with Responsive Design - Only show if showPreview is true */}
                {showPreview && (
                  <div className="live-preview-panel">
                    <div className="preview-header">
                      <h4>👁️ Live Preview</h4>
                      <div className="preview-controls">
                        <div className="preview-info">
                          <span>Real-time preview ({canvasSettings.viewportWidth}px @ {canvasSettings.zoomLevel}%)</span>
                        </div>
                        <button 
                          onClick={() => setShowPreview(false)}
                          className="close-preview-btn"
                          title="Hide Preview Panel"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="responsive-preview-wrapper" style={{
                      transform: `scale(${canvasSettings.zoomLevel / 100})`,
                      transformOrigin: 'top left',
                      width: `${canvasSettings.viewportWidth}px`,
                      height: '600px',
                      overflow: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease'
                    }}>
                      {canvasSettings.showDeviceFrame && (
                        <div className={`device-frame ${canvasSettings.deviceType} preview-frame`}>
                          <div className="device-screen">
                            <div 
                              className="preview-content"
                              style={{
                                backgroundColor: canvasSettings.backgroundColor,
                                padding: canvasSettings.padding,
                                fontFamily: canvasSettings.fontFamily,
                                width: '100%',
                                minHeight: '100%',
                                boxSizing: 'border-box'
                              }}
                            >
                              <div 
                                className="preview-inner"
                                dangerouslySetInnerHTML={{ __html: debouncedContent }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!canvasSettings.showDeviceFrame && (
                        <div 
                          className="preview-content"
                          style={{
                            backgroundColor: canvasSettings.backgroundColor,
                            padding: canvasSettings.padding,
                            fontFamily: canvasSettings.fontFamily,
                            width: '100%',
                            minHeight: '100%',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div 
                            className="preview-inner"
                            dangerouslySetInnerHTML={{ __html: debouncedContent }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* NEW: Find/Replace Modal */}
        {showFindReplace && (
          <div className="find-replace-modal-overlay" onClick={() => setShowFindReplace(false)}>
            <div className="find-replace-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🔍 Find & Replace</h3>
                <button 
                  onClick={() => setShowFindReplace(false)}
                  className="modal-close-btn"
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="find-section">
                  <label>Find:</label>
                  <input 
                    type="text" 
                    id="find-input"
                    placeholder="Enter text to find..."
                    className="find-input"
                  />
                </div>
                <div className="replace-section">
                  <label>Replace with:</label>
                  <input 
                    type="text" 
                    id="replace-input"
                    placeholder="Enter replacement text..."
                    className="replace-input"
                  />
                </div>
                <div className="find-options">
                  <label>
                    <input type="checkbox" id="case-sensitive" />
                    Case sensitive
                  </label>
                  <label>
                    <input type="checkbox" id="whole-word" />
                    Whole word
                  </label>
                  <label>
                    <input type="checkbox" id="regex-mode" />
                    Regular expression
                  </label>
                </div>
                <div className="modal-actions">
                  <button 
                    onClick={() => {
                      const findText = document.getElementById('find-input').value;
                      const replaceText = document.getElementById('replace-input').value;
                      const caseSensitive = document.getElementById('case-sensitive').checked;
                      const wholeWord = document.getElementById('whole-word').checked;
                      const regexMode = document.getElementById('regex-mode').checked;
                      
                      if (!findText) {
                        alert('Please enter text to find');
                        return;
                      }
                      
                      try {
                        let searchPattern;
                        if (regexMode) {
                          searchPattern = new RegExp(findText, caseSensitive ? 'g' : 'gi');
                        } else {
                          const escapedText = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                          const pattern = wholeWord ? `\\b${escapedText}\\b` : escapedText;
                          searchPattern = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
                        }
                        
                        const newContent = content.replace(searchPattern, replaceText);
                        const matchCount = (content.match(searchPattern) || []).length;
                        
                        if (matchCount > 0) {
                          onContentChange(newContent);
                          alert(`✅ Replaced ${matchCount} occurrence(s)`);
                          setShowFindReplace(false);
                        } else {
                          alert('❌ No matches found');
                        }
                      } catch (error) {
                        alert('Error in find/replace: ' + error.message);
                      }
                    }}
                    className="replace-all-btn"
                  >
                    🔄 Replace All
                  </button>
                  <button 
                    onClick={() => {
                      const findText = document.getElementById('find-input').value;
                      if (!findText) {
                        alert('Please enter text to find');
                        return;
                      }
                      
                      const caseSensitive = document.getElementById('case-sensitive').checked;
                      const wholeWord = document.getElementById('whole-word').checked;
                      const regexMode = document.getElementById('regex-mode').checked;
                      
                      try {
                        let searchPattern;
                        if (regexMode) {
                          searchPattern = new RegExp(findText, caseSensitive ? 'g' : 'gi');
                        } else {
                          const escapedText = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                          const pattern = wholeWord ? `\\b${escapedText}\\b` : escapedText;
                          searchPattern = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
                        }
                        
                        const matches = content.match(searchPattern) || [];
                        alert(`Found ${matches.length} occurrence(s) of "${findText}"`);
                      } catch (error) {
                        alert('Error in search: ' + error.message);
                      }
                    }}
                    className="find-btn-modal"
                  >
                    🔍 Find All
                  </button>
                  <button 
                    onClick={() => setShowFindReplace(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Sidebar - Image Panel & Canvas Settings */}
        <div className="canva-sidebar-right" id="korean-sidebar-right">
          {/* Panel Header with Tabs */}
          <div className="panel-header" id="korean-panel-header">
            <div className="panel-tabs">
              <button 
                className={`panel-tab ${activeImageTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveImageTab('settings')}
                id="korean-settings-tab"
              >
                ⚙️ Settings
              </button>
              <button 
                className={`panel-tab ${activeImageTab === 'generate' ? 'active' : ''}`}
                onClick={() => setActiveImageTab('generate')}
                id="korean-generate-tab"
              >
                🎨 Generate
              </button>
              <button 
                className={`panel-tab ${activeImageTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveImageTab('search')}
                id="korean-search-tab"
              >
                🔍 Search
              </button>
            </div>
          </div>

          {/* Canvas Settings Tab */}
          {activeImageTab === 'settings' && (
            <div className="canvas-settings" id="korean-canvas-settings">
              <h3>🎨 Canvas Settings</h3>
              
              {/* Existing Canvas Style Settings */}
              <div className="setting-group">
                <label>Background Color</label>
                <input
                  type="color"
                  value={canvasSettings.backgroundColor}
                  onChange={(e) => onUpdateCanvasSettings(prev => ({
                    ...prev,
                    backgroundColor: e.target.value
                  }))}
                  className="korean-color-input"
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
                  className="korean-text-input"
                  placeholder="800px"
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
                  className="korean-text-input"
                  placeholder="40px"
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
                  className="korean-select-input"
                >
                  <option value="Inter, sans-serif">Inter</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                  <option value="'Courier New', monospace">Courier New</option>
                </select>
              </div>

              {/* NEW: Responsive Design Preview Controls */}
              <div className="responsive-settings-divider">
                <h4>📱 Responsive Preview</h4>
              </div>

              {/* Device Preset Buttons */}
              <div className="setting-group">
                <label>Device Presets</label>
                <div className="device-preset-buttons">
                  <button
                    className={`device-preset-btn ${canvasSettings.deviceType === 'mobile' ? 'active' : ''}`}
                    onClick={() => onUpdateCanvasSettings(prev => ({
                      ...prev,
                      deviceType: 'mobile',
                      viewportWidth: canvasSettings.orientation === 'landscape' ? 667 : 375
                    }))}
                  >
                    📱 Mobile
                  </button>
                  <button
                    className={`device-preset-btn ${canvasSettings.deviceType === 'tablet' ? 'active' : ''}`}
                    onClick={() => onUpdateCanvasSettings(prev => ({
                      ...prev,
                      deviceType: 'tablet',
                      viewportWidth: canvasSettings.orientation === 'landscape' ? 1024 : 768
                    }))}
                  >
                    📟 Tablet
                  </button>
                  <button
                    className={`device-preset-btn ${canvasSettings.deviceType === 'desktop' ? 'active' : ''}`}
                    onClick={() => onUpdateCanvasSettings(prev => ({
                      ...prev,
                      deviceType: 'desktop',
                      viewportWidth: 1200
                    }))}
                  >
                    🖥️ Desktop
                  </button>
                  <button
                    className={`device-preset-btn ${canvasSettings.deviceType === 'custom' ? 'active' : ''}`}
                    onClick={() => onUpdateCanvasSettings(prev => ({
                      ...prev,
                      deviceType: 'custom'
                    }))}
                  >
                    ⚙️ Custom
                  </button>
                </div>
              </div>

              {/* Viewport Width Slider */}
              <div className="setting-group">
                <label>
                  Viewport Width: {canvasSettings.viewportWidth}px
                  {canvasSettings.deviceType !== 'custom' && (
                    <span className="preset-indicator">({canvasSettings.deviceType})</span>
                  )}
                </label>
                <input
                  type="range"
                  min="320"
                  max="1920"
                  step="10"
                  value={canvasSettings.viewportWidth}
                  onChange={(e) => onUpdateCanvasSettings(prev => ({
                    ...prev,
                    viewportWidth: parseInt(e.target.value),
                    deviceType: 'custom'
                  }))}
                  className="viewport-slider"
                  disabled={canvasSettings.deviceType !== 'custom'}
                />
                <div className="slider-labels">
                  <span>320px</span>
                  <span>1920px</span>
                </div>
              </div>

              {/* Orientation Toggle (for mobile/tablet) */}
              {(canvasSettings.deviceType === 'mobile' || canvasSettings.deviceType === 'tablet') && (
                <div className="setting-group">
                  <label>Orientation</label>
                  <div className="orientation-toggle">
                    <button
                      className={`orientation-btn ${canvasSettings.orientation === 'portrait' ? 'active' : ''}`}
                      onClick={() => {
                        const newOrientation = 'portrait';
                        const newWidth = canvasSettings.deviceType === 'mobile' ? 375 : 768;
                        onUpdateCanvasSettings(prev => ({
                          ...prev,
                          orientation: newOrientation,
                          viewportWidth: newWidth
                        }));
                      }}
                    >
                      📱 Portrait
                    </button>
                    <button
                      className={`orientation-btn ${canvasSettings.orientation === 'landscape' ? 'active' : ''}`}
                      onClick={() => {
                        const newOrientation = 'landscape';
                        const newWidth = canvasSettings.deviceType === 'mobile' ? 667 : 1024;
                        onUpdateCanvasSettings(prev => ({
                          ...prev,
                          orientation: newOrientation,
                          viewportWidth: newWidth
                        }));
                      }}
                    >
                      📱 Landscape
                    </button>
                  </div>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="setting-group">
                <label>Preview Zoom: {canvasSettings.zoomLevel}%</label>
                <div className="zoom-controls">
                  <button
                    className="zoom-btn"
                    onClick={() => onUpdateCanvasSettings(prev => ({
                      ...prev,
                      zoomLevel: Math.max(25, prev.zoomLevel - 25)
                    }))}
                    disabled={canvasSettings.zoomLevel <= 25}
                  >
                    🔍➖
                  </button>
                  <input
                    type="range"
                    min="25"
                    max="200"
                    step="25"
                    value={canvasSettings.zoomLevel}
                    onChange={(e) => onUpdateCanvasSettings(prev => ({
                      ...prev,
                      zoomLevel: parseInt(e.target.value)
                    }))}
                    className="zoom-slider"
                  />
                  <button
                    className="zoom-btn"
                    onClick={() => onUpdateCanvasSettings(prev => ({
                      ...prev,
                      zoomLevel: Math.min(200, prev.zoomLevel + 25)
                    }))}
                    disabled={canvasSettings.zoomLevel >= 200}
                  >
                    🔍➕
                  </button>
                </div>
                <div className="zoom-presets">
                  <button
                    className="zoom-preset-btn"
                    onClick={() => onUpdateCanvasSettings(prev => ({ ...prev, zoomLevel: 50 }))}
                  >
                    50%
                  </button>
                  <button
                    className="zoom-preset-btn"
                    onClick={() => onUpdateCanvasSettings(prev => ({ ...prev, zoomLevel: 100 }))}
                  >
                    100%
                  </button>
                  <button
                    className="zoom-preset-btn"
                    onClick={() => onUpdateCanvasSettings(prev => ({ ...prev, zoomLevel: 150 }))}
                  >
                    150%
                  </button>
                </div>
              </div>

              {/* Device Frame Toggle */}
              <div className="setting-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={canvasSettings.showDeviceFrame}
                    onChange={(e) => onUpdateCanvasSettings(prev => ({
                      ...prev,
                      showDeviceFrame: e.target.checked
                    }))}
                  />
                  <span className="checkmark"></span>
                  Show Device Frame
                </label>
              </div>
            </div>
          )}

          {/* DALL-E Image Generation Tab */}
          {activeImageTab === 'generate' && (
            <div className="image-generation-panel" id="korean-image-generation">
              <h3>🎨 AI Image Generation</h3>
              
              {blogSections && blogSections.length > 0 ? (
                <>
                  <p className="panel-description">Select blog sections to generate contextual images:</p>
                  <div className="sections-list" id="korean-sections-list">
                    {blogSections.map((section) => (
                      <label key={section.id} className="korean-section-checkbox">
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
                    className="korean-generate-btn"
                    onClick={() => generateImagesForSelectedSections(
                      blogSections.filter(s => selectedSections.has(s.id)),
                      content
                    )}
                    disabled={selectedSections.size === 0 || isGeneratingImages}
                    id="korean-generate-images-btn"
                  >
                    {isGeneratingImages ? (
                      <>
                        <span className="korean-spinner"></span>
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
                <div className="no-blog-message" id="korean-no-blog">
                  <p>📝 Generate a blog first to create contextual DALL-E images for specific sections.</p>
                  <p>💡 Or use the Search tab to find existing images!</p>
                </div>
              )}

              {/* Generated Images Display */}
              {generatedImages && generatedImages.length > 0 && (
                <div className="generated-images-section" id="korean-generated-images">
                  <h4>🖼️ Generated Images ({generatedImages.length})</h4>
                  <div className="korean-images-grid">
                    {generatedImages.filter(img => img.source === 'dalle').map((image) => (
                      <div
                        key={image.id}
                        className={`korean-image-item ${isDragging && draggedImage && draggedImage.id === image.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, image)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="korean-image-preview">
                          <img src={image.url} alt={image.description} />
                          <div className="korean-image-overlay">
                            <span className="korean-drag-hint">🖱️ Drag to blog</span>
                          </div>
                        </div>
                        <div className="korean-image-info">
                          <p className="korean-image-description">{image.description}</p>
                          {image.sectionTitle && (
                            <span className="korean-section-tag">📍 {image.sectionTitle}</span>
                          )}
                          <span className="korean-source-tag">🎨 DALL-E</span>
                          
                          {/* NEW: Enhanced action buttons */}
                          <div className="image-actions">
                            <button 
                              className="action-btn add-to-canvas-btn"
                              onClick={() => {
                                // Create a synthetic event-like object for onDrop
                                const syntheticEvent = {
                                  preventDefault: () => {},
                                  stopPropagation: () => {},
                                  dataTransfer: {
                                    getData: () => JSON.stringify(image)
                                  }
                                };
                                // Set the dragged image temporarily
                                const originalDraggedImage = draggedImage;
                                handleDragStart({ dataTransfer: { setData: () => {} } }, image);
                                onDrop(syntheticEvent);
                                // Reset drag state
                                handleDragEnd();
                              }}
                              title="Add to canvas"
                            >
                              <span className="icon">📌</span>
                              Add to Canvas
                            </button>
                            
                            {/* Code mode specific buttons */}
                            {viewMode === 'code' && (
                              <>
                                <button 
                                  className="action-btn insert-html-btn"
                                  onClick={() => insertImageIntoCode(image)}
                                  title="Insert as HTML"
                                >
                                  <span className="icon">💻</span>
                                  Insert HTML
                                </button>
                                
                                <button 
                                  className="action-btn copy-html-btn"
                                  onClick={async (event) => {
                                    const html = generateOptimizedImageHtml(image);
                                    const success = await copyToClipboard(html);
                                    if (success) {
                                      const btn = event.target.closest('.copy-html-btn');
                                      const originalText = btn.innerHTML;
                                      btn.innerHTML = '<span class="icon">✅</span>Copied!';
                                      setTimeout(() => btn.innerHTML = originalText, 2000);
                                    }
                                  }}
                                  title="Copy HTML code"
                                >
                                  <span className="icon">📋</span>
                                  Copy HTML
                                </button>
                              </>
                            )}
                            
                            <button 
                              className="action-btn download-btn"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = image.url;
                                link.download = `dalle-image-${image.id}.png`;
                                link.click();
                              }}
                              title="Download image"
                            >
                              <span className="icon">💾</span>
                              Download
                            </button>
                          </div>
                          
                          {/* NEW: HTML code snippet for Code mode */}
                          {viewMode === 'code' && (
                            <div className="html-snippet">
                              <div className="snippet-header">
                                <span>HTML Code:</span>
                                <button 
                                  className="copy-snippet-btn"
                                  onClick={async () => {
                                    const html = generateOptimizedImageHtml(image);
                                    await copyToClipboard(html);
                                  }}
                                  title="Copy to clipboard"
                                >
                                  📋
                                </button>
                              </div>
                              <pre className="code-snippet">
                                <code>{generateOptimizedImageHtml(image)}</code>
                              </pre>
                            </div>
                          )}
                          
                          {/* NEW: Image metadata */}
                          <div className="image-metadata">
                            <div className="metadata-item">
                              <span className="metadata-label">Size:</span>
                              <span className="metadata-value">1024×1024</span>
                            </div>
                            <div className="metadata-item">
                              <span className="metadata-label">Source:</span>
                              <span className="metadata-value">DALL-E 3</span>
                            </div>
                            {image.revised_prompt && (
                              <div className="metadata-item">
                                <span className="metadata-label">Revised Prompt:</span>
                                <span className="metadata-value">{image.revised_prompt}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Google Image Search Tab */}
          {activeImageTab === 'search' && (
            <div className="image-search-panel" id="korean-image-search">
              <h3>🔍 Image Search</h3>
              
              {/* Manual Search */}
              <div className="search-section" id="korean-manual-search">
                <h4>🔍 Manual Search</h4>
                <div className="korean-search-controls">
                  <div className="korean-search-input-group">
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
                      className="korean-search-input"
                    />
                    <button
                      onClick={() => googleSearchQuery.trim() && searchGoogleImages(googleSearchQuery.trim())}
                      disabled={isSearchingGoogleImages || !googleSearchQuery.trim()}
                      className="korean-search-btn"
                    >
                      {isSearchingGoogleImages ? '⏳' : '🔍'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Auto Search for Sections */}
              {blogSections && blogSections.length > 0 && (
                <div className="auto-search-section" id="korean-auto-search">
                  <h4>🤖 Auto-Search for Sections</h4>
                  <button
                    onClick={searchImagesForAllSections}
                    disabled={isGeneratingImages || blogSections.length === 0}
                    className="korean-auto-search-btn"
                  >
                    {isGeneratingImages ? (
                      <>
                        <span className="korean-spinner"></span>
                        Searching...
                      </>
                    ) : (
                      <>
                        🤖 Auto-search for all sections
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Search Results */}
              {googleImages && googleImages.length > 0 && (
                <div className="search-results-section" id="korean-search-results">
                  <h4>📸 Search Results ({googleImages.length})</h4>
                  <div className="korean-images-grid">
                    {googleImages.map((image) => (
                      <div
                        key={image.id}
                        className={`korean-image-item ${isDragging && draggedImage && draggedImage.id === image.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          handleDragStart(e, {
                            ...image,
                            url: image.link || image.url,
                            description: image.title || image.description,
                            placement: 'inline'
                          });
                        }}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="korean-image-preview">
                          <img 
                            src={image.thumbnail || image.link || image.url} 
                            alt={image.title || image.description}
                            onError={(e) => {
                              e.target.src = image.link || image.url; // Fallback to full image if thumbnail fails
                            }}
                          />
                          <div className="korean-image-overlay">
                            <span className="korean-drag-hint">🖱️ Drag to blog</span>
                          </div>
                        </div>
                        <div className="korean-image-info">
                          <p className="korean-image-description">{image.title || image.description}</p>
                          {image.sectionTitle && (
                            <span className="korean-section-tag">📍 {image.sectionTitle}</span>
                          )}
                          {image.query && (
                            <span className="korean-query-tag">🔍 {image.query}</span>
                          )}
                          <span className="korean-source-tag">🌐 Google</span>
                          <div className="korean-image-dimensions">
                            {image.width && image.height && (
                              <span>{image.width}×{image.height}</span>
                            )}
                          </div>
                          
                          {/* NEW: Enhanced action buttons */}
                          <div className="image-actions">
                            <button 
                              className="action-btn add-to-canvas-btn"
                              onClick={() => {
                                // Create proper image object for Google Images
                                const imageData = {
                                  ...image,
                                  url: image.link || image.url,
                                  description: image.title || image.description,
                                  placement: 'inline'
                                };
                                // Create a synthetic event-like object for onDrop
                                const syntheticEvent = {
                                  preventDefault: () => {},
                                  stopPropagation: () => {},
                                  dataTransfer: {
                                    getData: () => JSON.stringify(imageData)
                                  }
                                };
                                // Set the dragged image temporarily
                                handleDragStart({ dataTransfer: { setData: () => {} } }, imageData);
                                onDrop(syntheticEvent);
                                // Reset drag state
                                handleDragEnd();
                              }}
                              title="Add to canvas"
                            >
                              <span className="icon">📌</span>
                              Add to Canvas
                            </button>
                            
                            {/* Code mode specific buttons */}
                            {viewMode === 'code' && (
                              <>
                                <button 
                                  className="action-btn insert-html-btn"
                                  onClick={() => insertImageIntoCode({
                                    ...image,
                                    url: image.link || image.url,
                                    description: image.title || image.description
                                  })}
                                  title="Insert as HTML"
                                >
                                  <span className="icon">💻</span>
                                  Insert HTML
                                </button>
                                
                                <button 
                                  className="action-btn copy-html-btn"
                                  onClick={async (event) => {
                                    const imageData = {
                                      ...image,
                                      url: image.link || image.url,
                                      description: image.title || image.description
                                    };
                                    const html = generateOptimizedImageHtml(imageData);
                                    const success = await copyToClipboard(html);
                                    if (success) {
                                      const btn = event.target.closest('.copy-html-btn');
                                      const originalText = btn.innerHTML;
                                      btn.innerHTML = '<span class="icon">✅</span>Copied!';
                                      setTimeout(() => btn.innerHTML = originalText, 2000);
                                    }
                                  }}
                                  title="Copy HTML code"
                                >
                                  <span className="icon">📋</span>
                                  Copy HTML
                                </button>
                              </>
                            )}
                            
                            <button 
                              className="action-btn download-btn"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = image.link || image.url;
                                link.download = `google-image-${image.id || Date.now()}.jpg`;
                                link.click();
                              }}
                              title="Download image"
                            >
                              <span className="icon">💾</span>
                              Download
                            </button>
                          </div>
                          
                          {/* NEW: HTML code snippet for Code mode */}
                          {viewMode === 'code' && (
                            <div className="html-snippet">
                              <div className="snippet-header">
                                <span>HTML Code:</span>
                                <button 
                                  className="copy-snippet-btn"
                                  onClick={async () => {
                                    const imageData = {
                                      ...image,
                                      url: image.link || image.url,
                                      description: image.title || image.description
                                    };
                                    const html = generateOptimizedImageHtml(imageData);
                                    await copyToClipboard(html);
                                  }}
                                  title="Copy to clipboard"
                                >
                                  📋
                                </button>
                              </div>
                              <pre className="code-snippet">
                                <code>{generateOptimizedImageHtml({
                                  ...image,
                                  url: image.link || image.url,
                                  description: image.title || image.description
                                })}</code>
                              </pre>
                            </div>
                          )}
                          
                          {/* NEW: Enhanced image metadata */}
                          <div className="image-metadata">
                            {image.width && image.height && (
                              <div className="metadata-item">
                                <span className="metadata-label">Dimensions:</span>
                                <span className="metadata-value">{image.width}×{image.height}</span>
                              </div>
                            )}
                            <div className="metadata-item">
                              <span className="metadata-label">Source:</span>
                              <span className="metadata-value">Google Images</span>
                            </div>
                            {image.displayLink && (
                              <div className="metadata-item">
                                <span className="metadata-label">Domain:</span>
                                <span className="metadata-value">{image.displayLink}</span>
                              </div>
                            )}
                            {image.fileFormat && (
                              <div className="metadata-item">
                                <span className="metadata-label">Format:</span>
                                <span className="metadata-value">{image.fileFormat.toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Generated/Found Images */}
              {generatedImages && generatedImages.filter(img => img.source !== 'dalle').length > 0 && (
                <div className="all-images-section" id="korean-all-images">
                  <h4>🖼️ All Found Images ({generatedImages.filter(img => img.source !== 'dalle').length})</h4>
                  <div className="korean-images-grid">
                    {generatedImages.filter(img => img.source !== 'dalle').map((image) => (
                      <div
                        key={image.id}
                        className={`korean-image-item ${isDragging && draggedImage && draggedImage.id === image.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, image)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="korean-image-preview">
                          <img src={image.thumbnail || image.url} alt={image.description} />
                          <div className="korean-image-overlay">
                            <span className="korean-drag-hint">🖱️ Drag to blog</span>
                          </div>
                        </div>
                        <div className="korean-image-info">
                          <p className="korean-image-description">{image.description}</p>
                          {image.sectionTitle && (
                            <span className="korean-section-tag">📍 {image.sectionTitle}</span>
                          )}
                          <span className="korean-source-tag">🌐 {image.source}</span>
                          
                          {/* NEW: Enhanced action buttons */}
                          <div className="image-actions">
                            <button 
                              className="action-btn add-to-canvas-btn"
                              onClick={() => {
                                // Create a synthetic event-like object for onDrop
                                const syntheticEvent = {
                                  preventDefault: () => {},
                                  stopPropagation: () => {},
                                  dataTransfer: {
                                    getData: () => JSON.stringify(image)
                                  }
                                };
                                // Set the dragged image temporarily
                                const originalDraggedImage = draggedImage;
                                handleDragStart({ dataTransfer: { setData: () => {} } }, image);
                                onDrop(syntheticEvent);
                                // Reset drag state
                                handleDragEnd();
                              }}
                              title="Add to canvas"
                            >
                              <span className="icon">📌</span>
                              Add to Canvas
                            </button>
                            
                            {/* Code mode specific buttons */}
                            {viewMode === 'code' && (
                              <>
                                <button 
                                  className="action-btn insert-html-btn"
                                  onClick={() => insertImageIntoCode(image)}
                                  title="Insert as HTML"
                                >
                                  <span className="icon">💻</span>
                                  Insert HTML
                                </button>
                                
                                <button 
                                  className="action-btn copy-html-btn"
                                  onClick={async (event) => {
                                    const html = generateOptimizedImageHtml(image);
                                    const success = await copyToClipboard(html);
                                    if (success) {
                                      const btn = event.target.closest('.copy-html-btn');
                                      const originalText = btn.innerHTML;
                                      btn.innerHTML = '<span class="icon">✅</span>Copied!';
                                      setTimeout(() => btn.innerHTML = originalText, 2000);
                                    }
                                  }}
                                  title="Copy HTML code"
                                >
                                  <span className="icon">📋</span>
                                  Copy HTML
                                </button>
                              </>
                            )}
                            
                            <button 
                              className="action-btn download-btn"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = image.thumbnail || image.url;
                                link.download = `found-image-${image.id || Date.now()}.jpg`;
                                link.click();
                              }}
                              title="Download image"
                            >
                              <span className="icon">💾</span>
                              Download
                            </button>
                          </div>
                          
                          {/* NEW: HTML code snippet for Code mode */}
                          {viewMode === 'code' && (
                            <div className="html-snippet">
                              <div className="snippet-header">
                                <span>HTML Code:</span>
                                <button 
                                  className="copy-snippet-btn"
                                  onClick={async () => {
                                    const html = generateOptimizedImageHtml(image);
                                    await copyToClipboard(html);
                                  }}
                                  title="Copy to clipboard"
                                >
                                  📋
                                </button>
                              </div>
                              <pre className="code-snippet">
                                <code>{generateOptimizedImageHtml(image)}</code>
                              </pre>
                            </div>
                          )}
                          
                          {/* NEW: Enhanced image metadata */}
                          <div className="image-metadata">
                            <div className="metadata-item">
                              <span className="metadata-label">Source:</span>
                              <span className="metadata-value">{image.source || 'Unknown'}</span>
                            </div>
                            {image.width && image.height && (
                              <div className="metadata-item">
                                <span className="metadata-label">Dimensions:</span>
                                <span className="metadata-value">{image.width}×{image.height}</span>
                              </div>
                            )}
                            {image.query && (
                              <div className="metadata-item">
                                <span className="metadata-label">Search Query:</span>
                                <span className="metadata-value">{image.query}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
  const [selectedSections, setSelectedSections] = useState(new Set());
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
    fontFamily: 'Inter, sans-serif',
    // NEW: Responsive design settings
    viewportWidth: 1200,
    deviceType: 'desktop', // 'mobile', 'tablet', 'desktop', 'custom'
    orientation: 'portrait', // 'portrait', 'landscape'
    zoomLevel: 100, // percentage
    showDeviceFrame: false
  });
  
  // Add missing state variables for Canva editor
  const [editingContent, setEditingContent] = useState('');
  const [currentEditingMessageId, setCurrentEditingMessageId] = useState(null);
  
  // NEW: Navigation state
  const [currentPage, setCurrentPage] = useState('blog'); // 'blog', 'profile', 'editor', 'saved'
  
  // NEW: Blog data state
  const [savedBlogs, setSavedBlogs] = useState([]);
  const [userBlogs] = useState([]);
  
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
        
        // Set the saved blogs state
        setSavedBlogs(blogs);
        
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
        const apiUrl = getApiUrl('/api/blog/models');
        
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
    const baseUrl = 'https://blog.andrewbrowne.org';
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
      
    const apiUrl = getApiUrl('/api/blog/stream');
      
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
          const apiUrl = getApiUrl('/api/blog/generate-image');
          
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
      const apiUrl = getApiUrl('/api/blog/search-google-images');
      
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
      const apiUrl = getApiUrl('/api/blog/search-images-for-sections');
      
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
    
    // Add visual feedback to body and drop zones
    document.body.classList.add('dragging-image');
    
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
    
    // Remove visual feedback from body and drop zones
    document.body.classList.remove('dragging-image');
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
    
    // Safely handle classList operations - check if currentTarget exists and has classList
    if (e.currentTarget && e.currentTarget.classList) {
      e.currentTarget.classList.remove('canva-drag-over');
    }
    
    let imageData;
    
    // Try to get Google image data first (only for real drop events)
    if (e.dataTransfer) {
      try {
        const transferData = e.dataTransfer.getData('text/plain');
        if (transferData) {
          const parsedData = JSON.parse(transferData);
          if (parsedData.type === 'google-image') {
            imageData = {
              url: parsedData.src,
              description: parsedData.title,
              alt: parsedData.alt
            };
          }
        }
      } catch (err) {
        console.log('Not a Google image drop');
      }
    }
    
    // If no Google image data, use draggedImage (DALL-E)
    if (!imageData && draggedImage) {
      imageData = draggedImage;
    }

    if (!imageData) {
      console.log('No image data found');
      return;
    }

    setIsDragging(false);
    
    // Get drop position from data attribute (safely)
    let dropPosition = 'end'; // default
    if (e.currentTarget && e.currentTarget.getAttribute) {
      dropPosition = e.currentTarget.getAttribute('data-position') || 'end';
    }
    
    // Create image HTML
    const imageHtml = `
      <div class="blog-image" style="margin: 20px 0; text-align: center;">
        <img src="${imageData.url}" alt="${imageData.description || imageData.alt || ''}" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);" />
        ${imageData.description ? `<p style="margin-top: 8px; color: #64748b; font-size: 0.9rem; font-style: italic;">${imageData.description}</p>` : ''}
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

    // Clear draggedImage only if it was a DALL-E image
    if (draggedImage) {
      setDraggedImage(null);
    }
  };

  const handleDrop = (e, messageId, dropZone = null) => {
    console.log('Drop event:', { messageId, dropZone });
    e.preventDefault();
    
    // Safely handle classList operations
    if (e.currentTarget && e.currentTarget.classList) {
      e.currentTarget.classList.remove('drag-over');
    }
    
    let imageData;
    
    // Try to get Google image data first (only for real drop events)
    if (e.dataTransfer) {
      try {
        const transferData = e.dataTransfer.getData('text/plain');
        if (transferData) {
          const parsedData = JSON.parse(transferData);
          if (parsedData.type === 'google-image') {
            imageData = {
              url: parsedData.src,
              description: parsedData.title,
              alt: parsedData.alt
            };
          }
        }
      } catch (err) {
        console.log('Not a Google image drop');
      }
    }
    
    // If no Google image data, use draggedImage (DALL-E)
    if (!imageData && draggedImage) {
      imageData = draggedImage;
    }

    if (!imageData) {
      console.log('No image data found');
      return;
    }
    
    // Find the message and add the image at the right location
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.type === 'bot') {
        let updatedContent = msg.content;
        
        const imageHtml = `
          <div class="blog-image" style="margin: 20px 0; text-align: center;">
            <img src="${imageData.url}" alt="${imageData.description || imageData.alt || ''}" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);" />
            ${imageData.description ? `<p style="margin-top: 8px; color: #64748b; font-size: 0.9rem; font-style: italic;">${imageData.description}</p>` : ''}
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
    const imageDescription = imageData.description || imageData.alt;
    
    // Clear draggedImage only if it was a DALL-E image
    if (draggedImage) {
      setDraggedImage(null);
      setIsDragging(false);
    }
    
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
    
    // Analyze blog sections for image generation
    const sections = analyzeBlogSections(content);
    setBlogSections(sections);
    setCurrentPage('editor');
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
    try {
      await loadSavedBlogs();
    } catch (error) {
      console.error('Error loading saved blogs:', error);
    }
  };

  const handleEditBlog = (blog) => {
    // Set the blog content for editing
    const blogContent = blog.content || blog.html_content || '';
    setEditingContent(blogContent);
    
    // Create a new message if it doesn't exist
    const newMessage = {
      id: Date.now(),
      type: 'bot',
      content: blogContent,
      isComplete: true,
      format: 'HTML',
      originalTopic: blog.title || 'Saved Blog'
    };
    
    // Add the message to the messages array
    setMessages(prev => [...prev, newMessage]);
    setCurrentEditingMessageId(newMessage.id);
    
    // Analyze blog sections for image generation (THIS WAS MISSING!)
    const sections = analyzeBlogSections(blogContent);
    setBlogSections(sections);
    
    // Switch to editor mode
    setIsEditorMode(true);
    setCurrentPage('editor');
    
    // Save current state for undo/redo
    saveToHistory();
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
                    className={`image-item google-image`}
                    draggable
                    onDragStart={(e) => {
                      console.log('Google Image drag start:', image);
                      // Use the new Google image format
                      e.dataTransfer.setData('text/plain', JSON.stringify({
                        type: 'google-image',
                        src: image.link || image.url,
                        alt: image.title,
                        title: image.title,
                        source: 'google'
                      }));

                      // Create drag preview
                      const dragPreview = document.createElement('img');
                      dragPreview.src = image.thumbnail || image.link;
                      dragPreview.style.width = '80px';
                      dragPreview.style.height = '80px';
                      dragPreview.style.objectFit = 'cover';
                      dragPreview.style.borderRadius = '4px';
                      e.dataTransfer.setDragImage(dragPreview, 40, 40);
                    }}
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
                      
                      {/* Action Buttons */}
                      <div className="image-actions">
                        <button
                          className="action-btn insert-btn"
                          onClick={() => {
                            const imageHtml = generateOptimizedImageHtml(image, {
                              alt: image.title || 'Google Search Result',
                              title: image.title,
                              className: 'google-search-image',
                              loading: 'lazy'
                            });
                            const success = insertImageIntoCode(imageHtml);
                            if (success) {
                              // Visual feedback
                              document.body.classList.add('image-inserted');
                              setTimeout(() => {
                                document.body.classList.remove('image-inserted');
                              }, 1000);
                            }
                          }}
                          title="Insert HTML at cursor position"
                        >
                          📝 Insert HTML
                        </button>
                        
                        <button
                          className="action-btn copy-btn"
                          onClick={async () => {
                            const imageHtml = generateOptimizedImageHtml(image, {
                              alt: image.title || 'Google Search Result',
                              title: image.title,
                              className: 'google-search-image',
                              loading: 'lazy'
                            });
                            const success = await copyToClipboard(imageHtml);
                            if (success) {
                              // Visual feedback
                              const btn = document.activeElement;
                              const originalText = btn.textContent;
                              btn.textContent = '✅ Copied!';
                              btn.classList.add('copied');
                              setTimeout(() => {
                                btn.textContent = originalText;
                                btn.classList.remove('copied');
                              }, 2000);
                            }
                          }}
                          title="Copy HTML to clipboard"
                        >
                          📋 Copy HTML
                        </button>
                        
                        <button
                          className="action-btn canvas-btn"
                          onClick={() => {
                            // Trigger the existing drag/drop functionality
                            const dragEvent = new DragEvent('dragstart', {
                              dataTransfer: new DataTransfer()
                            });
                            dragEvent.dataTransfer.setData('text/plain', JSON.stringify({
                              type: 'google-image',
                              src: image.link || image.url,
                              alt: image.title,
                              title: image.title,
                              source: 'google'
                            }));
                            
                            // Simulate adding to canvas
                            console.log('Adding to canvas:', image);
                            alert('💡 Tip: Use drag & drop to add images to the visual canvas, or use "Insert HTML" for code mode!');
                          }}
                          title="Add to visual canvas"
                        >
                          🎨 Add to Canvas
                        </button>
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
                  editingContent || (messages.length > 0 ? messages[messages.length - 1].content : '')
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

  // NEW: Helper functions for enhanced image functionality
  const generateOptimizedImageHtml = (image, options = {}) => {
    const {
      alt = image.description || 'Generated image',
      width = 'auto',
      height = 'auto',
      className = 'blog-image',
      loading = 'lazy'
    } = options;
    
    return `<img src="${image.url}" alt="${alt}" width="${width}" height="${height}" class="${className}" loading="${loading}" />`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Copied to clipboard!');
    }
  };

  const insertImageIntoCode = (imageHtml) => {
    console.log('insertImageIntoCode called with:', imageHtml);
    
    // This function will be called from the CanvaEditor component
    // The actual implementation is within the CanvaEditor where Monaco Editor is available
    if (window.monacoEditorInstance) {
      try {
        const editor = window.monacoEditorInstance;
        const position = editor.getPosition();
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        };
        
        editor.executeEdits('insert-image', [{
          range: range,
          text: imageHtml
        }]);
        
        // Move cursor after inserted content
        const newPosition = {
          lineNumber: position.lineNumber,
          column: position.column + imageHtml.length
        };
        editor.setPosition(newPosition);
        editor.focus();
        
        console.log('✅ Image HTML inserted successfully at cursor position');
        return true;
      } catch (error) {
        console.error('❌ Error inserting image HTML:', error);
        return false;
      }
    } else {
      console.warn('⚠️ Monaco Editor instance not available');
      return false;
    }
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
              onEditBlog={handleEditBlog}
              savedBlogs={savedBlogs}
              onLoadSavedBlogs={handleLoadSavedBlogs}
              user={user}
              userBlogs={userBlogs}
            />
          ) : currentPage === 'editor' || isEditorMode ? (
            <div className="editor-page">
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
                blogSections={blogSections}
                generatedImages={generatedImages}
                googleImages={googleImages}
                isGeneratingImages={isGeneratingImages}
                isSearchingGoogleImages={isSearchingGoogleImages}
                googleSearchQuery={googleSearchQuery}
                setGoogleSearchQuery={setGoogleSearchQuery}
                generateImagesForSelectedSections={generateImagesForSelectedSections}
                searchGoogleImages={searchGoogleImages}
                searchImagesForAllSections={searchImagesForAllSections}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
                // NEW: Add helper functions as props
                generateOptimizedImageHtml={generateOptimizedImageHtml}
                copyToClipboard={copyToClipboard}
                insertImageIntoCode={insertImageIntoCode}
              />
              {/* Add ImageSidebar to editor mode */}
              <ImageSidebar />
            </div>
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
