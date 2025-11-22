/**
 * Futuristic City Explorer - Main JavaScript File
 * Interactive city builder with drag-and-drop functionality
 */

class CityExplorer {
  constructor() {
    this.isDayMode = false;
    this.selectedObject = null;
    this.objectCounter = 0;
    this.cityObjects = [];
    this.draggedElement = null;
    this.dragOffset = { x: 0, y: 0 };
    
    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    this.setupEventListeners();
    this.loadSavedCity();
    this.generateTraffic();
    this.generateFloatingElements();
    
    // Set initial mode
    document.body.classList.add('night-mode');
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Day/Night toggle
    const dayNightToggle = document.getElementById('dayNightToggle');
    dayNightToggle.addEventListener('click', () => this.toggleDayNight());

    // Palette items drag start
    const paletteItems = document.querySelectorAll('.palette-item');
    paletteItems.forEach(item => {
      item.addEventListener('dragstart', (e) => this.handlePaletteDragStart(e));
      item.addEventListener('mousedown', (e) => this.handlePaletteMouseDown(e));
    });

    // City canvas drop zone
    const cityCanvas = document.getElementById('cityCanvas');
    cityCanvas.addEventListener('dragover', (e) => e.preventDefault());
    cityCanvas.addEventListener('drop', (e) => this.handleCanvasDrop(e));
    cityCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));

    // Color picker
    const colorPicker = document.getElementById('colorPicker');
    colorPicker.addEventListener('change', (e) => this.handleColorChange(e));

    // Object color picker
    const objectColorPicker = document.getElementById('objectColorPicker');
    objectColorPicker.addEventListener('change', (e) => this.handleObjectColorChange(e));

    // Clear city button
    const clearBtn = document.getElementById('clearCity');
    clearBtn.addEventListener('click', () => this.clearCity());

    // Delete object button
    const deleteBtn = document.getElementById('deleteObject');
    deleteBtn.addEventListener('click', () => this.deleteSelectedObject());

    // Global mouse events for dragging
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Toggle between day and night mode
   */
  toggleDayNight() {
    this.isDayMode = !this.isDayMode;
    const body = document.body;
    const toggleBtn = document.getElementById('dayNightToggle');
    const toggleIcon = toggleBtn.querySelector('.toggle-icon');
    const toggleText = toggleBtn.querySelector('.toggle-text');

    if (this.isDayMode) {
      body.classList.remove('night-mode');
      body.classList.add('day-mode');
      toggleIcon.textContent = '☀️';
      toggleText.textContent = 'Day Mode';
    } else {
      body.classList.remove('day-mode');
      body.classList.add('night-mode');
      toggleIcon.textContent = '🌙';
      toggleText.textContent = 'Night Mode';
    }

    // Update object appearances based on mode
    this.updateObjectsForMode();
    this.saveCity();
  }

  /**
   * Handle palette item drag start
   */
  handlePaletteDragStart(e) {
    const item = e.target.closest('.palette-item');
    const objectType = item.dataset.type;
    const objectColor = item.dataset.color;
    
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: objectType,
      color: objectColor
    }));
  }

  /**
   * Handle palette item mouse down for mobile support
   */
  handlePaletteMouseDown(e) {
    if (e.button !== 0) return; // Only left click
    
    const item = e.target.closest('.palette-item');
    const objectType = item.dataset.type;
    const objectColor = item.dataset.color;
    
    // Create a temporary object for dragging
    this.createDragPreview(objectType, objectColor, e.clientX, e.clientY);
    
    e.preventDefault();
  }

  /**
   * Create drag preview for mobile/mouse dragging
   */
  createDragPreview(type, color, x, y) {
    const preview = this.createCityObject(type, color, 0, 0);
    preview.classList.add('dragging');
    preview.style.position = 'fixed';
    preview.style.left = x + 'px';
    preview.style.top = y + 'px';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '10000';
    
    document.body.appendChild(preview);
    this.draggedElement = preview;
    this.dragOffset = { x: 25, y: 25 }; // Center the object on cursor
  }

  /**
   * Handle canvas drop
   */
  handleCanvasDrop(e) {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const rect = document.getElementById('cityCanvas').getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      this.createAndPlaceObject(data.type, data.color, x, y);
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }

  /**
   * Handle mouse move for dragging
   */
  handleMouseMove(e) {
    if (this.draggedElement) {
      this.draggedElement.style.left = (e.clientX - this.dragOffset.x) + 'px';
      this.draggedElement.style.top = (e.clientY - this.dragOffset.y) + 'px';
    }
  }

  /**
   * Handle mouse up for dragging
   */
  handleMouseUp(e) {
    if (this.draggedElement) {
      const cityCanvas = document.getElementById('cityCanvas');
      const canvasRect = cityCanvas.getBoundingClientRect();
      
      // Check if dropped on canvas
      if (e.clientX >= canvasRect.left && e.clientX <= canvasRect.right &&
          e.clientY >= canvasRect.top && e.clientY <= canvasRect.bottom) {
        
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;
        
        // Get object data from the dragged element
        const type = this.draggedElement.dataset.type;
        const color = this.draggedElement.dataset.color;
        
        this.createAndPlaceObject(type, color, x, y);
      }
      
      // Remove drag preview
      this.draggedElement.remove();
      this.draggedElement = null;
    }
  }

  /**
   * Create and place object in city
   */
  createAndPlaceObject(type, color, x, y) {
    const objectsLayer = document.getElementById('objectsLayer');
    const cityObject = this.createCityObject(type, color, x, y);
    
    objectsLayer.appendChild(cityObject);
    this.cityObjects.push({
      id: cityObject.id,
      type: type,
      color: color,
      x: x,
      y: y
    });
    
    this.saveCity();
  }

  /**
   * Create a city object element
   */
  createCityObject(type, color, x, y) {
    const object = document.createElement('div');
    object.className = `city-object ${type}`;
    object.id = `object-${this.objectCounter++}`;
    object.dataset.type = type;
    object.dataset.color = color;
    
    // Set position
    object.style.left = x + 'px';
    object.style.top = y + 'px';
    
    // Set color
    this.applyObjectColor(object, color);
    
    // Add event listeners
    object.addEventListener('click', (e) => this.selectObject(e, object));
    object.addEventListener('mousedown', (e) => this.startObjectDrag(e, object));
    
    // Add special click behaviors
    if (type === 'billboard') {
      object.addEventListener('click', (e) => this.animateBillboard(object));
    }
    
    return object;
  }

  /**
   * Apply color to object
   */
  applyObjectColor(object, color) {
    const type = object.dataset.type;
    
    switch (type) {
      case 'building':
        object.style.background = `linear-gradient(to top, ${color}, #0080FF)`;
        object.style.boxShadow = `0 0 20px ${color}`;
        break;
      case 'car':
        object.style.background = `linear-gradient(45deg, ${color}, #FFD700)`;
        object.style.boxShadow = `0 0 15px ${color}`;
        break;
      case 'streetlight':
        const lightElement = object.querySelector('::before') || object;
        object.style.setProperty('--light-color', color);
        break;
      case 'billboard':
        object.style.background = `linear-gradient(45deg, ${color}, #0080FF)`;
        object.style.boxShadow = `0 0 20px ${color}`;
        break;
      case 'star':
        object.style.background = color;
        object.style.boxShadow = `0 0 20px ${color}`;
        break;
      case 'planet':
        object.style.background = `radial-gradient(circle at 30% 30%, ${color}, #FF1744)`;
        object.style.boxShadow = `0 0 25px ${color}`;
        break;
    }
    
    object.dataset.color = color;
  }

  /**
   * Select object
   */
  selectObject(e, object) {
    e.stopPropagation();
    
    // Deselect previous object
    if (this.selectedObject) {
      this.selectedObject.classList.remove('selected');
    }
    
    // Select new object
    this.selectedObject = object;
    object.classList.add('selected');
    
    // Show object controls
    this.showObjectControls(e.clientX, e.clientY);
    
    // Update color picker
    const objectColorPicker = document.getElementById('objectColorPicker');
    objectColorPicker.value = object.dataset.color;
  }

  /**
   * Show object controls
   */
  showObjectControls(x, y) {
    const controls = document.getElementById('objectControls');
    controls.style.display = 'flex';
    controls.style.left = x + 'px';
    controls.style.top = (y - 60) + 'px';
  }

  /**
   * Hide object controls
   */
  hideObjectControls() {
    const controls = document.getElementById('objectControls');
    controls.style.display = 'none';
    
    if (this.selectedObject) {
      this.selectedObject.classList.remove('selected');
      this.selectedObject = null;
    }
  }

  /**
   * Handle canvas click (deselect objects)
   */
  handleCanvasClick(e) {
    if (e.target.id === 'cityCanvas' || e.target.classList.contains('background-layer')) {
      this.hideObjectControls();
    }
  }

  /**
   * Handle color change from main color picker
   */
  handleColorChange(e) {
    const color = e.target.value;
    // Update palette items with new color
    const paletteItems = document.querySelectorAll('.palette-item');
    paletteItems.forEach(item => {
      item.dataset.color = color;
    });
  }

  /**
   * Handle object color change
   */
  handleObjectColorChange(e) {
    if (this.selectedObject) {
      const color = e.target.value;
      this.applyObjectColor(this.selectedObject, color);
      
      // Update saved data
      const objectData = this.cityObjects.find(obj => obj.id === this.selectedObject.id);
      if (objectData) {
        objectData.color = color;
        this.saveCity();
      }
    }
  }

  /**
   * Delete selected object
   */
  deleteSelectedObject() {
    if (this.selectedObject) {
      const objectId = this.selectedObject.id;
      
      // Remove from DOM
      this.selectedObject.remove();
      
      // Remove from data
      this.cityObjects = this.cityObjects.filter(obj => obj.id !== objectId);
      
      // Hide controls
      this.hideObjectControls();
      
      this.saveCity();
    }
  }

  /**
   * Start object drag
   */
  startObjectDrag(e, object) {
    if (e.button !== 0) return; // Only left click
    
    e.stopPropagation();
    
    const rect = object.getBoundingClientRect();
    const canvasRect = document.getElementById('cityCanvas').getBoundingClientRect();
    
    this.draggedElement = object;
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    object.classList.add('dragging');
    
    // Convert to fixed positioning for dragging
    object.style.position = 'fixed';
    object.style.left = rect.left + 'px';
    object.style.top = rect.top + 'px';
    object.style.zIndex = '10000';
    
    e.preventDefault();
  }

  /**
   * Handle object drag end
   */
  endObjectDrag() {
    if (this.draggedElement && this.draggedElement.classList.contains('city-object')) {
      const object = this.draggedElement;
      const canvasRect = document.getElementById('cityCanvas').getBoundingClientRect();
      const objectRect = object.getBoundingClientRect();
      
      // Convert back to absolute positioning relative to canvas
      const x = objectRect.left - canvasRect.left;
      const y = objectRect.top - canvasRect.top;
      
      object.style.position = 'absolute';
      object.style.left = x + 'px';
      object.style.top = y + 'px';
      object.style.zIndex = '';
      object.classList.remove('dragging');
      
      // Update saved data
      const objectData = this.cityObjects.find(obj => obj.id === object.id);
      if (objectData) {
        objectData.x = x;
        objectData.y = y;
        this.saveCity();
      }
      
      this.draggedElement = null;
    }
  }

  /**
   * Animate billboard
   */
  animateBillboard(billboard) {
    billboard.style.animation = 'billboardFlash 1s ease-in-out';
    setTimeout(() => {
      billboard.style.animation = '';
    }, 1000);
  }

  /**
   * Update objects for current mode
   */
  updateObjectsForMode() {
    const streetlights = document.querySelectorAll('.streetlight');
    streetlights.forEach(light => {
      if (this.isDayMode) {
        light.style.opacity = '0.6';
      } else {
        light.style.opacity = '1';
      }
    });
  }

  /**
   * Generate traffic animation
   */
  generateTraffic() {
    const trafficLayer = document.querySelector('.traffic-layer');
    
    // Create multiple traffic cars
    for (let i = 0; i < 3; i++) {
      const car = document.createElement('div');
      car.className = 'traffic-car';
      car.style.bottom = (100 + i * 40) + 'px';
      car.style.animationDelay = `-${i * 5}s`;
      trafficLayer.appendChild(car);
    }
  }

  /**
   * Generate floating elements
   */
  generateFloatingElements() {
    const floatingLayer = document.querySelector('.floating-layer');
    
    // Create floating stars
    for (let i = 0; i < 5; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 80 + '%';
      star.style.top = Math.random() * 60 + '%';
      star.style.animationDelay = `-${Math.random() * 4}s`;
      floatingLayer.appendChild(star);
    }
  }

  /**
   * Clear all city objects
   */
  clearCity() {
    const objectsLayer = document.getElementById('objectsLayer');
    objectsLayer.innerHTML = '';
    this.cityObjects = [];
    this.hideObjectControls();
    this.saveCity();
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyDown(e) {
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        if (this.selectedObject) {
          this.deleteSelectedObject();
        }
        break;
      case 'Escape':
        this.hideObjectControls();
        break;
      case ' ':
        e.preventDefault();
        this.toggleDayNight();
        break;
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Adjust object positions if needed
    this.hideObjectControls();
  }

  /**
   * Save city to localStorage
   */
  saveCity() {
    const cityData = {
      objects: this.cityObjects,
      isDayMode: this.isDayMode
    };
    
    try {
      localStorage.setItem('futuristicCity', JSON.stringify(cityData));
    } catch (error) {
      console.error('Error saving city:', error);
    }
  }

  /**
   * Load saved city from localStorage
   */
  loadSavedCity() {
    try {
      const savedData = localStorage.getItem('futuristicCity');
      if (savedData) {
        const cityData = JSON.parse(savedData);
        
        // Restore mode
        if (cityData.isDayMode !== undefined) {
          this.isDayMode = !cityData.isDayMode; // Will be toggled
          this.toggleDayNight();
        }
        
        // Restore objects
        if (cityData.objects) {
          const objectsLayer = document.getElementById('objectsLayer');
          cityData.objects.forEach(objData => {
            const object = this.createCityObject(objData.type, objData.color, objData.x, objData.y);
            object.id = objData.id;
            objectsLayer.appendChild(object);
          });
          this.cityObjects = cityData.objects;
        }
      }
    } catch (error) {
      console.error('Error loading saved city:', error);
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new CityExplorer();
});

// Handle mouse up globally for drag operations
document.addEventListener('mouseup', (e) => {
  const cityExplorer = window.cityExplorer;
  if (cityExplorer && cityExplorer.draggedElement) {
    if (cityExplorer.draggedElement.classList.contains('city-object')) {
      cityExplorer.endObjectDrag();
    } else {
      cityExplorer.handleMouseUp(e);
    }
  }
});

// Export for global access
window.cityExplorer = null;
document.addEventListener('DOMContentLoaded', () => {
  window.cityExplorer = new CityExplorer();
});


