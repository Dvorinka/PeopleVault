// Package main is the PeopleVault backend entrypoint.
package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/dvorinka/peoplevault/internal/config"
	"github.com/dvorinka/peoplevault/internal/holiday"
	"github.com/dvorinka/peoplevault/internal/logger"
	"github.com/dvorinka/peoplevault/internal/migrate"
	"github.com/dvorinka/peoplevault/internal/nameday"
	"github.com/dvorinka/peoplevault/internal/repo"
	"github.com/dvorinka/peoplevault/internal/server"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config error: %v\n", err)
		os.Exit(1)
	}

	log, err := logger.New(cfg.AppLogLevel, cfg.AppEnv)
	if err != nil {
		fmt.Fprintf(os.Stderr, "logger error: %v\n", err)
		os.Exit(1)
	}
	defer log.Sync()

	// Run migrations.
	migCtx, migCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer migCancel()
	if err := migrate.Run(migCtx, cfg.DatabaseURL); err != nil {
		log.Fatal("migrations failed", zap.Error(err))
	}
	log.Info("migrations applied")

	// Postgres pool.
	poolCtx, poolCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer poolCancel()
	pool, err := server.PgxPool(poolCtx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal("postgres connect failed", zap.Error(err))
	}
	defer pool.Close()
	if err := pool.Ping(poolCtx); err != nil {
		log.Fatal("postgres ping failed", zap.Error(err))
	}
	log.Info("postgres connected")
	store := repo.NewStore(pool)

	// DragonflyDB (Redis-compatible) — optional. If DRAGONFLY_ADDR is empty,
	// the backend runs cache-free. Rate limiting falls back to fail-open (no limit).
	var rdb *redis.Client
	if cfg.HasCache() {
		rdb = redis.NewClient(&redis.Options{
			Addr:     cfg.DragonflyAddr,
			Password: cfg.DragonflyPassword,
		})
		pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer pingCancel()
		if err := rdb.Ping(pingCtx).Err(); err != nil {
			log.Warn("dragonfly ping failed (rate limiting will fail open)", zap.Error(err))
		} else {
			log.Info("dragonfly connected")
		}
	} else {
		log.Info("dragonfly not configured — running cache-free (rate limiting disabled)")
	}

	// Nameday loader: prefer explicit path, else resolve repo-relative data dir.
	namedayPath := cfg.NamedayDataPath
	if namedayPath == "" {
		// Default to ../../data/namedays relative to the binary, or /app/data/namedays in Docker.
		candidates := []string{
			"/app/data/namedays",
			filepath.Join(mustAbs(filepath.Dir(os.Args[0])), "..", "..", "data", "namedays"),
			filepath.Join(mustAbs("."), "data", "namedays"),
		}
		for _, c := range candidates {
			if _, err := os.Stat(c); err == nil {
				namedayPath = c
				break
			}
		}
	}
	if namedayPath == "" {
		log.Fatal("nameday data path not found; set NAMEDAY_DATA_PATH")
	}
	loader, err := nameday.NewLoader(namedayPath)
	if err != nil {
		log.Fatal("nameday loader failed", zap.Error(err))
	}
	log.Info("nameday calendars loaded", zap.Strings("countries", loader.Countries()))

	// Nameday service: Abalin API primary + CSV fallback + optional cache.
	abalin := nameday.NewAbalinClient("")
	namedaySvc := nameday.NewService(abalin, loader, rdb, log)

	// Holiday service: date.nager.at v4 + optional cache.
	holidaySvc := holiday.NewService(holiday.NewClient(""), rdb, log)

	deps := server.Deps{
		Cfg:      cfg,
		Log:      log,
		Store:    store,
		RDB:      rdb,
		Namedays: namedaySvc,
		Holidays: holidaySvc,
	}
	if err := server.Run(deps); err != nil {
		log.Fatal("server error", zap.Error(err))
	}
}

func mustAbs(p string) string {
	a, err := filepath.Abs(p)
	if err != nil {
		return p
	}
	return a
}
