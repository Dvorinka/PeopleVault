package nameday

import (
	"os"
	"path/filepath"
	"testing"
)

func writeTestCSV(t *testing.T, dir, code string, rows [][3]string) {
	t.Helper()
	path := filepath.Join(dir, code+".csv")
	var b []byte
	b = append(b, []byte("month,day,names\n")...)
	for _, r := range rows {
		b = append(b, []byte(r[0]+","+r[1]+","+r[2]+"\n")...)
	}
	if err := os.WriteFile(path, b, 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func TestNewLoader(t *testing.T) {
	dir := t.TempDir()
	writeTestCSV(t, dir, "xx", [][3]string{
		{"1", "1", "Alice;Bob"},
		{"1", "2", "Charlie"},
		{"2", "29", "Leap"},
		{"12", "31", "NewYear"},
	})
	writeTestCSV(t, dir, "yy", [][3]string{
		{"1", "1", "Zara"},
		{"6", "15", "John"},
	})

	l, err := NewLoader(dir)
	if err != nil {
		t.Fatalf("NewLoader error: %v", err)
	}
	countries := l.Countries()
	if len(countries) != 2 {
		t.Fatalf("expected 2 countries, got %d", len(countries))
	}
	if countries[0] != "xx" || countries[1] != "yy" {
		t.Fatalf("unexpected country order: %v", countries)
	}
}

func TestLookup(t *testing.T) {
	dir := t.TempDir()
	writeTestCSV(t, dir, "xx", [][3]string{
		{"1", "1", "Alice;Bob"},
		{"2", "29", "Leap"},
		{"12", "31", "NewYear"},
	})
	l, err := NewLoader(dir)
	if err != nil {
		t.Fatalf("NewLoader error: %v", err)
	}

	tests := []struct {
		name    string
		country string
		month   int
		day     int
		want    []string
		wantOK  bool
	}{
		{"single name", "xx", 1, 1, []string{"Alice", "Bob"}, true},
		{"leap day", "xx", 2, 29, []string{"Leap"}, true},
		{"new year", "xx", 12, 31, []string{"NewYear"}, true},
		{"missing day", "xx", 5, 5, nil, false},
		{"missing country", "zz", 1, 1, nil, false},
		{"case insensitive", "XX", 1, 1, []string{"Alice", "Bob"}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e, ok := l.Lookup(tt.country, tt.month, tt.day)
			if ok != tt.wantOK {
				t.Fatalf("Lookup ok = %v, want %v", ok, tt.wantOK)
			}
			if !tt.wantOK {
				return
			}
			if len(e.Names) != len(tt.want) {
				t.Fatalf("names len = %d, want %d", len(e.Names), len(tt.want))
			}
			for i, n := range tt.want {
				if e.Names[i] != n {
					t.Errorf("name[%d] = %q, want %q", i, e.Names[i], n)
				}
			}
			if e.Month != tt.month || e.Day != tt.day {
				t.Errorf("date = %d/%d, want %d/%d", e.Month, e.Day, tt.month, tt.day)
			}
		})
	}
}

func TestCalendarAllSorted(t *testing.T) {
	dir := t.TempDir()
	writeTestCSV(t, dir, "xx", [][3]string{
		{"12", "31", "End"},
		{"1", "1", "Start"},
		{"6", "15", "Mid"},
	})
	l, err := NewLoader(dir)
	if err != nil {
		t.Fatalf("NewLoader error: %v", err)
	}
	cal, ok := l.Calendar("xx")
	if !ok {
		t.Fatal("calendar not found")
	}
	all := cal.All()
	if len(all) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(all))
	}
	if all[0].Month != 1 || all[0].Day != 1 {
		t.Errorf("first should be Jan 1, got %d/%d", all[0].Month, all[0].Day)
	}
	if all[2].Month != 12 || all[2].Day != 31 {
		t.Errorf("last should be Dec 31, got %d/%d", all[2].Month, all[2].Day)
	}
}

func TestNewLoaderMalformed(t *testing.T) {
	dir := t.TempDir()
	// Empty names field should error.
	if err := os.WriteFile(filepath.Join(dir, "bad.csv"), []byte("month,day,names\n1,1,\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := NewLoader(dir); err == nil {
		t.Fatal("expected error for empty names, got nil")
	}
}

func TestNewLoaderEmptyDir(t *testing.T) {
	dir := t.TempDir()
	if _, err := NewLoader(dir); err == nil {
		t.Fatal("expected error for empty dir, got nil")
	}
}
