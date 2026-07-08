// Package server wires dependencies, registers routes, and runs the Gin
// server with graceful shutdown.
package server

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/dvorinka/peoplevault/internal/config"
	"github.com/dvorinka/peoplevault/internal/handler"
	"github.com/dvorinka/peoplevault/internal/middleware"
	"github.com/dvorinka/peoplevault/internal/nameday"
	"github.com/dvorinka/peoplevault/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// Deps bundles all runtime dependencies handed to the server.
type Deps struct {
	Cfg    config.Config
	Log    *zap.Logger
	Store  *repo.Store
	RDB    *redis.Client
	Loader *nameday.Loader
}

// New builds the Gin engine with all routes registered.
func New(d Deps) *gin.Engine {
	if d.Cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}
	v := validator.New()

	r := gin.New()
	r.Use(
		middleware.RequestID(),
		middleware.Recover(d.Log),
		middleware.SecurityHeaders(d.Cfg.IsProduction()),
		middleware.CORS(d.Cfg.CORSAllowedOrigins),
		gin.LoggerWithConfig(gin.LoggerConfig{SkipPaths: []string{"/healthz"}}),
	)

	q := d.Store.Queries

	authH := handler.NewAuthHandler(q, d.Log, d.Cfg, v)
	userH := handler.NewUserHandler(q, d.Log, v)
	personH := handler.NewPersonHandler(q, d.Log, v)
	tagH := handler.NewTagHandler(q, d.Log, v)
	eventH := handler.NewEventHandler(q, d.Log, v)
	reminderH := handler.NewReminderHandler(q, d.Log, v)
	timelineH := handler.NewTimelineHandler(q, d.Log, v)
	relH := handler.NewRelationshipHandler(q, d.Log, v)
	attachH := handler.NewAttachmentHandler(q, d.Log)
	namedayH := handler.NewNamedayHandler(d.Loader, d.Log)
	dashH := handler.NewDashboardHandler(q, d.Loader, d.Log)

	// Public routes (no auth).
	r.GET("/healthz", handler.Healthz)

	authRateLimit := middleware.RateLimit(d.RDB, d.Cfg.AuthRateLimitPerMin, d.Log)
	auth := r.Group("/auth")
	{
		auth.POST("/register", authRateLimit, authH.Register)
		auth.POST("/login", authRateLimit, authH.Login)
		auth.POST("/forgot-password", authRateLimit, authH.ForgotPassword)
		auth.POST("/reset-password", authRateLimit, authH.ResetPassword)
		auth.POST("/verify-email", authRateLimit, authH.VerifyEmail)
	}

	namedays := r.Group("/namedays")
	{
		namedays.GET("", namedayH.ListCountries)
		namedays.GET("/:country", namedayH.GetCountry)
	}

	// Authenticated routes.
	authMW := middleware.AuthRequired(q, d.Cfg.AuthSessionCookie, d.Log)
	csrfMW := middleware.CSRF(d.Cfg.CSRFTrustedOrigins)

	authed := r.Group("")
	authed.Use(authMW)
	{
		authed.POST("/auth/logout", csrfMW, authH.Logout)
		authed.GET("/auth/me", authH.Me)

		authed.GET("/users/me", userH.Me)
		authed.GET("/users/me/settings", userH.GetSettings)
		authed.PUT("/users/me/settings", csrfMW, userH.UpdateSettings)

		authed.GET("/people", personH.List)
		authed.POST("/people", csrfMW, personH.Create)
		authed.GET("/people/:id", personH.Get)
		authed.PUT("/people/:id", csrfMW, personH.Update)
		authed.DELETE("/people/:id", csrfMW, personH.Delete)
		authed.POST("/people/:id/favorite", csrfMW, personH.SetFavorite)

		authed.GET("/people/:id/timeline", timelineH.List)
		authed.POST("/people/:id/timeline", csrfMW, timelineH.Create)
		authed.DELETE("/timeline/:id", csrfMW, timelineH.Delete)

		authed.GET("/people/:id/relationships", relH.List)
		authed.POST("/relationships", csrfMW, relH.Create)
		authed.DELETE("/relationships/:id", csrfMW, relH.Delete)

		authed.GET("/people/:id/attachments", attachH.List)
		authed.DELETE("/attachments/:id", csrfMW, attachH.Delete)

		authed.GET("/tags", tagH.List)
		authed.POST("/tags", csrfMW, tagH.Create)
		authed.DELETE("/tags/:id", csrfMW, tagH.Delete)

		authed.GET("/events", eventH.List)
		authed.POST("/events", csrfMW, eventH.Create)
		authed.PUT("/events/:id", csrfMW, eventH.Update)
		authed.DELETE("/events/:id", csrfMW, eventH.Delete)

		authed.GET("/reminders", reminderH.List)
		authed.POST("/reminders", csrfMW, reminderH.Create)
		authed.POST("/reminders/:id/fire", csrfMW, reminderH.Fire)

		authed.GET("/search", personH.Search)
		authed.GET("/dashboard", dashH.Get)
	}

	return r
}

// Run starts the HTTP server and blocks until a termination signal is
// received, then gracefully shuts down within 10 seconds.
func Run(d Deps) error {
	gin.SetMode(gin.ReleaseMode)
	if !d.Cfg.IsProduction() {
		gin.SetMode(gin.DebugMode)
	}
	r := New(d)

	srv := &http.Server{
		Addr:              ":" + d.Cfg.AppPort,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		d.Log.Info("http server starting", zap.String("port", d.Cfg.AppPort))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case <-stop:
		d.Log.Info("shutdown signal received")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		return err
	}
	d.Log.Info("server stopped cleanly")
	return nil
}

// PgxPool builds a pgxpool.Pool from the given DSN.
func PgxPool(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return pool, nil
}
