package holiday

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.uber.org/zap"
)

func TestClientListMock(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/Holidays/at/2026" {
			t.Errorf("unexpected path %q", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode([]Holiday{
			{
				Date:             "2026-01-01",
				Name:             "New Year's Day",
				CountryCode:      "AT",
				NationalHoliday:  true,
				SubdivisionCodes: nil,
				HolidayTypes:     []string{"Public"},
			},
		})
	}))
	defer srv.Close()

	c := NewClient(srv.URL)
	got, err := c.List(context.Background(), "AT", 2026)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].Name != "New Year's Day" {
		t.Fatalf("unexpected result: %v", got)
	}
}

func TestClientListHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	c := NewClient(srv.URL)
	if _, err := c.List(context.Background(), "AT", 2026); err == nil {
		t.Fatal("expected error on HTTP 404")
	}
}

func TestClientListInvalidYear(t *testing.T) {
	c := NewClient("")
	if _, err := c.List(context.Background(), "AT", 1800); err == nil {
		t.Fatal("expected error for invalid year")
	}
}

func TestServiceListNoCache(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]Holiday{{Date: "2026-01-01", Name: "New Year", CountryCode: "AT"}})
	}))
	defer srv.Close()

	svc := NewService(NewClient(srv.URL), nil, zap.NewNop())
	got, err := svc.List(context.Background(), "AT", 2026)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 holiday, got %d", len(got))
	}
}

func TestServiceListCurrentYearNoCache(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]Holiday{{Date: "2026-01-01", Name: "New Year", CountryCode: "AT"}})
	}))
	defer srv.Close()

	svc := NewService(NewClient(srv.URL), nil, zap.NewNop())
	got, err := svc.ListCurrentYear(context.Background(), "AT")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 holiday, got %d", len(got))
	}
}

func TestServiceNilClientDefaults(t *testing.T) {
	// NewService with nil client should not panic and should construct a
	// default client. We don't make a real request here.
	svc := NewService(nil, nil, zap.NewNop())
	if svc == nil || svc.client == nil {
		t.Fatal("service or client should not be nil")
	}
}
