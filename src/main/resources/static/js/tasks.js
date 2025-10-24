// Tasks page helpers (fetch, filter, sort, paginate, render) - 优化版本
(function(){
    // 内部辅助函数 - 确保在模块内可用
    function matchKeyword(val, kw) {
        if (!kw) return true;
        return String(val || '').toLowerCase().includes(String(kw).toLowerCase());
    }

    function withinRange(dateStr, startStr, endStr) {
        if (!startStr && !endStr) return true;
        if (!dateStr) return false;
        
        try {
            var d = new Date(dateStr).getTime();
            if (!isFinite(d)) return false;
            
            if (startStr) {
                var s = new Date(startStr).getTime();
                if (isFinite(s) && d < s) return false;
            }
            if (endStr) {
                var e = new Date(endStr).getTime();
                if (isFinite(e) && d > e) return false;
            }
            return true;
        } catch (error) {
            console.warn('Date parsing error:', error);
            return false;
        }
    }

    async function fetchTasks() {
        try {
            if (window.API && typeof window.API.listTasks === 'function'){
                console.log('正在从后端获取任务数据...');
            var resp = await window.API.listTasks();
                console.log('后端返回数据:', resp);
                
            // 转换后端数据格式以适配前端显示
            var tasks = (resp.list || []).map(function(task) {
                // 现在api.js已经标准化了数据，我们可以直接使用标准化后的字段
                return {
                    id: task.id || task.taskId || 'N/A',
                    name: task.title || task.name || '未命名任务',
                    summary: task.description || '',
                    details: task.description || '',
                    startDate: task.startAt ? formatDate(task.startAt) : '',
                    endDate: task.dueAt ? formatDate(task.dueAt) : '',
                    publisher: task.creator ? (task.creator.name || '未知') : '未知',
                    owner: task.creator ? (task.creator.name || '未知') : '未知',
                    priority: task.priority || 'Medium',
                    status: task.status || 'Published',
                    // 根据任务状态计算进度
                    progress: calculateProgress(task.status),
                    createdAt: task.createdAt || new Date().toISOString(),
                    updatedAt: task.updatedAt || new Date().toISOString(),
                    // 保留原始数据以备后用
                    _original: task
                };
            });
                console.log('转换后的任务数据:', tasks);
            return tasks;
            } else {
                console.log('API不可用，尝试加载静态数据...');
                return await loadStaticTasks();
            }
        } catch (error) {
            console.error('获取任务数据失败:', error);
            alert('获取任务数据失败: ' + error.message);
            return await loadStaticTasks(); // 降级到静态数据
        }
    }

    // 格式化日期
    function formatDate(dateInput) {
        try {
            if (!dateInput) return '';
            var date = new Date(dateInput);
            if (!isFinite(date)) return '';
            return date.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    }

    // 根据任务状态计算进度
    function calculateProgress(status) {
        if (!status) return 0;
        switch (status.toLowerCase()) {
            case 'published': return 0;
            case 'assigned': return 10;
            case 'inprogress': return 50;
            case 'reported': return 80;
            case 'completed': return 100;
            case 'closed': return 100;
            default: return 0;
        }
    }

    // 加载静态任务数据
    async function loadStaticTasks() {
        var urls = ['/data/tasks.json','data/tasks.json','./data/tasks.json'];
        for (var i = 0; i < urls.length; i++) { 
            try { 
                var r = await fetch(urls[i], { cache: 'no-cache' }); 
                if (r.ok) {
                    var data = await r.json();
                    console.log('加载静态数据成功:', data);
                    return data;
                }
            } catch(e) {
                console.log('尝试URL失败:', urls[i], e);
            } 
        }
        
        // 尝试从页面内嵌数据获取
        try { 
            var mockData = JSON.parse(document.getElementById('mockTasks')?.textContent || '[]');
            console.log('使用页面内嵌数据:', mockData);
            return mockData;
        } catch(e) { 
            console.log('没有可用的任务数据');
            return []; 
        }
    }

    function loadLocalPublished(){
        try { 
            var local = JSON.parse(localStorage.getItem('publishedTasks')||'[]');
            console.log('本地发布的任务:', local);
            return local;
        } catch(e){ 
            return []; 
        }
    }

    function render(list) {
        var grid = document.getElementById('taskGrid');
        var pageInfoTop = document.getElementById('pageInfo');
        var pageInfoBottom = document.getElementById('pageInfoBottom');
        var infoBottom = document.getElementById('resultInfoBottom');
        
        if (!grid) {
            console.error('找不到taskGrid元素');
            return;
        }

        var pageSize = parseInt(document.getElementById('pageSize')?.value || '12', 10);
        var field = document.getElementById('sortField')?.value || 'name';
        var order = document.getElementById('sortOrder')?.value || 'asc';

        var tasks = list.slice();
        
        // 排序
        tasks.sort(function(a,b){
            var va = a[field] || '';
            var vb = b[field] || '';
            
            if (field === 'startDate' || field === 'endDate'){ 
                va = new Date(va).getTime() || 0; 
                vb = new Date(vb).getTime() || 0; 
            }
            if (field === 'progress'){ 
                va = Number(va) || 0; 
                vb = Number(vb) || 0; 
            }
            
            if (va < vb) return order === 'asc' ? -1 : 1; 
            if (va > vb) return order === 'asc' ? 1 : -1; 
            return 0;
        });

        // 分页
        var total = tasks.length; 
        var totalPages = Math.max(1, Math.ceil(total / pageSize));
        window.__page = Math.min(window.__page || 1, totalPages);
        var startIdx = (window.__page - 1) * pageSize; 
        var pageList = tasks.slice(startIdx, startIdx + pageSize);
        
        // 更新页面信息
        if (pageInfoTop) pageInfoTop.textContent = window.__page + ' / ' + totalPages;
        if (pageInfoBottom) pageInfoBottom.textContent = window.__page + ' / ' + totalPages;
        if (infoBottom) infoBottom.textContent = '共 ' + total + ' 条记录，当前第 ' + window.__page + '/' + totalPages + ' 页';
        
        // 更新按钮状态
        var prevTop = document.getElementById('prevPage');
        var nextTop = document.getElementById('nextPage');
        var prevBottom = document.getElementById('prevPageBottom');
        var nextBottom = document.getElementById('nextPageBottom');
        
        if (prevTop) prevTop.disabled = window.__page <= 1;
        if (nextTop) nextTop.disabled = window.__page >= totalPages;
        if (prevBottom) prevBottom.disabled = window.__page <= 1;
        if (nextBottom) nextBottom.disabled = window.__page >= totalPages;

        // 渲染任务卡片
        grid.innerHTML = pageList.map(function(t){
            return '<div class="task-card">\
                <div class="task-id">' + escapeHtml(t.id) + '</div>\
                <div class="task-title">' + escapeHtml(t.name) + '</div>\
                <div class="task-meta">\
                    <span>开始：' + escapeHtml(t.startDate) + '</span>\
                    <span>结束：' + escapeHtml(t.endDate) + '</span>\
                    <span>发布人：' + escapeHtml(t.publisher) + '</span>\
                    <span>负责人：' + escapeHtml(t.owner) + '</span>\
                </div>\
                <div class="task-summary">' + escapeHtml(t.summary) + '</div>\
                <div class="task-details">' + escapeHtml(t.details) + '</div>\
                <div class="progress"><div class="progress-inner" style="width:' + Math.max(0,Math.min(100,t.progress)) + '%;"></div></div>\
                <div class="progress-text">完成度：' + Math.max(0,Math.min(100,t.progress)) + '%</div>\
                <div class="card-actions"><a class="btn-detail" href="task-detail.html?id=' + encodeURIComponent(t.id) + '">查看详情</a></div>\
            </div>';
        }).join('');

        console.log('渲染完成，显示', pageList.length, '个任务，共', total, '个任务');
    }

    // HTML转义函数
    function escapeHtml(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text || '').replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    function doFilter(all){
        try {
            var field = document.getElementById('f_field')?.value || '';
            var val = (document.getElementById('f_value')?.value || '').trim();
            var start = document.getElementById('f_start')?.value || '';
            var end = document.getElementById('f_end')?.value || '';
            
            console.log('筛选条件:', { field, val, start, end });
            
            var filtered = all.filter(function(t){
                if (field === 'date') {
                    return withinRange(t.startDate, start, end) || withinRange(t.endDate, start, end);
                }
                if (field === 'id') return matchKeyword(t.id, val);
                if (field === 'name') return matchKeyword(t.name, val);
                if (field === 'owner') return matchKeyword(t.owner, val);
                if (field === 'publisher') return matchKeyword(t.publisher, val);
            return true;
        });
            
            console.log('筛选结果:', filtered.length, '/', all.length);
            return filtered;
        } catch (error) {
            console.error('筛选出错:', error);
            return all; // 出错时返回全部数据
        }
    }

    window.TasksPage = {
        boot: async function(){
            try {
                console.log('TasksPage 启动...');
                
            var all = await fetchTasks();
                console.log('获取到任务数据:', all.length, '条');
                
                // 合并本地发布的任务
            var local = loadLocalPublished();
            if (Array.isArray(local) && local.length){
                    console.log('合并本地任务:', local.length, '条');
                var map = {};
                    all.forEach(function(t){ map[t.id] = t; });
                    local.forEach(function(t){ map[t.id] = t; });
                all = Object.keys(map).map(function(k){ return map[k]; });
                    
                    // 本地任务排前面
                all.sort(function(a,b){
                        var aLocal = local.findIndex(function(x){return x.id === a.id;}) >= 0;
                        var bLocal = local.findIndex(function(x){return x.id === b.id;}) >= 0;
                    if (aLocal && !bLocal) return -1;
                    if (!aLocal && bLocal) return 1;
                    return 0;
                });
            }
                
            window.__allTasks = all;
                console.log('总任务数:', all.length);
                
                // 定义操作函数
                var apply = function(){ 
                    try {
                        var list = doFilter(window.__allTasks || []); 
                        window.__last = list; 
                        render(list);
                    } catch (error) {
                        console.error('应用筛选时出错:', error);
                        alert('筛选时出错: ' + error.message);
                    }
                };
                
                var goPrev = function(){ 
                    if(window.__page > 1){ 
                        window.__page--; 
                        render(window.__last || all); 
                    } 
                };
                
                var goNext = function(){ 
                    window.__page++; 
                    render(window.__last || all); 
                };

                // 绑定事件
                var btnSearch = document.getElementById('btnSearch');
                var btnReset = document.getElementById('btnReset');
                var fField = document.getElementById('f_field');
                var sortField = document.getElementById('sortField');
                var sortOrder = document.getElementById('sortOrder');
                var pageSize = document.getElementById('pageSize');

                if (btnSearch) {
                    btnSearch.addEventListener('click', function(){ 
                        console.log('执行搜索');
                        window.__page = 1; 
                        apply(); 
                    });
                }

                if (btnReset) {
                    btnReset.addEventListener('click', function(){ 
                        console.log('重置搜索');
                        window.__page = 1; 
                        var fValue = document.getElementById('f_value');
                        var fStart = document.getElementById('f_start');
                        var fEnd = document.getElementById('f_end');
                        
                        if (fValue) fValue.value = '';
                        if (fStart) fStart.value = '';
                        if (fEnd) fEnd.value = '';
                        apply(); 
                    });
                }

                if (fField) {
                    fField.addEventListener('change', function(){
                        var isDate = fField.value === 'date';
                        var fValue = document.getElementById('f_value');
                        var fStart = document.getElementById('f_start');
                        var fEnd = document.getElementById('f_end');
                        
                        if (fValue) fValue.style.display = isDate ? 'none' : '';
                        if (fStart) fStart.style.display = isDate ? '' : 'none';
                        if (fEnd) fEnd.style.display = isDate ? '' : 'none';
                    });
                }

                if (sortField) sortField.addEventListener('change', apply);
                if (sortOrder) sortOrder.addEventListener('change', apply);
                if (pageSize) {
                    pageSize.addEventListener('change', function(){ 
                        window.__page = 1; 
                        apply(); 
                    });
                }

                // 分页按钮
                var prevPage = document.getElementById('prevPage');
                var nextPage = document.getElementById('nextPage');
                var prevPageBottom = document.getElementById('prevPageBottom');
                var nextPageBottom = document.getElementById('nextPageBottom');

                if (prevPage) prevPage.addEventListener('click', goPrev);
                if (nextPage) nextPage.addEventListener('click', goNext);
                if (prevPageBottom) prevPageBottom.addEventListener('click', goPrev);
                if (nextPageBottom) nextPageBottom.addEventListener('click', goNext);

                // 初始化显示
            apply();
                console.log('TasksPage 启动完成');
                
            } catch (error) {
                console.error('TasksPage 启动失败:', error);
                alert('页面启动失败: ' + error.message);
            }
        }
    };
})();