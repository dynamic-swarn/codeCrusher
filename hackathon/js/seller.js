// seller.js - Updated with switch account functionality

// Seller Dashboard System
class SellerDashboard {
    constructor() {
        this.currentUser = null;
        this.currentSeller = null;
        this.uploadedImages = [];
        this.isEditing = false;
        this.editProductId = null;
        this.initializeApp();
    }
    
    initializeApp() {
        document.addEventListener('DOMContentLoaded', () => {
            this.checkAuthentication();
            this.setupEventListeners();
            this.setupFormValidation();
        });
    }
    
    checkAuthentication() {
        // Get current user email from localStorage
        const currentUserEmail = localStorage.getItem('currentUser');
        
        if (!currentUserEmail) {
            // No user logged in, redirect to login page
            alert('Please login first');
            window.location.href = '../login/index.html';
            return;
        }
        
        // Get user data
        const users = JSON.parse(localStorage.getItem('users')) || [];
        this.currentUser = users.find(user => user.email === currentUserEmail);
        
        if (!this.currentUser) {
            alert('User not found. Please login again.');
            window.location.href = '../login/index.html';
            return;
        }
        
        // Check if user is a seller
        if (this.currentUser.accountType !== 'seller') {
            // Ask user if they want to become a seller
            const confirmSeller = confirm('You need a seller account to access this page. Would you like to become a seller?');
            if (confirmSeller) {
                this.convertToSeller();
            } else {
                this.switchToBuyer();
            }
        } else {
            this.initializeSeller();
        }
    }
    
    convertToSeller() {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const currentUserEmail = localStorage.getItem('currentUser');
        
        this.currentUser.accountType = 'seller';
        this.currentUser.sellerSince = new Date().toISOString();
        
        // Update user in localStorage
        const userIndex = users.findIndex(user => user.email === currentUserEmail);
        users[userIndex] = this.currentUser;
        localStorage.setItem('users', JSON.stringify(users));
        
        this.initializeSeller();
    }
    
    initializeSeller() {
        // Load seller data
        let sellerData = JSON.parse(localStorage.getItem('sellerData')) || {};
        
        // Check if seller data exists for this user
        if (!sellerData[this.currentUser.email]) {
            // Create new seller profile
            sellerData[this.currentUser.email] = {
                id: 'SELLER_' + Date.now(),
                userId: this.currentUser.email,
                name: this.currentUser.name || this.currentUser.email.split('@')[0],
                email: this.currentUser.email,
                storeName: this.currentUser.storeName || `${this.currentUser.name || 'My'} Store`,
                phone: this.currentUser.phone || '',
                description: this.currentUser.storeDescription || '',
                address: '',
                joinDate: this.currentUser.sellerSince || new Date().toISOString(),
                isNewSeller: true,
                stats: {
                    totalProducts: 0,
                    activeOrders: 0,
                    totalSales: 0,
                    rating: 0,
                    totalViews: 0,
                    totalOrders: 0,
                    totalRevenue: 0,
                    conversionRate: 0
                },
                settings: {
                    shippingEnabled: true,
                    returnsEnabled: true,
                    notifications: true
                }
            };
            localStorage.setItem('sellerData', JSON.stringify(sellerData));
        }
        
        this.currentSeller = sellerData[this.currentUser.email];
        this.loadSellerData();
        this.updateUIForSeller();
    }
    
    setupEventListeners() {
        // Image Upload
        const uploadBox = document.getElementById('uploadBox');
        const imageUpload = document.getElementById('imageUpload');
        
        uploadBox.addEventListener('click', () => imageUpload.click());
        
        imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Drag and Drop
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = '#4361ee';
            uploadBox.style.backgroundColor = '#f0f4ff';
        });
        
        uploadBox.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = '#dee2e6';
            uploadBox.style.backgroundColor = '#f8f9fa';
        });
        
        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = '#dee2e6';
            uploadBox.style.backgroundColor = '#f8f9fa';
            this.handleImageDrop(e);
        });
        
        // Form Events
        document.getElementById('productPrice').addEventListener('input', () => this.calculateDiscount());
        document.getElementById('productDiscount').addEventListener('input', () => this.calculateDiscount());
        document.getElementById('productDescription').addEventListener('input', () => this.updateCharCount());
        
        // Button Events
        document.getElementById('saveDraft').addEventListener('click', () => this.saveAsDraft());
        document.getElementById('addFirstProduct').addEventListener('click', () => this.showProductForm());
        document.getElementById('quickAdd').addEventListener('click', () => this.showProductForm());
        document.getElementById('addAnotherProduct').addEventListener('click', () => this.showProductForm());
        document.getElementById('addNewProduct').addEventListener('click', () => this.showProductForm());
        document.getElementById('startAddingProducts').addEventListener('click', () => this.showProductForm());
        document.getElementById('previewProduct').addEventListener('click', () => this.previewProduct());
        document.getElementById('viewMyStore').addEventListener('click', () => this.viewStore());
        document.getElementById('viewStore').addEventListener('click', () => this.viewStore());
        document.getElementById('viewAllProducts').addEventListener('click', () => this.viewAllProducts());
        document.getElementById('editProfile').addEventListener('click', () => this.showEditProfile());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        
        // Switch Account Events
        document.getElementById('switchAccountBtn').addEventListener('click', () => this.showSwitchAccountModal());
        document.getElementById('sidebarSwitchBtn').addEventListener('click', () => this.showSwitchAccountModal());
        document.getElementById('cancelSwitch').addEventListener('click', () => this.closeSwitchModal());
        document.getElementById('confirmSwitch').addEventListener('click', () => this.switchToBuyer());
        
        // Form Submission
        document.getElementById('productForm').addEventListener('submit', (e) => this.submitProduct(e));
        document.getElementById('profileForm').addEventListener('submit', (e) => this.updateProfile(e));
        
        // Modal Events
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('closeProfileModal').addEventListener('click', () => this.closeEditProfile());
        document.getElementById('cancelProfileEdit').addEventListener('click', () => this.closeEditProfile());
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Navigation
        document.querySelectorAll('.sidebar-menu a, .nav-links a').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });
    }
    
    loadSellerData() {
        // Update UI with seller data
        document.getElementById('sellerName').textContent = this.currentSeller.storeName;
        document.getElementById('sellerEmail').textContent = this.currentSeller.email;
        document.getElementById('mobileSellerName').textContent = this.currentSeller.storeName;
        
        // Format join date
        const joinDate = new Date(this.currentSeller.joinDate);
        document.getElementById('joinDate').textContent = joinDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Load products
        const products = JSON.parse(localStorage.getItem('sellerProducts') || '{}');
        const userProducts = products[this.currentUser.email] || [];
        
        // Update stats
        document.getElementById('totalProducts').textContent = userProducts.length;
        document.getElementById('productCount').textContent = userProducts.length;
        document.getElementById('activeOrders').textContent = this.currentSeller.stats.activeOrders;
        document.getElementById('totalSales').textContent = `₹${this.currentSeller.stats.totalSales}`;
        
        // Update stats section if visible
        document.getElementById('totalViews').textContent = this.currentSeller.stats.totalViews;
        document.getElementById('totalOrders').textContent = this.currentSeller.stats.totalOrders;
        document.getElementById('totalRevenue').textContent = `₹${this.currentSeller.stats.totalRevenue}`;
        document.getElementById('conversionRate').textContent = `${this.currentSeller.stats.conversionRate}%`;
        
        // Update rating
        const stars = document.querySelector('.stars');
        if (this.currentSeller.stats.rating > 0) {
            stars.innerHTML = '★'.repeat(Math.round(this.currentSeller.stats.rating)) + '☆'.repeat(5 - Math.round(this.currentSeller.stats.rating));
            document.querySelector('.rating-text').textContent = `${this.currentSeller.stats.rating}/5.0`;
        }
        
        // Update dashboard header
        this.updateDashboardHeader();
    }
    
    showSwitchAccountModal() {
        document.getElementById('switchAccountModal').style.display = 'flex';
        document.getElementById('switchToAccount').textContent = 'Buyer';
    }
    
    closeSwitchModal() {
        document.getElementById('switchAccountModal').style.display = 'none';
    }
    
    switchToBuyer() {
        // Update user account type
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(user => user.email === this.currentUser.email);
        
        if (userIndex !== -1) {
            users[userIndex].accountType = 'buyer';
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        // Close modal
        this.closeSwitchModal();
        
        // Show confirmation message
        alert('Switching to buyer account...');
        
        // Redirect to buyer dashboard
        window.location.href = '../buyer/index.html';
    }
    
    // ... (rest of the existing methods remain the same - only showing new/changed methods)
    
    updateDashboardHeader() {
        const dashboardHeader = document.getElementById('dashboardHeader');
        const products = JSON.parse(localStorage.getItem('sellerProducts') || '{}');
        const userProducts = products[this.currentUser.email] || [];
        
        if (userProducts.length === 0) {
            dashboardHeader.innerHTML = `
                <h1><i class="fas fa-store"></i> Welcome, ${this.currentSeller.storeName}!</h1>
                <p>Ready to start your selling journey? Add your first product to begin.</p>
                <div class="header-stats">
                    <div class="header-stat">
                        <i class="fas fa-rocket"></i>
                        <div>
                            <h3>Beginner Friendly</h3>
                            <p>Easy setup, no experience needed</p>
                        </div>
                    </div>
                    <div class="header-stat">
                        <i class="fas fa-shield-alt"></i>
                        <div>
                            <h3>Secure Platform</h3>
                            <p>Safe payments, protected sales</p>
                        </div>
                    </div>
                    <div class="header-stat">
                        <i class="fas fa-chart-line"></i>
                        <div>
                            <h3>Grow Your Business</h3>
                            <p>Reach thousands of customers</p>
                        </div>
                    </div>
                    <div class="header-stat">
                        <i class="fas fa-exchange-alt"></i>
                        <div>
                            <h3>Switch Account</h3>
                            <p>Need to shop? Switch to buyer account</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            dashboardHeader.innerHTML = `
                <h1><i class="fas fa-tachometer-alt"></i> Dashboard</h1>
                <p>Welcome back, ${this.currentSeller.storeName}! Here's your store overview.</p>
                <div class="header-stats">
                    <div class="header-stat">
                        <i class="fas fa-box"></i>
                        <div>
                            <h3>Total Products</h3>
                            <p>${userProducts.length} items</p>
                        </div>
                    </div>
                    <div class="header-stat">
                        <i class="fas fa-shopping-cart"></i>
                        <div>
                            <h3>Active Orders</h3>
                            <p>${this.currentSeller.stats.activeOrders} pending</p>
                        </div>
                    </div>
                    <div class="header-stat">
                        <i class="fas fa-rupee-sign"></i>
                        <div>
                            <h3>Total Revenue</h3>
                            <p>₹${this.currentSeller.stats.totalRevenue}</p>
                        </div>
                    </div>
                    <div class="header-stat">
                        <i class="fas fa-exchange-alt"></i>
                        <div>
                            <h3>Switch Account</h3>
                            <p>Need to shop? Switch to buyer account</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    // ... (rest of the existing methods remain unchanged)
    
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear current user session
            localStorage.removeItem('currentUser');
            alert('Logged out successfully!');
            window.location.href = '../login/index.html';
        }
    }
}

// Initialize the dashboard when page loads
window.addEventListener('DOMContentLoaded', () => {
    const dashboard = new SellerDashboard();
});