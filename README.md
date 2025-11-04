# Vehicle Rental Management System 🚗

A comprehensive vehicle rental management system with full frontend-backend integration, real-time availability checking, booking management, and payment processing capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vehicle-rental-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and Stripe credentials
   ```

4. **Set up the database**
   ```bash
   node simple-setup.js
   ```

5. **Start the server**
   ```bash
   node server.js
   ```

6. **Access the application**
   - Frontend: `http://localhost:4000`
   - API: `http://localhost:4000/api`

## 📋 Features

### ✅ **Core Functionality**
- **Vehicle Management**: Complete CRUD operations for vehicles with enhanced features
- **Customer Management**: Customer registration and management system
- **Booking System**: Real-time availability checking and booking creation
- **Payment Integration**: Stripe payment processing (ready for production)
- **Admin Dashboard**: Comprehensive admin interface with statistics
- **Availability Checking**: Real-time vehicle availability for date ranges

### ✅ **Frontend Features**
- **Modern UI**: Responsive design with Material Design principles
- **Vehicle Search**: Advanced filtering by type, dates, and price
- **Interactive Booking Flow**: Step-by-step booking process
- **Customer Portal**: View booking history and manage reservations
- **Admin Interface**: Complete management dashboard

### ✅ **Backend Features**
- **RESTful API**: Complete REST API with consistent response format
- **Database Management**: Optimized MySQL database with proper relationships
- **Security**: Input validation, SQL injection protection, JWT authentication
- **Error Handling**: Comprehensive error handling and logging
- **Real-time Updates**: Live availability checking

## 🛠️ API Endpoints

### Vehicle Management
- `GET /api/vehicles` - List all vehicles (with filtering options)
- `GET /api/vehicles/:id` - Get single vehicle details
- `POST /api/vehicles` - Add new vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Customer Management
- `GET /api/customers` - List all customers
- `POST /api/customers` - Add new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Availability & Booking
- `GET /api/availability/search?start_date=&end_date=&type=` - Search available vehicles
- `GET /api/availability/check?vehicle_id=&start_date=&end_date=` - Check specific vehicle availability
- `POST /api/booking/create` - Create complete booking
- `GET /api/booking/:id` - Get booking details
- `PUT /api/booking/:id/status` - Update booking status

### Payment Processing
- `POST /api/stripe/create-payment-intent` - Create Stripe payment
- `POST /api/stripe/confirm-payment` - Confirm payment
- `POST /api/stripe/webhook` - Handle Stripe webhooks

### Admin Functions
- `POST /api/auth/login` - Admin authentication
- `GET /api/rentals` - List all rentals
- `GET /api/payments` - List all payments

## 🗄️ Database Schema

### Tables Created:
1. **`customer`** - Customer information
   - Customer_id (Primary Key)
   - Name, Phone_number, Email
   - created_at, updated_at

2. **`vehicle`** - Vehicle inventory
   - id (Primary Key)
   - model, type, rent_per_day
   - availability, features (JSON), seats, transmission, fuel_type
   - image_url, created_at, updated_at

3. **`rental`** - Rental records
   - id (Primary Key)
   - customer_id, vehicle_id (Foreign Keys)
   - start_date, end_date, total_amount
   - status (pending, confirmed, active, completed, cancelled)
   - created_at, updated_at

4. **`payment`** - Payment records
   - id (Primary Key)
   - rental_id (Foreign Key)
   - amount, payment_date, payment_method
   - stripe_payment_intent_id, status
   - created_at, updated_at

## 🎨 Frontend Structure

```
public/
├── index.html          # Main application
├── css/
│   └── style.css        # Styling
└── js/
    └── app.js          # Frontend JavaScript
```

### Frontend Pages:
1. **Home Page** - Hero section with vehicle search
2. **Vehicles Page** - Browse and filter available vehicles
3. **Booking Page** - Complete booking form with payment
4. **My Bookings** - Customer booking history
5. **Admin Dashboard** - Management interface

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Database Configuration
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key

# Admin Credentials
ADMIN_EMAIL=admin@vehicle-rental.com
ADMIN_PASSWORD=admin123

# Server Configuration
PORT=4000
NODE_ENV=development
```

## 🧪 Testing

### Manual Testing Scenarios:

1. **Vehicle Search**
   - Navigate to `http://localhost:4000`
   - Use the search form to find vehicles for specific dates
   - Filter by vehicle type

2. **Customer Booking**
   - Select a vehicle from the search results
   - Fill in customer information
   - Complete the booking process

3. **Admin Functions**
   - Go to Admin section
   - Login with: admin@vehicle-rental.com / admin123
   - View statistics and manage data

4. **API Testing**
   ```bash
   # Get all vehicles
   curl http://localhost:4000/api/vehicles

   # Search available vehicles
   curl "http://localhost:4000/api/availability/search?start_date=2025-12-20&end_date=2025-12-25"

   # Add customer
   curl -X POST http://localhost:4000/api/customers \
     -H "Content-Type: application/json" \
     -d '{"Name":"John Doe","Phone_number":"+1-555-123-4567","Email":"john@example.com"}'
   ```

## 🔒 Security Features

- **Input Validation**: All API inputs are validated and sanitized
- **SQL Injection Protection**: Parameterized queries used throughout
- **Authentication**: JWT-based admin authentication
- **CORS Configuration**: Properly configured for frontend integration
- **Environment Variables**: Sensitive data stored securely
- **Rate Limiting**: Protection against brute force attacks

## 📊 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (HTML/CSS/JS) │◄──►│   (Express.js)  │◄──►│   (MySQL)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
   Vehicle Search         RESTful API Endpoints      Data Storage
   Booking Forms           Business Logic            Relationships
   Admin Dashboard         Validation & Security       Transactions
   Customer Portal         Payment Integration        Availability
```

## 🚀 Production Deployment

### For Production:

1. **Update Environment Variables**
   ```bash
   # Use production Stripe keys
   STRIPE_SECRET_KEY=sk_live_your_production_key
   STRIPE_PUBLISHABLE_KEY=pk_live_your_production_key

   # Use strong JWT secret
   JWT_SECRET=your_production_jwt_secret_at_least_32_characters

   # Change admin credentials
   ADMIN_EMAIL=your_admin@yourdomain.com
   ADMIN_PASSWORD=your_secure_password
   ```

2. **Database Setup**
   - Use production MySQL database
   - Set up proper database backups
   - Configure connection pooling

3. **Server Configuration**
   - Use HTTPS (SSL certificate)
   - Set up reverse proxy (nginx/Apache)
   - Configure firewall rules
   - Set up monitoring and logging

4. **Stripe Configuration**
   - Configure webhook endpoints
   - Set up webhook signing secrets
   - Configure payment methods

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Check the documentation above
- Review the API endpoints
- Test with the provided examples
- Check error logs in the console

---

**Vehicle Rental Management System** - Built with ❤️ using Node.js, Express, MySQL, and modern web technologies.