(function(){
  var base = (window.APP && window.APP.apiBase) || '';
  var useApi = !!(window.APP && window.APP.useApi);
  var runtimeUseApi = useApi;
  // === 全局/细粒度开关：可分别控制每个功能使用 真实后端 或 模拟数据 ===
  // 说明：
  // - 全局开关由 runtimeUseApi 控制；
  // - 细粒度开关默认继承全局开关，可通过 API.setFeatureMode / API.setModes 单独覆盖；
  var featureUseApi = {
    // 认证相关
    authLogin: true,              // 登录 - 强制启用真实API
    authRegister: true,           // 注册 - 强制启用真实API（包括找回密码功能）
    authLogout: runtimeUseApi,    // 登出
    // 个人资料
    profile: runtimeUseApi,
    // 任务相关（分别控制 列表/详情/创建）
    tasksList: true,              // 强制启用真实任务API
    taskDetail: true,             // 强制启用真实任务详情API
    taskCreate: runtimeUseApi,
    // 统计数据
    stats: runtimeUseApi,         // 统计数据
    // 工作日志
    journal: runtimeUseApi        // 工作日志
  };

  function authHeader(){
    var token = '';
    try{ var raw=localStorage.getItem('authToken'); if(raw) token=JSON.parse(raw); }catch(e){}
    return token? { 'Authorization': 'Bearer ' + token } : {};
  }

  async function http(method, url, body){
    var headers = Object.assign({}, authHeader());
    if(body !== undefined && body !== null) headers['Content-Type'] = 'application/json';
    var res = await fetch(url, { method: method, headers: headers, body: body? JSON.stringify(body): undefined, cache: 'no-cache' });
    if(res.status === 401 || res.status === 403){
      try{ localStorage.removeItem('authToken'); localStorage.removeItem('currentUser'); }catch(e){}
      try{ if(!/login\.html$/i.test(location.pathname)) location.href = 'login.html'; }catch(e){}
      throw new Error('HTTP ' + res.status);
    }
    if(res.status === 204){
      return { ok: true };
    }
    var ct = res.headers.get('content-type') || '';
    if(ct.indexOf('application/json') >= 0){
      return await res.json();
    }
    var text = await res.text();
    try{ return JSON.parse(text); }catch(e){ return text; }
  }

  // 生成员工编号
  function generateEmployeeId() {
    var date = new Date();
    var year = date.getFullYear().toString().slice(-2);
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    return 'EMP' + year + month + randomNum;
  }

  // Mock loaders
  async function loadTasksFromStatic(){
    var urls=['/data/tasks.json','data/tasks.json','./data/tasks.json'];
    for (var i=0;i<urls.length;i++){
      try{
        var r = await fetch(urls[i], { cache:'no-cache' });
        if(r.ok) return await r.json();
      }catch(e){}
    }
    try{ return JSON.parse(document.getElementById('mockTasks')?.textContent || '[]'); }catch(e){ return []; }
  }
  function mergeLocalTasks(list){
    var local=[]; try{ local=JSON.parse(localStorage.getItem('publishedTasks')||'[]'); }catch(e){ local=[]; }
    if(Array.isArray(local)&&local.length){
      var map={}; list.forEach(function(t){ map[t.id]=t; }); local.forEach(function(t){ map[t.id]=t; });
      list = Object.keys(map).map(function(k){ return map[k]; });
    }
    return list;
  }

  // API facade
  window.API = {
    // runtime mode switch
    setMode: function(flag){ runtimeUseApi = !!flag; return runtimeUseApi; },
    getMode: function(){ return runtimeUseApi; },
    // === 细粒度开关：设置/获取单个功能的真实/模拟模式 ===
    setFeatureMode: function(key, flag){ if(key in featureUseApi){ featureUseApi[key] = !!flag; } return featureUseApi[key]; },
    getFeatureMode: function(key){ return featureUseApi[key]; },
    // 批量设置：例如 API.setModes({ tasksList:true, taskDetail:false })
    setModes: function(map){ if(map && typeof map==='object'){ Object.keys(map).forEach(function(k){ if(k in featureUseApi) featureUseApi[k] = !!map[k]; }); } return featureUseApi; },
    // Logout
    logout: async function(){
      // === 切换点：登出（真实/模拟） ===
      if(featureUseApi.authLogout){
        try{ await http('POST', base + '/api/logout/', {}); }catch(e){}
      }
      try{ localStorage.removeItem('authToken'); localStorage.removeItem('currentUser'); }catch(e){}
      return { ok: true };
    },
    // Auth
    login: function(payload){
      // === 切换点：登录（真实/模拟） ===
      if(!featureUseApi.authLogin){
        var name = payload.username || '用户';
        var email = payload.username && payload.username.includes('@')? payload.username : '';
        var employeeId = generateEmployeeId();
        var token = 'mock-' + Date.now();
        var user = { name:name, email:email, employeeId:employeeId };
        try{ localStorage.setItem('authToken', JSON.stringify(token)); localStorage.setItem('currentUser', JSON.stringify(user)); }catch(e){}
        return Promise.resolve({ token: token, user: user });
      }
      // 调试信息：检查URL构建
      var loginUrl = base + '/api/login';
      console.log('登录API调用详情:', {
        'base': base,
        'loginUrl': loginUrl,
        'payload': payload
      });
      
      return http('POST', loginUrl, payload).then(function(res){
        // 检查是否是错误响应
        if (res && res.error) {
          var errorMsg = res.message || '登录失败';
          if (res.code) {
            errorMsg += ' (' + res.code + ')';
          }
          throw new Error(errorMsg);
        }
        
        var token = (res && (res.token || res.access_token || (res.data && (res.data.token || res.data.access_token)))) || '';
        var user = (res && (res.user || (res.data && res.data.user))) || {};
        
        // 验证返回数据的完整性
        if (!token) {
          throw new Error('登录失败：服务器未返回有效token');
        }
        if (!user || (!user.name && !user.email)) {
          throw new Error('登录失败：服务器未返回有效用户信息');
        }
        
        // 保存认证信息
        if(token){ try{ localStorage.setItem('authToken', JSON.stringify(token)); }catch(e){} }
        if(user && (user.name || user.email)){ try{ localStorage.setItem('currentUser', JSON.stringify(user)); }catch(e){} }
        
        console.log('登录成功，已保存认证信息:', { 
          hasToken: !!token, 
          user: user 
        });
        
        return { token: token, user: user };
      }).catch(function(error) {
        // 统一错误处理
        console.error('登录API调用失败:', error);
        throw error;
      });
    },
    // Register
    register: function(payload){
      // === 切换点：注册（真实/模拟） ===
      if(!featureUseApi.authRegister){
        var employeeId = generateEmployeeId();
        var user = { 
          id: 'mockU-' + Date.now(), 
          name: payload.name || payload.username || '新用户', 
          email: payload.email || '',
          employeeId: employeeId
        };
        return Promise.resolve({ ok:true, user: user });
      }
      return http('POST', base + '/api/register/', payload).then(function(res){
        var ok = !!(res && (res.ok || (res.data && res.data.ok)));
        var user = (res && (res.user || (res.data && res.data.user))) || {};
        return { ok: ok || true, user: user };
      });
    },

    // Profile
    getProfile: function(){
      // === 切换点：个人资料（真实/模拟） ===
      if(!featureUseApi.profile){ return Promise.resolve(JSON.parse(localStorage.getItem('profile')||'{}')); }
      return http('GET', base + '/api/profile/').then(function(res){
        return (res && (res.profile || (res.data && res.data.profile))) || res || {};
      });
    },
    updateProfile: function(pf){
      // === 切换点：个人资料更新（真实/模拟） ===
      if(!featureUseApi.profile){ try{ localStorage.setItem('profile', JSON.stringify(pf)); }catch(e){} return Promise.resolve({ ok:true }); }
      return http('PUT', base + '/api/profile/', pf).then(function(){ return { ok:true }; });
    },

    // Tasks
    listTasks: async function(params){
      // === 切换点：任务列表（真实/模拟） ===
      if(!featureUseApi.tasksList){
        var data = await loadTasksFromStatic();
        data = mergeLocalTasks(data);
        // stable sort by createdAt desc then id desc
        try{
          data.sort(function(a,b){
            var ad = new Date(a.createdAt||a.createTime||0).getTime();
            var bd = new Date(b.createdAt||b.createTime||0).getTime();
            if(ad !== bd) return bd - ad;
            return String(b.id).localeCompare(String(a.id));
          });
        }catch(e){}
        return { total: data.length, list: data };
      }
      // 使用真实后端API - 获取所有任务
      var q = '';
      if(params && typeof params === 'object'){
        var usp = new URLSearchParams();
        Object.keys(params).forEach(function(k){
          var v = params[k];
          if(v === undefined || v === null || v === '') return;
          if(Array.isArray(v)) v.forEach(function(it){ usp.append(k, it); });
          else usp.append(k, v);
        });
        var s = usp.toString();
        if(s) q = '?' + s;
      }
      var res = await http('GET', base + '/api/tasks/all' + q);
      return { 
        total: res.total || 0, 
        list: res.list || [],
        page: res.page || 1,
        pageSize: res.pageSize || 10
      };
    },

    // 获取个人任务
    getPersonalTasks: async function(userId, params){
      if(!featureUseApi.tasksList){
        // 模拟数据
        var data = await loadTasksFromStatic();
        data = mergeLocalTasks(data);
        return { total: data.length, list: data };
      }
      
      var usp = new URLSearchParams();
      usp.append('userId', userId);
      if(params && typeof params === 'object'){
        Object.keys(params).forEach(function(k){
          var v = params[k];
          if(v !== undefined && v !== null && v !== '') {
            usp.append(k, v);
          }
        });
      }
      
      var res = await http('GET', base + '/api/tasks/personal?' + usp.toString());
      return { 
        total: res.total || 0, 
        list: res.list || [],
        page: res.page || 1,
        pageSize: res.pageSize || 10
      };
    },
    getTask: async function(id){
      // === 切换点：任务详情（真实/模拟） ===
      if(!featureUseApi.taskDetail){
        var data = await loadTasksFromStatic();
        data = mergeLocalTasks(data);
        var sid = String(id);
        return data.find(function(t){ return String(t.id)===sid; }) || null;
      }
      return http('GET', base + '/api/tasks/' + encodeURIComponent(id)).then(function(res){
        // 检查响应是否表示成功且包含任务数据
        if (res && res.ok && res.task) {
          return res;
        } else if (res && res.task) {
          return res;
        } else if (res && !res.error && !res.ok === false) {
          // 如果没有明确的错误标志，尝试返回数据
          return res;
        }
        return null;
      }).catch(function(error) {
        // API调用失败时返回null
        return null;
      });
    },
    createTask: function(task){
      // === 切换点：任务创建（真实/模拟） ===
      if(!featureUseApi.taskCreate){
        var list=[]; try{ list=JSON.parse(localStorage.getItem('publishedTasks')||'[]'); }catch(e){ list=[]; }
        var idx=list.findIndex(function(t){ return t.id===task.id; });
        if(idx>=0) list[idx]=task; else list.unshift(task);
        try{ localStorage.setItem('publishedTasks', JSON.stringify(list)); }catch(e){}
        return Promise.resolve({ id: task.id });
      }
      return http('POST', base + '/api/tasks/', task).then(function(res){
        var id = (res && (res.id || res.taskId || (res.data && (res.data.id || res.data.taskId)))) || (task && task.id);
        return { id: id };
      });
    },

    // 統計數據接口
    getStats: async function(){
      // === 切换点：统计数据（真实/模拟） ===
      if(!featureUseApi.stats){
        // 模拟统计：从任务列表计算
        var tasksResp = await this.listTasks();
        var tasks = tasksResp.list || [];
        var total = tasks.length;
        var completed = tasks.filter(function(t){ return t.progress >= 100; }).length;
        var inProgress = tasks.filter(function(t){ return t.progress > 0 && t.progress < 100; }).length;
        var pending = tasks.filter(function(t){ return t.progress === 0; }).length;
        var recentTasks = tasks.slice(0, 5).map(function(t){
          return {
            id: t.id,
            name: t.name,
            progress: t.progress,
            dueDate: t.endDate,
            owner: t.owner
          };
        });
        
        return Promise.resolve({
          totalTasks: total,
          completedTasks: completed,
          inProgressTasks: inProgress,
          pendingTasks: pending,
          recentTasks: recentTasks
        });
      }
      
      return http('GET', base + '/api/dashboard/stats').then(function(res){
        return (res && (res.stats || (res.data && res.data.stats))) || res || {};
      });
    },

    // 工作日誌接口
    getJournalEntries: function(){
      // === 切换点：工作日志（真实/模拟） ===
      if(!featureUseApi.journal){
        try{ 
          var entries = JSON.parse(localStorage.getItem('journalEntries')||'[]');
          return Promise.resolve({ entries: entries });
        }catch(e){ 
          return Promise.resolve({ entries: [] }); 
        }
      }
      return http('GET', base + '/api/journal-entries/').then(function(res){
        return (res && (res.entries || (res.data && res.data.entries))) || { entries: res || [] };
      });
    },

    createJournalEntry: function(entry){
      // === 切换点：创建日志（真实/模拟） ===
      if(!featureUseApi.journal){
        var list=[]; 
        try{ list=JSON.parse(localStorage.getItem('journalEntries')||'[]'); }catch(e){ list=[]; }
        var newEntry = Object.assign({}, entry, { 
          id: 'entry-' + Date.now(), 
          ts: Date.now(),
          createdAt: new Date().toISOString()
        });
        list.unshift(newEntry);
        try{ localStorage.setItem('journalEntries', JSON.stringify(list)); }catch(e){}
        return Promise.resolve({ id: newEntry.id, ok: true });
      }
      return http('POST', base + '/api/journals/', entry).then(function(res){
        var id = (res && (res.id || (res.data && res.data.id))) || ('entry-' + Date.now());
        return { id: id, ok: true };
      });
    },

    // 更新日志条目
    updateJournalEntry: function(entryId, updatedEntry){
      // === 切换点：更新日志（真实/模拟） ===
      if(!featureUseApi.journal){
        var list=[]; 
        try{ list=JSON.parse(localStorage.getItem('journalEntries')||'[]'); }catch(e){ list=[]; }
        var index = list.findIndex(function(e){ return e.id === entryId; });
        if(index > -1){
          var originalEntry = list[index];
          var now = new Date().toISOString();
          
          // 记录修改历史（简化版，只记录最新修改时间）
          // 在真实API中，后端会维护完整的修改历史
          var modifiedEntry = Object.assign({}, originalEntry, updatedEntry, {
            updatedAt: now,
            // 如果是首次修改，确保有创建时间
            createdAt: originalEntry.createdAt || originalEntry.ts || now
          });
          
          // 更新本地存储
          list[index] = modifiedEntry;
          try{ localStorage.setItem('journalEntries', JSON.stringify(list)); }catch(e){}
          return Promise.resolve({ ok: true });
        }
        return Promise.reject(new Error('日志条目不存在'));
      }
      return http('PUT', base + '/api/journals/' + encodeURIComponent(entryId) + '/', updatedEntry).then(function(res){
        return { ok: true };
      });
    },

    // 删除日志条目
    deleteJournalEntry: function(entryId){
      // === 切换点：删除日志（真实/模拟） ===
      if(!featureUseApi.journal){
        var list=[]; 
        try{ list=JSON.parse(localStorage.getItem('journalEntries')||'[]'); }catch(e){ list=[]; }
        var index = list.findIndex(function(e){ return e.id === entryId; });
        if(index > -1){
          list.splice(index, 1);
          try{ localStorage.setItem('journalEntries', JSON.stringify(list)); }catch(e){}
          return Promise.resolve({ ok: true });
        }
        return Promise.reject(new Error('日志条目不存在'));
      }
      return http('DELETE', base + '/api/journals/' + encodeURIComponent(entryId) + '/').then(function(res){
        return { ok: true };
      });
    },

    // 忘记密码相关API
    // 发送找回密码验证码（复用注册验证码接口）
    sendForgotPasswordCode: function(email){
      // === 切换点：发送找回密码验证码（真实/模拟） ===
      if(!featureUseApi.authRegister){ // 复用注册的开关
        // 模拟发送验证码
        return Promise.resolve({ 
          ok: true, 
          message: "验证码已发送到您的邮箱" 
        });
      }
      // 复用现有的验证码发送接口
      return http('POST', base + '/api/send-verification-code/', { email: email }).then(function(res){
        // 检查响应是否表示错误
        if (res.error || !res.ok) {
          throw new Error(res.message || '发送验证码失败');
        }
        return { 
          ok: res.ok || true, 
          message: res.message || "验证码已发送" 
        };
      }).catch(function(error) {
        // 统一错误处理
        throw new Error(error.message || '网络错误，请稍后重试');
      });
    },

    // 获取日志修改历史记录
    getJournalHistory: function(entryId){
      // === 切换点：获取日志历史（真实/模拟） ===
      if(!featureUseApi.journal){ 
        // 这里会被dashboard.html中的getMockJournalHistory函数处理
        return Promise.resolve([]);
      }
      return http('GET', base + '/api/journals/' + encodeURIComponent(entryId) + '/history/').then(function(res){
        return res.history || [];
      });
    },

    // 验证找回密码验证码并重置密码
    resetPassword: function(email, verificationCode, newPassword){
      // === 切换点：重置密码（真实/模拟） ===
      if(!featureUseApi.authRegister){ // 复用注册的开关
        // 模拟重置密码
        return Promise.resolve({ 
          ok: true, 
          message: "密码重置成功" 
        });
      }
      return http('POST', base + '/api/forgot-password/reset/', { 
        email: email, 
        verificationCode: verificationCode, 
        newPassword: newPassword 
      }).then(function(res){
        return { 
          ok: res.ok || true, 
          message: res.message || "密码重置成功" 
        };
      });
    },

    // 用户管理相关API
    // 获取用户列表
    getUsers: function(params) {
      params = params || {};
      var url = base + '/api/user';
      var queryParams = [];
      
      if (params.page) queryParams.push('page=' + params.page);
      if (params.pageSize) queryParams.push('pageSize=' + params.pageSize);
      if (params.keyword) queryParams.push('keyword=' + encodeURIComponent(params.keyword));
      if (params.role_id) queryParams.push('role_id=' + params.role_id);
      if (params.team_id) queryParams.push('team_id=' + params.team_id);
      
      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }
      
      console.log('获取用户列表API调用:', url);
      
      return http('GET', url).then(function(res) {
        console.log('用户列表API响应:', res);
        
        // 根据实际后端响应格式：直接返回用户数组
        if (Array.isArray(res)) {
          return {
            list: res,
            total: res.length,
            page: params.page || 1,
            pageSize: params.pageSize || 10,
            totalPages: Math.ceil(res.length / (params.pageSize || 10))
          };
        }
        
        // 如果不是数组，返回空结果
        return {
          list: [],
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0
        };
      }).catch(function(error) {
        console.error('获取用户列表失败:', error);
        throw error;
      });
    },

    // 获取单个用户详情
    getUser: function(userId) {
      var url = base + '/api/user/' + encodeURIComponent(userId);
      console.log('获取用户详情API调用:', url, 'userId:', userId);
      
      return http('GET', url).then(function(res) {
        console.log('用户详情API响应:', res);
        
        // 根据实际后端响应格式：直接返回用户对象
        if (res && (res.user_id || res.id || res.name)) {
          return res;
        }
        return null;
      }).catch(function(error) {
        console.error('获取用户详情失败:', error);
        return null;
      });
    }
  };
})();


