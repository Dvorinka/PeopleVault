package handler

import (
	"net/http"

	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/dvorinka/peoplevault/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

// UserHandler handles user profile and settings routes.
type UserHandler struct {
	q        *sqlc.Queries
	log      *zap.Logger
	validate *validator.Validate
}

// NewUserHandler constructs a UserHandler.
func NewUserHandler(q *sqlc.Queries, log *zap.Logger, v *validator.Validate) *UserHandler {
	return &UserHandler{q: q, log: log, validate: v}
}

type userSettingsResp struct {
	NamedayCountry          string `json:"namedayCountry"`
	Theme                   string `json:"theme"`
	DefaultReminderLeadDays int32  `json:"defaultReminderLeadDays"`
	Onboarded               bool   `json:"onboarded"`
}

func (h *UserHandler) toSettingsResp(s sqlc.UserSetting) userSettingsResp {
	return userSettingsResp{
		NamedayCountry:          s.NamedayCountry,
		Theme:                   s.Theme,
		DefaultReminderLeadDays: s.DefaultReminderLeadDays,
		Onboarded:               s.Onboarded,
	}
}

type userSettingsInput struct {
	NamedayCountry          string `json:"namedayCountry" validate:"required"`
	Theme                   string `json:"theme" validate:"required,oneof=light dark system"`
	DefaultReminderLeadDays int32  `json:"defaultReminderLeadDays" validate:"min=0,max=60"`
	Onboarded               bool   `json:"onboarded"`
}

// Me returns the authenticated user's profile.
func (h *UserHandler) Me(c *gin.Context) {
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
	r := userResp{
		ID:            user.ID.String(),
		Email:         user.Email,
		EmailVerified: user.EmailVerifiedAt.Valid,
		CreatedAt:     tsToStr(user.CreatedAt),
	}
	if user.Name != nil {
		r.Name = *user.Name
	}
	c.JSON(http.StatusOK, r)
}

// GetSettings returns the authenticated user's settings.
func (h *UserHandler) GetSettings(c *gin.Context) {
	uid, ok := ensureUserID(c)
	if !ok {
		return
	}
	s, err := h.q.GetUserSettings(c.Request.Context(), uid)
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusOK, h.toSettingsResp(s))
}

// UpdateSettings upserts the authenticated user's settings.
func (h *UserHandler) UpdateSettings(c *gin.Context) {
	uid, ok := ensureUserID(c)
	if !ok {
		return
	}
	var in userSettingsInput
	if err := c.ShouldBindJSON(&in); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(in); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	s, err := h.q.UpdateUserSettings(c.Request.Context(), sqlc.UpdateUserSettingsParams{
		UserID:                  uid,
		NamedayCountry:          in.NamedayCountry,
		Theme:                   in.Theme,
		DefaultReminderLeadDays: in.DefaultReminderLeadDays,
		Onboarded:               in.Onboarded,
	})
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusOK, h.toSettingsResp(s))
}

// ensureUserID is a guard returning the authenticated user id or aborting.
func ensureUserID(c *gin.Context) (pgtype.UUID, bool) {
	uid := middleware.UserID(c)
	if !uid.Valid {
		fail(c, http.StatusUnauthorized, "unauthorized")
		return pgtype.UUID{}, false
	}
	return uid, true
}
