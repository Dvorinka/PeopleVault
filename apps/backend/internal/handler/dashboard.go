package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/dvorinka/peoplevault/internal/holiday"
	"github.com/dvorinka/peoplevault/internal/nameday"
	"github.com/dvorinka/peoplevault/internal/service"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// DashboardHandler aggregates dashboard data for the authenticated user.
type DashboardHandler struct {
	q        *sqlc.Queries
	namedays *nameday.Service
	holidays *holiday.Service
	log      *zap.Logger
}

// NewDashboardHandler constructs a DashboardHandler.
func NewDashboardHandler(q *sqlc.Queries, namedays *nameday.Service, holidays *holiday.Service, log *zap.Logger) *DashboardHandler {
	return &DashboardHandler{q: q, namedays: namedays, holidays: holidays, log: log}
}

type dashboardBirthday struct {
	Person        personResp `json:"person"`
	CurrentAge    int        `json:"currentAge"`
	UpcomingAge   int        `json:"upcomingAge"`
	DaysUntil     int        `json:"daysUntil"`
	NextOccurrence string    `json:"nextOccurrence"`
	IsLeap        bool       `json:"isLeap"`
}

type dashboardStats struct {
	TotalPeople       int `json:"totalPeople"`
	Favorites         int `json:"favorites"`
	UpcomingThisMonth int `json:"upcomingThisMonth"`
}

type dashboardResp struct {
	UpcomingBirthdays   []dashboardBirthday `json:"upcomingBirthdays"`
	UpcomingAnniversaries []dashboardBirthday `json:"upcomingAnniversaries"`
	TodaysNamedays      []namedayResp        `json:"todaysNamedays"`
	TodaysHolidays      []holiday.Holiday    `json:"todaysHolidays"`
	TodaysEvents        []eventResp          `json:"todaysEvents"`
	RecentlyAdded       []personResp         `json:"recentlyAdded"`
	PendingReminders    []reminderResp       `json:"pendingReminders"`
	Stats               dashboardStats       `json:"stats"`
}

// Get returns the aggregated dashboard for the authenticated user.
func (h *DashboardHandler) Get(c *gin.Context) {
	owner, ok := ensureUserID(c)
	if !ok {
		return
	}
	ctx := c.Request.Context()
	now := time.Now()
	today := truncateDay(now)

	// User settings (for nameday country).
	settings, err := h.q.GetUserSettings(ctx, owner)
	country := "CZ"
	if err == nil {
		country = settings.NamedayCountry
	} else {
		h.log.Warn("dashboard query failed", zap.String("query", "GetUserSettings"), zap.Error(err), zap.String("owner", owner.String()))
	}

	resp := dashboardResp{
		UpcomingBirthdays:   []dashboardBirthday{},
		UpcomingAnniversaries: []dashboardBirthday{},
		TodaysNamedays:      []namedayResp{},
		TodaysHolidays:      []holiday.Holiday{},
		TodaysEvents:        []eventResp{},
		RecentlyAdded:       []personResp{},
		PendingReminders:    []reminderResp{},
	}

	// Upcoming birthdays (next 30 days).
	bdays, err := h.q.ListUpcomingBirthdays(ctx, sqlc.ListUpcomingBirthdaysParams{
		OwnerUserID: owner,
		DaysAhead:   30,
	})
	if err == nil {
		for _, b := range bdays {
			p := sqlc.Person{
				ID: b.ID, OwnerUserID: b.OwnerUserID, FullName: b.FullName,
				Nickname: b.Nickname, AvatarUrl: b.AvatarUrl, Relationship: b.Relationship,
				Birthday: b.Birthday, Anniversary: b.Anniversary,
				NamedayCountry: b.NamedayCountry, NamedayMonth: b.NamedayMonth, NamedayDay: b.NamedayDay,
				AgeVisible: b.AgeVisible, Address: b.Address, Phone: b.Phone, Email: b.Email,
				Notes: b.Notes, FavoriteThings: b.FavoriteThings, GiftIdeas: b.GiftIdeas,
				Interests: b.Interests, IsFavorite: b.IsFavorite,
				CreatedAt: b.CreatedAt, UpdatedAt: b.UpdatedAt,
			}
			info := service.BirthdayInfo{}
			if b.Birthday.Valid {
				info = service.ComputeBirthday(b.Birthday.Time, today)
			}
			resp.UpcomingBirthdays = append(resp.UpcomingBirthdays, dashboardBirthday{
				Person:         h.toPersonRespLocal(p),
				CurrentAge:     info.CurrentAge,
				UpcomingAge:    info.UpcomingAge,
				DaysUntil:      info.DaysUntil,
				NextOccurrence: info.NextOccurrence,
				IsLeap:         info.IsLeap,
			})
		}
	} else {
		h.log.Warn("dashboard query failed", zap.String("query", "ListUpcomingBirthdays"), zap.Error(err), zap.String("owner", owner.String()))
	}

	// Upcoming anniversaries: load all people with anniversaries and compute.
	// We reuse ListPeopleByOwner with a generous limit and filter in Go.
	people, err := h.q.ListPeopleByOwner(ctx, sqlc.ListPeopleByOwnerParams{
		OwnerUserID: owner, Offset: 0, Limit: 500,
	})
	if err == nil {
		favorites := 0
		upcomingThisMonth := 0
		for _, p := range people {
			if p.IsFavorite {
				favorites++
			}
			if p.Anniversary.Valid {
				info := service.ComputeAnniversary(p.Anniversary.Time, today)
				if info.DaysUntil >= 0 && info.DaysUntil <= 30 {
					resp.UpcomingAnniversaries = append(resp.UpcomingAnniversaries, dashboardBirthday{
						Person:         h.toPersonRespLocal(p),
						DaysUntil:      info.DaysUntil,
						NextOccurrence: info.NextOccurrence,
					})
				}
			}
			if p.Birthday.Valid {
				info := service.ComputeBirthday(p.Birthday.Time, today)
				if info.DaysUntil >= 0 && info.DaysUntil <= 31 {
					upcomingThisMonth++
				}
			}
		}
		resp.Stats.Favorites = favorites
		resp.Stats.UpcomingThisMonth = upcomingThisMonth
	} else {
		h.log.Warn("dashboard query failed", zap.String("query", "ListPeopleByOwner"), zap.Error(err), zap.String("owner", owner.String()))
	}

	// Total people count (uncapped, unlike the paginated ListPeopleByOwner).
	totalPeople, err := h.q.CountPeopleByOwner(ctx, owner)
	if err == nil {
		resp.Stats.TotalPeople = int(totalPeople)
	} else {
		h.log.Warn("dashboard query failed", zap.String("query", "CountPeopleByOwner"), zap.Error(err), zap.String("owner", owner.String()))
	}

	// Today's namedays (via Service: Abalin API primary, CSV fallback).
	countryLower := strings.ToLower(country)
	if all, err := h.namedays.GetToday(ctx); err == nil {
		if names, ok := all[countryLower]; ok {
			resp.TodaysNamedays = append(resp.TodaysNamedays, namedayResp{
				Month: int(today.Month()), Day: today.Day(), Names: splitComma(names),
			})
		}
	} else {
		h.log.Warn("dashboard nameday lookup failed", zap.String("country", countryLower), zap.Error(err))
	}

	// Today's holidays for the user's nameday country setting.
	if h.holidays != nil && country != "" {
		yearHolidays, err := h.holidays.List(ctx, countryLower, today.Year())
		if err != nil {
			h.log.Warn("dashboard holiday lookup failed", zap.String("country", countryLower), zap.Error(err))
		} else {
			todayStr := today.Format("2006-01-02")
			for _, hd := range yearHolidays {
				if hd.Date == todayStr {
					resp.TodaysHolidays = append(resp.TodaysHolidays, hd)
				}
			}
		}
	}

	// Today's events.
	events, err := h.q.ListUpcomingEvents(ctx, sqlc.ListUpcomingEventsParams{
		OwnerUserID: owner, DaysAhead: 0,
	})
	if err == nil {
		for _, e := range events {
			if e.EventDate.Valid && sameDay(e.EventDate.Time, today) {
				resp.TodaysEvents = append(resp.TodaysEvents, toEventResp(e))
			}
		}
	} else {
		h.log.Warn("dashboard query failed", zap.String("query", "ListUpcomingEvents"), zap.Error(err), zap.String("owner", owner.String()))
	}

	// Recently added people.
	recent, err := h.q.ListRecentlyAddedByOwner(ctx, sqlc.ListRecentlyAddedByOwnerParams{
		OwnerUserID: owner, Limit: 5,
	})
	if err == nil {
		for _, p := range recent {
			resp.RecentlyAdded = append(resp.RecentlyAdded, h.toPersonRespLocal(p))
		}
	} else {
		h.log.Warn("dashboard query failed", zap.String("query", "ListRecentlyAddedByOwner"), zap.Error(err), zap.String("owner", owner.String()))
	}

	// Pending reminders.
	pending, err := h.q.ListPendingReminders(ctx, owner)
	if err == nil {
		for _, r := range pending {
			resp.PendingReminders = append(resp.PendingReminders, toReminderResp(r))
		}
	} else {
		h.log.Warn("dashboard query failed", zap.String("query", "ListPendingReminders"), zap.Error(err), zap.String("owner", owner.String()))
	}

	c.JSON(http.StatusOK, resp)
}

func (h *DashboardHandler) toPersonRespLocal(p sqlc.Person) personResp {
	return personResp{
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
}

func truncateDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func sameDay(a, b time.Time) bool {
	return a.Year() == b.Year() && a.Month() == b.Month() && a.Day() == b.Day()
}
