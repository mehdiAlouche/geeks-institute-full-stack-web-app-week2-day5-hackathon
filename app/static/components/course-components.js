// Use global html function if available, otherwise create it
if (typeof html === 'undefined') {
  window.html = String.raw;
}

// Course Card Component
class CourseCard extends HTMLElement {
  static get observedAttributes() {
    return ['course-id', 'title', 'description', 'teacher', 'enrolled', 'published', 'image'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const courseId = this.getAttribute('course-id') || '';
    const title = this.getAttribute('title') || 'Untitled Course';
    const description = this.getAttribute('description') || 'No description available';
    const teacher = this.getAttribute('teacher') || 'Unknown Teacher';
    const enrolled = this.getAttribute('enrolled') || '0';
    const published = this.getAttribute('published') === 'true';
    const image = this.getAttribute('image') || '';
    const isEnrolled = this.getAttribute('is-enrolled') === 'true';

    // Get current user info
    const user = window.SchoolApp?.getCurrentUser();
    const userRole = user?.role || 'student';

    this.innerHTML = html`
      <div class="bg-white rounded-lg shadow-md overflow-hidden card-hover">
        ${image ? html`
          <div class="h-48 bg-gradient-to-r from-blue-500 to-purple-600 relative">
            <img src="${image}" alt="${title}" class="w-full h-full object-cover">
            <div class="absolute top-4 right-4">
              <app-badge variant="${published ? 'success' : 'warning'}">
                ${published ? 'Published' : 'Draft'}
              </app-badge>
            </div>
          </div>
        ` : html`
          <div class="h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <i class="bi bi-book text-6xl text-white opacity-50"></i>
            <div class="absolute top-4 right-4">
              <app-badge variant="${published ? 'success' : 'warning'}">
                ${published ? 'Published' : 'Draft'}
              </app-badge>
            </div>
          </div>
        `}
        
        <div class="p-6">
          <h3 class="text-xl font-semibold text-gray-800 mb-2 line-clamp-2">${title}</h3>
          <p class="text-gray-600 mb-4 line-clamp-3">${description}</p>
          
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center text-sm text-gray-500">
              <i class="bi bi-person mr-1"></i>
              <span>${teacher}</span>
            </div>
            <div class="flex items-center text-sm text-gray-500">
              <i class="bi bi-people mr-1"></i>
              <span>${enrolled} enrolled</span>
            </div>
          </div>
          
          <div class="flex space-x-2">
            <a href="/courses/${courseId}" class="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              <i class="bi bi-eye mr-1"></i>
              ${userRole === 'student' ? 'View Course' : 'View Details'}
            </a>
            
            ${userRole === 'student' ? html`
              <button class="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors ${isEnrolled ? 'bg-green-100 text-green-700' : ''}" id="enroll-btn">
                <i class="bi ${isEnrolled ? 'bi-check-circle' : 'bi-plus-circle'}"></i>
              </button>
            ` : userRole === 'teacher' || userRole === 'admin' ? html`
              <a href="/courses/${courseId}/edit" class="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                <i class="bi bi-pencil"></i>
              </a>
              <button class="bg-red-100 text-red-700 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors" id="delete-btn">
                <i class="bi bi-trash"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    this.addEventListener('click', async (e) => {
      if (e.target.closest('#enroll-btn')) {
        e.preventDefault();
        e.stopPropagation();
        
        const courseId = this.getAttribute('course-id');
        if (!courseId) return;

        try {
          await window.SchoolApp.apiCall(`/enrollments`, {
            method: 'POST',
            body: JSON.stringify({ course_id: courseId })
          });
          
          window.SchoolApp.showFlash('Successfully enrolled in course!', 'success');
          this.querySelector('#enroll-btn').innerHTML = '<i class="bi bi-check-circle"></i>';
          this.querySelector('#enroll-btn').classList.add('bg-green-100', 'text-green-700');
        } catch (error) {
          console.error('Enrollment error:', error);
        }
      }
    });
  }
}
customElements.define("course-card", CourseCard);

// Course List Component
class CourseList extends HTMLElement {
  constructor() {
    super();
    this.courses = [];
    this.loading = true;
  }

  connectedCallback() {
    this.render();
    this.loadCourses();
  }

  async loadCourses(page = 1, search = '') {
    try {
      this.loading = true;
      this.render();
      
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '6'
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const data = await window.SchoolApp.apiCall(`/courses?${params}`);
      this.courses = data.courses || data; // Handle both paginated and non-paginated responses
      this.pagination = data.pagination || null;
      this.loading = false;
      this.render();
    } catch (error) {
      this.loading = false;
      this.courses = [];
      this.pagination = null;
      this.render();
      console.error('Failed to load courses:', error);
    }
  }

  render() {
    if (this.loading) {
      this.innerHTML = html`
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${Array(6).fill(0).map(() => html`
            <div class="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
              <div class="h-48 bg-gray-300"></div>
              <div class="p-6">
                <div class="h-6 bg-gray-300 rounded mb-2"></div>
                <div class="h-4 bg-gray-300 rounded mb-4"></div>
                <div class="h-4 bg-gray-300 rounded mb-4"></div>
                <div class="h-10 bg-gray-300 rounded"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      return;
    }

    if (this.courses.length === 0) {
      const user = window.SchoolApp?.getCurrentUser();
      const canCreateCourse = user?.role === 'teacher' || user?.role === 'admin';
      
      this.innerHTML = html`
        <empty-state 
          title="No courses available"
          description="There are no courses to display at the moment."
          icon="bi-book"
          ${canCreateCourse ? 'action-text="Create Course"' : ''}
          ${canCreateCourse ? 'action-href="/courses/create"' : ''}
        ></empty-state>
      `;
      return;
    }

    this.innerHTML = html`
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${this.courses.map(course => html`
          <course-card
            course-id="${course.id}"
            title="${course.title}"
            description="${course.description || 'No description available'}"
            teacher="${course.teacher_name || 'Unknown Teacher'}"
            enrolled="${course.enrolled_count || 0}"
            published="${course.is_published}"
            image="${course.image_url || ''}"
          ></course-card>
        `).join('')}
      </div>
      ${this.pagination ? html`
        <div class="flex items-center justify-between mt-8">
          <div class="text-sm text-gray-700">
            Showing ${((this.pagination.page - 1) * this.pagination.per_page) + 1} to 
            ${Math.min(this.pagination.page * this.pagination.per_page, this.pagination.total)} of 
            ${this.pagination.total} results
          </div>
          <div class="flex items-center space-x-2">
            <button 
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              ${!this.pagination.has_prev ? 'disabled' : ''}
              onclick="this.getRootNode().host.loadCourses(${this.pagination.page - 1})"
            >
              Previous
            </button>
            <span class="px-3 py-2 text-sm font-medium text-gray-700 bg-blue-50 border border-blue-200 rounded-lg">
              ${this.pagination.page} of ${this.pagination.total_pages}
            </span>
            <button 
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              ${!this.pagination.has_next ? 'disabled' : ''}
              onclick="this.getRootNode().host.loadCourses(${this.pagination.page + 1})"
            >
              Next
            </button>
          </div>
        </div>
      ` : ''}
    `;
  }
}
customElements.define("course-list", CourseList);

// Course Detail Component
class CourseDetail extends HTMLElement {
  static get observedAttributes() {
    return ['course-id'];
  }

  constructor() {
    super();
    this.course = null;
    this.files = [];
    this.loading = true;
  }

  connectedCallback() {
    this.render();
    this.loadCourse();
  }

  attributeChangedCallback() {
    this.loadCourse();
  }

  async loadCourse() {
    const courseId = this.getAttribute('course-id');
    if (!courseId) return;

    try {
      this.loading = true;
      this.render();

      const [courseData, filesData] = await Promise.all([
        window.SchoolApp.apiCall(`/courses/${courseId}`),
        window.SchoolApp.apiCall(`/files?course_id=${courseId}`)
      ]);

      this.course = courseData;
      this.files = filesData.files || [];
      this.loading = false;
      this.render();
    } catch (error) {
      this.loading = false;
      this.render();
      console.error('Failed to load course:', error);
    }
  }

  render() {
    if (this.loading) {
      this.innerHTML = html`
        <div class="max-w-4xl mx-auto p-6">
          <div class="animate-pulse">
            <div class="h-8 bg-gray-300 rounded mb-4"></div>
            <div class="h-4 bg-gray-300 rounded mb-2"></div>
            <div class="h-4 bg-gray-300 rounded mb-6"></div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              ${Array(6).fill(0).map(() => html`
                <div class="bg-white rounded-lg shadow-md p-4">
                  <div class="h-4 bg-gray-300 rounded mb-2"></div>
                  <div class="h-3 bg-gray-300 rounded"></div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (!this.course) {
      this.innerHTML = html`
        <div class="max-w-4xl mx-auto p-6">
          <app-alert type="error">
            Course not found or you don't have permission to view it.
          </app-alert>
        </div>
      `;
      return;
    }

    this.innerHTML = html`
      <div class="max-w-4xl mx-auto p-6">
        <!-- Course Header -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h1 class="text-3xl font-bold text-gray-800 mb-2">${this.course.title}</h1>
              <p class="text-gray-600 mb-4">${this.course.description || 'No description available'}</p>
              <div class="flex items-center space-x-4 text-sm text-gray-500">
                <span><i class="bi bi-person mr-1"></i>${this.course.teacher_name || 'Unknown Teacher'}</span>
                <span><i class="bi bi-people mr-1"></i>${this.course.enrolled_count || 0} enrolled</span>
                <span><i class="bi bi-calendar mr-1"></i>Created ${new Date(this.course.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <app-badge variant="${this.course.is_published ? 'success' : 'warning'}">
              ${this.course.is_published ? 'Published' : 'Draft'}
            </app-badge>
          </div>
          
          <div class="flex space-x-3">
            <app-button variant="primary">
              <i class="bi bi-play-circle mr-2"></i>
              Start Learning
            </app-button>
            <app-button variant="outline">
              <i class="bi bi-bookmark mr-2"></i>
              Save for Later
            </app-button>
          </div>
        </div>

        <!-- Course Files -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Course Content</h2>
          
          ${this.files.length === 0 ? html`
            <empty-state 
              title="No content available"
              description="This course doesn't have any files or content yet."
              icon="bi-file-earmark"
            ></empty-state>
          ` : html`
            <div class="space-y-3">
              ${this.files.map((file, index) => html`
                <div class="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="flex-shrink-0 mr-4">
                    <i class="bi ${this.getFileIcon(file.file_type)} text-2xl text-blue-600"></i>
                  </div>
                  <div class="flex-1">
                    <h3 class="font-medium text-gray-800">${file.title}</h3>
                    <p class="text-sm text-gray-500">${this.getFileTypeLabel(file.file_type)} • ${file.file_order}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <app-button variant="ghost" size="sm">
                      <i class="bi bi-play-circle mr-1"></i>
                      View
                    </app-button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  getFileIcon(fileType) {
    const icons = {
      video: 'bi-play-circle',
      pdf: 'bi-file-earmark-pdf',
      document: 'bi-file-earmark-text'
    };
    return icons[fileType] || 'bi-file-earmark';
  }

  getFileTypeLabel(fileType) {
    const labels = {
      video: 'Video',
      pdf: 'PDF Document',
      document: 'Document'
    };
    return labels[fileType] || 'File';
  }
}
customElements.define("course-detail", CourseDetail);

// Course Form Component
class CourseForm extends HTMLElement {
  constructor() {
    super();
    this.course = null;
    this.loading = false;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.innerHTML = html`
      <form id="course-form" class="space-y-6">
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Course Information</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="title" class="block text-sm font-medium text-gray-700 mb-2">Course Title</label>
              <input 
                type="text" 
                id="title" 
                name="title" 
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter course title"
              >
            </div>
            
            <div>
              <label for="teacher_id" class="block text-sm font-medium text-gray-700 mb-2">Teacher</label>
              <select 
                id="teacher_id" 
                name="teacher_id" 
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a teacher</option>
              </select>
            </div>
          </div>
          
          <div class="mt-6">
            <label for="description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea 
              id="description" 
              name="description" 
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter course description"
            ></textarea>
          </div>
          
          <div class="mt-6">
            <label class="flex items-center">
              <input 
                type="checkbox" 
                id="is_published" 
                name="is_published"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              >
              <span class="ml-2 text-sm text-gray-700">Publish this course</span>
            </label>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <app-button variant="outline" type="button" onclick="history.back()">
            Cancel
          </app-button>
          <app-button variant="primary" type="submit" id="submit-btn">
            <i class="bi bi-save mr-2"></i>
            Save Course
          </app-button>
        </div>
      </form>
    `;
  }

  setupEventListeners() {
    const form = this.querySelector('#course-form');
    const submitBtn = this.querySelector('#submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      this.loading = true;
      submitBtn.setAttribute('loading', '');
      
      try {
        const formData = new FormData(form);
        const courseData = {
          title: formData.get('title'),
          description: formData.get('description'),
          teacher_id: formData.get('teacher_id'),
          is_published: formData.has('is_published')
        };

        const response = await window.SchoolApp.apiCall('/courses', {
          method: 'POST',
          body: JSON.stringify(courseData)
        });

        window.SchoolApp.showFlash('Course created successfully!', 'success');
        window.location.href = `/courses/${response.id}`;
      } catch (error) {
        console.error('Course creation error:', error);
      } finally {
        this.loading = false;
        submitBtn.removeAttribute('loading');
      }
    });
  }
}
customElements.define("course-form", CourseForm);
