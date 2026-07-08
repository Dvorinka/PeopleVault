package handler

import (
	"net/http"

	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

// RelationshipHandler handles relationship routes.
type RelationshipHandler struct {
	q        *sqlc.Queries
	log      *zap.Logger
	validate *validator.Validate
}

// NewRelationshipHandler constructs a RelationshipHandler.
func NewRelationshipHandler(q *sqlc.Queries, log *zap.Logger, v *validator.Validate) *RelationshipHandler {
	return &RelationshipHandler{q: q, log: log, validate: v}
}

type relationshipResp struct {
	ID           string `json:"id"`
	FromPersonID string `json:"fromPersonId"`
	ToPersonID   string `json:"toPersonId"`
	Kind         string `json:"kind"`
	CreatedAt    string `json:"createdAt"`
}

func toRelationshipResp(r sqlc.Relationship) relationshipResp {
	return relationshipResp{
		ID:           r.ID.String(),
		FromPersonID: r.FromPersonID.String(),
		ToPersonID:   r.ToPersonID.String(),
		Kind:         r.Kind,
		CreatedAt:    tsToStr(r.CreatedAt),
	}
}

type relationshipInput struct {
	FromPersonID string `json:"fromPersonId" validate:"required"`
	ToPersonID   string `json:"toPersonId" validate:"required"`
	Kind         string `json:"kind" validate:"required,max=50"`
}

// List returns relationships involving a person (owner-scoped).
func (h *RelationshipHandler) List(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	personID, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	rels, err := h.q.ListRelationshipsForPerson(c.Request.Context(), sqlc.ListRelationshipsForPersonParams{
		OwnerUserID: owner,
		PersonID:    personID,
	})
	if err != nil {
		fail(c, http.StatusInternalServerError, "failed to list relationships")
		return
	}
	out := make([]relationshipResp, 0, len(rels))
	for _, r := range rels {
		out = append(out, toRelationshipResp(r))
	}
	c.JSON(http.StatusOK, out)
}

// Create adds a directed relationship between two people (owner-scoped).
func (h *RelationshipHandler) Create(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	var in relationshipInput
	if err := c.ShouldBindJSON(&in); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(in); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	var from, to pgtype.UUID
	if err := from.Scan(in.FromPersonID); err != nil {
		fail(c, http.StatusBadRequest, "invalid fromPersonId")
		return
	}
	if err := to.Scan(in.ToPersonID); err != nil {
		fail(c, http.StatusBadRequest, "invalid toPersonId")
		return
	}
	r, err := h.q.CreateRelationship(c.Request.Context(), sqlc.CreateRelationshipParams{
		OwnerUserID:  owner,
		FromPersonID: from,
		ToPersonID:   to,
		Kind:         in.Kind,
	})
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusCreated, toRelationshipResp(r))
}

// Delete removes a relationship (owner-scoped).
func (h *RelationshipHandler) Delete(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	if err := h.q.DeleteRelationship(c.Request.Context(), sqlc.DeleteRelationshipParams{
		ID:          id,
		OwnerUserID: owner,
	}); err != nil {
		fail(c, http.StatusInternalServerError, "delete failed")
		return
	}
	c.Status(http.StatusNoContent)
}
