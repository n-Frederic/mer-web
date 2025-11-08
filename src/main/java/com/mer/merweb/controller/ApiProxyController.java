package com.mer.merweb.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:8001", "http://127.0.0.1:8001"})
public class ApiProxyController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String backendUrl = "http://localhost:8080/api";

    @PostMapping({"/login", "/login/"})
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(loginData, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                backendUrl + "/login", 
                request, 
                Map.class
            );
            
            // 直接返回后端的响应，包括成功和错误情况
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
            
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // 处理4xx错误（如401认证失败、400请求错误等）
            try {
                // 尝试解析后端返回的错误信息
                Map<String, Object> errorBody = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(e.getResponseBodyAsString(), Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(errorBody);
            } catch (Exception parseError) {
                // 如果无法解析错误信息，返回通用错误
                return ResponseEntity.status(e.getStatusCode())
                        .body(Map.of("error", true, "message", "认证失败: " + e.getMessage()));
            }
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            // 处理5xx服务器错误
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", true, "message", "后端服务器错误: " + e.getMessage()));
        } catch (Exception e) {
            // 处理其他异常（如网络连接失败等）
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "连接后端失败: " + e.getMessage()));
        }
    }

    @GetMapping("/user")
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String role_id,
            @RequestParam(required = false) String team_id,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            String url = backendUrl + "/user?page=" + page + "&pageSize=" + pageSize;
            if (keyword != null && !keyword.isEmpty()) {
                url += "&keyword=" + keyword;
            }
            if (role_id != null && !role_id.isEmpty()) {
                url += "&role_id=" + role_id;
            }
            if (team_id != null && !team_id.isEmpty()) {
                url += "&team_id=" + team_id;
            }
            
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            // 后端返回的是用户数组，使用Object[]接收
            ResponseEntity<Object[]> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                request, 
                Object[].class
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "获取用户列表失败: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserById(@PathVariable Long userId,
                                        @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            // 后端返回的是用户对象，使用Object接收
            ResponseEntity<Object> response = restTemplate.exchange(
                backendUrl + "/user/" + userId, 
                HttpMethod.GET,
                request,
                Object.class
            );
            
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "获取用户详情失败: " + e.getMessage()));
        }
    }

    @PostMapping("/user")
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> userData, 
                                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(userData, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                backendUrl + "/user", 
                request, 
                Map.class
            );
            
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
            
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            try {
                Map<String, Object> errorBody = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(e.getResponseBodyAsString(), Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(errorBody);
            } catch (Exception parseError) {
                return ResponseEntity.status(e.getStatusCode())
                        .body(Map.of("ok", false, "message", "创建用户失败: " + e.getMessage()));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "message", "创建用户失败: " + e.getMessage()));
        }
    }

    @PutMapping("/user/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable Long userId, 
                                       @RequestBody Map<String, Object> userData,
                                       @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(userData, headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                backendUrl + "/user/" + userId,
                HttpMethod.PUT,
                request,
                Map.class
            );
            
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
            
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            try {
                Map<String, Object> errorBody = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(e.getResponseBodyAsString(), Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(errorBody);
            } catch (Exception parseError) {
                return ResponseEntity.status(e.getStatusCode())
                        .body(Map.of("ok", false, "message", "更新用户失败: " + e.getMessage()));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "message", "更新用户失败: " + e.getMessage()));
        }
    }

    @GetMapping("/tasks/all")
    public ResponseEntity<?> getAllTasks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            String url = backendUrl + "/tasks/all?page=" + page + "&pageSize=" + pageSize;
            if (status != null && !status.isEmpty()) {
                url += "&status=" + status;
            }
            if (priority != null && !priority.isEmpty()) {
                url += "&priority=" + priority;
            }
            
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                request, 
                Map.class
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "获取所有任务失败: " + e.getMessage()));
        }
    }
    
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<?> getTaskById(@PathVariable Long taskId,
                                        @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                backendUrl + "/tasks/" + taskId, 
                HttpMethod.GET,
                request,
                Map.class
            );
            
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "获取任务详情失败: " + e.getMessage()));
        }
    }

    @PostMapping("/send-verification-code/")
    public ResponseEntity<?> sendVerificationCode(@RequestBody Map<String, String> requestData) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestData, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                backendUrl + "/send-verification-code/", 
                request, 
                Map.class
            );
            
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "发送验证码失败: " + e.getMessage()));
        }
    }

    @PostMapping("/forgot-password/reset/")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> requestData) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestData, headers);
            
            // 后端接口路径不带末尾斜杠
            ResponseEntity<Map> response = restTemplate.postForEntity(
                backendUrl + "/forgot-password/reset",
                request, 
                Map.class
            );
            
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "重置密码失败: " + e.getMessage()));
        }
    }

    @GetMapping("/user/profile")
    public ResponseEntity<?> getProfile(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                backendUrl + "/user/profile", 
                HttpMethod.GET,
                request,
                Map.class
            );
            
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            try {
                Map<String, Object> errorBody = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(e.getResponseBodyAsString(), Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(errorBody);
            } catch (Exception parseError) {
                return ResponseEntity.status(e.getStatusCode())
                        .body(Map.of("ok", false, "error", "Unauthorized"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "error", "Internal Server Error"));
        }
    }

    @PutMapping("/user/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody Map<String, Object> profileData) {
        try {
            // 创建请求头
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            // 创建请求实体
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(profileData, headers);
            
            // 发送PUT请求到后端
            ResponseEntity<Map> response = restTemplate.exchange(
                backendUrl + "/user/profile",
                HttpMethod.PUT,
                request,
                Map.class
            );
            
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            try {
                Map<String, Object> errorBody = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(e.getResponseBodyAsString(), Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(errorBody);
            } catch (Exception parseError) {
                return ResponseEntity.status(e.getStatusCode())
                        .body(Map.of("ok", false, "error", "Update failed"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "error", "Internal Server Error"));
        }
    }

    @PostMapping("/user/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(Map.of(), headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                backendUrl + "/user/logout", 
                request, 
                Map.class
            );
            
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            try {
                Map<String, Object> errorBody = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(e.getResponseBodyAsString(), Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(errorBody);
            } catch (Exception parseError) {
                return ResponseEntity.status(e.getStatusCode())
                        .body(Map.of("ok", false, "message", "退出登录失败: " + e.getMessage()));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "message", "退出登录失败: " + e.getMessage()));
        }
    }

    // ==================== 个人日志相关API ====================
    
    /**
     * 获取个人日志列表
     * GET /api/journals/
     */
    @GetMapping("/journals/")
    public ResponseEntity<?> getJournals(
            @RequestParam(required = false) String date,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "9") int pageSize,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            // 不传递date参数，让后端查询所有日期的日志
            String url = backendUrl + "/journals/?page=" + page + "&pageSize=" + pageSize;
            // if (date != null && !date.isEmpty()) {
            //     url += "&date=" + date;
            // }
            
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                request, 
                Map.class
            );
            return ResponseEntity.ok(response.getBody());
        } catch (org.springframework.web.client.HttpServerErrorException e) {
            // 后端500错误，返回更友好的错误信息
            return ResponseEntity.ok(Map.of(
                "list", new java.util.ArrayList<>(),
                "total", 0,
                "page", page,
                "pageSize", pageSize,
                "error", true,
                "message", "日志数据加载失败，可能存在数据不一致问题。请联系管理员检查数据库。"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                        "error", true, 
                        "message", "获取日志列表失败: " + e.getMessage(),
                        "list", new java.util.ArrayList<>(),
                        "total", 0
                    ));
        }
    }

    /**
     * 创建工作日志
     * POST /api/journals/
     */
    @PostMapping("/journals/")
    public ResponseEntity<?> createJournal(
            @RequestBody Map<String, Object> journalData,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(journalData, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                backendUrl + "/journals/", 
                request, 
                Map.class
            );
            
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
            
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            try {
                Map<String, Object> errorBody = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(e.getResponseBodyAsString(), Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(errorBody);
            } catch (Exception parseError) {
                return ResponseEntity.status(e.getStatusCode())
                        .body(Map.of("ok", false, "message", "创建日志失败: " + e.getMessage()));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "message", "创建日志失败: " + e.getMessage()));
        }
    }

    // ==================== 团队管理相关API ====================
    
    @GetMapping("/team/{teamId}")
    public ResponseEntity<?> getTeamName(
            @PathVariable Long teamId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            String url = backendUrl + "/team/" + teamId;
            
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                request,
                Map.class
            );
            
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
            
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            try {
                Map<String, Object> errorBody = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(e.getResponseBodyAsString(), Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(errorBody);
            } catch (Exception parseError) {
                return ResponseEntity.status(e.getStatusCode())
                        .body(Map.of("ok", false, "message", "查询编号对应团队失败"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "message", "查询编号对应团队失败: " + e.getMessage()));
        }
    }

    // ==================== 任务管理相关API ====================
    
    /**
     * 创建任务
     * POST /api/tasks
     */
    @PostMapping("/tasks")
    public ResponseEntity<?> createTask(
            @RequestBody Map<String, Object> taskData,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(taskData, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                backendUrl + "/tasks",
                request,
                Map.class
            );
            
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
            
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            try {
                Map<String, Object> errorBody = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(e.getResponseBodyAsString(), Map.class);
                return ResponseEntity.status(e.getStatusCode()).body(errorBody);
            } catch (Exception parseError) {
                return ResponseEntity.status(e.getStatusCode())
                        .body(Map.of("ok", false, "error", "创建任务失败: " + e.getMessage()));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "error", "创建任务失败: " + e.getMessage()));
        }
    }

    /**
     * 获取个人任务列表
     * GET /api/tasks/personal
     */
    @GetMapping("/tasks/personal")
    public ResponseEntity<?> getPersonalTasks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            String url = backendUrl + "/tasks/personal?page=" + page + "&pageSize=" + pageSize;
            if (status != null && !status.isEmpty()) {
                url += "&status=" + status;
            }
            if (priority != null && !priority.isEmpty()) {
                url += "&priority=" + priority;
            }
            
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                request,
                Map.class
            );
            
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "error", "获取个人任务失败: " + e.getMessage()));
        }
    }

    /**
     * 获取可见任务列表
     * GET /api/tasks/myView
     */
    @GetMapping("/tasks/myView")
    public ResponseEntity<?> getViewTasks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            String url = backendUrl + "/tasks/myView?page=" + page + "&pageSize=" + pageSize;
            if (status != null && !status.isEmpty()) {
                url += "&status=" + status;
            }
            if (priority != null && !priority.isEmpty()) {
                url += "&priority=" + priority;
            }
            
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authorization != null) {
                headers.set("Authorization", authorization);
            }
            
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                request,
                Map.class
            );
            
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("ok", false, "error", "获取可见任务失败: " + e.getMessage()));
        }
    }

    /**
     * 代理获取公司重要事项
     * GET /api/company-tasks/important
     */
    @GetMapping("/company-tasks/important")
    public ResponseEntity<?> getImportantTasks(@RequestHeader(value = "Authorization", required = false) String authorization) {
        try {
            // 创建请求头并添加 Authorization
            HttpHeaders headers = new HttpHeaders();
            if (authorization != null && !authorization.isEmpty()) {
                headers.set("Authorization", authorization);
            }
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            // 转发到后端
            ResponseEntity<Map> response = restTemplate.exchange(
                    backendUrl + "/company-tasks/important",
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("tasks", new String[]{}));
        }
    }
}
