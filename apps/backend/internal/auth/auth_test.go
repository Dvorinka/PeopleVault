package auth

import (
	"strings"
	"testing"
)

func TestHashAndVerifyPassword(t *testing.T) {
	tests := []struct {
		name    string
		pw      string
		wantErr bool
		verify  string
		wantOK  bool
	}{
		{"valid password", "supersecret1234", false, "supersecret1234", true},
		{"wrong password", "supersecret1234", false, "wrongpassword", false},
		{"too short", "short", true, "", false},
		{"empty", "", true, "", false},
		{"exactly 12", "abcdefghijkl", false, "abcdefghijkl", true},
		{"case sensitive", "SuperSecret123", false, "supersecret123", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.pw)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				if !strings.Contains(err.Error(), "12") {
					t.Fatalf("expected min length error, got %v", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if hash == tt.pw {
				t.Fatal("hash should not equal plaintext")
			}
			got := VerifyPassword(hash, tt.verify)
			if got != tt.wantOK {
				t.Fatalf("VerifyPassword(%q) = %v, want %v", tt.verify, got, tt.wantOK)
			}
		})
	}
}

func TestHashPasswordUniqueSalts(t *testing.T) {
	h1, _ := HashPassword("samepassword12")
	h2, _ := HashPassword("samepassword12")
	if h1 == h2 {
		t.Fatal("bcrypt hashes should differ due to random salt")
	}
	if !VerifyPassword(h1, "samepassword12") {
		t.Fatal("first hash should verify")
	}
}

func TestGenerateToken(t *testing.T) {
	t1, err := GenerateToken()
	if err != nil {
		t.Fatalf("GenerateToken error: %v", err)
	}
	t2, err := GenerateToken()
	if err != nil {
		t.Fatalf("GenerateToken error: %v", err)
	}
	if t1 == t2 {
		t.Fatal("tokens should be unique")
	}
	if len(t1) < 32 {
		t.Fatalf("token too short: %d", len(t1))
	}
	if strings.ContainsAny(t1, "+/=") {
		t.Logf("note: token uses RawURLEncoding; got %q", t1)
	}
}

func TestHashTokenDeterministic(t *testing.T) {
	token := "abc123token"
	h1 := HashToken(token)
	h2 := HashToken(token)
	if h1 != h2 {
		t.Fatal("HashToken should be deterministic")
	}
	if h1 == token {
		t.Fatal("hash should not equal token")
	}
	if len(h1) != 64 {
		t.Fatalf("SHA-256 hex should be 64 chars, got %d", len(h1))
	}
}

func TestHashTokenDifferentInputs(t *testing.T) {
	if HashToken("a") == HashToken("b") {
		t.Fatal("different inputs should produce different hashes")
	}
}
