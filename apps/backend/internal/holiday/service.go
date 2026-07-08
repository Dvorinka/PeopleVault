package holiday

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// Service fetches holidays with optional DragonflyDB caching. If rdb is
// nil, caching is skipped and every request hits the upstream API.
type Service struct {
	client *Client
	rdb    *redis.Client // nil = no cache
	log    *zap.Logger
}

// NewService builds a holiday Service. rdb may be nil to disable caching.
func NewService(client *Client, rdb *redis.Client, log *zap.Logger) *Service {
	if log == nil {
		log = zap.NewNop()
	}
	if client == nil {
		client = NewClient("")
	}
	return &Service{client: client, rdb: rdb, log: log}
}

const (
	holidayCacheTTL = 7 * 24 * time.Hour
	holidayCacheTO  = 500 * time.Millisecond
)

// List returns the public holidays for the given country and year. It
// checks the cache (if configured) before hitting the upstream API.
func (s *Service) List(ctx context.Context, countryCode string, year int) ([]Holiday, error) {
	key := fmt.Sprintf("holiday:%s:%d", strings.ToLower(countryCode), year)
	if cached, ok := s.cacheGet(ctx, key); ok {
		return cached, nil
	}

	res, err := s.client.List(ctx, countryCode, year)
	if err != nil {
		return nil, err
	}
	s.cacheSet(ctx, key, res)
	return res, nil
}

// ListCurrentYear is a convenience for List with the current year.
func (s *Service) ListCurrentYear(ctx context.Context, countryCode string) ([]Holiday, error) {
	return s.List(ctx, countryCode, time.Now().UTC().Year())
}

func (s *Service) cacheGet(ctx context.Context, key string) ([]Holiday, bool) {
	if s.rdb == nil {
		return nil, false
	}
	cctx, cancel := context.WithTimeout(ctx, holidayCacheTO)
	defer cancel()
	raw, err := s.rdb.Get(cctx, key).Bytes()
	if err != nil {
		return nil, false
	}
	var out []Holiday
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, false
	}
	return out, true
}

func (s *Service) cacheSet(ctx context.Context, key string, val []Holiday) {
	if s.rdb == nil {
		return
	}
	payload, err := json.Marshal(val)
	if err != nil {
		return
	}
	cctx, cancel := context.WithTimeout(ctx, holidayCacheTO)
	defer cancel()
	if err := s.rdb.Set(cctx, key, payload, holidayCacheTTL).Err(); err != nil {
		s.log.Warn("holiday cache set failed", zap.String("key", key), zap.Error(err))
	}
}
