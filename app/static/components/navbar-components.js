html = String.raw;

class Navbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = html`
      <nav
        class="bg-gray-800 p-4 backdrop-blur-sm sticky top-0 z-50 bg-opacity-50"
      >
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex items-center justify-between">
            <a href="/" class="text-white text-2xl font-bold">Movies</a>

            <a href="/new" class="text-white hover:text-gray-300">
              <button
                class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                <i class="bi bi-plus-circle"></i>
                Add Movie
              </button>
            </a>
          </div>
        </div>
      </nav>
    `;
  }
}

customElements.define("navbar-component", Navbar);
