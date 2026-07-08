package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/dvorinka/peoplevault/internal/auth"
	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

// AuthRequired validates the session cookie, loads the user, and injects the
// user_id into the gin context. Aborts with 401 if unauthenticated.
func AuthRequired(q *sqlc.Queries, cookieName string, log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(cookieName)
		if err != nil || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		hash := auth.HashToken(token)

		ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
		defer cancel()

		sess, err := q.GetSessionByTokenHash(ctx, hash)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		if !sess.ExpiresAt.Valid || sess.ExpiresAt.Time.Before(time.Now()) {
			// Expired: best-effort cleanup.
			_ = q.DeleteSession(ctx, sess.ID)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session expired"})
			return
		}

		user, err := q.GetUserByID(ctx, sess.UserID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Set(string(UserIDKey), user.ID.String())
		c.Set("user_email", user.Email)
		c.Next()
	}
}

// UserID extracts the authenticated user's UUID (pgtype) from the context.
// Returns not valid if unauthenticated.
func UserID(c *gin.Context) pgtype.UUID {
	v, ok := c.Get(string(UserIDKey))
	if !ok {
		return pgtype.UUID{}
	}
	s, ok := v.(string)
	if !ok {
		return pgtype.UUID{}
	}
	var u pgtype.UUID
	_ = u.Scan(s)
	return u
}
