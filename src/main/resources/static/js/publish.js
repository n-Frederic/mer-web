(function(){
  function getVal(id){ var el=document.getElementById(id); return el?el.value.trim():''; }
  function setVal(id,v){ var el=document.getElementById(id); if(el) el.value=v||''; }
  function loadPublished(){ try{ return JSON.parse(localStorage.getItem('publishedTasks')||'[]'); }catch(e){ return []; } }
  function savePublished(list){ try{ localStorage.setItem('publishedTasks', JSON.stringify(list)); }catch(e){} }

  function validate(task){
    if(!task.id) { alert('请填写任务编号'); return false; }
    if(!task.name){ alert('请填写任务名称'); return false; }
    if(!task.startDate){ alert('请选择开始日期'); return false; }
    if(!task.endDate){ alert('请选择结束日期'); return false; }
    if(new Date(task.endDate).getTime() < new Date(task.startDate).getTime()){ alert('结束日期不能早于开始日期'); return false; }
    var p = Number(task.progress); if(!(p>=0 && p<=100)) { alert('完成进度需在 0-100 之间'); return false; }
    return true;
  }

  function resetForm(){
    ['pf_id','pf_name','pf_start','pf_end','pf_owner','pf_summary','pf_details'].forEach(function(id){ setVal(id,''); });
  }

  document.addEventListener('DOMContentLoaded', function(){
    // 顶部用户展示
    try{ var raw=localStorage.getItem('currentUser'); var u=raw?JSON.parse(raw):{name:'用户'}; var el=document.getElementById('currentUserName'); if(el) el.textContent=u.name||'用户'; }catch(e){}

    // 默认生成一個任務編號（可手動修改）
    if(!getVal('pf_id')){ setVal('pf_id', 'T-' + Date.now()); }

    var btnPub=document.getElementById('btnPublish');
    var btnReset=document.getElementById('btnReset');
    if(btnPub){
      btnPub.addEventListener('click', function(){
        // 若未填寫，臨發佈再補一次
        if(!getVal('pf_id')) setVal('pf_id','T-' + Date.now());
        var cu = {}; try{ cu = JSON.parse(localStorage.getItem('currentUser')||'{}'); }catch(e){}
        var task={
          id: getVal('pf_id'),
          name: getVal('pf_name'),
          startDate: getVal('pf_start'),
          endDate: getVal('pf_end'),
          publisher: (cu.email || cu.name || '未命名'),
          owner: getVal('pf_owner'),
          progress: 0,
          summary: getVal('pf_summary'),
          details: getVal('pf_details')
        };
        if(!validate(task)) return;
        // 透過 API facade，方便日後切換後端
        if (window.API && typeof window.API.createTask==='function'){
          window.API.createTask(task).then(function(){ alert('发布成功！可前往“任务展示”查看'); });
        } else {
          var list = loadPublished();
          var idx = list.findIndex(function(t){ return t.id===task.id; });
          if(idx>=0) list[idx]=task; else list.unshift(task);
          savePublished(list);
          alert('发布成功！可前往“任务展示”查看');
        }
      });
    }
    if(btnReset){ btnReset.addEventListener('click', resetForm); }
  });
})();


