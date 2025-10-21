// Profile page helpers (fill, save, reset, chips)
(function(){
    function fill(){
        var currentUser={name:'用户',email:'',employeeId:''};
        try{ var raw=localStorage.getItem('currentUser'); if(raw) currentUser=JSON.parse(raw);}catch(e){}
        var pf={}; try{pf=JSON.parse(localStorage.getItem('profile')||'{}');}catch(e){}
        document.getElementById('p_name')&&(document.getElementById('p_name').textContent=currentUser.name||pf.name||'用户');
        document.getElementById('p_employeeId')&&(document.getElementById('p_employeeId').textContent=currentUser.employeeId||'');
        document.getElementById('p_email')&&(document.getElementById('p_email').textContent=currentUser.email||pf.email||'');
        document.getElementById('p_company')&&(document.getElementById('p_company').textContent=pf.company||'');
        document.getElementById('pf_name')&&(document.getElementById('pf_name').value=currentUser.name||pf.name||'');
        document.getElementById('pf_email')&&(document.getElementById('pf_email').value=currentUser.email||pf.email||'');
        document.getElementById('pf_gender')&&(document.getElementById('pf_gender').value=pf.gender||'');
        document.getElementById('pf_birth')&&(document.getElementById('pf_birth').value=pf.birth||'');
        document.getElementById('pf_age')&&(document.getElementById('pf_age').value=pf.age||'');
        document.getElementById('pf_company')&&(document.getElementById('pf_company').value=pf.company||'');
        document.getElementById('pf_bio')&&(document.getElementById('pf_bio').value=pf.bio||'');
        syncChips();
    }
    function save(){
        var pf={
            name:(document.getElementById('pf_name')?.value||'').trim(),
            email:(document.getElementById('pf_email')?.value||'').trim(),
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
            var top=document.getElementById('currentUserName'); if(top) top.textContent=pf.name;
            var pname=document.getElementById('p_name'); if(pname) pname.textContent=pf.name||'用户';
        }
        var pe=document.getElementById('p_email'); if(pe) pe.textContent=pf.email||'';
        var pc=document.getElementById('p_company'); if(pc) pc.textContent=pf.company||'';
        syncChips();
        alert('已保存');
    }
    function reset(){ fill(); }
    function syncChips(){
        var pf={}; try{pf=JSON.parse(localStorage.getItem('profile')||'{}');}catch(e){}
        var g=document.getElementById('chip_gender'); if(g) g.textContent=pf.gender||'';
        var a=document.getElementById('chip_age'); if(a) a.textContent=pf.age? (pf.age+'岁'):'';
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


