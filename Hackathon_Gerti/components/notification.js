class NotificationComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 3000;
        }
        
        .notification {
          background: rgba(0, 0, 0, 0.8);
          border-left: 4px solid #00FFFF;
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 10px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          transform: translateX(120%);
          transition: transform 0.3s ease;
          max-width: 300px;
        }
        
        .notification.show {
          transform: translateX(0);
        }
        
        .notification.success {
          border-left-color: #00FFAA;
        }
        
        .notification.error {
          border-left-color: #FF4757;
        }
        
        .notification.warning {
          border-left-color: #FFAA00;
        }
        
        h4 {
          font-family: 'Orbitron', sans-serif;
          margin-bottom: 5px;
          color: #00FFFF;
        }
        
        p {
          font-size: 14px;
          color: #FFFFFF;
          margin: 0;
        }
      </style>
      <div class="notification">
        <h4></h4>
        <p></p>
      </div>
    `;
  }
  
  show(title, message, type = 'info') {
    const notification = this.shadowRoot.querySelector('.notification');
    const titleEl = this.shadowRoot.querySelector('h4');
    const messageEl = this.shadowRoot.querySelector('p');
    
    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Set type
    notification.className = 'notification';
    if (type) {
      notification.classList.add(type);
    }
    
    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Hide after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        this.remove();
      }, 300);
    }, 5000);
  }
}

customElements.define('notification-component', NotificationComponent);