// DOM Elements
const sidebarNav = document.getElementById('sidebar-nav');
const timelineContent = document.getElementById('timeline-content');
const loadingMessage = document.getElementById('loading-message');
const showAllBtn = document.getElementById('show-all-btn');
const themeToggleButton = document.getElementById('theme-toggle-btn');
const sunIcon = document.getElementById('theme-icon-sun');
const moonIcon = document.getElementById('theme-icon-moon');

// Global variable to store event data
let eventData = [];

// --- Theme Management ---
/**
 * Applies the specified theme (light or dark) to the page.
 * @param {string} theme - The theme to apply ('light' or 'dark').
 */
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        if (sunIcon) sunIcon.classList.add('hidden');
        if (moonIcon) moonIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
    }
}

/**
 * Toggles the theme between light and dark mode and saves the preference.
 */
function toggleTheme() {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    const newTheme = isDarkMode ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

// Add event listener for theme toggle button
if (themeToggleButton) {
    themeToggleButton.addEventListener('click', toggleTheme);
}

// Load saved theme or use system preference
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);

// --- Date Formatting ---
/**
 * Formats a date string for display (e.g., March 1, 1947).
 * @param {string} dateString - The date string (YYYY-MM-DD).
 * @returns {string} - The formatted date string.
 */
function formatDateForDisplay(dateString) {
    // Adding 'T00:00:00' ensures the date is parsed in the local timezone,
    // preventing potential off-by-one day errors due to UTC conversion.
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// --- Event Card Creation ---
/**
 * Creates an HTML element for an event card.
 * @param {object} event - The event object.
 * @returns {HTMLElement} - The created card element.
 */
function createEventCard(event) {
    const card = document.createElement('div');
    // Tailwind classes define the card's appearance and responsiveness.
    card.className = 'p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 event-card';
    const fallbackImage = `https://placehold.co/600x300/e2e8f0/475569?text=${encodeURIComponent(event.title.substring(0,20))}`;

    card.innerHTML = `
        <img src="${event.image}" alt="${event.title}" class="w-full h-56 object-cover rounded-lg mb-4 event-image" onerror="this.onerror=null;this.src='${fallbackImage}';">
        <h3 class="text-xl sm:text-2xl font-semibold mb-2 card-title">${event.title}</h3>
        <p class="text-sm font-medium mb-3 card-date">${formatDateForDisplay(event.date)}</p>
        <p class="mb-4 leading-relaxed card-description">${event.description}</p>
        <div class="mt-4 pt-4 border-t border-[var(--border-color)]">
            <p class="text-xs sm:text-sm mb-2 card-report-label">
                <strong>Report/Source:</strong> 
                <span class="card-report-details">${event.report_details || 'Not available'}</span>
            </p>
            <a href="${event.link}" target="_blank" rel="noopener noreferrer" class="inline-block font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm read-more-btn">
                Read More
            </a>
        </div>
    `;
    return card;
}

// --- Displaying Events ---
/**
 * Clears and displays the given events in the timeline content area.
 * @param {Array<object>} eventsToDisplay - An array of event objects.
 */
function displayEvents(eventsToDisplay) {
    if (!timelineContent) return;
    timelineContent.innerHTML = ''; // Clear previous events
    if (eventsToDisplay.length === 0) {
        timelineContent.innerHTML = '<p class="loading-text text-lg">No events found for this period.</p>';
        return;
    }
    eventsToDisplay.forEach(event => {
        timelineContent.appendChild(createEventCard(event));
    });
}

// --- Sidebar and Filtering Logic ---
/**
 * Initializes the timeline, populates the sidebar, and sets up event listeners.
 */
function initializeTimeline() {
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (!sidebarNav) return;

    // Sort events by date (oldest first)
    const sortedEvents = [...eventData].sort((a, b) => new Date(a.date) - new Date(b.date));

    const years = {}; // Object to hold years and their months

    sortedEvents.forEach(event => {
        const date = new Date(event.date + 'T00:00:00');
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed (January is 0)
        
        if (!years[year]) {
            years[year] = new Set(); // Use a Set to store unique months for that year
        }
        years[year].add(month);
    });

    // Clear existing year/month buttons except "Show All"
    const existingButtons = sidebarNav.querySelectorAll('button:not(#show-all-btn), div[id^="months-"]');
    existingButtons.forEach(btn => btn.remove());

    // Populate sidebar with year and month buttons
    Object.keys(years).sort((a,b) => parseInt(a) - parseInt(b)).forEach(year => {
        const yearButton = document.createElement('button');
        yearButton.className = 'w-full text-left px-4 py-2 rounded-lg font-medium sidebar-item';
        yearButton.textContent = year;
        yearButton.dataset.year = year;
        
        const monthContainerId = `months-${year}`;
        yearButton.setAttribute('aria-expanded', 'false');
        yearButton.setAttribute('aria-controls', monthContainerId);
        sidebarNav.appendChild(yearButton);

        const monthList = document.createElement('div');
        monthList.id = monthContainerId;
        monthList.className = 'ml-4 mt-1 space-y-1 hidden'; // Hidden by default

        const sortedMonths = Array.from(years[year]).sort((a,b) => a - b);

        sortedMonths.forEach(monthIndex => {
            const monthButton = document.createElement('button');
            const monthName = new Date(0, monthIndex).toLocaleString('en-US', { month: 'long' });
            monthButton.className = 'w-full text-left px-3 py-1.5 rounded-md text-sm sidebar-item';
            monthButton.textContent = monthName;
            monthButton.dataset.year = year;
            monthButton.dataset.month = monthIndex;
            monthList.appendChild(monthButton);

            // Event listener for month buttons
            monthButton.addEventListener('click', () => {
                filterEventsByMonth(parseInt(year), monthIndex);
                setActiveSidebarItem(monthButton);
            });
        });
        sidebarNav.appendChild(monthList);

        // Event listener for year buttons (to toggle month list and filter)
        yearButton.addEventListener('click', () => {
            const isExpanded = yearButton.getAttribute('aria-expanded') === 'true';
            yearButton.setAttribute('aria-expanded', !isExpanded);
            monthList.classList.toggle('hidden');
            
            filterEventsByYear(parseInt(year)); // Filter by year when year is clicked
            setActiveSidebarItem(yearButton);
        });
    });

    // Event listener for "Show All" button
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            displayEvents(sortedEvents);
            setActiveSidebarItem(showAllBtn);
            // Collapse all month lists when "Show All" is clicked
            document.querySelectorAll('#sidebar-nav div[id^="months-"]').forEach(ml => ml.classList.add('hidden'));
            document.querySelectorAll('#sidebar-nav button[data-year]').forEach(yb => yb.setAttribute('aria-expanded', 'false'));
        });
    }
    
    // Initially display all events
    displayEvents(sortedEvents);
    if (sortedEvents.length > 0 && showAllBtn) {
        setActiveSidebarItem(showAllBtn); // Set "Show All" as active initially
    }
}

/**
 * Sets the 'active' class on the selected sidebar item and removes it from others.
 * @param {HTMLElement} activeButton - The button element to mark as active.
 */
function setActiveSidebarItem(activeButton) {
    if (!sidebarNav) return;
    document.querySelectorAll('#sidebar-nav .sidebar-item').forEach(btn => {
        btn.classList.remove('active');
    });
    activeButton.classList.add('active');
}

/**
 * Filters events by year and displays them.
 * @param {number} year - The year to filter by.
 */
function filterEventsByYear(year) {
    const filtered = eventData.filter(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate.getFullYear() === year;
    }).sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort within the year
    displayEvents(filtered);
}

/**
 * Filters events by year and month, then displays them.
 * @param {number} year - The year to filter by.
 * @param {number} monthIndex - The month index (0-11) to filter by.
 */
function filterEventsByMonth(year, monthIndex) {
    const filtered = eventData.filter(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate.getFullYear() === year && eventDate.getMonth() === monthIndex;
    }).sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort within the month
    displayEvents(filtered);
}

// --- Data Fetching and Initialization ---
/**
 * Fetches event data from data.json and initializes the timeline.
 */
async function loadDataAndInitialize() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        eventData = await response.json();
        if (eventData && eventData.length > 0) {
            initializeTimeline();
        } else {
            if (loadingMessage) loadingMessage.textContent = 'No event data available in data.json.';
            if (timelineContent) timelineContent.innerHTML = '<p class="loading-text">No events to display.</p>';
        }
    } catch (error) {
        console.error('Error fetching or parsing timeline data:', error);
        if (loadingMessage) loadingMessage.textContent = 'Failed to load events.';
        if (timelineContent) timelineContent.innerHTML = '<p class="text-red-500">Error loading event data. Please check console for details.</p>';
    }
}

// Start the process when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadDataAndInitialize);
