// Package holiday integrates the date.nager.at Public Holiday API (v4) for
// per-country, per-year public holiday lookups with optional DragonflyDB
// caching.
package holiday

// Holiday is a single public holiday entry as returned by date.nager.at.
type Holiday struct {
	Date             string   `json:"date"`
	Name             string   `json:"name"`
	CountryCode      string   `json:"countryCode"`
	NationalHoliday  bool     `json:"nationalHoliday"`
	SubdivisionCodes []string `json:"subdivisionCodes"`
	HolidayTypes     []string `json:"holidayTypes"`
}
