// Package config loads environment variables into a typed Config.
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all runtime configuration loaded from the environment.
type Config struct {
	AppEnv      string
	AppPort     string
	AppLogLevel string
	AppPublicURL string

	DatabaseURL string

	DragonflyAddr     string
	DragonflyPassword string

	AuthSecret          string
	AuthSessionCookie   string
	AuthSessionTTL      time.Duration
	AuthRememberMeTTL   time.Duration
	AuthRateLimitPerMin int

	CORSAllowedOrigins  []string
	CSRFTrustedOrigins  []string

	NamedayDataPath string
}

// Load reads configuration from environment variables, applying sensible defaults.
func Load() (Config, error) {
	cfg := Config{
		AppEnv:      getenv("APP_ENV", "development"),
		AppPort:     getenv("APP_PORT", "8081"),
		AppLogLevel: getenv("APP_LOG_LEVEL", "info"),
		AppPublicURL: getenv("APP_PUBLIC_URL", "http://localhost:8080"),

		DatabaseURL: getenv("DATABASE_URL", ""),

		DragonflyAddr:     getenv("DRAGONFLY_ADDR", "localhost:6379"),
		DragonflyPassword: getenv("DRAGONFLY_PASSWORD", ""),

		AuthSecret:        getenv("AUTH_SECRET", ""),
		AuthSessionCookie: getenv("AUTH_SESSION_COOKIE", "peoplevault_session"),
		NamedayDataPath:   getenv("NAMEDAY_DATA_PATH", ""),

		CORSAllowedOrigins: splitCSV(getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8080")),
		CSRFTrustedOrigins: splitCSV(getenv("CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://localhost:8080")),
	}

	ttl, err := strconv.Atoi(getenv("AUTH_SESSION_TTL", "2592000"))
	if err != nil {
		return cfg, fmt.Errorf("AUTH_SESSION_TTL: %w", err)
	}
	cfg.AuthSessionTTL = time.Duration(ttl) * time.Second

	remTTL, err := strconv.Atoi(getenv("AUTH_REMEMBER_ME_TTL", "7776000"))
	if err != nil {
		return cfg, fmt.Errorf("AUTH_REMEMBER_ME_TTL: %w", err)
	}
	cfg.AuthRememberMeTTL = time.Duration(remTTL) * time.Second

	cfg.AuthRateLimitPerMin, err = strconv.Atoi(getenv("AUTH_RATE_LIMIT_PER_MIN", "10"))
	if err != nil {
		return cfg, fmt.Errorf("AUTH_RATE_LIMIT_PER_MIN: %w", err)
	}

	if cfg.DatabaseURL == "" {
		return cfg, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.AuthSecret == "" {
		return cfg, fmt.Errorf("AUTH_SECRET is required")
	}

	return cfg, nil
}

// IsProduction reports whether the app runs in production mode.
func (c Config) IsProduction() bool { return c.AppEnv == "production" }

func getenv(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
