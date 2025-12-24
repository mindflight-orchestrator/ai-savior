package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DBHost      string
	DBPort      string
	DBUser      string
	DBPassword  string
	DBName      string
	DBSchema    string
	DBSSLMode   string
	JWTSecret   string
	APIKeySecret string
	CORSOrigins []string
	RateLimitMax int
}

func Load() (*Config, error) {
	// Load .env file if it exists (ignore error if it doesn't)
	_ = godotenv.Load()

	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		DBHost:      getEnv("DB_HOST", "localhost"),
		DBPort:      getEnv("DB_PORT", "5432"),
		DBUser:      getEnv("DB_USER", "mfoserver"),
		DBPassword:  getEnv("DB_PASSWORD", "mfoserver"),
		DBName:      getEnv("DB_NAME", "mfo"),
		DBSchema:    getEnv("DB_SCHEMA", "mfo-server"),
		DBSSLMode:   getEnv("DB_SSL_MODE", "disable"),
		JWTSecret:   getEnv("JWT_SECRET", ""),
		APIKeySecret: getEnv("API_KEY_SECRET", ""),
		RateLimitMax: getEnvAsInt("RATE_LIMIT_MAX", 100),
	}

	// Parse CORS origins
	corsOriginsStr := getEnv("CORS_ORIGINS", "")
	if corsOriginsStr != "" {
		cfg.CORSOrigins = strings.Split(corsOriginsStr, ",")
		for i, origin := range cfg.CORSOrigins {
			cfg.CORSOrigins[i] = strings.TrimSpace(origin)
		}
	}

	return cfg, nil
}

func (c *Config) DatabaseURL() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s&search_path=%s",
		c.DBUser,
		c.DBPassword,
		c.DBHost,
		c.DBPort,
		c.DBName,
		c.DBSSLMode,
		c.DBSchema,
	)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

