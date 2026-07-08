package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
)

// PersonHandler handles people CRUD and search routes.
type PersonHandler struct {
	q        *sqlc.Queries
	log      *zap.Logger
	validate *validator.Validate
}

// NewPersonHandler constructs a PersonHandler.
func NewPersonHandler(q *sqlc.Queries, log *zap.Logger, v *validator.Validate) *PersonHandler {
	return &PersonHandler{q: q, log: log, validate: v}
}

type personResp struct {
	ID             string   `json:"id"`
	FullName       string   `json:"fullName"`
	Nickname       string   `json:"nickname"`
	AvatarURL      string   `json:"avatarUrl"`
	Relationship   string   `json:"relationship"`
	Birthday       string   `json:"birthday"`
	Anniversary    string   `json:"anniversary"`
	NamedayCountry string   `json:"namedayCountry"`
	NamedayMonth   int32    `json:"namedayMonth"`
	NamedayDay     int32    `json:"namedayDay"`
	AgeVisible     bool     `json:"ageVisible"`
	Address        string   `json:"address"`
	Phone          string   `json:"phone"`
	Email          string   `json:"email"`
	Notes          string   `json:"notes"`
	FavoriteThings string   `json:"favoriteThings"`
	GiftIdeas      string   `json:"giftIdeas"`
	Interests      string   `json:"interests"`
	IsFavorite     bool     `json:"isFavorite"`
	Tags           []tagResp `json:"tags"`
	CreatedAt      string   `json:"createdAt"`
	UpdatedAt      string   `json:"updatedAt"`
}

type tagResp struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"createdAt"`
}

func (h *PersonHandler) toPersonResp(p sqlc.Person) personResp {
	r := personResp{
		ID:             p.ID.String(),
		FullName:       p.FullName,
		Nickname:       ptrToStr(p.Nickname),
		AvatarURL:      ptrToStr(p.AvatarUrl),
		Relationship:   ptrToStr(p.Relationship),
		Birthday:       dateToStr(p.Birthday),
		Anniversary:    dateToStr(p.Anniversary),
		NamedayCountry: ptrToStr(p.NamedayCountry),
		NamedayMonth:   int32PtrToVal(p.NamedayMonth),
		NamedayDay:     int32PtrToVal(p.NamedayDay),
		AgeVisible:     p.AgeVisible,
		Address:        ptrToStr(p.Address),
		Phone:          ptrToStr(p.Phone),
		Email:          ptrToStr(p.Email),
		Notes:          ptrToStr(p.Notes),
		FavoriteThings: ptrToStr(p.FavoriteThings),
		GiftIdeas:      ptrToStr(p.GiftIdeas),
		Interests:      ptrToStr(p.Interests),
		IsFavorite:     p.IsFavorite,
		Tags:           []tagResp{},
		CreatedAt:      tsToStr(p.CreatedAt),
		UpdatedAt:      tsToStr(p.UpdatedAt),
	}
	return r
}

func (h *PersonHandler) toPersonRespWithTags(p sqlc.Person, tags []sqlc.Tag) personResp {
	r := h.toPersonResp(p)
	for _, t := range tags {
		r.Tags = append(r.Tags, tagResp{ID: t.ID.String(), Name: t.Name, CreatedAt: tsToStr(t.CreatedAt)})
	}
	return r
}

type personInput struct {
	FullName       string  `json:"fullName" validate:"required,max=200"`
	Nickname       string  `json:"nickname"`
	AvatarURL      string  `json:"avatarUrl"`
	Relationship   string  `json:"relationship"`
	Birthday       string  `json:"birthday"`
	Anniversary    string  `json:"anniversary"`
	NamedayCountry string  `json:"namedayCountry"`
	NamedayMonth   int32   `json:"namedayMonth"`
	NamedayDay     int32   `json:"namedayDay"`
	AgeVisible     *bool   `json:"ageVisible"`
	Address        string  `json:"address"`
	Phone          string  `json:"phone"`
	Email          string  `json:"email"`
	Notes          string  `json:"notes"`
	FavoriteThings string  `json:"favoriteThings"`
	GiftIdeas      string  `json:"giftIdeas"`
	Interests      string  `json:"interests"`
	IsFavorite     *bool   `json:"isFavorite"`
	TagIDs         []string `json:"tagIds"`
}

func (in personInput) toCreateParams(owner pgtype.UUID) sqlc.CreatePersonParams {
	return sqlc.CreatePersonParams{
		OwnerUserID:    owner,
		FullName:       in.FullName,
		Nickname:       strToPtr(in.Nickname),
		AvatarUrl:      strToPtr(in.AvatarURL),
		Relationship:   strToPtr(in.Relationship),
		Birthday:       parseDate(in.Birthday),
		Anniversary:    parseDate(in.Anniversary),
		NamedayCountry: strToPtr(in.NamedayCountry),
		NamedayMonth:   valToInt32Ptr(in.NamedayMonth),
		NamedayDay:     valToInt32Ptr(in.NamedayDay),
		AgeVisible:     in.AgeVisible,
		Address:        strToPtr(in.Address),
		Phone:          strToPtr(in.Phone),
		Email:          strToPtr(in.Email),
		Notes:          strToPtr(in.Notes),
		FavoriteThings: strToPtr(in.FavoriteThings),
		GiftIdeas:      strToPtr(in.GiftIdeas),
		Interests:      strToPtr(in.Interests),
		IsFavorite:     in.IsFavorite,
	}
}

func (in personInput) toUpdateParams(id, owner pgtype.UUID) sqlc.UpdatePersonParams {
	ageVisible := true
	if in.AgeVisible != nil {
		ageVisible = *in.AgeVisible
	}
	isFav := false
	if in.IsFavorite != nil {
		isFav = *in.IsFavorite
	}
	return sqlc.UpdatePersonParams{
		FullName:       in.FullName,
		Nickname:       strToPtr(in.Nickname),
		AvatarUrl:      strToPtr(in.AvatarURL),
		Relationship:   strToPtr(in.Relationship),
		Birthday:       parseDate(in.Birthday),
		Anniversary:    parseDate(in.Anniversary),
		NamedayCountry: strToPtr(in.NamedayCountry),
		NamedayMonth:   valToInt32Ptr(in.NamedayMonth),
		NamedayDay:     valToInt32Ptr(in.NamedayDay),
		AgeVisible:     ageVisible,
		Address:        strToPtr(in.Address),
		Phone:          strToPtr(in.Phone),
		Email:          strToPtr(in.Email),
		Notes:          strToPtr(in.Notes),
		FavoriteThings: strToPtr(in.FavoriteThings),
		GiftIdeas:      strToPtr(in.GiftIdeas),
		Interests:      strToPtr(in.Interests),
		IsFavorite:     isFav,
		ID:             id,
		OwnerUserID:    owner,
	}
}

// List returns a paginated list of the owner's people.
func (h *PersonHandler) List(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	const maxPage = 10000
	if page > maxPage {
		fail(c, http.StatusBadRequest, "page too large")
		return
	}
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "24"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 24
	}
	offset := int32((page - 1) * pageSize)

	people, err := h.q.ListPeopleByOwner(c.Request.Context(), sqlc.ListPeopleByOwnerParams{
		OwnerUserID: owner,
		Offset:      offset,
		Limit:       int32(pageSize),
	})
	if err != nil {
		fail(c, http.StatusInternalServerError, "failed to list people")
		return
	}

	items := make([]personResp, 0, len(people))
	for _, p := range people {
		items = append(items, h.toPersonResp(p))
	}

	// Total is the uncapped owner-wide count, not the length of the current
	// page (which is capped by pageSize).
	total, err := h.q.CountPeopleByOwner(c.Request.Context(), owner)
	if err != nil {
		fail(c, http.StatusInternalServerError, "failed to count people")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    int(total),
		"page":     page,
		"pageSize": pageSize,
	})
}

// Create adds a new person owned by the authenticated user.
func (h *PersonHandler) Create(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	var in personInput
	if err := c.ShouldBindJSON(&in); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(in); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	person, err := h.q.CreatePerson(c.Request.Context(), in.toCreateParams(owner))
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}

	// Associate any requested tags via the person_tags junction.
	var tags []sqlc.Tag
	if len(in.TagIDs) > 0 {
		for _, tidStr := range in.TagIDs {
			var tid pgtype.UUID
			if err := tid.Scan(tidStr); err != nil {
				fail(c, http.StatusBadRequest, "invalid tagId")
				return
			}
			if err := h.q.AttachTagToPerson(c.Request.Context(), sqlc.AttachTagToPersonParams{
				PersonID: person.ID,
				TagID:    tid,
			}); err != nil {
				h.log.Warn("failed to attach tag to person", zap.Error(err), zap.String("person_id", person.ID.String()))
			}
		}
		listed, lerr := h.q.ListTagsForPerson(c.Request.Context(), sqlc.ListTagsForPersonParams{
			PersonID:    person.ID,
			OwnerUserID: owner,
		})
		if lerr != nil {
			h.log.Warn("failed to list tags for person", zap.Error(lerr), zap.String("person_id", person.ID.String()))
		} else {
			tags = listed
		}
	}
	c.JSON(http.StatusCreated, h.toPersonRespWithTags(person, tags))
}

// Get returns a single person by id (owner-scoped).
func (h *PersonHandler) Get(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	person, err := h.q.GetPersonByID(c.Request.Context(), sqlc.GetPersonByIDParams{
		ID:          id,
		OwnerUserID: owner,
	})
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	tags, err := h.q.ListTagsForPerson(c.Request.Context(), sqlc.ListTagsForPersonParams{
		PersonID:    id,
		OwnerUserID: owner,
	})
	if err != nil {
		h.log.Warn("failed to list tags for person", zap.Error(err), zap.String("person_id", id.String()))
	}
	c.JSON(http.StatusOK, h.toPersonRespWithTags(person, tags))
}

// Update modifies a person (owner-scoped).
func (h *PersonHandler) Update(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	var in personInput
	if err := c.ShouldBindJSON(&in); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.validate.Struct(in); err != nil {
		failDetail(c, http.StatusBadRequest, "validation failed", err.Error())
		return
	}
	person, err := h.q.UpdatePerson(c.Request.Context(), in.toUpdateParams(id, owner))
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusOK, h.toPersonResp(person))
}

// Delete removes a person (owner-scoped).
func (h *PersonHandler) Delete(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	if err := h.q.DeletePerson(c.Request.Context(), sqlc.DeletePersonParams{
		ID:          id,
		OwnerUserID: owner,
	}); err != nil {
		fail(c, http.StatusInternalServerError, "delete failed")
		return
	}
	c.Status(http.StatusNoContent)
}

type favoriteReq struct {
	Favorite bool `json:"favorite"`
}

// SetFavorite toggles the favorite flag on a person.
func (h *PersonHandler) SetFavorite(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	id, ok := parseUUID(c, "id")
	if !ok {
		return
	}
	var in favoriteReq
	if err := c.ShouldBindJSON(&in); err != nil {
		failDetail(c, http.StatusBadRequest, "invalid request", err.Error())
		return
	}
	if err := h.q.SetFavorite(c.Request.Context(), sqlc.SetFavoriteParams{
		IsFavorite:  in.Favorite,
		ID:          id,
		OwnerUserID: owner,
	}); err != nil {
		fail(c, http.StatusInternalServerError, "update failed")
		return
	}
	person, err := h.q.GetPersonByID(c.Request.Context(), sqlc.GetPersonByIDParams{
		ID:          id,
		OwnerUserID: owner,
	})
	if err != nil {
		status, msg := mapDBError(err)
		fail(c, status, msg)
		return
	}
	c.JSON(http.StatusOK, h.toPersonResp(person))
}

// Search runs the trigram + ILIKE search across the owner's people.
func (h *PersonHandler) Search(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		c.JSON(http.StatusOK, []personResp{})
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	people, err := h.q.SearchPeople(c.Request.Context(), sqlc.SearchPeopleParams{
		OwnerUserID: owner,
		Query:       &q,
		Limit:       int32(limit),
		Offset:      0,
	})
	if err != nil {
		fail(c, http.StatusInternalServerError, "search failed")
		return
	}
	items := make([]personResp, 0, len(people))
	for _, p := range people {
		items = append(items, h.toPersonResp(p))
	}
	c.JSON(http.StatusOK, items)
}
