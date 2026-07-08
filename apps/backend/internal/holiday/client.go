package holiday

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// DefaultBaseURL is the public date.nager.at v4 API root.
const DefaultBaseURL = "https://date.nager.at/api/v4"

// Client fetches holidays from date.nager.at.
type Client struct {
	baseURL string
	hc      *http.Client
}

// NewClient builds a holiday Client with a 10s timeout.
func NewClient(baseURL string) *Client {
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		hc:      &http.Client{Timeout: 10 * time.Second},
	}
}

// List returns the public holidays for the given country code and year.
func (c *Client) List(ctx context.Context, countryCode string, year int) ([]Holiday, error) {
	code := strings.ToLower(strings.TrimSpace(countryCode))
	if code == "" {
		return nil, fmt.Errorf("holiday: empty country code")
	}
	if year < 1900 || year > 2200 {
		return nil, fmt.Errorf("holiday: invalid year %d", year)
	}
	endpoint, err := url.JoinPath(c.baseURL, "Holidays", code, fmt.Sprintf("%d", year))
	if err != nil {
		return nil, fmt.Errorf("holiday url: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	res, err := c.hc.Do(req)
	if err != nil {
		return nil, fmt.Errorf("holiday request: %w", err)
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("holiday read: %w", err)
	}
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("holiday: HTTP %d: %s", res.StatusCode, truncBody(string(raw)))
	}
	var out []Holiday
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("holiday decode: %w", err)
	}
	return out, nil
}

func truncBody(s string) string {
	if len(s) <= 200 {
		return s
	}
	return s[:200] + "..."
}
