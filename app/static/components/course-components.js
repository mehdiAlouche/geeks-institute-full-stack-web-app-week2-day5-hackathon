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

        const enrollBtn = this.querySelector('#enroll-btn');
        const isEnrolled = this.getAttribute('is-enrolled') === 'true';
        
        if (isEnrolled) {
          // Already enrolled, do nothing or show message
          window.SchoolApp.showFlash('You are already enrolled in this course!', 'info');
          return;
        }

        try {
          enrollBtn.setAttribute('loading', '');
          enrollBtn.disabled = true;
          
          const response = await window.SchoolApp.apiCall(`/enrollments`, {
            method: 'POST',
            body: JSON.stringify({ course_id: courseId })
          });
          
          window.SchoolApp.showFlash('Successfully enrolled in course!', 'success');
          this.setAttribute('is-enrolled', 'true');
          this.render(); // Re-render to update the button state
        } catch (error) {
          console.error('Enrollment error:', error);
          const errorMessage = error.message || 'Failed to enroll in course';
          window.SchoolApp.showFlash(errorMessage, 'error');
        } finally {
          enrollBtn.removeAttribute('loading');
          enrollBtn.disabled = false;
        }
      }
      
      if (e.target.closest('#delete-btn')) {
        e.preventDefault();
        e.stopPropagation();
        
        const courseId = this.getAttribute('course-id');
        if (!courseId) return;

        // Show confirmation dialog
        if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
          try {
            const deleteBtn = this.querySelector('#delete-btn');
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
            
            await window.SchoolApp.apiCall(`/courses/${courseId}`, {
              method: 'DELETE'
            });
            
            window.SchoolApp.showFlash('Course deleted successfully!', 'success');
            // Remove the course card from the DOM
            this.remove();
          } catch (error) {
            console.error('Delete course error:', error);
            const errorMessage = error.message || 'Failed to delete course';
            window.SchoolApp.showFlash(errorMessage, 'error');
            
            // Reset button state
            const deleteBtn = this.querySelector('#delete-btn');
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
          }
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
    // Wait for SchoolApp to be available
    this.waitForSchoolApp().then(() => {
      this.loadCourses();
    });
  }

  async waitForSchoolApp() {
    // Wait for SchoolApp to be available and ready
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (attempts < maxAttempts) {
      if (window.SchoolApp && window.SchoolApp.apiCall && window.SchoolApp.ready) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    throw new Error('SchoolApp not available after waiting');
  }

  async loadCourses(page = 1, search = '', filters = {}) {
    try {
      this.loading = true;
      this.render();
      
      // Check if SchoolApp is available
      if (!window.SchoolApp || !window.SchoolApp.apiCall) {
        throw new Error('SchoolApp is not available');
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '6'
      });
      
      if (search) {
        params.append('search', search);
      }
      
      // Add filter parameters
      if (filters.category) {
        params.append('category', filters.category);
      }
      if (filters.level) {
        params.append('level', filters.level);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.sort) {
        params.append('sort', filters.sort);
      }
      
      const data = await window.SchoolApp.apiCall(`/courses?${params}`);
      this.courses = data.courses || data; // Handle both paginated and non-paginated responses
      this.pagination = data.pagination || null;
      
      // Check enrollment status for each course if user is a student
      const user = window.SchoolApp?.getCurrentUser();
      if (user?.role === 'student') {
        await this.checkEnrollmentStatus();
      }
      
      this.loading = false;
      this.render();
    } catch (error) {
      this.loading = false;
      this.courses = [];
      this.pagination = null;
      this.render();
      console.error('Failed to load courses:', error);
      
      // Show user-friendly error message
      this.innerHTML = `
        <div class="text-center py-8">
          <div class="text-red-600 mb-4">
            <i class="bi bi-exclamation-triangle text-4xl"></i>
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">Failed to load courses</h3>
          <p class="text-gray-600 mb-4">Please refresh the page and try again.</p>
          <button onclick="location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Refresh Page
          </button>
        </div>
      `;
    }
  }

  async checkEnrollmentStatus() {
    if (!this.courses || this.courses.length === 0) return;
    
    try {
      const enrollmentPromises = this.courses.map(async (course) => {
        try {
          const enrollmentData = await window.SchoolApp.apiCall(`/enrollments/check/${course.id}`);
          return { courseId: course.id, enrolled: enrollmentData.enrolled };
        } catch (error) {
          console.error(`Failed to check enrollment for course ${course.id}:`, error);
          return { courseId: course.id, enrolled: false };
        }
      });
      
      const enrollmentResults = await Promise.all(enrollmentPromises);
      
      // Update courses with enrollment status
      this.courses = this.courses.map(course => {
        const enrollmentResult = enrollmentResults.find(r => r.courseId === course.id);
        return {
          ...course,
          is_enrolled: enrollmentResult ? enrollmentResult.enrolled : false
        };
      });
    } catch (error) {
      console.error('Failed to check enrollment status:', error);
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
            is-enrolled="${course.is_enrolled || false}"
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
    // Wait for SchoolApp to be available
    this.waitForSchoolApp().then(() => {
      this.loadCourse();
    }).catch(error => {
      console.error('SchoolApp not available:', error);
      this.loading = false;
      this.render();
    });
  }

  attributeChangedCallback() {
    // Wait for SchoolApp to be available before loading course
    if (window.SchoolApp && window.SchoolApp.ready) {
      this.loadCourse();
    } else {
      this.waitForSchoolApp().then(() => {
        this.loadCourse();
      }).catch(error => {
        console.error('SchoolApp not available:', error);
      });
    }
  }

  async waitForSchoolApp() {
    // Wait for SchoolApp to be available and ready
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (attempts < maxAttempts) {
      if (window.SchoolApp && window.SchoolApp.apiCall && window.SchoolApp.ready) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    throw new Error('SchoolApp not available after waiting');
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
            <button variant="primary">
              <i class="bi bi-play-circle mr-2"></i>
              Start Learning
            </button>
            <button variant="outline">
              <i class="bi bi-bookmark mr-2"></i>
              Save for Later
            </button>
          </div>
        </div>

        <!-- Course Video -->
        ${this.course.video_url ? html`
          <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Course Video</h2>
            <div class="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              ${this.renderVideo(this.course.video_url)}
            </div>
          </div>
        ` : ''}

        <!-- Course Files -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Course Materials</h2>
          
          ${this.files.length === 0 ? html`
            <empty-state 
              title="No materials available"
              description="This course doesn't have any downloadable materials yet."
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
                    <p class="text-sm text-gray-500">${this.getFileTypeLabel(file.file_type)}</p>
                  </div>
                  <div class="flex-shrink-0">
                    <a 
                      href="${file.file_url}" 
                      target="_blank" 
                      class="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <i class="bi bi-download mr-1"></i>
                      Download
                    </a>
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
      document: 'Document',
      archive: 'Archive'
    };
    return labels[fileType] || 'File';
  }

  renderVideo(videoUrl) {
    if (!videoUrl) return '';
    
    // YouTube URL handling
    if (videoUrl.includes('youtube.com/watch') || videoUrl.includes('youtu.be/')) {
      let videoId = '';
      if (videoUrl.includes('youtube.com/watch')) {
        videoId = videoUrl.split('v=')[1]?.split('&')[0];
      } else if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
      }
      
      if (videoId) {
        return html`
          <iframe 
            src="https://www.youtube.com/embed/${videoId}" 
            title="Course Video"
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
            class="w-full h-full"
          ></iframe>
        `;
      }
    }
    
    // Vimeo URL handling
    if (videoUrl.includes('vimeo.com/')) {
      const videoId = videoUrl.split('vimeo.com/')[1]?.split('?')[0];
      if (videoId) {
        return html`
          <iframe 
            src="https://player.vimeo.com/video/${videoId}" 
            title="Course Video"
            frameborder="0" 
            allow="autoplay; fullscreen; picture-in-picture" 
            allowfullscreen
            class="w-full h-full"
          ></iframe>
        `;
      }
    }
    
    // Fallback for other video URLs
    return html`
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <i class="bi bi-play-circle text-6xl text-gray-400 mb-4"></i>
          <p class="text-gray-600 mb-4">Video not supported for embedding</p>
          <a 
            href="${videoUrl}" 
            target="_blank" 
            class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i class="bi bi-play-circle mr-2"></i>
            Watch Video
          </a>
        </div>
      </div>
    `;
  }
}
customElements.define("course-detail", CourseDetail);

// Course Form Component
class CourseForm extends HTMLElement {
  constructor() {
    super();
    this.course = null;
    this.loading = false;
    this.teachers = [];
    this.isEdit = false;
    this.courseId = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    // Wait for SchoolApp to be available
    this.waitForSchoolApp().then(() => {
      this.loadTeachers();
      this.checkEditMode();
    });
  }

  async waitForSchoolApp() {
    // Wait for SchoolApp to be available and ready
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (attempts < maxAttempts) {
      if (window.SchoolApp && window.SchoolApp.apiCall && window.SchoolApp.ready) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    throw new Error('SchoolApp not available after waiting');
  }

  checkEditMode() {
    // Check if we're in edit mode by looking at the URL or page context
    const urlParams = new URLSearchParams(window.location.search);
    const pathParts = window.location.pathname.split('/');
    
    if (pathParts.includes('edit')) {
      this.isEdit = true;
      this.courseId = pathParts[pathParts.indexOf('courses') + 1];
      this.loadCourse();
    }
  }

  async loadCourse() {
    if (!this.courseId) return;

    try {
      this.loading = true;
      this.render();

      const course = await window.SchoolApp.apiCall(`/courses/${this.courseId}`);
      this.course = course;
      this.loading = false;
      this.render();
      this.populateForm();
    } catch (error) {
      this.loading = false;
      this.render();
      console.error('Failed to load course:', error);
      window.SchoolApp.showFlash('Failed to load course', 'error');
    }
  }

  populateForm() {
    if (!this.course) return;

    const titleInput = this.querySelector('#title');
    const descriptionInput = this.querySelector('#description');
    const teacherSelect = this.querySelector('#teacher_id');
    const publishedCheckbox = this.querySelector('#is_published');
    const videoUrlInput = this.querySelector('#video_url');
    const categorySelect = this.querySelector('#category');
    const levelSelect = this.querySelector('#level');

    if (titleInput) titleInput.value = this.course.title || '';
    if (descriptionInput) descriptionInput.value = this.course.description || '';
    if (teacherSelect) teacherSelect.value = this.course.teacher_id || '';
    if (publishedCheckbox) publishedCheckbox.checked = this.course.is_published || false;
    if (videoUrlInput) videoUrlInput.value = this.course.video_url || '';
    if (categorySelect) categorySelect.value = this.course.category || '';
    if (levelSelect) levelSelect.value = this.course.level || '';
  }

  async loadTeachers() {
    try {
      // Check if SchoolApp is available
      if (!window.SchoolApp || !window.SchoolApp.getCurrentUser || !window.SchoolApp.apiCall) {
        throw new Error('SchoolApp is not available');
      }

      const user = window.SchoolApp.getCurrentUser();
      
      if (user?.role === 'teacher') {
        // Teachers can only create courses for themselves
        this.teachers = [user];
        this.populateTeacherSelect();
      } else if (user?.role === 'admin') {
        // Admins can create courses for any teacher
        const data = await window.SchoolApp.apiCall('/users?role=teacher');
        this.teachers = data.users || [];
        this.populateTeacherSelect();
      }
    } catch (error) {
      console.error('Failed to load teachers:', error);
      // Show error in the teacher select
      const teacherSelect = this.querySelector('#teacher_id');
      if (teacherSelect) {
        teacherSelect.innerHTML = '<option value="">Error loading teachers</option>';
        teacherSelect.disabled = true;
      }
    }
  }

  populateTeacherSelect() {
    const teacherSelect = this.querySelector('#teacher_id');
    if (!teacherSelect) return;

    // Clear existing options
    teacherSelect.innerHTML = '<option value="">Select a teacher</option>';
    
    // Add teacher options
    this.teachers.forEach(teacher => {
      const option = document.createElement('option');
      option.value = teacher.id;
      option.textContent = teacher.name;
      teacherSelect.appendChild(option);
    });

    // Auto-select current user if they're a teacher
    const user = window.SchoolApp?.getCurrentUser();
    if (user?.role === 'teacher') {
      teacherSelect.value = user.id;
      teacherSelect.disabled = true; // Teachers can't change the teacher
    }
  }

  render() {
    const user = window.SchoolApp?.getCurrentUser();
    const isTeacher = user?.role === 'teacher';
    const isAdmin = user?.role === 'admin';

    this.innerHTML = html`
      <form id="course-form" class="space-y-6">
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">
            ${this.isEdit ? 'Edit Course Information' : 'Course Information'}
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="title" class="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
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
              <label for="teacher_id" class="block text-sm font-medium text-gray-700 mb-2">
                Teacher ${isTeacher ? '(You)' : '*'}
              </label>
              <select 
                id="teacher_id" 
                name="teacher_id" 
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                ${isTeacher ? 'disabled' : ''}
              >
                <option value="">Select a teacher</option>
              </select>
              ${isTeacher ? html`
                <p class="text-sm text-gray-500 mt-1">You are creating this course for yourself</p>
              ` : ''}
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label for="category" class="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select 
                id="category" 
                name="category" 
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a category</option>
                <option value="web-dev">Web Development</option>
                <option value="mobile">Mobile Development</option>
                <option value="data-science">Data Science</option>
                <option value="design">Design</option>
                <option value="programming">Programming</option>
                <option value="database">Database</option>
                <option value="devops">DevOps</option>
                <option value="general">General</option>
              </select>
            </div>
            
            <div>
              <label for="level" class="block text-sm font-medium text-gray-700 mb-2">Level *</label>
              <select 
                id="level" 
                name="level" 
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
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
              <span class="ml-2 text-sm text-gray-700">Publish this course immediately</span>
            </label>
            <p class="text-sm text-gray-500 mt-1">Unpublished courses are saved as drafts and can be published later</p>
          </div>
        </div>
        
        <!-- Course Content Section -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-800 mb-4">Course Content</h2>
          
          <!-- Video URL Section -->
          <div class="mb-6">
            <label for="video_url" class="block text-sm font-medium text-gray-700 mb-2">Video URL</label>
            <input 
              type="url" 
              id="video_url" 
              name="video_url" 
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
            >
            <p class="text-sm text-gray-500 mt-1">Add a YouTube or Vimeo URL for your course video</p>
          </div>
          
          <!-- File Upload Section -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Course Files</label>
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input 
                type="file" 
                id="course_files" 
                name="course_files" 
                multiple 
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                class="hidden"
              >
              <div class="space-y-2">
                <i class="bi bi-cloud-upload text-4xl text-gray-400"></i>
                <div class="text-sm text-gray-600">
                  <label for="course_files" class="cursor-pointer text-blue-600 hover:text-blue-500">
                    Click to upload files
                  </label>
                  <span class="text-gray-500"> or drag and drop</span>
                </div>
                <p class="text-xs text-gray-500">PDF, DOC, PPT, TXT, ZIP files up to 10MB each</p>
              </div>
            </div>
            <div id="file-list" class="mt-4 space-y-2"></div>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button variant="outline" type="button" onclick="history.back()">
            Cancel
          </button>
          <button variant="primary" type="submit" id="submit-btn">
            <i class="bi bi-save mr-2"></i>
            ${this.isEdit ? 'Update Course' : 'Create Course'}
          </button>
        </div>
      </form>
    `;
  }

  setupEventListeners() {
    const form = this.querySelector('#course-form');
    const submitBtn = this.querySelector('#submit-btn');
    const fileInput = this.querySelector('#course_files');
    const fileList = this.querySelector('#file-list');
    
    // Store selected files
    this.selectedFiles = [];

    // File input change handler
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFileSelection(e.target.files);
      });
    }

    // Drag and drop handlers
    const dropZone = this.querySelector('.border-dashed');
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-400', 'bg-blue-50');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-400', 'bg-blue-50');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-400', 'bg-blue-50');
        this.handleFileSelection(e.dataTransfer.files);
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      this.loading = true;
      submitBtn.setAttribute('loading', '');
      
      try {
        const formData = new FormData(form);
        const user = window.SchoolApp?.getCurrentUser();
        
        // Prepare course data
        const courseData = {
          title: formData.get('title'),
          description: formData.get('description'),
          video_url: formData.get('video_url'),
          category: formData.get('category'),
          level: formData.get('level'),
          is_published: formData.has('is_published')
        };

        // Handle teacher selection based on user role
        if (user?.role === 'teacher') {
          // Teachers can only create courses for themselves
          courseData.teacher_id = user.id;
        } else if (user?.role === 'admin') {
          // Admins can create courses for any teacher
          const teacherId = formData.get('teacher_id');
          if (!teacherId) {
            throw new Error('Please select a teacher');
          }
          courseData.teacher_id = teacherId;
        } else {
          throw new Error('You do not have permission to create courses');
        }

        // Validate required fields
        if (!courseData.title.trim()) {
          throw new Error('Course title is required');
        }
        if (!courseData.category) {
          throw new Error('Course category is required');
        }
        if (!courseData.level) {
          throw new Error('Course level is required');
        }

        let response;
        if (this.isEdit) {
          response = await window.SchoolApp.apiCall(`/courses/${this.courseId}`, {
            method: 'PUT',
            body: JSON.stringify(courseData)
          });
          window.SchoolApp.showFlash('Course updated successfully!', 'success');
        } else {
          response = await window.SchoolApp.apiCall('/courses', {
            method: 'POST',
            body: JSON.stringify(courseData)
          });
          window.SchoolApp.showFlash('Course created successfully!', 'success');
        }
        
        // Get the course ID from response
        const courseId = response.id || this.courseId;
        
        // Handle file uploads if any files are selected
        if (this.selectedFiles && this.selectedFiles.length > 0) {
          await this.uploadFiles(courseId);
        }
        
        // Redirect based on publication status
        if (courseData.is_published) {
          window.location.href = `/courses/${courseId}`;
        } else {
          window.location.href = `/courses/${courseId}?draft=true`;
        }
      } catch (error) {
        console.error('Course operation error:', error);
        window.SchoolApp.showFlash(error.message || `Failed to ${this.isEdit ? 'update' : 'create'} course`, 'error');
      } finally {
        this.loading = false;
        submitBtn.removeAttribute('loading');
      }
    });
  }

  handleFileSelection(files) {
    const fileList = this.querySelector('#file-list');
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip'];
    
    Array.from(files).forEach(file => {
      // Check file size
      if (file.size > maxSize) {
        window.SchoolApp.showFlash(`File ${file.name} is too large. Maximum size is 10MB.`, 'error');
        return;
      }
      
      // Check file type
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        window.SchoolApp.showFlash(`File type ${fileExtension} is not allowed.`, 'error');
        return;
      }
      
      // Add to selected files
      this.selectedFiles.push(file);
    });
    
    this.renderFileList();
  }

  renderFileList() {
    const fileList = this.querySelector('#file-list');
    if (!fileList) return;
    
    if (this.selectedFiles.length === 0) {
      fileList.innerHTML = '';
      return;
    }
    
    fileList.innerHTML = this.selectedFiles.map((file, index) => html`
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center space-x-3">
          <i class="bi ${this.getFileIcon(file.name)} text-blue-600"></i>
          <div>
            <p class="text-sm font-medium text-gray-800">${file.name}</p>
            <p class="text-xs text-gray-500">${this.formatFileSize(file.size)}</p>
          </div>
        </div>
        <button 
          type="button" 
          class="text-red-600 hover:text-red-800"
          onclick="this.getRootNode().host.removeFile(${index})"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    `).join('');
  }

  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    this.renderFileList();
  }

  getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const icons = {
      pdf: 'bi-file-earmark-pdf',
      doc: 'bi-file-earmark-word',
      docx: 'bi-file-earmark-word',
      ppt: 'bi-file-earmark-ppt',
      pptx: 'bi-file-earmark-ppt',
      txt: 'bi-file-earmark-text',
      zip: 'bi-file-earmark-zip'
    };
    return icons[extension] || 'bi-file-earmark';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async uploadFiles(courseId) {
    try {
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const file = this.selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('course_id', courseId);
        formData.append('title', file.name);
        formData.append('file_type', this.getFileType(file.name));
        formData.append('file_order', i + 1);

        await window.SchoolApp.apiCall('/files/upload', {
          method: 'POST',
          body: formData
        });
      }
      
      window.SchoolApp.showFlash('Files uploaded successfully!', 'success');
    } catch (error) {
      console.error('File upload error:', error);
      window.SchoolApp.showFlash('Some files failed to upload', 'warning');
    }
  }

  getFileType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const typeMap = {
      pdf: 'pdf',
      doc: 'document',
      docx: 'document',
      ppt: 'document',
      pptx: 'document',
      txt: 'document',
      zip: 'archive'
    };
    return typeMap[extension] || 'document';
  }
}
customElements.define("course-form", CourseForm);
