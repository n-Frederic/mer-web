-- 禁用外键检查以便顺利插入数据
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- 1. 基础角色数据
-- =========================================================
INSERT INTO role (role_id, name, description) VALUES
                                                  (1, 'CEO', '公司首席执行官'),
                                                  (2, 'Manager', '部门经理'),
                                                  (3, 'TeamLeader', '团队负责人'),
                                                  (4, 'Member', '普通成员'),
                                                  (5, 'Admin', '系统管理员')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- =========================================================
-- 2. 权限数据
-- =========================================================
INSERT INTO permission (perm_id, code, name, description) VALUES
                                                              (1, 'USER_READ', '查看用户', '可以查看用户信息'),
                                                              (2, 'USER_WRITE', '管理用户', '可以添加、修改、删除用户'),
                                                              (3, 'TASK_READ', '查看任务', '可以查看任务信息'),
                                                              (4, 'TASK_WRITE', '管理任务', '可以创建、分配、修改任务'),
                                                              (5, 'REPORT_READ', '查看报告', '可以查看各类报告'),
                                                              (6, 'DASHBOARD_ACCESS', '访问面板', '可以访问管理面板'),
                                                              (7, 'LOG_READ', '查看日志', '可以查看工作日志'),
                                                              (8, 'LOG_WRITE', '编写日志', '可以编写工作日志')
ON DUPLICATE KEY UPDATE code=VALUES(code), name=VALUES(name), description=VALUES(description);

-- =========================================================
-- 3. 角色权限关联
-- =========================================================
INSERT INTO role_permission (role_id, perm_id) VALUES
                                                   (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8),
                                                   (2, 1), (2, 3), (2, 4), (2, 5), (2, 6), (2, 7), (2, 8),
                                                   (3, 1), (3, 3), (3, 4), (3, 7), (3, 8),
                                                   (4, 3), (4, 7), (4, 8),
                                                   (5, 1), (5, 2), (5, 3), (5, 6), (5, 7)
ON DUPLICATE KEY UPDATE role_id=VALUES(role_id);

-- =========================================================
-- 4. 部门数据
-- =========================================================
INSERT INTO department (dept_id, name, parent_dept_id) VALUES
                                                           (1, '总裁办', NULL),
                                                           (2, '人力资源部', 1),
                                                           (3, '市场部', NULL),
                                                           (4, '财务部', 3),
                                                           (5, '技术部', NULL),
                                                           (6, '销售部', 5),
                                                           (7, '运营部', NULL)
ON DUPLICATE KEY UPDATE name=VALUES(name), parent_dept_id=VALUES(parent_dept_id);

-- =========================================================
-- 5. 团队数据 (先插入，leader_id 稍后更新)
-- =========================================================
INSERT INTO team (team_id, name, dept_id, leader_id) VALUES
                                                         (1, '人力资源核心团队', 2, NULL),
                                                         (2, '总裁办公室团队', 1, NULL),
                                                         (3, '数字营销团队', 3, NULL),
                                                         (4, '财务审计团队', 4, NULL),
                                                         (5, '软件开发团队', 5, NULL),
                                                         (6, '华东销售团队', 6, NULL),
                                                         (7, '客户支持团队', 7, NULL)
ON DUPLICATE KEY UPDATE name=VALUES(name), dept_id=VALUES(dept_id);

-- =========================================================
-- 6. 用户数据
-- =========================================================
INSERT INTO user (user_id, name, email, password, username, phone, team_id, role_id, gender, birth_date, bio, avatar_url, status, last_login, created_at) VALUES
-- 高管层
(1001, '张明远', 'zhangmingyuan@company.com', '$2a$10$ceo', 'zhangmy', '138-0000-1001', 2, 1, 'M', '1978-03-15', '拥有20年管理经验的企业领导者', '/avatars/zhangmy.jpg', 'active', NOW(), NOW()),
(1002, '李思琪', 'lisiqi@company.com', '$2a$10$ceo', 'lisiqi', '138-0000-1002', 2, 2, 'F', '1982-07-22', '擅长战略规划和业务拓展', '/avatars/lisiqi.jpg', 'active', NOW(), NOW()),

-- HR部门
(1003, '王浩然', 'wanghaoran@company.com', '$2a$10$ceo', 'wanghr', '138-0000-1003', 1, 2, 'M', '1985-11-10', '资深人力资源管理专家', '/avatars/wanghr.jpg', 'active', NOW(), NOW()),
(1004, '陈晓雨', 'chenxiaoyu@company.com', '$2a$10$ceo', 'chenxy', '138-0000-1004', 1, 4, 'F', '1990-05-25', '专注于员工发展和培训', '/avatars/chenxy.jpg', 'active', NOW(), NOW()),

-- 市场部
(1005, '刘梦婷', 'liumengting@company.com', '$2a$10$ceo', 'liumt', '138-0000-1005', 3, 3, 'F', '1986-09-30', '创意营销专家', '/avatars/liumt.jpg', 'active', NOW(), NOW()),
(1006, '赵天宇', 'zhaotianyu@company.com', '$2a$10$ceo', 'zhaoty', '138-0000-1006', 3, 4, 'M', '1991-12-05', '数字营销专员', '/avatars/zhaoty.jpg', 'active', NOW(), NOW()),
(1007, '孙雅静', 'sunyajing@company.com', '$2a$10$ceo', 'sunyj', '138-0000-1007', 3, 4, 'F', '1993-08-14', '内容创作达人', '/avatars/sunyj.jpg', 'active', NOW(), NOW()),

-- 财务部
(1008, '周建国', 'zhoujianguo@company.com', '$2a$10$ceo', 'zhoujg', '138-0000-1008', 4, 3, 'M', '1984-04-18', '注册会计师，财务分析专家', '/avatars/zhoujg.jpg', 'active', NOW(), NOW()),
(1009, '吴美丽', 'wumeili@company.com', '$2a$10$ceo', 'wuml', '138-0000-1009', 4, 4, 'F', '1992-06-12', '财务分析师', '/avatars/wuml.jpg', 'active', NOW(), NOW()),

-- 技术部
(1010, '郑科技', 'zhengkeji@company.com', '$2a$10$ceo', 'zhengkj', '138-0000-1010', 5, 3, 'M', '1987-02-28', '全栈开发专家', '/avatars/zhengkj.jpg', 'active', NOW(), NOW()),
(1011, '冯小慧', 'fengxiaohui@company.com', '$2a$10$ceo', 'fengxh', '138-0000-1011', 5, 4, 'F', '1994-01-08', '后端开发工程师', '/avatars/fengxh.jpg', 'active', NOW(), NOW()),
(1012, '陈明亮', 'chenmingliang@company.com', '$2a$10$ceo', 'chenml', '138-0000-1012', 5, 4, 'M', '1989-07-19', '前端开发工程师', '/avatars/chenml.jpg', 'active', NOW(), NOW()),

-- 销售部
(1013, '杨雪峰', 'yangxuefeng@company.com', '$2a$10$ceo', 'yangxf', '138-0000-1013', 6, 3, 'M', '1983-10-03', '销售冠军团队领导', '/avatars/yangxf.jpg', 'active', NOW(), NOW()),
(1014, '黄婷婷', 'huangtingting@company.com', '$2a$10$ceo', 'huangtt', '138-0000-1014', 6, 4, 'F', '1995-11-15', '销售专员', '/avatars/huangtt.jpg', 'active', NOW(), NOW()),

-- 运维部
(1015, '林晓梅', 'linxiaomei@company.com', '$2a$10$ceo', 'linxm', '138-0000-1015', 7, 3, 'F', '1981-08-07', '客户服务专家', '/avatars/linxm.jpg', 'active', NOW(), NOW()),

-- 管理员
(1016, '系统管理员', 'admin@company.com', '$2a$10$ceo', 'admin', '138-0000-1016', NULL, 5, 'M', '1980-01-01', '系统运维和技术支持', '/avatars/admin.jpg', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), team_id=VALUES(team_id), role_id=VALUES(role_id);

-- =========================================================
-- 7. 更新团队领导
-- =========================================================
UPDATE team SET leader_id = 1003 WHERE team_id = 1;
UPDATE team SET leader_id = 1001 WHERE team_id = 2;
UPDATE team SET leader_id = 1005 WHERE team_id = 3;
UPDATE team SET leader_id = 1008 WHERE team_id = 4;
UPDATE team SET leader_id = 1010 WHERE team_id = 5;
UPDATE team SET leader_id = 1013 WHERE team_id = 6;
UPDATE team SET leader_id = 1015 WHERE team_id = 7;

-- =========================================================
-- 8. 任务数据
-- =========================================================
INSERT INTO task (task_id, title, description, creator_id, priority, status, start_at, due_at, parent_task, created_at, updated_at) VALUES
-- 主任务
(1, '第四季度公司战略规划', '制定包含预算和资源分配的第四季度全面战略规划，确保各部门目标一致', 1001, 'Urgent', 'Published', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NULL, NOW(), NOW()),
(2, '公司官网重构项目', '完成公司官网的现代化重构，提升用户体验和品牌形象', 1010, 'High', 'InProgress', NOW(), DATE_ADD(NOW(), INTERVAL 45 DAY), NULL, NOW(), NOW()),
(3, '年度员工满意度调研', '组织开展年度员工满意度调研并进行数据分析，提出改进建议', 1003, 'Medium', 'Published', NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY), NULL, NOW(), NOW()),
(4, '新产品线上市推广', '负责新产品线的市场推广活动策划与执行', 1005, 'High', 'Assigned', NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY), NULL, NOW(), NOW()),
(5, '第三季度财务审计', '完成第三季度财务审计工作并生成审计报告', 1008, 'Urgent', 'Reported', NOW(), DATE_ADD(NOW(), INTERVAL 10 DAY), NULL, NOW(), NOW()),
(6, '销售团队培训计划', '制定并实施销售团队专业技能培训计划', 1013, 'Medium', 'InProgress', NOW(), DATE_ADD(NOW(), INTERVAL 25 DAY), NULL, NOW(), NOW()),

-- 子任务
(7, '市场调研分析', '为第四季度战略规划进行市场调研和竞品分析', 1001, 'High', 'Completed', NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), 1, NOW(), NOW()),
(8, '预算方案制定', '制定第四季度详细预算分配方案', 1002, 'High', 'InProgress', NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY), 1, NOW(), NOW()),
(9, '用户界面设计', '设计新版官网的用户界面和交互流程', 1012, 'Medium', 'Completed', NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY), 2, NOW(), NOW()),
(10, '后端系统开发', '开发官网后端功能模块和数据库设计', 1011, 'High', 'InProgress', NOW(), DATE_ADD(NOW(), INTERVAL 35 DAY), 2, NOW(), NOW()),
(11, '调研问卷设计', '设计员工满意度调研问卷内容', 1004, 'Low', 'Completed', DATE_SUB(NOW(), INTERVAL 5 DAY), NOW(), 3, NOW(), NOW()),
(12, '数据分析报告', '分析调研数据并生成详细分析报告', 1003, 'Medium', 'Assigned', NOW(), DATE_ADD(NOW(), INTERVAL 10 DAY), 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), status=VALUES(status), priority=VALUES(priority);

-- =========================================================
-- 9. 任务分配
-- =========================================================
INSERT INTO task_assignment (assignment_id, task_id, assignee_id, assigned_by, assigned_at, progress_pct, accept_at, finish_at) VALUES
                                                                                                                                    (1, 1, 1002, 1001, NOW(), 40, NOW(), NULL),
                                                                                                                                    (2, 2, 1011, 1010, NOW(), 65, NOW(), NULL),
                                                                                                                                    (3, 2, 1012, 1010, NOW(), 100, NOW(), DATE_SUB(NOW(), INTERVAL 2 DAY)),
                                                                                                                                    (4, 3, 1004, 1003, NOW(), 70, NOW(), NULL),
                                                                                                                                    (5, 4, 1006, 1005, NOW(), 25, NOW(), NULL),
                                                                                                                                    (6, 4, 1007, 1005, NOW(), 15, NOW(), NULL),
                                                                                                                                    (7, 5, 1009, 1008, NOW(), 95, NOW(), NULL),
                                                                                                                                    (8, 6, 1014, 1013, NOW(), 50, NOW(), NULL),
                                                                                                                                    (9, 7, 1006, 1001, DATE_SUB(NOW(), INTERVAL 10 DAY), 100, DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
                                                                                                                                    (10, 8, 1008, 1002, NOW(), 60, NOW(), NULL),
                                                                                                                                    (11, 9, 1012, 1010, DATE_SUB(NOW(), INTERVAL 15 DAY), 100, DATE_SUB(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),
                                                                                                                                    (12, 10, 1011, 1010, NOW(), 75, NOW(), NULL),
                                                                                                                                    (13, 11, 1004, 1003, DATE_SUB(NOW(), INTERVAL 7 DAY), 100, DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
                                                                                                                                    (14, 12, 1003, 1003, NOW(), 10, NOW(), NULL)
ON DUPLICATE KEY UPDATE progress_pct=VALUES(progress_pct), accept_at=VALUES(accept_at);

-- =========================================================
-- 10. 任务标签
-- =========================================================
INSERT INTO tags (task_id, tag) VALUES
                                    (1, '战略规划'), (1, '第四季度'), (1, '预算管理'),
                                    (2, '网站开发'), (2, '用户体验'), (2, '品牌建设'),
                                    (3, '人力资源'), (3, '员工调研'), (3, '满意度'),
                                    (4, '市场营销'), (4, '产品推广'), (4, '品牌活动'),
                                    (5, '财务管理'), (5, '审计'), (5, '第三季度'),
                                    (6, '销售培训'), (6, '团队建设'), (6, '技能提升'),
                                    (7, '市场研究'), (7, '竞争分析'),
                                    (8, '预算编制'), (8, '财务规划'),
                                    (9, 'UI设计'), (9, '用户体验'),
                                    (10, '后端开发'), (10, '系统架构'),
                                    (11, '问卷设计'), (11, '调研方法'),
                                    (12, '数据分析'), (12, '报告撰写')
ON DUPLICATE KEY UPDATE tag=VALUES(tag);

-- =========================================================
-- 11. 工作日志
-- =========================================================
INSERT INTO log (log_id, user_id, task_id, todaySummary, tomorrowPlan, helpNeeded, status, log_date, created_at, updated_at) VALUES
                                                                                                                                 (1, 1001, 1, '审阅了第三季度业绩指标，初步搭建了第四季度战略框架。与各部门负责人开会收集了意见建议。', '确定战略目标并安排执行委员会评审会议。', '需要财务部门提供详细的财务预测数据。', 'Productive', CURDATE(), NOW(), NOW()),
                                                                                                                                 (2, 1002, 1, '分析了第四季度计划所需的运营能力。发现技术部门可能存在资源约束问题。', '制定资源分配计划并与技术负责人讨论。', '需要市场部明确项目时间表安排。', 'Challenging', CURDATE(), NOW(), NOW()),
                                                                                                                                 (3, 1006, 4, '完成了新产品上市的竞品分析。起草了初步营销信息并确定了目标受众群体。', '开始创建社交媒体营销素材并安排内容日历。', '需要审批营销活动预算方案。', 'Productive', CURDATE(), NOW(), NOW()),
                                                                                                                                 (4, 1011, 10, '完成了用户认证模块开发，开始进行仪表板API开发。修复了QA团队报告的多个bug。', '完成仪表板API并开始集成测试。评估性能优化机会。', '需要明确部分API接口规范细节。', 'Focused', CURDATE(), NOW(), NOW()),
                                                                                                                                 (5, 1008, 5, '完成了95%的第三季度审计工作。发现费用报销中存在需要解决的小额差异。', '完成审计报告并向执行团队汇报发现。', '需要销售部门提供额外的文件资料。', 'AlmostDone', CURDATE(), NOW(), NOW()),
                                                                                                                                 (6, 1013, 6, '开发了销售培训计划的前3个模块。与两名团队成员进行了试点培训收集反馈。', '根据反馈修订模块内容并制定评估标准。', '需要收集销售成功案例作为教学示例。', 'Progressing', DATE_SUB(CURDATE(), INTERVAL 1 DAY), NOW(), NOW()),
                                                                                                                                 (7, 1003, 3, '收集了85%的员工调研问卷。初步分析显示工作场所满意度有所提升。', '完成数据收集并开始部门层面的详细分析。', '需要IT支持解决调研平台的技术问题。', 'Positive', DATE_SUB(CURDATE(), INTERVAL 1 DAY), NOW(), NOW()),
                                                                                                                                 (8, 1014, 6, '参加了培训试点项目。对培训内容和交付方式提供了详细反馈意见。', '审阅更新后的培训材料，为全团队推广做准备。', '希望增加更多实际业务场景的案例教学。', 'Engaged', DATE_SUB(CURDATE(), INTERVAL 2 DAY), NOW(), NOW())
ON DUPLICATE KEY UPDATE todaySummary=VALUES(todaySummary), tomorrowPlan=VALUES(tomorrowPlan);

-- =========================================================
-- 12. 日志关键词
-- =========================================================
INSERT INTO log_keyword (log_id, keyword, weight) VALUES
                                                      (1, '战略规划', 0.9), (1, '业绩指标', 0.7), (1, '部门协调', 0.6),
                                                      (2, '运营管理', 0.8), (2, '资源配置', 0.9), (2, '能力分析', 0.7),
                                                      (3, '市场营销', 0.9), (3, '竞品分析', 0.8), (3, '目标受众', 0.7),
                                                      (4, '技术开发', 0.9), (4, 'API设计', 0.8), (4, '系统测试', 0.7),
                                                      (5, '财务审计', 0.9), (5, '合规检查', 0.8), (5, '差异分析', 0.7),
                                                      (6, '培训发展', 0.9), (6, '销售技能', 0.8), (6, '团队建设', 0.7),
                                                      (7, '人力资源', 0.9), (7, '员工调研', 0.8), (7, '满意度', 0.7),
                                                      (8, '培训反馈', 0.8), (8, '技能提升', 0.7), (8, '业务场景', 0.6)
ON DUPLICATE KEY UPDATE weight=VALUES(weight);

-- =========================================================
-- 13. 日志任务映射
-- =========================================================
INSERT INTO log_task_map (log_id, task_id) VALUES
                                               (1, 1), (2, 1), (3, 4), (4, 10), (5, 5), (6, 6), (7, 3), (8, 6)
ON DUPLICATE KEY UPDATE log_id=VALUES(log_id);

-- =========================================================
-- 14. 任务报告
-- =========================================================
INSERT INTO task_report (report_id, task_id, reporter_id, content, attachments, created_at) VALUES
                                                                                                (1, 5, 1008, '第三季度审计工作接近完成。在费用报销中发现总计1250元的小额差异。其他所有财务记录准确且合规。最终报告将于明天提交执行委员会评审。', '第三季度审计初步报告.pdf', NOW()),
                                                                                                (2, 2, 1010, '网站重构项目已完成65%。UI设计阶段提前完成。后端开发进展顺利，认证系统已完成。测试阶段将于下周开始。', '项目状态汇报.pptx', NOW()),
                                                                                                (3, 9, 1012, 'UI设计任务成功完成。交付了所有设计资源和样式指南。获得利益相关者的积极反馈。准备移交开发团队。', 'UI设计资源包.zip', NOW()),
                                                                                                (4, 7, 1006, '市场调研提前完成。收集了5个主要竞争对手的数据，识别了3个新兴市场趋势。已向战略团队提交演示文稿。', '市场调研分析报告.pdf', NOW())
ON DUPLICATE KEY UPDATE content=VALUES(content), attachments=VALUES(attachments);

-- =========================================================
-- 15. 评论数据
-- =========================================================
INSERT INTO comment (comment_id, owner_type, owner_id, author_id, content, created_at) VALUES
                                                                                           (1, 'task', 1, 1002, '战略框架进展很好。请确保与财务预测保持一致。', NOW()),
                                                                                           (2, 'task', 2, 1001, '网站重构看起来很棒。请确保优先考虑移动端响应式设计。', NOW()),
                                                                                           (3, 'log', 3, 1005, '优秀的竞品分析。让我们安排会议讨论营销信息策略。', NOW()),
                                                                                           (4, 'task', 5, 1001, '在执行委员会评审前，请提供更多关于费用差异的详细信息。', NOW()),
                                                                                           (5, 'log', 4, 1010, '认证模块工作做得很好。如果需要帮助处理API规范，请告诉我。', NOW()),
                                                                                           (6, 'task', 6, 1002, '培训计划反馈非常积极。考虑将此扩展到其他部门。', NOW()),
                                                                                           (7, 'log', 7, 1001, '很高兴看到工作场所满意度有所提升。让我们解决任何部门特定的问题。', NOW()),
                                                                                           (8, 'task_report', 2, 1001, '优秀的进度报告。期待看到测试结果。', NOW())
ON DUPLICATE KEY UPDATE content=VALUES(content);

-- =========================================================
-- 16. 通知数据
-- =========================================================
INSERT INTO notification (notif_id, user_id, type, title, body, is_read, created_at) VALUES
                                                                                         (1, 1002, 'Task Assigned', '新任务分配', '您已被分配到任务：第四季度公司战略规划', false, NOW()),
                                                                                         (2, 1006, 'Task Update', '任务进度更新', '您的任务"市场调研分析"已标记为完成', true, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
                                                                                         (3, 1011, 'Comment', '您的工作日志有新评论', '郑科技对您的工作日志发表了评论', false, DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
                                                                                         (4, 1003, 'Report', '调研报告已就绪', '员工调研分析现已可用', true, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
                                                                                         (5, 1008, 'Reminder', '截止日期临近', '第三季度财务审计截止日期还剩3天', false, NOW()),
                                                                                         (6, 1014, 'Training', '培训课程已安排', '新的销售培训课程已安排在下周', false, DATE_SUB(NOW(), INTERVAL 4 HOUR))
ON DUPLICATE KEY UPDATE title=VALUES(title), body=VALUES(body), is_read=VALUES(is_read);

-- =========================================================
-- 17. 个人任务数据
-- =========================================================
INSERT INTO personal_task (user_id, personal_tasks) VALUES
                                                        (1001, '["准备董事会会议演示文稿", "审阅季度财务报表", "与投资者会面"]'),
                                                        (1002, '["优化运营流程", "团队绩效评估", "预算规划会议"]'),
                                                        (1006, '["研究新的营销趋势", "更新社交媒体日历", "客户会议准备"]'),
                                                        (1011, '["学习新技术框架", "代码审查会议", "技术文档编写"]'),
                                                        (1014, '["跟进潜在客户", "更新CRM记录", "销售培训准备"]')
ON DUPLICATE KEY UPDATE personal_tasks=VALUES(personal_tasks);

-- =========================================================
-- 18. 登录记录
-- =========================================================
INSERT INTO login (user_id, token, created_at, valid_to) VALUES
                                                             (1001, 'token_zhangmy_123', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
                                                             (1002, 'token_lisiqi_456', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
                                                             (1006, 'token_zhaoty_789', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
                                                             (1011, 'token_fengxh_012', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
                                                             (1016, 'token_admin_345', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))
ON DUPLICATE KEY UPDATE token=VALUES(token), valid_to=VALUES(valid_to);

-- =========================================================
-- 19. 公司任务数据
-- =========================================================
INSERT INTO company_task (task_id, title, description, priority, status, startAt, dueAt, createdAt, updatedAt) VALUES
                                                                                                                   (1, '年度公司团建活动', '策划和组织全体员工参加的年度公司团建活动', 'High', 'Published', NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), NOW(), NOW()),
                                                                                                                   (2, 'IT基础设施升级', '升级公司IT基础设施和安全系统', 'Urgent', 'InProgress', NOW(), DATE_ADD(NOW(), INTERVAL 60 DAY), NOW(), NOW()),
                                                                                                                   (3, '客户满意度提升计划', '实施新的客户满意度测量和改进计划', 'Medium', 'Assigned', NOW(), DATE_ADD(NOW(), INTERVAL 45 DAY), NOW(), NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), status=VALUES(status), priority=VALUES(priority);

-- =========================================================
-- 20. 仪表板项目
-- =========================================================
INSERT INTO dashboard_item (item_id, scope, category, title, ref_type, ref_id, sort_order, updated_by, updated_at) VALUES
                                                                                                                       (1, 'Company', 'Performance', '第三季度收入指标', 'report', 1, 1, 1001, NOW()),
                                                                                                                       (2, 'Company', 'Projects', '网站重构项目进度', 'task', 2, 2, 1010, NOW()),
                                                                                                                       (3, 'Personal', 'Tasks', '我的当前任务', 'user', 1006, 1, 1006, NOW()),
                                                                                                                       (4, 'Company', 'HR', '员工满意度趋势', 'log', 7, 3, 1003, NOW()),
                                                                                                                       (5, 'Personal', 'Deadlines', '即将到期的任务', 'user', 1011, 2, 1011, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), sort_order=VALUES(sort_order);

-- =========================================================
-- 21. 附件数据
-- =========================================================
INSERT INTO attachment (attach_id, owner_type, owner_id, file_name, file_url, uploaded_by, uploaded_at) VALUES
                                                                                                            (1, 'task_report', 1, '审计报告.pdf', '/attachments/audit_report_2023q3.pdf', 1008, NOW()),
                                                                                                            (2, 'task_report', 2, '项目状态.pptx', '/attachments/project_status_website.pptx', 1010, NOW()),
                                                                                                            (3, 'task', 2, '设计规范.docx', '/attachments/design_spec.docx', 1012, NOW()),
                                                                                                            (4, 'task_report', 4, '市场分析.pdf', '/attachments/market_analysis.pdf', 1006, NOW())
ON DUPLICATE KEY UPDATE file_name=VALUES(file_name), file_url=VALUES(file_url);

-- =========================================================
-- 22. AI分析数据
-- =========================================================
INSERT INTO ai_analysis (analysis_id, title, generated_at, generated_by, summary, metrics_json, suggestions) VALUES
                                                                                                                 (1, '团队工作效率分析', NOW(), 1016, '基于近期工作日志数据，分析了团队整体工作效率和协作情况', '{"avg_productivity": 78, "collaboration_score": 82, "task_completion_rate": 85}', '建议加强跨部门协作，优化任务分配机制'),
                                                                                                                 (2, '项目风险评估', NOW(), 1016, '对当前进行中的项目进行了风险评估和预测', '{"high_risk_tasks": 2, "medium_risk_tasks": 5, "low_risk_tasks": 8}', '建议重点关注高风险任务，制定应急预案')
ON DUPLICATE KEY UPDATE summary=VALUES(summary), suggestions=VALUES(suggestions);

-- =========================================================
-- 23. AI分析映射
-- =========================================================
INSERT INTO ai_analysis_log_map (analysis_id, log_id) VALUES
                                                          (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8)
ON DUPLICATE KEY UPDATE analysis_id=VALUES(analysis_id);

INSERT INTO ai_analysis_task_map (analysis_id, task_id) VALUES
                                                            (2, 1), (2, 2), (2, 3), (2, 4), (2, 5), (2, 6)
ON DUPLICATE KEY UPDATE analysis_id=VALUES(analysis_id);

-- =========================================================
-- 24. 验证码数据
-- =========================================================
INSERT INTO verification_code (id, email, code, created_at) VALUES
                                                                (1, 'zhangmingyuan@company.com', '123456', NOW()),
                                                                (2, 'lisiqi@company.com', '654321', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
                                                                (3, 'admin@company.com', '888888', DATE_SUB(NOW(), INTERVAL 15 MINUTE))
ON DUPLICATE KEY UPDATE code=VALUES(code), created_at=VALUES(created_at);

-- 重新启用外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 完成提示
SELECT '测试数据插入完成！' AS '状态';
SELECT '数据统计：' AS '统计信息';
SELECT COUNT(*) AS '角色数量' FROM role;
SELECT COUNT(*) AS '用户数量' FROM user;
SELECT COUNT(*) AS '任务数量' FROM task;
SELECT COUNT(*) AS '日志数量' FROM log;
SELECT COUNT(*) AS '评论数量' FROM comment;
SELECT COUNT(*) AS '通知数量' FROM notification;