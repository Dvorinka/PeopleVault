package service

import (
	"testing"
	"time"
)

func TestIsLeapYear(t *testing.T) {
	tests := []struct {
		year int
		want bool
	}{
		{2000, true},
		{2004, true},
		{2024, true},
		{2100, false},
		{1900, false},
		{2023, false},
		{2025, false},
	}
	for _, tt := range tests {
		if got := IsLeapYear(tt.year); got != tt.want {
			t.Errorf("IsLeapYear(%d) = %v, want %v", tt.year, got, tt.want)
		}
	}
}

func TestComputeBirthday(t *testing.T) {
	today := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name      string
		birthday  time.Time
		today     time.Time
		wantAge   int
		wantUpAge int
		wantDays  int
		wantLeap  bool
	}{
		{
			name:      "already passed this year",
			birthday:  time.Date(1990, 3, 5, 0, 0, 0, 0, time.UTC),
			today:     today,
			wantAge:   35,
			wantUpAge: 36,
			wantDays:  daysUntil(today, time.Date(2026, 3, 5, 0, 0, 0, 0, time.UTC)),
			wantLeap:  false,
		},
		{
			name:      "today is the birthday",
			birthday:  time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC),
			today:     today,
			wantAge:   35,
			wantUpAge: 35,
			wantDays:  0,
			wantLeap:  false,
		},
		{
			name:      "upcoming later this year",
			birthday:  time.Date(1990, 7, 20, 0, 0, 0, 0, time.UTC),
			today:     today,
			wantAge:   34,
			wantUpAge: 35,
			wantDays:  daysUntil(today, time.Date(2025, 7, 20, 0, 0, 0, 0, time.UTC)),
			wantLeap:  false,
		},
		{
			name:      "leap day birthday in non-leap year",
			birthday:  time.Date(2000, 2, 29, 0, 0, 0, 0, time.UTC),
			today:     today,
			wantAge:   25,
			wantUpAge: 26,
			wantDays:  daysUntil(today, time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC)),
			wantLeap:  true,
		},
		{
			name:      "leap day birthday, next year is leap",
			birthday:  time.Date(2000, 2, 29, 0, 0, 0, 0, time.UTC),
			today:     time.Date(2023, 12, 31, 0, 0, 0, 0, time.UTC),
			wantAge:   23,
			wantUpAge: 24,
			wantDays:  daysUntil(time.Date(2023, 12, 31, 0, 0, 0, 0, time.UTC), time.Date(2024, 2, 29, 0, 0, 0, 0, time.UTC)),
			wantLeap:  true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ComputeBirthday(tt.birthday, tt.today)
			if got.CurrentAge != tt.wantAge {
				t.Errorf("CurrentAge = %d, want %d", got.CurrentAge, tt.wantAge)
			}
			if got.UpcomingAge != tt.wantUpAge {
				t.Errorf("UpcomingAge = %d, want %d", got.UpcomingAge, tt.wantUpAge)
			}
			if got.DaysUntil != tt.wantDays {
				t.Errorf("DaysUntil = %d, want %d", got.DaysUntil, tt.wantDays)
			}
			if got.IsLeap != tt.wantLeap {
				t.Errorf("IsLeap = %v, want %v", got.IsLeap, tt.wantLeap)
			}
			if got.Birthday != tt.birthday.Format("2006-01-02") {
				t.Errorf("Birthday = %q, want %q", got.Birthday, tt.birthday.Format("2006-01-02"))
			}
		})
	}
}

func TestComputeBirthdayLeapDayObservedFeb28(t *testing.T) {
	// Feb 29 birthday; today is Feb 28 of a non-leap year — should be today.
	bd := time.Date(2000, 2, 29, 0, 0, 0, 0, time.UTC)
	today := time.Date(2025, 2, 28, 0, 0, 0, 0, time.UTC)
	got := ComputeBirthday(bd, today)
	if got.DaysUntil != 0 {
		t.Errorf("DaysUntil = %d, want 0 (observed today on Feb 28)", got.DaysUntil)
	}
	if got.NextOccurrence != "2025-02-28" {
		t.Errorf("NextOccurrence = %q, want 2025-02-28", got.NextOccurrence)
	}
}

func TestComputeAnniversary(t *testing.T) {
	today := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	ann := time.Date(2020, 6, 20, 0, 0, 0, 0, time.UTC)
	got := ComputeAnniversary(ann, today)
	if got.DaysUntil != 5 {
		t.Errorf("DaysUntil = %d, want 5", got.DaysUntil)
	}
	if got.NextOccurrence != "2025-06-20" {
		t.Errorf("NextOccurrence = %q, want 2025-06-20", got.NextOccurrence)
	}
}

func daysUntil(today, target time.Time) int {
	t := truncateToDay(today)
	tg := truncateToDay(target)
	return int(tg.Sub(t).Hours() / 24)
}
