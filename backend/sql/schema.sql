-- Cloud Note 数据库表结构

-- 创建数据库
CREATE DATABASE IF NOT EXISTS cloudnote CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cloudnote;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- 文件夹表
CREATE TABLE IF NOT EXISTS folders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT NULL,
    user_id INT NULL,
    path VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    INDEX idx_user_id (user_id),
    INDEX idx_path (path(255))
);

-- 文件表
CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content LONGTEXT,
    parent_id INT NOT NULL,
    user_id INT NOT NULL,
    type VARCHAR(10) DEFAULT '.md',
    size BIGINT DEFAULT 0,
    file_path VARCHAR(500) NULL,
    is_uploaded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent_id (parent_id),
    INDEX idx_user_id (user_id),
    INDEX idx_name (name),
    INDEX idx_type (type)
);

-- 插入默认的 root 文件夹
INSERT IGNORE INTO folders (id, name, parent_id, user_id, path, created_at) 
VALUES (1, 'root', NULL, NULL, '/', NOW());

-- 为了兼容性，确保 AUTO_INCREMENT 从适当的值开始
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE folders AUTO_INCREMENT = 2;
ALTER TABLE files AUTO_INCREMENT = 1;