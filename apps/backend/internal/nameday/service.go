package nameday

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// Service orchestrates nameday lookups: try the primary provider (Abalin
// API), fall back to the CSV loader on error, and cache results in
// DragonflyDB when available. If rdb is nil, caching is skipped entirely
// and the backend runs cache-free.
type Service struct {
	primary  Provider
	fallback Provider
	rdb      *redis.Client // nil = no cache
	log      *zap.Logger
}

// NewService builds a nameday Service. rdb may be nil to disable caching.
func NewService(primary, fallback Provider, rdb *redis.Client, log *zap.Logger) *Service {
	if log == nil {
		log = zap.NewNop()
	}
	return &Service{primary: primary, fallback: fallback, rdb: rdb, log: log}
}

const (
	namedayCacheTTL = 24 * time.Hour
	cacheTimeout    = 500 * time.Millisecond
)

// GetByDate returns namedays for the given month/day. It checks the cache
// (if configured), then the primary provider, then the fallback.
func (s *Service) GetByDate(ctx context.Context, month, day int) (map[string]string, error) {
	key := fmt.Sprintf("nameday:date:%d:%d", month, day)
	if cached, ok := s.cacheGet(ctx, key); ok {
		return cached, nil
	}

	res, err := s.primary.GetByDate(ctx, month, day)
	if err == nil {
		s.cacheSet(ctx, key, res)
		return res, nil
	}
	s.log.Warn("nameday primary failed, falling back to CSV",
		zap.Int("month", month), zap.Int("day", day), zap.Error(err))

	if s.fallback == nil {
		return nil, err
	}
	res, fbErr := s.fallback.GetByDate(ctx, month, day)
	if fbErr != nil {
		return nil, fmt.Errorf("nameday: primary: %v; fallback: %v", err, fbErr)
	}
	// Do not cache fallback results — they may be incomplete vs. the API.
	return res, nil
}

// GetToday returns today's namedays using the same cache/fallback strategy.
func (s *Service) GetToday(ctx context.Context) (map[string]string, error) {
	now := time.Now().UTC()
	return s.GetByDate(ctx, int(now.Month()), now.Day())
}

// SearchByName proxies to the primary provider (low frequency, no cache).
// On primary failure it falls back to the CSV loader.
func (s *Service) SearchByName(ctx context.Context, name string) ([]CountryResult, error) {
	res, err := s.primary.SearchByName(ctx, name)
	if err == nil {
		return res, nil
	}
	s.log.Warn("nameday search primary failed, falling back to CSV",
		zap.String("name", name), zap.Error(err))
	if s.fallback == nil {
		return nil, err
	}
	res, fbErr := s.fallback.SearchByName(ctx, name)
	if fbErr != nil {
		return nil, fmt.Errorf("nameday search: primary: %v; fallback: %v", err, fbErr)
	}
	return res, nil
}

// SupportedCountries returns the union of country codes supported by the
// primary and fallback providers, sorted and de-duplicated.
func (s *Service) SupportedCountries() []string {
	seen := make(map[string]struct{})
	var out []string
	for _, p := range []Provider{s.primary, s.fallback} {
		if p == nil {
			continue
		}
		for _, c := range p.SupportedCountries() {
			if _, ok := seen[c]; ok {
				continue
			}
			seen[c] = struct{}{}
			out = append(out, c)
		}
	}
	// out is already sorted if both providers return sorted lists, but
	// sort defensively in case.
	sortStrings(out)
	return out
}

func sortStrings(s []string) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j-1] > s[j]; j-- {
			s[j-1], s[j] = s[j], s[j-1]
		}
	}
}

func (s *Service) cacheGet(ctx context.Context, key string) (map[string]string, bool) {
	if s.rdb == nil {
		return nil, false
	}
	cctx, cancel := context.WithTimeout(ctx, cacheTimeout)
	defer cancel()
	raw, err := s.rdb.Get(cctx, key).Bytes()
	if err != nil {
		return nil, false
	}
	var out map[string]string
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, false
	}
	return out, true
}

func (s *Service) cacheSet(ctx context.Context, key string, val map[string]string) {
	if s.rdb == nil {
		return
	}
	payload, err := json.Marshal(val)
	if err != nil {
		return
	}
	cctx, cancel := context.WithTimeout(ctx, cacheTimeout)
	defer cancel()
	if err := s.rdb.Set(cctx, key, payload, namedayCacheTTL).Err(); err != nil {
		s.log.Warn("nameday cache set failed", zap.String("key", key), zap.Error(err))
	}
}
