// Tasks page - 真正的后端分页版本
(function(){
    // 内部辅助函数
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

    // 获取任务数据（真正的后端分页）
    async function fetchTasks(page, pageSize) {
        try {
            if (window.API && typeof window.API.listTasks === 'function'){
                console.log('📋 正在从后端获取任务数据，第' + page + '页，每页' + pageSize + '条');
                
                var resp = await window.API.listTasks({
                    page: page,
                    pageSize: pageSize
                });
                
                console.log('✅ 后端返回数据:', resp);
                
            // 转换后端数据格式以适配前端显示
            var tasks = (resp.list || []).map(function(task) {
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
                    progress: calculateProgress(task.status),
                    createdAt: task.createdAt || new Date().toISOString(),
                    updatedAt: task.updatedAt || new Date().toISOString(),
                    _original: task
                };
            });
                
                console.log('✅ 转换后的任务数据:', tasks);
                
                return {
                    list: tasks,
                    total: resp.total || 0,
                    page: resp.page || page,
                    pageSize: resp.pageSize || pageSize,
                    totalPages: resp.totalPages || Math.ceil((resp.total || 0) / pageSize)
                };
            } else {
                console.log('API不可用，尝试加载静态数据...');
                var staticData = await loadStaticTasks();
                return {
                    list: staticData,
                    total: staticData.length,
                    page: 1,
                    pageSize: pageSize,
                    totalPages: 1
                };
            }
        } catch (error) {
            console.error('❌ 获取任务数据失败:', error);
            alert('获取任务数据失败: ' + error.message);
            return {
                list: [],
                total: 0,
                page: 1,
                pageSize: pageSize,
                totalPages: 0
            };
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
        
        try { 
            var mockData = JSON.parse(document.getElementById('mockTasks')?.textContent || '[]');
            console.log('使用页面内嵌数据:', mockData);
            return mockData;
        } catch(e) { 
            console.log('没有可用的任务数据');
            return []; 
        }
    }

    // 渲染任务列表（不再需要前端分页）
    function render(data) {
        var grid = document.getElementById('taskGrid');
        var pageInfoTop = document.getElementById('pageInfo');
        var pageInfoBottom = document.getElementById('pageInfoBottom');
        var infoBottom = document.getElementById('resultInfoBottom');
        
        if (!grid) {
            console.error('找不到taskGrid元素');
            return;
        }

        var list = data.list || [];
        var total = data.total || 0;
        var page = data.page || 1;
        var totalPages = data.totalPages || 1;
        
        // 更新页面信息
        if (pageInfoTop) pageInfoTop.textContent = page + ' / ' + totalPages;
        if (pageInfoBottom) pageInfoBottom.textContent = page + ' / ' + totalPages;
        if (infoBottom) infoBottom.textContent = '共 ' + total + ' 条记录，当前第 ' + page + '/' + totalPages + ' 页';
        
        // 更新按钮状态
        var prevTop = document.getElementById('prevPage');
        var nextTop = document.getElementById('nextPage');
        var prevBottom = document.getElementById('prevPageBottom');
        var nextBottom = document.getElementById('nextPageBottom');
        
        if (prevTop) prevTop.disabled = page <= 1;
        if (nextTop) nextTop.disabled = page >= totalPages;
        if (prevBottom) prevBottom.disabled = page <= 1;
        if (nextBottom) nextBottom.disabled = page >= totalPages;

        // 保存当前页码到全局
        window.__currentPage = page;
        window.__totalPages = totalPages;

        // 渲染任务卡片
        if (list.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">暂无任务数据</div>';
        } else {
            grid.innerHTML = list.map(function(t){
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
        }

        console.log('✅ 渲染完成，显示第' + page + '页，共' + list.length + '个任务，总计' + total + '个任务');
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

    window.TasksPage = {
        boot: async function(){
            try {
                console.log('📄 TasksPage 启动...');
                
                // 初始化页码
                window.__currentPage = 1;
                window.__totalPages = 1;
                
                // 获取页面大小选择器
                var pageSizeSelect = document.getElementById('pageSize');
                var pageSize = parseInt(pageSizeSelect?.value || '12', 10);
                
                // 加载第一页数据
                var data = await fetchTasks(1, pageSize);
                render(data);
                
                // 定义翻页函数
                var loadPage = async function(page) {
                    var pageSize = parseInt(document.getElementById('pageSize')?.value || '12', 10);
                    console.log('📄 加载第' + page + '页，每页' + pageSize + '条');
                    var data = await fetchTasks(page, pageSize);
                    render(data);
                };
                
                var goPrev = function(){ 
                    if (window.__currentPage > 1) {
                        loadPage(window.__currentPage - 1);
                    } 
                };
                
                var goNext = function(){ 
                    if (window.__currentPage < window.__totalPages) {
                        loadPage(window.__currentPage + 1);
                    }
                };

                // 绑定事件
                var btnSearch = document.getElementById('btnSearch');
                var btnReset = document.getElementById('btnReset');
                var fField = document.getElementById('f_field');
                var sortField = document.getElementById('sortField');
                var sortOrder = document.getElementById('sortOrder');

                if (btnSearch) {
                    btnSearch.addEventListener('click', function(){ 
                        console.log('🔍 执行搜索（前端筛选）');
                        alert('搜索功能待实现');
                    });
                }

                if (btnReset) {
                    btnReset.addEventListener('click', function(){ 
                        console.log('🔄 重置搜索');
                        loadPage(1);
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

                // 页面大小变化时重新加载
                if (pageSizeSelect) {
                    pageSizeSelect.addEventListener('change', function(){ 
                        console.log('📊 页面大小变化为:', pageSizeSelect.value);
                        loadPage(1); // 重新加载第一页
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

                console.log('✅ TasksPage 启动完成');
                
            } catch (error) {
                console.error('❌ TasksPage 启动失败:', error);
                alert('页面启动失败: ' + error.message);
            }
        }
    };
})();
