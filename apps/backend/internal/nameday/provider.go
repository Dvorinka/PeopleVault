package nameday

import "context"

// NameDate is a single (day, month, name) tuple returned by name search.
type NameDate struct {
	Day   int    `json:"day"`
	Month int    `json:"month"`
	Name  string `json:"name"`
}

// CountryResult is the search result for one country: the country code plus
// every date on which the searched name (or a name containing it) is
// celebrated.
type CountryResult struct {
	Country string     `json:"country"`
	Dates   []NameDate `json:"dates"`
}

// Provider is the abstraction over nameday data sources (CSV files, the
// abalin HTTP API, or any future source). All country codes are lowercase
// ISO-3166 alpha-2 codes.
//
// GetByDate and GetToday return a map keyed by country code with a
// comma-separated names string as the value (matching the abalin API
// shape). SearchByName returns one entry per country that matches.
type Provider interface {
	// GetByDate returns namedays for the given month/day across all
	// supported countries.
	GetByDate(ctx context.Context, month, day int) (map[string]string, error)
	// GetToday returns namedays for today (UTC) across all supported
	// countries.
	GetToday(ctx context.Context) (map[string]string, error)
	// SearchByName searches for a name across all supported countries
	// and returns every matching (country, date) pair.
	SearchByName(ctx context.Context, name string) ([]CountryResult, error)
	// SupportedCountries returns the sorted list of country codes this
	// provider can serve.
	SupportedCountries() []string
}
