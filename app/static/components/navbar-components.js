const html = String.raw;

class Navbar extends HTMLElement {
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    const isAuthenticated = window.SchoolApp?.isAuthenticated() || false;
    const user = window.SchoolApp?.getCurrentUser() || null;

    this.innerHTML = html`
      <nav class="bg-white shadow-lg sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex items-center justify-between h-16">
            <!-- Logo -->
            <div class="flex items-center">
              <a href="/" class="flex items-center space-x-2">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <i class="bi bi-mortarboard text-white text-lg"></i>
                </div>
                <span class="text-xl font-bold text-gray-800">SchoolApp</span>
              </a>
            </div>

            <!-- Desktop Navigation -->
            <div class="hidden md:flex items-center space-x-8">
              <a href="${isAuthenticated ? (user?.role === 'student' ? '/student-dashboard' : '/dashboard') : '/'}" class="text-gray-700 hover:text-blue-600 transition-colors">
                <i class="bi bi-house-door mr-1"></i>${isAuthenticated ? 'Dashboard' : 'Home'}
              </a>
              <a href="/courses" class="text-gray-700 hover:text-blue-600 transition-colors">
                <i class="bi bi-book mr-1"></i>Courses
              </a>
              ${isAuthenticated && user?.role === 'student' ? html`
                <a href="/my-courses" class="text-gray-700 hover:text-blue-600 transition-colors">
                  <i class="bi bi-collection-play mr-1"></i>My Courses
                </a>
              ` : ''}
              ${isAuthenticated && user?.role === 'teacher' ? html`
                <a href="/courses/create" class="text-gray-700 hover:text-blue-600 transition-colors">
                  <i class="bi bi-plus-circle mr-1"></i>Create Course
                </a>
              ` : ''}
              ${isAuthenticated && user?.role === 'admin' ? html`
                <a href="/users" class="text-gray-700 hover:text-blue-600 transition-colors">
                  <i class="bi bi-people mr-1"></i>Users
                </a>
              ` : ''}
            </div>

            <!-- User Menu -->
            <div class="flex items-center space-x-4">
              ${isAuthenticated ? html`
                <!-- Notifications -->
                <button class="relative text-gray-700 hover:text-blue-600 transition-colors">
                  <i class="bi bi-bell text-xl"></i>
                  <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
                </button>

                <!-- User Dropdown -->
                <div class="relative" id="user-dropdown">
                  <button class="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors" id="user-menu-button">
                    <div class="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-sm font-semibold">${user?.name?.charAt(0) || 'U'}</span>
                    </div>
                    <span class="hidden md:block">${user?.name || 'User'}</span>
                    <i class="bi bi-chevron-down"></i>
                  </button>
                  
                  <!-- Dropdown Menu -->
                  <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 hidden" id="user-menu">
                    <div class="px-4 py-2 border-b border-gray-100">
                      <p class="text-sm font-medium text-gray-900">${user?.name || 'User'}</p>
                      <p class="text-sm text-gray-500">${user?.email || ''}</p>
                      <span class="inline-block px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full mt-1">
                        ${user?.role || 'user'}
                      </span>
                    </div>
                    <a href="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <i class="bi bi-person mr-2"></i>Profile
                    </a>
                    <a href="/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <i class="bi bi-gear mr-2"></i>Settings
                    </a>
                    <hr class="my-1">
                    <button onclick="window.SchoolApp.logout()" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                      <i class="bi bi-box-arrow-right mr-2"></i>Logout
                    </button>
                  </div>
                </div>
              ` : html`
                <!-- Login/Register Buttons -->
                <a href="/login" class="text-gray-700 hover:text-blue-600 transition-colors">
                  <i class="bi bi-box-arrow-in-right mr-1"></i>Login
                </a>
                <a href="/register" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <i class="bi bi-person-plus mr-1"></i>Register
                </a>
              `}
            </div>

            <!-- Mobile Menu Button -->
            <button class="md:hidden text-gray-700 hover:text-blue-600" id="mobile-menu-button">
              <i class="bi bi-list text-xl"></i>
              </button>
          </div>

          <!-- Mobile Menu -->
          <div class="md:hidden hidden" id="mobile-menu">
            <div class="px-2 pt-2 pb-3 space-y-1 bg-gray-50 rounded-lg mt-2">
              <a href="${isAuthenticated ? (user?.role === 'student' ? '/student-dashboard' : '/dashboard') : '/'}" class="block px-3 py-2 text-gray-700 hover:text-blue-600">
                <i class="bi bi-house-door mr-2"></i>${isAuthenticated ? 'Dashboard' : 'Home'}
              </a>
              <a href="/courses" class="block px-3 py-2 text-gray-700 hover:text-blue-600">
                <i class="bi bi-book mr-2"></i>Courses
              </a>
              ${isAuthenticated && user?.role === 'student' ? html`
                <a href="/my-courses" class="block px-3 py-2 text-gray-700 hover:text-blue-600">
                  <i class="bi bi-collection-play mr-2"></i>My Courses
                </a>
              ` : ''}
              ${isAuthenticated && user?.role === 'teacher' ? html`
                <a href="/courses/create" class="block px-3 py-2 text-gray-700 hover:text-blue-600">
                  <i class="bi bi-plus-circle mr-2"></i>Create Course
                </a>
              ` : ''}
              ${isAuthenticated && user?.role === 'admin' ? html`
                <a href="/users" class="block px-3 py-2 text-gray-700 hover:text-blue-600">
                  <i class="bi bi-people mr-2"></i>Users
                </a>
              ` : ''}
              ${!isAuthenticated ? html`
                <a href="/login" class="block px-3 py-2 text-gray-700 hover:text-blue-600">
                  <i class="bi bi-box-arrow-in-right mr-2"></i>Login
                </a>
                <a href="/register" class="block px-3 py-2 text-gray-700 hover:text-blue-600">
                  <i class="bi bi-person-plus mr-2"></i>Register
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      </nav>
    `;
  }

  setupEventListeners() {
    // User dropdown toggle
    this.addEventListener('click', (e) => {
      if (e.target.closest('#user-menu-button')) {
        const menu = this.querySelector('#user-menu');
        menu.classList.toggle('hidden');
      } else if (!e.target.closest('#user-dropdown')) {
        const menu = this.querySelector('#user-menu');
        if (menu) menu.classList.add('hidden');
      }
    });

    // Mobile menu toggle
    this.addEventListener('click', (e) => {
      if (e.target.closest('#mobile-menu-button')) {
        const menu = this.querySelector('#mobile-menu');
        menu.classList.toggle('hidden');
      }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('navbar-component')) {
        const menu = this.querySelector('#user-menu');
        if (menu) menu.classList.add('hidden');
      }
    });
  }
}

customElements.define("navbar-component", Navbar);
