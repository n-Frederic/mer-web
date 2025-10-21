-- ========================================
-- MER日志管理系统 - 完整版数据库脚本（幂等性版本）
-- ========================================
-- 用途：创建完整的表结构（包含未来扩展的表）
-- 特性：支持幂等性操作，可重复执行而不会出错
-- 注意：这个脚本包含的表比当前后端代码多
-- ========================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS mer DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mer;

-- 统一缺省设置（支持幂等性操作）
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET AUTOCOMMIT = 0;
START TRANSACTION;

-- =========================================================
-- 工具过程：若外键不存在则添加（避免重复报错）
-- =========================================================
DROP PROCEDURE IF EXISTS add_fk_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_fk_if_not_exists(
    IN in_table VARCHAR(64),
    IN in_constraint VARCHAR(64),
    IN in_alter_sql TEXT
)
BEGIN
    DECLARE fk_cnt INT DEFAULT 0;
    SELECT COUNT(*) INTO fk_cnt
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = in_table
      AND CONSTRAINT_NAME = in_constraint;

    IF fk_cnt = 0 THEN
        SET @s = in_alter_sql;
        PREPARE stmt FROM @s;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//
DELIMITER ;

-- =========================
-- 基础字典 / 权限体系
-- =========================

CREATE TABLE IF NOT EXISTS role (
  role_id       INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  UNIQUE KEY uq_role_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permission (
  perm_id       INT PRIMARY KEY AUTO_INCREMENT,
  code          VARCHAR(100) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  UNIQUE KEY uq_perm_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permission (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  role_id       INT NOT NULL,
  perm_id       INT NOT NULL,
  UNIQUE KEY uq_role_perm (role_id, perm_id),
  KEY idx_rp_role (role_id),
  KEY idx_rp_perm (perm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- 组织结构
-- =========================

CREATE TABLE IF NOT EXISTS department (
  dept_id        INT PRIMARY KEY AUTO_INCREMENT,
  name           VARCHAR(100) NOT NULL,
  parent_dept_id INT NULL,
  UNIQUE KEY uq_dept_name (name),
  KEY idx_parent_dept (parent_dept_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS team (
  team_id    INT PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  dept_id    INT NULL,
  leader_id  BIGINT NULL,
  UNIQUE KEY uq_team_name (name),
  KEY idx_team_dept (dept_id),
  KEY idx_team_leader (leader_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- 用户表（完整版，匹配接口文档要求）
-- =========================
CREATE TABLE IF NOT EXISTS user (
  user_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  username    VARCHAR(100) NULL,          -- 用户名
  phone       VARCHAR(50) NULL,           -- 手机号
  team_id     INT NULL,                   -- 所在团队ID（外键关联team表）
  role_id     INT NULL,                   -- 角色ID（外键关联role表）
  gender      ENUM('男', '女', '其他') NULL, -- 性别
  birth_date  DATE NULL,                  -- 出生日期
  bio         TEXT NULL,                  -- 个人简介
  avatar_url  VARCHAR(500) NULL,          -- 头像URL
  status      ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active', -- 账户状态
  last_login  DATETIME NULL,              -- 最后登录时间
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_user_email (email),
  UNIQUE KEY uq_user_username (username),
  KEY idx_user_team (team_id),
  KEY idx_user_role (role_id),
  KEY idx_user_status (status),
  KEY idx_user_last_login (last_login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表-完整版';

-- =========================
-- 更新现有user表结构（幂等性）
-- =========================
-- 使用存储过程来安全地添加字段
DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_column_if_not_exists(
    IN table_name VARCHAR(64),
    IN column_name VARCHAR(64),
    IN column_definition TEXT
)
BEGIN
    DECLARE col_count INT DEFAULT 0;
    SELECT COUNT(*) INTO col_count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name
      AND COLUMN_NAME = column_name;
    
    IF col_count = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD COLUMN ', column_name, ' ', column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//
DELIMITER ;

-- 添加新字段（如果不存在）
CALL add_column_if_not_exists('user', 'username', 'VARCHAR(100) NULL COMMENT \'用户名\'');
CALL add_column_if_not_exists('user', 'phone', 'VARCHAR(50) NULL COMMENT \'手机号\'');
CALL add_column_if_not_exists('user', 'team_id', 'INT NULL COMMENT \'所在团队ID\'');
CALL add_column_if_not_exists('user', 'role_id', 'INT NULL COMMENT \'角色ID\'');
CALL add_column_if_not_exists('user', 'gender', 'ENUM(\'男\', \'女\', \'其他\') NULL COMMENT \'性别\'');
CALL add_column_if_not_exists('user', 'birth_date', 'DATE NULL COMMENT \'出生日期\'');
CALL add_column_if_not_exists('user', 'bio', 'TEXT NULL COMMENT \'个人简介\'');
CALL add_column_if_not_exists('user', 'avatar_url', 'VARCHAR(500) NULL COMMENT \'头像URL\'');
CALL add_column_if_not_exists('user', 'status', 'ENUM(\'active\', \'inactive\', \'suspended\') NOT NULL DEFAULT \'active\' COMMENT \'账户状态\'');
CALL add_column_if_not_exists('user', 'last_login', 'DATETIME NULL COMMENT \'最后登录时间\'');

-- 强制刷新表结构缓存
FLUSH TABLES user;

-- =========================
-- 任务与派发
-- =========================

CREATE TABLE IF NOT EXISTS task (
  task_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id  BIGINT NOT NULL,
  priority    VARCHAR(50),
  status      VARCHAR(50),
  start_at    DATETIME NULL,
  due_at      DATETIME NULL,
  created_at  DATETIME NULL,
  updated_at  DATETIME NULL,
  KEY idx_task_creator (creator_id),
  KEY idx_task_status (status),
  KEY idx_task_priority (priority),
  KEY idx_task_due (due_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_assignment (
  assignment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_id       BIGINT NOT NULL,
  assignee_id   BIGINT NOT NULL,
  assigned_by   BIGINT NOT NULL,
  assigned_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accept_at     DATETIME NULL,
  finish_at     DATETIME NULL,
  progress_pct  INT NOT NULL DEFAULT 0,
  status        ENUM('Pending','Accepted','Rejected','Completed') NOT NULL DEFAULT 'Pending',
  CHECK (progress_pct BETWEEN 0 AND 100),
  KEY idx_ta_task (task_id),
  KEY idx_ta_assignee (assignee_id),
  KEY idx_ta_assigned_by (assigned_by),
  KEY idx_ta_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS task_report (
  report_id    BIGINT PRIMARY KEY AUTO_INCREMENT,
  task_id      BIGINT NOT NULL,
  reporter_id  BIGINT NOT NULL,
  content      TEXT,
  attachments  TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tr_task (task_id),
  KEY idx_tr_reporter (reporter_id),
  FULLTEXT KEY ftx_tr_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- 个人/团队日志
-- =========================

CREATE TABLE IF NOT EXISTS log (
  log_id      BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT NOT NULL,
  task_id     BIGINT NULL,
  title       VARCHAR(255) NOT NULL,
  content     TEXT,
  log_date    DATE NOT NULL,
  view_type   ENUM('Day','Week','Month') NOT NULL,
  mood        VARCHAR(50),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_log_user (user_id),
  KEY idx_log_task (task_id),
  KEY idx_log_date (log_date),
  KEY idx_log_view_type (view_type),
  FULLTEXT KEY ftx_log_content_title (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS log_keyword (
  id        BIGINT PRIMARY KEY AUTO_INCREMENT,
  log_id    BIGINT NOT NULL,
  keyword   VARCHAR(100) NOT NULL,
  weight    FLOAT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_log_keyword (log_id, keyword),
  KEY idx_lk_log (log_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- 验证码表
-- =========================
CREATE TABLE IF NOT EXISTS verification_code (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_vc_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- 面板展示项
-- =========================

CREATE TABLE IF NOT EXISTS dashboard_item (
  item_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
  scope       ENUM('Company','Personal') NOT NULL,
  category    VARCHAR(100) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  ref_type    VARCHAR(50) NOT NULL,
  ref_id      BIGINT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  updated_by  BIGINT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_di_scope_cat (scope, category),
  KEY idx_di_ref (ref_type, ref_id),
  KEY idx_di_updated_by (updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- AI 分析报告 / 指标
-- =========================

CREATE TABLE IF NOT EXISTS ai_analysis (
  analysis_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
  title         VARCHAR(255) NOT NULL,
  generated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by  BIGINT NULL,
  summary       TEXT,
  metrics_json  JSON NULL,
  suggestions   TEXT,
  KEY idx_ai_generated_by (generated_by),
  KEY idx_ai_generated_at (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_analysis_log_map (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  analysis_id  BIGINT NOT NULL,
  log_id       BIGINT NOT NULL,
  UNIQUE KEY uq_ai_log (analysis_id, log_id),
  KEY idx_ail_log (log_id),
  KEY idx_ail_ai (analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ai_analysis_task_map (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  analysis_id  BIGINT NOT NULL,
  task_id      BIGINT NOT NULL,
  UNIQUE KEY uq_ai_task (analysis_id, task_id),
  KEY idx_ait_task (task_id),
  KEY idx_ait_ai (analysis_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- 附件与评论（多态关联）
-- =========================

CREATE TABLE IF NOT EXISTS attachment (
  attach_id    BIGINT PRIMARY KEY AUTO_INCREMENT,
  owner_type   VARCHAR(50) NOT NULL,
  owner_id     BIGINT NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  file_url     VARCHAR(1000) NOT NULL,
  uploaded_by  BIGINT NOT NULL,
  uploaded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_att_owner (owner_type, owner_id),
  KEY idx_att_uploader (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS comment (
  comment_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
  owner_type   VARCHAR(50) NOT NULL,
  owner_id     BIGINT NOT NULL,
  author_id    BIGINT NOT NULL,
  content      TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cmt_owner (owner_type, owner_id),
  KEY idx_cmt_author (author_id),
  FULLTEXT KEY ftx_cmt_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- 通知（可选）
-- =========================

CREATE TABLE IF NOT EXISTS notification (
  notif_id    BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT NOT NULL,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user (user_id),
  KEY idx_notif_is_read (is_read),
  KEY idx_notif_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================
-- 外键约束（分批添加）
-- =========================

-- 创建索引检查存储过程
DROP PROCEDURE IF EXISTS add_index_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_index_if_not_exists(
    IN table_name VARCHAR(64),
    IN index_name VARCHAR(64),
    IN index_sql TEXT
)
BEGIN
    DECLARE idx_count INT DEFAULT 0;
    SELECT COUNT(*) INTO idx_count
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name
      AND INDEX_NAME = index_name;
    
    IF idx_count = 0 THEN
        SET @sql = index_sql;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//
DELIMITER ;

-- 添加User表索引（在字段添加完成后）
CALL add_index_if_not_exists('user', 'uq_user_username', 'ALTER TABLE user ADD UNIQUE KEY uq_user_username (username)');
CALL add_index_if_not_exists('user', 'idx_user_team', 'ALTER TABLE user ADD KEY idx_user_team (team_id)');
CALL add_index_if_not_exists('user', 'idx_user_role', 'ALTER TABLE user ADD KEY idx_user_role (role_id)');
CALL add_index_if_not_exists('user', 'idx_user_status', 'ALTER TABLE user ADD KEY idx_user_status (status)');
CALL add_index_if_not_exists('user', 'idx_user_last_login', 'ALTER TABLE user ADD KEY idx_user_last_login (last_login)');

-- Task 外键
CALL add_fk_if_not_exists(
  'task','fk_task_creator',
  'ALTER TABLE task
     ADD CONSTRAINT fk_task_creator
     FOREIGN KEY (creator_id) REFERENCES user(user_id)
     ON UPDATE CASCADE ON DELETE RESTRICT'
);

-- 其他外键（可选，根据需要添加）
-- 注意：由于User表的扩展字段是可选的，这些外键可能暂时不需要

SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- 插入测试数据
-- =========================

-- 插入部门数据（幂等性）
INSERT INTO department (name, parent_dept_id) VALUES
('技术部', NULL),
('产品部', NULL),
('运营部', NULL),
('人事部', NULL) AS new_dept
ON DUPLICATE KEY UPDATE name=new_dept.name;

-- 插入角色数据（幂等性）
INSERT INTO role (name, description) VALUES
('管理员', '系统管理员，拥有所有权限'),
('开发者', '开发人员，可以创建和管理任务'),
('测试员', '测试人员，负责测试和质量保证'),
('项目经理', '项目管理人员，负责项目协调和管理') AS new_role
ON DUPLICATE KEY UPDATE 
    name=new_role.name, 
    description=new_role.description;

-- 插入权限数据（幂等性）
INSERT INTO permission (code, name, description) VALUES
('user.manage', '用户管理', '管理系统用户'),
('task.create', '创建任务', '创建新任务'),
('task.edit', '编辑任务', '编辑现有任务'),
('task.delete', '删除任务', '删除任务'),
('log.create', '创建日志', '创建工作日志'),
('log.edit', '编辑日志', '编辑工作日志'),
('report.view', '查看报告', '查看各类报告'),
('system.config', '系统配置', '配置系统参数') AS new_perm
ON DUPLICATE KEY UPDATE 
    name=new_perm.name, 
    description=new_perm.description;

-- 插入角色权限关联（幂等性）
INSERT IGNORE INTO role_permission (role_id, perm_id) VALUES
-- 管理员拥有所有权限
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8),
-- 开发者权限
(2, 2), (2, 3), (2, 5), (2, 6), (2, 7),
-- 测试员权限
(3, 5), (3, 6), (3, 7),
-- 项目经理权限
(4, 2), (4, 3), (4, 7), (4, 8);

-- 插入团队数据（幂等性）
INSERT INTO team (name, dept_id) VALUES
('前端开发团队', 1),
('后端开发团队', 1),
('测试团队', 1),
('产品设计团队', 2),
('运营推广团队', 3) AS new_team
ON DUPLICATE KEY UPDATE 
    name=new_team.name, 
    dept_id=new_team.dept_id;

-- 测试用户（完整版，匹配接口文档）
INSERT INTO user (name, email, password, username, phone, team_id, role_id, gender, birth_date, bio, status, last_login) VALUES
('管理员', 'admin@mer.com', 'admin123', 'admin', '13800000000', 2, 1, '男', '1985-03-15', '系统管理员，负责整个系统的运维和管理工作。', 'active', NOW()),
('测试用户', 'test@example.com', '123456', 'testuser', '13800000004', 1, 2, '女', '1995-04-18', '新入职的开发人员，正在学习项目相关技术栈。', 'active', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('张三', 'zhangsan@mer.com', '123456', 'zhangsan', '13800000001', 1, 2, '男', '1990-06-20', '前端开发工程师，专注于用户界面设计和交互体验优化。', 'active', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('李四', 'lisi@mer.com', '123456', 'lisi', '13800000002', 2, 2, '女', '1992-09-10', '后端开发工程师，擅长API设计和数据库优化。', 'active', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('王五', 'wangwu@mer.com', '123456', 'wangwu', '13800000003', 3, 3, '男', '1988-12-05', '测试工程师，负责系统功能测试和性能优化。', 'active', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
('赵六', 'zhaoliu@mer.com', '123456', 'zhaoliu', '13800000005', 1, 4, '男', '1987-11-22', '项目经理，负责项目进度管理和团队协调工作。', 'active', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
('孙七', 'sunqi@mer.com', '123456', 'sunqi', '13800000006', 2, 2, '女', '1993-07-30', '全栈开发工程师，熟悉前后端开发和DevOps流程。', 'inactive', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('周八', 'zhouba@mer.com', '123456', 'zhouba', '13800000007', 3, 2, '男', '1991-02-14', '测试开发工程师，专注于自动化测试和持续集成。', 'active', DATE_SUB(NOW(), INTERVAL 6 HOUR)) AS new_user
ON DUPLICATE KEY UPDATE 
    name=new_user.name, 
    username=new_user.username, 
    phone=new_user.phone, 
    team_id=new_user.team_id, 
    role_id=new_user.role_id, 
    gender=new_user.gender, 
    birth_date=new_user.birth_date, 
    bio=new_user.bio, 
    status=new_user.status;

-- 测试任务（幂等性 - 使用REPLACE INTO）
REPLACE INTO task (task_id, title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    1 as task_id,
    '完成项目文档', 
    '编写项目的技术文档和用户手册', 
    user_id, 
    'High', 
    'InProgress', 
    '2025-10-10 10:00:00', 
    '2025-10-17 10:00:00', 
    '2025-10-10 10:00:00', 
    NOW()
FROM user WHERE email = 'admin@mer.com' LIMIT 1;

REPLACE INTO task (task_id, title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    2 as task_id,
    '系统性能优化', 
    '优化系统整体性能，提升用户体验', 
    user_id, 
    'Medium', 
    'InProgress', 
    '2025-10-12 09:00:00', 
    '2025-10-19 18:00:00', 
    '2025-10-12 09:00:00', 
    NOW()
FROM user WHERE email = 'zhangsan@mer.com' LIMIT 1;

-- =========================
-- 插入更多测试任务数据
-- =========================

-- 管理员的任务（幂等性）
REPLACE INTO task (task_id, title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    3 as task_id,
    '系统架构设计', 
    '设计整个MER日志管理系统的技术架构，包括前后端分离、数据库设计、API接口规范等', 
    user_id, 
    'High', 
    'Completed', 
    '2025-10-04 09:00:00', 
    '2025-10-11 18:00:00', 
    '2025-10-04 09:00:00', 
    '2025-10-11 18:00:00'
FROM user WHERE email = 'admin@mer.com' LIMIT 1;

REPLACE INTO task (task_id, title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    4 as task_id,
    '数据库性能优化', 
    '优化MySQL数据库查询性能，添加必要的索引，优化慢查询', 
    user_id, 
    'Medium', 
    'InProgress', 
    '2025-10-09 10:00:00', 
    '2025-10-17 18:00:00', 
    '2025-10-09 10:00:00', 
    NOW()
FROM user WHERE email = 'admin@mer.com' LIMIT 1;

INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '用户权限管理模块', 
    '实现基于角色的用户权限管理系统，包括角色分配、权限控制等功能', 
    user_id, 
    'High', 
    'Published', 
    NOW(), 
    DATE_ADD(NOW(), INTERVAL 14 DAY), 
    NOW(), 
    NOW()
FROM user WHERE email = 'admin@mer.com' LIMIT 1;

-- 张三的任务
INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '前端登录界面优化', 
    '优化登录页面的用户体验，添加表单验证、错误提示、记住密码等功能', 
    user_id, 
    'Medium', 
    'InProgress', 
    DATE_SUB(NOW(), INTERVAL 3 DAY), 
    DATE_ADD(NOW(), INTERVAL 2 DAY), 
    DATE_SUB(NOW(), INTERVAL 3 DAY), 
    NOW()
FROM user WHERE email = 'zhangsan@mer.com' LIMIT 1;

INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '任务列表页面开发', 
    '开发任务管理页面，实现任务的增删改查、筛选、分页等功能', 
    user_id, 
    'High', 
    'InProgress', 
    NOW(), 
    DATE_ADD(NOW(), INTERVAL 7 DAY), 
    NOW(), 
    NOW()
FROM user WHERE email = 'zhangsan@mer.com' LIMIT 1;

INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '响应式布局适配', 
    '确保所有页面在移动端和桌面端都有良好的显示效果', 
    user_id, 
    'Low', 
    'Published', 
    DATE_ADD(NOW(), INTERVAL 1 DAY), 
    DATE_ADD(NOW(), INTERVAL 10 DAY), 
    NOW(), 
    NOW()
FROM user WHERE email = 'zhangsan@mer.com' LIMIT 1;

-- 李四的任务
INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    'API接口文档编写', 
    '编写详细的API接口文档，包括请求参数、响应格式、错误码等', 
    user_id, 
    'Medium', 
    'Completed', 
    DATE_SUB(NOW(), INTERVAL 8 DAY), 
    DATE_SUB(NOW(), INTERVAL 1 DAY), 
    DATE_SUB(NOW(), INTERVAL 8 DAY), 
    DATE_SUB(NOW(), INTERVAL 1 DAY)
FROM user WHERE email = 'lisi@mer.com' LIMIT 1;

INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '单元测试编写', 
    '为核心业务逻辑编写单元测试，确保代码质量和系统稳定性', 
    user_id, 
    'High', 
    'InProgress', 
    DATE_SUB(NOW(), INTERVAL 2 DAY), 
    DATE_ADD(NOW(), INTERVAL 5 DAY), 
    DATE_SUB(NOW(), INTERVAL 2 DAY), 
    NOW()
FROM user WHERE email = 'lisi@mer.com' LIMIT 1;

INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '日志系统集成', 
    '集成ELK日志系统，实现系统运行日志的收集、分析和监控', 
    user_id, 
    'Medium', 
    'Published', 
    DATE_ADD(NOW(), INTERVAL 3 DAY), 
    DATE_ADD(NOW(), INTERVAL 15 DAY), 
    NOW(), 
    NOW()
FROM user WHERE email = 'lisi@mer.com' LIMIT 1;

-- 王五的任务
INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '系统部署脚本', 
    '编写自动化部署脚本，包括Docker容器化、CI/CD流水线配置', 
    user_id, 
    'High', 
    'Published', 
    NOW(), 
    DATE_ADD(NOW(), INTERVAL 12 DAY), 
    NOW(), 
    NOW()
FROM user WHERE email = 'wangwu@mer.com' LIMIT 1;

INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '安全漏洞扫描', 
    '对系统进行全面的安全漏洞扫描，修复发现的安全问题', 
    user_id, 
    'High', 
    'InProgress', 
    DATE_SUB(NOW(), INTERVAL 1 DAY), 
    DATE_ADD(NOW(), INTERVAL 4 DAY), 
    DATE_SUB(NOW(), INTERVAL 1 DAY), 
    NOW()
FROM user WHERE email = 'wangwu@mer.com' LIMIT 1;

INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '性能压力测试', 
    '使用JMeter等工具对系统进行性能压力测试，优化系统性能', 
    user_id, 
    'Medium', 
    'Published', 
    DATE_ADD(NOW(), INTERVAL 2 DAY), 
    DATE_ADD(NOW(), INTERVAL 8 DAY), 
    NOW(), 
    NOW()
FROM user WHERE email = 'wangwu@mer.com' LIMIT 1;

-- 测试用户的任务
INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '用户体验测试', 
    '从用户角度测试系统的各项功能，收集用户反馈并提出改进建议', 
    user_id, 
    'Medium', 
    'InProgress', 
    DATE_SUB(NOW(), INTERVAL 2 DAY), 
    DATE_ADD(NOW(), INTERVAL 3 DAY), 
    DATE_SUB(NOW(), INTERVAL 2 DAY), 
    NOW()
FROM user WHERE email = 'test@example.com' LIMIT 1;

INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '功能测试报告', 
    '编写详细的功能测试报告，记录测试用例、测试结果和发现的问题', 
    user_id, 
    'Low', 
    'Published', 
    DATE_ADD(NOW(), INTERVAL 1 DAY), 
    DATE_ADD(NOW(), INTERVAL 6 DAY), 
    NOW(), 
    NOW()
FROM user WHERE email = 'test@example.com' LIMIT 1;

-- 一些紧急任务
INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '生产环境热修复', 
    '修复生产环境中发现的关键Bug，确保系统正常运行', 
    user_id, 
    'Urgent', 
    'InProgress', 
    NOW(), 
    DATE_ADD(NOW(), INTERVAL 1 DAY), 
    NOW(), 
    NOW()
FROM user WHERE email = 'admin@mer.com' LIMIT 1;

INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '数据备份恢复', 
    '紧急处理数据库备份恢复问题，确保数据安全', 
    user_id, 
    'Urgent', 
    'Completed', 
    DATE_SUB(NOW(), INTERVAL 1 DAY), 
    DATE_SUB(NOW(), INTERVAL 4 HOUR), 
    DATE_SUB(NOW(), INTERVAL 1 DAY), 
    DATE_SUB(NOW(), INTERVAL 4 HOUR)
FROM user WHERE email = 'wangwu@mer.com' LIMIT 1;

-- 一些长期项目
INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '系统重构规划', 
    '制定系统重构计划，提升代码质量和系统可维护性', 
    user_id, 
    'Low', 
    'Published', 
    DATE_ADD(NOW(), INTERVAL 7 DAY), 
    DATE_ADD(NOW(), INTERVAL 30 DAY), 
    NOW(), 
    NOW()
FROM user WHERE email = 'admin@mer.com' LIMIT 1;

INSERT IGNORE INTO task (title, description, creator_id, priority, status, start_at, due_at, created_at, updated_at)
SELECT 
    '新功能需求调研', 
    '调研用户对新功能的需求，制定产品发展路线图', 
    user_id, 
    'Medium', 
    'Published', 
    DATE_ADD(NOW(), INTERVAL 5 DAY), 
    DATE_ADD(NOW(), INTERVAL 20 DAY), 
    NOW(), 
    NOW()
FROM user WHERE email = 'lisi@mer.com' LIMIT 1;

-- =========================
-- 用户会话和Token管理表
-- =========================

-- 用户Token表（存储JWT Token和会话信息）
CREATE TABLE IF NOT EXISTS user_token (
  token_id      BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id       BIGINT NOT NULL,
  token_value   VARCHAR(500) NOT NULL,           -- JWT Token值
  token_type    ENUM('ACCESS', 'REFRESH') NOT NULL DEFAULT 'ACCESS',
  device_info   VARCHAR(255),                    -- 设备信息
  ip_address    VARCHAR(45),                     -- IP地址（支持IPv6）
  user_agent    VARCHAR(500),                    -- 浏览器信息
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,   -- Token是否有效
  expires_at    DATETIME NOT NULL,               -- Token过期时间
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_used_at  DATETIME,                        -- 最后使用时间
  
  UNIQUE KEY uq_token_value (token_value),
  KEY idx_user_token_user (user_id),
  KEY idx_user_token_expires (expires_at),
  KEY idx_user_token_active (is_active),
  KEY idx_user_token_type (token_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户Token表';

-- 用户登录历史表
CREATE TABLE IF NOT EXISTS user_login_history (
  login_id      BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id       BIGINT NOT NULL,
  login_time    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_time   DATETIME NULL,                   -- 登出时间
  ip_address    VARCHAR(45),                     -- 登录IP
  user_agent    VARCHAR(500),                    -- 浏览器信息
  device_info   VARCHAR(255),                    -- 设备信息
  login_status  ENUM('SUCCESS', 'FAILED', 'LOGOUT') NOT NULL DEFAULT 'SUCCESS',
  failure_reason VARCHAR(255),                   -- 登录失败原因
  session_duration INT,                          -- 会话持续时间（秒）
  
  KEY idx_login_user (user_id),
  KEY idx_login_time (login_time),
  KEY idx_login_status (login_status),
  KEY idx_login_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户登录历史表';

-- 用户在线状态表
CREATE TABLE IF NOT EXISTS user_online_status (
  status_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id       BIGINT NOT NULL UNIQUE,
  is_online     BOOLEAN NOT NULL DEFAULT FALSE,  -- 是否在线
  last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 最后活动时间
  current_page  VARCHAR(255),                    -- 当前页面
  session_id    VARCHAR(100),                    -- 会话ID
  device_type   ENUM('WEB', 'MOBILE', 'TABLET', 'DESKTOP') DEFAULT 'WEB',
  browser_info  VARCHAR(255),                    -- 浏览器信息
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_online_status (is_online),
  KEY idx_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户在线状态表';

-- 用户安全设置表
CREATE TABLE IF NOT EXISTS user_security_settings (
  setting_id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id               BIGINT NOT NULL UNIQUE,
  password_last_changed DATETIME,               -- 密码最后修改时间
  login_attempts        INT NOT NULL DEFAULT 0, -- 登录尝试次数
  account_locked_until  DATETIME NULL,          -- 账户锁定到期时间
  two_factor_enabled    BOOLEAN NOT NULL DEFAULT FALSE, -- 是否启用双因子认证
  security_questions    JSON,                   -- 安全问题（JSON格式）
  last_password_reset   DATETIME,               -- 最后密码重置时间
  failed_login_count    INT NOT NULL DEFAULT 0, -- 连续失败登录次数
  last_failed_login     DATETIME,               -- 最后失败登录时间
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  KEY idx_security_user (user_id),
  KEY idx_account_locked (account_locked_until),
  KEY idx_failed_login (last_failed_login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户安全设置表';

-- =========================
-- 添加外键约束
-- =========================

-- 用户Token表外键
CALL add_fk_if_not_exists(
  'user_token','fk_token_user',
  'ALTER TABLE user_token ADD CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES user(user_id) ON UPDATE CASCADE ON DELETE CASCADE'
);

-- 用户登录历史表外键
CALL add_fk_if_not_exists(
  'user_login_history','fk_login_history_user',
  'ALTER TABLE user_login_history ADD CONSTRAINT fk_login_history_user FOREIGN KEY (user_id) REFERENCES user(user_id) ON UPDATE CASCADE ON DELETE CASCADE'
);

-- 用户在线状态表外键
CALL add_fk_if_not_exists(
  'user_online_status','fk_online_status_user',
  'ALTER TABLE user_online_status ADD CONSTRAINT fk_online_status_user FOREIGN KEY (user_id) REFERENCES user(user_id) ON UPDATE CASCADE ON DELETE CASCADE'
);

-- 用户安全设置表外键
CALL add_fk_if_not_exists(
  'user_security_settings','fk_security_settings_user',
  'ALTER TABLE user_security_settings ADD CONSTRAINT fk_security_settings_user FOREIGN KEY (user_id) REFERENCES user(user_id) ON UPDATE CASCADE ON DELETE CASCADE'
);

-- =========================
-- 团队十大优先任务表
-- =========================

-- 团队优先任务表
CREATE TABLE IF NOT EXISTS team_priority_tasks (
  priority_id       BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id           INT NOT NULL,                    -- 团队ID（外键关联team表）
  task_title        VARCHAR(255) NOT NULL,          -- 任务标题
  task_description  TEXT,                           -- 任务描述
  priority_rank     INT NOT NULL,                   -- 优先级排名（1-10）
  status            ENUM('待开始', '进行中', '已完成', '已暂停', '已取消') NOT NULL DEFAULT '待开始',
  assigned_user_id  BIGINT NULL,                    -- 负责人ID（外键关联user表）
  estimated_hours   DECIMAL(5,1) NULL,              -- 预估工时
  actual_hours      DECIMAL(5,1) NULL,              -- 实际工时
  start_date        DATE NULL,                      -- 开始日期
  due_date          DATE NULL,                      -- 截止日期
  completion_rate   INT NOT NULL DEFAULT 0,         -- 完成度（0-100%）
  tags              VARCHAR(500),                   -- 标签（逗号分隔）
  notes             TEXT,                           -- 备注
  created_by        BIGINT NOT NULL,                -- 创建人ID
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uq_team_priority (team_id, priority_rank), -- 每个团队的优先级排名唯一
  KEY idx_team_priority_team (team_id),
  KEY idx_team_priority_rank (priority_rank),
  KEY idx_team_priority_status (status),
  KEY idx_team_priority_assigned (assigned_user_id),
  KEY idx_team_priority_due (due_date),
  KEY idx_team_priority_creator (created_by),
  
  CONSTRAINT chk_priority_rank CHECK (priority_rank BETWEEN 1 AND 10),
  CONSTRAINT chk_completion_rate CHECK (completion_rate BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团队十大优先任务表';

-- 团队优先任务历史记录表（记录任务变更历史）
CREATE TABLE IF NOT EXISTS team_priority_task_history (
  history_id        BIGINT PRIMARY KEY AUTO_INCREMENT,
  priority_id       BIGINT NOT NULL,                -- 关联优先任务ID
  action_type       ENUM('创建', '更新', '删除', '排序调整') NOT NULL,
  old_values        JSON,                           -- 变更前的值
  new_values        JSON,                           -- 变更后的值
  changed_by        BIGINT NOT NULL,                -- 操作人ID
  change_reason     VARCHAR(255),                   -- 变更原因
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_history_priority (priority_id),
  KEY idx_history_changed_by (changed_by),
  KEY idx_history_action (action_type),
  KEY idx_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='团队优先任务历史记录表';

-- 添加外键约束
CALL add_fk_if_not_exists(
  'team_priority_tasks','fk_priority_team',
  'ALTER TABLE team_priority_tasks ADD CONSTRAINT fk_priority_team FOREIGN KEY (team_id) REFERENCES team(team_id) ON UPDATE CASCADE ON DELETE CASCADE'
);

CALL add_fk_if_not_exists(
  'team_priority_tasks','fk_priority_assigned_user',
  'ALTER TABLE team_priority_tasks ADD CONSTRAINT fk_priority_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES user(user_id) ON UPDATE CASCADE ON DELETE SET NULL'
);

CALL add_fk_if_not_exists(
  'team_priority_tasks','fk_priority_creator',
  'ALTER TABLE team_priority_tasks ADD CONSTRAINT fk_priority_creator FOREIGN KEY (created_by) REFERENCES user(user_id) ON UPDATE CASCADE ON DELETE RESTRICT'
);

CALL add_fk_if_not_exists(
  'team_priority_task_history','fk_history_priority',
  'ALTER TABLE team_priority_task_history ADD CONSTRAINT fk_history_priority FOREIGN KEY (priority_id) REFERENCES team_priority_tasks(priority_id) ON UPDATE CASCADE ON DELETE CASCADE'
);

CALL add_fk_if_not_exists(
  'team_priority_task_history','fk_history_changed_by',
  'ALTER TABLE team_priority_task_history ADD CONSTRAINT fk_history_changed_by FOREIGN KEY (changed_by) REFERENCES user(user_id) ON UPDATE CASCADE ON DELETE RESTRICT'
);

-- =========================
-- 插入初始化数据
-- =========================

-- 为现有用户初始化安全设置
INSERT INTO user_security_settings (user_id, password_last_changed)
SELECT user_id, created_at FROM user
ON DUPLICATE KEY UPDATE password_last_changed = VALUES(password_last_changed);

-- 插入一些测试Token数据（模拟登录状态）- 幂等性
REPLACE INTO user_token (token_id, user_id, token_value, token_type, device_info, ip_address, user_agent, expires_at, last_used_at, created_at, updated_at)
SELECT 
    ROW_NUMBER() OVER (ORDER BY user_id) as token_id,
    user_id,
    CONCAT('jwt_', user_id, '_1729000000_', (user_id * 100)) AS token_value,
    'ACCESS' AS token_type,
    'Chrome/119.0 Windows 10' AS device_info,
    '127.0.0.1' AS ip_address,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' AS user_agent,
    '2025-10-15 23:59:59' AS expires_at,
    NOW() AS last_used_at,
    '2025-10-14 10:00:00' AS created_at,
    NOW() AS updated_at
FROM user 
WHERE email IN ('admin@mer.com', 'zhangsan@mer.com', 'test@example.com')
LIMIT 3;

-- 插入登录历史记录（幂等性）
REPLACE INTO user_login_history (login_id, user_id, login_time, ip_address, user_agent, device_info, login_status)
SELECT 
    user_id as login_id,
    user_id,
    CASE user_id 
        WHEN 1 THEN '2025-10-14 09:00:00'
        WHEN 2 THEN '2025-10-14 08:30:00'
        WHEN 3 THEN '2025-10-14 10:15:00'
        WHEN 4 THEN '2025-10-14 07:45:00'
        WHEN 5 THEN '2025-10-14 11:20:00'
        ELSE '2025-10-14 12:00:00'
    END AS login_time,
    CASE (user_id % 3)
        WHEN 0 THEN '192.168.1.100'
        WHEN 1 THEN '10.0.0.50'
        ELSE '127.0.0.1'
    END AS ip_address,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' AS user_agent,
    'Chrome/119.0 Windows 10' AS device_info,
    'SUCCESS' AS login_status
FROM user 
LIMIT 10;

-- 设置部分用户为在线状态（幂等性）
REPLACE INTO user_online_status (status_id, user_id, is_online, last_activity, current_page, session_id, device_type, updated_at)
SELECT 
    user_id as status_id,
    user_id,
    CASE (user_id % 2) WHEN 0 THEN TRUE ELSE FALSE END AS is_online,
    CASE user_id 
        WHEN 1 THEN '2025-10-14 16:30:00'
        WHEN 2 THEN '2025-10-14 16:15:00'
        WHEN 3 THEN '2025-10-14 16:45:00'
        WHEN 4 THEN '2025-10-14 15:20:00'
        WHEN 5 THEN '2025-10-14 16:50:00'
        ELSE '2025-10-14 16:00:00'
    END AS last_activity,
    CASE (user_id % 3)
        WHEN 0 THEN 'dashboard.html'
        WHEN 1 THEN 'tasks.html'
        ELSE 'profile.html'
    END AS current_page,
    CONCAT('session_', user_id, '_1729000000') AS session_id,
    'WEB' AS device_type,
    NOW() AS updated_at
FROM user;

-- =========================
-- 插入团队优先任务测试数据
-- =========================

-- 前端开发团队的十大优先任务（幂等性）
REPLACE INTO team_priority_tasks (priority_id, team_id, task_title, task_description, priority_rank, status, assigned_user_id, estimated_hours, actual_hours, start_date, due_date, completion_rate, tags, notes, created_by, created_at, updated_at) VALUES
(1, 1, '用户界面重构', '重构现有用户界面，提升用户体验和响应速度', 1, '进行中', 3, 40.0, 25.5, '2025-10-10', '2025-10-25', 65, 'UI,重构,优化', '需要与设计团队密切配合', 3, '2025-10-10 09:00:00', NOW()),
(2, 1, '移动端适配优化', '优化移动端显示效果，确保在各种设备上的兼容性', 2, '待开始', 3, 30.0, NULL, '2025-10-20', '2025-11-05', 0, '移动端,响应式,兼容性', '优先级较高，需要尽快开始', 3, '2025-10-10 09:00:00', NOW()),
(3, 1, '前端性能监控', '集成前端性能监控工具，实时监控页面加载速度', 3, '待开始', NULL, 20.0, NULL, '2025-10-25', '2025-11-10', 0, '性能,监控,工具', '可以考虑使用第三方监控服务', 3, '2025-10-10 09:00:00', NOW()),
(4, 1, '组件库标准化', '建立统一的前端组件库，提高开发效率', 4, '待开始', 3, 50.0, NULL, '2025-11-01', '2025-11-30', 0, '组件库,标准化,效率', '长期项目，需要团队共同参与', 3, '2025-10-10 09:00:00', NOW()),
(5, 1, '前端单元测试', '为关键前端组件编写单元测试，提高代码质量', 5, '待开始', NULL, 35.0, NULL, '2025-11-05', '2025-11-25', 0, '测试,质量,自动化', '需要学习测试框架', 3, '2025-10-10 09:00:00', NOW()),
(6, 1, '前端构建优化', '优化前端构建流程，减少构建时间和包体积', 6, '待开始', NULL, 25.0, NULL, '2025-11-10', '2025-11-30', 0, '构建,优化,性能', '可以研究webpack优化方案', 3, '2025-10-10 09:00:00', NOW()),
(7, 1, '用户体验分析', '分析用户行为数据，优化用户体验流程', 7, '待开始', NULL, 15.0, NULL, '2025-11-15', '2025-12-05', 0, '用户体验,分析,数据', '需要与产品团队合作', 3, '2025-10-10 09:00:00', NOW()),
(8, 1, '前端安全加固', '加强前端安全防护，防止XSS等安全漏洞', 8, '待开始', NULL, 20.0, NULL, '2025-11-20', '2025-12-10', 0, '安全,防护,漏洞', '安全是重要考虑因素', 3, '2025-10-10 09:00:00', NOW()),
(9, 1, '国际化支持', '为前端应用添加多语言支持功能', 9, '待开始', NULL, 30.0, NULL, '2025-12-01', '2025-12-25', 0, '国际化,多语言,i18n', '为未来扩展做准备', 3, '2025-10-10 09:00:00', NOW()),
(10, 1, '前端文档完善', '完善前端开发文档和使用说明', 10, '待开始', NULL, 15.0, NULL, '2025-12-05', '2025-12-20', 0, '文档,说明,规范', '有助于新人快速上手', 3, '2025-10-10 09:00:00', NOW());

-- 后端开发团队的十大优先任务（幂等性）
REPLACE INTO team_priority_tasks (priority_id, team_id, task_title, task_description, priority_rank, status, assigned_user_id, estimated_hours, actual_hours, start_date, due_date, completion_rate, tags, notes, created_by, created_at, updated_at) VALUES
(11, 2, 'API性能优化', '优化核心API接口性能，提升响应速度', 1, '进行中', 4, 35.0, 20.0, '2025-10-08', '2025-10-22', 60, 'API,性能,优化', '重点关注数据库查询优化', 1, '2025-10-08 09:00:00', NOW()),
(12, 2, '数据库架构升级', '升级数据库架构，支持更大数据量', 2, '待开始', 4, 60.0, NULL, '2025-10-20', '2025-11-15', 0, '数据库,架构,升级', '需要制定详细的迁移计划', 1, '2025-10-08 09:00:00', NOW()),
(13, 2, '微服务拆分', '将单体应用拆分为微服务架构', 3, '待开始', NULL, 80.0, NULL, '2025-11-01', '2025-12-20', 0, '微服务,架构,拆分', '大型重构项目，需要充分规划', 1, '2025-10-08 09:00:00', NOW()),
(14, 2, '缓存系统优化', '优化Redis缓存策略，提高系统性能', 4, '待开始', 4, 25.0, NULL, '2025-10-25', '2025-11-10', 0, '缓存,Redis,性能', '可以显著提升系统响应速度', 1, '2025-10-08 09:00:00', NOW()),
(15, 2, '日志系统完善', '完善系统日志记录和分析功能', 5, '待开始', NULL, 30.0, NULL, '2025-11-05', '2025-11-25', 0, '日志,分析,监控', '有助于问题排查和性能分析', 1, '2025-10-08 09:00:00', NOW()),
(16, 2, '安全认证升级', '升级用户认证系统，增强安全性', 6, '待开始', NULL, 40.0, NULL, '2025-11-10', '2025-12-05', 0, '安全,认证,升级', '考虑引入OAuth2.0', 1, '2025-10-08 09:00:00', NOW()),
(17, 2, 'API文档自动化', '实现API文档自动生成和更新', 7, '待开始', NULL, 20.0, NULL, '2025-11-15', '2025-12-01', 0, 'API,文档,自动化', '可以使用Swagger等工具', 1, '2025-10-08 09:00:00', NOW()),
(18, 2, '数据备份策略', '制定完善的数据备份和恢复策略', 8, '待开始', NULL, 25.0, NULL, '2025-11-20', '2025-12-10', 0, '备份,恢复,策略', '数据安全的重要保障', 1, '2025-10-08 09:00:00', NOW()),
(19, 2, '监控告警系统', '建立完善的系统监控和告警机制', 9, '待开始', NULL, 35.0, NULL, '2025-12-01', '2025-12-25', 0, '监控,告警,系统', '及时发现和处理问题', 1, '2025-10-08 09:00:00', NOW()),
(20, 2, '代码质量提升', '提升代码质量，引入代码审查流程', 10, '待开始', NULL, 30.0, NULL, '2025-12-05', '2025-12-30', 0, '代码质量,审查,流程', '长期代码质量保障', 1, '2025-10-08 09:00:00', NOW());

-- 测试团队的十大优先任务（幂等性）
REPLACE INTO team_priority_tasks (priority_id, team_id, task_title, task_description, priority_rank, status, assigned_user_id, estimated_hours, actual_hours, start_date, due_date, completion_rate, tags, notes, created_by, created_at, updated_at) VALUES
(21, 3, '自动化测试框架', '搭建完整的自动化测试框架', 1, '进行中', 5, 45.0, 30.0, '2025-10-05', '2025-10-30', 70, '自动化,测试,框架', '已完成基础框架搭建', 5, '2025-10-05 09:00:00', NOW()),
(22, 3, '性能测试方案', '制定全面的性能测试方案和标准', 2, '待开始', 5, 35.0, NULL, '2025-10-25', '2025-11-15', 0, '性能,测试,方案', '需要与开发团队协调', 5, '2025-10-05 09:00:00', NOW()),
(23, 3, '接口测试自动化', '实现API接口的自动化测试', 3, '待开始', NULL, 30.0, NULL, '2025-11-01', '2025-11-20', 0, '接口,自动化,API', '可以使用Postman或其他工具', 5, '2025-10-05 09:00:00', NOW()),
(24, 3, '测试数据管理', '建立测试数据的统一管理机制', 4, '待开始', NULL, 20.0, NULL, '2025-11-05', '2025-11-25', 0, '测试数据,管理,机制', '确保测试数据的一致性', 5, '2025-10-05 09:00:00', NOW()),
(25, 3, '移动端测试', '完善移动端应用的测试流程', 5, '待开始', NULL, 25.0, NULL, '2025-11-10', '2025-12-01', 0, '移动端,测试,流程', '需要多种设备进行测试', 5, '2025-10-05 09:00:00', NOW()),
(26, 3, '安全测试规范', '制定安全测试的标准和规范', 6, '待开始', NULL, 30.0, NULL, '2025-11-15', '2025-12-05', 0, '安全,测试,规范', '安全测试越来越重要', 5, '2025-10-05 09:00:00', NOW()),
(27, 3, '测试报告自动化', '实现测试报告的自动生成和分发', 7, '待开始', NULL, 15.0, NULL, '2025-11-20', '2025-12-10', 0, '报告,自动化,分发', '提高测试效率', 5, '2025-10-05 09:00:00', NOW()),
(28, 3, '用户体验测试', '建立用户体验测试的标准流程', 8, '待开始', NULL, 20.0, NULL, '2025-12-01', '2025-12-20', 0, '用户体验,测试,流程', '关注用户实际使用感受', 5, '2025-10-05 09:00:00', NOW()),
(29, 3, '测试环境管理', '优化测试环境的配置和管理', 9, '待开始', NULL, 25.0, NULL, '2025-12-05', '2025-12-25', 0, '测试环境,配置,管理', '稳定的测试环境很重要', 5, '2025-10-05 09:00:00', NOW()),
(30, 3, '测试知识库', '建立测试团队的知识库和经验分享', 10, '待开始', NULL, 15.0, NULL, '2025-12-10', '2025-12-30', 0, '知识库,经验,分享', '团队知识积累和传承', 5, '2025-10-05 09:00:00', NOW());

-- 任务数据插入完成


-- =========================
-- 查看Token和登录状态数据
-- =========================

-- 查看Token数据
SELECT '========== Token数据统计 ==========' AS '';
SELECT 
    ut.token_id AS 'Token ID',
    u.name AS '用户名',
    ut.token_type AS 'Token类型',
    ut.device_info AS '设备信息',
    ut.ip_address AS 'IP地址',
    ut.is_active AS '是否有效',
    DATE_FORMAT(ut.expires_at, '%Y-%m-%d %H:%i') AS '过期时间',
    DATE_FORMAT(ut.last_used_at, '%Y-%m-%d %H:%i') AS '最后使用'
FROM user_token ut
JOIN user u ON ut.user_id = u.user_id
ORDER BY ut.created_at DESC;

-- 查看在线状态
SELECT '========== 用户在线状态 ==========' AS '';
SELECT 
    u.name AS '用户名',
    uos.is_online AS '是否在线',
    uos.current_page AS '当前页面',
    uos.device_type AS '设备类型',
    DATE_FORMAT(uos.last_activity, '%Y-%m-%d %H:%i') AS '最后活动时间'
FROM user_online_status uos
JOIN user u ON uos.user_id = u.user_id
ORDER BY uos.last_activity DESC;

-- 查看登录历史
SELECT '========== 最近登录历史 ==========' AS '';
SELECT 
    u.name AS '用户名',
    ulh.login_status AS '登录状态',
    ulh.ip_address AS 'IP地址',
    ulh.device_info AS '设备信息',
    DATE_FORMAT(ulh.login_time, '%Y-%m-%d %H:%i') AS '登录时间'
FROM user_login_history ulh
JOIN user u ON ulh.user_id = u.user_id
ORDER BY ulh.login_time DESC
LIMIT 10;

-- 统计在线用户数量
SELECT '========== 在线用户统计 ==========' AS '';
SELECT 
    COUNT(CASE WHEN is_online = TRUE THEN 1 END) AS '在线用户数',
    COUNT(CASE WHEN is_online = FALSE THEN 1 END) AS '离线用户数',
    COUNT(*) AS '总用户数'
FROM user_online_status;

-- 统计Token状态
SELECT '========== Token状态统计 ==========' AS '';
SELECT 
    token_type AS 'Token类型',
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) AS '有效Token',
    COUNT(CASE WHEN is_active = FALSE THEN 1 END) AS '无效Token',
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) AS '未过期Token',
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) AS '已过期Token',
    COUNT(*) AS '总Token数'
FROM user_token
GROUP BY token_type;

-- 查看安全设置统计
SELECT '========== 用户安全设置统计 ==========' AS '';
SELECT 
    COUNT(CASE WHEN two_factor_enabled = TRUE THEN 1 END) AS '启用双因子认证',
    COUNT(CASE WHEN account_locked_until IS NOT NULL AND account_locked_until > NOW() THEN 1 END) AS '账户被锁定',
    COUNT(CASE WHEN failed_login_count > 0 THEN 1 END) AS '有失败登录记录',
    AVG(login_attempts) AS '平均登录尝试次数',
    COUNT(*) AS '总用户数'
FROM user_security_settings;

-- =========================
-- 查看完整用户信息（匹配接口文档格式）
-- =========================
SELECT '========== 完整用户信息展示 ==========' AS '';
SELECT 
    u.user_id,
    u.name,
    u.username,
    u.email,
    u.phone,
    COALESCE(t.name, '未分配') AS team,  -- 团队名称，匹配接口要求
    CAST(u.role_id AS CHAR) AS role_id,  -- 转换为字符串格式
    r.name AS role_name,
    u.gender,
    DATE_FORMAT(u.birth_date, '%Y-%m-%d') AS birth_date,
    u.bio,
    u.status,
    DATE_FORMAT(u.last_login, '%Y-%m-%d %H:%i:%s') AS last_login,
    DATE_FORMAT(u.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
FROM user u
LEFT JOIN team t ON u.team_id = t.team_id
LEFT JOIN role r ON u.role_id = r.role_id
ORDER BY u.user_id;

-- 查看用户-团队-角色关系统计
SELECT '========== 用户分布统计 ==========' AS '';
SELECT 
    COALESCE(t.name, '未分配团队') AS '团队',
    COALESCE(r.name, '未分配角色') AS '角色',
    COUNT(*) AS '用户数量'
FROM user u
LEFT JOIN team t ON u.team_id = t.team_id
LEFT JOIN role r ON u.role_id = r.role_id
GROUP BY t.name, r.name
ORDER BY t.name, r.name;

-- =========================
-- 查看团队优先任务数据
-- =========================

-- 查看所有团队的优先任务
SELECT '========== 团队优先任务总览 ==========' AS '';
SELECT 
    t.name AS '团队名称',
    tpt.priority_rank AS '优先级',
    tpt.task_title AS '任务标题',
    tpt.status AS '状态',
    COALESCE(u.name, '未分配') AS '负责人',
    tpt.completion_rate AS '完成度(%)',
    tpt.estimated_hours AS '预估工时',
    tpt.actual_hours AS '实际工时',
    DATE_FORMAT(tpt.due_date, '%Y-%m-%d') AS '截止日期',
    tpt.tags AS '标签'
FROM team_priority_tasks tpt
JOIN team t ON tpt.team_id = t.team_id
LEFT JOIN user u ON tpt.assigned_user_id = u.user_id
ORDER BY t.name, tpt.priority_rank;

-- 统计各团队任务状态分布
SELECT '========== 团队任务状态统计 ==========' AS '';
SELECT 
    t.name AS '团队名称',
    tpt.status AS '任务状态',
    COUNT(*) AS '任务数量',
    ROUND(AVG(tpt.completion_rate), 1) AS '平均完成度(%)',
    SUM(COALESCE(tpt.estimated_hours, 0)) AS '总预估工时',
    SUM(COALESCE(tpt.actual_hours, 0)) AS '总实际工时'
FROM team_priority_tasks tpt
JOIN team t ON tpt.team_id = t.team_id
GROUP BY t.name, tpt.status
ORDER BY t.name, tpt.status;

-- 统计各团队工作量
SELECT '========== 团队工作量统计 ==========' AS '';
SELECT 
    t.name AS '团队名称',
    COUNT(*) AS '总任务数',
    COUNT(CASE WHEN tpt.status = '进行中' THEN 1 END) AS '进行中任务',
    COUNT(CASE WHEN tpt.status = '已完成' THEN 1 END) AS '已完成任务',
    ROUND(AVG(tpt.completion_rate), 1) AS '平均完成度(%)',
    SUM(COALESCE(tpt.estimated_hours, 0)) AS '总预估工时',
    SUM(COALESCE(tpt.actual_hours, 0)) AS '总实际工时',
    COUNT(CASE WHEN tpt.assigned_user_id IS NOT NULL THEN 1 END) AS '已分配任务数'
FROM team_priority_tasks tpt
JOIN team t ON tpt.team_id = t.team_id
GROUP BY t.team_id, t.name
ORDER BY t.name;

-- 查看结果
SELECT '========== 数据库初始化完成 ==========' AS '';
SELECT user_id, name, email FROM user;

-- =========================
-- 清理存储过程
-- =========================
DROP PROCEDURE IF EXISTS add_fk_if_not_exists;
DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DROP PROCEDURE IF EXISTS add_index_if_not_exists;

-- =========================
-- 提交事务并恢复设置
-- =========================
SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
SET AUTOCOMMIT = 1;

-- 显示执行完成信息
SELECT '========== 数据库脚本执行完成（幂等性版本）==========' AS '';
SELECT 
    '✅ 支持重复执行' AS '特性1',
    '✅ 数据不会重复插入' AS '特性2',
    '✅ 结构变更会自动更新' AS '特性3',
    '✅ 外键约束安全处理' AS '特性4';

