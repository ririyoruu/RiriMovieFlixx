// RiriMovieFlix - Complete API Integration
// Inspired by VVID with Maroon Theme

// API Configuration
const API_CONFIG = {
  tmdb: {
    key: 'a1e72fd93ed59f56e6332813b9f8dcae',
    baseUrl: 'https://api.themoviedb.org/3',
    imageUrl: 'https://image.tmdb.org/t/p/original'
  },
  omdb: {
    key: 'YOUR_OMDB_API_KEY', // Get from http://www.omdbapi.com/apikey.aspx
    baseUrl: 'https://www.omdbapi.com'
  },
  youtube: {
    key: 'YOUR_YOUTUBE_API_KEY', // Get from https://console.developers.google.com/
    baseUrl: 'https://www.googleapis.com/youtube/v3'
  }
};

// Streaming Servers (like VVID)
const STREAMING_SERVERS = {
  vidsrc: 'https://vidsrc.to/embed/movie/',
  vidsrcme: 'https://vidsrc.me/embed/movie/',
  superembed: 'https://www.2embed.to/embed/tmdb/movie/'
};

// Global Variables
let currentMovie = null;
let currentServer = 'vidsrc';
let myList = JSON.parse(localStorage.getItem('myList')) || [];
let searchTimeout = null;

// Genre Mapping
const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  showLoading(true);
  
  try {
    // Load initial content
    await loadTrendingMovies();
    await loadPopularMovies();
    await loadTVShows();
    await loadLiveChannels();
    loadMyList();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup search
    setupSearch();
    
    console.log('RiriMovieFlix initialized successfully!');
  } catch (error) {
    console.error('Error initializing app:', error);
    showNotification('Error loading content. Please try again.', 'error');
  } finally {
    showLoading(false);
  }
}

// Event Listeners
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const category = link.dataset.category;
      showCategory(category);
      
      // Update active state
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
  
  // Hero buttons
  document.getElementById('play-btn').addEventListener('click', playRandomContent);
  document.getElementById('info-btn').addEventListener('click', showRandomInfo);
  
  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);
  document.getElementById('modal-play').addEventListener('click', playMovie);
  document.getElementById('modal-add').addEventListener('click', addToMyList);
  document.getElementById('modal-download').addEventListener('click', downloadMovie);
  
  // Video modal
  document.getElementById('video-close').addEventListener('click', closeVideoModal);
  document.getElementById('video-overlay').addEventListener('click', closeVideoModal);
  
  // Server selection
  document.querySelectorAll('.server-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentServer = btn.dataset.server;
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeVideoModal();
    }
  });
}

// Search Functionality
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
      searchResults.style.display = 'none';
      return;
    }
    
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);
  });
  
  // Hide results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchResults.style.display = 'none';
    }
  });
}

async function performSearch(query) {
  const searchResults = document.getElementById('search-results');
  
  try {
    const response = await fetch(`${API_CONFIG.tmdb.baseUrl}/search/multi?api_key=${API_CONFIG.tmdb.key}&query=${encodeURIComponent(query)}&page=1`);
    const data = await response.json();
    
    const results = (data.results || []).slice(0, 6).filter(item => 
      (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
    );
    
    if (results.length === 0) {
      searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">No results found</div>';
    } else {
      searchResults.innerHTML = results.map(item => `
        <div class="search-result-item" onclick="selectSearchResult(${JSON.stringify(item).replace(/"/g, '&quot;')})">
          <img src="${API_CONFIG.tmdb.imageUrl}${item.poster_path}" alt="${item.title || item.name}" />
          <div class="search-result-info">
            <h4>${item.title || item.name}</h4>
            <p>${item.media_type === 'movie' ? 'Movie' : 'TV Show'} • ${item.release_date ? new Date(item.release_date).getFullYear() : 'N/A'}</p>
          </div>
        </div>
      `).join('');
    }
    
    searchResults.style.display = 'block';
  } catch (error) {
    console.error('Search error:', error);
    searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">Search error</div>';
    searchResults.style.display = 'block';
  }
}

function selectSearchResult(item) {
  const searchResults = document.getElementById('search-results');
  const searchInput = document.getElementById('search-input');
  
  searchResults.style.display = 'none';
  searchInput.value = '';
  
  showMovieDetails(item);
}

// Content Loading Functions
async function loadTrendingMovies() {
  try {
    const response = await fetch(`${API_CONFIG.tmdb.baseUrl}/trending/movie/week?api_key=${API_CONFIG.tmdb.key}`);
    const data = await response.json();
    displayMovies(data.results, 'trending-movies');
  } catch (error) {
    console.error('Error loading trending movies:', error);
  }
}

async function loadPopularMovies() {
  try {
    const response = await fetch(`${API_CONFIG.tmdb.baseUrl}/movie/popular?api_key=${API_CONFIG.tmdb.key}`);
    const data = await response.json();
    displayMovies(data.results, 'popular-movies');
  } catch (error) {
    console.error('Error loading popular movies:', error);
  }
}

async function loadTVShows() {
  try {
    const response = await fetch(`${API_CONFIG.tmdb.baseUrl}/tv/popular?api_key=${API_CONFIG.tmdb.key}`);
    const data = await response.json();
    displayMovies(data.results, 'tv-shows');
  } catch (error) {
    console.error('Error loading TV shows:', error);
  }
}

function loadLiveChannels() {
  const channels = generateLiveChannels();
  displayMovies(channels, 'live-channels');
}

function loadMyList() {
  displayMovies(myList, 'my-list');
}

// Display Functions
function displayMovies(movies, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  movies.forEach(movie => {
    const movieCard = createMovieCard(movie);
    container.appendChild(movieCard);
  });
}

function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.onclick = () => showMovieDetails(movie);
  
  const imageUrl = movie.poster_path ? 
    `${API_CONFIG.tmdb.imageUrl}${movie.poster_path}` : 
    'https://via.placeholder.com/200x300/2a2a2a/ffffff?text=No+Image';
  
  card.innerHTML = `
    <img src="${imageUrl}" alt="${movie.title || movie.name}" loading="lazy">
    <div class="movie-info">
      <h3 class="movie-title">${movie.title || movie.name}</h3>
      <div class="movie-meta">
        <span class="movie-rating">★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
        <span>${movie.release_date ? new Date(movie.release_date).getFullYear() : ''}</span>
      </div>
    </div>
    ${movie.is_live ? '<div class="live-indicator">LIVE</div>' : ''}
  `;
  
  return card;
}

// Movie Details Modal
function showMovieDetails(movie) {
  currentMovie = movie;
  const modal = document.getElementById('movie-modal');
  const poster = document.getElementById('modal-poster');
  const title = document.getElementById('modal-title');
  const year = document.getElementById('modal-year');
  const rating = document.getElementById('modal-rating');
  const genre = document.getElementById('modal-genre');
  const description = document.getElementById('modal-description');
  
  // Set content
  poster.src = movie.poster_path ? 
    `${API_CONFIG.tmdb.imageUrl}${movie.poster_path}` : 
    'https://via.placeholder.com/300x450/2a2a2a/ffffff?text=No+Image';
  
  title.textContent = movie.title || movie.name;
  year.textContent = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
  rating.textContent = `★ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}`;
  genre.textContent = getGenres(movie);
  description.textContent = movie.overview || 'No description available.';
  
  // Show seasons for TV shows
  if (movie.media_type === 'tv') {
    loadSeasons(movie.id);
  } else {
    document.getElementById('seasons-section').style.display = 'none';
    document.getElementById('episodes-section').style.display = 'none';
  }
  
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

async function loadSeasons(tvId) {
  try {
    const response = await fetch(`${API_CONFIG.tmdb.baseUrl}/tv/${tvId}?api_key=${API_CONFIG.tmdb.key}`);
    const data = await response.json();
    
    const seasonsSection = document.getElementById('seasons-section');
    const seasonsList = document.getElementById('seasons-list');
    
    seasonsSection.style.display = 'block';
    seasonsList.innerHTML = '';
    
    for (let i = 1; i <= Math.min(data.number_of_seasons || 1, 10); i++) {
      const seasonBtn = document.createElement('button');
      seasonBtn.className = 'season-btn';
      seasonBtn.textContent = `Season ${i}`;
      seasonBtn.onclick = () => loadEpisodes(tvId, i);
      seasonsList.appendChild(seasonBtn);
    }
  } catch (error) {
    console.error('Error loading seasons:', error);
  }
}

async function loadEpisodes(tvId, seasonNumber) {
  try {
    const response = await fetch(`${API_CONFIG.tmdb.baseUrl}/tv/${tvId}/season/${seasonNumber}?api_key=${API_CONFIG.tmdb.key}`);
    const data = await response.json();
    
    const episodesSection = document.getElementById('episodes-section');
    const episodesList = document.getElementById('episodes-list');
    
    episodesSection.style.display = 'block';
    episodesList.innerHTML = '';
    
    data.episodes.forEach((episode, index) => {
      const episodeBtn = document.createElement('button');
      episodeBtn.className = 'episode-btn';
      episodeBtn.innerHTML = `
        <div>
          <strong>Episode ${index + 1}: ${episode.name}</strong>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
            ${episode.overview || 'No description available.'}
          </div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          ${episode.runtime ? `${episode.runtime}min` : '45min'}
        </div>
      `;
      episodeBtn.onclick = () => playEpisode(tvId, seasonNumber, index + 1);
      episodesList.appendChild(episodeBtn);
    });
  } catch (error) {
    console.error('Error loading episodes:', error);
  }
}

// Playback Functions
function playMovie() {
  if (!currentMovie) return;
  
  const videoUrl = getStreamingUrl(currentMovie.id, currentMovie.media_type);
  openVideoModal(videoUrl);
}

function playEpisode(tvId, seasonNumber, episodeNumber) {
  const videoUrl = getStreamingUrl(tvId, 'tv', seasonNumber, episodeNumber);
  openVideoModal(videoUrl);
}

function getStreamingUrl(id, type, season = null, episode = null) {
  const server = STREAMING_SERVERS[currentServer];
  
  if (type === 'movie') {
    return `${server}${id}`;
  } else if (type === 'tv' && season && episode) {
    return `${server}${id}/${season}/${episode}`;
  }
  
  return `${server}${id}`;
}

function openVideoModal(videoUrl) {
  const videoModal = document.getElementById('video-modal');
  const videoIframe = document.getElementById('video-iframe');
  
  videoIframe.src = videoUrl;
  videoModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
  const videoModal = document.getElementById('video-modal');
  const videoIframe = document.getElementById('video-iframe');
  
  videoIframe.src = '';
  videoModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Utility Functions
function closeModal() {
  const modal = document.getElementById('movie-modal');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

function addToMyList() {
  if (!currentMovie) return;
  
  if (!myList.some(item => item.id === currentMovie.id)) {
    myList.push(currentMovie);
    localStorage.setItem('myList', JSON.stringify(myList));
    showNotification(`${currentMovie.title || currentMovie.name} added to My List`);
    loadMyList();
  } else {
    showNotification(`${currentMovie.title || currentMovie.name} is already in My List`);
  }
}

function downloadMovie() {
  if (!currentMovie) return;
  showNotification(`Download started: ${currentMovie.title || currentMovie.name}`);
}

function playRandomContent() {
  // Get random movie from trending
  const trendingContainer = document.getElementById('trending-movies');
  const movies = Array.from(trendingContainer.children);
  if (movies.length > 0) {
    const randomMovie = movies[Math.floor(Math.random() * movies.length)];
    randomMovie.click();
  }
}

function showRandomInfo() {
  playRandomContent();
}

function showCategory(category) {
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => section.style.display = 'none');
  
  const targetSection = document.getElementById(`${category}-section`);
  if (targetSection) {
    targetSection.style.display = 'block';
  }
}

function getGenres(movie) {
  if (movie.genre_ids) {
    return movie.genre_ids.map(id => GENRE_MAP[id] || '').filter(Boolean).join(', ');
  }
  if (movie.genres) {
    return movie.genres.map(g => g.name).join(', ');
  }
  return 'Unknown';
}

function generateLiveChannels() {
  const channels = [
    'CNN', 'ESPN', 'Discovery', 'HBO', 'National Geographic',
    'Cartoon Network', 'MTV', 'History Channel', 'BBC', 'Fox News'
  ];
  
  return channels.map((channel, index) => ({
    id: `live-${index}`,
    title: channel,
    name: channel,
    poster_path: `https://via.placeholder.com/200x300/${Math.floor(Math.random()*16777215).toString(16)}/ffffff?text=${encodeURIComponent(channel)}`,
    vote_average: 8.0 + Math.random() * 2,
    release_date: '2024-01-01',
    overview: `Live ${channel} content`,
    media_type: 'live',
    is_live: true
  }));
}

function showLoading(show) {
  const spinner = document.getElementById('loading-spinner');
  spinner.style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? 'var(--primary-maroon)' : 'var(--accent-maroon)'};
    color: var(--text-primary);
    padding: 1rem 1.5rem;
    border-radius: 6px;
    box-shadow: var(--shadow-lg);
    z-index: 5000;
    font-weight: 500;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
