const html = String.raw;

// Loading Spinner Component
class LoadingSpinner extends HTMLElement {
  connectedCallback() {
    this.innerHTML = html`
      <div class="flex items-center justify-center p-8">
        <div class="loading w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
        <span class="ml-3 text-gray-600">Loading...</span>
      </div>
    `;
  }
}
customElements.define("loading-spinner", LoadingSpinner);

// Card Component
class Card extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'subtitle', 'icon', 'class'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const title = this.getAttribute('title') || '';
    const subtitle = this.getAttribute('subtitle') || '';
    const icon = this.getAttribute('icon') || '';
    const cardClass = this.getAttribute('class') || '';

    this.innerHTML = html`
      <div class="bg-white rounded-lg shadow-md p-6 card-hover ${cardClass}">
        ${icon ? html`<div class="text-3xl text-blue-600 mb-4">${icon}</div>` : ''}
        ${title ? html`<h3 class="text-lg font-semibold text-gray-800 mb-2">${title}</h3>` : ''}
        ${subtitle ? html`<p class="text-gray-600 mb-4">${subtitle}</p>` : ''}
        <div class="card-content">
          <slot></slot>
        </div>
      </div>
    `;
  }
}
customElements.define("app-card", Card);

// Button Component
class Button extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'size', 'disabled', 'loading'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const variant = this.getAttribute('variant') || 'primary';
    const size = this.getAttribute('size') || 'md';
    const disabled = this.hasAttribute('disabled');
    const loading = this.hasAttribute('loading');

    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      success: 'bg-green-600 hover:bg-green-700 text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
      outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50',
      ghost: 'text-blue-600 hover:bg-blue-50'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };

    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
    const loadingClasses = loading ? 'cursor-wait' : '';

    this.innerHTML = html`
      <button 
        class="${baseClasses} ${variants[variant]} ${sizes[size]} ${disabledClasses} ${loadingClasses}"
        ${disabled ? 'disabled' : ''}
      >
        ${loading ? html`<div class="loading w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>` : ''}
        <slot></slot>
      </button>
    `;
  }
}
customElements.define("app-button", Button);

// Modal Component
class Modal extends HTMLElement {
  static get observedAttributes() {
    return ['open', 'title'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      this.render();
    }
  }

  render() {
    const isOpen = this.hasAttribute('open');
    const title = this.getAttribute('title') || 'Modal';

    this.innerHTML = html`
      <div class="fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}" id="modal-overlay">
        <div class="fixed inset-0 bg-black bg-opacity-50" id="modal-backdrop"></div>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
              <button class="text-gray-400 hover:text-gray-600" id="modal-close">
                <i class="bi bi-x-lg text-xl"></i>
              </button>
            </div>
            <div class="p-6">
              <slot></slot>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    this.addEventListener('click', (e) => {
      if (e.target.id === 'modal-close' || e.target.id === 'modal-backdrop') {
        this.close();
      }
    });
  }

  open() {
    this.setAttribute('open', '');
  }

  close() {
    this.removeAttribute('open');
  }
}
customElements.define("app-modal", Modal);

// Alert Component
class Alert extends HTMLElement {
  static get observedAttributes() {
    return ['type', 'dismissible'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const type = this.getAttribute('type') || 'info';
    const dismissible = this.hasAttribute('dismissible');

    const types = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const icons = {
      success: 'bi-check-circle',
      error: 'bi-exclamation-circle',
      warning: 'bi-exclamation-triangle',
      info: 'bi-info-circle'
    };

    this.innerHTML = html`
      <div class="border rounded-lg p-4 ${types[type]}">
        <div class="flex items-start">
          <i class="bi ${icons[type]} text-lg mr-3 mt-0.5"></i>
          <div class="flex-1">
            <slot></slot>
          </div>
          ${dismissible ? html`
            <button class="ml-3 text-gray-400 hover:text-gray-600" id="alert-close">
              <i class="bi bi-x-lg"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    if (this.hasAttribute('dismissible')) {
      this.addEventListener('click', (e) => {
        if (e.target.id === 'alert-close') {
          this.remove();
        }
      });
    }
  }
}
customElements.define("app-alert", Alert);

// Badge Component
class Badge extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'size'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const variant = this.getAttribute('variant') || 'default';
    const size = this.getAttribute('size') || 'md';

    const variants = {
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800'
    };

    const sizes = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-base'
    };

    this.innerHTML = html`
      <span class="inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}">
        <slot></slot>
      </span>
    `;
  }
}
customElements.define("app-badge", Badge);

// Stats Card Component
class StatsCard extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'value', 'change', 'icon', 'trend'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const title = this.getAttribute('title') || '';
    const value = this.getAttribute('value') || '0';
    const change = this.getAttribute('change') || '';
    const icon = this.getAttribute('icon') || '';
    const trend = this.getAttribute('trend') || 'neutral';

    const trendColors = {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-600'
    };

    const trendIcons = {
      up: 'bi-arrow-up',
      down: 'bi-arrow-down',
      neutral: 'bi-dash'
    };

    this.innerHTML = html`
      <div class="bg-white rounded-lg shadow-md p-6 card-hover">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">${title}</p>
            <p class="text-2xl font-bold text-gray-900">${value}</p>
            ${change ? html`
              <div class="flex items-center mt-1">
                <i class="bi ${trendIcons[trend]} ${trendColors[trend]} text-sm mr-1"></i>
                <span class="text-sm ${trendColors[trend]}">${change}</span>
              </div>
            ` : ''}
          </div>
          ${icon ? html`
            <div class="text-3xl text-blue-600">
              ${icon}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}
customElements.define("stats-card", StatsCard);

// Empty State Component
class EmptyState extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'description', 'icon', 'action-text', 'action-href'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const title = this.getAttribute('title') || 'No data available';
    const description = this.getAttribute('description') || 'There are no items to display at the moment.';
    const icon = this.getAttribute('icon') || 'bi-inbox';
    const actionText = this.getAttribute('action-text') || '';
    const actionHref = this.getAttribute('action-href') || '';

    this.innerHTML = html`
      <div class="text-center py-12">
        <div class="text-6xl text-gray-300 mb-4">
          ${icon}
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">${title}</h3>
        <p class="text-gray-500 mb-6">${description}</p>
        ${actionText && actionHref ? html`
          <a href="${actionHref}" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <i class="bi bi-plus-circle mr-2"></i>
            ${actionText}
          </a>
        ` : ''}
      </div>
    `;
  }
}
customElements.define("empty-state", EmptyState);
