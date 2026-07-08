package handler

import (
	"net/http"

	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

// TimelineHandler handles timeline entry routes.
type TimelineHandler struct {
	q        *sqlc.Queries
	log      *zap.Logger
	validate *validator.Validate
}

// NewTimelineHandler constructs a TimelineHandler.
func NewTimelineHandler(q *sqlc.Queries, log *zap.Logger, v *validator.Validate) *TimelineHandler {
	return &TimelineHandler{q: q, log: log, validate: v}
}

type timelineResp struct {
	ID         string `json:"id"`
	PersonID   string `json:"personId"`
	Type       string `json:"type"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	OccurredOn string `json:"occurredOn"`
	CreatedAt  string `json:"createdAt"`
}

func toTimelineResp(t sqlc.TimelineEntry) timelineResp {
	r := timelineResp{
		ID:        t.ID.String(),
		PersonID:  t.PersonID.String(),
		Type:      t.Type,
		Title:     ptrToStr(t.Title),
		Body:      ptrToStr(t.Body),
		OccurredOn: dateToStr(t.OccurredOn),
		CreatedAt: tsToStr(t.CreatedAt),
	}
	return r
}

type timelineInput struct {
	PersonID   string `json:"personId" validate:"required"`
	Type       string `json:"type" validate:"required,oneof=birthday anniversary met gift vacation achievement memory photo reminder note"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	OccurredOn string `json:"occurredOn"`
}

// List returns timeline entries for a person (owner-scoped).
func (h *TimelineHandler) List(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	personID, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	entries, err := h.q.ListTimelineByPerson(c.Request.Context(), sqlc.ListTimelineByPersonParams{
		PersonID:    personID,
		OwnerUserID: owner,
	})
	if err != nil {
		fail(c, http.StatusInternalServerError, "failed to list timeline")
		return
	}
	out := make([]timelineResp, 0, len(entries))
	for _, t := range entries {
		out = append(out, toTimelineResp(t))
	}
	c.JSON(http.StatusOK, out)
}

// Create adds a timeline entry for a person (owner-scoped).
func (h *TimelineHandler) Create(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	personID, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	var in timelineInput
	if err := c.ShouldBindJSON(&in); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(in); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	t, err := h.q.CreateTimelineEntry(c.Request.Context(), sqlc.CreateTimelineEntryParams{
		PersonID:    personID,
		OwnerUserID: owner,
		Type:        in.Type,
		Title:       strToPtr(in.Title),
		Body:        strToPtr(in.Body),
		OccurredOn:  parseDate(in.OccurredOn),
	})
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusCreated, toTimelineResp(t))
}

// Delete removes a timeline entry (owner-scoped).
func (h *TimelineHandler) Delete(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	if err := h.q.DeleteTimelineEntry(c.Request.Context(), sqlc.DeleteTimelineEntryParams{
		ID:          id,
		OwnerUserID: owner,
	}); err != nil {
		fail(c, http.StatusInternalServerError, "delete failed")
		return
	}
	c.Status(http.StatusNoContent)
}

// _ keeps pgtype referenced even if unused in some build paths.
var _ pgtype.UUID
