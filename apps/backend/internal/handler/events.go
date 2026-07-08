package handler

import (
	"net/http"
	"strconv"

	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

// EventHandler handles event routes.
type EventHandler struct {
	q        *sqlc.Queries
	log      *zap.Logger
	validate *validator.Validate
}

// NewEventHandler constructs an EventHandler.
func NewEventHandler(q *sqlc.Queries, log *zap.Logger, v *validator.Validate) *EventHandler {
	return &EventHandler{q: q, log: log, validate: v}
}

type eventResp struct {
	ID             string `json:"id"`
	PersonID       string `json:"personId"`
	Title          string `json:"title"`
	Type           string `json:"type"`
	EventDate      string `json:"eventDate"`
	IsRecurring    bool   `json:"isRecurring"`
	RecurrenceRule string `json:"recurrenceRule"`
	Notes          string `json:"notes"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
}

func toEventResp(e sqlc.Event) eventResp {
	r := eventResp{
		ID:          e.ID.String(),
		Title:       e.Title,
		Type:        e.Type,
		EventDate:   dateToStr(e.EventDate),
		IsRecurring: e.IsRecurring,
		Notes:       ptrToStr(e.Notes),
		CreatedAt:   tsToStr(e.CreatedAt),
		UpdatedAt:   tsToStr(e.UpdatedAt),
	}
	if e.PersonID.Valid {
		r.PersonID = e.PersonID.String()
	}
	if e.RecurrenceRule != nil {
		r.RecurrenceRule = *e.RecurrenceRule
	}
	return r
}

type eventInput struct {
	PersonID       string `json:"personId"`
	Title          string `json:"title" validate:"required,max=200"`
	Type           string `json:"type" validate:"required,oneof=birthday anniversary nameday wedding graduation holiday custom"`
	EventDate      string `json:"eventDate" validate:"required"`
	IsRecurring    *bool  `json:"isRecurring"`
	RecurrenceRule string `json:"recurrenceRule"`
	Notes          string `json:"notes"`
}

func (in eventInput) toCreateParams(owner pgtype.UUID, personID pgtype.UUID) sqlc.CreateEventParams {
	return sqlc.CreateEventParams{
		OwnerUserID:    owner,
		PersonID:       personID,
		Title:          in.Title,
		Type:           in.Type,
		EventDate:      parseDate(in.EventDate),
		IsRecurring:    in.IsRecurring,
		RecurrenceRule: strToPtr(in.RecurrenceRule),
		Notes:          strToPtr(in.Notes),
	}
}

func (in eventInput) toUpdateParams(id, owner pgtype.UUID, personID pgtype.UUID) sqlc.UpdateEventParams {
	recurring := false
	if in.IsRecurring != nil {
		recurring = *in.IsRecurring
	}
	return sqlc.UpdateEventParams{
		PersonID:       personID,
		Title:          in.Title,
		Type:           in.Type,
		EventDate:      parseDate(in.EventDate),
		IsRecurring:    recurring,
		RecurrenceRule: strToPtr(in.RecurrenceRule),
		Notes:          strToPtr(in.Notes),
		ID:             id,
		OwnerUserID:    owner,
	}
}

// parsePersonID validates an optional person_id string from the request body.
// Returns the parsed UUID and a bool indicating success. An empty string is
// valid (person_id is nullable) and yields an invalid UUID.
func parsePersonID(s string) (pgtype.UUID, bool) {
	var pid pgtype.UUID
	if s == "" {
		return pid, true
	}
	if err := pid.Scan(s); err != nil {
		return pid, false
	}
	return pid, true
}

// List returns events for the owner, optionally filtered by person or upcoming window.
func (h *EventHandler) List(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	if personIDStr := c.Query("personId"); personIDStr != "" {
		var pid pgtype.UUID
		if err := pid.Scan(personIDStr); err != nil {
			fail(c, http.StatusBadRequest, "invalid personId")
			return
		}
		events, err := h.q.ListEventsByPerson(c.Request.Context(), sqlc.ListEventsByPersonParams{
			PersonID:    pid,
			OwnerUserID: owner,
		})
		if err != nil {
			fail(c, http.StatusInternalServerError, "failed to list events")
			return
		}
		out := make([]eventResp, 0, len(events))
		for _, e := range events {
			out = append(out, toEventResp(e))
		}
		c.JSON(http.StatusOK, out)
		return
	}

	daysAhead, _ := strconv.Atoi(c.DefaultQuery("daysAhead", "0"))
	if daysAhead > 0 {
		events, err := h.q.ListUpcomingEvents(c.Request.Context(), sqlc.ListUpcomingEventsParams{
			OwnerUserID: owner,
			DaysAhead:   int32(daysAhead),
		})
		if err != nil {
			fail(c, http.StatusInternalServerError, "failed to list events")
			return
		}
		out := make([]eventResp, 0, len(events))
		for _, e := range events {
			out = append(out, toEventResp(e))
		}
		c.JSON(http.StatusOK, out)
		return
	}

	events, err := h.q.ListEventsByOwner(c.Request.Context(), sqlc.ListEventsByOwnerParams{
		OwnerUserID: owner,
		Offset:      0,
		Limit:       100,
	})
	if err != nil {
		fail(c, http.StatusInternalServerError, "failed to list events")
		return
	}
	out := make([]eventResp, 0, len(events))
	for _, e := range events {
		out = append(out, toEventResp(e))
	}
	c.JSON(http.StatusOK, out)
}

// Create adds a new event owned by the authenticated user.
func (h *EventHandler) Create(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	var in eventInput
	if err := c.ShouldBindJSON(&in); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(in); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	if !parseDate(in.EventDate).Valid {
		fail(c, http.StatusBadRequest, "invalid eventDate")
		return
	}
	pid, ok := parsePersonID(in.PersonID)
	if !ok {
		fail(c, http.StatusBadRequest, "invalid person_id")
		return
	}
	e, err := h.q.CreateEvent(c.Request.Context(), in.toCreateParams(owner, pid))
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusCreated, toEventResp(e))
}

// Update modifies an event (owner-scoped).
func (h *EventHandler) Update(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	var in eventInput
	if err := c.ShouldBindJSON(&in); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(in); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	if !parseDate(in.EventDate).Valid {
		fail(c, http.StatusBadRequest, "invalid eventDate")
		return
	}
	pid, ok := parsePersonID(in.PersonID)
	if !ok {
		fail(c, http.StatusBadRequest, "invalid person_id")
		return
	}
	e, err := h.q.UpdateEvent(c.Request.Context(), in.toUpdateParams(id, owner, pid))
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusOK, toEventResp(e))
}

// Delete removes an event (owner-scoped).
func (h *EventHandler) Delete(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	if err := h.q.DeleteEvent(c.Request.Context(), sqlc.DeleteEventParams{
		ID:          id,
		OwnerUserID: owner,
	}); err != nil {
		fail(c, http.StatusInternalServerError, "delete failed")
		return
	}
	c.Status(http.StatusNoContent)
}
