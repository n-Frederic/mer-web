// 通用评论组件
(function(){
    // 评论组件类
    window.CommentsWidget = {
        // 渲染评论列表
        renderComments: function(containerId, ownerType, ownerId) {
            var container = document.getElementById(containerId);
            if (!container) {
                console.error('评论容器不存在:', containerId);
                return;
            }
            
            // 创建评论区域HTML
            container.innerHTML = '<div class="comments-section" style="margin-top: 24px; background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">\
                <h4 style="color: #ff8a00; margin: 0 0 16px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px;">\
                    <i class="fas fa-comments" style="font-size: 20px;"></i>\
                    评论区\
                    <span id="comment-count-' + ownerId + '" style="font-size: 14px; color: #999; font-weight: normal;">(0)</span>\
                </h4>\
                \
                <!-- 发表评论表单 -->\
                <div class="comment-form" style="margin-bottom: 20px; background: #fff7ef; border: 2px solid #ffd3a1; border-radius: 12px; padding: 16px;">\
                    <textarea id="comment-input-' + ownerId + '" placeholder="说点什么吧..." style="width: 100%; min-height: 80px; padding: 12px; border: 1px solid #ffd3a1; border-radius: 8px; resize: vertical; font-size: 14px; font-family: inherit;"></textarea>\
                    <div style="margin-top: 12px; text-align: right;">\
                        <button onclick="CommentsWidget.postComment(\'' + ownerType + '\', \'' + ownerId + '\')" style="padding: 10px 24px; background: linear-gradient(135deg, #ff8a00, #ffb06b); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; box-shadow: 0 2px 6px rgba(255, 138, 0, 0.3); transition: transform 0.2s;">\
                            <i class="fas fa-paper-plane"></i> 发表评论\
                        </button>\
                    </div>\
                </div>\
                \
                <!-- 评论列表 -->\
                <div id="comments-list-' + ownerId + '" class="comments-list" style="display: flex; flex-direction: column; gap: 16px;">\
                    <div style="text-align: center; color: #999; padding: 20px;">加载中...</div>\
                </div>\
            </div>';
            
            // 加载评论列表
            this.loadComments(ownerType, ownerId);
        },
        
        // 加载评论列表
        loadComments: async function(ownerType, ownerId) {
            try {
                if (!window.API || typeof window.API.getComments !== 'function') {
                    console.warn('API不可用');
                    var listContainer = document.getElementById('comments-list-' + ownerId);
                    if (listContainer) {
                        listContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">暂无评论</div>';
                    }
                    return;
                }
                
                console.log('加载评论:', { ownerType: ownerType, ownerId: ownerId });
                console.log('完整请求参数:', 'ownerType=' + ownerType + ', ownerId=' + ownerId + ', page=1, pageSize=50');
                
                var result = await window.API.getComments(ownerType, ownerId, 1, 50);
                
                console.log('评论加载成功，数量:', result.total);
                console.log('评论列表:', result.list);
                
                var listContainer = document.getElementById('comments-list-' + ownerId);
                var countElem = document.getElementById('comment-count-' + ownerId);
                
                if (countElem) {
                    countElem.textContent = '(' + (result.total || 0) + ')';
                }
                
                if (!listContainer) return;
                
                if (!result.list || result.list.length === 0) {
                    listContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">暂无评论，快来抢沙发吧~</div>';
                    return;
                }
                
                // 获取当前用户信息
                var currentUser = null;
                try {
                    var userData = localStorage.getItem('currentUser');
                    if (userData) {
                        currentUser = JSON.parse(userData);
                    }
                } catch(e) {}
                
                // 渲染评论列表
                listContainer.innerHTML = result.list.map(function(comment) {
                    var commentId = comment.commentId || comment.comment_id || comment.id;
                    var authorId = comment.authorId || (comment.authorInfo && comment.authorInfo.userId);
                    var authorName = (comment.authorInfo && comment.authorInfo.name) || comment.authorName || '匿名用户';
                    var content = comment.content || '';
                    var createdAt = comment.createdAt || comment.created_at || '';
                    
                    // 格式化时间
                    var timeDisplay = formatTimeAgo(createdAt);
                    
                    // 修改删除按钮逻辑：始终显示删除按钮，让后端处理权限验证
                    var deleteButton = '<button onclick="CommentsWidget.deleteComment(\'' + ownerType + '\', \'' + ownerId + '\', \'' + commentId + '\')" style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 13px; padding: 4px 8px; border-radius: 4px; transition: background 0.2s;" title="删除评论" onmouseover="this.style.background=\'#ffe0e0\'" onmouseout="this.style.background=\'none\'">\
                        <i class="fas fa-trash-alt"></i> 删除\
                    </button>';
                    
                    // 调试：输出删除按钮生成信息
                    console.log('生成删除按钮:', {
                        commentId: commentId,
                        authorId: authorId,
                        currentUser: currentUser,
                        deleteButtonHtml: deleteButton
                    });
                    
                    return '<div class="comment-item" style="background: #fffaf5; border: 1px solid #ffe8d6; border-left: 4px solid #ff8a00; border-radius: 10px; padding: 16px; transition: box-shadow 0.2s;">\
                        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px;">\
                            <div style="display: flex; align-items: center; gap: 10px;">\
                                <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #ff8a00, #ffb06b); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; box-shadow: 0 2px 6px rgba(255, 138, 0, 0.3);">\
                                    ' + (authorName.charAt(0) || '?') + '\
                                </div>\
                                <div>\
                                    <div style="font-weight: 600; color: #333; font-size: 14px;">' + escapeHtml(authorName) + '</div>\
                                    <div style="font-size: 12px; color: #999; margin-top: 2px;">' + timeDisplay + '</div>\
                                </div>\
                            </div>\
                            ' + deleteButton + '\
                        </div>\
                        <div style="color: #555; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">' + escapeHtml(content) + '</div>\
                    </div>';
                }).join('');
                
            } catch(error) {
                console.error('加载评论失败:', error);
                var listContainer = document.getElementById('comments-list-' + ownerId);
                if (listContainer) {
                    listContainer.innerHTML = '<div style="text-align: center; color: #ff6b6b; padding: 20px;">加载评论失败</div>';
                }
            }
        },
        
        // 发表评论
        postComment: async function(ownerType, ownerId) {
            try {
                var inputElem = document.getElementById('comment-input-' + ownerId);
                if (!inputElem) return;
                
                var content = inputElem.value.trim();
                if (!content) {
                    alert('请输入评论内容');
                    return;
                }
                
                if (!window.API || typeof window.API.createComment !== 'function') {
                    alert('API不可用，无法发表评论');
                    return;
                }
                
                console.log('发表评论:', { ownerType: ownerType, ownerId: ownerId, content: content });
                
                var result = await window.API.createComment({
                    ownerType: ownerType,
                    ownerId: ownerId,
                    content: content
                });
                
                console.log('评论发表成功:', result);
                
                // 清空输入框
                inputElem.value = '';
                
                // 重新加载评论列表
                await this.loadComments(ownerType, ownerId);
                
                // 显示成功提示
                this.showToast('评论发表成功！', 'success');
                
            } catch(error) {
                console.error('发表评论失败:', error);
                alert('发表评论失败：' + (error.message || '请稍后重试'));
            }
        },
        
        // 删除评论
        deleteComment: async function(ownerType, ownerId, commentId) {
            console.log('删除评论函数被调用:', { ownerType: ownerType, ownerId: ownerId, commentId: commentId });
            
            if (!confirm('确定要删除这条评论吗？')) {
                console.log('用户取消删除操作');
                return;
            }
            
            console.log('用户确认删除操作，继续执行...');
            
            try {
                // 获取当前用户信息和token
                var currentUser = null;
                var authToken = null;
                try {
                    var userData = localStorage.getItem('currentUser');
                    var tokenData = localStorage.getItem('authToken');
                    if (userData) {
                        currentUser = JSON.parse(userData);
                    }
                    if (tokenData) {
                        authToken = JSON.parse(tokenData);
                    }
                } catch(e) {}
                
                console.log('当前用户信息:', currentUser);
                console.log('当前认证token:', authToken);
                
                // 确保获取到有效的用户ID
                var userId = currentUser ? (currentUser.userId || currentUser.id || currentUser.user_id) : null;
                
                if (!userId) {
                    // 尝试从API获取完整用户信息
                    try {
                        var fullUser = await window.API.getCurrentUserWithId();
                        if (fullUser) {
                            userId = fullUser.userId || fullUser.id || fullUser.user_id;
                        }
                    } catch(e) {
                        console.error('获取用户信息失败:', e);
                    }
                }
                
                if (!userId) {
                    alert('无法获取用户信息，请重新登录');
                    return;
                }
                
                // 确保userId有正确的前缀格式
                if (typeof userId === 'string' && !userId.includes('U-')) {
                    userId = 'U-' + userId;
                }
                
                if (!window.API || typeof window.API.deleteComment !== 'function') {
                    alert('API不可用，无法删除评论');
                    return;
                }
                
                console.log('删除评论:', { commentId: commentId, userId: userId });
                
                var result = await window.API.deleteComment(commentId, userId);
                
                console.log('评论删除成功:', result);
                
                // 重新加载评论列表
                await this.loadComments(ownerType, ownerId);
                
                // 显示成功提示
                this.showToast('评论已删除', 'success');
                
            } catch(error) {
                console.error('删除评论失败:', error);
                // 提供更友好的错误提示
                var errorMessage = '删除评论失败';
                if (error.message) {
                    if (error.message.includes('无权删除') || error.message.includes('403')) {
                        errorMessage = '您没有权限删除此评论';
                    } else if (error.message.includes('404')) {
                        errorMessage = '评论不存在或已被删除';
                    } else {
                        errorMessage = error.message;
                    }
                }
                alert(errorMessage);
            }
        },
        
        // 显示提示
        showToast: function(message, type) {
            var bgColor = type === 'success' ? 'linear-gradient(135deg, #4caf50, #66bb6a)' : 'linear-gradient(135deg, #f44336, #ef5350)';
            
            var toast = document.createElement('div');
            toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: ' + bgColor + '; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; font-size: 14px; animation: fadeIn 0.3s ease;';
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(function() {
                toast.style.animation = 'fadeOut 0.3s ease';
                setTimeout(function() {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        }
    };
    
    // 时间格式化函数
    function formatTimeAgo(timeStr) {
        if (!timeStr) return '';
        try {
            var time = new Date(timeStr);
            var now = new Date();
            var diff = now.getTime() - time.getTime();
            var minutes = Math.floor(diff / (1000 * 60));
            var hours = Math.floor(diff / (1000 * 60 * 60));
            var days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (minutes < 1) return '刚刚';
            if (minutes < 60) return minutes + '分钟前';
            if (hours < 24) return hours + '小时前';
            if (days < 7) return days + '天前';
            
            return time.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch(e) {
            return timeStr;
        }
    }
    
    // HTML转义函数
    function escapeHtml(text) {
        if (!text) return '';
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    // 添加动画样式
    if (!document.getElementById('comments-widget-styles')) {
        var style = document.createElement('style');
        style.id = 'comments-widget-styles';
        style.textContent = '\
            @keyframes fadeIn {\
                from { opacity: 0; }\
                to { opacity: 1; }\
            }\
            @keyframes fadeOut {\
                from { opacity: 1; }\
                to { opacity: 0; }\
            }\
            .comment-item:hover {\
                box-shadow: 0 2px 8px rgba(255, 138, 0, 0.1);\
            }\
        ';
        document.head.appendChild(style);
    }
})();

