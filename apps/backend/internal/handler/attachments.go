package handler

import (
	"net/http"

	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AttachmentHandler handles attachment routes.
type AttachmentHandler struct {
	q   *sqlc.Queries
	log *zap.Logger
}

// NewAttachmentHandler constructs an AttachmentHandler.
func NewAttachmentHandler(q *sqlc.Queries, log *zap.Logger) *AttachmentHandler {
	return &AttachmentHandler{q: q, log: log}
}

type attachmentResp struct {
	ID         string  `json:"id"`
	PersonID   string  `json:"personId"`
	Kind       string  `json:"kind"`
	Filename   string  `json:"filename"`
	StorageKey string  `json:"storageKey"`
	MimeType   string  `json:"mimeType"`
	SizeBytes  int64   `json:"sizeBytes"`
	CreatedAt  string  `json:"createdAt"`
}

func toAttachmentResp(a sqlc.Attachment) attachmentResp {
	r := attachmentResp{
		ID:         a.ID.String(),
		Kind:       a.Kind,
		Filename:   a.Filename,
		StorageKey: a.StorageKey,
		CreatedAt:  tsToStr(a.CreatedAt),
	}
	if a.PersonID.Valid {
		r.PersonID = a.PersonID.String()
	}
	if a.MimeType != nil {
		r.MimeType = *a.MimeType
	}
	if a.SizeBytes != nil {
		r.SizeBytes = *a.SizeBytes
	}
	return r
}

// List returns attachments for a person (owner-scoped).
func (h *AttachmentHandler) List(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	personID, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	attachments, err := h.q.ListAttachmentsByPerson(c.Request.Context(), sqlc.ListAttachmentsByPersonParams{
		PersonID:    personID,
		OwnerUserID: owner,
	})
	if err != nil {
		fail(c, http.StatusInternalServerError, "failed to list attachments")
		return
	}
	out := make([]attachmentResp, 0, len(attachments))
	for _, a := range attachments {
		out = append(out, toAttachmentResp(a))
	}
	c.JSON(http.StatusOK, out)
}

// Delete removes an attachment (owner-scoped).
func (h *AttachmentHandler) Delete(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	if err := h.q.DeleteAttachment(c.Request.Context(), sqlc.DeleteAttachmentParams{
		ID:          id,
		OwnerUserID: owner,
	}); err != nil {
		fail(c, http.StatusInternalServerError, "delete failed")
		return
	}
	c.Status(http.StatusNoContent)
}
