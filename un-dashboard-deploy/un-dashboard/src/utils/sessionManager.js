// Session timeout and management utilities
export class SessionManager {
  constructor() {
    this.timeoutWarningTime = 5 * 60 * 1000; // 5 minutes before expiry
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.warningTimer = null;
    this.logoutTimer = null;
    this.onWarning = null;
    this.onTimeout = null;
    this.lastActivity = Date.now();
    this.isActive = true;
  }

  // Initialize session monitoring
  init(onWarning, onTimeout) {
    this.onWarning = onWarning;
    this.onTimeout = onTimeout;
    this.setupActivityListeners();
    this.resetTimers();
  }

  // Setup activity listeners
  setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const activityHandler = () => {
      this.updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, true);
    });

    // Also listen for API requests
    this.interceptFetch();
  }
  // Intercept fetch requests to track API activity
  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = (...args) => {
      this.updateActivity();
      return originalFetch.apply(window, args);
    };
  }

  // Update last activity time and reset timers
  updateActivity() {
    if (!this.isActive) return;
    
    this.lastActivity = Date.now();
    this.resetTimers();
  }

  // Reset warning and logout timers
  resetTimers() {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }

    // Set warning timer
    this.warningTimer = setTimeout(() => {
      if (this.onWarning && this.isActive) {
        this.onWarning();
      }
    }, this.sessionTimeout - this.timeoutWarningTime);

    // Set logout timer
    this.logoutTimer = setTimeout(() => {
      if (this.onTimeout && this.isActive) {
        this.onTimeout();
      }
    }, this.sessionTimeout);
  }

  // Extend session (call when user responds to warning)
  extendSession() {
    this.updateActivity();
  }

  // Get time until session expires
  getTimeUntilExpiry() {
    const timeSinceActivity = Date.now() - this.lastActivity;
    return Math.max(0, this.sessionTimeout - timeSinceActivity);
  }

  // Get time until warning
  getTimeUntilWarning() {
    const timeSinceActivity = Date.now() - this.lastActivity;
    const timeUntilWarning = (this.sessionTimeout - this.timeoutWarningTime) - timeSinceActivity;
    return Math.max(0, timeUntilWarning);
  }

  // Check if session is about to expire
  isNearExpiry() {
    return this.getTimeUntilExpiry() <= this.timeoutWarningTime;
  }

  // Manually trigger session timeout
  forceTimeout() {
    if (this.onTimeout) {
      this.onTimeout();
    }
  }

  // Deactivate session monitoring
  deactivate() {
    this.isActive = false;
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }
  }

  // Reactivate session monitoring
  activate() {
    this.isActive = true;
    this.updateActivity();
  }

  // Format time for display
  static formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Session timeout warning component
export class SessionTimeoutWarning {
  constructor(onExtend, onLogout) {
    this.onExtend = onExtend;
    this.onLogout = onLogout;
    this.countdownInterval = null;
    this.timeRemaining = 0;
  }

  show(timeRemaining) {
    this.timeRemaining = timeRemaining;
    this.createModal();
    this.startCountdown();
  }

  hide() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.removeModal();
  }

  createModal() {
    // Remove existing modal if any
    this.removeModal();

    const modal = document.createElement('div');
    modal.id = 'session-timeout-modal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
    
    modal.innerHTML = `
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3 text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 class="text-lg leading-6 font-medium text-gray-900">Session Expiring Soon</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500">
              Your session will expire in <span id="countdown-timer" class="font-bold text-red-600"></span>
            </p>
            <p class="text-sm text-gray-500 mt-2">
              Would you like to extend your session?
            </p>
          </div>
          <div class="items-center px-4 py-3">
            <button id="extend-session-btn" class="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300">
              Extend
            </button>
            <button id="logout-now-btn" class="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-24 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300">
              Logout
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('extend-session-btn').addEventListener('click', () => {
      this.hide();
      this.onExtend();
    });

    document.getElementById('logout-now-btn').addEventListener('click', () => {
      this.hide();
      this.onLogout();
    });
  }

  removeModal() {
    const modal = document.getElementById('session-timeout-modal');
    if (modal) {
      modal.remove();
    }
  }

  startCountdown() {
    const updateCountdown = () => {
      const countdownElement = document.getElementById('countdown-timer');
      if (countdownElement) {
        countdownElement.textContent = SessionManager.formatTime(this.timeRemaining);
      }

      this.timeRemaining -= 1000;

      if (this.timeRemaining <= 0) {
        this.hide();
        this.onLogout();
      }
    };

    updateCountdown();
    this.countdownInterval = setInterval(updateCountdown, 1000);
  }
}

export default SessionManager;
