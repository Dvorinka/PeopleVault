package nameday

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"go.uber.org/zap"
)

// mockProvider is a test Provider with controllable behavior.
type mockProvider struct {
	date    map[string]string
	dateErr error
	today   map[string]string
	todayE  error
	search  []CountryResult
	srchErr error
	countries []string
	called   int
}

func (m *mockProvider) GetByDate(ctx context.Context, month, day int) (map[string]string, error) {
	m.called++
	return m.date, m.dateErr
}
func (m *mockProvider) GetToday(ctx context.Context) (map[string]string, error) {
	return m.today, m.todayE
}
func (m *mockProvider) SearchByName(ctx context.Context, name string) ([]CountryResult, error) {
	return m.search, m.srchErr
}
func (m *mockProvider) SupportedCountries() []string { return m.countries }

func TestServiceGetByDatePrimarySuccess(t *testing.T) {
	primary := &mockProvider{date: map[string]string{"cz": "Jan"}, countries: []string{"cz"}}
	fallback := &mockProvider{countries: []string{"sk"}}
	svc := NewService(primary, fallback, nil, zap.NewNop())

	got, err := svc.GetByDate(context.Background(), 1, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got["cz"] != "Jan" {
		t.Fatalf("expected cz=Jan, got %v", got)
	}
	if fallback.called != 0 {
		t.Fatalf("fallback should not be called on primary success")
	}
}

func TestServiceGetByDatePrimaryFailFallback(t *testing.T) {
	primary := &mockProvider{dateErr: errors.New("api down"), countries: []string{"cz"}}
	fallback := &mockProvider{date: map[string]string{"sk": "Ivan"}, countries: []string{"sk"}}
	svc := NewService(primary, fallback, nil, zap.NewNop())

	got, err := svc.GetByDate(context.Background(), 1, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got["sk"] != "Ivan" {
		t.Fatalf("expected sk=Ivan from fallback, got %v", got)
	}
	if fallback.called != 1 {
		t.Fatalf("fallback should be called once, got %d", fallback.called)
	}
}

func TestServiceGetByDateBothFail(t *testing.T) {
	primary := &mockProvider{dateErr: errors.New("api down"), countries: []string{"cz"}}
	fallback := &mockProvider{dateErr: errors.New("csv missing"), countries: []string{"sk"}}
	svc := NewService(primary, fallback, nil, zap.NewNop())

	if _, err := svc.GetByDate(context.Background(), 1, 1); err == nil {
		t.Fatal("expected error when both providers fail")
	}
}

func TestServiceSearchFallback(t *testing.T) {
	primary := &mockProvider{srchErr: errors.New("api down"), countries: []string{"cz"}}
	fallback := &mockProvider{search: []CountryResult{{Country: "sk", Dates: []NameDate{{Day: 1, Month: 1, Name: "Jan"}}}}, countries: []string{"sk"}}
	svc := NewService(primary, fallback, nil, zap.NewNop())

	got, err := svc.SearchByName(context.Background(), "Jan")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].Country != "sk" {
		t.Fatalf("expected fallback sk result, got %v", got)
	}
}

func TestServiceSupportedCountriesUnion(t *testing.T) {
	primary := &mockProvider{countries: []string{"cz", "de", "sk"}}
	fallback := &mockProvider{countries: []string{"cz", "hu", "pl"}}
	svc := NewService(primary, fallback, nil, zap.NewNop())

	got := svc.SupportedCountries()
	want := []string{"cz", "de", "hu", "pl", "sk"}
	if len(got) != len(want) {
		t.Fatalf("expected %d countries, got %d: %v", len(want), len(got), got)
	}
	for i, c := range want {
		if got[i] != c {
			t.Errorf("countries[%d] = %q, want %q (all=%v)", i, got[i], c, got)
		}
	}
}

func TestAbalinGetByDateMock(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/date" {
			t.Errorf("unexpected path %q", r.URL.Path)
		}
		if r.URL.Query().Get("day") != "1" || r.URL.Query().Get("month") != "1" {
			t.Errorf("unexpected query %v", r.URL.Query())
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"message": "Namedays for 01-01",
			"data":    map[string]string{"cz": "Novy rok", "sk": "Novy rok"},
		})
	}))
	defer srv.Close()

	c := NewAbalinClient(srv.URL)
	got, err := c.GetByDate(context.Background(), 1, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got["cz"] != "Novy rok" || got["sk"] != "Novy rok" {
		t.Fatalf("unexpected data: %v", got)
	}
}

func TestAbalinGetTodayMock(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/today/") {
			t.Errorf("unexpected path %q", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"data":    map[string]string{"cz": "Nora"},
		})
	}))
	defer srv.Close()

	c := NewAbalinClient(srv.URL)
	got, err := c.GetToday(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got["cz"] != "Nora" {
		t.Fatalf("expected cz=Nora, got %v", got)
	}
}

func TestAbalinSearchByNameMock(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/getname" || r.Method != http.MethodPost {
			t.Errorf("unexpected %s %q", r.Method, r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"data": []map[string]any{
				{
					"country": "cz",
					"0":       map[string]any{"day": float64(24), "month": float64(5), "name": "Jana"},
					"1":       map[string]any{"day": float64(24), "month": float64(6), "name": "Jan"},
				},
				{
					"country": "sk",
					"0":       map[string]any{"day": float64(24), "month": float64(6), "name": "Jan"},
				},
			},
		})
	}))
	defer srv.Close()

	c := NewAbalinClient(srv.URL)
	got, err := c.SearchByName(context.Background(), "Jan")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("expected 2 country results, got %d", len(got))
	}
	// Find the cz entry.
	var cz *CountryResult
	for i := range got {
		if got[i].Country == "cz" {
			cz = &got[i]
		}
	}
	if cz == nil {
		t.Fatal("cz result missing")
	}
	if len(cz.Dates) != 2 {
		t.Fatalf("expected 2 cz dates, got %d", len(cz.Dates))
	}
}

func TestAbalinSupportedCountries(t *testing.T) {
	c := NewAbalinClient("")
	got := c.SupportedCountries()
	if len(got) != 19 {
		t.Fatalf("expected 19 countries, got %d: %v", len(got), got)
	}
}

func TestAbalinHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	c := NewAbalinClient(srv.URL)
	if _, err := c.GetByDate(context.Background(), 1, 1); err == nil {
		t.Fatal("expected error on HTTP 500")
	}
}

func TestAbalinUnsuccessfulResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"success": false, "message": "nope"})
	}))
	defer srv.Close()

	c := NewAbalinClient(srv.URL)
	if _, err := c.GetByDate(context.Background(), 1, 1); err == nil {
		t.Fatal("expected error on unsuccessful response")
	}
}
