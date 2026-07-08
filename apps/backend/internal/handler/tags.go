package handler

import (
	"net/http"

	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/dvorinka/peoplevault/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"
)

// TagHandler handles tag routes.
type TagHandler struct {
	q        *sqlc.Queries
	log      *zap.Logger
	validate *validator.Validate
}

// NewTagHandler constructs a TagHandler.
func NewTagHandler(q *sqlc.Queries, log *zap.Logger, v *validator.Validate) *TagHandler {
	return &TagHandler{q: q, log: log, validate: v}
}

type tagInput struct {
	Name string `json:"name" validate:"required,max=50"`
}

// List returns all tags owned by the authenticated user.
func (h *TagHandler) List(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	tags, err := h.q.ListTagsByOwner(c.Request.Context(), owner)
	if err != nil {
		fail(c, http.StatusInternalServerError, "failed to list tags")
		return
	}
	out := make([]tagResp, 0, len(tags))
	for _, t := range tags {
		out = append(out, tagResp{ID: t.ID.String(), Name: t.Name, CreatedAt: tsToStr(t.CreatedAt)})
	}
	c.JSON(http.StatusOK, out)
}

// Create adds a new tag owned by the authenticated user.
func (h *TagHandler) Create(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	var in tagInput
	if err := c.ShouldBindJSON(&in); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(in); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	tag, err := h.q.CreateTag(c.Request.Context(), sqlc.CreateTagParams{
		OwnerUserID: owner,
		Name:        in.Name,
	})
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusCreated, tagResp{ID: tag.ID.String(), Name: tag.Name, CreatedAt: tsToStr(tag.CreatedAt)})
}

// Delete removes a tag (owner-scoped).
func (h *TagHandler) Delete(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	if err := h.q.DeleteTag(c.Request.Context(), sqlc.DeleteTagParams{
		ID:          id,
		OwnerUserID: owner,
	}); err != nil {
		fail(c, http.StatusInternalServerError, "delete failed")
		return
	}
	c.Status(http.StatusNoContent)
}

// _ keeps middleware import referenced even if unused in this file.
var _ = middleware.UserID
