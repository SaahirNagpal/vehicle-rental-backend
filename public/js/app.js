// Vehicle Rental Management System Frontend JavaScript

// API Base URL
const API_BASE = '/api';

// Global State
let currentVehicles = [];
let selectedVehicle = null;
let adminToken = null;

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const pageSections = document.querySelectorAll('.page-section');
const navToggle = document.getElementById('navToggle');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set up navigation
    setupNavigation();

    // Set up form submissions
    setupForms();

    // Load initial data
    loadFeaturedVehicles();

    // Set default dates
    setDefaultDates();
}

// Navigation Setup
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            showSection(targetId);

            // Update active nav
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            document.querySelector('.nav-menu').classList.toggle('active');
        });
    }
}

function showSection(sectionId) {
    pageSections.forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');

        // Load section-specific data
        switch(sectionId) {
            case 'vehicles':
                loadVehicles();
                break;
            case 'bookings':
                // Load bookings when user searches
                break;
            case 'admin':
                if (adminToken) {
                    showAdminDashboard();
                }
                break;
        }
    }
}

// Form Setup
function setupForms() {
    // Vehicle Search Form
    const searchForm = document.getElementById('vehicleSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(searchForm);
            const searchData = {
                start_date: formData.get('startDate'),
                end_date: formData.get('endDate'),
                type: formData.get('vehicleType')
            };
            searchAndNavigate(searchData);
        });
    }

    // Booking Form
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleBookingSubmission();
        });
    }

    // Admin Login Form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAdminLogin();
        });
    }
}

// Set default dates (today and tomorrow)
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Set dates in all date inputs
    const dateInputs = ['startDate', 'endDate', 'filterStartDate', 'filterEndDate'];
    dateInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            if (id.includes('Start')) {
                input.value = todayStr;
                input.min = todayStr;
            } else {
                input.value = tomorrowStr;
                input.min = todayStr;
            }
        }
    });
}

// API Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(adminToken && { 'Authorization': `Bearer ${adminToken}` })
            },
            ...options
        };

        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        showError(error.message);
        throw error;
    }
}

// Vehicle Functions
async function loadFeaturedVehicles() {
    try {
        const data = await apiRequest('/vehicles');
        const vehicles = data.data.vehicles || [];
        displayFeaturedVehicles(vehicles.slice(0, 6)); // Show first 6 as featured
    } catch (error) {
        console.error('Error loading featured vehicles:', error);
    }
}

function displayFeaturedVehicles(vehicles) {
    const container = document.getElementById('featuredVehicles');
    if (!container) return;

    container.innerHTML = vehicles.map(vehicle => createVehicleCard(vehicle)).join('');
}

async function loadVehicles() {
    const container = document.getElementById('vehiclesGrid');
    const loadingElement = document.getElementById('loadingVehicles');

    if (loadingElement) loadingElement.style.display = 'block';

    try {
        const data = await apiRequest('/vehicles');
        currentVehicles = data.data.vehicles || [];
        displayVehicles(currentVehicles);
    } catch (error) {
        console.error('Error loading vehicles:', error);
    } finally {
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

function displayVehicles(vehicles) {
    const container = document.getElementById('vehiclesGrid');
    if (!container) return;

    if (vehicles.length === 0) {
        container.innerHTML = '<p>No vehicles found matching your criteria.</p>';
        return;
    }

    container.innerHTML = vehicles.map(vehicle => createVehicleCard(vehicle)).join('');
}

function createVehicleCard(vehicle) {
    const features = vehicle.features ? JSON.parse(vehicle.features) : [];
    const isAvailable = vehicle.availability;

    return `
        <div class="vehicle-card">
            <div class="vehicle-image">
                <i class="fas fa-car"></i>
            </div>
            <div class="vehicle-details">
                <h3 class="vehicle-title">${vehicle.model}</h3>
                <p class="vehicle-type">${vehicle.type}</p>
                <div class="vehicle-features">
                    ${features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
                </div>
                <div class="vehicle-price">$${vehicle.rent_per_day}/day</div>
                <div class="vehicle-availability">
                    <i class="fas fa-circle ${isAvailable ? 'available' : 'unavailable'}"></i>
                    <span>${isAvailable ? 'Available' : 'Unavailable'}</span>
                </div>
                <button class="btn btn-primary" onclick="selectVehicle(${vehicle.id})" ${!isAvailable ? 'disabled' : ''}>
                    ${isAvailable ? 'Select Vehicle' : 'Not Available'}
                </button>
            </div>
        </div>
    `;
}

async function searchVehicles() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const type = document.getElementById('filterType').value;

    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }

    try {
        let url = `/vehicles?start_date=${startDate}&end_date=${endDate}`;
        if (type) url += `&type=${type}`;

        const data = await apiRequest(url);
        currentVehicles = data.data.vehicles || [];
        displayVehicles(currentVehicles);
    } catch (error) {
        console.error('Error searching vehicles:', error);
    }
}

async function searchAndNavigate(searchData) {
    if (!searchData.start_date || !searchData.end_date) {
        showError('Please select both start and end dates');
        return;
    }

    try {
        let url = `/availability/search?start_date=${searchData.start_date}&end_date=${searchData.end_date}`;
        if (searchData.type) url += `&type=${searchData.type}`;

        const data = await apiRequest(url);
        currentVehicles = data.data.vehicles || [];

        // Navigate to vehicles page and show results
        showSection('vehicles');
        document.querySelector('[href="#vehicles"]').click();
        displayVehicles(currentVehicles);

        // Update filter values
        document.getElementById('filterStartDate').value = searchData.start_date;
        document.getElementById('filterEndDate').value = searchData.end_date;
        document.getElementById('filterType').value = searchData.type || '';
    } catch (error) {
        console.error('Error searching vehicles:', error);
    }
}

// Vehicle Selection
async function selectVehicle(vehicleId) {
    try {
        const data = await apiRequest(`/vehicles/${vehicleId}`);
        selectedVehicle = data.data;

        // Navigate to booking page
        showSection('booking');
        document.querySelector('[href="#booking"]').classList.add('active');

        displayBookingSummary();
        calculatePrice();
    } catch (error) {
        console.error('Error selecting vehicle:', error);
    }
}

function displayBookingSummary() {
    if (!selectedVehicle) return;

    const container = document.getElementById('bookingVehicleInfo');
    const features = selectedVehicle.features ? JSON.parse(selectedVehicle.features) : [];

    container.innerHTML = `
        <div class="vehicle-summary">
            <h4>${selectedVehicle.model}</h4>
            <p><strong>Type:</strong> ${selectedVehicle.type}</p>
            <p><strong>Daily Rate:</strong> $${selectedVehicle.rent_per_day}</p>
            <div class="vehicle-features">
                ${features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
            </div>
        </div>
    `;
}

function calculatePrice() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate || !selectedVehicle) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) return;

    const dailyRate = selectedVehicle.rent_per_day;
    const subtotal = days * dailyRate;
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    const container = document.getElementById('priceBreakdown');
    container.innerHTML = `
        <div class="price-item">
            <span>Daily Rate:</span>
            <span>$${dailyRate}</span>
        </div>
        <div class="price-item">
            <span>Rental Days:</span>
            <span>${days}</span>
        </div>
        <div class="price-item">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
        </div>
        <div class="price-item">
            <span>Tax (10%):</span>
            <span>$${tax.toFixed(2)}</span>
        </div>
        <div class="price-total">
            <span>Total:</span>
            <span>$${total.toFixed(2)}</span>
        </div>
    `;
}

// Booking Functions
async function handleBookingSubmission() {
    if (!selectedVehicle) {
        showError('Please select a vehicle first');
        return;
    }

    const formData = new FormData(document.getElementById('bookingForm'));
    const bookingData = {
        vehicle_id: selectedVehicle.id,
        customer_data: {
            Name: formData.get('name'),
            Email: formData.get('email'),
            Phone_number: formData.get('phone')
        },
        dates: {
            start_date: document.getElementById('startDate').value,
            end_date: document.getElementById('endDate').value
        }
    };

    try {
        // First, check availability
        const availabilityCheck = await apiRequest(
            `/availability/check?vehicle_id=${selectedVehicle.id}&start_date=${bookingData.dates.start_date}&end_date=${bookingData.dates.end_date}`
        );

        if (!availabilityCheck.data.available) {
            showError('This vehicle is not available for the selected dates');
            return;
        }

        // Create booking
        const booking = await apiRequest('/booking/create', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });

        showBookingConfirmation(booking.data);

    } catch (error) {
        console.error('Error creating booking:', error);
    }
}

function showBookingConfirmation(bookingData) {
    const container = document.getElementById('bookingConfirmation');
    container.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-check-circle" style="font-size: 4rem; color: var(--success-color); margin-bottom: 1rem;"></i>
            <h3>Booking Confirmed!</h3>
            <p><strong>Booking ID:</strong> #${bookingData.id}</p>
            <p><strong>Vehicle:</strong> ${bookingData.vehicle.model}</p>
            <p><strong>Customer:</strong> ${bookingData.customer.Name}</p>
            <p><strong>Dates:</strong> ${bookingData.rental.start_date} to ${bookingData.rental.end_date}</p>
            <p><strong>Total Amount:</strong> $${bookingData.pricing.total_amount}</p>
            <p><strong>Status:</strong> <span class="booking-status status-${bookingData.rental.status}">${bookingData.rental.status}</span></p>
        </div>
    `;

    showModal('bookingModal');
}

// Customer Bookings
async function loadCustomerBookings() {
    const email = document.getElementById('customerEmailSearch').value;

    if (!email) {
        showError('Please enter your email address');
        return;
    }

    try {
        // For demo purposes, we'll get all rentals and filter by email
        const data = await apiRequest('/rentals');
        const rentals = data.data.rentals || [];

        // Filter rentals by customer email (this would be better with a proper API endpoint)
        const customerRentals = rentals.filter(rental =>
            rental.customer_email && rental.customer_email.toLowerCase() === email.toLowerCase()
        );

        displayCustomerBookings(customerRentals);
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

function displayCustomerBookings(bookings) {
    const container = document.getElementById('bookingsList');

    if (bookings.length === 0) {
        container.innerHTML = '<p>No bookings found for this email address.</p>';
        return;
    }

    container.innerHTML = bookings.map(booking => `
        <div class="booking-item">
            <div class="booking-info">
                <h4>Booking #${booking.id}</h4>
                <p><strong>Vehicle:</strong> ${booking.model} (${booking.type})</p>
                <p><strong>Dates:</strong> ${booking.start_date} to ${booking.end_date}</p>
                <p><strong>Total:</strong> $${booking.total_amount}</p>
            </div>
            <div>
                <span class="booking-status status-${booking.status}">${booking.status}</span>
            </div>
        </div>
    `).join('');
}

// Admin Functions
async function handleAdminLogin() {
    const formData = new FormData(document.getElementById('adminLoginForm'));
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(loginData)
        });

        adminToken = data.data.token;
        showAdminDashboard();

    } catch (error) {
        console.error('Admin login failed:', error);
    }
}

function showAdminDashboard() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';

    loadAdminStats();
    showAdminTab('vehicles');
}

async function loadAdminStats() {
    try {
        // Load vehicles count
        const vehiclesData = await apiRequest('/vehicles');
        document.getElementById('totalVehicles').textContent = vehiclesData.data.count || 0;

        // Load customers count
        const customersData = await apiRequest('/customers');
        document.getElementById('totalCustomers').textContent = customersData.length || 0;

        // Load rentals
        const rentalsData = await apiRequest('/rentals');
        const rentals = rentalsData.data.rentals || [];
        const activeRentals = rentals.filter(r => r.status === 'active' || r.status === 'confirmed').length;
        document.getElementById('activeRentals').textContent = activeRentals;

        // Calculate revenue (completed rentals)
        const revenue = rentals
            .filter(r => r.status === 'completed')
            .reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
        document.getElementById('totalRevenue').textContent = `$${revenue.toFixed(2)}`;

    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

function showAdminTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Load tab content
    const contentContainer = document.querySelector('.admin-content');

    switch(tab) {
        case 'vehicles':
            loadAdminVehicles(contentContainer);
            break;
        case 'customers':
            loadAdminCustomers(contentContainer);
            break;
        case 'rentals':
            loadAdminRentals(contentContainer);
            break;
        case 'payments':
            loadAdminPayments(contentContainer);
            break;
    }
}

async function loadAdminVehicles(container) {
    try {
        const data = await apiRequest('/vehicles');
        const vehicles = data.data.vehicles || [];

        container.innerHTML = `
            <div class="admin-table">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--light-color);">
                            <th style="padding: 1rem; text-align: left;">Model</th>
                            <th style="padding: 1rem; text-align: left;">Type</th>
                            <th style="padding: 1rem; text-align: left;">Daily Rate</th>
                            <th style="padding: 1rem; text-align: left;">Available</th>
                            <th style="padding: 1rem; text-align: left;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vehicles.map(vehicle => `
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 1rem;">${vehicle.model}</td>
                                <td style="padding: 1rem;">${vehicle.type}</td>
                                <td style="padding: 1rem;">$${vehicle.rent_per_day}</td>
                                <td style="padding: 1rem;">
                                    <span style="color: ${vehicle.availability ? 'var(--success-color)' : 'var(--danger-color)'};">
                                        ${vehicle.availability ? 'Yes' : 'No'}
                                    </span>
                                </td>
                                <td style="padding: 1rem;">
                                    <button class="btn btn-sm btn-primary" onclick="editVehicle(${vehicle.id})">Edit</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading admin vehicles:', error);
    }
}

async function loadAdminCustomers(container) {
    try {
        const customers = await apiRequest('/customers');

        container.innerHTML = `
            <div class="admin-table">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--light-color);">
                            <th style="padding: 1rem; text-align: left;">Name</th>
                            <th style="padding: 1rem; text-align: left;">Email</th>
                            <th style="padding: 1rem; text-align: left;">Phone</th>
                            <th style="padding: 1rem; text-align: left;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.map(customer => `
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 1rem;">${customer.Name}</td>
                                <td style="padding: 1rem;">${customer.Email}</td>
                                <td style="padding: 1rem;">${customer.Phone_number}</td>
                                <td style="padding: 1rem;">
                                    <button class="btn btn-sm btn-primary" onclick="editCustomer(${customer.Customer_id})">Edit</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading admin customers:', error);
    }
}

async function loadAdminRentals(container) {
    try {
        const data = await apiRequest('/rentals');
        const rentals = data.data.rentals || [];

        container.innerHTML = `
            <div class="admin-table">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--light-color);">
                            <th style="padding: 1rem; text-align: left;">ID</th>
                            <th style="padding: 1rem; text-align: left;">Customer</th>
                            <th style="padding: 1rem; text-align: left;">Vehicle</th>
                            <th style="padding: 1rem; text-align: left;">Dates</th>
                            <th style="padding: 1rem; text-align: left;">Amount</th>
                            <th style="padding: 1rem; text-align: left;">Status</th>
                            <th style="padding: 1rem; text-align: left;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rentals.map(rental => `
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 1rem;">#${rental.id}</td>
                                <td style="padding: 1rem;">${rental.customer_name}</td>
                                <td style="padding: 1rem;">${rental.model}</td>
                                <td style="padding: 1rem;">${rental.start_date} - ${rental.end_date}</td>
                                <td style="padding: 1rem;">$${rental.total_amount}</td>
                                <td style="padding: 1rem;">
                                    <span class="booking-status status-${rental.status}">${rental.status}</span>
                                </td>
                                <td style="padding: 1rem;">
                                    <button class="btn btn-sm btn-primary" onclick="updateRentalStatus(${rental.id})">Update</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading admin rentals:', error);
    }
}

async function loadAdminPayments(container) {
    try {
        const payments = await apiRequest('/payments');

        container.innerHTML = `
            <div class="admin-table">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--light-color);">
                            <th style="padding: 1rem; text-align: left;">ID</th>
                            <th style="padding: 1rem; text-align: left;">Rental ID</th>
                            <th style="padding: 1rem; text-align: left;">Amount</th>
                            <th style="padding: 1rem; text-align: left;">Method</th>
                            <th style="padding: 1rem; text-align: left;">Status</th>
                            <th style="padding: 1rem; text-align: left;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => `
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 1rem;">#${payment.id}</td>
                                <td style="padding: 1rem;">#${payment.rental_id}</td>
                                <td style="padding: 1rem;">$${payment.amount}</td>
                                <td style="padding: 1rem;">${payment.payment_method || 'N/A'}</td>
                                <td style="padding: 1rem;">
                                    <span class="booking-status status-${payment.status}">${payment.status}</span>
                                </td>
                                <td style="padding: 1rem;">${payment.payment_date || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading admin payments:', error);
    }
}

// Utility Functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showError(message) {
    alert(message); // Simple error display - could be enhanced with a toast notification
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

// Placeholder functions for future functionality
function editVehicle(id) {
    console.log('Edit vehicle:', id);
    // Implement edit functionality
}

function editCustomer(id) {
    console.log('Edit customer:', id);
    // Implement edit functionality
}

function updateRentalStatus(id) {
    console.log('Update rental status:', id);
    // Implement status update functionality
}