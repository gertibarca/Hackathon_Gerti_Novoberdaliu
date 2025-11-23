/**
 * Neon Metropolis Architect 3000 - Main JavaScript File
 * Advanced interactive city builder with drag-and-drop functionality
 */

class CityExplorer {
  constructor() {
    this.isDayMode = false;
    this.selectedObject = null;
    this.objectCounter = 0;
    this.cityObjects = [];
    this.draggedElement = null;
    this.dragOffset = { x: 0, y: 0 };
    this.history = [];
    this.historyIndex = -1;
    this.currentColor = '#00FFFF';
    
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
    
    // Initialize sliders
    this.initSliders();
    
    // Set up notification system
    this.notificationContainer = document.getElementById('notificationContainer');
    
    // Export for global access
    window.cityExplorer = this;
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
    colorPicker.addEventListener('change', (e) => {
      this.currentColor = e.target.value;
      this.updatePaletteColors();
    });

    // Object color picker
    const objectColorPicker = document.getElementById('objectColorPicker');
    objectColorPicker.addEventListener('change', (e) => this.handleObjectColorChange(e));

    // Action buttons
    document.getElementById('saveCity').addEventListener('click', () => this.saveCityToFile());
    document.getElementById('loadCity').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('exportCity').addEventListener('click', () => this.exportCityAsImage());
    document.getElementById('clearCity').addEventListener('click', () => this.clearCity());
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('redoBtn').addEventListener('click', () => this.redo());
    document.getElementById('fileInput').addEventListener('change', (e) => this.loadCityFromFile(e));

    // Object controls
    document.getElementById('deleteObject').addEventListener('click', () => this.deleteSelectedObject());
    document.getElementById('duplicateObject').addEventListener('click', () => this.duplicateSelectedObject());
    document.getElementById('bringForward').addEventListener('click', () => this.changeObjectZIndex(1));
    document.getElementById('sendBackward').addEventListener('click', () => this.changeObjectZIndex(-1));

    // Global mouse events for dragging
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Initialize control sliders
   */
  initSliders() {
    const sizeSlider = document.getElementById('sizeSlider');
    const rotationSlider = document.getElementById('rotationSlider');
    const opacitySlider = document.getElementById('opacitySlider');
    
    sizeSlider.addEventListener('input', (e) => {
      document.getElementById('sizeValue').textContent = `${e.target.value}%`;
      if (this.selectedObject) {
        this.selectedObject.style.transform = `scale(${e.target.value / 100}) rotate(${this.selectedObject.dataset.rotation || 0}deg)`;
        this.selectedObject.dataset.size = e.target.value;
        this.updateObjectInHistory(this.selectedObject);
      }
    });
    
    rotationSlider.addEventListener('input', (e) => {
      document.getElementById('rotationValue').textContent = `${e.target.value}°`;
      if (this.selectedObject) {
        this.selectedObject.style.transform = `scale(${(this.selectedObject.dataset.size || 100) / 100}) rotate(${e.target.value}deg)`;
        this.selectedObject.dataset.rotation = e.target.value;
        this.updateObjectInHistory(this.selectedObject);
      }
    });
    
    opacitySlider.addEventListener('input', (e) => {
      document.getElementById('opacityValue').textContent = `${e.target.value}%`;
      if (this.selectedObject) {
        this.selectedObject.style.opacity = e.target.value / 100;
        this.selectedObject.dataset.opacity = e.target.value;
        this.updateObjectInHistory(this.selectedObject);
      }
    });
  }

  /**
   * Update slider values when object is selected
   */
  updateSlidersForSelectedObject() {
    if (this.selectedObject) {
      document.getElementById('sizeSlider').value = this.selectedObject.dataset.size || 100;
      document.getElementById('sizeValue').textContent = `${this.selectedObject.dataset.size || 100}%`;
      
      document.getElementById('rotationSlider').value = this.selectedObject.dataset.rotation || 0;
      document.getElementById('rotationValue').textContent = `${this.selectedObject.dataset.rotation || 0}°`;
      
      document.getElementById('opacitySlider').value = this.selectedObject.dataset.opacity || 100;
      document.getElementById('opacityValue').textContent = `${this.selectedObject.dataset.opacity || 100}%`;
    }
  }

  /**
   * Update palette items with current color
   */
  updatePaletteColors() {
    const paletteItems = document.querySelectorAll('.palette-item');
    paletteItems.forEach(item => {
      item.dataset.color = this.currentColor;
      
      // Update preview colors
      const preview = item.querySelector('div');
      if (preview) {
        const type = item.dataset.type;
        switch (type) {
          case 'skyscraper':
          case 'arcology':
          case 'habitat':
          case 'hovercar':
          case 'monorail':
          case 'spaceship':
          case 'streetlight':
          case 'billboard':
          case 'bridge':
          case 'floatingpark':
          case 'biolumtree':
          case 'star':
          case 'planet':
          case 'satellite':
            preview.style.boxShadow = `0 0 10px ${this.currentColor}`;
            break;
        }
      }
    });
  }

  /**
   * Toggle between day and night mode
   */
  toggleDayNight() {
    this.isDayMode = !this.isDayMode;
    const body = document.body;
    const toggleBtn = document.getElementById('dayNightToggle');
    const toggleIcon = toggleBtn.querySelector('i');
    const toggleText = toggleBtn.querySelector('.toggle-text');

    if (this.isDayMode) {
      body.classList.remove('night-mode');
      body.classList.add('day-mode');
      toggleIcon.setAttribute('data-feather', 'sun');
      toggleText.textContent = 'Day Mode';
    } else {
      body.classList.remove('day-mode');
      body.classList.add('night-mode');
      toggleIcon.setAttribute('data-feather', 'moon');
      toggleText.textContent = 'Night Mode';
    }
    
    feather.replace();
    
    // Update object appearances based on mode
    this.updateObjectsForMode();
    this.saveCityToLocalStorage();
    this.showNotification('Mode Changed', `Switched to ${this.isDayMode ? 'Day' : 'Night'} Mode`, 'success');
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
    
    const objectData = {
      id: cityObject.id,
      type: type,
      color: color,
      x: x,
      y: y,
      size: 100,
      rotation: 0,
      opacity: 100,
      zIndex: 0
    };
    
    this.cityObjects.push(objectData);
    this.addToHistory('add', objectData);
    this.saveCityToLocalStorage();
    this.showNotification('Object Added', `Added new ${type} to your city`, 'success');
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
    object.dataset.size = '100';
    object.dataset.rotation = '0';
    object.dataset.opacity = '100';
    object.dataset.zIndex = '0';
    
    // Set position
    object.style.left = x + 'px';
    object.style.top = y + 'px';
    
    // Set initial transform
    object.style.transform = 'scale(1) rotate(0deg)';
    
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
      case 'skyscraper':
        object.style.background = `linear-gradient(to top, ${color}, #0080FF)`;
        object.style.boxShadow = `0 0 20px ${color}`;
        break;
      case 'arcology':
        object.style.background = `linear-gradient(to top, ${color}, #8000FF)`;
        object.style.boxShadow = `0 0 20px ${color}`;
        break;
      case 'habitat':
        object.style.background = `radial-gradient(circle at center, ${color}, #008800)`;
        object.style.boxShadow = `0 0 20px ${color}`;
        break;
      case 'hovercar':
        object.style.background = `linear-gradient(45deg, ${color}, #FFD700)`;
        object.style.boxShadow = `0 0 15px ${color}`;
        break;
      case 'monorail':
        object.style.background = `linear-gradient(45deg, ${color}, #FF9933)`;
        object.style.boxShadow = `0 0 15px ${color}`;
        break;
      case 'spaceship':
        object.style.background = `linear-gradient(45deg, ${color}, #CC66FF)`;
        object.style.boxShadow = `0 0 15px ${color}`;
        break;
      case 'streetlight':
        object.style.setProperty('--light-color', color);
        break;
      case 'billboard':
        object.style.background = `linear-gradient(45deg, ${color}, #0080FF)`;
        object.style.boxShadow = `0 0 20px ${color}`;
        break;
      case 'bridge':
        object.style.background = `linear-gradient(45deg, ${color}, #FFCC66)`;
        object.style.boxShadow = `0 0 20px ${color}`;
        break;
      case 'floatingpark':
        object.style.background = `linear-gradient(45deg, ${color}, #00CC66)`;
        object.style.boxShadow = `0 0 20px ${color}`;
        break;
      case 'biolumtree':
        object.style.setProperty('--accent-green', color);
        break;
      case 'star':
        object.style.background = color;
        object.style.boxShadow = `0 0 20px ${color}`;
        break;
      case 'planet':
        object.style.background = `radial-gradient(circle at 30% 30%, ${color}, #FF1744)`;
        object.style.boxShadow = `0 0 25px ${color}`;
        break;
      case 'satellite':
        object.style.background = `linear-gradient(45deg, ${color}, #999999)`;
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
    
    // Update sliders
    this.updateSlidersForSelectedObject();
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
        this.updateObjectInHistory(this.selectedObject);
        this.saveCityToLocalStorage();
      }
    }
  }

  /**
   * Delete selected object
   */
  deleteSelectedObject() {
    if (this.selectedObject) {
      const objectId = this.selectedObject.id;
      const objectType = this.selectedObject.dataset.type;
      
      // Remove from DOM
      this.selectedObject.remove();
      
      // Remove from data
      this.cityObjects = this.cityObjects.filter(obj => obj.id !== objectId);
      
      // Add to history
      this.addToHistory('delete', {
        id: objectId,
        type: objectType
      });
      
      // Hide controls
      this.hideObjectControls();
      
      this.saveCityToLocalStorage();
      this.showNotification('Object Deleted', `${objectType} removed from city`, 'warning');
    }
  }

  /**
   * Duplicate selected object
   */
  duplicateSelectedObject() {
    if (this.selectedObject) {
      const rect = this.selectedObject.getBoundingClientRect();
      const canvasRect = document.getElementById('cityCanvas').getBoundingClientRect();
      const x = rect.left - canvasRect.left + 20;
      const y = rect.top - canvasRect.top + 20;
      
      this.createAndPlaceObject(
        this.selectedObject.dataset.type,
        this.selectedObject.dataset.color,
        x,
        y
      );
    }
  }

  /**
   * Change object z-index (bring forward/send backward)
   */
  changeObjectZIndex(direction) {
    if (this.selectedObject) {
      const currentZIndex = parseInt(this.selectedObject.style.zIndex || '0');
      const newZIndex = currentZIndex + direction;
      
      this.selectedObject.style.zIndex = newZIndex;
      this.selectedObject.dataset.zIndex = newZIndex;
      
      // Update in city objects array
      const objectData = this.cityObjects.find(obj => obj.id === this.selectedObject.id);
      if (objectData) {
        objectData.zIndex = newZIndex;
        this.updateObjectInHistory(this.selectedObject);
        this.saveCityToLocalStorage();
      }
      
      this.showNotification(
        'Layer Changed', 
        `Object moved ${direction > 0 ? 'forward' : 'backward'}`,
        'success'
      );
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
      object.style.zIndex = object.dataset.zIndex || '0';
      object.classList.remove('dragging');
      
      // Update saved data
      const objectData = this.cityObjects.find(obj => obj.id === object.id);
      if (objectData) {
        objectData.x = x;
        objectData.y = y;
        this.updateObjectInHistory(object);
        this.saveCityToLocalStorage();
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
    for (let i = 0; i < 10; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 80 + 10 + '%';
      star.style.top = Math.random() * 60 + 10 + '%';
      star.style.animationDelay = `-${Math.random() * 4}s`;
      floatingLayer.appendChild(star);
    }
    
    // Create floating planets
    for (let i = 0; i < 3; i++) {
      const planet = document.createElement('div');
      planet.className = 'planet';
      planet.style.left = Math.random() * 70 + 15 + '%';
      planet.style.top = Math.random() * 50 + 15 + '%';
      planet.style.animationDelay = `-${Math.random() * 8}s`;
      floatingLayer.appendChild(planet);
    }
  }

  /**
   * Clear all city objects
   */
  clearCity() {
    if (confirm('Are you sure you want to clear the entire city? This cannot be undone.')) {
      const objectsLayer = document.getElementById('objectsLayer');
      objectsLayer.innerHTML = '';
      
      // Add to history before clearing
      this.addToHistory('clear', [...this.cityObjects]);
      
      this.cityObjects = [];
      this.hideObjectControls();
      this.saveCityToLocalStorage();
      this.showNotification('City Cleared', 'All objects have been removed', 'warning');
    }
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
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.undo();
        }
        break;
      case 'y':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.redo();
        }
        break;
      case 'd':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.duplicateSelectedObject();
        }
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
  saveCityToLocalStorage() {
    const cityData = {
      objects: this.cityObjects,
      isDayMode: this.isDayMode,
      currentColor: this.currentColor,
      objectCounter: this.objectCounter
    };
    
    try {
      localStorage.setItem('neonMetropolis', JSON.stringify(cityData));
    } catch (error) {
      console.error('Error saving city:', error);
      this.showNotification('Save Error', 'Could not save city to browser storage', 'error');
    }
  }

  /**
   * Load saved city from localStorage
   */
  loadSavedCity() {
    try {
      const savedData = localStorage.getItem('neonMetropolis');
      if (savedData) {
        const cityData = JSON.parse(savedData);
        
        // Restore mode
        if (cityData.isDayMode !== undefined) {
          this.isDayMode = !cityData.isDayMode; // Will be toggled
          this.toggleDayNight();
        }
        
        // Restore current color
        if (cityData.currentColor) {
          this.currentColor = cityData.currentColor;
          document.getElementById('colorPicker').value = this.currentColor;
          this.updatePaletteColors();
        }
        
        // Restore object counter
        if (cityData.objectCounter) {
          this.objectCounter = cityData.objectCounter;
        }
        
        // Restore objects
        if (cityData.objects) {
          const objectsLayer = document.getElementById('objectsLayer');
          cityData.objects.forEach(objData => {
            const object = this.createCityObject(objData.type, objData.color, objData.x, objData.y);
            object.id = objData.id;
            
            // Apply saved properties
            object.dataset.size = objData.size || 100;
            object.style.transform = `scale(${(objData.size || 100) / 100}) rotate(${objData.rotation || 0}deg)`;
            
            object.dataset.rotation = objData.rotation || 0;
            object.dataset.opacity = objData.opacity || 100;
            object.style.opacity = (objData.opacity || 100) / 100;
            
            object.dataset.zIndex = objData.zIndex || 0;
            object.style.zIndex = objData.zIndex || 0;
            
            objectsLayer.appendChild(object);
          });
          this.cityObjects = cityData.objects;
        }
        
        this.showNotification('City Loaded', 'Successfully loaded your saved city', 'success');
      }
    } catch (error) {
      console.error('Error loading saved city:', error);
      this.showNotification('Load Error', 'Could not load city from browser storage', 'error');
    }
  }

  /**
   * Save city to file
   */
  saveCityToFile() {
    const cityData = {
      objects: this.cityObjects,
      isDayMode: this.isDayMode,
      currentColor: this.currentColor,
      objectCounter: this.objectCounter
    };
    
    const dataStr = JSON.stringify(cityData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportName = `neon-metropolis-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
    
    this.showNotification('City Saved', 'Your city has been saved to a file', 'success');
  }

  /**
   * Load city from file
   */
  loadCityFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const cityData = JSON.parse(e.target.result);
        
        // Clear current city
        const objectsLayer = document.getElementById('objectsLayer');
        objectsLayer.innerHTML = '';
        this.cityObjects = [];
        this.hideObjectControls();
        
        // Add to history before loading
        this.addToHistory('load', cityData);
        
        // Restore mode
        if (cityData.isDayMode !== undefined) {
          this.isDayMode = !cityData.isDayMode; // Will be toggled
          this.toggleDayNight();
        }
        
        // Restore current color
        if (cityData.currentColor) {
          this.currentColor = cityData.currentColor;
          document.getElementById('colorPicker').value = this.currentColor;
          this.updatePaletteColors();
        }
        
        // Restore object counter
        if (cityData.objectCounter) {
          this.objectCounter = cityData.objectCounter;
        }
        
        // Restore objects
        if (cityData.objects) {
          cityData.objects.forEach(objData => {
            const object = this.createCityObject(objData.type, objData.color, objData.x, objData.y);
            object.id = objData.id;
            
            // Apply saved properties
            object.dataset.size = objData.size || 100;
            object.style.transform = `scale(${(objData.size || 100) / 100}) rotate(${objData.rotation || 0}deg)`;
            
            object.dataset.rotation = objData.rotation || 0;
            object.dataset.opacity = objData.opacity || 100;
            object.style.opacity = (objData.opacity || 100) / 100;
            
            object.dataset.zIndex = objData.zIndex || 0;
            object.style.zIndex = objData.zIndex || 0;
            
            objectsLayer.appendChild(object);
            this.cityObjects.push(objData);
          });
        }
        
        this.showNotification('City Loaded', 'Successfully loaded city from file', 'success');
      } catch (error) {
        console.error('Error loading city file:', error);
        this.showNotification('Load Error', 'Could not load city from file', 'error');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }

  /**
   * Export city as image
   */
  exportCityAsImage() {
    const cityCanvas = document.getElementById('cityCanvas');
    
    html2canvas(cityCanvas, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      allowTaint: true,
      useCORS: true
    }).then(canvas => {
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `neon-metropolis-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = image;
      link.click();
      
      this.showNotification('Image Exported', 'Your city has been exported as an image', 'success');
    }).catch(error => {
      console.error('Error exporting image:', error);
      this.showNotification('Export Error', 'Could not export city as image', 'error');
    });
  }

  /**
   * Show notification
   */
  showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <h4>${title}</h4>
      <p>${message}</p>
    `;
    
    this.notificationContainer.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Hide after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }

  /**
   * History management
   */
  addToHistory(action, data) {
    // If we're not at the end of history, truncate future history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    this.history.push({ action, data });
    this.historyIndex = this.history.length - 1;
    
    this.updateHistoryButtons();
  }

  updateObjectInHistory(object) {
    if (this.historyIndex >= 0) {
      const objectData = this.cityObjects.find(obj => obj.id === object.id);
      if (objectData) {
        // Find the last history item for this object and update it
        for (let i = this.history.length - 1; i >= 0; i--) {
          const item = this.history[i];
          if (item.action === 'modify' && item.data.id === object.id) {
            item.data = { ...objectData };
            break;
          }
        }
      }
    }
  }

  updateHistoryButtons() {
    document.getElementById('undoBtn').disabled = this.historyIndex < 0;
    document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
  }

  undo() {
    if (this.historyIndex >= 0) {
      const historyItem = this.history[this.historyIndex];
      this.historyIndex--;
      
      switch (historyItem.action) {
        case 'add':
          // Remove the added object
          const addedObject = document.getElementById(historyItem.data.id);
          if (addedObject) {
            addedObject.remove();
          }
          this.cityObjects = this.cityObjects.filter(obj => obj.id !== historyItem.data.id);
          break;
          
        case 'delete':
          // Restore the deleted object
          const deletedObject = this.createCityObject(
            historyItem.data.type,
            historyItem.data.color,
            historyItem.data.x,
            historyItem.data.y
          );
          deletedObject.id = historyItem.data.id;
          
          // Restore properties
          deletedObject.dataset.size = historyItem.data.size || 100;
          deletedObject.style.transform = `scale(${(historyItem.data.size || 100) / 100}) rotate(${historyItem.data.rotation || 0}deg)`;
          
          deletedObject.dataset.rotation = historyItem.data.rotation || 0;
          deletedObject.dataset.opacity = historyItem.data.opacity || 100;
          deletedObject.style.opacity = (historyItem.data.opacity || 100) / 100;
          
          deletedObject.dataset.zIndex = historyItem.data.zIndex || 0;
          deletedObject.style.zIndex = historyItem.data.zIndex || 0;
          
          document.getElementById('objectsLayer').appendChild(deletedObject);
          this.cityObjects.push(historyItem.data);
          break;
          
        case 'modify':
          // Restore previous state of modified object
          const modifiedObject = document.getElementById(historyItem.data.id);
          if (modifiedObject) {
            modifiedObject.style.left = historyItem.data.x + 'px';
            modifiedObject.style.top = historyItem.data.y + 'px';
            modifiedObject.dataset.color = historyItem.data.color;
            modifiedObject.dataset.size = historyItem.data.size || 100;
            modifiedObject.style.transform = `scale(${(historyItem.data.size || 100) / 100}) rotate(${historyItem.data.rotation || 0}deg)`;
            modifiedObject.dataset.rotation = historyItem.data.rotation || 0;
            modifiedObject.dataset.opacity = historyItem.data.opacity || 100;
            modifiedObject.style.opacity = (historyItem.data.opacity || 100) / 100;
            modifiedObject.dataset.zIndex = historyItem.data.zIndex || 0;
            modifiedObject.style.zIndex = historyItem.data.zIndex || 0;
            
            this.applyObjectColor(modifiedObject, historyItem.data.color);
            
            // Update in city objects array
            const objectData = this.cityObjects.find(obj => obj.id === historyItem.data.id);
            if (objectData) {
              Object.assign(objectData, historyItem.data);
            }
          }
          break;
          
        case 'clear':
          // Restore all cleared objects
          const objectsLayer = document.getElementById('objectsLayer');
          objectsLayer.innerHTML = '';
          
          historyItem.data.forEach(objData => {
            const object = this.createCityObject(objData.type, objData.color, objData.x, objData.y);
            object.id = objData.id;
            
            // Apply saved properties
            object.dataset.size = objData.size || 100;
            object.style.transform = `scale(${(objData.size || 100) / 100}) rotate(${objData.rotation || 0}deg)`;
            
            object.dataset.rotation = objData.rotation || 0;
            object.dataset.opacity = objData.opacity || 100;
            object.style.opacity = (objData.opacity || 100) / 100;
            
            object.dataset.zIndex = objData.zIndex || 0;
            object.style.zIndex = objData.zIndex || 0;
            
            objectsLayer.appendChild(object);
          });
          
          this.cityObjects = [...historyItem.data];
          break;
          
        case 'load':
          // Revert to previous state before load
          const prevObjectsLayer = document.getElementById('objectsLayer');
          prevObjectsLayer.innerHTML = '';
          this.cityObjects = [];
          
          if (historyItem.data.isDayMode !== undefined) {
            this.isDayMode = !historyItem.data.isDayMode; // Will be toggled
            this.toggleDayNight();
          }
          
          if (historyItem.data.currentColor) {
            this.currentColor = historyItem.data.currentColor;
            document.getElementById('colorPicker').value = this.currentColor;
            this.updatePaletteColors();
          }
          
          if (historyItem.data.objectCounter) {
            this.objectCounter = historyItem.data.objectCounter;
          }
          
          if (historyItem.data.objects) {
            historyItem.data.objects.forEach(objData => {
              const object = this.createCityObject(objData.type, objData.color, objData.x, objData.y);
              object.id = objData.id;
              
              // Apply saved properties
              object.dataset.size = objData.size || 100;
              object.style.transform = `scale(${(objData.size || 100) / 100}) rotate(${objData.rotation || 0}deg)`;
              
              object.dataset.rotation = objData.rotation || 0;
              object.dataset.opacity = objData.opacity || 100;
              object.style.opacity = (objData.opacity || 100) / 100;
              
              object.dataset.zIndex = objData.zIndex || 0;
              object.style.zIndex = objData.zIndex || 0;
              
              prevObjectsLayer.appendChild(object);
              this.cityObjects.push(objData);
            });
          }
          break;
      }
      
      this.saveCityToLocalStorage();
      this.updateHistoryButtons();
      this.showNotification('Undo', 'Undo successful', 'success');
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const historyItem = this.history[this.historyIndex];
      
      switch (historyItem.action) {
        case 'add':
          // Add the object again
          const object = this.createCityObject(
            historyItem.data.type,
            historyItem.data.color,
            historyItem.data.x,
            historyItem.data.y
          );
          object.id = historyItem.data.id;
          
          // Apply properties
          object.dataset.size = historyItem.data.size || 100;
          object.style.transform = `scale(${(historyItem.data.size || 100) / 100}) rotate(${historyItem.data.rotation || 0}deg)`;
          
          object.dataset.rotation = historyItem.data.rotation || 0;
          object.dataset.opacity = historyItem.data.opacity || 100;
          object.style.opacity = (historyItem.data.opacity || 100) / 100;
          
          object.dataset.zIndex = historyItem.data.zIndex || 0;
          object.style.zIndex = historyItem.data.zIndex || 0;
          
          document.getElementById('objectsLayer').appendChild(object);
          this.cityObjects.push(historyItem.data);
          break;
          
        case 'delete':
          // Delete the object again
          const deletedObject = document.getElementById(historyItem.data.id);
          if (deletedObject) {
            deletedObject.remove();
          }
          this.cityObjects = this.cityObjects.filter(obj => obj.id !== historyItem.data.id);
          break;
          
        case 'modify':
          // Apply the modification again
          const modifiedObject = document.getElementById(historyItem.data.id);
          if (modifiedObject) {
            modifiedObject.style.left = historyItem.data.x + 'px';
            modifiedObject.style.top = historyItem.data.y + 'px';
            modifiedObject.dataset.color = historyItem.data.color;
            modifiedObject.dataset.size = historyItem.data.size || 100;
            modifiedObject.style.transform = `scale(${(historyItem.data.size || 100) / 100}) rotate(${historyItem.data.rotation || 0}deg)`;
            modifiedObject.dataset.rotation = historyItem.data.rotation || 0;
            modifiedObject.dataset.opacity = historyItem.data.opacity || 100;
            modifiedObject.style.opacity = (historyItem.data.opacity || 100) / 100;
            modifiedObject.dataset.zIndex = historyItem.data.zIndex || 0;
            modifiedObject.style.zIndex = historyItem.data.zIndex || 0;
            
            this.applyObjectColor(modifiedObject, historyItem.data.color);
            
            // Update in city objects array
            const objectData = this.cityObjects.find(obj => obj.id === historyItem.data.id);
            if (objectData) {
              Object.assign(objectData, historyItem.data);
            }
          }
          break;
          
        case 'clear':
          // Clear again
          const objectsLayer = document.getElementById('objectsLayer');
          objectsLayer.innerHTML = '';
          this.cityObjects = [];
          break;
          
        case 'load':
          // Load again
          const prevObjectsLayer = document.getElementById('objectsLayer');
          prevObjectsLayer.innerHTML = '';
          this.cityObjects = [];
          
          if (historyItem.data.isDayMode !== undefined) {
            this.isDayMode = !historyItem.data.isDayMode; // Will be toggled
            this.toggleDayNight();
          }
          
          if (historyItem.data.currentColor) {
            this.currentColor = historyItem.data.currentColor;
            document.getElementById('colorPicker').value = this.currentColor;
            this.updatePaletteColors();
          }
          
          if (historyItem.data.objectCounter) {
            this.objectCounter = historyItem.data.objectCounter;
          }
          
          if (historyItem.data.objects) {
            historyItem.data.objects.forEach(objData => {
              const object = this.createCityObject(objData.type, objData.color, objData.x, objData.y);
              object.id = objData.id;
              
              // Apply saved properties
              object.dataset.size = objData.size || 100;
              object.style.transform = `scale(${(objData.size || 100) / 100}) rotate(${objData.rotation || 0}deg)`;
              
              object.dataset.rotation = objData.rotation || 0;
              object.dataset.opacity = objData.opacity || 100;
              object.style.opacity = (objData.opacity || 100) / 100;
              
              object.dataset.zIndex = objData.zIndex || 0;
              object.style.zIndex = objData.zIndex || 0;
              
              prevObjectsLayer.appendChild(object);
              this.cityObjects.push(objData);
            });
          }
          break;
      }
      
      this.saveCityToLocalStorage();
      this.updateHistoryButtons();
      this.showNotification('Redo', 'Redo successful', 'success');
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

// Include html2canvas for image export
document.head.insertAdjacentHTML('beforeend', 
  '<script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>'
);