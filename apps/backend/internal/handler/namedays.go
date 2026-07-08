package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/dvorinka/peoplevault/internal/nameday"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// NamedayHandler handles nameday lookup routes.
type NamedayHandler struct {
	loader *nameday.Loader
	log    *zap.Logger
}

// NewNamedayHandler constructs a NamedayHandler.
func NewNamedayHandler(loader *nameday.Loader, log *zap.Logger) *NamedayHandler {
	return &NamedayHandler{loader: loader, log: log}
}

type namedayResp struct {
	Month int      `json:"month"`
	Day   int      `json:"day"`
	Names []string `json:"names"`
}

// ListCountries returns the supported country codes.
func (h *NamedayHandler) ListCountries(c *gin.Context) {
	c.JSON(http.StatusOK, h.loader.Countries())
}

// GetCountry returns namedays for a country, optionally filtered by month/day.
func (h *NamedayHandler) GetCountry(c *gin.Context) {
	country := strings.ToLower(c.Param("country"))
	cal, ok := h.loader.Calendar(country)
	if !ok {
		fail(c, http.StatusNotFound, "unknown country")
		return
	}

	monthStr := c.Query("month")
	dayStr := c.Query("day")
	if monthStr != "" && dayStr != "" {
		month, err := strconv.Atoi(monthStr)
		if err != nil || month < 1 || month > 12 {
			fail(c, http.StatusBadRequest, "invalid month")
			return
		}
		day, err := strconv.Atoi(dayStr)
		if err != nil || day < 1 || day > 31 {
			fail(c, http.StatusBadRequest, "invalid day")
			return
		}
		if e, ok := cal.Entries[[2]int{month, day}]; ok {
			c.JSON(http.StatusOK, []namedayResp{{
				Month: e.Month, Day: e.Day, Names: e.Names,
			}})
			return
		}
		c.JSON(http.StatusOK, []namedayResp{})
		return
	}

	entries := cal.All()
	out := make([]namedayResp, 0, len(entries))
	for _, e := range entries {
		out = append(out, namedayResp{Month: e.Month, Day: e.Day, Names: e.Names})
	}
	c.JSON(http.StatusOK, out)
}
