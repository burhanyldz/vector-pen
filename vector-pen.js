/**
 * VectorPen - A vector-based drawing tool that can be attached to any HTML element
 */
class VectorPen {
  constructor(options = {}) {
    this.options = {
      strokeWidth: options.strokeWidth || 2,
      strokeColor: options.strokeColor || '#000000',
      eraserWidth: options.eraserWidth || 40,
      minDistance: options.minDistance || 2,
      showToolbar: options.showToolbar !== false,
      verticalToolbar: options.verticalToolbar !== false,
      showClearButtons: options.showClearButtons !== false, // Default to true
      toolbarContainer: options.toolbarContainer || document.body,
      ...options
    };
    
    this.elements = [];
    this.activeElement = null;
    this.isDrawing = false;
    this.activeTool = null;
    this.points = [];
    this.paths = {};
    this.observers = {};
    this.toolbar = null;

    // Add a group for drawings
    this.drawingGroups = {};

    // Bind event handlers
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleResize = this.handleResize.bind(this);

    if (this.options.showToolbar) {
      this.createToolbar();
    }
  
    this.touchHandlers = new WeakMap(); // Store touch handlers for cleanup
  }

  createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';
    
    if (this.options.verticalToolbar) {
      toolbar.classList.add('toolbar-vertical');
    }
    
    const penTool = document.createElement('button');
    penTool.id = 'pen-tool';
    penTool.className = 'tool-button';
    penTool.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path>
      </svg>
    `;
    
    const eraserTool = document.createElement('button');
    eraserTool.id = 'eraser-tool';
    eraserTool.className = 'tool-button';
    eraserTool.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.77-.78 2.04 0 2.83l4.24 4.24c.39.39.9.59 1.41.59.51 0 1.02-.2 1.41-.59l11.14-11.13c.78-.78.78-2.05 0-2.83l-4.24-4.24c-.39-.39-.9-.59-1.41-.59zM6.24 18.39l-2.12-2.12 7.78-7.78 2.12 2.12-7.78 7.78z"></path>
      </svg>
    `;
    
    const clearAll = document.createElement('button');
    clearAll.id = 'clear-all';
    clearAll.className = 'tool-button';
    clearAll.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path>
      </svg>
    `;
    
    // Add click handlers
    penTool.addEventListener('click', () => this.activateTool('pen'));
    eraserTool.addEventListener('click', () => this.activateTool('eraser'));
    clearAll.addEventListener('click', () => this.clearAll());
    
    toolbar.appendChild(penTool);
    toolbar.appendChild(eraserTool);
    toolbar.appendChild(clearAll);
    
    this.options.toolbarContainer.appendChild(toolbar);
    this.toolbar = toolbar;
  }
  
  clearAll() {
    this.elements.forEach(element => this.clear(element));
  }
  
  /**
   * Attach the pen tool to a specific HTML element
   * @param {HTMLElement|string} element - The element or its selector
   * @returns {VectorPen} - Returns this instance for chaining
   */
  attach(element) {
    if (typeof element === 'string') {
      const elements = document.querySelectorAll(element);
      elements.forEach(el => this._attachToElement(el));
      return this;
    }
    
    this._attachToElement(element);
    return this;
  }

  /**
   * Private method to attach to a single element
   * @private
   */
  _attachToElement(element) {
    if (this.elements.includes(element)) return;
    
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "vector-pen-layer");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    
    // Create a group for all drawings
    const drawingGroup = document.createElementNS(svgNS, "g");
    drawingGroup.setAttribute("class", "drawing-group");
    svg.appendChild(drawingGroup);
    
    // Make sure element has position
    const position = window.getComputedStyle(element).position;
    if (position === 'static') {
      element.style.position = 'relative';
    }
    
    // Add clear button for this drawing area if enabled
    if (this.options.showClearButtons) {
      const clearButton = document.createElement('button');
      clearButton.className = 'clear-button';
      clearButton.textContent = 'Temizle';
      clearButton.style.zIndex = '50';
      
      clearButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasToolActive = this.activeTool;
        this.deactivateTool();
        this.clear(element);
        if (wasToolActive) {
          this.activateTool(wasToolActive);
        }
      });
      
      element.appendChild(clearButton);
    }
    
    // Prevent scrolling when drawing
    const handleTouch = (e) => {
      if (this.activeTool) {
        e.preventDefault();
      }
    };

    // Store the handler reference
    this.touchHandlers.set(element, handleTouch);
    
    // Add touch event listeners with passive: false to allow preventDefault
    element.addEventListener('touchstart', handleTouch, { passive: false });
    element.addEventListener('touchmove', handleTouch, { passive: false });
    
    element.appendChild(svg);
    
    // Store references
    this.elements.push(element);
    const id = element.id || `vector-pen-${this.elements.length}`;
    this.paths[id] = [];
    this.drawingGroups[id] = drawingGroup;
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(this.handleResize);
    resizeObserver.observe(element);
    this.observers[id] = resizeObserver;
    
    this._updateSVGSize(element, svg);
  }
  
  /**
   * Detach the pen tool from an element
   * @param {HTMLElement|string} element - The element or selector to detach from
   */
  detach(element) {
    if (typeof element === 'string') {
      const elements = document.querySelectorAll(element);
      elements.forEach(el => this._detachFromElement(el));
      return this;
    }
    
    this._detachFromElement(element);
    return this;
  }
  
  /**
   * Private method to detach from a single element
   * @private
   */
  _detachFromElement(element) {
    const index = this.elements.indexOf(element);
    if (index === -1) return;

    // Remove event listeners using stored reference
    const handleTouch = this.touchHandlers.get(element);
    if (handleTouch) {
      element.removeEventListener('touchstart', handleTouch);
      element.removeEventListener('touchmove', handleTouch);
      this.touchHandlers.delete(element);
    }
    
    // Remove SVG layer and clear button
    const svg = element.querySelector('.vector-pen-layer');
    const clearButton = element.querySelector('.clear-button');
    if (svg) element.removeChild(svg);
    if (clearButton) element.removeChild(clearButton);
    
    // Disconnect resize observer
    const id = element.id || `vector-pen-${index + 1}`;
    if (this.observers[id]) {
      this.observers[id].disconnect();
      delete this.observers[id];
    }
    
    // Remove from storage
    this.elements.splice(index, 1);
    delete this.paths[id];
    delete this.drawingGroups[id];
  }
  
  /**
   * Activate a tool (pen or eraser)
   * @param {string} tool - 'pen' or 'eraser'
   */
  activateTool(tool) {
    if (this.activeTool === tool) {
      this.deactivateTool();
      return;
    }
    
    this.deactivateTool();
    this.activeTool = tool;
    
    // Update toolbar button states
    if (this.toolbar) {
      const penButton = this.toolbar.querySelector('#pen-tool');
      const eraserButton = this.toolbar.querySelector('#eraser-tool');
      
      penButton.classList.toggle('active', tool === 'pen');
      eraserButton.classList.toggle('active', tool === 'eraser');
    }
    
    // Add event listeners to all elements
    this.elements.forEach(element => {
      element.addEventListener('pointerdown', this.handlePointerDown);
      // Ensure pointer events work on the SVG layer
      const svg = element.querySelector('.vector-pen-layer');
      if (svg) svg.style.pointerEvents = 'auto';
    });
    
    return this;
  }
  
  /**
   * Deactivate the current tool
   */
  deactivateTool() {
    if (!this.activeTool) return this;
    
    // Remove active states from toolbar buttons
    if (this.toolbar) {
      const penButton = this.toolbar.querySelector('#pen-tool');
      const eraserButton = this.toolbar.querySelector('#eraser-tool');
      
      penButton.classList.remove('active');
      eraserButton.classList.remove('active');
    }
    
    // Remove event listeners from all elements
    this.elements.forEach(element => {
      element.removeEventListener('pointerdown', this.handlePointerDown);
      // Disable pointer events on the SVG layer
      const svg = element.querySelector('.vector-pen-layer');
      if (svg) svg.style.pointerEvents = 'none';
    });
    
    this.activeTool = null;
    return this;
  }
  
  /**
   * Handle pointer down event
   * @private
   */
  handlePointerDown(event) {
    const element = event.currentTarget;
    this.activeElement = element;
    
    // Get SVG element
    const svg = element.querySelector('.vector-pen-layer');
    if (!svg) return;
    
    // Capture pointer to track movement outside element
    event.target.setPointerCapture(event.pointerId);
    
    // Get element-relative coordinates
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.isDrawing = true;
    this.points = [{x, y}];
    
    // Add event listeners for move and up events
    element.addEventListener('pointermove', this.handlePointerMove);
    element.addEventListener('pointerup', this.handlePointerUp);
    element.addEventListener('pointercancel', this.handlePointerUp);
    element.addEventListener('pointerleave', this.handlePointerUp);
  }
  
  /**
   * Handle pointer move event
   * @private
   */
  handlePointerMove(event) {
    if (!this.isDrawing || !this.activeElement) return;
    
    // Get element-relative coordinates
    const rect = this.activeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate distance from last point
    const lastPoint = this.points[this.points.length - 1];
    const dx = x - lastPoint.x;
    const dy = y - lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only add points with enough distance to avoid too many small segments
    if (distance >= this.options.minDistance) {
      this.points.push({x, y});
      this._updateStroke();
    }
  }
  
  /**
   * Handle pointer up event
   * @private
   */
  handlePointerUp(event) {
    if (!this.isDrawing || !this.activeElement) return;
    
    // Final update to the stroke
    if (this.points.length > 1) {
      this._finalizeStroke();
    }
    
    // Clean up
    this.isDrawing = false;
    this.points = [];
    
    // Remove event listeners
    this.activeElement.removeEventListener('pointermove', this.handlePointerMove);
    this.activeElement.removeEventListener('pointerup', this.handlePointerUp);
    this.activeElement.removeEventListener('pointercancel', this.handlePointerUp);
    this.activeElement.removeEventListener('pointerleave', this.handlePointerUp);
  }
  
  /**
   * Update the current stroke during drawing
   * @private
   */
  _updateStroke() {
    if (!this.activeElement || this.points.length < 2) return;
    
    const svg = this.activeElement.querySelector('.vector-pen-layer');
    if (!svg) return;
    
    const id = this.activeElement.id || `vector-pen-${this.elements.indexOf(this.activeElement) + 1}`;
    const drawingGroup = this.drawingGroups[id];
    
    const svgNS = "http://www.w3.org/2000/svg";
    let tempPath = svg.querySelector('.temp-path');
    if (!tempPath) {
      tempPath = document.createElementNS(svgNS, "path");
      tempPath.setAttribute("class", "temp-path");
      tempPath.setAttribute("fill", "none");
      
      if (this.activeTool === 'pen') {
        tempPath.setAttribute("stroke", this.options.strokeColor);
        tempPath.setAttribute("stroke-width", this.options.strokeWidth);
      } else if (this.activeTool === 'eraser') {
        tempPath.setAttribute("stroke", "white");
        tempPath.setAttribute("stroke-width", this.options.eraserWidth);
        tempPath.setAttribute("stroke-opacity", "1");
        tempPath.setAttribute("stroke-linecap", "round");
        tempPath.setAttribute("stroke-linejoin", "round");
        tempPath.setAttribute("style", "mix-blend-mode: destination-out");
      }
      
      drawingGroup.appendChild(tempPath);
    }
    
    const pathData = this._generatePathData(this.points);
    tempPath.setAttribute("d", pathData);
  }
  
  /**
   * Finalize the stroke when drawing ends
   * @private
   */
  _finalizeStroke() {
    if (!this.activeElement) return;
    
    const svg = this.activeElement.querySelector('.vector-pen-layer');
    if (!svg) return;
    
    const id = this.activeElement.id || `vector-pen-${this.elements.indexOf(this.activeElement) + 1}`;
    const drawingGroup = this.drawingGroups[id];
    
    const pathData = this._generatePathData(this.points);
    
    const svgNS = "http://www.w3.org/2000/svg";
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("fill", "none");
    
    if (this.activeTool === 'pen') {
      path.setAttribute("stroke", this.options.strokeColor);
      path.setAttribute("stroke-width", this.options.strokeWidth);
      path.setAttribute("class", "vector-pen-stroke");
    } else if (this.activeTool === 'eraser') {
      path.setAttribute("stroke", "white");
      path.setAttribute("stroke-width", this.options.eraserWidth);
      path.setAttribute("stroke-opacity", "1");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("style", "mix-blend-mode: destination-out");
      path.setAttribute("class", "vector-pen-eraser");
    }
    
    path.setAttribute("d", pathData);
    drawingGroup.appendChild(path);
    
    // Store the path in our collection
    this.paths[id].push({
      type: this.activeTool,
      pathData,
      points: [...this.points]
    });
    
    // Remove temp path
    const tempPath = svg.querySelector('.temp-path');
    if (tempPath) tempPath.remove();
  }
  
  /**
   * Generate SVG path data from points
   * @private
   */
  _generatePathData(points) {
    if (points.length < 2) return '';
    
    let pathData = `M ${points[0].x} ${points[0].y}`;
    
    // Use quadratic curves to smooth the line
    for (let i = 1; i < points.length - 1; i++) {
      const c = (points[i].x + points[i+1].x) / 2;
      const d = (points[i].y + points[i+1].y) / 2;
      pathData += ` Q ${points[i].x} ${points[i].y}, ${c} ${d}`;
    }
    
    // Add the last point
    pathData += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    
    return pathData;
  }
  
  /**
   * Handle element resize
   * @private
   */
  handleResize(entries) {
    entries.forEach(entry => {
      const element = entry.target;
      const svg = element.querySelector('.vector-pen-layer');
      if (svg) {
        this._updateSVGSize(element, svg);
      }
    });
  }
  
  /**
   * Update SVG size to match element size
   * @private
   */
  _updateSVGSize(element, svg) {
    const rect = element.getBoundingClientRect();
    svg.setAttribute("width", rect.width);
    svg.setAttribute("height", rect.height);
    svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  }
  
  /**
   * Clear all drawings from an element
   * @param {HTMLElement|string} element - The element or selector to clear
   */
  clear(element) {
    if (typeof element === 'string') {
      const elements = document.querySelectorAll(element);
      elements.forEach(el => this._clearElement(el));
      return this;
    }
    
    this._clearElement(element);
    return this;
  }

  /**
   * Clear drawings from a single element
   * @private
   */
  _clearElement(element) {
    const svg = element.querySelector('.vector-pen-layer');
    if (!svg) return;
    
    const id = element.id || `vector-pen-${this.elements.indexOf(element) + 1}`;
    const drawingGroup = this.drawingGroups[id];
    
    // Clear all paths in the drawing group
    while (drawingGroup.lastChild) {
      drawingGroup.removeChild(drawingGroup.lastChild);
    }
    
    // Clear stored paths
    if (this.paths[id]) {
      this.paths[id] = [];
    }
  }
  
  /**
   * Set the color for the pen tool
   * @param {string} color - CSS color value
   */
  setColor(color) {
    this.options.strokeColor = color;
    return this;
  }

  /**
   * Set the stroke width for the pen tool
   * @param {number} width - Width in pixels
   */
  setStrokeWidth(width) {
    this.options.strokeWidth = width;
    return this;
  }
  
  /**
   * Set the eraser width
   * @param {number} width - Width in pixels
   */
  setEraserWidth(width) {
    this.options.eraserWidth = width;
    return this;
  }
}

// Export as global or module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VectorPen;
} else {
  window.VectorPen = VectorPen;
}