package nameday

import (
	"path/filepath"
	"testing"
)

func TestLoadRealData(t *testing.T) {
	dir := filepath.Join("..", "..", "..", "..", "data", "namedays")
	l, err := NewLoader(dir)
	if err != nil {
		t.Fatalf("NewLoader error: %v", err)
	}
	countries := l.Countries()
	want := []string{"at", "cz", "de", "hu", "pl", "sk"}
	if len(countries) != len(want) {
		t.Fatalf("expected %d countries, got %d: %v", len(want), len(countries), countries)
	}
	for i, c := range want {
		if countries[i] != c {
			t.Errorf("countries[%d] = %q, want %q", i, countries[i], c)
		}
		cal, ok := l.Calendar(c)
		if !ok {
			t.Errorf("calendar %q not found", c)
			continue
		}
		if len(cal.Entries) != 366 {
			t.Errorf("%s: expected 366 entries, got %d", c, len(cal.Entries))
		}
		// Verify Feb 29 exists
		if _, ok := cal.Entries[[2]int{2, 29}]; !ok {
			t.Errorf("%s: missing Feb 29 entry", c)
		}
	}
}
