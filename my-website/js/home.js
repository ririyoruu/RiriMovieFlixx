const API_KEY = 'a1e72fd93ed59f56e6332813b9f8dcae';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem;
let slideshowInterval;
let currentSlide = 0;
let myList = JSON.parse(localStorage.getItem('myList')) || [];
let scrollPosition = 0;
let lastActiveSection = 'movies';

// Helper to get genre names from TMDB genre IDs
const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary',
  18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller',
  10752: 'War', 37: 'Western', 10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
  10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics', 10769: 'Foreign'
};

// Helper to get country name (fallback to code)
function getCountry(item) {
  if (item.origin_country && item.origin_country.length) return item.origin_country[0];
  if (item.production_countries && item.production_countries.length) return item.production_countries[0].iso_3166_1;
  return '';
}

// Helper to get genre names
function getGenres(item) {
  if (item.genre_ids && Array.isArray(item.genre_ids)) {
    return item.genre_ids.map(id => GENRE_MAP[id] || '').filter(Boolean).join(', ');
  }
  if (item.genres && Array.isArray(item.genres)) {
    return item.genres.map(g => g.name).join(', ');
  }
  return '';
}

// Toggle description expand/collapse
function toggleDescription() {
  const desc = document.getElementById('modal-description');
  const arrow = document.getElementById('desc-toggle-arrow');
  if (!desc) return;
  if (desc.style.maxHeight === 'none') {
    desc.style.maxHeight = '120px';
    arrow.style.transform = 'rotate(0deg)';
  } else {
    desc.style.maxHeight = 'none';
    arrow.style.transform = 'rotate(180deg)';
  }
}

// Populate 'You May Also Like' with placeholder recommendations
function populateRecommendations() {
  const recommendList = document.getElementById('recommend-list');
  if (!recommendList) return;
  recommendList.innerHTML = '';
  // Placeholder: show 4 random movie posters from trending
  if (window._trendingMovies && window._trendingMovies.length) {
    window._trendingMovies.slice(0, 4).forEach(item => {
      const div = document.createElement('div');
      div.className = 'recommend-item';
      div.innerHTML = `<img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" style="width:90px;height:135px;border-radius:6px;cursor:pointer;" />`;
      div.onclick = () => autoPlayVideo(item);
      recommendList.appendChild(div);
    });
  }
}

// Server selector logic
let currentServer = 'sherry';
function setServer(server) {
  currentServer = server;
  document.querySelectorAll('.server-selector button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.server === server);
  });
  // Re-play video with new server
  if (currentItem) autoPlayVideo(currentItem, true);
}

// Auto-play functionality with Netflix-style modal
async function autoPlayVideo(item, keepServer) {
  try {
    currentItem = item;
    const type = item.media_type === "movie" ? "movie" : "tv";
    const modal = document.getElementById('modal');
    const modalVideo = document.getElementById('modal-video');
    const modalTitle = document.getElementById('modal-title');
    const modalImage = document.getElementById('modal-image');
    const modalDescription = document.getElementById('modal-description');
    const modalYear = document.getElementById('modal-year');
    const modalGenre = document.getElementById('modal-genre');
    const modalRating = document.getElementById('modal-rating');
    const modalVotes = document.getElementById('modal-votes');
    // Details
    modalTitle.textContent = item.title || item.name;
    modalYear.textContent = item.release_date ? new Date(item.release_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    modalGenre.textContent = getGenres(item);
    modalRating.textContent = item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : '';
    modalVotes.textContent = item.vote_count ? `(${item.vote_count})` : '';
    // Description
    modalDescription.textContent = item.overview || '';
    modalDescription.style.maxHeight = '120px';
    document.getElementById('desc-toggle-arrow').style.transform = 'rotate(0deg)';
    // Video or poster
    document.querySelector('.modal-video-wrapper').style.display = 'block';
    modalVideo.style.display = 'block';
    modalImage.style.display = 'none';
    // Server selector
    let serverRow = document.querySelector('.server-selector');
    if (!serverRow) {
      serverRow = document.createElement('div');
      serverRow.className = 'server-selector';
      serverRow.innerHTML = `<label>Select Server:</label>
        <button data-server="sherry" class="active">SHERRY</button>
        <button data-server="chianti">CHIANTI</button>`;
      document.querySelector('.modal-details').insertBefore(serverRow, document.querySelector('.modal-description-section'));
      serverRow.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => setServer(btn.dataset.server);
      });
    }
    // Set active server
    serverRow.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.server === currentServer);
    });
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Play video
    const servers = {
      sherry: `https://vidsrc.cc/v2/embed/${type}/${item.id}`,
      chianti: `https://vidsrc.net/embed/${type}/?tmdb=${item.id}`
    };
    modalVideo.src = servers[currentServer] || servers.sherry;
    // Recommendations
    if (!window._trendingMovies) {
      window._trendingMovies = await fetchTrending('movie');
    }
    populateRecommendations();
  } catch (error) {
    console.error('Error in autoPlayVideo:', error);
  }
}

// Fetch trending content with error handling
async function fetchTrending(type) {
  try {
    const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    return data.results;
  } catch (error) {
    console.error(`Error fetching trending ${type}:`, error);
    return [];
  }
}

// Fetch popular content
async function fetchPopular(type) {
  try {
    const res = await fetch(`${BASE_URL}/${type}/popular?api_key=${API_KEY}`);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    return data.results;
  } catch (error) {
    console.error(`Error fetching popular ${type}:`, error);
    return [];
  }
}

// Fetch top rated content
async function fetchTopRated(type) {
  try {
    const res = await fetch(`${BASE_URL}/${type}/top_rated?api_key=${API_KEY}`);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    return data.results;
  } catch (error) {
    console.error(`Error fetching top rated ${type}:`, error);
    return [];
  }
}

// Fetch anime with better filtering
async function fetchTrendingAnime() {
  try {
    let allResults = [];
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      const filtered = data.results.filter(item =>
        (item.original_language === 'ja' || item.genre_ids.includes(16)) &&
        item.poster_path
      );
      allResults = allResults.concat(filtered);
    }
    return allResults;
  } catch (error) {
    console.error('Error fetching anime:', error);
    return [];
  }
}

// Update slideshow
function updateSlideshow(items) {
  const slideshow = document.querySelector('.slideshow');
  slideshow.innerHTML = '';
  
  items.forEach((item, index) => {
    const slide = document.createElement('div');
    slide.className = `slide ${index === 0 ? 'active' : ''}`;
    slide.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path || item.poster_path})`;
    
    const content = document.createElement('div');
    content.className = 'slide-content';
    content.innerHTML = `
      <h1>${item.title || item.name}</h1>
      <div class="hero-buttons">
        <button class="play-btn" onclick="autoPlayVideo(${JSON.stringify(item)})">
          <i class="fas fa-play"></i> Play
        </button>
        <button class="more-info-btn" onclick="showDetails(${JSON.stringify(item)})">
          <i class="fas fa-info-circle"></i> More Info
        </button>
      </div>
    `;
    
    slide.appendChild(content);
    slideshow.appendChild(slide);
  });
  
  startSlideshow();
}

// Start slideshow
function startSlideshow() {
  const slides = document.querySelectorAll('.slide');
  if (slides.length <= 1) return;
  
  clearInterval(slideshowInterval);
  currentSlide = 0;
  
  slideshowInterval = setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }, 5000);
}

// Display a horizontal list of movie titles with small posters
function displayTitleList(items, containerId) {
  try {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => {
      if (!item.poster_path) return;
      const titleItem = document.createElement('div');
      titleItem.className = 'movie-title-item';
      titleItem.innerHTML = `
        <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" loading="lazy" />
        <span>${item.title || item.name}</span>
      `;
      titleItem.onclick = () => autoPlayVideo(item);
      container.appendChild(titleItem);
    });
  } catch (error) {
    console.error(`Error displaying title list ${containerId}:`, error);
  }
}

// Display movie list with enhanced UI and also show the title list
function displayList(items, containerId) {
  try {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    items.forEach(item => {
      if (!item.poster_path) return;
      const movieCard = document.createElement('div');
      movieCard.className = 'movie-card';
      const img = document.createElement('img');
      img.src = `${IMG_URL}${item.poster_path}`;
      img.alt = item.title || item.name;
      img.loading = 'lazy';
      const info = document.createElement('div');
      info.className = 'movie-info';
      info.innerHTML = `
        <h3>${item.title || item.name}</h3>
        <div class="rating">★ ${item.vote_average.toFixed(1)}</div>
        <div class="year">${item.release_date ? item.release_date.split('-')[0] : ''}</div>
      `;
      movieCard.appendChild(img);
      movieCard.appendChild(info);
      movieCard.onclick = () => autoPlayVideo(item);
      container.appendChild(movieCard);
    });
    // Also display the title list below the row
    if (containerId === 'movies-list') displayTitleList(items, 'movies-title-list');
    if (containerId === 'popular-movies-list') displayTitleList(items, 'popular-movies-title-list');
    if (containerId === 'tvshows-list') displayTitleList(items, 'tvshows-title-list');
    if (containerId === 'top-tvshows-list') displayTitleList(items, 'top-tvshows-title-list');
    if (containerId === 'anime-list') displayTitleList(items, 'anime-title-list');
    if (containerId === 'popular-anime-list') displayTitleList(items, 'popular-anime-title-list');
  } catch (error) {
    console.error(`Error displaying list ${containerId}:`, error);
  }
}

// Show category content
async function showCategory(category) {
  lastActiveSection = category;
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => section.classList.remove('active'));
  const activeSection = document.getElementById(`${category}-section`);
  if (activeSection) {
    activeSection.classList.add('active');
  }
  // Update navigation
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.category === category) {
      link.classList.add('active');
    }
  });
  // Load content based on category
  switch (category) {
    case 'movies':
      const [trendingMovies, popularMovies] = await Promise.all([
        fetchTrending('movie'),
        fetchPopular('movie')
      ]);
      displayList(trendingMovies, 'movies-list');
      displayList(popularMovies, 'popular-movies-list');
      updateSlideshow(trendingMovies);
      break;
    case 'tvshows':
      const [trendingTV, topTV] = await Promise.all([
        fetchTrending('tv'),
        fetchTopRated('tv')
      ]);
      displayList(trendingTV, 'tvshows-list');
      displayList(topTV, 'top-tvshows-list');
      updateSlideshow(trendingTV);
      break;
    case 'anime':
      const [trendingAnime, popularAnime] = await Promise.all([
        fetchTrendingAnime(),
        fetchTrendingAnime()
      ]);
      displayList(trendingAnime, 'anime-list');
      displayList(popularAnime, 'popular-anime-list');
      updateSlideshow(trendingAnime);
      break;
    case 'mylist':
      displayList(myList, 'mylist-content');
      break;
  }
}

// Add to my list
function addToMyList(item) {
  if (!myList.some(i => i.id === item.id)) {
    myList.push(item);
    localStorage.setItem('myList', JSON.stringify(myList));
  }
}

// --- Netflix-style Search Overlay Logic ---
function openSearchOverlay(initialValue = '') {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-panel-input');
  const results = document.getElementById('search-panel-results');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  input.value = initialValue;
  results.innerHTML = '';
  setTimeout(() => input.focus(), 10);
  if (initialValue) searchPanelTMDB();
}

function closeSearchOverlay() {
  const overlay = document.getElementById('search-overlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  showCategory(lastActiveSection);
}

function searchPanelTMDB() {
  const query = document.getElementById('search-panel-input').value.trim();
  const resultsContainer = document.getElementById('search-panel-results');
  if (!query) {
    resultsContainer.innerHTML = '';
    return;
  }
  resultsContainer.innerHTML = '<div style="color:#999;text-align:center;padding:2rem;">Searching...</div>';
  fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => {
      const filtered = (data.results || []).filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path);
      if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div style="color:#999;text-align:center;padding:2rem;">No results found</div>';
        return;
      }
      resultsContainer.innerHTML = filtered.map((item, idx) => `
        <div class="search-result" data-idx="${idx}">
          <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name}" />
          <div class="search-result-info">
            <h3>${item.title || item.name}</h3>
            <p>${item.media_type === 'movie' ? 'Movie' : 'TV Show'}</p>
            <div class="rating">★ ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</div>
          </div>
        </div>
      `).join('');
      // Add click handlers for each result
      Array.from(resultsContainer.querySelectorAll('.search-result')).forEach((el, idx) => {
        el.addEventListener('click', () => {
          closeSearchOverlay();
          setTimeout(() => autoPlayVideo(filtered[idx]), 100);
        });
      });
    })
    .catch(() => {
      resultsContainer.innerHTML = '<div style="color:#c00;text-align:center;padding:2rem;">Error searching. Please try again.</div>';
    });
}

function setupNetflixSearch() {
  // Navbar search bar triggers overlay
  const navbarSearch = document.getElementById('navbar-search');
  if (navbarSearch) {
    navbarSearch.addEventListener('focus', () => openSearchOverlay(navbarSearch.value));
    navbarSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openSearchOverlay(navbarSearch.value);
    });
  }
  // Overlay input events
  const panelInput = document.getElementById('search-panel-input');
  if (panelInput) {
    let searchTimeout;
    panelInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(searchPanelTMDB, 400);
    });
    panelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearchOverlay();
    });
  }
  // Close button
  const closeBtn = document.getElementById('close-search-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeSearchOverlay);
  // Overlay click outside panel closes
  const overlay = document.getElementById('search-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSearchOverlay();
    });
  }
  // Esc key closes overlay
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeSearchOverlay();
  });
}

// Initialize the page
async function init() {
  try {
    // Add category navigation handlers
    document.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        showCategory(link.dataset.category);
      });
    });
    // Show initial category
    await showCategory('movies');
    // Add scroll button handlers
    document.querySelectorAll('.scroll-btn').forEach(button => {
      button.addEventListener('click', () => {
        const movieRow = button.closest('.movie-row');
        const list = movieRow.querySelector('.list');
        const scrollAmount = button.classList.contains('left') ? -400 : 400;
        list.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      });
    });
    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal();
        closeSearchOverlay();
      }
    });
    // Setup Netflix search
    setupNetflixSearch();
  } catch (error) {
    console.error('Error initializing:', error);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Add loading indicator styles
const style = document.createElement('style');
style.textContent = `
  .loading-indicator {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1001;
    background: rgba(0,0,0,0.8);
    padding: 2rem;
    border-radius: 8px;
  }
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 5px solid rgba(255,255,255,0.1);
    border-top: 5px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .error-message {
    color: var(--primary-color);
    text-align: center;
    padding: 1rem;
    background: rgba(0,0,0,0.8);
    border-radius: 4px;
  }
  
  .no-results {
    color: #999;
    text-align: center;
    padding: 2rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Ensure main page is visible and last active section is shown when closing modal
function closeModal() {
  const modal = document.getElementById('modal');
  const modalVideo = document.getElementById('modal-video');
  modal.style.display = 'none';
  modalVideo.src = '';
  document.body.style.overflow = 'auto';
  showCategory(lastActiveSection);
}
