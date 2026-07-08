package handler

import (
	"net/http"

	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

// ReminderHandler handles reminder routes.
type ReminderHandler struct {
	q        *sqlc.Queries
	log      *zap.Logger
	validate *validator.Validate
}

// NewReminderHandler constructs a ReminderHandler.
func NewReminderHandler(q *sqlc.Queries, log *zap.Logger, v *validator.Validate) *ReminderHandler {
	return &ReminderHandler{q: q, log: log, validate: v}
}

type reminderResp struct {
	ID        string `json:"id"`
	EventID   string `json:"eventId"`
	LeadDays  int32  `json:"leadDays"`
	FiredAt   string `json:"firedAt"`
	CreatedAt string `json:"createdAt"`
}

func toReminderResp(r sqlc.Reminder) reminderResp {
	resp := reminderResp{
		ID:        r.ID.String(),
		EventID:   r.EventID.String(),
		LeadDays:  r.LeadDays,
		CreatedAt: tsToStr(r.CreatedAt),
	}
	if r.FiredAt.Valid {
		resp.FiredAt = tsToStr(r.FiredAt)
	}
	return resp
}

type reminderInput struct {
	EventID  string `json:"eventId" validate:"required"`
	LeadDays int32  `json:"leadDays" validate:"min=0,max=60"`
}

// List returns all reminders owned by the authenticated user.
func (h *ReminderHandler) List(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	reminders, err := h.q.ListRemindersByOwner(c.Request.Context(), owner)
	if err != nil {
		fail(c, http.StatusInternalServerError, "failed to list reminders")
		return
	}
	out := make([]reminderResp, 0, len(reminders))
	for _, r := range reminders {
		out = append(out, toReminderResp(r))
	}
	c.JSON(http.StatusOK, out)
}

// Create adds a new reminder for an event owned by the authenticated user.
func (h *ReminderHandler) Create(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	var in reminderInput
	if err := c.ShouldBindJSON(&in); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(in); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	var eventID pgtype.UUID
	if err := eventID.Scan(in.EventID); err != nil {
		fail(c, http.StatusBadRequest, "invalid eventId")
		return
	}
	r, err := h.q.CreateReminder(c.Request.Context(), sqlc.CreateReminderParams{
		OwnerUserID: owner,
		EventID:     eventID,
		LeadDays:    in.LeadDays,
	})
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusCreated, toReminderResp(r))
}

// Fire marks a reminder as fired (owner-scoped).
func (h *ReminderHandler) Fire(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	if err := h.q.MarkReminderFired(c.Request.Context(), sqlc.MarkReminderFiredParams{
		ID:          id,
		OwnerUserID: owner,
	}); err != nil {
		fail(c, http.StatusInternalServerError, "update failed")
		return
	}
	c.Status(http.StatusNoContent)
}
