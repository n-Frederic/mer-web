(function(){
  var base = (window.APP && window.APP.apiBase) || '';
  var useApi = !!(window.APP && window.APP.useApi);
  var runtimeUseApi = useApi;
  // === 真实后端 或 模拟数据 ===
  var featureUseApi = {
    // 认证相关
    authLogin: true,              // 登录
    authRegister: true,           // 注册
    authLogout: true,             // 登出
    // 个人资料
    profile: true,                // 个人资料
    // 任务相关（分别控制 列表/详情/创建）
    tasksList: true,              // 真实任务
    taskDetail: true,             // 任务详情
    taskCreate: runtimeUseApi,
    // 统计数据
    stats: runtimeUseApi,         // 统计数据
    // 工作日志
    journal: runtimeUseApi        // 工作日志
  };

  // 重写token处理逻辑，完全匹配后端验证机制
  function getValidToken() {
    try {
      var tokenData = localStorage.getItem('authToken');
      var userData = localStorage.getItem('currentUser');
      
      if (!tokenData || !userData) {
        console.log('无认证信息');
        return null;
      }
      
      var token = JSON.parse(tokenData);
      var user = JSON.parse(userData);
      
      // 检查token基本格式（UUID格式）
      if (!token || typeof token !== 'string' || token.length < 10) {
        console.error('Token格式无效:', token);
        return null;
      }
      
      console.log('验证token:', {
        tokenPreview: token.substring(0, 8) + '...' + token.slice(-8),
        tokenLength: token.length,
        user: user.name || user.email
      });
      
      return token;
      
    } catch(e) {
      console.error('Token获取失败:', e);
      return null;
    }
  }
  
  function authHeader(){
    var token = getValidToken();
    
    if (!token) {
      return {};
    }
    
    return { 'Authorization': 'Bearer ' + token };
  }

  async function http(method, url, body){
    var headers = Object.assign({}, authHeader());
    if(body !== undefined && body !== null) headers['Content-Type'] = 'application/json';
    
    var res = await fetch(url, {
      method: method,
      headers: headers,
      body: body? JSON.stringify(body): undefined,
      cache: 'no-cache'
    });
    
    // 处理认证失败
    if(res.status === 401 || res.status === 403){
      try {
        var errorText = await res.text();
        var errorData = JSON.parse(errorText);
        
        // 清除无效的认证信息
        try{
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
        }catch(e){}
        
        throw new Error(errorData.message || ('HTTP ' + res.status));
      } catch(parseError) {
        // 清除认证信息
        try{
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
        }catch(e){}
        
        throw new Error('HTTP ' + res.status + ' - 认证失败');
      }
    }
    
    // 处理其他HTTP错误状态（包括404）
    if (!res.ok && res.status !== 200 && res.status !== 204) {
      var errorText = '';
      try {
        errorText = await res.text();
        var errorData = JSON.parse(errorText);
        throw new Error(errorData.message || ('HTTP ' + res.status));
      } catch(parseError) {
        if (parseError.message && parseError.message.startsWith('HTTP')) {
          throw parseError;
        }
        throw new Error('HTTP ' + res.status + (errorText ? ': ' + errorText : ''));
      }
    }
    
    if(res.status === 204){
      return { ok: true };
    }
    
    var ct = res.headers.get('content-type') || '';
    if(ct.indexOf('application/json') >= 0){
      try {
        return await res.json();
      } catch (jsonError) {
        console.error('JSON解析错误:', jsonError);
        // 如果JSON解析失败，尝试获取原始文本
        try {
          var text = await res.text();
          console.error('原始响应文本:', text);
          throw new Error('服务器响应格式错误: ' + jsonError.message);
        } catch (textError) {
          throw new Error('服务器响应格式错误: 无法解析响应');
        }
      }
    }
    
    var text = await res.text();
    try{
      return JSON.parse(text);
    }catch(e){
      console.error('JSON解析失败，原始文本:', text);
      return text;
    }
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

  // 重写认证状态检查函数 - 提供详细诊断和后端同步验证
  function checkAuthStatus() {
    console.log('=== 增强认证状态检查 ===');
    
    var token = '';
    var currentUser = null;
    var checkResult = {
      hasToken: false,
      hasUser: false,
      isValid: false,
      token: null,
      user: null,
      issues: []
    };
    
    try {
      var tokenRaw = localStorage.getItem('authToken');
      var userRaw = localStorage.getItem('currentUser');
      
      console.log('localStorage原始数据:', {
        authToken: tokenRaw,
        currentUser: userRaw
      });
      
      // 解析token
      if (tokenRaw) {
        try {
          token = JSON.parse(tokenRaw);
          if (typeof token === 'string' && token.length > 0) {
            checkResult.hasToken = true;
            checkResult.token = token;
            console.log('Token解析成功:', {
              preview: token.substring(0, 8) + '...' + token.slice(-8),
              length: token.length,
              format: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token) ? 'UUID' : 'OTHER'
            });
          } else {
            checkResult.issues.push('Token为空或格式错误');
          }
        } catch(e) {
          checkResult.issues.push('Token解析失败: ' + e.message);
        }
      } else {
        checkResult.issues.push('localStorage中无authToken');
      }
      
      // 解析用户信息
      if (userRaw) {
        try {
          currentUser = JSON.parse(userRaw);
          if (currentUser && (currentUser.name || currentUser.email)) {
            checkResult.hasUser = true;
            checkResult.user = currentUser;
            console.log('用户信息解析成功:', currentUser);
          } else {
            checkResult.issues.push('用户信息不完整');
          }
        } catch(e) {
          checkResult.issues.push('用户信息解析失败: ' + e.message);
        }
      } else {
        checkResult.issues.push('localStorage中无currentUser');
      }
      
    } catch(e) {
      console.error('认证状态检查异常:', e);
      checkResult.issues.push('认证检查异常: ' + e.message);
    }
    
    checkResult.isValid = checkResult.hasToken && checkResult.hasUser && checkResult.issues.length === 0;
    
    console.log('认证状态总结:', {
      hasToken: checkResult.hasToken,
      hasUser: checkResult.hasUser,
      isValid: checkResult.isValid,
      issueCount: checkResult.issues.length
    });
    
    if (checkResult.issues.length > 0) {
      console.warn('发现认证问题:', checkResult.issues);
      console.log('建议操作:');
      console.log('1. 清除认证信息: API.clearAuth()');
      console.log('2. 重新登录: API.testLogin(email, password)');
      console.log('3. 检查后端服务状态');
    }
    
    if (checkResult.isValid) {
      console.log('认证状态有效，可以进行API调用');
    }
    
    return checkResult;
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
        try{ 
          await http('POST', base + '/api/user/logout', {}); 
          console.log('后端登出成功');
        }catch(e){
          console.error('后端登出失败:', e);
        }
      }
      // 清除本地存储
      try{ 
        localStorage.removeItem('authToken'); 
        localStorage.removeItem('currentUser'); 
        console.log('本地token已清除');
      }catch(e){}
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
        console.log('登录原始响应:', res);
        
        // 检查是否是错误响应 - 修复逻辑
        if (res && res.error === true) {
          var errorMsg = res.message || '登录失败';
          if (res.code) {
            errorMsg += ' (' + res.code + ')';
          }
          console.error('登录错误响应:', res);
          throw new Error(errorMsg);
        }
        
        // 后端返回error: false表示成功
        if (res && res.error === false) {
          console.log('后端确认登录成功');
        }
        
        var token = (res && (res.token || res.access_token || (res.data && (res.data.token || res.data.access_token)))) || '';
        var user = (res && (res.user || (res.data && res.data.user))) || {};
        
        console.log('解析后的认证数据:', {
          token: token,
          user: user,
          tokenLength: token ? token.length : 0
        });
        
        // 验证返回数据的完整性
        if (!token) {
          console.error('token为空，原始响应:', res);
          throw new Error('登录失败：服务器未返回有效token');
        }
        if (!user || (!user.name && !user.email)) {
          console.error('用户信息无效，原始响应:', res);
          throw new Error('登录失败：服务器未返回有效用户信息');
        }
        
        // 重写token保存逻辑 - 确保与后端验证机制完全匹配
        console.log('开始保存认证信息...');
        
        // 验证token格式（后端使用UUID格式）
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
          console.warn('Token格式异常，但继续保存:', token);
        }
        
        // 保存原始token字符串（不进行额外处理）
        try { 
          localStorage.setItem('authToken', JSON.stringify(token));
          console.log('Token已保存:', {
            tokenPreview: token.substring(0, 8) + '...' + token.slice(-8),
            tokenLength: token.length,
            savedValue: JSON.stringify(token)
          });
          
          // 立即验证保存是否成功
          var savedToken = JSON.parse(localStorage.getItem('authToken'));
          if (savedToken === token) {
            console.log('Token保存验证通过');
          } else {
            console.error('Token保存验证失败:', {expected: token, actual: savedToken});
          }
          
        } catch(e) { 
          console.error('Token保存失败:', e);
          throw new Error('Token保存失败，登录无效');
        }
        
        // 保存用户信息（先保存基本信息）
        try { 
          localStorage.setItem('currentUser', JSON.stringify(user)); 
          console.log('用户基本信息已保存:', user);
        } catch(e) { 
          console.error('用户信息保存失败:', e);
        }
        
        console.log('登录成功，认证信息已保存:', {
          hasToken: !!token, 
          tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
          user: user 
        });
        

        setTimeout(async function() {
          try {
            console.log('获取完整用户信息...');
            var profileData = await window.API.getProfile();
            var fullUser = profileData.user || profileData || {};
            
            // 合并基本信息和完整信息
            var completeUser = {
              name: fullUser.name || user.name,
              email: fullUser.email || user.email,
              userId: fullUser.id || fullUser.userId || fullUser.user_id,
              id: fullUser.id || fullUser.userId || fullUser.user_id,
              user_id: fullUser.id || fullUser.userId || fullUser.user_id,
              username: fullUser.username,
              phone: fullUser.phone,
              team_id: fullUser.team || fullUser.team_id,
              role_id: fullUser.role_id
            };
            
            localStorage.setItem('currentUser', JSON.stringify(completeUser));
            console.log('完整用户信息已更新:', completeUser);
          } catch(e) {
            console.warn('⚠获取完整用户信息失败，使用基本信息:', e);
          }
          
          var authCheck = checkAuthStatus();
          console.log('登录后认证状态验证:', authCheck);
          if (!authCheck.isValid) {
            console.warn('⚠警告：登录成功但认证状态无效，可能需要检查token有效期');
          }
        }, 500);
        
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

    // User Management
    listUsers: function(params){
      params = params || {};
      var url = base + '/api/user?page=' + (params.page || 1) + '&pageSize=' + (params.pageSize || 10);
      if(params.keyword) url += '&keyword=' + encodeURIComponent(params.keyword);
      if(params.role_id) url += '&role_id=' + params.role_id;
      if(params.team_id) url += '&team_id=' + params.team_id;
      
      return http('GET', url).then(function(res){
        console.log('API listUsers 原始响应:', res);
        console.log('响应类型:', typeof res, '是否为数组:', Array.isArray(res));
        
        // 标准化用户数据函数 - 处理backend返回的原始User实体
        function normalizeUser(user) {
          if (!user) return null;
          
          console.log('原始用户数据:', user);
          
          var normalized = {
            // 统一ID字段：从原始User实体获取user_id（这是@Id字段）
            id: user.user_id || user.id || user.userId,
            userId: user.user_id || user.id || user.userId,
            user_id: user.user_id || user.id || user.userId, // 保持兼容性
            name: user.name,
            email: user.email,
            username: user.username,
            phone: user.phone,
            // 统一角色和团队ID字段 - 从原始实体获取
            teamId: user.team_id || user.teamId,
            team_id: user.team_id || user.teamId,
            roleId: user.role_id || user.roleId,
            role_id: user.role_id || user.roleId,
            gender: user.gender,
            // 统一生日字段名 - 从原始实体获取birth_date字段
            birthday: user.birth_date || user.birthday,
            birth_date: user.birth_date || user.birthday,
            bio: user.bio,
            // 统一时间字段名 - 从原始实体获取
            createdAt: user.created_at || user.createdAt,
            updatedAt: user.updated_at || user.updatedAt,
            lastLogin: user.last_login || user.lastLogin,
            // 保持原始状态字段
            status: user.status
          };
          
          console.log('标准化后用户数据:', normalized);
          return normalized;
        }
        
        // 处理各种可能的返回格式并标准化
        var userList = [];
        if (Array.isArray(res)) {
          userList = res.map(normalizeUser).filter(Boolean);
        } else if (res && Array.isArray(res.data)) {
          userList = res.data.map(normalizeUser).filter(Boolean);
        } else if (res && Array.isArray(res.list)) {
          userList = res.list.map(normalizeUser).filter(Boolean);
        } else if (res && res.users && Array.isArray(res.users)) {
          userList = res.users.map(normalizeUser).filter(Boolean);
        } else if (res && typeof res === 'object') {
          // 如果是对象但不是数组，尝试转换为数组
          var keys = Object.keys(res);
          if (keys.length > 0 && typeof res[keys[0]] === 'object') {
            // 如果对象的属性也是对象，可能是以ID为key的用户对象集合
            userList = keys.map(function(key) { return normalizeUser(res[key]); }).filter(Boolean);
          } else {
            // 单个用户对象
            var normalized = normalizeUser(res);
            userList = normalized ? [normalized] : [];
          }
        } else {
          console.warn('无法识别的用户数据格式:', res);
          userList = [];
        }
        
        console.log('标准化后的用户数据:', userList);
        return userList;
      });
    },

    getUserById: function(userId){
      return http('GET', base + '/api/user/' + userId).then(function(res){
        console.log('getUserById 原始响应:', res);
        
        // 标准化单个用户数据 - 处理backend返回的原始User实体
        function normalizeUser(user) {
          if (!user) return null;
          
          console.log('getUserById - 原始用户数据:', user);
          console.log('team_id字段检查:', {
            'user.team_id': user.team_id,
            'user.teamId': user.teamId,
            'type of team_id': typeof user.team_id,
            'type of teamId': typeof user.teamId
          });
          
          var normalized = {
            // 统一ID字段：从原始User实体获取user_id（这是@Id字段）
            id: user.user_id || user.id || user.userId,
            userId: user.user_id || user.id || user.userId,
            user_id: user.user_id || user.id || user.userId, // 保持兼容性
            name: user.name,
            email: user.email,
            username: user.username,
            phone: user.phone,
            // 统一角色和团队ID字段 - 从原始实体获取
            teamId: user.team_id || user.teamId,
            team_id: user.team_id || user.teamId,
            roleId: user.role_id || user.roleId,
            role_id: user.role_id || user.roleId,
            gender: user.gender,
            // 统一生日字段名 - 从原始实体获取birth_date字段
            birthday: user.birth_date || user.birthday,
            birth_date: user.birth_date || user.birthday,
            bio: user.bio,
            // 统一时间字段名 - 从原始实体获取
            createdAt: user.created_at || user.createdAt,
            updatedAt: user.updated_at || user.updatedAt,
            lastLogin: user.last_login || user.lastLogin,
            // 保持原始状态字段
            status: user.status
          };
          
          console.log('getUserById - 标准化后用户数据:', normalized);
          console.log('标准化后team_id:', {
            teamId: normalized.teamId,
            team_id: normalized.team_id
          });
          return normalized;
        }
        
        var normalized = normalizeUser(res);
        console.log('标准化后的用户数据:', normalized);
        return normalized || {};
      });
    },

    createUser: function(userData){
      console.log('发送创建用户请求:', userData);
      console.log('请求URL:', base + '/api/user');
      
      return http('POST', base + '/api/user', userData).then(function(res){
        console.log('创建用户响应:', res);
        if(res && res.ok){
          return res;
        }
        // 构建详细的错误信息
        var errorMsg = '创建用户失败';
        if (res && res.message) {
          errorMsg += ': ' + res.message;
        } else if (res && res.error) {
          errorMsg += ': ' + res.error;
        }
        throw new Error(errorMsg);
      }).catch(function(error) {
        console.error('创建用户API调用失败:', error);
        // 如果是HTTP错误，尝试提供更多信息
        if (error.message && error.message.includes('HTTP')) {
          throw new Error('创建用户失败: 服务器错误 (' + error.message + ')');
        }
        throw error;
      });
    },

    updateUser: function(userId, userData){
      console.log('发送更新用户请求:', {userId: userId, data: userData});
      console.log('请求URL:', base + '/api/user/' + userId);
      
      return http('PUT', base + '/api/user/' + userId, userData).then(function(res){
        console.log('更新用户响应:', res);
        if(res && res.ok){
          return res;
        }
        // 构建详细的错误信息
        var errorMsg = '更新用户失败';
        if (res && res.message) {
          errorMsg += ': ' + res.message;
        } else if (res && res.error) {
          errorMsg += ': ' + res.error;
        }
        throw new Error(errorMsg);
      }).catch(function(error) {
        console.error('更新用户API调用失败:', error);
        // 如果是HTTP错误，尝试提供更多信息
        if (error.message && error.message.includes('HTTP')) {
          throw new Error('更新用户失败: 服务器错误 (' + error.message + ')');
        }
        throw error;
      });
    },

    // Profile
    getProfile: function(){
      // === 切换点：个人资料（真实/模拟） ===
      if(!featureUseApi.profile){ return Promise.resolve(JSON.parse(localStorage.getItem('profile')||'{}')); }
      return http('GET', base + '/api/user/profile').then(function(res){
        console.log('获取个人资料原始响应:', res);
        
        // 提取用户数据
        var user = (res && res.user) || res || {};
        var profile = user;
        
        // 标准化个人资料数据字段名
        if (profile) {

          console.log('原始profile.team:', profile.team);
          console.log('原始profile.team_id:', profile.team_id);
          console.log('原始profile.role_id:', profile.role_id);
          
          return {
            // 统一ID字段
            id: profile.id || profile.userId || profile.user_id,
            userId: profile.id || profile.userId || profile.user_id,
            user_id: profile.id || profile.userId || profile.user_id,
            name: profile.name,
            email: profile.email,
            username: profile.username,
            phone: profile.phone,
            team: profile.team || profile.team_id || profile.teamId,
            teamId: profile.team || profile.team_id || profile.teamId,
            team_id: profile.team || profile.team_id || profile.teamId,
            roleId: profile.role_id || profile.roleId,
            role_id: profile.role_id || profile.roleId,
            gender: profile.gender,
            // 统一生日字段名
            birthday: profile.birthday || profile.birth_date,
            birth_date: profile.birthday || profile.birth_date,
            bio: profile.bio,
            // 统一时间字段名
            createdAt: profile.createdAt || profile.created_at,
            updatedAt: profile.updatedAt || profile.updated_at,
            lastLogin: profile.lastLogin || profile.last_login
          };
        }
        return profile;
      });
    },
    updateProfile: function(pf){
      // === 切换点：个人资料更新（真实/模拟） ===
      if(!featureUseApi.profile){ try{ localStorage.setItem('profile', JSON.stringify(pf)); }catch(e){} return Promise.resolve({ ok:true }); }
      return http('PUT', base + '/api/user/profile', pf).then(function(res){ 
        console.log('个人资料更新成功:', res);
        return res || { ok:true }; 
      });
    },

    // Tasks - 获取任务列表（支持真正的后端分页）
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
      
      // 使用真实后端API - 单页请求（真正的后端分页）
      var page = (params && params.page) || 1;
      var pageSize = (params && params.pageSize) || 10;
      
      var queryParams = {
        page: page,
        pageSize: pageSize,
        status: params && params.status,
        priority: params && params.priority
      };
      
        var usp = new URLSearchParams();
      Object.keys(queryParams).forEach(function(k){
        var v = queryParams[k];
          if(v === undefined || v === null || v === '') return;
        usp.append(k, v);
      });
      
      console.log('listTasks - 请求第' + page + '页，每页' + pageSize + '条');
      var res = await http('GET', base + '/api/tasks/all?' + usp.toString());
      
      if (!res || !res.list) {
        return { total: 0, list: [], page: page, pageSize: pageSize };
      }
      
      // 标准化任务数据字段名 - 处理backend返回的原始Task实体
      var normalizedList = (res.list || []).map(function(task) {
        // 处理creator信息 - 从Task实体中获取
        var creatorInfo = null;
        var creatorId = null;
        
        if (task.creator) {
          // 如果有creator对象
          creatorInfo = {
            id: task.creator.id || task.creator.user_id,
            userId: task.creator.id || task.creator.user_id,
            name: task.creator.name,
            email: task.creator.email
          };
          creatorId = task.creator.id || task.creator.user_id;
        }
        
        var normalized = {

          id: task.task_id || task.taskId || task.id,
          taskId: task.task_id || task.taskId || task.id,
          title: task.title,
          description: task.description,
          // 处理creator字段
          creatorId: creatorId,
          creator: creatorInfo,
          priority: task.priority,
          status: task.status,
          // 统一时间字段名 - 从原始实体获取
          startAt: task.start_at || task.startAt,
          dueAt: task.due_at || task.dueAt,
          createdAt: task.created_at || task.createdAt,
          updatedAt: task.updated_at || task.updatedAt
        };
        
        return normalized;
      });
      
      console.log('获取到第' + page + '页' + normalizedList.length + '条任务，总共' + (res.total || 0) + '条');
      
      return { 
        total: res.total || 0, 
        list: normalizedList,
        page: res.page || page,
        pageSize: res.pageSize || pageSize,
        totalPages: res.totalPages || Math.ceil((res.total || 0) / pageSize)
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
      if(userId) usp.append('userId', userId);
      if(params && typeof params === 'object'){
        Object.keys(params).forEach(function(k){
          var v = params[k];
          if(v !== undefined && v !== null && v !== '') {
            usp.append(k, v);
          }
        });
      }
      
      var res = await http('GET', base + '/api/tasks/personal?' + usp.toString());

      var normalizedList = (res.list || []).map(function(task) {
        console.log('原始个人任务数据:', task);
        
        // 处理creator信息
        var creatorInfo = null;
        var creatorId = null;
        
        if (task.creator) {
          // 如果有creator对象
          creatorInfo = {
            id: task.creator.id || task.creator.userId || task.creator.user_id,
            userId: task.creator.id || task.creator.userId || task.creator.user_id,
            name: task.creator.name,
            email: task.creator.email
          };
          creatorId = task.creator.id || task.creator.userId || task.creator.user_id;
        } else if (task.creatorId) {
          creatorId = task.creatorId;
        }
        
        var normalized = {
          // getPersonalTasks已经返回camelCase格式的taskId
          id: task.taskId || task.task_id || task.id,
          taskId: task.taskId || task.task_id || task.id,
          title: task.title,
          description: task.description,
          // 处理creator字段
          creatorId: creatorId,
          creator: creatorInfo,
          priority: task.priority,
          status: task.status,
          // getPersonalTasks已经返回camelCase格式的时间字段
          startAt: task.startAt || task.start_at,
          dueAt: task.dueAt || task.due_at,
          createdAt: task.createdAt || task.created_at,
          updatedAt: task.updatedAt || task.updated_at
        };
        
        console.log('标准化后个人任务数据:', normalized);
        return normalized;
      });
      
      return { 
        total: res.total || 0, 
        list: normalizedList,
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
          // 标准化任务详情数据
          var task = res.task;
          return {
            // 统一ID字段：优先taskId，fallback到task_id
            id: task.taskId || task.task_id || task.id,
            taskId: task.taskId || task.task_id || task.id,
            title: task.title,
            description: task.description,
            // 处理creator字段 - 标准化creator信息
            creatorId: task.creatorId || (task.creator ? (task.creator.userId || task.creator.id) : null),
            creator: task.creator ? {
              id: task.creator.userId || task.creator.id,
              userId: task.creator.userId || task.creator.id,  
              name: task.creator.name,
              email: task.creator.email
            } : null,
            priority: task.priority,
            status: task.status,
            // 统一时间字段名
            startAt: task.startAt || task.start_at,
            dueAt: task.dueAt || task.due_at,
            createdAt: task.createdAt || task.created_at,
            updatedAt: task.updatedAt || task.updated_at
          };
        } else if (res && res.task) {
          // 没有ok字段但有task数据的情况
          var task = res.task;
          return {
            id: task.taskId || task.task_id || task.id,
            taskId: task.taskId || task.task_id || task.id,
            title: task.title,
            description: task.description,
            creatorId: task.creatorId || (task.creator ? (task.creator.userId || task.creator.id) : null),
            creator: task.creator,
            priority: task.priority,
            status: task.status,
            startAt: task.startAt || task.start_at,
            dueAt: task.dueAt || task.due_at,
            createdAt: task.createdAt || task.created_at,
            updatedAt: task.updatedAt || task.updated_at
          };
        } else if (res && !res.error && res.ok !== false) {
          // 如果没有明确的错误标志，尝试直接处理res作为task数据
          return {
            id: res.taskId || res.task_id || res.id,
            taskId: res.taskId || res.task_id || res.id,
            title: res.title,
            description: res.description,
            creatorId: res.creatorId || (res.creator ? (res.creator.userId || res.creator.id) : null),
            creator: res.creator,
            priority: res.priority,
            status: res.status,
            startAt: res.startAt || res.start_at,
            dueAt: res.dueAt || res.due_at,
            createdAt: res.createdAt || res.created_at,
            updatedAt: res.updatedAt || res.updated_at
          };
        }
        return null;
      }).catch(function(error) {
        // API调用失败时返回null
        console.error('获取任务详情失败:', error);
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

    // 获取公司重要事项
    getImportantTasks: function() {
      return http('GET', base + '/api/company-tasks/important').then(function(res) {
        console.log('获取公司重要事项响应:', res);
        if (res && res.tasks) {
          return res.tasks;
        }
        return [];
      }).catch(function(error) {
        console.error('获取公司重要事项失败:', error);
        return [];
      });
    },

    // 更新公司十大重要事项
    updateImportantTasks: function(tasks) {
      console.log('更新公司十大重要事项:', tasks);
      
      // 数据验证
      if (!Array.isArray(tasks)) {
        return Promise.reject(new Error('任务列表必须是数组'));
      }
      
      if (tasks.length !== 10) {
        return Promise.reject(new Error('必须提供10个重要事项'));
      }
      
      // 验证每个任务都不为空
      for (var i = 0; i < tasks.length; i++) {
        if (!tasks[i] || typeof tasks[i] !== 'string' || tasks[i].trim() === '') {
          return Promise.reject(new Error('第' + (i + 1) + '个事项不能为空'));
        }
      }
      
      // 确保使用正确的API路径
      var url = base + '/api/company-tasks';
      console.log('发送PUT请求到:', url);
      
      return http('PUT', url, { tasks: tasks }).then(function(res) {
        console.log('公司重要事项更新成功:', res);
        return res;
      }).catch(function(error) {
        console.error('更新公司重要事项失败:', error);
        throw error;
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
      return http('POST', base + '/api/forgot-password/reset', { 
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
        
        // 标准化用户数据函数 - 处理backend返回的原始User实体
        function normalizeUser(user) {
          if (!user) return null;
          
          console.log('原始用户数据:', user);
          
          var normalized = {
            // 统一ID字段：从原始User实体获取user_id（这是@Id字段）
            id: user.user_id || user.id || user.userId,
            userId: user.user_id || user.id || user.userId,
            user_id: user.user_id || user.id || user.userId, // 保持兼容性
            name: user.name,
            email: user.email,
            username: user.username,
            phone: user.phone,
            // 统一角色和团队ID字段 - 从原始实体获取
            teamId: user.team_id || user.teamId,
            team_id: user.team_id || user.teamId,
            roleId: user.role_id || user.roleId,
            role_id: user.role_id || user.roleId,
            gender: user.gender,
            // 统一生日字段名 - 从原始实体获取birth_date字段
            birthday: user.birth_date || user.birthday,
            birth_date: user.birth_date || user.birthday,
            bio: user.bio,
            // 统一时间字段名 - 从原始实体获取
            createdAt: user.created_at || user.createdAt,
            updatedAt: user.updated_at || user.updatedAt,
            lastLogin: user.last_login || user.lastLogin,
            // 保持原始状态字段
            status: user.status
          };
          
          console.log('标准化后用户数据:', normalized);
          return normalized;
        }
        
        // 根据实际后端响应格式：直接返回用户数组
        if (Array.isArray(res)) {
          var normalizedUsers = res.map(normalizeUser).filter(Boolean);
          return {
            list: normalizedUsers,
            total: normalizedUsers.length,
            page: params.page || 1,
            pageSize: params.pageSize || 10,
            totalPages: Math.ceil(normalizedUsers.length / (params.pageSize || 10))
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
        
        // 标准化单个用户数据 - 处理backend返回的原始User实体
        function normalizeUser(user) {
          if (!user) return null;
          
          console.log('原始用户数据:', user);
          
          var normalized = {
            // 统一ID字段：从原始User实体获取user_id（这是@Id字段）
            id: user.user_id || user.id || user.userId,
            userId: user.user_id || user.id || user.userId,
            user_id: user.user_id || user.id || user.userId, // 保持兼容性
            name: user.name,
            email: user.email,
            username: user.username,
            phone: user.phone,
            // 统一角色和团队ID字段 - 从原始实体获取
            teamId: user.team_id || user.teamId,
            team_id: user.team_id || user.teamId,
            roleId: user.role_id || user.roleId,
            role_id: user.role_id || user.roleId,
            gender: user.gender,
            // 统一生日字段名 - 从原始实体获取birth_date字段
            birthday: user.birth_date || user.birthday,
            birth_date: user.birth_date || user.birthday,
            bio: user.bio,
            // 统一时间字段名 - 从原始实体获取
            createdAt: user.created_at || user.createdAt,  
            updatedAt: user.updated_at || user.updatedAt,
            lastLogin: user.last_login || user.lastLogin,
            // 保持原始状态字段
            status: user.status
          };
          
          console.log('标准化后用户数据:', normalized);
          return normalized;
        }
        
        // 根据实际后端响应格式：直接返回用户对象
        if (res && (res.user_id || res.id || res.name)) {
          var normalized = normalizeUser(res);
          console.log('标准化后的用户详情:', normalized);
          return normalized;
        }
        return null;
      }).catch(function(error) {
        console.error('获取用户详情失败:', error);
        return null;
      });
    },

    // === 调试和认证相关方法 ===
    
    // 检查认证状态
    checkAuth: function() {
      return checkAuthStatus();
    },
    
    // 测试登录功能
    testLogin: function(username, password) {
      if (!username) username = 'test@example.com';
      if (!password) password = 'password123';
      
      console.log('测试登录，用户名:', username);
      
      return this.login({
        username: username,
        password: password
      }).then(function(result) {
        console.log('测试登录成功:', result);
        
        // 登录成功后立即测试API调用
        setTimeout(function() {
          console.log('测试登录后的API调用...');
          
          // 测试用户API
          window.API.listUsers({page: 1, pageSize: 1}).then(function(users) {
            console.log('登录后API调用成功:', users);
          }).catch(function(error) {
            console.error('登录后API调用仍然失败:', error);
            console.log('建议检查：');
            console.log('1. 数据库中token的valid_to是否大于current_timestamp');
            console.log('2. 后端AuthInterceptor的token验证逻辑');
            console.log('3. 是否存在时区问题导致token立即过期');
          });
          
          // 测试任务API
          window.API.listTasks().then(function(tasks) {
            console.log('任务API调用成功:', tasks);
          }).catch(function(error) {
            console.error('任务API调用失败:', error);
          });
          
        }, 500);
        
        return result;
      }).catch(function(error) {
        console.error('测试登录失败:', error);
        return null;
      });
    },
    
    // 清除认证信息
    clearAuth: function() {
      try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        console.log('认证信息已清除');
      } catch(e) {
        console.error('清除认证信息失败:', e);
      }
    },
    
    // 手动设置认证信息（用于调试）
    setAuth: function(token, user) {
      try {
        if (token) {
          localStorage.setItem('authToken', JSON.stringify(token));
          console.log('已设置token:', token);
        }
        if (user) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          console.log('已设置用户信息:', user);
        }
      } catch(e) {
        console.error('设置认证信息失败:', e);
      }
    },
    
    // 获取当前用户完整信息（含userId）
    getCurrentUserWithId: async function() {
      try {
        var userData = localStorage.getItem('currentUser');
        if (!userData) {
          return null;
        }
        
        var user = JSON.parse(userData);
        
        // 如果已经有userId，直接返回
        if (user.userId || user.id || user.user_id) {
          return user;
        }
        
        // 如果没有userId，从API获取完整信息
        console.log('⚠currentUser缺少userId，从API获取完整信息...');
        var profileData = await this.getProfile();
        var fullUser = profileData.user || profileData || {};
        
        // 合并并保存
        var completeUser = {
          name: fullUser.name || user.name,
          email: fullUser.email || user.email,
          userId: fullUser.id || fullUser.userId || fullUser.user_id,
          id: fullUser.id || fullUser.userId || fullUser.user_id,
          user_id: fullUser.id || fullUser.userId || fullUser.user_id,
          username: fullUser.username,
          phone: fullUser.phone,
          team_id: fullUser.team || fullUser.team_id,
          role_id: fullUser.role_id
        };
        
        localStorage.setItem('currentUser', JSON.stringify(completeUser));
        console.log('完整用户信息已更新:', completeUser);
        
        return completeUser;
      } catch(e) {
        console.error('获取当前用户信息失败:', e);
        return null;
      }
    },

    // ==================== 个人日志相关API ====================
    
    // 获取个人日志列表
    getJournals: function(params) {
      params = params || {};
      var url = base + '/api/journals/';
      var queryParams = [];

      // 注意：不要传递date参数，让后端查询所有日期的日志
      // if (params.date) queryParams.push('date=' + encodeURIComponent(params.date));
      if (params.page) queryParams.push('page=' + params.page);
      if (params.pageSize) queryParams.push('pageSize=' + params.pageSize);

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      console.log('获取个人日志列表:', url);

      return http('GET', url).then(function(res) {
        console.log('日志列表API响应:', res);

        // 处理新API格式：{ code: 200, message: "success", data: { list: [...], total, page, pageSize, hasNext } }
        var data = res.data || res;
        var rawList = data.list || res.list || res || [];
        
        // 标准化日志数据 - 匹配新API字段
        var list = rawList.map(function(log) {
          // 处理作者信息
          var authorInfo = log.author_info || log.authorInfo || {};
          var authorName = authorInfo.name || log.authorName || log.author_name || '未知';
          var authorEmail = authorInfo.email || log.authorEmail || log.author_email || '';
          var authorId = authorInfo.id || authorInfo.user_id || log.authorId || log.author_id || '';
          
          // 处理关联任务
          var relatedTasks = log.related_tasks || log.relatedTasks || [];
          
          // 处理关键词
          var keywords = log.keywords || [];
          
          // 构建标题：编号-作者-日期格式
          var logId = log.log_id || log.id || log.logId || 'LOG-' + Date.now();
          var titleDate = log.log_date || '';
          var title = logId + '-' + authorName + '-' + titleDate;
          
          // 构建内容（合并todaySummary和tomorrowPlan）
          var content = '';
          if (log.todaySummary) {
            content += '今日总结：\n' + log.todaySummary;
          }
          if (log.tomorrowPlan) {
            if (content) content += '\n\n';
            content += '明日计划：\n' + log.tomorrowPlan;
          }
          if (log.helpNeeded) {
            if (content) content += '\n\n';
            content += '需要帮助：\n' + log.helpNeeded;
          }
          
          return {
            id: log.log_id || log.id || log.logId,
            log_id: log.log_id || log.id || log.logId,
            title: title,
            date: log.log_date || log.date,
            log_date: log.log_date || log.date,
            // 新字段
            todaySummary: log.todaySummary || '',
            tomorrowPlan: log.tomorrowPlan || '',
            helpNeeded: log.helpNeeded || null,
            // 作者信息
            authorId: authorId,
            authorName: authorName,
            authorEmail: authorEmail,
            author_info: authorInfo,
            // 关联任务和关键词
            related_tasks: relatedTasks,
            keywords: keywords,
            // 内容（合并后的）
            content: content || log.content || '',
            summary: log.todaySummary || log.summary || '',
            // 时间字段
            createdAt: log.created_at || log.createdAt,
            updatedAt: log.updated_at || log.updatedAt,
            status: log.status
          };
        });

        return {
          list: list,
          total: data.total || res.total || list.length,
          page: data.page || res.page || params.page || 1,
          pageSize: data.pageSize || res.pageSize || params.pageSize || 9,
          hasNext: data.hasNext || res.hasNext || false
        };
      }).catch(function(error) {
        console.error('获取日志列表失败:', error);
        throw error;
      });
    },

    // 创建日志（匹配新接口格式）
    createJournal: function(journalData) {
      // 构建符合新API接口要求的数据
      var postData = {
        todaySummary: journalData.todaySummary || journalData.content || journalData.summary || '',
        tomorrowPlan: journalData.tomorrowPlan || '',
        helpNeeded: journalData.helpNeeded || null,
        log_date: journalData.log_date || journalData.logDate || journalData.date || new Date().toISOString().split('T')[0],
        taskId: Array.isArray(journalData.taskId) ? journalData.taskId : (journalData.taskId ? [String(journalData.taskId)] : [])
      };
      
      return http('POST', base + '/api/journals/', postData).then(function(res) {
        return res;
      }).catch(function(error) {
        throw error;
      });
    },

    // 获取单个日志详情
    getJournal: function(journalId) {
      var url = base + '/api/journals/' + encodeURIComponent(journalId);
      console.log('获取日志详情:', url);
      
      return http('GET', url).then(function(res) {
        console.log('日志详情:', res);
        return res;
      }).catch(function(error) {
        console.error('获取日志详情失败:', error);
        throw error;
      });
    },

    // 更新日志
    updateJournal: function(journalId, journalData) {
      console.log('更新日志:', journalId, journalData);
      return http('PUT', base + '/api/journals/' + encodeURIComponent(journalId), journalData).then(function(res) {
        console.log('日志更新成功:', res);
        return res;
      }).catch(function(error) {
        console.error('更新日志失败:', error);
        throw error;
      });
    },

    // 删除日志（匹配新接口格式）
    deleteJournal: function(journalId) {
      return http('DELETE', base + '/api/journals/' + encodeURIComponent(journalId)).then(function(res) {
        if (res && res.ok) {
          return res;
        }
        return { ok: true };
      }).catch(function(error) {
        throw error;
      });
    },

    // ==================== 团队管理相关API ====================
    
    // 获取团队名称
    getTeamName: function(teamId) {
      console.log('getTeamName调用，参数:', {
        teamId: teamId,
        type: typeof teamId,
        value: teamId
      });
      
      if (!teamId || teamId === 'undefined' || teamId === 'null') {
        console.warn('无效的teamId:', teamId);
        return Promise.resolve('未分配');
      }
      
      var url = base + '/api/team/' + encodeURIComponent(teamId);
      console.log('请求URL:', url);
      
      return http('GET', url).then(function(res) {
        console.log('团队API原始响应:', res);
        if (res && res.ok && res.team_name) {
          console.log('返回团队名称:', res.team_name);
          return res.team_name;
        }
        console.warn('API返回数据格式不正确:', res);
        return '未知团队';
      }).catch(function(error) {
        console.error('获取团队名称失败:', error);
        return '未知团队';
      });
    },

    // 批量获取团队名称（优化性能，缓存团队信息）
    teamNameCache: {},
    
    getTeamNameCached: function(teamId) {
      var self = this;
      // 如果已缓存，直接返回
      if (self.teamNameCache[teamId]) {
        return Promise.resolve(self.teamNameCache[teamId]);
      }
      
      // 否则调用API并缓存结果
      return self.getTeamName(teamId).then(function(teamName) {
        self.teamNameCache[teamId] = teamName;
        return teamName;
      });
    },

    // 清除团队缓存
    clearTeamCache: function() {
      this.teamNameCache = {};
    },

    // 获取团队所属部门名称
    departmentNameCache: {},
    
    getDepartmentName: function(teamId) {
      if (!teamId || teamId === 'undefined' || teamId === 'null' || teamId === 'NaN') {
        return Promise.resolve('未知部门');
      }
      
      var teamIdStr = String(teamId).trim();
      if (!teamIdStr || teamIdStr === 'undefined' || teamIdStr === 'null') {
        return Promise.resolve('未知部门');
      }
      
      var url = base + '/api/team/department/' + teamIdStr;
      
      return http('GET', url).then(function(res) {
        if (res && res.ok && res.department_name) {
          return res.department_name;
        }
        if (res && res.department_name) {
          return res.department_name;
        }
        return '未知部门';
      }).catch(function(error) {
        if (error.message && error.message.includes('404')) {
          return '未知部门';
        }
        return '未知部门';
      });
    },

    // 缓存版本的部门查询
    getDepartmentNameCached: function(teamId) {
      var self = this;
      if (self.departmentNameCache[teamId]) {
        return Promise.resolve(self.departmentNameCache[teamId]);
      }
      
      return self.getDepartmentName(teamId).then(function(deptName) {
        self.departmentNameCache[teamId] = deptName;
        return deptName;
      });
    },

    // ==================== 任务管理相关API ====================
    
    // 创建任务
    createTask: function(taskData) {
      console.log('创建任务，数据:', taskData);
      
      // 数据验证
      if (!taskData.title || !taskData.title.trim()) {
        return Promise.reject(new Error('任务标题不能为空'));
      }
      if (!taskData.description || !taskData.description.trim()) {
        return Promise.reject(new Error('任务描述不能为空'));
      }
      if (!taskData.dueAt) {
        return Promise.reject(new Error('截止时间不能为空'));
      }
      if (!taskData.priority) {
        return Promise.reject(new Error('优先级不能为空'));
      }
      if (!taskData.assigneeIds || taskData.assigneeIds.length === 0) {
        return Promise.reject(new Error('至少需要指派一个成员'));
      }
      
      return http('POST', base + '/api/tasks', taskData).then(function(res) {
        console.log('任务创建成功:', res);
        return res;
      }).catch(function(error) {
        console.error('创建任务失败:', error);
        throw error;
      });
    },

    // 获取个人任务列表
    getPersonalTasks: function(page, pageSize, status, priority) {
      var url = base + '/api/tasks/personal?page=' + (page || 1) + '&pageSize=' + (pageSize || 10);
      if (status) url += '&status=' + encodeURIComponent(status);
      if (priority) url += '&priority=' + encodeURIComponent(priority);
      
      console.log('获取个人任务列表:', url);
      
      return http('GET', url).then(function(res) {
        console.log('个人任务列表:', res);
        return res;
      }).catch(function(error) {
        console.error('获取个人任务失败:', error);
        throw error;
      });
    },

    // 获取可见任务列表（个人权限内）
    getViewTasks: function(page, pageSize, status, priority) {
      var url = base + '/api/tasks/myView?page=' + (page || 1) + '&pageSize=' + (pageSize || 10);
      if (status) url += '&status=' + encodeURIComponent(status);
      if (priority) url += '&priority=' + encodeURIComponent(priority);
      
      console.log('取可见任务列表:', url);
      
      return http('GET', url).then(function(res) {
        console.log('可见任务列表:', res);
        return res;
      }).catch(function(error) {
        console.error('获取可见任务失败:', error);
        throw error;
      });
    },

    // ==================== 评论相关API ====================
    
    // 创建评论
    createComment: function(commentData) {
      console.log('创建评论:', commentData);
      
      // 数据验证
      if (!commentData.ownerType || !commentData.ownerId || !commentData.content) {
        return Promise.reject(new Error('评论数据不完整'));
      }
      
      if (commentData.ownerType !== 'task' && commentData.ownerType !== 'log') {
        return Promise.reject(new Error('ownerType必须是task或log'));
      }
      
      // 使用正确的API路径：前端代理控制器会转发到后端
      var url = base + '/api/comments';
      var requestData = {
        ownerType: commentData.ownerType,
        ownerId: commentData.ownerId,
        content: commentData.content.trim()
      };
      
      return http('POST', url, requestData).then(function(res) {
        console.log('评论创建成功:', res);
        if (res && (res.code === 201 || res.code === 200)) {
          return res;
        }
        return res || { code: 201, message: '评论创建成功' };
      }).catch(function(error) {
        console.error('创建评论失败:', error);
        if (error.message && error.message.includes('400')) {
          throw new Error('评论创建失败');
        }
        throw error;
      });
    },
    
    // 获取评论列表
    getComments: function(ownerType, ownerId, page, pageSize) {
      console.log('获取评论列表:', { ownerType: ownerType, ownerId: ownerId, page: page, pageSize: pageSize });
      
      if (!ownerType || !ownerId) {
        return Promise.reject(new Error('ownerType和ownerId不能为空'));
      }
      
      // 使用正确的API路径：前端代理控制器会转发到后端
      var url = base + '/api/comments?ownerType=' + encodeURIComponent(ownerType) +
                '&ownerId=' + encodeURIComponent(ownerId) +
                '&page=' + (page || 1) +
                '&pageSize=' + (pageSize || 10);
      
      return http('GET', url).then(function(res) {
        console.log('评论列表获取成功:', res);
        
        // 标准化返回数据
        var list = res.list || [];
        var total = res.total || 0;
        
        return {
          list: list,
          total: total,
          page: res.page || page || 1,
          pageSize: res.pageSize || pageSize || 10
        };
      }).catch(function(error) {
        console.error('获取评论列表失败:', error);
        // 如果是404，说明还没有评论，返回空列表而不是抛出错误
        if (error.message && error.message.includes('404')) {
          console.log('暂无评论（404），返回空列表');
          return {
            list: [],
            total: 0,
            page: page || 1,
            pageSize: pageSize || 10
          };
        }
        throw error;
      });
    },
    
    // 删除评论
    deleteComment: function(commentId, userId) {
      console.log('删除评论:', { commentId: commentId, userId: userId });
      
      if (!commentId) {
        return Promise.reject(new Error('commentId不能为空'));
      }

      
      // 确保userId有正确的前缀
      var formattedUserId = userId;
      if (userId && typeof userId === 'string' && !userId.includes('U-')) {
        // 如果没有U-前缀，添加它
        formattedUserId = 'U-' + userId;
      }
      
      // 确保commentId有正确的前缀
      var formattedCommentId = commentId;
      if (commentId && typeof commentId === 'string' && !commentId.includes('C-')) {
        formattedCommentId = 'C-' + commentId;
      }
      
      // 使用正确的API路径：前端代理控制器会转发到后端
      var url = base + '/api/comments/' + encodeURIComponent(formattedCommentId);
      if (formattedUserId) {
        url += '?userId=' + encodeURIComponent(formattedUserId);
      }
      
      console.log('删除评论请求URL:', url);
      console.log('发送的ID格式:', {
        originalCommentId: commentId,
        formattedCommentId: formattedCommentId,
        originalUserId: userId,
        formattedUserId: formattedUserId
      });
      
      return http('DELETE', url).then(function(res) {
        console.log('评论删除响应:', res);
        // 检查后端返回的响应格式
        if (res && res.code === 200) {
          // 成功删除
          return res;
        } else if (res && res.code === 403) {
          // 权限不足
          throw new Error(res.message || '无权删除此评论');
        } else if (res && res.code === 404) {
          // 评论不存在
          throw new Error(res.message || '评论不存在或已被删除');
        } else {
          // 其他情况，如果有message字段，使用它
          if (res && res.message) {
            if (res.message.includes('成功')) {
              return res;
            } else {
              throw new Error(res.message);
            }
          }
          // 默认情况，认为成功
          return res || { code: 200, message: '评论删除成功' };
        }
      }).catch(function(error) {
        console.error('删除评论失败:', error);
        // 提供更详细的错误信息
        if (error.message) {
          if (error.message.includes('403') || error.message.includes('FORBIDDEN') || error.message.includes('无权删除')) {
            throw new Error('您没有权限删除此评论');
          } else if (error.message.includes('404') || error.message.includes('NOT_FOUND') || error.message.includes('不存在')) {
            throw new Error('评论不存在或已被删除');
          } else if (error.message.includes('400') || error.message.includes('BAD_REQUEST')) {
            throw new Error('请求参数错误');
          }
        }
        throw error;
      });
    },
    
    // ==================== 任务进度和信息更新API ====================
    
    // 更新任务进度
    updateTaskProgress: function(taskId, userId, progressPct) {
      console.log('更新任务进度:', { taskId: taskId, userId: userId, progressPct: progressPct });
      
      // 数据验证
      if (!taskId) {
        return Promise.reject(new Error('任务ID不能为空'));
      }
      if (!userId) {
        return Promise.reject(new Error('用户ID不能为空'));
      }
      if (progressPct < 0 || progressPct > 100) {
        return Promise.reject(new Error('进度百分比必须在0-100之间'));
      }
      

      var numericTaskId = String(taskId).replace('T-', '').replace(/[^0-9]/g, '');
      console.log('任务ID转换: ' + taskId + ' → ' + numericTaskId);
      
      var url = base + '/api/tasks/' + numericTaskId + '/progress';
      console.log('更新进度请求URL:', url);

      var requestData = {
        userId: String(userId),
        progressPct: parseInt(progressPct, 10)
      };
      
      console.log('更新进度请求数据:', requestData);
      
      return http('PUT', url, requestData).then(function(res) {
        console.log('任务进度更新成功:', res);
        if (res && res.code === 200) {
          return res;
        }
        // 如果没有明确的成功标志，但也没有错误，认为成功
        return res || { code: 200, message: '任务进度更新成功' };
      }).catch(function(error) {
        console.error('更新任务进度失败:', error);
        // 根据错误信息提供更友好的提示
        if (error.message && error.message.includes('400')) {
          throw new Error('进度数据格式错误，无法修改');
        } else if (error.message && error.message.includes('404')) {
          throw new Error('用户没有权限更新该任务的进度');
        } else if (error.message && error.message.includes('403')) {
          throw new Error('您没有权限更新该任务的进度，权限不足');
        }
        throw error;
      });
    },
    
    // 更新任务完整信息
    updateTaskInfo: function(taskId, taskData) {
      console.log('更新任务信息:', { taskId: taskId, data: taskData });
      
      // 数据验证
      if (!taskId) {
        return Promise.reject(new Error('任务ID不能为空'));
      }
      if (!taskData || typeof taskData !== 'object') {
        return Promise.reject(new Error('任务数据不能为空'));
      }

      var numericTaskId = String(taskId).replace('T-', '').replace(/[^0-9]/g, '');
      console.log('任务ID转换: ' + taskId + ' → ' + numericTaskId);
      
      var url = base + '/api/tasks/' + numericTaskId;
      console.log('📡 更新任务信息请求URL:', url);
      
      // 构建符合接口要求的请求数据
      var requestData = {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        status: taskData.status,
        startAt: taskData.startAt,
        dueAt: taskData.dueAt,
        parentTask: taskData.parentTask || null,
        tags: taskData.tags || []
      };
      
      return http('PUT', url, requestData).then(function(res) {
        console.log('任务信息更新成功:', res);
        if (res && res.code === 200) {
          return res;
        }
        // 如果没有明确的成功标志，但也没有错误，认为成功
        return res || { code: 200, message: '任务更新成功' };
      }).catch(function(error) {
        console.error('更新任务信息失败:', error);

        if (error.message && error.message.includes('404')) {
          throw new Error('更新任务信息失败');
        } else if (error.message && error.message.includes('403')) {
          throw new Error('您没有权限更新该任务的信息，权限不足');
        }
        throw error;
      });
    }
  };
})();


