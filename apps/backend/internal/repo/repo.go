// Package repo is a thin wrapper over generated sqlc queries, injecting a
// shared pgx pool and exposing a single Store used by handlers/services.
package repo

import (
	"context"

	"github.com/dvorinka/peoplevault/internal/db/sqlc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store bundles all sqlc queries with a shared pool and exposes transaction
// helpers. All user-scoped methods require an owner_user_id parameter.
type Store struct {
	*sqlc.Queries
	pool *pgxpool.Pool
}

// NewStore creates a Store backed by the given pool.
func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{
		Queries: sqlc.New(pool),
		pool:    pool,
	}
}

// Pool returns the underlying pgx pool (used by migrations and health checks).
func (s *Store) Pool() *pgxpool.Pool { return s.pool }

// WithTx runs fn inside a transaction, committing on success and rolling back
// on error (including panics).
func (s *Store) WithTx(ctx context.Context, fn func(*sqlc.Queries) error) error {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	q := sqlc.New(tx)
	defer tx.Rollback(ctx)
	if err := fn(q); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
