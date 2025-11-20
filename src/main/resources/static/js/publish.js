(function(){
  'use strict';

  // 全局变量
  var allUsers = []; // 存储所有用户数据
  var selectedUserIds = [];
  var currentPage = 1;
  var pageSize = 10; // 每页显示10个用户
  var totalPages = 1;
  var totalUsers = 0;
  var allSelectedUsers = []; // 存储所有已选择的用户信息，跨页保持
  var searchKeyword = ''; // 搜索关键词
  var filteredUsers = []; // 过滤后的用户列表

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
    allSelectedUsers = []; // 重置所有已选择用户
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
    console.log('准备创建任务');
    
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

    console.log('发送任务数据:', taskData);

    // 显示加载状态
    var btnPublish = document.getElementById('btnPublish');
    var originalText = btnPublish.innerHTML;
    btnPublish.disabled = true;
    btnPublish.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 创建中...';

    // 调用API创建任务
    window.API.createTask(taskData).then(function(response) {
      console.log('任务创建成功:', response);
      
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
      console.error('任务创建失败:', error);
      
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
    console.log('显示用户选择器');
    var modal = document.getElementById('userModal');
    modal.style.display = 'block';

    // 重置分页状态和数据
    currentPage = 1;
    searchKeyword = ''; // 重置搜索关键词
    allUsers = []; // 重置用户数据，避免累积
    filteredUsers = []; // 重置过滤后的用户列表
    
    // 不重置已选择的用户，保持之前的选择状态
    // allSelectedUsers = []; // 注释掉这行，保持之前的选择
    
    // 加载第一页用户列表
    await loadUsers(1);
  };

  // 关闭用户选择器
  window.closeUserSelector = function() {
    var modal = document.getElementById('userModal');
    modal.style.display = 'none';
    // 重置分页状态和数据
    currentPage = 1;
    searchKeyword = ''; // 重置搜索关键词
    allUsers = []; // 清空用户数据，释放内存
    filteredUsers = []; // 清空过滤后的用户列表
  };

  // 加载用户列表（分页版本）
  async function loadUsers(page = 1) {
    try {
      console.log('加载用户列表，第' + page + '页');
      var userListDiv = document.getElementById('userList');
      userListDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#999;"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';

      // 获取所有用户数据（后端返回完整列表）
      var response = await window.API.getUsers(1, 1000); // 获取大量数据确保包含所有用户
      console.log('用户列表原始响应:', response);
      
      // 兼容不同的返回格式
      var data = response.data || response;
      console.log('解析后的数据:', data);
      
      if (data && Array.isArray(data)) {
        // 如果返回的是数组，直接使用
        allUsers = data;
        totalUsers = data.length;
      } else if (data && data.list && Array.isArray(data.list)) {
        // 如果返回的是对象，使用list属性
        allUsers = data.list;
        totalUsers = data.list.length;
      } else {
        console.warn('⚠数据格式不符合预期:', data);
        userListDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">没有找到用户</div>';
        return;
      }
      
      console.log('总共获取到' + allUsers.length + '个用户');
      
      // 应用搜索过滤
      if (searchKeyword) {
        filteredUsers = allUsers.filter(function(user) {
          var userId = String(user.user_id || user.userId || user.id || '').toLowerCase();
          var userEmail = (user.email || '').toLowerCase();
          var userName = (user.name || '').toLowerCase();
          var keyword = searchKeyword.toLowerCase();
          
          // 搜索员工ID、邮箱或姓名
          return userId.includes(keyword) || userEmail.includes(keyword) || userName.includes(keyword);
        });
        console.log('搜索过滤后剩余' + filteredUsers.length + '个用户');
      } else {
        filteredUsers = allUsers.slice(); // 复制所有用户
      }
      
      // 更新全局变量
      currentPage = page;
      totalPages = Math.ceil(filteredUsers.length / pageSize);
      
      // 计算当前页应该显示的用户
      var startIndex = (page - 1) * pageSize;
      var endIndex = Math.min(startIndex + pageSize, filteredUsers.length);
      var currentPageUsers = filteredUsers.slice(startIndex, endIndex);
      
      console.log('第' + page + '页显示用户索引范围:', startIndex, '到', endIndex - 1, '共', currentPageUsers.length, '个用户');
      
      // 只渲染当前页的用户
      await renderUserList(currentPageUsers, page);
      updatePagination();
      updateSelectedCount();
      
    } catch (error) {
      console.error('加载用户列表失败:', error);
      var userListDiv = document.getElementById('userList');
      userListDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#ff4d4f;">加载失败: ' + error.message + '</div>';
    }
  }

  // 渲染用户列表（带团队和角色信息）
  async function renderUserList(users, page = 1) {
    var userListDiv = document.getElementById('userList');
    
    if (!users || users.length === 0) {
      userListDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">没有找到用户</div>';
      return;
    }

    // 使用Promise.all并行获取所有用户的团队名称
    var userItemsPromises = users.map(async function(user) {
      var userId = user.user_id || user.userId || user.id;
      // 检查是否已选择（从selectedUserIds中检查）
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
             '<span style="color:#ff8a00;">' + escapeHtml(teamDisplay) + '</span> | ' +
             '<span style="color:#a55b00;">' + escapeHtml(roleDisplay) + '</span>' +
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
    console.log('切换用户:', userId);
    
    var index = selectedUserIds.indexOf(userId);
    if (index >= 0) {
      // 取消选择
      selectedUserIds.splice(index, 1);
      // 从allSelectedUsers中移除
      allSelectedUsers = allSelectedUsers.filter(function(user) {
        return (user.user_id || user.userId || user.id) !== userId;
      });
    } else {
      // 选择
      selectedUserIds.push(userId);
      // 添加到allSelectedUsers
      var currentUser = allUsers.find(function(user) {
        return (user.user_id || user.userId || user.id) === userId;
      });
      if (currentUser) {
        allSelectedUsers.push(currentUser);
      }
    }

    // 更新UI - 只更新当前页的用户列表
    var userItem = document.querySelector('.user-item[data-user-id="' + userId + '"]');
    if (userItem) {
      if (selectedUserIds.indexOf(userId) >= 0) {
        userItem.classList.add('selected');
        userItem.querySelector('.user-check').textContent = '✓';
      } else {
        userItem.classList.remove('selected');
        userItem.querySelector('.user-check').textContent = '';
      }
    }
    
    updateSelectedCount();
  };

  // 更新已选择用户数量显示
  function updateSelectedCount() {
    var countElement = document.getElementById('selectedCount');
    if (countElement) {
      countElement.innerHTML = '已选择 <strong style="color:#ff8a00;">' + selectedUserIds.length + '</strong> 人';
    }
  }

  // 更新分页控件
  function updatePagination() {
    var paginationDiv = document.getElementById('userPagination');
    if (!paginationDiv) return;
    
    if (totalPages <= 1) {
      paginationDiv.style.display = 'none';
      return;
    }
    
    paginationDiv.style.display = 'flex';
    
    var pageInfo = document.getElementById('userPageInfo');
    var prevBtn = document.getElementById('userPrevPage');
    var nextBtn = document.getElementById('userNextPage');
    
    if (pageInfo) {
      var displayCount = searchKeyword ? filteredUsers.length : totalUsers;
      pageInfo.textContent = '第 ' + currentPage + ' / ' + totalPages + ' 页 (共 ' + displayCount + ' 人' + (searchKeyword ? '，已过滤' : '') + ')';
    }
    
    if (prevBtn) {
      prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
      nextBtn.disabled = currentPage >= totalPages;
    }
  }

  // 上一页
  window.userPrevPage = async function() {
    if (currentPage > 1) {
      await loadUsers(currentPage - 1);
    }
  };

  // 下一页
  window.userNextPage = async function() {
    if (currentPage < totalPages) {
      await loadUsers(currentPage + 1);
    }
  };

  // ========== 搜索相关函数 ==========
  
  // 搜索用户
  window.searchUsers = async function() {
    var searchInput = document.getElementById('userSearchInput');
    if (!searchInput) return;
    
    searchKeyword = searchInput.value.trim().toLowerCase();
    console.log('搜索关键词:', searchKeyword);
    
    // 重置到第一页
    currentPage = 1;
    
    // 执行搜索和渲染
    await loadUsers(1);
  };

  // 清除搜索
  window.clearSearch = async function() {
    var searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
      searchInput.value = '';
    }
    
    searchKeyword = '';
    
    // 重置到第一页并重新加载
    currentPage = 1;
    await loadUsers(1);
  };

  // 确认用户选择
  window.confirmUserSelection = function() {
    console.log('确认选择的用户:', selectedUserIds);
    
    if (selectedUserIds.length === 0) {
      alert('请至少选择一个用户');
      return;
    }

    // 更新隐藏字段
    setVal('pf_assigneeIds', selectedUserIds.join(','));
    
    // 更新显示 - 使用allSelectedUsers而不是allUsers
    updateSelectedUsersDisplayFromAll();
    
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

  // 更新已选用户的显示（使用allSelectedUsers）
  function updateSelectedUsersDisplayFromAll() {
    var container = document.getElementById('selectedUsers');
    
    if (selectedUserIds.length === 0) {
      container.innerHTML = '<div style="color:#999; font-size:13px; padding:8px;">尚未选择成员</div>';
      return;
    }

    container.innerHTML = selectedUserIds.map(function(userId) {
      var user = allSelectedUsers.find(function(u) {
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
      // 从allSelectedUsers中移除
      allSelectedUsers = allSelectedUsers.filter(function(user) {
        return (user.user_id || user.userId || user.id) !== userId;
      });
      setVal('pf_assigneeIds', selectedUserIds.join(','));
      updateSelectedUsersDisplayFromAll();
      
      // 如果用户在当前页，更新UI
      var userItem = document.querySelector('.user-item[data-user-id="' + userId + '"]');
      if (userItem) {
        userItem.classList.remove('selected');
        userItem.querySelector('.user-check').textContent = '';
      }
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
    console.log('发布任务页面加载完成');

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

    // 搜索框回车事件
    var searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          searchUsers();
        }
      });
    }

    console.log('发布任务页面初始化完成');
  });
})();
