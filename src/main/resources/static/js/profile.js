// Profile page helpers (fill, save, reset, chips)
(function(){
    // 根据出生日期自动计算年龄
    function calculateAge(birthDateStr) {
        if(!birthDateStr) return null;
        try {
            var birth = new Date(birthDateStr);
            var today = new Date();
            var age = today.getFullYear() - birth.getFullYear();
            var monthDiff = today.getMonth() - birth.getMonth();
            if(monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            return age >= 0 ? age : null;
        } catch(e) {
            return null;
        }
    }
    
    function fill(){
        var currentUser={name:'用户',email:'',employeeId:''};
        try{ var raw=localStorage.getItem('currentUser'); if(raw) currentUser=JSON.parse(raw);}catch(e){}
        var pf={}; try{pf=JSON.parse(localStorage.getItem('profile')||'{}');}catch(e){}
        
        // 优先使用profile数据，其次使用currentUser数据
        var name = pf.name || currentUser.name || '用户';
        var username = pf.username || currentUser.username || '用户名';
        var email = pf.email || currentUser.email || '';
        var employeeId = pf.employeeId || pf.employee_id || currentUser.employeeId || '';
        var company = pf.company || pf.team || '';
        
        // 更新头像下方的显示元素（显示username，不是name）
        document.getElementById('p_username')&&(document.getElementById('p_username').textContent=username);
        document.getElementById('p_employeeId')&&(document.getElementById('p_employeeId').textContent=employeeId);
        document.getElementById('p_email')&&(document.getElementById('p_email').textContent=email);
        document.getElementById('p_company')&&(document.getElementById('p_company').textContent=company || '无');
        
        // 更新顶部导航栏的用户名（显示name）
        var topUserName = document.getElementById('currentUserName');
        if(topUserName) topUserName.textContent = name;
        
        // 填充表单输入字段
        document.getElementById('pf_name')&&(document.getElementById('pf_name').value=name);
        document.getElementById('pf_email')&&(document.getElementById('pf_email').value=email);
        document.getElementById('pf_phone')&&(document.getElementById('pf_phone').value=pf.phone||'');
        document.getElementById('pf_gender')&&(document.getElementById('pf_gender').value=pf.gender||'');
        
        // 处理出生日期
        var birthDate = pf.birth || pf.birthday || pf.birth_date || '';
        if(birthDate && birthDate.includes('T')) {
            birthDate = birthDate.split('T')[0]; // 提取YYYY-MM-DD部分
        }
        document.getElementById('pf_birth')&&(document.getElementById('pf_birth').value=birthDate);
        
        // 自动计算并填充年龄
        var calculatedAge = calculateAge(pf.birthday || pf.birth_date || pf.birth);
        document.getElementById('pf_age')&&(document.getElementById('pf_age').value=calculatedAge !== null ? calculatedAge : '');
        
        // 填充所属团队字段（从缓存读取，如果有的话）
        var teamField = document.getElementById('pf_team');
        if(teamField && pf.teamName) {
            teamField.value = pf.teamName;
        }
        
        // 填充担任职位字段（从缓存读取，如果有的话）
        var roleField = document.getElementById('pf_role');
        if(roleField && pf.roleName) {
            roleField.value = pf.roleName;
        }
        
        document.getElementById('pf_bio')&&(document.getElementById('pf_bio').value=pf.bio||'');
        
        syncChips();
    }
    
    function save(){
        // 从表单获取数据（不包含只读字段team和role）
        var formData = {
            name:(document.getElementById('pf_name')?.value||'').trim(),
            email:(document.getElementById('pf_email')?.value||'').trim(),
            phone:(document.getElementById('pf_phone')?.value||'').trim(),
            gender:(document.getElementById('pf_gender')?.value||''),
            birth:(document.getElementById('pf_birth')?.value||''),
            age:(document.getElementById('pf_age')?.value||''),
            bio:(document.getElementById('pf_bio')?.value||'').trim()
        };
        
        // 从缓存的profile数据中获取username、team_id、role_id等不可编辑字段
        var cachedProfile = {};
        try { 
            cachedProfile = JSON.parse(localStorage.getItem('profile') || '{}'); 
        } catch(e) {
            console.error('读取缓存profile失败:', e);
        }
        
        // 构建符合接口要求的数据
        var updateData = {
            name: formData.name,
            username: cachedProfile.username || cachedProfile.name || formData.name, // username是必填的
            email: formData.email,
            phone: formData.phone || null,
            gender: formData.gender === '男' ? 'M' : (formData.gender === '女' ? 'F' : (formData.gender || 'M')), // 转换为M/F
            birth_date: formData.birth || null,
            bio: formData.bio || null,
            team_id: cachedProfile.team_id || cachedProfile.teamId || 1, // 默认团队ID为1
            role_id: cachedProfile.role_id || cachedProfile.roleId || 4  // 默认角色ID为4（普通成员）
        };
        
        console.log('准备更新个人资料:', updateData);
        
        // 验证必填字段
        if (!updateData.name || !updateData.email) {
            alert('姓名和邮箱不能为空！');
            return;
        }
        
        // 调用真实API
        if (window.API && typeof window.API.updateProfile === 'function') {
            console.log('🔄 调用API更新个人资料...');
            window.API.updateProfile(updateData)
                .then(function(response) {
                    console.log('✅ 个人资料更新成功:', response);
                    
                    // 更新localStorage缓存（保留团队和角色的显示名称）
                    var updatedProfile = Object.assign({}, cachedProfile, formData, {
                        gender: updateData.gender,
                        birth_date: updateData.birth_date,
                        team_id: updateData.team_id,
                        role_id: updateData.role_id,
                        teamName: cachedProfile.teamName,  // 保留团队名称
                        roleName: cachedProfile.roleName   // 保留角色名称
                    });
                    try { 
                        localStorage.setItem('profile', JSON.stringify(updatedProfile)); 
                    } catch(e) {
                        console.error('保存profile到localStorage失败:', e);
                    }
                    
                    // 更新currentUser
                    var currentUser;
                    try { 
                        currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}'); 
                    } catch(e) { 
                        currentUser = {}; 
                    }
                    currentUser.name = formData.name;
                    currentUser.email = formData.email;
                    try { 
                        localStorage.setItem('currentUser', JSON.stringify(currentUser)); 
                    } catch(e) {
                        console.error('保存currentUser失败:', e);
                    }
                    
                    // 更新页面显示
                    var top = document.getElementById('currentUserName');
                    if(top) top.textContent = formData.name;
                    
                    var pe = document.getElementById('p_email');
                    if(pe) pe.textContent = formData.email || '';
                    
                    // p_company已经显示团队名称，不需要更新
                    
                    syncChips();
                    
                    alert('个人信息更新成功！');
                })
                .catch(function(error) {
                    console.error('❌ 更新个人资料失败:', error);
                    alert('更新失败：' + (error.message || '网络错误，请稍后重试'));
                });
        } else {
            // 降级：仅保存到localStorage
            console.warn('⚠️ API不可用，仅保存到本地');
            try { 
                localStorage.setItem('profile', JSON.stringify(formData)); 
            } catch(e) {
                console.error('保存到localStorage失败:', e);
            }
            
            // 更新currentUser
            var currentUser;
            try { 
                currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}'); 
            } catch(e) { 
                currentUser = {}; 
            }
            if (formData.name) {
                currentUser.name = formData.name;
                currentUser.email = formData.email;
                try { 
                    localStorage.setItem('currentUser', JSON.stringify(currentUser)); 
                } catch(e) {}
                
                // 更新页面显示
                var top = document.getElementById('currentUserName');
                if(top) top.textContent = formData.name;
            }
            var pe = document.getElementById('p_email');
            if(pe) pe.textContent = formData.email || '';
            
            // p_company已经显示团队名称，不需要更新
            
            syncChips();
            alert('已保存（仅本地）');
        }
    }
    
    function reset(){ fill(); }
    
    function syncChips(){
        var pf={}; try{pf=JSON.parse(localStorage.getItem('profile')||'{}');}catch(e){}
        var g=document.getElementById('chip_gender'); if(g) g.textContent=pf.gender||'';
        
        // 自动计算年龄显示在chip中
        var calculatedAge = calculateAge(pf.birthday || pf.birth_date || pf.birth);
        var a=document.getElementById('chip_age'); 
        if(a) a.textContent = calculatedAge !== null ? (calculatedAge + '岁') : '';
        
        var c=document.getElementById('chip_company'); if(c) c.textContent=pf.company||'';
    }
    
    function bindLogout(){
        var btn=document.getElementById('logoutBtn');
        if(!btn) return;
        btn.addEventListener('click', function(){
            if(window.API && typeof window.API.logout==='function'){
                window.API.logout().then(function(){ location.href='index.html'; });
            }else{
                try{ localStorage.removeItem('currentUser'); }catch(e){}
                location.href='index.html';
            }
        });
    }
    
    window.ProfilePage={ fill:fill, save:save, reset:reset, bindLogout:bindLogout };
})();
