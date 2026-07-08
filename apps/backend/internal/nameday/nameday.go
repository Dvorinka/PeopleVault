// Package nameday loads country-aware nameday calendars from CSV files and
// serves lookups by country and (month, day).
package nameday

import (
	"encoding/csv"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// Entry is a single day's nameday list for a country.
type Entry struct {
	Month int
	Day   int
	Names []string
}

// Calendar is the full year of namedays for one country, keyed by month/day.
type Calendar struct {
	Country string
	Entries map[[2]int]Entry
}

// Loader loads and holds nameday calendars for all supported countries.
type Loader struct {
	calendars map[string]*Calendar
}

// NewLoader loads every *.csv file in dir. Filenames (without extension) are
// lowercased country codes. Returns an error if any calendar is malformed.
func NewLoader(dir string) (*Loader, error) {
	l := &Loader{calendars: make(map[string]*Calendar)}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read nameday dir %q: %w", dir, err)
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".csv") {
			continue
		}
		code := strings.ToLower(strings.TrimSuffix(e.Name(), ".csv"))
		if code == "readme" {
			continue
		}
		cal, err := loadFile(filepath.Join(dir, e.Name()), code)
		if err != nil {
			return nil, fmt.Errorf("load %s: %w", e.Name(), err)
		}
		l.calendars[code] = cal
	}
	if len(l.calendars) == 0 {
		return nil, fmt.Errorf("no nameday calendars found in %q", dir)
	}
	return l, nil
}

// NewLoaderFromFS loads nameday CSVs from an embed.FS (rooted at root).
func NewLoaderFromFS(fsys fs.FS, root string) (*Loader, error) {
	l := &Loader{calendars: make(map[string]*Calendar)}
	err := fs.WalkDir(fsys, root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(path, ".csv") {
			return nil
		}
		base := filepath.Base(path)
		code := strings.ToLower(strings.TrimSuffix(base, ".csv"))
		if code == "readme" {
			return nil
		}
		f, err := fsys.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()
		cal, err := parseCSV(f, code)
		if err != nil {
			return fmt.Errorf("load %s: %w", base, err)
		}
		l.calendars[code] = cal
		return nil
	})
	if err != nil {
		return nil, err
	}
	if len(l.calendars) == 0 {
		return nil, fmt.Errorf("no nameday calendars found in %q", root)
	}
	return l, nil
}

func loadFile(path, code string) (*Calendar, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return parseCSV(f, code)
}

func parseCSV(r io.Reader, code string) (*Calendar, error) {
	cr := csv.NewReader(r)
	cr.FieldsPerRecord = -1
	rows, err := cr.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(rows) < 2 {
		return nil, fmt.Errorf("empty calendar")
	}
	// Skip header row.
	cal := &Calendar{Country: code, Entries: make(map[[2]int]Entry, 366)}
	for i, row := range rows[1:] {
		if len(row) < 3 {
			return nil, fmt.Errorf("row %d: expected 3 fields, got %d", i+2, len(row))
		}
		month, err := strconv.Atoi(strings.TrimSpace(row[0]))
		if err != nil {
			return nil, fmt.Errorf("row %d: invalid month %q", i+2, row[0])
		}
		day, err := strconv.Atoi(strings.TrimSpace(row[1]))
		if err != nil {
			return nil, fmt.Errorf("row %d: invalid day %q", i+2, row[1])
		}
		if month < 1 || month > 12 || day < 1 || day > 31 {
			return nil, fmt.Errorf("row %d: out-of-range date %d/%d", i+2, month, day)
		}
		names := splitNames(row[2])
		if len(names) == 0 {
			return nil, fmt.Errorf("row %d: empty names", i+2)
		}
		cal.Entries[[2]int{month, day}] = Entry{Month: month, Day: day, Names: names}
	}
	return cal, nil
}

func splitNames(s string) []string {
	parts := strings.Split(s, ";")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// Countries returns the sorted list of loaded country codes.
func (l *Loader) Countries() []string {
	codes := make([]string, 0, len(l.calendars))
	for c := range l.calendars {
		codes = append(codes, c)
	}
	sort.Strings(codes)
	return codes
}

// Lookup returns the entry for the given country and date.
func (l *Loader) Lookup(country string, month, day int) (Entry, bool) {
	cal, ok := l.calendars[strings.ToLower(country)]
	if !ok {
		return Entry{}, false
	}
	e, ok := cal.Entries[[2]int{month, day}]
	return e, ok
}

// Calendar returns the full calendar for a country.
func (l *Loader) Calendar(country string) (*Calendar, bool) {
	cal, ok := l.calendars[strings.ToLower(country)]
	return cal, ok
}

// All returns all entries for a country, sorted by (month, day).
func (c *Calendar) All() []Entry {
	out := make([]Entry, 0, len(c.Entries))
	for _, e := range c.Entries {
		out = append(out, e)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Month != out[j].Month {
			return out[i].Month < out[j].Month
		}
		return out[i].Day < out[j].Day
	})
	return out
}
