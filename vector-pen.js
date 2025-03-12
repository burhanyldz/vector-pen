/**
 * VectorPen - A vector-based drawing tool that can be attached to any HTML element
 */
class VectorPen {
  constructor(options = {}) {
    this.options = {
      strokeWidth: options.strokeWidth || 2,
      strokeColor: options.strokeColor || '#000000',
      eraserWidth: options.eraserWidth || 40, // 20 times wider than pen by default
      minDistance: options.minDistance || 2,
      ...options
    };
    
    this.elements = []; // Elements with attached drawing layers
    this.activeElement = null;
    this.isDrawing = false;
    this.activeTool = null; // 'pen' or 'eraser'
    this.points = []; // Current stroke points
    this.paths = {}; // Store paths for each element
    this.observers = {}; // Resize observers for elements
    
    // Bind event handlers to maintain 'this' context
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleResize = this.handleResize.bind(this);
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
    
    // Create SVG layer
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "vector-pen-layer");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    
    // Make sure element has position
    const position = window.getComputedStyle(element).position;
    if (position === 'static') {
      element.style.position = 'relative';
    }
    
    element.appendChild(svg);
    
    // Store reference to the element and its SVG layer
    this.elements.push(element);
    this.paths[element.id || `vector-pen-${this.elements.length}`] = [];
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(this.handleResize);
    resizeObserver.observe(element);
    this.observers[element.id || `vector-pen-${this.elements.length}`] = resizeObserver;
    
    // Optimize SVG size on initial attach
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
    
    // Remove SVG layer
    const svg = element.querySelector('.vector-pen-layer');
    if (svg) element.removeChild(svg);
    
    // Disconnect resize observer
    const id = element.id || `vector-pen-${index + 1}`;
    if (this.observers[id]) {
      this.observers[id].disconnect();
      delete this.observers[id];
    }
    
    // Remove from storage
    this.elements.splice(index, 1);
    delete this.paths[id];
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
    
    // Find or create the temporary path element
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
      
      svg.appendChild(tempPath);
    }
    
    // Generate path data
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
    
    // Generate path data
    const pathData = this._generatePathData(this.points);
    
    // Create final path
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
    svg.appendChild(path);
    
    // Store the path in our collection
    const id = this.activeElement.id || `vector-pen-${this.elements.indexOf(this.activeElement) + 1}`;
    this.paths[id].push({
      type: this.activeTool,
      pathData,
      points: [...this.points]
    });
    
    // Remove temp path
    const tempPath = svg.querySelector('.temp-path');
    if (tempPath) svg.removeChild(tempPath);
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
    
    // Remove all paths, more reliable way to clear the SVG content
    while (svg.lastChild) {
      svg.removeChild(svg.lastChild);
    }
    
    // Clear stored paths
    const id = element.id || `vector-pen-${this.elements.indexOf(element) + 1}`;
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