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
        
        document.getElementById('pf_company')&&(document.getElementById('pf_company').value=company);
        document.getElementById('pf_bio')&&(document.getElementById('pf_bio').value=pf.bio||'');
        
        syncChips();
    }
    
    function save(){
        var pf={
            name:(document.getElementById('pf_name')?.value||'').trim(),
            email:(document.getElementById('pf_email')?.value||'').trim(),
            phone:(document.getElementById('pf_phone')?.value||'').trim(),
            gender:(document.getElementById('pf_gender')?.value||''),
            birth:(document.getElementById('pf_birth')?.value||''),
            age:(document.getElementById('pf_age')?.value||''),
            company:(document.getElementById('pf_company')?.value||'').trim(),
            bio:(document.getElementById('pf_bio')?.value||'').trim()
        };
        try{ localStorage.setItem('profile', JSON.stringify(pf)); }catch(e){}

        // 更新当前用户信息
        var currentUser;
        try{ currentUser = JSON.parse(localStorage.getItem('currentUser')||'{}'); }catch(e){ currentUser = {}; }
        if (pf.name){
            currentUser.name = pf.name;
            currentUser.email = pf.email;
            try{ localStorage.setItem('currentUser', JSON.stringify(currentUser)); }catch(e){}
            
            // 更新页面显示
            var top=document.getElementById('currentUserName'); if(top) top.textContent=pf.name;
            // 注意：头像下方显示的是username，这里不更新p_username
        }
        var pe=document.getElementById('p_email'); if(pe) pe.textContent=pf.email||'';
        var pc=document.getElementById('p_company'); if(pc) pc.textContent=pf.company||'无';
        syncChips();
        alert('已保存');
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
