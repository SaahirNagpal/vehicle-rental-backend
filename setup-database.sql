-- Vehicle Rental Management System Database Setup
-- Create all required tables with proper structure

-- Create customer table
CREATE TABLE IF NOT EXISTS customer (
  Customer_id INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(255) NOT NULL,
  Phone_number VARCHAR(20) NOT NULL,
  Email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create vehicle table with enhanced fields
CREATE TABLE IF NOT EXISTS vehicle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  rent_per_day DECIMAL(10, 2) NOT NULL,
  availability BOOLEAN DEFAULT TRUE,
  image_url VARCHAR(255) NULL,
  features JSON NULL,
  seats INT NULL,
  transmission VARCHAR(20) NULL,
  fuel_type VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vehicle_type (type),
  INDEX idx_vehicle_availability (availability)
);

-- Create rental table with enhanced fields
CREATE TABLE IF NOT EXISTS rental (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer(Customer_id) ON DELETE RESTRICT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicle(id) ON DELETE RESTRICT,
  INDEX idx_vehicle_date_range (vehicle_id, start_date, end_date),
  INDEX idx_customer_rentals (customer_id, created_at),
  INDEX idx_rental_status (status),
  CONSTRAINT chk_rental_dates CHECK (end_date >= start_date)
);

-- Create payment table with enhanced fields
CREATE TABLE IF NOT EXISTS payment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rental_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE,
  payment_method VARCHAR(50),
  stripe_payment_intent_id VARCHAR(255) NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rental_id) REFERENCES rental(id) ON DELETE CASCADE,
  INDEX idx_rental_payments (rental_id),
  INDEX idx_stripe_intent (stripe_payment_intent_id),
  INDEX idx_payment_status (status)
);

-- Insert sample data for testing
INSERT IGNORE INTO customer (Customer_id, Name, Phone_number, Email) VALUES
(1, 'John Doe', '+1-555-123-4567', 'john.doe@example.com'),
(2, 'Jane Smith', '+1-555-987-6543', 'jane.smith@example.com'),
(3, 'Bob Johnson', '+1-555-456-7890', 'bob.johnson@example.com');

-- Insert sample vehicles
INSERT IGNORE INTO vehicle (id, model, type, rent_per_day, availability, features, seats, transmission, fuel_type, image_url) VALUES
(1, 'Toyota Camry', 'Sedan', 45.00, TRUE, '["Automatic", "5 Seats", "Air Conditioning", "GPS"]', 5, 'Automatic', 'Gasoline', '/images/toyota-camry.jpg'),
(2, 'Honda Accord', 'Sedan', 50.00, TRUE, '["Automatic", "5 Seats", "Air Conditioning", "Leather Seats"]', 5, 'Automatic', 'Gasoline', '/images/honda-accord.jpg'),
(3, 'Ford Explorer', 'SUV', 75.00, TRUE, '["Automatic", "7 Seats", "Air Conditioning", "4WD"]', 7, 'Automatic', 'Gasoline', '/images/ford-explorer.jpg'),
(4, 'Chevrolet Tahoe', 'SUV', 85.00, TRUE, '["Automatic", "8 Seats", "Air Conditioning", "Cargo Space"]', 8, 'Automatic', 'Gasoline', '/images/chevy-tahoe.jpg'),
(5, 'Ford F-150', 'Truck', 90.00, TRUE, '["Manual", "3 Seats", "Towing Package", "4WD"]', 3, 'Manual', 'Gasoline', '/images/ford-f150.jpg'),
(6, 'BMW 3 Series', 'Luxury', 120.00, TRUE, '["Automatic", "5 Seats", "Leather Interior", "Premium Audio"]', 5, 'Automatic', 'Gasoline', '/images/bmw-3series.jpg'),
(7, 'Mercedes S-Class', 'Luxury', 200.00, TRUE, '["Automatic", "5 Seats", "Premium Interior", "Massage Seats"]', 5, 'Automatic', 'Gasoline', '/images/mercedes-sclass.jpg'),
(8, 'Tesla Model 3', 'Electric', 110.00, TRUE, '["Automatic", "5 Seats", "Autopilot", "Electric"]', 5, 'Automatic', 'Electric', '/images/tesla-model3.jpg');

-- Insert sample rentals
INSERT IGNORE INTO rental (id, customer_id, vehicle_id, start_date, end_date, total_amount, status) VALUES
(1, 1, 1, '2025-01-15', '2025-01-18', 148.50, 'completed'),
(2, 2, 3, '2025-01-20', '2025-01-25', 462.50, 'confirmed'),
(3, 3, 5, '2025-02-01', '2025-02-05', 396.00, 'pending');

-- Insert sample payments
INSERT IGNORE INTO payment (id, rental_id, amount, payment_date, payment_method, status) VALUES
(1, 1, 148.50, '2025-01-14', 'credit_card', 'completed'),
(2, 2, 462.50, '2025-01-19', 'credit_card', 'completed'),
(3, 3, 396.00, NULL, NULL, 'pending');

-- Create views for easier reporting
CREATE OR REPLACE VIEW vehicle_rental_summary AS
SELECT
  v.id,
  v.model,
  v.type,
  v.rent_per_day,
  v.availability,
  COUNT(r.id) as total_rentals,
  COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.total_amount ELSE 0 END), 0) as total_revenue,
  COALESCE(AVG(CASE WHEN r.status = 'completed' THEN r.total_amount ELSE NULL END), 0) as average_revenue_per_rental
FROM vehicle v
LEFT JOIN rental r ON v.id = r.vehicle_id
GROUP BY v.id, v.model, v.type, v.rent_per_day, v.availability
ORDER BY total_revenue DESC;

CREATE OR REPLACE VIEW customer_rental_history AS
SELECT
  c.Customer_id,
  c.Name,
  c.Email,
  COUNT(r.id) as total_rentals,
  COALESCE(SUM(CASE WHEN r.status = 'completed' THEN r.total_amount ELSE 0 END), 0) as total_spent,
  MAX(r.created_at) as last_rental_date,
  r.status as last_rental_status
FROM customer c
LEFT JOIN rental r ON c.Customer_id = r.customer_id
GROUP BY c.Customer_id, c.Name, c.Email
ORDER BY total_spent DESC;