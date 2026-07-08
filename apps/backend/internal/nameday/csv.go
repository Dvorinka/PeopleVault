package nameday

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"
)

// GetByDate returns namedays for the given month/day across all loaded
// CSV calendars. The value is a comma-joined names string (matching the
// abalin API shape). Countries without an entry for the date are omitted.
func (l *Loader) GetByDate(ctx context.Context, month, day int) (map[string]string, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if month < 1 || month > 12 || day < 1 || day > 31 {
		return nil, fmt.Errorf("csv: invalid date %d/%d", month, day)
	}
	out := make(map[string]string, len(l.calendars))
	for code, cal := range l.calendars {
		if e, ok := cal.Entries[[2]int{month, day}]; ok {
			out[code] = strings.Join(e.Names, ", ")
		}
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("csv: no namedays for %d/%d", month, day)
	}
	return out, nil
}

// GetToday returns namedays for today (UTC) across all loaded CSV calendars.
func (l *Loader) GetToday(ctx context.Context) (map[string]string, error) {
	now := time.Now().UTC()
	return l.GetByDate(ctx, int(now.Month()), now.Day())
}

// SearchByName searches every loaded CSV calendar for entries whose names
// contain the given substring (case-insensitive). Returns one CountryResult
// per country with at least one match.
func (l *Loader) SearchByName(ctx context.Context, name string) ([]CountryResult, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	needle := strings.ToLower(strings.TrimSpace(name))
	if needle == "" {
		return nil, fmt.Errorf("csv: empty name")
	}
	out := make([]CountryResult, 0, len(l.calendars))
	for code, cal := range l.calendars {
		var dates []NameDate
		for _, e := range cal.Entries {
			for _, n := range e.Names {
				if strings.Contains(strings.ToLower(n), needle) {
					dates = append(dates, NameDate{Day: e.Day, Month: e.Month, Name: n})
				}
			}
		}
		if len(dates) > 0 {
			sort.Slice(dates, func(i, j int) bool {
				if dates[i].Month != dates[j].Month {
					return dates[i].Month < dates[j].Month
				}
				return dates[i].Day < dates[j].Day
			})
			out = append(out, CountryResult{Country: code, Dates: dates})
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Country < out[j].Country })
	return out, nil
}

// SupportedCountries returns the sorted list of loaded CSV country codes.
func (l *Loader) SupportedCountries() []string {
	return l.Countries()
}
