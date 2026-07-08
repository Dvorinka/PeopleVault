// Package middleware contains Gin middlewares for cross-cutting concerns:
// auth, CSRF, rate limiting, request IDs, recovery, CORS, and security headers.
package middleware

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// Context keys for values injected by middleware.
type ctxKey string

const (
	// UserIDKey holds the authenticated user's UUID (string form).
	UserIDKey ctxKey = "user_id"
	// RequestIDKey holds the per-request correlation ID.
	RequestIDKey ctxKey = "request_id"
)

// RequestID injects a unique request ID (X-Request-Id header / context).
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		rid := c.GetHeader("X-Request-Id")
		if rid == "" {
			rid = uuid.NewString()
		}
		c.Set(string(RequestIDKey), rid)
		c.Header("X-Request-Id", rid)
		ctx := context.WithValue(c.Request.Context(), RequestIDKey, rid)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// Recover catches panics, logs them, and returns 500.
func Recover(log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.Error("panic recovered",
					zap.Any("panic", r),
					zap.String("path", c.Request.URL.Path),
					zap.String("request_id", c.GetString(string(RequestIDKey))))
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error": "internal server error",
				})
			}
		}()
		c.Next()
	}
}

// SecurityHeaders sets common defensive headers on all responses.
func SecurityHeaders(production bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		// Restrictive API CSP: no inline scripts/styles, no framing.
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		if production {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

// CORS allows configured origins with credentials. Preflight uses 204.
func CORS(allowed []string) gin.HandlerFunc {
	allowSet := make(map[string]struct{}, len(allowed))
	for _, o := range allowed {
		allowSet[o] = struct{}{}
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if _, ok := allowSet[origin]; ok {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Access-Control-Allow-Credentials", "true")
				c.Header("Access-Control-Allow-Headers",
					"Content-Type, Authorization, X-Requested-With, X-Request-Id, X-CSRF-Token")
				c.Header("Access-Control-Allow-Methods",
					"GET, POST, PUT, DELETE, PATCH, OPTIONS")
				c.Header("Vary", "Origin")
			}
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// CSRF protects mutating requests using the Origin/Referer check (a robust
// defense for cookie-auth APIs that do not allow wildcards). Mutating methods
// must have an Origin/Referer matching a trusted origin.
func CSRF(trusted []string) gin.HandlerFunc {
	trustedSet := make(map[string]struct{}, len(trusted))
	for _, t := range trusted {
		trustedSet[t] = struct{}{}
	}
	return func(c *gin.Context) {
		if !isMutating(c.Request.Method) {
			c.Next()
			return
		}
		origin := c.GetHeader("Origin")
		if origin == "" {
			origin = c.GetHeader("Referer")
			// Strip path from Referer to compare origins only.
			if i := strings.Index(origin, "://"); i >= 0 {
				rest := origin[i+3:]
				if j := strings.Index(rest, "/"); j >= 0 {
					origin = origin[:i+3] + rest[:j]
				}
			}
		}
		if origin == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "missing origin"})
			return
		}
		if _, ok := trustedSet[origin]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "untrusted origin"})
			return
		}
		c.Next()
	}
}

func isMutating(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	}
	return false
}

// RateLimit uses a DragonflyDB/Redis sliding-window counter per IP for the
// given endpoint group. If Redis is unavailable, the request is allowed.
func RateLimit(rdb *redis.Client, perMinute int, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		if rdb == nil || perMinute <= 0 {
			c.Next()
			return
		}
		key := "rl:" + c.FullPath() + ":" + clientIP(c)
		ctx, cancel := context.WithTimeout(c.Request.Context(), 500*time.Millisecond)
		defer cancel()

		now := time.Now().Unix()
		pipe := rdb.Pipeline()
		// Remove entries older than 60s.
		pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(now-60, 10))
		// Count current window.
		cnt := pipe.ZCard(ctx, key)
		// Add this request.
		member := uuid.NewString()
		pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: member})
		pipe.Expire(ctx, key, 70*time.Second)
		if _, err := pipe.Exec(ctx); err != nil {
			// Fail open: do not block on cache errors.
			log.Warn("rate limit cache error", zap.Error(err))
			c.Next()
			return
		}
		if cnt.Val() >= int64(perMinute) {
			c.Header("Retry-After", "60")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "rate limit exceeded",
			})
			return
		}
		c.Next()
	}
}

func clientIP(c *gin.Context) string {
	if ip := c.ClientIP(); ip != "" {
		return ip
	}
	return "unknown"
}

// strconv import shim (kept to avoid unused import in some build configs).
var _ = strconv.Itoa