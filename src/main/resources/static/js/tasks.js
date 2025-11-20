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
    async function fetchTasks(page, pageSize, searchParams, sortParams) {
        try {
            if (window.API && typeof window.API.listTasks === 'function'){
                console.log('正在从后端获取任务数据，第' + page + '页，每页' + pageSize + '条');
                
                // 构建请求参数
                var requestParams = {
                    page: page,
                    pageSize: pageSize
                };
                
                // 添加搜索参数
                if (searchParams) {
                    if (searchParams.field && searchParams.value) {
                        requestParams.searchField = searchParams.field;
                        requestParams.searchValue = searchParams.value;
                    }
                    if (searchParams.startDate) {
                        requestParams.startDate = searchParams.startDate;
                    }
                    if (searchParams.endDate) {
                        requestParams.endDate = searchParams.endDate;
                    }
                }
                
                // 添加排序参数
                if (sortParams && sortParams.field) {
                    requestParams.sortField = sortParams.field;
                    requestParams.sortOrder = sortParams.order || 'asc';
                }
                
                var resp = await window.API.listTasks(requestParams);
                
                console.log('后端返回数据:', resp);
                
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
                    publisherId: task.creator ? task.creator.id : null,
                    owner: task.creator ? (task.creator.name || '未知') : '未知',
                    ownerId: task.creator ? task.creator.id : null,
                    priority: task.priority || 'Medium',
                    status: task.status || 'Published',
                    progress: task.progress_pct !== undefined ? task.progress_pct : calculateProgress(task.status),
                    createdAt: task.createdAt || new Date().toISOString(),
                    updatedAt: task.updatedAt || new Date().toISOString(),
                    _original: task
                };
            });
                
                console.log('转换后的任务数据:', tasks);
                
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
                
                // 前端搜索和排序处理
                var filteredData = applyFrontendSearchAndSort(staticData, searchParams, sortParams);
                
                // 前端分页处理
                var startIndex = (page - 1) * pageSize;
                var endIndex = startIndex + pageSize;
                var paginatedData = filteredData.slice(startIndex, endIndex);
                
                return {
                    list: paginatedData,
                    total: filteredData.length,
                    page: page,
                    pageSize: pageSize,
                    totalPages: Math.ceil(filteredData.length / pageSize)
                };
            }
        } catch (error) {
            console.error('获取任务数据失败:', error);
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
    
    // 前端搜索和排序处理（用于API不可用时的降级方案）
    function applyFrontendSearchAndSort(data, searchParams, sortParams) {
        var filteredData = data.slice(); // 创建副本
        
        // 应用搜索过滤
        if (searchParams) {
            if (searchParams.field && searchParams.value) {
                filteredData = filteredData.filter(function(task) {
                    var fieldValue = '';
                    
                    // 确保只搜索标题字段
                    if (searchParams.field === 'name') {
                        fieldValue = String(task.name || '');
                    } else {
                        // 如果不是搜索标题字段，则不进行搜索过滤
                        // 这样可以确保即使前端代码被修改，也只会搜索标题
                        return true;
                    }
                    
                    return fieldValue.toLowerCase().includes(searchParams.value.toLowerCase());
                });
            }
            
            // 日期范围搜索
            if (searchParams.startDate || searchParams.endDate) {
                filteredData = filteredData.filter(function(task) {
                    // 使用开始日期作为搜索依据
                    var taskDate = task.startDate || task.endDate;
                    if (!taskDate) return false;
                    
                    return withinRange(taskDate, searchParams.startDate, searchParams.endDate);
                });
            }
        }
        
        // 应用排序
        if (sortParams && sortParams.field) {
            filteredData.sort(function(a, b) {
                var valueA, valueB;
                
                switch (sortParams.field) {
                    case 'startDate':
                        valueA = new Date(a.startDate || '1970-01-01').getTime();
                        valueB = new Date(b.startDate || '1970-01-01').getTime();
                        break;
                    case 'endDate':
                        valueA = new Date(a.endDate || '1970-01-01').getTime();
                        valueB = new Date(b.endDate || '1970-01-01').getTime();
                        break;
                    case 'progress':
                        valueA = a.progress || 0;
                        valueB = b.progress || 0;
                        break;
                    case 'name':
                        valueA = String(a.name || '').toLowerCase();
                        valueB = String(b.name || '').toLowerCase();
                        break;
                    case 'id':
                        valueA = String(a.id || '');
                        valueB = String(b.id || '');
                        break;
                    default:
                        valueA = String(a[sortParams.field] || '').toLowerCase();
                        valueB = String(b[sortParams.field] || '').toLowerCase();
                }
                
                if (valueA < valueB) return sortParams.order === 'desc' ? 1 : -1;
                if (valueA > valueB) return sortParams.order === 'desc' ? -1 : 1;
                return 0;
            });
        }
        
        return filteredData;
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
    function render(data, searchKeyword) {
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
        
        // 获取当前登录用户信息
        var currentUser = null;
        try {
            var userData = localStorage.getItem('currentUser');
            if (userData) {
                currentUser = JSON.parse(userData);
            }
        } catch(e) {
            console.error('获取当前用户信息失败:', e);
        }
        
        // 任务排序：发布人是当前用户的任务优先
        if (currentUser && (currentUser.userId || currentUser.id || currentUser.user_id)) {
            var currentUserId = currentUser.userId || currentUser.id || currentUser.user_id;
            
            console.log('当前用户ID:', currentUserId);
            
            list.sort(function(a, b) {
                // 检查发布人（使用publisherId）
                var aIsPublisher = a.publisherId && (a.publisherId === currentUserId || a.publisherId === Number(currentUserId));
                var bIsPublisher = b.publisherId && (b.publisherId === currentUserId || b.publisherId === Number(currentUserId));
                
                // 排序逻辑：发布人优先
                if (aIsPublisher && !bIsPublisher) return -1;
                if (!aIsPublisher && bIsPublisher) return 1;
                
                return 0;
            });
        }
        
        // 更新页面信息
        if (pageInfoTop) pageInfoTop.textContent = page + ' / ' + totalPages;
        if (pageInfoBottom) pageInfoBottom.textContent = page + ' / ' + totalPages;
        
        // 添加搜索结果信息
        var resultText = '共 ' + total + ' 条记录，当前第 ' + page + '/' + totalPages + ' 页';
        if (searchKeyword) {
            resultText = '搜索 "' + searchKeyword + '"：' + resultText;
        }
        if (infoBottom) infoBottom.textContent = resultText;
        
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
            var emptyMessage = searchKeyword ?
                '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">未找到匹配的任务</div>' :
                '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">暂无任务数据</div>';
            grid.innerHTML = emptyMessage;
        } else {
            grid.innerHTML = list.map(function(t){
            // 判断当前用户是否是发布人（用于优先级标识）
            var isPublisher = false;
            
            if (currentUser) {
                var userId = currentUser.userId || currentUser.id || currentUser.user_id;
                var userName = currentUser.name;
                
                // 检查是否是发布人
                if (t.publisherId && (t.publisherId === userId || t.publisherId === Number(userId))) {
                    isPublisher = true;
                }
            }
            
            // 构建操作按钮HTML - 所有任务都显示两个按钮
            var actionButtons = '<a class="btn-detail" href="task-detail.html?id=' + encodeURIComponent(t.id) + '">查看详情</a>';
            

            // 添加发布人标识
            var priorityBadge = '';
            if (isPublisher) {
                priorityBadge = '<div style="position: absolute; right: 10px; top: 10px; background: linear-gradient(135deg, #9370db, #b19cd9); color: white; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: bold;">📝 我发布</div>';
            }
            
            // 如果有搜索关键词，使用高亮版本的内容
            var displayName = searchKeyword ? t.name : escapeHtml(t.name);
            var displaySummary = searchKeyword ? t.summary : escapeHtml(t.summary);
            var displayDetails = searchKeyword ? t.details : escapeHtml(t.details);
            
            // 如果没有搜索关键词，确保HTML转义
            if (!searchKeyword) {
                displayName = escapeHtml(t.name);
                displaySummary = escapeHtml(t.summary);
                displayDetails = escapeHtml(t.details);
            }
            
            return '<div class="task-card">\
                <div class="task-id">' + escapeHtml(t.id) + '</div>\
                ' + priorityBadge + '\
                <div class="task-title">' + displayName + '</div>\
                <div class="task-meta">\
                    <span>开始：' + escapeHtml(t.startDate) + '</span>\
                    <span>结束：' + escapeHtml(t.endDate) + '</span>\
                </div>\
                <div class="task-summary">' + displaySummary + '</div>\
                <div class="task-details">' + displayDetails + '</div>\
                <div class="progress"><div class="progress-inner" style="width:' + Math.max(0,Math.min(100,t.progress)) + '%;"></div></div>\
                <div class="progress-text">完成度：' + Math.max(0,Math.min(100,t.progress)) + '%</div>\
                <div class="card-actions">' + actionButtons + '</div>\
            </div>';
        }).join('');
        }

        console.log('渲染完成，显示第' + page + '页，共' + list.length + '个任务，总计' + total + '个任务');
    }

    // HTML转义函数
    function escapeHtml(text) {
        var map = {
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#039;'
        };
        return String(text || '').replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    window.TasksPage = {
        boot: async function(){
            try {
                console.log('TasksPage 启动...');
                
                // 初始化页码
                window.__currentPage = 1;
                window.__totalPages = 1;
                
                // 获取页面大小选择器
                var pageSizeSelect = document.getElementById('pageSize');
                var pageSize = parseInt(pageSizeSelect?.value || '12', 10);
                
                // 显示加载状态的函数
                var showLoading = function() {
                    var grid = document.getElementById('taskGrid');
                    if (grid) {
                        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">加载中...</div>';
                    }
                };
                
                // 获取搜索参数
                var getSearchParams = function() {
                    var fValue = document.getElementById('f_value');
                    var fStart = document.getElementById('f_start');
                    var fEnd = document.getElementById('f_end');
                    
                    var searchParams = {};
                    
                    // 只搜索标题字段
                    if (fValue && fValue.value.trim()) {
                        searchParams.value = fValue.value.trim();
                        searchParams.field = 'name'; // 固定搜索标题字段
                    }
                    
                    // 日期搜索
                    if (fStart && fStart.value) searchParams.startDate = fStart.value;
                    if (fEnd && fEnd.value) searchParams.endDate = fEnd.value;
                    
                    return searchParams;
                };
                
                // 高亮搜索关键词的函数
                var highlightKeyword = function(text, keyword) {
                    if (!keyword || !text) return text;
                    
                    var regex = new RegExp('(' + escapeRegExp(keyword) + ')', 'gi');
                    return text.replace(regex, '<mark style="background-color: rgba(151,160,255,0.62); padding: 1px 2px; border-radius: 2px;">$1</mark>');
                };
                
                // 转义正则表达式特殊字符
                var escapeRegExp = function(string) {
                    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                };
                
                // 加载数据的函数
                var loadData = async function(page) {
                    showLoading(); // 显示加载状态
                    
                    var pageSize = parseInt(document.getElementById('pageSize')?.value || '12', 10);
                    var searchParams = getSearchParams();
                    
                    console.log('加载数据:', {
                        page: page,
                        pageSize: pageSize,
                        searchParams: searchParams
                    });
                    
                    var data = await fetchTasks(page, pageSize, searchParams);
                    
                    // 如果有搜索关键词，只对标题字段进行高亮处理
                    if (searchParams.value) {
                        data.list = data.list.map(function(task) {
                            var highlightedTask = Object.assign({}, task);
                            highlightedTask.name = highlightKeyword(task.name, searchParams.value);
                            // 不对摘要和详情字段进行高亮处理，因为搜索只针对标题
                            // highlightedTask.summary = highlightKeyword(task.summary, searchParams.value);
                            // highlightedTask.details = highlightKeyword(task.details, searchParams.value);
                            return highlightedTask;
                        });
                    }
                    
                    render(data, searchParams.value);
                };
                
                // 加载第一页数据
                await loadData(1);
                
                // 定义翻页函数
                var loadPage = async function(page) {
                    await loadData(page);
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
                var fValue = document.getElementById('f_value');

                // 搜索按钮事件
                if (btnSearch) {
                    btnSearch.addEventListener('click', function(){
                        console.log('执行搜索');
                        loadPage(1); // 搜索时回到第一页
                    });
                }

                // 搜索输入框回车事件
                if (fValue) {
                    fValue.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter') {
                            console.log('回车执行搜索');
                            loadPage(1); // 搜索时回到第一页
                        }
                    });
                }

                // 重置按钮事件
                if (btnReset) {
                    btnReset.addEventListener('click', function(){
                        console.log('重置搜索');
                        
                        // 重置搜索字段
                        var fStart = document.getElementById('f_start');
                        var fEnd = document.getElementById('f_end');
                        
                        if (fValue) fValue.value = '';
                        if (fStart) fStart.value = '';
                        if (fEnd) fEnd.value = '';
                        
                        // 重新加载第一页
                        loadPage(1);
                    });
                }

                // 搜索字段变化事件
                var fStart = document.getElementById('f_start');
                var fEnd = document.getElementById('f_end');
                
                // 初始设置日期输入框为隐藏
                if (fStart) fStart.style.display = 'none';
                if (fEnd) fEnd.style.display = 'none';

                // 页面大小变化时重新加载
                if (pageSizeSelect) {
                    pageSizeSelect.addEventListener('change', function(){
                        console.log('页面大小变化为:', pageSizeSelect.value);
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

                console.log('TasksPage 启动完成');
                
            } catch (error) {
                console.error('TasksPage 启动失败:', error);
                alert('页面启动失败: ' + error.message);
            }
        }
    };
    
    // 全局函数：更新任务进度
    window.updateTaskProgress = async function(taskId) {
        try {

            var currentUser = null;
            if (window.API && typeof window.API.getCurrentUserWithId === 'function') {
                currentUser = await window.API.getCurrentUserWithId();
            } else {
                // 降级方案
                try {
                    var userData = localStorage.getItem('currentUser');
                    if (userData) {
                        currentUser = JSON.parse(userData);
                    }
                } catch(e) {
                    console.error('获取当前用户信息失败:', e);
                }
            }
            
            var userId = currentUser ? (currentUser.userId || currentUser.id || currentUser.user_id) : null;
            
            if (!userId) {
                alert('无法获取当前用户信息，请重新登录');
                console.error('当前用户数据:', currentUser);
                return;
            }
            
            // 确保userId是字符串格式（如"U-1001"或"5"）
            userId = String(userId);
            
            // 弹出对话框让用户输入新的进度
            var progressInput = prompt('请输入任务进度（0-100）：', '0');
            
            if (progressInput === null) {
                // 用户取消
                return;
            }
            
            var progressPct = parseInt(progressInput, 10);
            
            // 验证输入
            if (isNaN(progressPct) || progressPct < 0 || progressPct > 100) {
                alert('请输入0-100之间的整数');
                return;
            }
            
            // 调用API更新进度
            if (window.API && typeof window.API.updateTaskProgress === 'function') {
                console.log('更新任务进度:', { taskId: taskId, userId: userId, progressPct: progressPct });
                
                var result = await window.API.updateTaskProgress(taskId, userId, progressPct);
                
                console.log('任务进度更新成功:', result);
                alert('任务进度更新成功！');
                
                // 重新加载任务列表
                location.reload();
            } else {
                alert('API不可用，无法更新任务进度');
            }
            
        } catch(error) {
            console.error('更新任务进度失败:', error);
            
            // 根据错误类型显示友好提示
            if (error.message && (error.message.includes('404') || error.message.includes('权限'))) {
                alert('您没有权限更新该任务的进度\n只有被指派的负责人才能更新任务进度');
            } else if (error.message && error.message.includes('400')) {
                alert('进度数据格式错误，请输入0-100之间的整数');
            } else if (error.message && error.message.includes('403')) {
                alert('您没有权限更新该任务的进度\n权限不足，请联系管理员');
            } else {
                alert('更新失败：' + (error.message || '请稍后重试'));
            }
        }
    };
    
    // 全局函数：更新任务信息
    window.updateTaskInfo = async function(taskId) {
        try {
            // 获取任务详情
            if (!window.API || typeof window.API.getTask !== 'function') {
                alert('API不可用，无法更新任务信息');
                return;
            }
            
            console.log('获取任务详情:', taskId);
            var task = await window.API.getTask(taskId);
            
            if (!task) {
                alert('无法获取任务信息');
                return;
            }
            
            console.log('获取到任务详情:', task);
            
            // 构建表单HTML
            var formHtml = '<div style="text-align: left; max-width: 600px; margin: 0 auto;">';
            formHtml += '<div style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px; font-weight: bold;">任务标题：</label><input type="text" id="edit_title" value="' + escapeHtml(task.title || task.name || '') + '" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;"></div>';
            formHtml += '<div style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px; font-weight: bold;">任务描述：</label><textarea id="edit_description" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; min-height: 100px;">' + escapeHtml(task.description || task.summary || '') + '</textarea></div>';
            formHtml += '<div style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px; font-weight: bold;">优先级：</label><select id="edit_priority" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;"><option value="Low"' + (task.priority === 'Low' ? ' selected' : '') + '>低</option><option value="Medium"' + (task.priority === 'Medium' ? ' selected' : '') + '>中</option><option value="High"' + (task.priority === 'High' ? ' selected' : '') + '>高</option></select></div>';
            formHtml += '<div style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px; font-weight: bold;">状态：</label><select id="edit_status" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;"><option value="Published"' + (task.status === 'Published' ? ' selected' : '') + '>已发布</option><option value="Assigned"' + (task.status === 'Assigned' ? ' selected' : '') + '>已分配</option><option value="InProgress"' + (task.status === 'InProgress' ? ' selected' : '') + '>进行中</option><option value="Reported"' + (task.status === 'Reported' ? ' selected' : '') + '>已汇报</option><option value="Completed"' + (task.status === 'Completed' ? ' selected' : '') + '>已完成</option></select></div>';
            formHtml += '<div style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px; font-weight: bold;">开始时间：</label><input type="datetime-local" id="edit_startAt" value="' + formatDateTimeLocal(task.startAt) + '" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;"></div>';
            formHtml += '<div style="margin-bottom: 15px;"><label style="display: block; margin-bottom: 5px; font-weight: bold;">截止时间：</label><input type="datetime-local" id="edit_dueAt" value="' + formatDateTimeLocal(task.dueAt) + '" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;"></div>';
            formHtml += '</div>';
            
            // 创建临时的对话框容器
            var dialogDiv = document.createElement('div');
            dialogDiv.innerHTML = '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">\
                <div style="background: white; padding: 30px; border-radius: 14px; max-width: 700px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">\
                    <h3 style="margin: 0 0 20px 0; color: #a55b00; font-size: 22px;">更新任务信息</h3>\
                    ' + formHtml + '\
                    <div style="margin-top: 20px; text-align: center; display: flex; gap: 10px; justify-content: center;">\
                        <button id="btn_save_task" style="padding: 10px 24px; background: linear-gradient(135deg, #ff8a00, #ffb06b); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px;">保存</button>\
                        <button id="btn_cancel_task" style="padding: 10px 24px; background: #ddd; color: #666; border: none; border-radius: 8px; cursor: pointer; font-size: 15px;">取消</button>\
                    </div>\
                </div>\
            </div>';
            
            document.body.appendChild(dialogDiv);
            
            // 绑定取消按钮
            document.getElementById('btn_cancel_task').addEventListener('click', function() {
                document.body.removeChild(dialogDiv);
            });
            
            // 绑定保存按钮
            document.getElementById('btn_save_task').addEventListener('click', async function() {
                try {
                    var updatedTask = {
                        title: document.getElementById('edit_title').value.trim(),
                        description: document.getElementById('edit_description').value.trim(),
                        priority: document.getElementById('edit_priority').value,
                        status: document.getElementById('edit_status').value,
                        startAt: document.getElementById('edit_startAt').value ? new Date(document.getElementById('edit_startAt').value).toISOString() : task.startAt,
                        dueAt: document.getElementById('edit_dueAt').value ? new Date(document.getElementById('edit_dueAt').value).toISOString() : task.dueAt,
                        tags: task.tags || []
                    };
                    
                    console.log('更新任务信息:', updatedTask);
                    
                    var result = await window.API.updateTaskInfo(taskId, updatedTask);
                    
                    console.log('任务信息更新成功:', result);
                    alert('任务信息更新成功！');
                    
                    document.body.removeChild(dialogDiv);
                    
                    // 重新加载任务列表
                    location.reload();
                    
                } catch(error) {
                    console.error('保存任务信息失败:', error);
                    
                    // 根据错误类型显示友好提示
                    if (error.message && (error.message.includes('404') || error.message.includes('权限') || error.message.includes('失败'))) {
                        alert('您没有权限更新该任务的信息\n只有任务发布人才能更新任务信息');
                    } else if (error.message && error.message.includes('403')) {
                        alert('您没有权限更新该任务的信息\n权限不足，请联系管理员');
                    } else {
                        alert('保存失败：' + (error.message || '请稍后重试'));
                    }
                }
            });
            
        } catch(error) {
            console.error('更新任务信息失败:', error);
            
            // 根据错误类型显示友好提示
            if (error.message && (error.message.includes('404') || error.message.includes('权限'))) {
                alert('您没有权限更新该任务\n只有任务发布人才能更新任务信息');
            } else if (error.message && error.message.includes('403')) {
                alert('您没有权限更新该任务的信息\n权限不足，请联系管理员');
            } else {
                alert('操作失败：' + (error.message || '请稍后重试'));
            }
        }
    };
    
    // 辅助函数：格式化日期时间为datetime-local格式
    function formatDateTimeLocal(dateStr) {
        if (!dateStr) return '';
        try {
            var date = new Date(dateStr);
            var year = date.getFullYear();
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            var hours = String(date.getHours()).padStart(2, '0');
            var minutes = String(date.getMinutes()).padStart(2, '0');
            return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
        } catch(e) {
            return '';
        }
    }
    
    // HTML转义函数（全局版本）
    function escapeHtml(text) {
        if (!text) return '';
        var map = {
            '&': '&',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    }
})();
