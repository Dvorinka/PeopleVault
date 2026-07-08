package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/dvorinka/peoplevault/internal/holiday"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// HolidayHandler handles public holiday lookup routes (date.nager.at).
type HolidayHandler struct {
	svc *holiday.Service
	log *zap.Logger
}

// NewHolidayHandler constructs a HolidayHandler.
func NewHolidayHandler(svc *holiday.Service, log *zap.Logger) *HolidayHandler {
	return &HolidayHandler{svc: svc, log: log}
}

// List returns the public holidays for the given country and year.
// GET /holidays/:country/:year
func (h *HolidayHandler) List(c *gin.Context) {
	country := strings.ToLower(strings.TrimSpace(c.Param("country")))
	if country == "" {
		fail(c, http.StatusBadRequest, "country required")
		return
	}
	year, err := strconv.Atoi(c.Param("year"))
	if err != nil || year < 1900 || year > 2200 {
		fail(c, http.StatusBadRequest, "invalid year")
		return
	}
	res, err := h.svc.List(c.Request.Context(), country, year)
	if err != nil {
		h.log.Warn("holiday list failed",
			zap.String("country", country), zap.Int("year", year), zap.Error(err))
		fail(c, http.StatusBadGateway, "holiday lookup failed")
		return
	}
	if res == nil {
		res = []holiday.Holiday{}
	}
	c.JSON(http.StatusOK, res)
}

// ListCurrentYear returns the public holidays for the given country in the
// current year. GET /holidays/:country
func (h *HolidayHandler) ListCurrentYear(c *gin.Context) {
	country := strings.ToLower(strings.TrimSpace(c.Param("country")))
	if country == "" {
		fail(c, http.StatusBadRequest, "country required")
		return
	}
	res, err := h.svc.ListCurrentYear(c.Request.Context(), country)
	if err != nil {
		h.log.Warn("holiday list current year failed",
			zap.String("country", country), zap.Error(err))
		fail(c, http.StatusBadGateway, "holiday lookup failed")
		return
	}
	if res == nil {
		res = []holiday.Holiday{}
	}
	c.JSON(http.StatusOK, res)
}
