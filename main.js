// API URL
const API_URL = 'https://srijandubey.github.io/campus-api-mock/SRM-C1-25.json';

// State management
let doctors = [];
let filteredDoctors = [];
let filters = {
    search: '',
    consultationType: 'video',
    specialties: [],
    sortBy: 'fees_asc'
};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const specialtiesFilter = document.getElementById('specialtiesFilter');
const sortSelect = document.getElementById('sortSelect');
const activeFilters = document.getElementById('activeFilters');
const doctorList = document.getElementById('doctorList');

// Initialize the application
async function init() {
    try {
        const response = await fetch(API_URL);
        doctors = await response.json();
        
        // Initialize filters from URL
        loadStateFromURL();
        
        // Setup event listeners
        setupEventListeners();
        
        // Render initial state
        renderSpecialties();
        applyFilters();
    } catch (error) {
        console.error('Error loading doctor data:', error);
        doctorList.innerHTML = '<div class="error">Failed to load doctor data. Please try again later.</div>';
    }
}

// Load state from URL
function loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.has('search')) filters.search = params.get('search');
    if (params.has('type')) filters.consultationType = params.get('type');
    if (params.has('specialties')) filters.specialties = params.get('specialties').split(',');
    if (params.has('sort')) filters.sortBy = params.get('sort');
    
    // Update UI to reflect URL state
    searchInput.value = filters.search;
    document.querySelector(`input[name="consultationType"][value="${filters.consultationType}"]`).checked = true;
    sortSelect.value = filters.sortBy;
}

// Update URL with current state
function updateURLState() {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.consultationType !== 'video') params.set('type', filters.consultationType);
    if (filters.specialties.length > 0) params.set('specialties', filters.specialties.join(','));
    if (filters.sortBy !== 'fees_asc') params.set('sort', filters.sortBy);
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', (e) => {
        filters.search = e.target.value;
        showSearchSuggestions();
        updateURLState();
    });
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
            hideSearchSuggestions();
        }
    });
    
    // Consultation type
    document.querySelectorAll('input[name="consultationType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            filters.consultationType = e.target.value;
            applyFilters();
            updateURLState();
        });
    });
    
    // Sort
    sortSelect.addEventListener('change', (e) => {
        filters.sortBy = e.target.value;
        applyFilters();
        updateURLState();
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        loadStateFromURL();
        applyFilters();
    });
}

// Show search suggestions
function showSearchSuggestions() {
    if (!filters.search) {
        hideSearchSuggestions();
        return;
    }
    
    const suggestions = doctors
        .filter(doctor => 
            doctor.name.toLowerCase().includes(filters.search.toLowerCase())
        )
        .slice(0, 3);
    
    if (suggestions.length === 0) {
        hideSearchSuggestions();
        return;
    }
    
    searchSuggestions.innerHTML = suggestions
        .map(doctor => `
            <div class="suggestion-item" data-testid="suggestion-item" data-id="${doctor.id}">
                ${doctor.name}
            </div>
        `)
        .join('');
    
    searchSuggestions.classList.add('show');
    
    // Add click handlers to suggestions
    searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const doctor = doctors.find(d => d.id === item.dataset.id);
            if (doctor) {
                filters.search = doctor.name;
                searchInput.value = doctor.name;
                applyFilters();
                hideSearchSuggestions();
            }
        });
    });
}

// Hide search suggestions
function hideSearchSuggestions() {
    searchSuggestions.classList.remove('show');
}

// Render specialties filter
function renderSpecialties() {
    const specialties = new Set();
    doctors.forEach(doctor => {
        doctor.specialities.forEach(speciality => {
            specialties.add(speciality.name);
        });
    });
    
    specialtiesFilter.innerHTML = Array.from(specialties)
        .map(speciality => {
            const testId = `filter-specialty-${speciality.replace(/\s+/g, '-')}`;
            return `
                <label>
                    <input 
                        type="checkbox" 
                        value="${speciality}"
                        data-testid="${testId}"
                        ${filters.specialties.includes(speciality) ? 'checked' : ''}
                    >
                    ${speciality}
                </label>
            `;
        })
        .join('');
    
    // Add event listeners to checkboxes
    specialtiesFilter.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                filters.specialties.push(e.target.value);
            } else {
                filters.specialties = filters.specialties.filter(s => s !== e.target.value);
            }
            applyFilters();
            updateURLState();
        });
    });
}

// Apply all filters
function applyFilters() {
    filteredDoctors = [...doctors];
    
    // Apply search filter
    if (filters.search) {
        filteredDoctors = filteredDoctors.filter(doctor =>
            doctor.name.toLowerCase().includes(filters.search.toLowerCase())
        );
    }
    
    // Apply consultation type filter
    filteredDoctors = filteredDoctors.filter(doctor => {
        if (filters.consultationType === 'video') {
            return doctor.video_consult;
        } else {
            return doctor.in_clinic;
        }
    });
    
    // Apply specialties filter
    if (filters.specialties.length > 0) {
        filteredDoctors = filteredDoctors.filter(doctor =>
            doctor.specialities.some(speciality =>
                filters.specialties.includes(speciality.name)
            )
        );
    }
    
    // Apply sorting
    sortDoctors(filteredDoctors);
    
    // Update active filters display
    updateActiveFilters();
    
    // Render doctors
    renderDoctors();
}

// Sort doctors
function sortDoctors(doctorsToSort) {
    const [field, order] = filters.sortBy.split('_');
    
    doctorsToSort.sort((a, b) => {
        if (field === 'fees') {
            const aFees = parseInt(a.fees.replace(/[^0-9]/g, ''));
            const bFees = parseInt(b.fees.replace(/[^0-9]/g, ''));
            return order === 'asc' ? aFees - bFees : bFees - aFees;
        } else if (field === 'experience') {
            const aExp = parseInt(a.experience);
            const bExp = parseInt(b.experience);
            return order === 'desc' ? bExp - aExp : aExp - bExp;
        }
        return 0;
    });
}

// Update active filters display
function updateActiveFilters() {
    const badges = [];
    
    if (filters.search) {
        badges.push(createFilterBadge(`Search: ${filters.search}`, 'search'));
    }
    
    if (filters.consultationType !== 'video') {
        badges.push(createFilterBadge(`Type: ${filters.consultationType === 'clinic' ? 'In Clinic' : 'Video Consult'}`, 'type'));
    }
    
    filters.specialties.forEach(specialty => {
        badges.push(createFilterBadge(`Specialty: ${specialty}`, 'specialty', specialty));
    });
    
    activeFilters.innerHTML = badges.join('');
    
    // Add remove handlers to badges
    activeFilters.querySelectorAll('.filter-badge button').forEach(button => {
        button.addEventListener('click', () => {
            const type = button.parentElement.dataset.type;
            const value = button.parentElement.dataset.value;
            
            if (type === 'search') {
                filters.search = '';
                searchInput.value = '';
            } else if (type === 'type') {
                filters.consultationType = 'video';
                document.querySelector('input[name="consultationType"][value="video"]').checked = true;
            } else if (type === 'specialty') {
                filters.specialties = filters.specialties.filter(s => s !== value);
                const checkbox = specialtiesFilter.querySelector(`input[value="${value}"]`);
                if (checkbox) checkbox.checked = false;
            }
            
            applyFilters();
            updateURLState();
        });
    });
}

// Create filter badge
function createFilterBadge(text, type, value = '') {
    return `
        <div class="filter-badge" data-type="${type}" data-value="${value}">
            ${text}
            <button type="button">&times;</button>
        </div>
    `;
}

// Render doctors list
function renderDoctors() {
    if (filteredDoctors.length === 0) {
        doctorList.innerHTML = '<div class="no-results">No doctors found matching your criteria.</div>';
        return;
    }
    
    doctorList.innerHTML = filteredDoctors
        .map(doctor => `
            <div class="doctor-card" data-testid="doctor-card">
                <div class="doctor-header">
                    <img src="${doctor.photo}" alt="${doctor.name}" class="doctor-photo">
                    <div>
                        <h3 class="doctor-name" data-testid="doctor-name">${doctor.name}</h3>
                        <div class="doctor-speciality" data-testid="doctor-specialty">${doctor.specialities[0].name}</div>
                    </div>
                </div>
                <div class="doctor-details">
                    <p>${doctor.doctor_introduction}</p>
                    <p data-testid="doctor-experience">Experience: ${doctor.experience}</p>
                    <p data-testid="doctor-fee">Consultation Fee: ${doctor.fees}</p>
                    <p>Languages: ${doctor.languages.join(', ')}</p>
                </div>
            </div>
        `)
        .join('');
}

// Initialize the application
init(); 