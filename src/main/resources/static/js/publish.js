(function(){
  'use strict';

  // 全局变量
  var allUsers = [];
  var selectedUserIds = [];

  // 获取表单元素值
  function getVal(id) { 
    var el = document.getElementById(id); 
    return el ? el.value.trim() : ''; 
  }
  
  // 设置表单元素值
  function setVal(id, v) { 
    var el = document.getElementById(id); 
    if (el) el.value = v || ''; 
  }

  // 重置表单
  function resetForm() {
    ['pf_title', 'pf_description', 'pf_dueAt', 'pf_priority', 'pf_tags', 'pf_assigneeIds'].forEach(function(id) { 
      setVal(id, ''); 
    });
    selectedUserIds = [];
    updateSelectedUsersDisplay();
    
    // 重置优先级下拉框
    var prioritySelect = document.getElementById('pf_priority');
    if (prioritySelect) prioritySelect.selectedIndex = 0;
  }

  // 解析标签
  function parseTags(tagsString) {
    if (!tagsString || !tagsString.trim()) return [];
    return tagsString.split(',').map(function(tag) {
      return tag.trim();
    }).filter(function(tag) {
      return tag.length > 0;
    });
  }

  // 验证表单
  function validateForm() {
    var title = getVal('pf_title');
    if (!title) {
      alert('请输入任务标题');
      return false;
    }

    var description = getVal('pf_description');
    if (!description) {
      alert('请输入任务描述');
      return false;
    }

    var dueAt = getVal('pf_dueAt');
    if (!dueAt) {
      alert('请选择截止时间');
      return false;
    }

    var priority = getVal('pf_priority');
    if (!priority) {
      alert('请选择优先级');
      return false;
    }

    if (selectedUserIds.length === 0) {
      alert('请至少选择一个成员');
      return false;
    }

    return true;
  }

  // 提交任务
  function submitTask() {
    console.log('📝 准备创建任务');
    
    if (!validateForm()) {
      return;
    }

    // 收集表单数据
    var title = getVal('pf_title');
    var description = getVal('pf_description');
    var dueAtStr = getVal('pf_dueAt');
    var priority = getVal('pf_priority');
    var tagsStr = getVal('pf_tags');

    // 转换datetime-local格式为ISO 8601格式
    var dueAt = new Date(dueAtStr).toISOString();

    // 解析标签
    var tags = parseTags(tagsStr);

    var taskData = {
      title: title,
      description: description,
      dueAt: dueAt,
      priority: priority,
      tags: tags.length > 0 ? tags : undefined,
      assigneeIds: selectedUserIds
    };

    console.log('📤 发送任务数据:', taskData);

    // 显示加载状态
    var btnPublish = document.getElementById('btnPublish');
    var originalText = btnPublish.innerHTML;
    btnPublish.disabled = true;
    btnPublish.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';

    // 调用API创建任务
    window.API.createTask(taskData).then(function(response) {
      console.log('✅ 任务创建成功:', response);
      
      // 恢复按钮状态
      btnPublish.disabled = false;
      btnPublish.innerHTML = originalText;

      if (response && response.ok) {
        alert('任务创建成功！\n任务ID: ' + response.taskId + '\n' + (response.message || ''));
        resetForm();
        
        // 可选：跳转到任务列表页面
        setTimeout(function() {
          if (confirm('是否跳转到任务列表查看？')) {
            window.location.href = 'tasks.html';
          }
        }, 500);
      } else {
        alert('任务创建成功但响应格式异常');
        resetForm();
      }
    }).catch(function(error) {
      console.error('❌ 任务创建失败:', error);
      
      // 恢复按钮状态
      btnPublish.disabled = false;
      btnPublish.innerHTML = originalText;

      var errorMsg = '任务创建失败';
      if (error && error.message) {
        errorMsg += ':\n' + error.message;
      } else if (error && error.error) {
        errorMsg += ':\n' + error.error;
      }
      alert(errorMsg);
    });
  }

  // ========== 用户选择相关函数 ==========

  // 显示用户选择器
  window.showUserSelector = async function() {
    console.log('🔍 显示用户选择器');
    var modal = document.getElementById('userModal');
    modal.style.display = 'block';

    // 如果还没加载用户列表，则加载
    if (allUsers.length === 0) {
      await loadUsers();
    } else {
      renderUserList(allUsers);
    }
  };

  // 关闭用户选择器
  window.closeUserSelector = function() {
    var modal = document.getElementById('userModal');
    modal.style.display = 'none';
  };

  // 加载用户列表
  async function loadUsers() {
    try {
      console.log('📋 加载用户列表');
      var userListDiv = document.getElementById('userList');
      userListDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#999;"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';

      // 循环获取所有页的用户数据
      var allUsersList = [];
      var currentPage = 1;
      var totalPages = 1;
      
      do {
        var response = await window.API.getUsers(currentPage, 100);
        console.log('✅ 第' + currentPage + '页用户列表原始响应:', response);
        
        // 兼容不同的返回格式
        var data = response.data || response;
        console.log('📋 解析后的数据:', data);
        
        if (data && data.list && Array.isArray(data.list)) {
          console.log('✅ 获取到' + data.list.length + '个用户');
          allUsersList = allUsersList.concat(data.list);
          totalPages = data.totalPages || 1;
          currentPage++;
        } else {
          console.warn('⚠️ 数据格式不符合预期:', data);
          break;
        }
      } while (currentPage <= totalPages);
      
      console.log('✅ 总共加载用户数:', allUsersList.length);
      
      if (allUsersList.length > 0) {
        allUsers = allUsersList;
        await renderUserList(allUsers);
        updateSelectedCount();
      } else {
        userListDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">没有找到用户</div>';
      }
    } catch (error) {
      console.error('❌ 加载用户列表失败:', error);
      var userListDiv = document.getElementById('userList');
      userListDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#ff4d4f;">加载失败: ' + error.message + '</div>';
    }
  }

  // 渲染用户列表（带团队和角色信息）
  async function renderUserList(users) {
    var userListDiv = document.getElementById('userList');
    
    if (!users || users.length === 0) {
      userListDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">没有找到用户</div>';
      return;
    }

    // 使用Promise.all并行获取所有用户的团队名称
    var userItemsPromises = users.map(async function(user) {
      var userId = user.user_id || user.userId || user.id;
      var isSelected = selectedUserIds.indexOf(userId) >= 0;
      var userName = user.name || '未知';
      var userEmail = user.email || '';
      
      // 获取团队名称
      var teamDisplay = '未分配';
      if (user.team && user.team.name) {
        teamDisplay = user.team.name;
      } else if (user.team_id || user.teamId) {
        var teamId = user.team_id || user.teamId;
        try {
          teamDisplay = await window.API.getTeamNameCached(teamId);
        } catch (error) {
          console.error('获取团队名称失败:', error);
          teamDisplay = '团队' + teamId;
        }
      }
      
      // 获取角色名称（五级身份）
      var roleDisplay = '未知';
      if (user.role && user.role.name) {
        roleDisplay = user.role.name;
      } else if (user.role_id || user.roleId) {
        // 角色ID映射到名称
        var roleMap = {
          1: '公司首席执行官',
          2: '部门经理',
          3: '团队负责人',
          4: '普通成员',
          5: '系统管理员'
        };
        roleDisplay = roleMap[user.role_id || user.roleId] || '普通成员';
      }

      return '<div class="user-item ' + (isSelected ? 'selected' : '') + '" data-user-id="' + userId + '" onclick="toggleUser(' + userId + ')">' +
             '<div class="user-info">' +
             '<div class="user-name">' + escapeHtml(userName) + '</div>' +
             '<div class="user-meta">' +
             'ID: ' + userId + ' | ' + escapeHtml(userEmail) + '<br>' +
             '<span style="color:#ff8a00;">👥 ' + escapeHtml(teamDisplay) + '</span> | ' +
             '<span style="color:#a55b00;">🏷️ ' + escapeHtml(roleDisplay) + '</span>' +
             '</div>' +
             '</div>' +
             '<div class="user-check">' + (isSelected ? '✓' : '') + '</div>' +
             '</div>';
    });

    // 等待所有用户项渲染完成
    var userItems = await Promise.all(userItemsPromises);
    userListDiv.innerHTML = userItems.join('');
  }

  // 切换用户选择状态
  window.toggleUser = async function(userId) {
    console.log('👆 切换用户:', userId);
    
    var index = selectedUserIds.indexOf(userId);
    if (index >= 0) {
      // 取消选择
      selectedUserIds.splice(index, 1);
        } else {
      // 选择
      selectedUserIds.push(userId);
    }

    // 更新UI
    await renderUserList(allUsers);
    updateSelectedCount();
  };

  // 更新已选择用户数量显示
  function updateSelectedCount() {
    var countElement = document.getElementById('selectedCount');
    if (countElement) {
      countElement.innerHTML = '已选择 <strong style="color:#ff8a00;">' + selectedUserIds.length + '</strong> 人';
    }
  }

  // 确认用户选择
  window.confirmUserSelection = function() {
    console.log('✅ 确认选择的用户:', selectedUserIds);
    
    if (selectedUserIds.length === 0) {
      alert('请至少选择一个用户');
      return;
    }

    // 更新隐藏字段
    setVal('pf_assigneeIds', selectedUserIds.join(','));
    
    // 更新显示
    updateSelectedUsersDisplay();
    
    // 关闭模态框
    closeUserSelector();
  };

  // 更新已选用户的显示
  function updateSelectedUsersDisplay() {
    var container = document.getElementById('selectedUsers');
    
    if (selectedUserIds.length === 0) {
      container.innerHTML = '<div style="color:#999; font-size:13px; padding:8px;">尚未选择成员</div>';
      return;
    }

    container.innerHTML = selectedUserIds.map(function(userId) {
      var user = allUsers.find(function(u) {
        return (u.user_id || u.userId || u.id) === userId;
      });
      
      var userName = user ? (user.name || '用户' + userId) : '用户' + userId;
      
      return '<span class="user-tag">' +
             '<i class="fas fa-user"></i> ' +
             escapeHtml(userName) + ' (ID: ' + userId + ')' +
             '<span class="user-tag-remove" onclick="removeUser(' + userId + ')" title="移除">×</span>' +
             '</span>';
    }).join('');
  }

  // 移除已选用户
  window.removeUser = function(userId) {
    var index = selectedUserIds.indexOf(userId);
    if (index >= 0) {
      selectedUserIds.splice(index, 1);
      setVal('pf_assigneeIds', selectedUserIds.join(','));
      updateSelectedUsersDisplay();
    }
  };

  // HTML转义
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 页面加载完成
  document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 发布任务页面加载完成');

    // 显示当前用户信息
    try {
      var raw = localStorage.getItem('currentUser');
      var user = raw ? JSON.parse(raw) : { name: '用户' };
      var el = document.getElementById('currentUserName');
      if (el) el.textContent = user.name || '用户';
    } catch (e) {
      console.error('加载用户信息失败:', e);
    }

    // 设置默认截止时间为明天
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    var datetimeStr = tomorrow.toISOString().slice(0, 16);
    setVal('pf_dueAt', datetimeStr);

    // 绑定表单提交事件
    var form = document.getElementById('publishForm');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitTask();
      });
    }

    // 绑定重置按钮
    var btnReset = document.getElementById('btnReset');
    if (btnReset) {
      btnReset.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('确定要重置表单吗？')) {
          resetForm();
          // 重新设置默认截止时间
          var tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(18, 0, 0, 0);
          var datetimeStr = tomorrow.toISOString().slice(0, 16);
          setVal('pf_dueAt', datetimeStr);
        }
      });
    }

    // 点击模态框外部关闭
    var modal = document.getElementById('userModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeUserSelector();
        }
      });
    }

    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (modal && modal.style.display === 'block') {
          closeUserSelector();
        }
      }
    });

    console.log('✅ 发布任务页面初始化完成');
  });
})();
