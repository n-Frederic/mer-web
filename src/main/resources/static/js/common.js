// Common helpers and header wiring
(function () {
    // App constants
    window.APP = {
        siteName: '潘多拉 工作日志管理系统',
        apiBase: 'http://127.0.0.1:8001',
        useApi: true  //已启用真实API，可以切换成本地mock数据
    };

    // Utilities
    window.util = {
        nowId: function(prefix){ return (prefix||'ID-') + Date.now(); },
        fmtDate: function(d){ try{ var t=new Date(d); if(!isFinite(t)) return ''; var m=String(t.getMonth()+1).padStart(2,'0'); var day=String(t.getDate()).padStart(2,'0'); return t.getFullYear()+'-'+m+'-'+day; }catch(e){ return ''; } },
        readJSON: function(key, fallback){ try{ var v=localStorage.getItem(key); return v? JSON.parse(v): (fallback===undefined?null:fallback); }catch(e){ return (fallback===undefined?null:fallback);} },
        writeJSON: function(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); return true; }catch(e){ return false; } }
    };
    function setCurrentUserName() {
        try {
            var raw = localStorage.getItem('currentUser');
            var u = raw ? JSON.parse(raw) : { name: '用户', email: '' };
            var el = document.getElementById('currentUserName');
            if (el) el.textContent = u.name || '用户';
        } catch (e) {}
    }

    function wireProfileShortcut() {
        var shortcut = document.getElementById('profileShortcut');
        if (shortcut) {
            shortcut.addEventListener('click', function () {
                window.location.href = 'profile.html';
            });
        }
    }

    // Simple id helper
    window.$id = function(id){ return document.getElementById(id); };

    // Expose helpers
    window.matchKeyword = function (val, kw) {
        if (!kw) return true;
        return String(val || '').toLowerCase().includes(String(kw).toLowerCase());
    };
    window.withinRange = function (dateStr, startStr, endStr) {
        if (!startStr && !endStr) return true;
        var d = new Date(dateStr).getTime();
        if (startStr) {
            var s = new Date(startStr).getTime();
            if (isFinite(s) && d < s) return false;
        }
        if (endStr) {
            var e = new Date(endStr).getTime();
            if (isFinite(e) && d > e) return false;
        }
        return true;
    };

    document.addEventListener('DOMContentLoaded', function () {
        setCurrentUserName();
        wireProfileShortcut();
    });
})();


