// Advanced Futuristic City Builder with Physics and Effects

class CityBuilder {
  constructor() {
    this.canvas = document.getElementById("cityCanvas")
    this.objectsLayer = document.getElementById("objectsLayer")
    this.effectsLayer = document.getElementById("effectsLayer")
    this.gridOverlay = document.getElementById("gridOverlay")
    this.floatingLayer = document.getElementById("floatingLayer")
    this.trafficLayer = document.getElementById("trafficLayer")

    this.objects = []
    this.selectedObject = null
    this.history = []
    this.historyIndex = 0
    this.zoom = 1
    this.panX = 0
    this.panY = 0
    this.nextId = 0

    // Settings
    this.settings = {
      physicsEnabled: true,
      particlesEnabled: true,
      gridSnap: false,
      showFPS: false,
    }

    this.draggedItem = null
    this.isDrawing = false
    this.lastFrameTime = Date.now()
    this.frameCount = 0
    this.fps = 60

    this.init()
  }

  init() {
    this.setupEventListeners()
    this.loadSettings()
    this.createInitialAI()
    this.startAnimationLoop()
    this.loadCity()
  }

  setupEventListeners() {
    // Palette drag
    document.querySelectorAll(".palette-item").forEach((item) => {
      item.addEventListener("dragstart", (e) => this.handleDragStart(e))
    })

    // Canvas drop
    this.canvas.addEventListener("dragover", (e) => e.preventDefault())
    this.canvas.addEventListener("drop", (e) => this.handleDrop(e))

    // Canvas interactions
    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e))
    this.canvas.addEventListener("contextmenu", (e) => this.handleRightClick(e))
    this.canvas.addEventListener("wheel", (e) => this.handleZoom(e), { passive: false })
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e))
    this.canvas.addEventListener("mouseleave", () => this.updateSelectedInfo())

    // Zoom controls
    document.getElementById("zoomInBtn").addEventListener("click", () => this.changeZoom(1.1))
    document.getElementById("zoomResetBtn").addEventListener("click", () => this.resetZoom())
    document.getElementById("zoomOutBtn").addEventListener("click", () => this.changeZoom(0.9))

    // Object controls
    document.getElementById("deleteObject").addEventListener("click", () => this.deleteSelected())
    document.getElementById("duplicateObject").addEventListener("click", () => this.duplicateSelected())
    document.getElementById("objectColorPicker").addEventListener("change", (e) => {
      if (this.selectedObject) {
        this.selectedObject.color = e.target.value
        this.updateObjectElement(this.selectedObject)
        this.saveToHistory()
      }
    })

    // Settings
    document.getElementById("dayNightToggle").addEventListener("click", () => this.toggleDayNight())
    document.getElementById("settingsToggle").addEventListener("click", () => this.toggleSettings())
    document.getElementById("physicsToggle").addEventListener("change", (e) => {
      this.settings.physicsEnabled = e.target.checked
      this.saveSettings()
    })
    document.getElementById("particlesToggle").addEventListener("change", (e) => {
      this.settings.particlesEnabled = e.target.checked
      this.saveSettings()
    })
    document.getElementById("gridSnapToggle").addEventListener("change", (e) => {
      this.settings.gridSnap = e.target.checked
      this.gridOverlay.classList.toggle("active", e.target.checked)
      this.saveSettings()
    })
    document.getElementById("fpsToggle").addEventListener("change", (e) => {
      this.settings.showFPS = e.target.checked
      document.getElementById("fpsCount").style.display = e.target.checked ? "block" : "none"
      this.saveSettings()
    })

    // Color picker
    document.getElementById("colorPicker").addEventListener("change", (e) => {
      if (this.selectedObject) {
        this.selectedObject.color = e.target.value
        this.updateObjectElement(this.selectedObject)
        this.saveToHistory()
      }
    })

    document.getElementById("sizePicker").addEventListener("input", (e) => {
      const size = Number.parseInt(e.target.value)
      document.getElementById("sizeValue").textContent = size + "px"
      if (this.selectedObject) {
        this.selectedObject.size = size
        this.updateObjectElement(this.selectedObject)
        this.saveToHistory()
      }
    })

    // Action buttons
    document.getElementById("clearCity").addEventListener("click", () => this.clearCity())
    document.getElementById("undoAction").addEventListener("click", () => this.undo())
    document.getElementById("redoAction").addEventListener("click", () => this.redo())
    document.getElementById("saveCity").addEventListener("click", () => this.saveCity())
    document.getElementById("loadCity").addEventListener("click", () => this.loadCity())

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleKeyboard(e))
  }

  handleDragStart(e) {
    this.draggedItem = {
      type: e.target.closest(".palette-item").dataset.type,
      color: e.target.closest(".palette-item").dataset.color,
      size: Number.parseInt(document.getElementById("sizePicker").value),
    }
    e.dataTransfer.effectAllowed = "copy"
  }

  handleDrop(e) {
    e.preventDefault()
    if (!this.draggedItem) return

    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    this.createObject(this.draggedItem.type, x, y, this.draggedItem.color, this.draggedItem.size)
    this.saveToHistory()
    this.draggedItem = null
  }

  createObject(type, x, y, color, size) {
    // Snap to grid if enabled
    if (this.settings.gridSnap) {
      x = Math.round(x / 40) * 40
      y = Math.round(y / 40) * 40
    }

    const obj = {
      id: this.nextId++,
      type,
      x,
      y,
      color: color || "#00FFFF",
      size: size || 60,
      vx: 0,
      vy: 0,
      rotation: Math.random() * 360,
      life: 100,
    }

    this.objects.push(obj)
    this.renderObject(obj)
    this.createSpawnEffect(x, y, color)
    this.updateObjectCount()
  }

  renderObject(obj) {
    const el = document.createElement("div")
    el.className = `city-object ${obj.type}`
    el.id = `obj-${obj.id}`
    el.style.cssText = `
      position: absolute;
      left: ${obj.x}px;
      top: ${obj.y}px;
      width: ${obj.size}px;
      height: ${obj.size}px;
      cursor: pointer;
      user-select: none;
      transform: rotate(${obj.rotation}deg) scale(1);
      transition: all 0.2s ease;
      z-index: ${Math.floor(obj.y)};
    `
    el.addEventListener("click", () => this.selectObject(obj))

    // Create visual based on type
    switch (obj.type) {
      case "building":
        el.style.background = `linear-gradient(135deg, ${obj.color} 0%, ${this.darkenColor(obj.color, 30)} 100%)`
        el.style.boxShadow = `0 0 20px ${obj.color}, inset 0 0 10px rgba(255,255,255,0.2)`
        el.style.borderRadius = "2px"
        break
      case "car":
        el.style.background = `linear-gradient(90deg, ${obj.color} 0%, ${this.darkenColor(obj.color, 20)} 100%)`
        el.style.boxShadow = `0 0 15px ${obj.color}`
        el.style.borderRadius = "4px"
        el.style.border = `2px solid ${obj.color}`
        break
      case "streetlight":
        el.style.background = `linear-gradient(180deg, ${obj.color} 0%, #333 100%)`
        el.style.boxShadow = `0 0 25px ${obj.color}`
        el.style.borderRadius = "2px"
        break
      case "billboard":
        el.style.background = `linear-gradient(90deg, ${obj.color} 0%, ${this.darkenColor(obj.color, 40)} 50%, ${obj.color} 100%)`
        el.style.boxShadow = `0 0 30px ${obj.color}, inset 0 0 15px rgba(255,255,255,0.3)`
        el.style.border = `3px solid ${obj.color}`
        el.style.borderRadius = "2px"
        break
      case "star":
        el.style.background = obj.color
        el.style.clipPath =
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
        el.style.boxShadow = `0 0 20px ${obj.color}`
        el.style.animation = "float 3s ease-in-out infinite"
        break
      case "planet":
        el.style.background = `radial-gradient(circle at 35% 35%, ${obj.color}, ${this.darkenColor(obj.color, 40)})`
        el.style.boxShadow = `0 0 25px ${obj.color}`
        el.style.borderRadius = "50%"
        el.style.animation = "rotate 20s linear infinite"
        break
      case "sphere":
        el.style.background = `radial-gradient(circle at 40% 40%, ${obj.color}, ${this.darkenColor(obj.color, 50)})`
        el.style.boxShadow = `0 0 20px ${obj.color}`
        el.style.borderRadius = "50%"
        el.style.animation = "pulse-scale 2s ease-in-out infinite"
        break
      case "tower":
        el.style.background = `linear-gradient(180deg, ${obj.color} 0%, ${this.darkenColor(obj.color, 30)} 100%)`
        el.style.boxShadow = `0 0 30px ${obj.color}`
        el.style.borderRadius = "50%"
        el.style.border = `2px solid ${obj.color}`
        break
    }

    this.objectsLayer.appendChild(el)
  }

  updateObjectElement(obj) {
    const el = document.getElementById(`obj-${obj.id}`)
    if (!el) return

    el.style.left = obj.x + "px"
    el.style.top = obj.y + "px"
    el.style.width = obj.size + "px"
    el.style.height = obj.size + "px"
    el.style.transform = `rotate(${obj.rotation}deg) scale(${this.selectedObject?.id === obj.id ? 1.1 : 1})`
    el.style.zIndex = Math.floor(obj.y)

    if (this.selectedObject?.id === obj.id) {
      el.style.filter = "drop-shadow(0 0 15px rgba(0, 255, 136, 0.8))"
    } else {
      el.style.filter = "none"
    }
  }

  selectObject(obj, noHistory = false) {
    if (this.selectedObject?.id === obj.id) return

    this.selectedObject = obj
    this.objects.forEach((o) => this.updateObjectElement(o))

    const controls = document.getElementById("objectControls")
    controls.style.display = "block"
    document.getElementById("controlInfo").textContent = `${obj.type.toUpperCase()} #${obj.id}`
    document.getElementById("objectColorPicker").value = obj.color
    document.getElementById("sizePicker").value = obj.size
    document.getElementById("sizeValue").textContent = obj.size + "px"
    document.getElementById("colorPicker").value = obj.color
  }

  handleCanvasClick(e) {
    if (
      e.target === this.canvas ||
      e.target.classList.contains("background-layer") ||
      e.target.classList.contains("grid-overlay") ||
      e.target.classList.contains("traffic-layer")
    ) {
      this.selectedObject = null
      document.getElementById("objectControls").style.display = "none"
      this.objects.forEach((o) => this.updateObjectElement(o))
    }
  }

  handleRightClick(e) {
    e.preventDefault()
    const cityObj = e.target.closest(".city-object")
    if (cityObj && this.selectedObject) {
      this.selectedObject.rotation = (this.selectedObject.rotation + 45) % 360
      this.updateObjectElement(this.selectedObject)
      this.saveToHistory()
    }
  }

  handleZoom(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    this.changeZoom(delta)
  }

  changeZoom(factor) {
    this.zoom = Math.max(0.5, Math.min(3, this.zoom * factor))
    this.objectsLayer.style.transform = `scale(${this.zoom})`
    this.trafficLayer.style.transform = `scale(${this.zoom})`
  }

  resetZoom() {
    this.zoom = 1
    this.objectsLayer.style.transform = "scale(1)"
    this.trafficLayer.style.transform = "scale(1)"
  }

  handleMouseMove(e) {
    if (this.selectedObject) {
      const rect = this.canvas.getBoundingClientRect()
      const cityObj = document.getElementById(`obj-${this.selectedObject.id}`)
      if (cityObj && e.buttons === 0) {
        const offsetX = (e.clientX - rect.left - this.selectedObject.size / 2) / this.zoom
        const offsetY = (e.clientY - rect.top - this.selectedObject.size / 2) / this.zoom
      }
    }
    this.updateSelectedInfo()
  }

  updateSelectedInfo() {
    if (this.selectedObject) {
      const info = `${this.selectedObject.type.toUpperCase()} #${this.selectedObject.id} | Pos: (${Math.round(this.selectedObject.x)}, ${Math.round(this.selectedObject.y)})`
      document.getElementById("controlInfo").textContent = info
    }
  }

  deleteSelected() {
    if (!this.selectedObject) return
    this.objects = this.objects.filter((o) => o.id !== this.selectedObject.id)
    const el = document.getElementById(`obj-${this.selectedObject.id}`)
    if (el) el.remove()
    this.selectedObject = null
    document.getElementById("objectControls").style.display = "none"
    this.saveToHistory()
    this.updateObjectCount()
  }

  duplicateSelected() {
    if (!this.selectedObject) return
    const offset = 50
    this.createObject(
      this.selectedObject.type,
      this.selectedObject.x + offset,
      this.selectedObject.y + offset,
      this.selectedObject.color,
      this.selectedObject.size,
    )
    this.saveToHistory()
    this.updateObjectCount()
  }

  handleKeyboard(e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "z") {
        e.preventDefault()
        this.undo()
      } else if (e.key === "y") {
        e.preventDefault()
        this.redo()
      } else if (e.key === "d") {
        e.preventDefault()
        this.duplicateSelected()
      }
    } else if (e.key === "Delete" || e.key === "Backspace") {
      this.deleteSelected()
    }
  }

  saveToHistory() {
    this.history = this.history.slice(0, this.historyIndex + 1)
    this.history.push(JSON.stringify(this.objects))
    this.historyIndex++
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--
      this.restoreFromHistory()
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++
      this.restoreFromHistory()
    }
  }

  restoreFromHistory() {
    const state = JSON.parse(this.history[this.historyIndex])
    this.objects = state
    this.objectsLayer.innerHTML = ""
    this.objects.forEach((obj) => this.renderObject(obj))
    this.selectedObject = null
    document.getElementById("objectControls").style.display = "none"
    this.updateObjectCount()
  }

  clearCity() {
    if (confirm("Clear all objects? This action cannot be undone immediately.")) {
      this.objects = []
      this.objectsLayer.innerHTML = ""
      this.selectedObject = null
      document.getElementById("objectControls").style.display = "none"
      this.saveToHistory()
      this.updateObjectCount()
    }
  }

  saveCity() {
    const data = {
      objects: this.objects,
      timestamp: Date.now(),
    }
    localStorage.setItem("cityBuilderState", JSON.stringify(data))
    alert("City saved successfully!")
  }

  loadCity() {
    const saved = localStorage.getItem("cityBuilderState")
    if (saved) {
      const data = JSON.parse(saved)
      this.objects = data.objects
      this.nextId = Math.max(...this.objects.map((o) => o.id), 0) + 1
      this.objectsLayer.innerHTML = ""
      this.objects.forEach((obj) => this.renderObject(obj))
      this.saveToHistory()
      this.updateObjectCount()
    }
  }

  updateObjectCount() {
    document.getElementById("objectCount").textContent = this.objects.length
  }

  toggleDayNight() {
    document.body.classList.toggle("day-mode")
    localStorage.setItem("cityBuilderMode", document.body.classList.contains("day-mode") ? "day" : "night")
  }

  toggleSettings() {
    const panel = document.getElementById("settingsPanel")
    panel.style.display = panel.style.display === "none" ? "block" : "none"
  }

  loadSettings() {
    const mode = localStorage.getItem("cityBuilderMode")
    if (mode === "day") document.body.classList.add("day-mode")

    document.getElementById("physicsToggle").checked = this.settings.physicsEnabled
    document.getElementById("particlesToggle").checked = this.settings.particlesEnabled
    document.getElementById("gridSnapToggle").checked = this.settings.gridSnap
    document.getElementById("fpsToggle").checked = this.settings.showFPS
  }

  saveSettings() {
    localStorage.setItem("cityBuilderSettings", JSON.stringify(this.settings))
  }

  createSpawnEffect(x, y, color) {
    if (!this.settings.particlesEnabled) return

    for (let i = 0; i < 8; i++) {
      const particle = document.createElement("div")
      particle.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 8px;
        height: 8px;
        background: ${color};
        border-radius: 50%;
        box-shadow: 0 0 10px ${color};
        pointer-events: none;
      `

      const angle = (i / 8) * Math.PI * 2
      const vx = Math.cos(angle) * 3
      const vy = Math.sin(angle) * 3

      this.effectsLayer.appendChild(particle)

      let lifetime = 0
      const animInterval = setInterval(() => {
        lifetime++
        x += vx
        y += vy
        particle.style.left = x + "px"
        particle.style.top = y + "px"
        particle.style.opacity = 1 - lifetime / 30

        if (lifetime > 30) {
          clearInterval(animInterval)
          particle.remove()
        }
      }, 16)
    }
  }

  createInitialAI() {
    // Add some floating elements for atmosphere
    const colors = ["#00FFFF", "#FF00FF", "#00FF88"]
    for (let i = 0; i < 3; i++) {
      const el = document.createElement("div")
      el.style.cssText = `
        position: absolute;
        width: 2px;
        height: 2px;
        background: ${colors[i]};
        box-shadow: 0 0 10px ${colors[i]};
        border-radius: 50%;
        pointer-events: none;
        animation: float ${3 + i}s ease-in-out infinite;
      `
      el.style.left = Math.random() * 100 + "%"
      el.style.top = Math.random() * 100 + "%"
      this.floatingLayer.appendChild(el)
    }
  }

  startAnimationLoop() {
    const animate = () => {
      // Update FPS
      const now = Date.now()
      const delta = now - this.lastFrameTime
      this.frameCount++

      if (delta > 1000) {
        this.fps = Math.round((this.frameCount * 1000) / delta)
        if (this.settings.showFPS) {
          document.getElementById("fpsCount").textContent = this.fps
        }
        this.frameCount = 0
        this.lastFrameTime = now
      }

      // Apply physics
      if (this.settings.physicsEnabled) {
        this.objects.forEach((obj) => {
          obj.vy += 0.1 // gravity
          obj.x += obj.vx
          obj.y += obj.vy

          // Boundaries
          const rect = this.canvas.getBoundingClientRect()
          if (obj.y + obj.size > rect.height) {
            obj.y = rect.height - obj.size
            obj.vy *= -0.6
          }
          if (obj.x + obj.size > rect.width) {
            obj.x = rect.width - obj.size
            obj.vx *= -0.6
          }
          if (obj.x < 0) {
            obj.x = 0
            obj.vx *= -0.6
          }
          if (obj.y < 0) {
            obj.y = 0
            obj.vy *= -0.6
          }

          this.updateObjectElement(obj)
        })
      }

      requestAnimationFrame(animate)
    }

    animate()
  }

  darkenColor(color, percent) {
    const num = Number.parseInt(color.replace("#", ""), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max(0, (num >> 16) - amt)
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt)
    const B = Math.max(0, (num & 0x0000ff) - amt)
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new CityBuilder()
})
