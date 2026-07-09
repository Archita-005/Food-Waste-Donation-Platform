// Platform State
let state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  donations: [],
  stats: null,
  activeView: 'landing',
  theme: localStorage.getItem('theme') || 'light-theme'
};

// API Base URL (Relative since served from single Express host)
const API_URL = '';

// DOM Elements cache
const els = {
  body: document.body,
  navLogo: document.getElementById('nav-logo'),
  guestNav: document.querySelector('.guest-nav-links'),
  authNav: document.querySelector('.auth-nav-links'),
  headerAvatar: document.getElementById('header-avatar'),
  dropdownName: document.getElementById('dropdown-name'),
  dropdownRole: document.getElementById('dropdown-role'),
  btnLogout: document.getElementById('btn-logout'),
  themeToggle: document.getElementById('theme-toggle'),
  themeIconDark: document.querySelector('.theme-icon-dark'),
  themeIconLight: document.querySelector('.theme-icon-light'),
  mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
  mobileDrawer: document.getElementById('mobile-nav-drawer'),
  closeDrawer: document.getElementById('close-drawer'),
  drawerLinks: document.getElementById('mobile-drawer-links'),
  toastContainer: document.getElementById('toast-container'),

  // Views
  views: {
    landing: document.getElementById('view-landing'),
    auth: document.getElementById('view-auth'),
    dashboard: document.getElementById('view-dashboard'),
    browse: document.getElementById('view-browse'),
    activity: document.getElementById('view-my-activity'),
    donate: document.getElementById('view-donate')
  },

  // Auth Forms
  btnRegisterTrigger: document.getElementById('btn-register-trigger'),
  btnLoginTrigger: document.getElementById('btn-login-trigger'),
  tabLogin: document.getElementById('tab-login'),
  tabRegister: document.getElementById('tab-register'),
  panelLogin: document.getElementById('panel-login'),
  panelRegister: document.getElementById('panel-register'),
  formLogin: document.getElementById('form-login'),
  formRegister: document.getElementById('form-register'),
  registerRoleOptions: document.querySelectorAll('.role-option'),
  labelOrg: document.getElementById('label-org'),

  // Hero CTAs
  btnHeroDonate: document.getElementById('btn-hero-donate'),
  btnHeroClaim: document.getElementById('btn-hero-claim'),

  // Navigation Items
  navDashboard: document.getElementById('nav-dashboard'),
  navBrowse: document.getElementById('nav-browse'),
  navActivity: document.getElementById('nav-activity'),
  navDonate: document.getElementById('nav-donate'),

  // Dashboard Stats
  dashboardUsername: document.getElementById('dashboard-username'),
  dashboardActionBtn: document.getElementById('dashboard-action-btn'),
  statTotalDonated: document.getElementById('stat-total-donated'),
  statTotalClaimed: document.getElementById('stat-total-claimed'),
  statCo2Saved: document.getElementById('stat-co2-saved'),
  statPartnersCount: document.getElementById('stat-partners-count'),
  gaugePercentage: document.getElementById('gauge-percentage'),
  gaugeFillCircle: document.getElementById('gauge-fill-circle'),
  chartLegendClaimed: document.getElementById('chart-legend-claimed'),
  timelineClaims: document.getElementById('timeline-claims'),

  // Browse Feed & Filters
  listingsFeed: document.getElementById('listings-feed'),
  filterSearch: document.getElementById('filter-search'),
  filterCategory: document.getElementById('filter-category'),

  // Activity View
  activitySubdesc: document.getElementById('activity-subdesc'),
  activityTableTitle: document.getElementById('activity-table-title'),
  activityCount: document.getElementById('activity-count'),
  activityTableHeaders: document.getElementById('activity-table-headers'),
  activityTableBody: document.getElementById('activity-table-body'),
  activityEmptyState: document.getElementById('activity-empty-state'),

  // Donation Form
  formDonate: document.getElementById('form-donate'),
  donatePhone: document.getElementById('donate-phone'),
  btnCancelDonate: document.getElementById('btn-cancel-donate')
};

// Toast Notifications System
function showToast(title, message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';
  if (type === 'info') iconName = 'info';

  toast.innerHTML = `
    <div class="toast-icon">
      <i data-lucide="${iconName}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  els.toastContainer.appendChild(toast);
  lucide.createIcons();

  // Animate and Remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Router - Switch views
function showView(viewName) {
  // Guard access to views
  if (!state.token && ['dashboard', 'browse', 'activity', 'donate'].includes(viewName)) {
    showView('auth');
    showToast('Sign In Required', 'Please register or log in to access this platform feature.', 'info');
    return;
  }

  // Guard donor-only view
  if (viewName === 'donate' && state.user?.role !== 'donor') {
    showView('dashboard');
    return;
  }

  // Update URL hash without triggering double reload
  window.location.hash = `#${viewName}`;
  state.activeView = viewName;

  // Toggle active CSS class
  Object.keys(els.views).forEach(key => {
    if (key === viewName) {
      els.views[key].classList.remove('hidden');
      els.views[key].classList.add('active-view');
    } else {
      els.views[key].classList.add('hidden');
      els.views[key].classList.remove('active-view');
    }
  });

  // Highlight active link in header
  document.querySelectorAll('.main-nav .nav-link').forEach(link => {
    if (link.getAttribute('id') === `nav-${viewName}`) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Load view-specific data
  if (viewName === 'dashboard') loadDashboardData();
  if (viewName === 'browse') loadBrowseFeed();
  if (viewName === 'activity') loadActivityLogs();
  
  // Close mobile drawer on navigation
  closeMobileDrawer();
  
  // Update icons just in case
  lucide.createIcons();
}

// Mobile drawer helpers
function openMobileDrawer() {
  els.mobileDrawer.classList.add('open');
  
  // Clone active navigation links inside the drawer
  els.drawerLinks.innerHTML = '';
  const currentNavGroup = state.token ? els.authNav : els.guestNav;
  const links = currentNavGroup.querySelectorAll('a, button');
  
  links.forEach(node => {
    if (node.id === 'header-avatar') return; // Skip avatar dropdown trigger
    
    let clone;
    if (node.tagName === 'BUTTON') {
      clone = document.createElement('button');
      clone.className = node.className + ' btn-block';
      clone.textContent = node.textContent;
      clone.onclick = node.onclick;
      if (node.id === 'btn-login-trigger') {
        clone.onclick = () => { closeMobileDrawer(); els.tabLogin.click(); showView('auth'); };
      }
      if (node.id === 'btn-register-trigger') {
        clone.onclick = () => { closeMobileDrawer(); els.tabRegister.click(); showView('auth'); };
      }
      if (node.id === 'btn-logout') {
        clone.onclick = () => { closeMobileDrawer(); handleLogout(); };
      }
    } else {
      clone = document.createElement('a');
      clone.className = 'nav-link';
      clone.href = node.getAttribute('href');
      clone.textContent = node.textContent;
      clone.onclick = (e) => {
        e.preventDefault();
        const dest = node.getAttribute('href').replace('#', '');
        showView(dest === 'about' || dest === 'listings-preview' ? 'landing' : dest);
      };
      if (node.classList.contains('active')) {
        clone.classList.add('active');
      }
    }
    els.drawerLinks.appendChild(clone);
  });
  
  // Make sure icons render
  lucide.createIcons();
}

function closeMobileDrawer() {
  els.mobileDrawer.classList.remove('open');
}

// Authentication Helpers
function updateAuthUI() {
  if (state.token && state.user) {
    els.guestNav.classList.add('hidden');
    els.guestNav.classList.remove('active-nav-group');
    els.authNav.classList.remove('hidden');
    els.authNav.classList.add('active-nav-group');

    // Populate profile menus
    els.headerAvatar.textContent = state.user.name.charAt(0).toUpperCase();
    els.dropdownName.textContent = state.user.name;
    els.dropdownRole.textContent = state.user.role === 'donor' ? 'Food Donor' : 'NGO Recipient';

    // Hide/show role specific links
    if (state.user.role === 'donor') {
      document.querySelectorAll('.donor-only').forEach(el => el.classList.remove('hidden'));
    } else {
      document.querySelectorAll('.donor-only').forEach(el => el.classList.add('hidden'));
    }
  } else {
    els.guestNav.classList.remove('hidden');
    els.guestNav.classList.add('active-nav-group');
    els.authNav.classList.add('hidden');
    els.authNav.classList.remove('active-nav-group');
  }
  lucide.createIcons();
}

function handleLogin(email, password) {
  fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json().then(data => ({ status: res.status, data })))
  .then(({ status, data }) => {
    if (status === 200) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showToast('Logged In Successfully', `Welcome back, ${data.user.name}!`);
      updateAuthUI();
      showView('dashboard');
      els.formLogin.reset();
    } else {
      showToast('Login Failed', data.error || 'Invalid credentials.', 'error');
    }
  })
  .catch(err => {
    console.error('Login error:', err);
    showToast('Network Error', 'Could not connect to server.', 'error');
  });
}

function handleRegister(payload) {
  fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json().then(data => ({ status: res.status, data })))
  .then(({ status, data }) => {
    if (status === 201) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showToast('Account Created', `Welcome to ShareMeal, ${data.user.name}!`);
      updateAuthUI();
      showView('dashboard');
      els.formRegister.reset();
    } else {
      showToast('Registration Failed', data.error || 'Check input parameters.', 'error');
    }
  })
  .catch(err => {
    console.error('Registration error:', err);
    showToast('Network Error', 'Could not connect to server.', 'error');
  });
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  showToast('Logged Out', 'You have been signed out successfully.', 'info');
  updateAuthUI();
  showView('landing');
}

// Fetch dashboard statistical metrics
function loadDashboardData() {
  els.dashboardUsername.textContent = state.user.name;

  // Add role CTA button
  if (state.user.role === 'donor') {
    els.dashboardActionBtn.innerHTML = `
      <button class="btn btn-primary" id="btn-dash-donate">
        <i data-lucide="plus-circle"></i> Donate Surplus Food
      </button>
    `;
    document.getElementById('btn-dash-donate').onclick = () => showView('donate');
  } else {
    els.dashboardActionBtn.innerHTML = `
      <button class="btn btn-primary" id="btn-dash-browse">
        <i data-lucide="search"></i> Browse Food Feed
      </button>
    `;
    document.getElementById('btn-dash-browse').onclick = () => showView('browse');
  }

  fetch(`${API_URL}/api/stats`)
    .then(res => res.json())
    .then(data => {
      state.stats = data;
      
      // Update UI counts
      els.statTotalDonated.textContent = data.totalServingsDonated;
      els.statTotalClaimed.textContent = data.totalServingsClaimed;
      els.statCo2Saved.textContent = `${data.co2SavedKg} kg`;
      els.statPartnersCount.textContent = data.donorsCount + data.recipientsCount;

      // Animate circular target progress gauge (Target = 1000 meals)
      const target = 1000;
      const claimedVal = data.totalServingsClaimed;
      const pct = Math.min(Math.round((claimedVal / target) * 100), 100);
      els.gaugePercentage.textContent = `${pct}%`;
      els.chartLegendClaimed.textContent = `${claimedVal} / ${target} Servings`;

      // 251.2 is the SVG circle length (r=40 -> 2 * PI * 40)
      const offsetVal = 251.2 - (251.2 * pct) / 100;
      els.gaugeFillCircle.style.strokeDashoffset = offsetVal;

      // Populate recent activity logs list
      els.timelineClaims.innerHTML = '';
      if (data.recentClaims && data.recentClaims.length > 0) {
        data.recentClaims.forEach(claim => {
          const hoursAgo = Math.max(0.1, ((Date.now() - new Date(claim.time)) / (1000 * 60 * 60))).toFixed(1);
          
          const tlItem = document.createElement('div');
          tlItem.className = 'timeline-item';
          tlItem.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-time">${hoursAgo} hours ago</div>
            <div class="timeline-title">${claim.title}</div>
            <div class="timeline-desc">${claim.claimedByName} claimed ${claim.servings} servings from ${claim.donorName}.</div>
          `;
          els.timelineClaims.appendChild(tlItem);
        });
      } else {
        els.timelineClaims.innerHTML = '<div class="timeline-empty">No recent platform handovers completed.</div>';
      }
      lucide.createIcons();
    })
    .catch(err => {
      console.error('Error fetching stats:', err);
      showToast('Metrics Error', 'Failed to fetch platform metrics.', 'error');
    });
}

// Fetch Food Listing and Build Feed
function loadBrowseFeed() {
  const category = els.filterCategory.value;
  const search = els.filterSearch.value;

  // Show skeleton loading loader
  els.listingsFeed.innerHTML = `
    <div class="no-listings-state">
      <div class="stat-icon icon-bg-teal" style="margin: 0 auto 1rem auto;"><i data-lucide="loader" class="animate-spin"></i></div>
      <p>Refreshing active listings...</p>
    </div>
  `;
  lucide.createIcons();

  let query = `?category=${encodeURIComponent(category)}`;
  if (search) {
    query += `&search=${encodeURIComponent(search)}`;
  }

  fetch(`${API_URL}/api/donations${query}`)
    .then(res => res.json())
    .then(data => {
      state.donations = data;
      els.listingsFeed.innerHTML = '';

      if (data.length === 0) {
        els.listingsFeed.innerHTML = `
          <div class="no-listings-state">
            <i data-lucide="search-code"></i>
            <h3>No Food Listings Found</h3>
            <p>Try resetting filters or check back later for updates.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'food-card';

        // Calculate hours remaining till expiry
        const hoursLeft = (new Date(item.expiryTime) - Date.now()) / (1000 * 60 * 60);
        
        let timerBadgeClass = 'expiry-countdown';
        let timerText = '';

        if (item.status === 'claimed') {
          timerBadgeClass += ' claimed-tag';
          timerText = '<i data-lucide="check-circle-2"></i> Claimed';
        } else if (item.status === 'expired' || hoursLeft <= 0) {
          timerBadgeClass += ' expired-tag';
          timerText = '<i data-lucide="alert-octagon"></i> Expired';
        } else {
          timerText = `<i data-lucide="clock"></i> Expiring in ${Math.round(hoursLeft)}h`;
        }

        // Show claim button contextually
        let actionButtonHTML = '';
        if (state.user.role === 'recipient') {
          if (item.status === 'available') {
            actionButtonHTML = `<button class="btn btn-primary btn-block card-btn" onclick="claimFoodItem('${item.id}')">Claim Food Rescue</button>`;
          } else if (item.status === 'claimed') {
            const isMine = item.claimedBy === state.user.id;
            actionButtonHTML = isMine 
              ? `<button class="btn btn-outline btn-block card-btn" disabled><i data-lucide="check"></i> Claimed by You</button>`
              : `<button class="btn btn-outline btn-block card-btn" disabled>Already Claimed</button>`;
          } else {
            actionButtonHTML = `<button class="btn btn-outline btn-block card-btn" disabled>Expired</button>`;
          }
        } else {
          // If Donor, show active status indicators instead
          const isMine = item.donorId === state.user.id;
          actionButtonHTML = isMine
            ? `<button class="btn btn-outline-alt btn-block card-btn" onclick="showView('activity')">Manage Your Listing</button>`
            : `<button class="btn btn-outline btn-block card-btn" disabled>Donor View Only</button>`;
        }

        card.innerHTML = `
          <div class="card-img-wrapper">
            <img src="${item.imageUrl}" alt="${item.title}" class="food-card-img" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80'">
            <span class="category-tag">${item.category}</span>
            <span class="${timerBadgeClass}">${timerText}</span>
          </div>
          <div class="card-body-details">
            <div class="card-title-row">
              <h3>${item.title}</h3>
              <span class="card-servings">${item.servings} Servings</span>
            </div>
            <p class="food-card-desc">${item.description}</p>
            <div class="card-meta-info">
              <div class="meta-row">
                <i data-lucide="building"></i>
                <span>Donor: <span>${item.donorName}</span></span>
              </div>
              <div class="meta-row">
                <i data-lucide="map-pin"></i>
                <span>Pickup: <span>${item.pickupAddress}</span></span>
              </div>
            </div>
            ${actionButtonHTML}
          </div>
        `;
        els.listingsFeed.appendChild(card);
      });
      lucide.createIcons();
    })
    .catch(err => {
      console.error('Error fetching donations feed:', err);
      showToast('Feed Sync Error', 'Failed to retrieve active food listings.', 'error');
    });
}

// Claim food item execution (NGO Recipients)
window.claimFoodItem = function(id) {
  if (!state.token) {
    showView('auth');
    return;
  }

  fetch(`${API_URL}/api/donations/${id}/claim`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${state.token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => res.json().then(data => ({ status: res.status, data })))
  .then(({ status, data }) => {
    if (status === 200) {
      showToast('Rescue Claimed!', 'Coordinate immediately using the details in "My Activity".');
      loadBrowseFeed();
    } else {
      showToast('Claim Error', data.error || 'Failed to claim item.', 'error');
    }
  })
  .catch(err => {
    console.error('Error claiming food:', err);
    showToast('Network Error', 'Could not complete donation claim.', 'error');
  });
};

// Fetch Activity logs for current user (Donors vs Recipients)
function loadActivityLogs() {
  if (!state.token) return;

  const endpoint = state.user.role === 'donor' 
    ? '/api/donations/my-donations' 
    : '/api/donations/my-claims';

  // Toggle Titles
  if (state.user.role === 'donor') {
    els.activitySubdesc.textContent = 'Monitor listings created, verify claim statuses, and coordinate pickups.';
    els.activityTableTitle.textContent = 'Published Food Contributions';
  } else {
    els.activitySubdesc.textContent = 'Review your claimed donations and access coordination coordinates.';
    els.activityTableTitle.textContent = 'Rescued Food Claims';
  }

  els.activityTableBody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 2rem;">Loading activity history...</td>
    </tr>
  `;

  fetch(`${API_URL}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${state.token}` }
  })
  .then(res => res.json())
  .then(data => {
    els.activityCount.textContent = `${data.length} item(s)`;
    els.activityTableBody.innerHTML = '';
    
    if (data.length === 0) {
      els.activityEmptyState.classList.remove('hidden');
      document.querySelector('.activity-table').style.display = 'none';
      return;
    }

    els.activityEmptyState.classList.add('hidden');
    document.querySelector('.activity-table').style.display = 'table';

    if (state.user.role === 'donor') {
      // Donors headers setup
      els.activityTableHeaders.innerHTML = `
        <th>Food Item</th>
        <th>Category</th>
        <th>Servings</th>
        <th>Status</th>
        <th>Listed On</th>
        <th>Claimed By</th>
      `;

      data.forEach(item => {
        let statusBadge = '';
        if (item.status === 'available') statusBadge = '<span class="badge badge-warning">Available</span>';
        if (item.status === 'claimed') statusBadge = '<span class="badge badge-success">Claimed</span>';
        if (item.status === 'expired') statusBadge = '<span class="badge badge-neutral">Expired</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="table-title-cell">${item.title}</td>
          <td>${item.category}</td>
          <td>${item.servings}</td>
          <td>${statusBadge}</td>
          <td>${new Date(item.createdAt).toLocaleDateString()}</td>
          <td>${item.claimedByName || '<span style="color: var(--text-muted)">Unclaimed</span>'}</td>
        `;
        els.activityTableBody.appendChild(row);
      });
    } else {
      // Recipients headers setup
      els.activityTableHeaders.innerHTML = `
        <th>Food Item</th>
        <th>Donor Entity</th>
        <th>Servings</th>
        <th>Donor Phone</th>
        <th>Pickup Location</th>
        <th>Claimed On</th>
      `;

      data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="table-title-cell">${item.title}</td>
          <td><strong>${item.donorName}</strong></td>
          <td>${item.servings}</td>
          <td class="table-phone-cell">${item.donorPhone || 'N/A'}</td>
          <td>${item.pickupAddress}</td>
          <td>${new Date(item.claimedAt).toLocaleDateString()} at ${new Date(item.claimedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        `;
        els.activityTableBody.appendChild(row);
      });
    }
  })
  .catch(err => {
    console.error('Error loading activity logs:', err);
    showToast('Logs Error', 'Failed to retrieve user activities.', 'error');
  });
}

// Add event listeners on initialization
function initEvents() {
  
  // Navigation Logo click
  els.navLogo.onclick = () => showView(state.token ? 'dashboard' : 'landing');

  // Trigger login/register tab switching
  els.btnLoginTrigger.onclick = () => { els.tabLogin.click(); showView('auth'); };
  els.btnRegisterTrigger.onclick = () => { els.tabRegister.click(); showView('auth'); };

  // Auth tabs clicks
  els.tabLogin.onclick = () => {
    els.tabLogin.classList.add('active');
    els.tabRegister.classList.remove('active');
    els.panelLogin.classList.add('active');
    els.panelRegister.classList.remove('active');
  };
  
  els.tabRegister.onclick = () => {
    els.tabRegister.classList.add('active');
    els.tabLogin.classList.remove('active');
    els.panelRegister.classList.add('active');
    els.panelLogin.classList.remove('active');
  };

  // Register Role change handler
  els.registerRoleOptions.forEach(opt => {
    opt.onclick = () => {
      els.registerRoleOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      const radio = opt.querySelector('input[type="radio"]');
      radio.checked = true;
      
      // Update label
      if (radio.value === 'donor') {
        els.labelOrg.textContent = 'Business / Restaurant Name';
      } else {
        els.labelOrg.textContent = 'NGO / Organization Name';
      }
    };
  });

  // Guest landing page CTA clicks
  els.btnHeroDonate.onclick = () => {
    if (state.token) {
      if (state.user.role === 'donor') showView('donate');
      else {
        showView('dashboard');
        showToast('Access Denied', 'Only donor accounts can publish food listings.', 'error');
      }
    } else {
      els.tabRegister.click();
      showView('auth');
    }
  };

  els.btnHeroClaim.onclick = () => {
    if (state.token) {
      showView('browse');
    } else {
      els.tabRegister.click();
      showView('auth');
    }
  };

  // Form submits
  els.formLogin.onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    handleLogin(email, password);
  };

  els.formRegister.onsubmit = (e) => {
    e.preventDefault();
    const role = document.querySelector('input[name="register-role"]:checked').value;
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const phone = document.getElementById('register-phone').value.trim();
    const organization = document.getElementById('register-org').value.trim();
    const password = document.getElementById('register-password').value;

    handleRegister({ name, email, password, role, phone, organization });
  };

  // Nav actions
  els.navDashboard.onclick = (e) => { e.preventDefault(); showView('dashboard'); };
  els.navBrowse.onclick = (e) => { e.preventDefault(); showView('browse'); };
  els.navActivity.onclick = (e) => { e.preventDefault(); showView('activity'); };
  els.navDonate.onclick = (e) => { e.preventDefault(); showView('donate'); };
  
  els.btnLogout.onclick = () => handleLogout();

  // Search/Filter inputs change
  els.filterSearch.oninput = () => loadBrowseFeed();
  els.filterCategory.onchange = () => loadBrowseFeed();

  // Donate Form submit
  els.formDonate.onsubmit = (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('donate-title').value.trim(),
      description: document.getElementById('donate-description').value.trim(),
      servings: document.getElementById('donate-servings').value,
      category: document.getElementById('donate-category').value,
      expiryHours: document.getElementById('donate-expiry').value,
      pickupAddress: document.getElementById('donate-address').value.trim(),
      imageUrl: document.getElementById('donate-image').value.trim(),
      donorPhone: els.donatePhone.value.trim()
    };

    fetch(`${API_URL}/api/donations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status === 201) {
        showToast('Donation Posted!', 'Surplus item published in the active listings list.');
        els.formDonate.reset();
        showView('browse');
      } else {
        showToast('Posting Failed', data.error || 'Failed to list food.', 'error');
      }
    })
    .catch(err => {
      console.error('Donation post error:', err);
      showToast('Network Error', 'Failed to publish listing.', 'error');
    });
  };

  els.btnCancelDonate.onclick = () => {
    els.formDonate.reset();
    showView('dashboard');
  };

  // Dark/Light Theme Switch
  els.themeToggle.onclick = () => {
    if (state.theme === 'light-theme') {
      state.theme = 'dark-theme';
      els.body.className = 'dark-theme';
      els.themeIconDark.classList.add('hidden');
      els.themeIconLight.classList.remove('hidden');
    } else {
      state.theme = 'light-theme';
      els.body.className = 'light-theme';
      els.themeIconDark.classList.remove('hidden');
      els.themeIconLight.classList.add('hidden');
    }
    localStorage.setItem('theme', state.theme);
  };

  // Mobile drawer links/toggle
  els.mobileMenuToggle.onclick = () => openMobileDrawer();
  els.closeDrawer.onclick = () => closeMobileDrawer();
}

// Initialise Application
function initApp() {
  // Setup theme
  els.body.className = state.theme;
  if (state.theme === 'dark-theme') {
    els.themeIconDark.classList.add('hidden');
    els.themeIconLight.classList.remove('hidden');
  } else {
    els.themeIconDark.classList.remove('hidden');
    els.themeIconLight.classList.add('hidden');
  }

  initEvents();
  updateAuthUI();

  // Routing on direct url refresh containing hash
  const hash = window.location.hash.replace('#', '');
  if (hash && ['landing', 'auth', 'dashboard', 'browse', 'activity', 'donate'].includes(hash)) {
    showView(hash);
  } else {
    showView(state.token ? 'dashboard' : 'landing');
  }
}

// Start
document.addEventListener('DOMContentLoaded', initApp);
