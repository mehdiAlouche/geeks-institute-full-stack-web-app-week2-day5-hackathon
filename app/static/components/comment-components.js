const html = String.raw;

// Comment Component
class CommentItem extends HTMLElement {
  static get observedAttributes() {
    return ['comment-id', 'user-name', 'user-role', 'comment-text', 'likes', 'created-at', 'is-liked'];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const commentId = this.getAttribute('comment-id') || '';
    const userName = this.getAttribute('user-name') || 'Unknown User';
    const userRole = this.getAttribute('user-role') || 'student';
    const commentText = this.getAttribute('comment-text') || '';
    const likes = parseInt(this.getAttribute('likes') || '0');
    const createdAt = this.getAttribute('created-at') || '';
    const isLiked = this.getAttribute('is-liked') === 'true';

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
      <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div class="flex items-start space-x-3">
          <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-semibold">${userName.charAt(0).toUpperCase()}</span>
          </div>
          
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <span class="font-semibold text-gray-800">${userName}</span>
              <app-badge variant="${userRole === 'admin' ? 'danger' : userRole === 'teacher' ? 'primary' : 'success'}" size="sm">
                <i class="bi ${roleIcons[userRole]} mr-1"></i>
                ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </app-badge>
              <span class="text-xs text-gray-500">${this.formatDate(createdAt)}</span>
            </div>
            
            <p class="text-gray-700 mb-3">${commentText}</p>
            
            <div class="flex items-center space-x-4">
              <button class="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors ${isLiked ? 'text-blue-600' : ''}" id="like-btn">
                <i class="bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}"></i>
                <span>${likes}</span>
              </button>
              <button class="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors" id="reply-btn">
                <i class="bi bi-reply"></i>
                <span>Reply</span>
              </button>
            </div>
            
            <!-- Reply Form (hidden by default) -->
            <div class="mt-4 hidden" id="reply-form">
              <div class="bg-gray-50 rounded-lg p-3">
                <textarea 
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" 
                  rows="2" 
                  placeholder="Write a reply..."
                  id="reply-text"
                ></textarea>
                <div class="flex justify-end space-x-2 mt-2">
                  <button class="px-3 py-1 text-gray-600 hover:text-gray-800" id="cancel-reply">Cancel</button>
                  <button class="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" id="submit-reply">Reply</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    this.addEventListener('click', async (e) => {
      const commentId = this.getAttribute('comment-id');
      
      if (e.target.closest('#like-btn')) {
        e.preventDefault();
        await this.toggleLike(commentId);
      } else if (e.target.closest('#reply-btn')) {
        e.preventDefault();
        this.toggleReplyForm();
      } else if (e.target.closest('#cancel-reply')) {
        e.preventDefault();
        this.toggleReplyForm();
      } else if (e.target.closest('#submit-reply')) {
        e.preventDefault();
        await this.submitReply(commentId);
      }
    });
  }

  async toggleLike(commentId) {
    try {
      const isLiked = this.getAttribute('is-liked') === 'true';
      const currentLikes = parseInt(this.getAttribute('likes') || '0');
      
      const response = await window.SchoolApp.apiCall(`/comments/${commentId}/like`, {
        method: isLiked ? 'DELETE' : 'POST'
      });
      
      const newLikes = isLiked ? currentLikes - 1 : currentLikes + 1;
      this.setAttribute('likes', newLikes.toString());
      this.setAttribute('is-liked', (!isLiked).toString());
      this.render();
      
    } catch (error) {
      console.error('Like toggle error:', error);
    }
  }

  toggleReplyForm() {
    const form = this.querySelector('#reply-form');
    form.classList.toggle('hidden');
  }

  async submitReply(commentId) {
    const replyText = this.querySelector('#reply-text').value.trim();
    if (!replyText) return;

    try {
      await window.SchoolApp.apiCall('/comments', {
        method: 'POST',
        body: JSON.stringify({
          file_id: this.getAttribute('file-id'),
          parent_id: commentId,
          comment: replyText
        })
      });

      window.SchoolApp.showFlash('Reply posted successfully!', 'success');
      this.querySelector('#reply-text').value = '';
      this.toggleReplyForm();
      
      // Refresh comments
      const commentSection = this.closest('comment-section');
      if (commentSection) {
        commentSection.loadComments();
      }
      
    } catch (error) {
      console.error('Reply submission error:', error);
    }
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
}
customElements.define("comment-item", CommentItem);

// Comment Section Component
class CommentSection extends HTMLElement {
  static get observedAttributes() {
    return ['file-id'];
  }

  constructor() {
    super();
    this.comments = [];
    this.loading = true;
  }

  connectedCallback() {
    this.render();
    this.loadComments();
  }

  attributeChangedCallback() {
    this.loadComments();
  }

  async loadComments() {
    const fileId = this.getAttribute('file-id');
    if (!fileId) return;

    try {
      this.loading = true;
      this.render();

      const response = await window.SchoolApp.apiCall(`/comments?file_id=${fileId}`);
      this.comments = response.comments || [];
      this.loading = false;
      this.render();
    } catch (error) {
      this.loading = false;
      this.render();
      console.error('Failed to load comments:', error);
    }
  }

  render() {
    if (this.loading) {
      this.innerHTML = html`
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Comments</h3>
          <div class="space-y-4">
            ${Array(3).fill(0).map(() => html`
              <div class="animate-pulse">
                <div class="flex items-start space-x-3">
                  <div class="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div class="flex-1">
                    <div class="h-4 bg-gray-300 rounded mb-2"></div>
                    <div class="h-3 bg-gray-300 rounded mb-2"></div>
                    <div class="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      return;
    }

    this.innerHTML = html`
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Comments (${this.comments.length})</h3>
        
        <!-- Add Comment Form -->
        <div class="mb-6">
          <textarea 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" 
            rows="3" 
            placeholder="Add a comment..."
            id="new-comment"
          ></textarea>
          <div class="flex justify-end mt-2">
            <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" id="submit-comment">
              <i class="bi bi-send mr-2"></i>
              Post Comment
            </button>
          </div>
        </div>
        
        <!-- Comments List -->
        <div class="space-y-4">
          ${this.comments.length === 0 ? html`
            <empty-state 
              title="No comments yet"
              description="Be the first to comment on this lesson!"
              icon="bi-chat"
            ></empty-state>
          ` : this.comments.map(comment => html`
            <comment-item
              comment-id="${comment.id}"
              user-name="${comment.user_name}"
              user-role="${comment.user_role}"
              comment-text="${comment.comment}"
              likes="${comment.likes}"
              created-at="${comment.created_at}"
              is-liked="${comment.is_liked || false}"
              file-id="${this.getAttribute('file-id')}"
            ></comment-item>
          `).join('')}
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    this.addEventListener('click', async (e) => {
      if (e.target.closest('#submit-comment')) {
        e.preventDefault();
        await this.submitComment();
      }
    });
  }

  async submitComment() {
    const fileId = this.getAttribute('file-id');
    const commentText = this.querySelector('#new-comment').value.trim();
    
    if (!commentText) {
      window.SchoolApp.showFlash('Please enter a comment', 'warning');
      return;
    }

    try {
      await window.SchoolApp.apiCall('/comments', {
        method: 'POST',
        body: JSON.stringify({
          file_id: fileId,
          comment: commentText
        })
      });

      window.SchoolApp.showFlash('Comment posted successfully!', 'success');
      this.querySelector('#new-comment').value = '';
      this.loadComments();
      
    } catch (error) {
      console.error('Comment submission error:', error);
    }
  }
}
customElements.define("comment-section", CommentSection);
