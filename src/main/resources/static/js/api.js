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
    authLogout: true,             // 登出 - 强制启用真实API
    // 个人资料
    profile: true,                // 个人资料 - 强制启用真实API
    // 任务相关（分别控制 列表/详情/创建）
    tasksList: true,              // 强制启用真实任务API
    taskDetail: true,             // 强制启用真实任务详情API
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
        console.log('🔒 无认证信息');
        return null;
      }
      
      var token = JSON.parse(tokenData);
      var user = JSON.parse(userData);
      
      // 检查token基本格式（UUID格式）
      if (!token || typeof token !== 'string' || token.length < 10) {
        console.error('❌ Token格式无效:', token);
        return null;
      }
      
      console.log('🔍 验证token:', {
        tokenPreview: token.substring(0, 8) + '...' + token.slice(-8),
        tokenLength: token.length,
        user: user.name || user.email
      });
      
      return token;
      
    } catch(e) {
      console.error('❌ Token获取失败:', e);
      return null;
    }
  }
  
  function authHeader(){
    var token = getValidToken();
    
    if (!token) {
      console.log('🚫 无有效token，跳过认证头');
      return {};
    }
    
    var headers = { 'Authorization': 'Bearer ' + token };
    console.log('✅ 设置认证头:', {
      'Authorization': 'Bearer ' + token.substring(0, 8) + '...' + token.slice(-8)
    });
    
    return headers;
  }

  async function http(method, url, body){
    console.log('🌐 HTTP请求:', method, url);
    
    var headers = Object.assign({}, authHeader());
    if(body !== undefined && body !== null) headers['Content-Type'] = 'application/json';
    
    console.log('📤 请求详情:', {
      method: method,
      url: url,
      hasAuth: !!headers.Authorization,
      authPreview: headers.Authorization ? headers.Authorization.substring(0, 20) + '...' : 'none'
    });
    
    var res = await fetch(url, { 
      method: method, 
      headers: headers, 
      body: body? JSON.stringify(body): undefined, 
      cache: 'no-cache' 
    });
    
    console.log('📥 响应状态:', res.status, res.statusText);
    
    // 处理认证失败 - 只处理真正的401/403错误
    if(res.status === 401 || res.status === 403){
      console.error('🚫 认证失败 (HTTP ' + res.status + ')');
      
      // 尝试获取详细错误信息
      try {
        var errorText = await res.text();
        var errorData = JSON.parse(errorText);
        console.error('🔍 认证错误详情:', errorData);
        
        // 根据错误类型处理
        if (errorData.error === 'TOKEN_MISSING') {
          console.error('❌ 后端未收到token，检查Authorization头设置');
        } else if (errorData.error === 'INVALID_TOKEN') {
          console.error('❌ token无效，可能已被删除或格式错误');
        } else if (errorData.error === 'TOKEN_EXPIRED') {
          console.error('❌ token已过期，需要重新登录');
        }
        
        // 清除无效的认证信息
        try{ 
          localStorage.removeItem('authToken'); 
          localStorage.removeItem('currentUser'); 
          console.log('🧹 已清除无效的认证信息');
        }catch(e){}
        
        // 抛出具体错误信息
        throw new Error(errorData.message || ('HTTP ' + res.status));
        
      } catch(parseError) {
        // 如果无法解析错误响应，抛出通用错误
        console.error('❌ 无法解析认证错误响应:', parseError);
        
        // 清除认证信息
        try{ 
          localStorage.removeItem('authToken'); 
          localStorage.removeItem('currentUser'); 
        }catch(e){}
        
        throw new Error('HTTP ' + res.status + ' - 认证失败');
      }
    }
    
    // 处理其他HTTP错误状态
    if (!res.ok && res.status !== 200) {
      console.error('❌ HTTP请求失败:', res.status, res.statusText);
      var errorText = await res.text();
      try {
        var errorData = JSON.parse(errorText);
        console.error('🔍 错误详情:', errorData);
        throw new Error(errorData.message || ('HTTP ' + res.status));
      } catch(e) {
        throw new Error('HTTP ' + res.status + ': ' + errorText);
      }
    }
    
    if(res.status === 204){
      return { ok: true };
    }
    
    var ct = res.headers.get('content-type') || '';
    if(ct.indexOf('application/json') >= 0){
      var jsonData = await res.json();
      console.log('📋 JSON响应:', jsonData);
      return jsonData;
    }
    
    var text = await res.text();
    console.log('📄 文本响应:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    
    try{ 
      return JSON.parse(text); 
    }catch(e){ 
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
    console.log('🔍 === 增强认证状态检查 ===');
    
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
      
      console.log('📦 localStorage原始数据:', {
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
            console.log('✅ Token解析成功:', {
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
            console.log('✅ 用户信息解析成功:', currentUser);
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
      console.error('❌ 认证状态检查异常:', e);
      checkResult.issues.push('认证检查异常: ' + e.message);
    }
    
    checkResult.isValid = checkResult.hasToken && checkResult.hasUser && checkResult.issues.length === 0;
    
    console.log('📊 认证状态总结:', {
      hasToken: checkResult.hasToken,
      hasUser: checkResult.hasUser,
      isValid: checkResult.isValid,
      issueCount: checkResult.issues.length
    });
    
    if (checkResult.issues.length > 0) {
      console.warn('⚠️ 发现认证问题:', checkResult.issues);
      console.log('💡 建议操作:');
      console.log('1. 清除认证信息: API.clearAuth()');
      console.log('2. 重新登录: API.testLogin(email, password)');
      console.log('3. 检查后端服务状态');
    }
    
    if (checkResult.isValid) {
      console.log('🎉 认证状态有效，可以进行API调用');
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
          console.log('✅ 后端登出成功');
        }catch(e){
          console.error('❌ 后端登出失败:', e);
        }
      }
      // 清除本地存储
      try{ 
        localStorage.removeItem('authToken'); 
        localStorage.removeItem('currentUser'); 
        console.log('✅ 本地token已清除');
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
          console.log('✅ 后端确认登录成功');
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
        console.log('💾 开始保存认证信息...');
        
        // 验证token格式（后端使用UUID格式）
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
          console.warn('⚠️ Token格式异常，但继续保存:', token);
        }
        
        // 保存原始token字符串（不进行额外处理）
        try { 
          localStorage.setItem('authToken', JSON.stringify(token));
          console.log('✅ Token已保存:', {
            tokenPreview: token.substring(0, 8) + '...' + token.slice(-8),
            tokenLength: token.length,
            savedValue: JSON.stringify(token)
          });
          
          // 立即验证保存是否成功
          var savedToken = JSON.parse(localStorage.getItem('authToken'));
          if (savedToken === token) {
            console.log('✅ Token保存验证通过');
          } else {
            console.error('❌ Token保存验证失败:', {expected: token, actual: savedToken});
          }
          
        } catch(e) { 
          console.error('❌ Token保存失败:', e);
          throw new Error('Token保存失败，登录无效');
        }
        
        // 保存用户信息
        try { 
          localStorage.setItem('currentUser', JSON.stringify(user)); 
          console.log('✅ 用户信息已保存:', user);
        } catch(e) { 
          console.error('❌ 用户信息保存失败:', e);
        }
        
        console.log('🎉 登录成功，认证信息已保存:', { 
          hasToken: !!token, 
          tokenPreview: token ? token.substring(0, 20) + '...' : 'null',
          user: user 
        });
        
        // 立即验证保存的认证信息
        setTimeout(function() {
          var authCheck = checkAuthStatus();
          console.log('登录后认证状态验证:', authCheck);
          if (!authCheck.isValid) {
            console.warn('⚠️ 警告：登录成功但认证状态无效，可能需要检查token有效期');
          }
        }, 100);
        
        return { token: token, user: user };
      }).catch(function(error) {
        // 统一错误处理
        console.error('❌ 登录API调用失败:', error);
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
          return {
            // 统一ID字段
            id: profile.id || profile.userId || profile.user_id,
            userId: profile.id || profile.userId || profile.user_id,
            user_id: profile.id || profile.userId || profile.user_id,
            name: profile.name,
            email: profile.email,
            username: profile.username,
            phone: profile.phone,
            // 统一角色和团队ID字段
            teamId: profile.team_id || profile.teamId,
            team_id: profile.team_id || profile.teamId,
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
      
      // 标准化任务数据字段名 - 处理backend返回的原始Task实体
      var normalizedList = (res.list || []).map(function(task) {
        console.log('原始任务数据:', task);
        
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
          // 统一ID字段：从原始Task实体获取task_id
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
        
        console.log('标准化后任务数据:', normalized);
        return normalized;
      });
      
      return { 
        total: res.total || 0, 
        list: normalizedList,
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
      
      // 标准化个人任务数据字段名 - getPersonalTasks使用wrapResponse2已转换数据
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
          console.log('🧪 测试登录后的API调用...');
          
          // 测试用户API
          window.API.listUsers({page: 1, pageSize: 1}).then(function(users) {
            console.log('✅ 登录后API调用成功:', users);
          }).catch(function(error) {
            console.error('❌ 登录后API调用仍然失败:', error);
            console.log('🔍 建议检查：');
            console.log('1. 数据库中token的valid_to是否大于current_timestamp');
            console.log('2. 后端AuthInterceptor的token验证逻辑');
            console.log('3. 是否存在时区问题导致token立即过期');
          });
          
          // 测试任务API
          window.API.listTasks().then(function(tasks) {
            console.log('✅ 任务API调用成功:', tasks);
          }).catch(function(error) {
            console.error('❌ 任务API调用失败:', error);
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
    }
  };
})();


