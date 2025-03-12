/**
 * PinchZoom - A touch-based zoom module that can be attached to any HTML element
 */
class PinchZoom {
  constructor(options = {}) {
    this.options = {
      minZoom: options.minZoom || 0.5,
      maxZoom: options.maxZoom || 3.0,
      speedFactor: options.speedFactor || 0.002,
      animationDuration: options.animationDuration || 200,
      disablePan: options.disablePan !== undefined ? options.disablePan : false,
      enablePresentation: options.enablePresentation !== undefined ? options.enablePresentation : true,
      ...options
    };
    
    this.elements = [];
    this.observers = {};
    this.touchCache = {};
    
    // Bind event handlers
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchCancel = this.handleTouchEnd.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);
    this.handleEscKey = this.handleEscKey.bind(this);
    
    this.attachedHandlers = new WeakMap();
    
    // Add ESC key handler for presentation mode
    if (this.options.enablePresentation) {
      document.addEventListener('keydown', this.handleEscKey);
    }
  }
  
  /**
   * Attach the zoom functionality to a specific HTML element
   * @param {HTMLElement|string} element - The element or its selector
   * @returns {PinchZoom} - Returns this instance for chaining
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
    
    // Get all direct children elements that need to be zoomed
    const children = Array.from(element.children);
    if (children.length === 0) {
      console.warn('PinchZoom: Target element has no children to zoom');
      return;
    }
    
    // Set up the container element for zooming
    element.classList.add('pinch-zoom-container');
    children.forEach(child => {
      child.classList.add('pinch-zoom-element');
    });
    
    // Initialize element state
    const elementState = {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      initialScale: 1,
      initialOffsetX: 0,
      initialOffsetY: 0,
      isPresentation: false
    };
    
    // Store the handlers for this element
    const handlers = {
      touchStart: (e) => this.handleTouchStart(e, element, elementState),
      touchMove: (e) => this.handleTouchMove(e, element, elementState),
      touchEnd: (e) => this.handleTouchEnd(e, element, elementState),
      wheel: (e) => this.handleWheel(e, element, elementState),
      doubleClick: (e) => this.handleDoubleClick(e, element, elementState)
    };
    this.attachedHandlers.set(element, handlers);
    
    // Add event listeners
    element.addEventListener('touchstart', handlers.touchStart, { passive: false });
    element.addEventListener('touchmove', handlers.touchMove, { passive: false });
    element.addEventListener('touchend', handlers.touchEnd);
    element.addEventListener('touchcancel', handlers.touchEnd);
    element.addEventListener('wheel', handlers.wheel, { passive: false });
    
    // Add double click handler for presentation mode
    if (this.options.enablePresentation) {
      element.addEventListener('dblclick', handlers.doubleClick);
    }
    
    // Store references
    this.elements.push(element);
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => this.handleResize(element, elementState));
    resizeObserver.observe(element);
    this.observers[this.elements.indexOf(element)] = resizeObserver;
    
    // Apply initial transform
    this._applyTransform(element, elementState);
  }
  
  /**
   * Detach the zoom functionality from an element
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
    
    // Get the handlers for this element
    const handlers = this.attachedHandlers.get(element);
    if (handlers) {
      element.removeEventListener('touchstart', handlers.touchStart);
      element.removeEventListener('touchmove', handlers.touchMove);
      element.removeEventListener('touchend', handlers.touchEnd);
      element.removeEventListener('touchcancel', handlers.touchEnd);
      element.removeEventListener('wheel', handlers.wheel);
      this.attachedHandlers.delete(element);
    }
    
    // Remove classes
    element.classList.remove('pinch-zoom-container');
    const target = element.querySelector('.pinch-zoom-element');
    if (target) {
      target.classList.remove('pinch-zoom-element');
      target.style.transform = '';
    }
    
    // Disconnect resize observer
    if (this.observers[index]) {
      this.observers[index].disconnect();
      delete this.observers[index];
    }
    
    // Remove from storage
    this.elements.splice(index, 1);
  }
  
  /**
   * Handle touch start events
   * @private
   */
  handleTouchStart(event, element, state) {
    // Only handle multi-touch events
    if (event.touches.length < 2) return;
    
    // Prevent default to avoid page scroll/zoom
    event.preventDefault();
    
    // Reset initial state for this gesture
    state.initialScale = state.scale;
    state.initialOffsetX = state.offsetX;
    state.initialOffsetY = state.offsetY;
    
    // Store touch points and calculate initial midpoint in element coordinates
    const touches = Array.from(event.touches);
    const rect = element.getBoundingClientRect();
    
    this.touchCache = {
      touch1: {
        id: touches[0].identifier,
        x: touches[0].clientX - rect.left,
        y: touches[0].clientY - rect.top
      },
      touch2: {
        id: touches[1].identifier,
        x: touches[1].clientX - rect.left,
        y: touches[1].clientY - rect.top
      }
    };
    
    // Calculate initial distance and midpoint in element coordinates
    this.touchCache.initialDistance = this._getDistance(
      this.touchCache.touch1.x, this.touchCache.touch1.y,
      this.touchCache.touch2.x, this.touchCache.touch2.y
    );
    
    this.touchCache.initialMidpoint = this._getMidpoint(
      this.touchCache.touch1.x, this.touchCache.touch1.y,
      this.touchCache.touch2.x, this.touchCache.touch2.y
    );
  }
  
  /**
   * Handle touch move events
   * @private
   */
  handleTouchMove(event, element, state) {
    // Only handle multi-touch events
    if (event.touches.length < 2) return;
    
    // Prevent default to avoid page scroll/zoom
    event.preventDefault();
    
    const rect = element.getBoundingClientRect();
    const touches = Array.from(event.touches);
    
    // Convert touch points to element coordinates
    let touch1, touch2;
    for (const touch of touches) {
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      if (touch.identifier === this.touchCache.touch1.id) {
        touch1 = { x, y };
      } else if (touch.identifier === this.touchCache.touch2.id) {
        touch2 = { x, y };
      }
    }
    
    // If we couldn't find the original touch points, exit
    if (!touch1 || !touch2) return;
    
    // Calculate new distance and scale
    const currentDistance = this._getDistance(
      touch1.x, touch1.y,
      touch2.x, touch2.y
    );
    
    // Calculate zoom scale change with reduced sensitivity
    const scaleFactor = currentDistance / this.touchCache.initialDistance;
    const newScale = Math.max(
      this.options.minZoom,
      Math.min(
        this.options.maxZoom,
        state.initialScale * scaleFactor
      )
    );
    
    // Calculate the current midpoint
    const currentMidpoint = this._getMidpoint(touch1.x, touch1.y, touch2.x, touch2.y);
    
    if (!this.options.disablePan) {
      // Calculate the translation needed to keep the midpoint between fingers
      const dx = currentMidpoint.x - this.touchCache.initialMidpoint.x;
      const dy = currentMidpoint.y - this.touchCache.initialMidpoint.y;
      
      // Update offsets considering the new scale
      state.offsetX = state.initialOffsetX + dx / newScale;
      state.offsetY = state.initialOffsetY + dy / newScale;
    }
    
    // Update scale
    state.scale = newScale;
    
    // Apply the transformation
    this._applyTransform(element, state);
  }
  
  /**
   * Handle touch end events
   * @private
   */
  handleTouchEnd(event, element, state) {
    // Apply constraints when touch is ended
    if (state.scale < this.options.minZoom) {
      this._animateToScale(element, state, this.options.minZoom);
    } else if (state.scale > this.options.maxZoom) {
      this._animateToScale(element, state, this.options.maxZoom);
    }
    
    // Reset touch cache
    this.touchCache = {};
  }
  
  /**
   * Handle mouse wheel events for zooming
   * @private
   */
  handleWheel(event, element, state) {
    // Prevent default scroll
    event.preventDefault();
    
    // Calculate the scale change
    const delta = -event.deltaY * this.options.speedFactor;
    const newScale = Math.max(
      this.options.minZoom,
      Math.min(
        this.options.maxZoom,
        state.scale * (1 + delta)
      )
    );
    
    // If disablePan is false, zoom in at cursor position
    if (!this.options.disablePan) {
      const rect = element.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      // Calculate new offsets to zoom toward cursor position
      state.offsetX = mouseX / state.scale - mouseX / newScale * (state.scale / newScale) + state.offsetX;
      state.offsetY = mouseY / state.scale - mouseY / newScale * (state.scale / newScale) + state.offsetY;
    }
    
    // Update scale
    state.scale = newScale;
    
    // Apply the transformation
    this._applyTransform(element, state);
  }
  
  /**
   * Handle resize events
   * @private
   */
  handleResize(element, state) {
    // Reapply transformation on resize
    this._applyTransform(element, state);
  }
  
  /**
   * Handle double click for presentation mode
   * @private
   */
  handleDoubleClick(event, element, state) {
    if (!this.options.enablePresentation) return;
    
    event.preventDefault();
    this.togglePresentationMode(element, state);
  }
  
  /**
   * Handle ESC key for exiting presentation mode
   * @private
   */
  handleEscKey(event) {
    if (event.key === 'Escape') {
      this.elements.forEach(element => {
        const state = this._getElementState(element);
        if (state && state.isPresentation) {
          this.togglePresentationMode(element, state);
        }
      });
    }
  }
  
  /**
   * Toggle presentation mode for an element
   * @private
   */
  togglePresentationMode(element, state) {
    state.isPresentation = !state.isPresentation;
    element.classList.toggle('presentation-mode', state.isPresentation);
    
    // Reset transform when entering/exiting presentation mode
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    this._applyTransform(element, state);
    
    // Dispatch event
    const event = new CustomEvent('presentationmodechange', {
      detail: {
        isPresentation: state.isPresentation
      }
    });
    element.dispatchEvent(event);
  }
  
  /**
   * Get element state
   * @private
   */
  _getElementState(element) {
    const handlers = this.attachedHandlers.get(element);
    return handlers && handlers.state;
  }
  
  /**
   * Apply the transformation to the element
   * @private
   */
  _applyTransform(element, state) {
    const elements = element.querySelectorAll('.pinch-zoom-element');
    if (!elements.length) return;
    
    // First translate then scale, using the transform-origin: center center
    const transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
    
    // Apply transform to all pinch-zoom-element elements
    elements.forEach(el => {
      el.style.transform = transform;
    });
    
    // Dispatch custom event
    const event = new CustomEvent('pinchzoom', {
      detail: {
        scale: state.scale,
        offsetX: state.offsetX,
        offsetY: state.offsetY,
        isPresentation: state.isPresentation
      }
    });
    element.dispatchEvent(event);
  }
  
  /**
   * Animate to a specific scale
   * @private
   */
  _animateToScale(element, state, targetScale) {
    const startScale = state.scale;
    const startTime = Date.now();
    const duration = this.options.animationDuration;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease function (easeOutQuad)
      const easedProgress = progress * (2 - progress);
      
      // Calculate current scale
      state.scale = startScale + (targetScale - startScale) * easedProgress;
      
      // Apply transformation
      this._applyTransform(element, state);
      
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  /**
   * Set minimum zoom level
   * @param {number} zoom - Minimum zoom level
   */
  setMinZoom(zoom) {
    this.options.minZoom = zoom;
    return this;
  }
  
  /**
   * Set maximum zoom level
   * @param {number} zoom - Maximum zoom level
   */
  setMaxZoom(zoom) {
    this.options.maxZoom = zoom;
    return this;
  }
  
  /**
   * Reset zoom for an element
   * @param {HTMLElement|string} element - The element or selector to reset
   */
  reset(element) {
    if (typeof element === 'string') {
      const elements = document.querySelectorAll(element);
      elements.forEach(el => this._resetElement(el));
      return this;
    }
    
    this._resetElement(element);
    return this;
  }
  
  /**
   * Reset zoom for a specific element
   * @private
   */
  _resetElement(element) {
    const index = this.elements.indexOf(element);
    if (index === -1) return;
    
    const target = element.querySelector('.pinch-zoom-element');
    if (!target) return;
    
    // Create a temporary state
    const tempState = {
      scale: 1,
      offsetX: 0,
      offsetY: 0
    };
    
    // Animate back to default
    this._animateToScale(element, tempState, 1);
  }
  
  /**
   * Calculate the distance between two points
   * @private
   */
  _getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
  
  /**
   * Calculate the midpoint between two points
   * @private
   */
  _getMidpoint(x1, y1, x2, y2) {
    return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2
    };
  }
  
  /**
   * Enable or disable presentation mode feature
   * @param {boolean} enabled - Whether presentation mode should be enabled
   */
  setEnablePresentation(enabled) {
    this.options.enablePresentation = enabled;
    return this;
  }
}

// Export as global or module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PinchZoom;
} else {
  window.PinchZoom = PinchZoom;
}