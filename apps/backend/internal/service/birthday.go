// Package service contains business logic that is independent of HTTP.
package service

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// DateOnly returns the YYYY-MM-DD portion of a pgtype.Date, or "" if invalid.
func DateOnly(d pgtype.Date) string {
	if !d.Valid {
		return ""
	}
	return d.Time.Format("2006-01-02")
}

// TimestamptzRFC3339 returns an RFC3339 string for a pgtype timestamptz.
func TimestamptzRFC3339(d pgtype.Timestamptz) string {
	if !d.Valid {
		return ""
	}
	return d.Time.Format(time.RFC3339)
}

// BirthdayInfo holds computed birthday metadata for a person.
type BirthdayInfo struct {
	Birthday       string // original birthday YYYY-MM-DD
	CurrentAge     int    // age as of today
	UpcomingAge    int    // age at next occurrence
	DaysUntil      int    // days until next occurrence
	NextOccurrence string // YYYY-MM-DD of next occurrence
	IsLeap         bool   // birthday is Feb 29
}

// IsLeapYear reports whether y is a Gregorian leap year.
func IsLeapYear(y int) bool {
	return y%4 == 0 && (y%100 != 0 || y%400 == 0)
}

// ComputeBirthday computes upcoming-birthday metadata for a birthday date and
// a reference "today". Handles Feb 29 birthdays by observing Feb 28 on
// non-leap years for display purposes.
func ComputeBirthday(birthday time.Time, today time.Time) BirthdayInfo {
	bd := birthday
	isLeap := bd.Month() == 2 && bd.Day() == 29

	// For age comparisons, a Feb 29 birthday is treated as Feb 28 only in
	// non-leap years (the observed celebration date). In leap years the real
	// Feb 29 date is used.
	compareBD := bd
	if isLeap && !IsLeapYear(today.Year()) {
		compareBD = time.Date(bd.Year(), 2, 28, 0, 0, 0, 0, bd.Location())
	}

	// Current age: completed years between birthday and today.
	currentAge := ageAt(compareBD, today)

	// Determine the next occurrence (this year or next year).
	year := today.Year()
	next := time.Date(year, bd.Month(), bd.Day(), 0, 0, 0, 0, today.Location())
	if isLeap && !IsLeapYear(year) {
		// Feb 29 birthdays are observed on Feb 28 in non-leap years.
		next = time.Date(year, 2, 28, 0, 0, 0, 0, today.Location())
	}
	if !next.After(today) && !sameDay(next, today) {
		// Already passed this year; advance to next year.
		year++
		next = time.Date(year, bd.Month(), bd.Day(), 0, 0, 0, 0, today.Location())
		if isLeap && !IsLeapYear(year) {
			next = time.Date(year, 2, 28, 0, 0, 0, 0, today.Location())
		}
	}

	daysUntil := calendarDaysBetween(today, next)
	upcomingAge := year - bd.Year()

	return BirthdayInfo{
		Birthday:       bd.Format("2006-01-02"),
		CurrentAge:     currentAge,
		UpcomingAge:    upcomingAge,
		DaysUntil:      daysUntil,
		NextOccurrence: next.Format("2006-01-02"),
		IsLeap:         isLeap,
	}
}

// ComputeAnniversary mirrors ComputeBirthday for anniversaries (no age field
// is meaningful, but days-until and next occurrence are).
func ComputeAnniversary(anniversary time.Time, today time.Time) BirthdayInfo {
	return ComputeBirthday(anniversary, today)
}

func ageAt(birthday, today time.Time) int {
	age := today.Year() - birthday.Year()
	if today.Month() < birthday.Month() || (today.Month() == birthday.Month() && today.Day() < birthday.Day()) {
		age--
	}
	if age < 0 {
		age = 0
	}
	return age
}

func sameDay(a, b time.Time) bool {
	return a.Year() == b.Year() && a.Month() == b.Month() && a.Day() == b.Day()
}

func truncateToDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

// calendarDaysBetween returns the number of whole calendar days between from
// and to (to - from), computed at day granularity in UTC to avoid DST shifts
// when subtracting wall-clock hours.
func calendarDaysBetween(from, to time.Time) int {
	fromD := time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, time.UTC)
	toD := time.Date(to.Year(), to.Month(), to.Day(), 0, 0, 0, 0, time.UTC)
	return int(toD.Sub(fromD).Hours() / 24)
}
