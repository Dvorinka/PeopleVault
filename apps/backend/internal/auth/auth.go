// Package auth provides password hashing and session token utilities.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

const (
	// tokenBytes is the entropy (in bytes) of a session token.
	tokenBytes = 32
	// bcryptCost balances security and latency.
	bcryptCost = 12
)

// ErrPasswordTooShort is returned when a password does not meet the minimum length.
var ErrPasswordTooShort = errors.New("password must be at least 12 characters")

// HashPassword bcrypts a plaintext password, enforcing a minimum length.
func HashPassword(plain string) (string, error) {
	if len(plain) < 12 {
		return "", ErrPasswordTooShort
	}
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(b), nil
}

// VerifyPassword compares a plaintext password against a stored bcrypt hash.
func VerifyPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// GenerateToken returns a URL-safe random session token (32 bytes of entropy).
func GenerateToken() (string, error) {
	b := make([]byte, tokenBytes)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// HashToken returns the SHA-256 hex digest of a session token. Only the hash
// is persisted so a DB leak cannot reveal live sessions.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", sum[:])
}
