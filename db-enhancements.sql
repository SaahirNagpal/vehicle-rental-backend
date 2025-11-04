-- Database Schema Enhancements for Vehicle Rental Management System
-- This script adds new columns and indexes to support enhanced functionality

-- Vehicle Table Additions
ALTER TABLE vehicle
ADD COLUMN image_url VARCHAR(255) NULL COMMENT 'Path to vehicle image',
ADD COLUMN features JSON NULL COMMENT 'Vehicle features array',
ADD COLUMN seats INT NULL COMMENT 'Number of seats',
ADD COLUMN transmission VARCHAR(20) NULL COMMENT 'Manual/Automatic',
ADD COLUMN fuel_type VARCHAR(20) NULL COMMENT 'Gasoline/Diesel/Electric';

-- Rental Table Additions
ALTER TABLE rental
ADD COLUMN status ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled') DEFAULT 'pending' COMMENT 'Current rental status',
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Booking creation time',
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time';

-- Payment Table Additions
ALTER TABLE payment
ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL COMMENT 'Stripe payment ID',
ADD COLUMN status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending' COMMENT 'Payment status',
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Payment creation time';

-- New Indexes for Performance

-- Rental Table Indexes
CREATE INDEX idx_vehicle_date_range ON rental(vehicle_id, start_date, end_date);
CREATE INDEX idx_customer_rentals ON rental(customer_id, created_at);
CREATE INDEX idx_rental_status ON rental(status);

-- Payment Table Indexes
CREATE INDEX idx_rental_payments ON payment(rental_id);
CREATE INDEX idx_stripe_intent ON payment(stripe_payment_intent_id);
CREATE INDEX idx_payment_status ON payment(status);

-- Vehicle Table Indexes
CREATE INDEX idx_vehicle_type ON vehicle(type);
CREATE INDEX idx_vehicle_availability ON vehicle(availability);

-- Sample Data Insertions (Optional - for testing)

-- Add some sample vehicles with enhanced fields
UPDATE vehicle SET
  features = '["Automatic", "5 Seats", "Air Conditioning", "GPS"]',
  seats = 5,
  transmission = 'Automatic',
  fuel_type = 'Gasoline',
  image_url = '/images/sedan-default.jpg'
WHERE type = 'Sedan' AND model LIKE '%Camry%';

UPDATE vehicle SET
  features = '["Manual", "7 Seats", "Air Conditioning", "Cargo Space"]',
  seats = 7,
  transmission = 'Manual',
  fuel_type = 'Gasoline',
  image_url = '/images/suv-default.jpg'
WHERE type = 'SUV' AND model LIKE '%Explorer%';

UPDATE vehicle SET
  features = '["Automatic", "2 Seats", "Leather Interior", "Premium Audio"]',
  seats = 2,
  transmission = 'Automatic',
  fuel_type = 'Gasoline',
  image_url = '/images/luxury-default.jpg'
WHERE type = 'Luxury' AND model LIKE '%BMW%';

-- Create a view for vehicle availability with rental counts
CREATE OR REPLACE VIEW vehicle_availability AS
SELECT
  v.*,
  COUNT(r.id) as active_rentals,
  CASE
    WHEN COUNT(r.id) = 0 THEN true
    ELSE false
  END as currently_available
FROM vehicle v
LEFT JOIN rental r ON v.id = r.vehicle_id
  AND r.status IN ('active', 'confirmed')
  AND r.end_date >= CURDATE()
GROUP BY v.id;

-- Create a view for rental statistics
CREATE OR REPLACE VIEW rental_statistics AS
SELECT
  DATE_FORMAT(created_at, '%Y-%m') as rental_month,
  COUNT(*) as total_rentals,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as average_rental_amount,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rentals,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_rentals
FROM rental
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY rental_month DESC;