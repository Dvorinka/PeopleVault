package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/dvorinka/peoplevault/internal/auth"
	"github.com/dvorinka/peoplevault/internal/config"
	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/dvorinka/peoplevault/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

// AuthHandler handles authentication routes.
type AuthHandler struct {
	q        *sqlc.Queries
	log      *zap.Logger
	cfg      config.Config
	validate *validator.Validate
}

// NewAuthHandler constructs an AuthHandler.
func NewAuthHandler(q *sqlc.Queries, log *zap.Logger, cfg config.Config, v *validator.Validate) *AuthHandler {
	return &AuthHandler{q: q, log: log, cfg: cfg, validate: v}
}

type registerReq struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=12"`
	Name     string `json:"name" validate:"omitempty,max=100"`
}

type userResp struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	EmailVerified bool   `json:"emailVerified"`
	CreatedAt     string `json:"createdAt"`
}

func (h *AuthHandler) toUserResp(u sqlc.User) userResp {
	r := userResp{
		ID:            u.ID.String(),
		Email:         u.Email,
		EmailVerified: u.EmailVerifiedAt.Valid,
		CreatedAt:     tsToStr(u.CreatedAt),
	}
	if u.Name != nil {
		r.Name = *u.Name
	}
	return r
}

// Register creates a user, default settings, and a session.
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(req); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		failDetail(c, http.StatusBadRequest, "invalid password", err.Error())
		return
	}

	var namePtr *string
	if req.Name != "" {
		namePtr = &req.Name
	}

	user, err := h.q.CreateUser(c.Request.Context(), sqlc.CreateUserParams{
		Email:        req.Email,
		PasswordHash: hash,
		Name:         namePtr,
	})
	if err != nil {
		status, msg := mapDBError(err)
		if status == http.StatusConflict {
			fail(c, status, "email already registered")
			return
		}
		fail(c, status, msg)
		return
	}

	// Default settings.
	_, _ = h.q.UpdateUserSettings(c.Request.Context(), sqlc.UpdateUserSettingsParams{
		UserID:                  user.ID,
		NamedayCountry:          "CZ",
		Theme:                   "system",
		DefaultReminderLeadDays: 7,
		Onboarded:               false,
	})

	h.audit(c, user.ID, "register", "user", user.ID)

	if err := h.setSession(c, user.ID, false); err != nil {
		failDetail(c, http.StatusInternalServerError, "session error", err.Error())
		return
	}
	c.JSON(http.StatusCreated, h.toUserResp(user))
}

type loginReq struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required"`
	RememberMe bool  `json:"rememberMe"`
}

// Login verifies credentials and establishes a session.
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(req); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	user, err := h.q.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil || !auth.VerifyPassword(user.PasswordHash, req.Password) {
		fail(c, http.StatusUnauthorized, "invalid credentials")
		return
	}
	h.audit(c, user.ID, "login", "user", user.ID)
	if err := h.setSession(c, user.ID, req.RememberMe); err != nil {
		failDetail(c, http.StatusInternalServerError, "session error", err.Error())
		return
	}
	c.JSON(http.StatusOK, h.toUserResp(user))
}

// Logout deletes the current session and clears the cookie.
func (h *AuthHandler) Logout(c *gin.Context) {
	token, _ := c.Cookie(h.cfg.AuthSessionCookie)
	if token != "" {
		hash := auth.HashToken(token)
		if sess, err := h.q.GetSessionByTokenHash(c.Request.Context(), hash); err == nil {
			_ = h.q.DeleteSession(c.Request.Context(), sess.ID)
			h.audit(c, sess.UserID, "logout", "user", sess.UserID)
		}
	}
	h.clearSessionCookie(c)
	c.Status(http.StatusNoContent)
}

// Me returns the currently authenticated user.
func (h *AuthHandler) Me(c *gin.Context) {
	uid := middleware.UserID(c)
	if !uid.Valid {
		fail(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	user, err := h.q.GetUserByID(c.Request.Context(), uid)
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusOK, h.toUserResp(user))
}

type forgotPasswordReq struct {
	Email string `json:"email" validate:"required,email"`
}

// ForgotPassword always returns 204 to prevent email enumeration. A real
// implementation would email a reset token; here we just audit the request.
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req forgotPasswordReq
	_ = c.ShouldBindJSON(&req)
	if req.Email != "" {
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))
		if user, err := h.q.GetUserByEmail(c.Request.Context(), req.Email); err == nil {
			h.audit(c, user.ID, "forgot_password", "user", user.ID)
		}
	}
	c.Status(http.StatusNoContent)
}

type resetPasswordReq struct {
	Token    string `json:"token" validate:"required"`
	Password string `json:"password" validate:"required,min=12"`
}

// ResetPassword resets a password using a previously-issued token. Without a
// token store, this is a stub that validates inputs and audits the attempt.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req resetPasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(req); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	// Token verification would look up a stored reset token here.
	fail(c, http.StatusBadRequest, "invalid or expired token")
}

type verifyEmailReq struct {
	Token string `json:"token" validate:"required"`
}

// VerifyEmail verifies an email using a previously-issued token. Stubbed.
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var req verifyEmailReq
	if err := c.ShouldBindJSON(&req); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	// Token verification would look up a stored verification token here.
	fail(c, http.StatusBadRequest, "invalid token")
}

// setSession creates a session row and sets the auth cookie.
func (h *AuthHandler) setSession(c *gin.Context, userID pgtype.UUID, rememberMe bool) error {
	token, err := auth.GenerateToken()
	if err != nil {
		return err
	}
	ttl := h.cfg.AuthSessionTTL
	if rememberMe {
		ttl = h.cfg.AuthRememberMeTTL
	}
	expiresAt := time.Now().Add(ttl)
	ip := ptr(c.ClientIP())
	ua := ptr(c.GetHeader("User-Agent"))

	if _, err := h.q.CreateSession(c.Request.Context(), sqlc.CreateSessionParams{
		UserID:     userID,
		TokenHash:  auth.HashToken(token),
		RememberMe: rememberMe,
		ExpiresAt: pgtype.Timestamptz{
			Time:  expiresAt,
			Valid: true,
		},
		Ip:        ip,
		UserAgent: ua,
	}); err != nil {
		return err
	}
	h.setSessionCookie(c, token, expiresAt)
	return nil
}

func (h *AuthHandler) setSessionCookie(c *gin.Context, token string, expires time.Time) {
	secure := h.cfg.IsProduction()
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(h.cfg.AuthSessionCookie, token, int(time.Until(expires).Seconds()), "/", "", secure, true)
}

func (h *AuthHandler) clearSessionCookie(c *gin.Context) {
	secure := h.cfg.IsProduction()
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(h.cfg.AuthSessionCookie, "", -1, "/", "", secure, true)
}

// audit writes an audit_log row for sensitive actions. Errors are logged but
// never bubble up to the caller.
func (h *AuthHandler) audit(c *gin.Context, userID pgtype.UUID, action, entity string, entityID pgtype.UUID) {
	ip := ptr(c.ClientIP())
	_, err := h.q.CreateAuditLog(c.Request.Context(), sqlc.CreateAuditLogParams{
		UserID:    userID,
		Action:    action,
		Entity:    &entity,
		EntityID:  entityID,
		Ip:        ip,
		Meta:      []byte("{}"),
	})
	if err != nil {
		h.log.Warn("audit log write failed", zap.String("action", action), zap.Error(err))
	}
}

// Healthz is a simple liveness probe.
func Healthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// uuidParse is a helper for handlers that need to parse a UUID string outside
// of a path param (e.g. from JSON body).
func uuidParse(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	if s == "" {
		return u, errors.New("empty uuid")
	}
	parsed, err := uuid.Parse(s)
	if err != nil {
		return u, err
	}
	u.Bytes = parsed
	u.Valid = true
	return u, nil
}
