// Use global html function if available, otherwise create it
if (typeof html === 'undefined') {
  window.html = String.raw;
}

// User Card Component
class UserCard extends HTMLElement {
  static get observedAttributes() {
    return ['user-id', 'name', 'email', 'role', 'avatar'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const userId = this.getAttribute('user-id') || '';
    const name = this.getAttribute('name') || 'Unknown User';
    const email = this.getAttribute('email') || '';
    const role = this.getAttribute('role') || 'user';
    const avatar = this.getAttribute('avatar') || '';

    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      teacher: 'bg-blue-100 text-blue-800',
      student: 'bg-green-100 text-green-800'
    };

    const roleIcons = {
      admin: 'bi-shield-check',
      teacher: 'bi-person-badge',
      student: 'bi-person'
    };

    this.innerHTML = html`
      <div class="bg-white rounded-lg shadow-md p-6 card-hover">
        <div class="flex items-center space-x-4 mb-4">
          ${avatar ? html`
            <img src="${avatar}" alt="${name}" class="w-12 h-12 rounded-full object-cover">
          ` : html`
            <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span class="text-white font-semibold text-lg">${name.charAt(0).toUpperCase()}</span>
            </div>
          `}
          
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-800">${name}</h3>
            <p class="text-gray-600 text-sm">${email}</p>
          </div>
          
          <app-badge variant="${role === 'admin' ? 'danger' : role === 'teacher' ? 'primary' : 'success'}">
            <i class="bi ${roleIcons[role]} mr-1"></i>
            ${role.charAt(0).toUpperCase() + role.slice(1)}
          </app-badge>
        </div>
        
        <div class="flex space-x-2">
          <button class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors" id="view-btn">
            <i class="bi bi-eye mr-1"></i>
            View Profile
          </button>
          <button class="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors" id="edit-btn">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors" id="delete-btn">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    this.addEventListener('click', (e) => {
      const userId = this.getAttribute('user-id');
      if (!userId) return;

      if (e.target.closest('#view-btn')) {
        window.location.href = `/users/${userId}`;
      } else if (e.target.closest('#edit-btn')) {
        window.location.href = `/users/${userId}/edit`;
      } else if (e.target.closest('#delete-btn')) {
        this.deleteUser(userId);
      }
    });
  }

  async deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await window.SchoolApp.apiCall(`/users/${userId}`, {
        method: 'DELETE'
      });
      
      window.SchoolApp.showFlash('User deleted successfully', 'success');
      this.remove();
    } catch (error) {
      console.error('Delete user error:', error);
    }
  }
}
customElements.define("user-card", UserCard);

// User List Component
class UserList extends HTMLElement {
  constructor() {
    super();
    this.users = [];
    this.loading = true;
    this.currentRole = 'all';
  }

  connectedCallback() {
    this.render();
    this.loadUsers();
  }

  async loadUsers(role = 'all') {
    try {
      this.loading = true;
      this.currentRole = role;
      this.render();
      
      const endpoint = role === 'all' ? '/users' : `/users?role=${role}`;
      const data = await window.SchoolApp.apiCall(endpoint);
      this.users = data.users || [];
      this.loading = false;
      this.render();
    } catch (error) {
      this.loading = false;
      this.render();
      console.error('Failed to load users:', error);
    }
  }

  render() {
    this.innerHTML = html`
      <div class="space-y-6">
        <!-- Filters -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-800">Users</h2>
            <a href="/users/create" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <i class="bi bi-person-plus mr-2"></i>
              Add User
            </a>
          </div>
          
          <div class="flex space-x-2">
            <button 
              class="px-4 py-2 rounded-lg transition-colors ${this.currentRole === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              onclick="this.loadUsers('all')"
            >
              All Users
            </button>
            <button 
              class="px-4 py-2 rounded-lg transition-colors ${this.currentRole === 'admin' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              onclick="this.loadUsers('admin')"
            >
              Admins
            </button>
            <button 
              class="px-4 py-2 rounded-lg transition-colors ${this.currentRole === 'teacher' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              onclick="this.loadUsers('teacher')"
            >
              Teachers
            </button>
            <button 
              class="px-4 py-2 rounded-lg transition-colors ${this.currentRole === 'student' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              onclick="this.loadUsers('student')"
            >
              Students
            </button>
          </div>
        </div>

        <!-- Users Grid -->
        ${this.loading ? html`
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${Array(6).fill(0).map(() => html`
              <div class="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div class="flex items-center space-x-4 mb-4">
                  <div class="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div class="flex-1">
                    <div class="h-4 bg-gray-300 rounded mb-2"></div>
                    <div class="h-3 bg-gray-300 rounded"></div>
                  </div>
                </div>
                <div class="h-10 bg-gray-300 rounded"></div>
              </div>
            `).join('')}
          </div>
        ` : this.users.length === 0 ? html`
          <empty-state 
            title="No users found"
            description="There are no users to display for the selected filter."
            icon="bi-people"
            action-text="Add User"
            action-href="/users/create"
          ></empty-state>
        ` : html`
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${this.users.map(user => html`
              <user-card
                user-id="${user.id}"
                name="${user.name}"
                email="${user.email}"
                role="${user.role}"
                avatar="${user.avatar_url || ''}"
              ></user-card>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }
}
customElements.define("user-list", UserList);

// User Form Component
class UserForm extends HTMLElement {
  constructor() {
    super();
    this.user = null;
    this.loading = false;
    this.isEdit = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.innerHTML = html`
      <form id="user-form" class="space-y-6">
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">User Information</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter full name"
              >
            </div>
            
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email address"
              >
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                Password ${this.isEdit ? '(leave blank to keep current)' : ''}
              </label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                ${!this.isEdit ? 'required' : ''}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
              >
            </div>
            
            <div>
              <label for="role" class="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select 
                id="role" 
                name="role" 
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a role</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <app-button variant="outline" type="button" onclick="history.back()">
            Cancel
          </app-button>
          <app-button variant="primary" type="submit" id="submit-btn">
            <i class="bi bi-save mr-2"></i>
            ${this.isEdit ? 'Update User' : 'Create User'}
          </app-button>
        </div>
      </form>
    `;
  }

  setupEventListeners() {
    const form = this.querySelector('#user-form');
    const submitBtn = this.querySelector('#submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      this.loading = true;
      submitBtn.setAttribute('loading', '');
      
      try {
        const formData = new FormData(form);
        const userData = {
          name: formData.get('name'),
          email: formData.get('email'),
          role: formData.get('role')
        };

        // Only include password if provided
        const password = formData.get('password');
        if (password) {
          userData.password = password;
        }

        const method = this.isEdit ? 'PUT' : 'POST';
        const endpoint = this.isEdit ? `/users/${this.user.id}` : '/users';

        const response = await window.SchoolApp.apiCall(endpoint, {
          method,
          body: JSON.stringify(userData)
        });

        window.SchoolApp.showFlash(
          `User ${this.isEdit ? 'updated' : 'created'} successfully!`, 
          'success'
        );
        window.location.href = this.isEdit ? `/users/${this.user.id}` : '/users';
      } catch (error) {
        console.error('User save error:', error);
      } finally {
        this.loading = false;
        submitBtn.removeAttribute('loading');
      }
    });
  }

  loadUser(userId) {
    this.isEdit = true;
    this.render();
    
    window.SchoolApp.apiCall(`/users/${userId}`)
      .then(user => {
        this.user = user;
        this.populateForm();
      })
      .catch(error => {
        console.error('Failed to load user:', error);
        window.SchoolApp.showFlash('Failed to load user', 'error');
      });
  }

  populateForm() {
    if (!this.user) return;

    this.querySelector('#name').value = this.user.name || '';
    this.querySelector('#email').value = this.user.email || '';
    this.querySelector('#role').value = this.user.role || '';
  }
}
customElements.define("user-form", UserForm);

// User Profile Component
class UserProfile extends HTMLElement {
  static get observedAttributes() {
    return ['user-id'];
  }

  constructor() {
    super();
    this.user = null;
    this.loading = true;
  }

  connectedCallback() {
    this.render();
    this.loadUser();
  }

  attributeChangedCallback() {
    this.loadUser();
  }

  async loadUser() {
    const userId = this.getAttribute('user-id');
    if (!userId) return;

    try {
      this.loading = true;
      this.render();

      const user = await window.SchoolApp.apiCall(`/users/${userId}`);
      this.user = user;
      this.loading = false;
      this.render();
    } catch (error) {
      this.loading = false;
      this.render();
      console.error('Failed to load user:', error);
    }
  }

  render() {
    if (this.loading) {
      this.innerHTML = html`
        <div class="max-w-4xl mx-auto p-6">
          <div class="animate-pulse">
            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex items-center space-x-4 mb-6">
                <div class="w-20 h-20 bg-gray-300 rounded-full"></div>
                <div class="flex-1">
                  <div class="h-6 bg-gray-300 rounded mb-2"></div>
                  <div class="h-4 bg-gray-300 rounded mb-2"></div>
                  <div class="h-4 bg-gray-300 rounded w-1/3"></div>
                </div>
              </div>
              <div class="space-y-4">
                <div class="h-4 bg-gray-300 rounded"></div>
                <div class="h-4 bg-gray-300 rounded"></div>
                <div class="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (!this.user) {
      this.innerHTML = html`
        <div class="max-w-4xl mx-auto p-6">
          <app-alert type="error">
            User not found or you don't have permission to view this profile.
          </app-alert>
        </div>
      `;
      return;
    }

    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      teacher: 'bg-blue-100 text-blue-800',
      student: 'bg-green-100 text-green-800'
    };

    this.innerHTML = html`
      <div class="max-w-4xl mx-auto p-6">
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="flex items-center space-x-6 mb-6">
            ${this.user.avatar_url ? html`
              <img src="${this.user.avatar_url}" alt="${this.user.name}" class="w-20 h-20 rounded-full object-cover">
            ` : html`
              <div class="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span class="text-white font-bold text-2xl">${this.user.name.charAt(0).toUpperCase()}</span>
              </div>
            `}
            
            <div class="flex-1">
              <h1 class="text-3xl font-bold text-gray-800 mb-2">${this.user.name}</h1>
              <p class="text-gray-600 mb-2">${this.user.email}</p>
              <app-badge variant="${this.user.role === 'admin' ? 'danger' : this.user.role === 'teacher' ? 'primary' : 'success'}">
                ${this.user.role.charAt(0).toUpperCase() + this.user.role.slice(1)}
              </app-badge>
            </div>
            
            <div class="flex space-x-3">
              <app-button variant="outline">
                <i class="bi bi-pencil mr-2"></i>
                Edit Profile
              </app-button>
              <app-button variant="primary">
                <i class="bi bi-envelope mr-2"></i>
                Send Message
              </app-button>
            </div>
          </div>
          
          <div class="border-t border-gray-200 pt-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Profile Information</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <p class="text-gray-900">${this.user.name}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p class="text-gray-900">${this.user.email}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <p class="text-gray-900">${this.user.role.charAt(0).toUpperCase() + this.user.role.slice(1)}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                <p class="text-gray-900">${new Date(this.user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define("user-profile", UserProfile);
