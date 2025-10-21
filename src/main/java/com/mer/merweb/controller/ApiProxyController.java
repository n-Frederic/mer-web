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
            @RequestParam(required = false) String team_id) {
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
            
            // 后端返回的是用户数组，使用Object[]接收
            ResponseEntity<Object[]> response = restTemplate.getForEntity(url, Object[].class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "获取用户列表失败: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserById(@PathVariable Long userId) {
        try {
            // 后端返回的是用户对象，使用Object接收
            ResponseEntity<Object> response = restTemplate.getForEntity(
                backendUrl + "/user/" + userId, 
                Object.class
            );
            
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "获取用户详情失败: " + e.getMessage()));
        }
    }

    @GetMapping("/tasks/personal")
    public ResponseEntity<?> getPersonalTasks(
            @RequestParam String userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        try {
            String url = backendUrl + "/tasks/personal?userId=" + userId + 
                        "&page=" + page + "&pageSize=" + pageSize;
            if (status != null && !status.isEmpty()) {
                url += "&status=" + status;
            }
            if (priority != null && !priority.isEmpty()) {
                url += "&priority=" + priority;
            }
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "获取个人任务失败: " + e.getMessage()));
        }
    }

    @GetMapping("/tasks/all")
    public ResponseEntity<?> getAllTasks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        try {
            String url = backendUrl + "/tasks/all?page=" + page + "&pageSize=" + pageSize;
            if (status != null && !status.isEmpty()) {
                url += "&status=" + status;
            }
            if (priority != null && !priority.isEmpty()) {
                url += "&priority=" + priority;
            }
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "获取所有任务失败: " + e.getMessage()));
        }
    }
    
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<?> getTaskById(@PathVariable Long taskId) {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                backendUrl + "/tasks/" + taskId, 
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
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                backendUrl + "/forgot-password/reset/", 
                request, 
                Map.class
            );
            
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", true, "message", "重置密码失败: " + e.getMessage()));
        }
    }
}
