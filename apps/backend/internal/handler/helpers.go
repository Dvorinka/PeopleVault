// Package handler contains Gin HTTP handlers for all PeopleVault API routes.
package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// errResp is the standard JSON error envelope.
type errResp struct {
	Error  string `json:"error"`
	Detail string `json:"detail,omitempty"`
}

// fail writes a structured error response.
func fail(c *gin.Context, status int, msg string) {
	c.AbortWithStatusJSON(status, errResp{Error: msg})
}

// failDetail writes a structured error response with a detail field.
func failDetail(c *gin.Context, status int, msg, detail string) {
	c.AbortWithStatusJSON(status, errResp{Error: msg, Detail: detail})
}

// mapDBError translates common pgx errors into HTTP status codes.
func mapDBError(err error) (int, string) {
	if err == nil {
		return http.StatusOK, ""
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return http.StatusNotFound, "not found"
	}
	// pgconn.PgError with unique violation code 23505 -> conflict.
	if isUniqueViolation(err) {
		return http.StatusConflict, "already exists"
	}
	return http.StatusInternalServerError, "internal error"
}

// parseUUID parses a path param into a pgtype.UUID. Returns false on failure.
func parseUUID(c *gin.Context, key string) (pgtype.UUID, bool) {
	var u pgtype.UUID
	if err := u.Scan(c.Param(key)); err != nil {
		fail(c, http.StatusBadRequest, "invalid id")
		return pgtype.UUID{}, false
	}
	return u, true
}

// ptr returns a pointer to v.
func ptr[T any](v T) *T { return &v }

// strToPtr returns nil for empty strings, else a pointer.
func strToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// ptrToStr dereferences a *string safely.
func ptrToStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// int32PtrToVal dereferences an *int32, returning 0 if nil.
func int32PtrToVal(i *int32) int32 {
	if i == nil {
		return 0
	}
	return *i
}

// valToInt32Ptr returns nil for zero, else a pointer.
func valToInt32Ptr(i int32) *int32 {
	if i == 0 {
		return nil
	}
	return &i
}

// parseDate parses a YYYY-MM-DD string into a pgtype.Date.
func parseDate(s string) pgtype.Date {
	var d pgtype.Date
	if s == "" {
		return d
	}
	_ = d.Scan(s)
	return d
}

// dateToStr returns the YYYY-MM-DD form of a pgtype.Date, or "" if invalid.
func dateToStr(d pgtype.Date) string {
	if !d.Valid {
		return ""
	}
	return d.Time.Format("2006-01-02")
}

// tsToStr returns RFC3339 form of a pgtype timestamptz, or "" if invalid.
func tsToStr(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return t.Time.Format("2006-01-02T15:04:05Z07:00")
}

// nowUTC returns the current time in UTC.
func nowUTC() time.Time { return time.Now().UTC() }
