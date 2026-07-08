package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/dvorinka/peoplevault/internal/nameday"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// NamedayHandler handles nameday lookup routes. It uses the nameday
// Service (Abalin API primary + CSV fallback) rather than the raw CSV
// loader directly.
type NamedayHandler struct {
	svc *nameday.Service
	log *zap.Logger
}

// NewNamedayHandler constructs a NamedayHandler backed by a nameday Service.
func NewNamedayHandler(svc *nameday.Service, log *zap.Logger) *NamedayHandler {
	return &NamedayHandler{svc: svc, log: log}
}

type namedayResp struct {
	Month int      `json:"month"`
	Day   int      `json:"day"`
	Names []string `json:"names"`
}

// ListCountries returns the union of supported country codes from the API
// and the CSV fallback.
func (h *NamedayHandler) ListCountries(c *gin.Context) {
	c.JSON(http.StatusOK, h.svc.SupportedCountries())
}

// GetCountry returns namedays for a country, optionally filtered by
// month/day. Without month/day it returns today's namedays for the
// country (proxied via the abalin API with CSV fallback).
func (h *NamedayHandler) GetCountry(c *gin.Context) {
	country := strings.ToLower(c.Param("country"))
	if country == "" {
		fail(c, http.StatusBadRequest, "country required")
		return
	}

	monthStr := c.Query("month")
	dayStr := c.Query("day")

	ctx := c.Request.Context()

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
		all, err := h.svc.GetByDate(ctx, month, day)
		if err != nil {
			h.log.Warn("nameday GetByDate failed", zap.Error(err))
			fail(c, http.StatusBadGateway, "nameday lookup failed")
			return
		}
		names, ok := all[country]
		if !ok {
			c.JSON(http.StatusOK, []namedayResp{})
			return
		}
		c.JSON(http.StatusOK, []namedayResp{{
			Month: month, Day: day, Names: splitComma(names),
		}})
		return
	}

	// No date specified: return today's namedays for the country.
	all, err := h.svc.GetToday(ctx)
	if err != nil {
		h.log.Warn("nameday GetToday failed", zap.Error(err))
		fail(c, http.StatusBadGateway, "nameday lookup failed")
		return
	}
	names, ok := all[country]
	if !ok {
		c.JSON(http.StatusOK, []namedayResp{})
		return
	}
	now := nowUTC()
	c.JSON(http.StatusOK, []namedayResp{{
		Month: int(now.Month()), Day: now.Day(), Names: splitComma(names),
	}})
}

// Search searches namedays by name across all countries.
// GET /namedays/search?q={name}
func (h *NamedayHandler) Search(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" {
		fail(c, http.StatusBadRequest, "q query parameter required")
		return
	}
	results, err := h.svc.SearchByName(c.Request.Context(), q)
	if err != nil {
		h.log.Warn("nameday search failed", zap.String("q", q), zap.Error(err))
		fail(c, http.StatusBadGateway, "nameday search failed")
		return
	}
	if results == nil {
		results = []nameday.CountryResult{}
	}
	c.JSON(http.StatusOK, results)
}

// splitComma splits a comma-separated names string (as returned by the
// abalin API) into a trimmed, de-emptied slice.
func splitComma(s string) []string {
	if s == "" {
		return []string{}
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
