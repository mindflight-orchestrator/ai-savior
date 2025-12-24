package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/jwt/v3"
)

// AuthConfig holds the authentication configuration
type AuthConfig struct {
	JWTSecret   string
	APIKeySecret string
}

// Auth creates authentication middleware
// Supports both JWT and API key authentication
func Auth(config AuthConfig) fiber.Handler {
	// If JWT secret is provided, use JWT middleware
	if config.JWTSecret != "" {
		return jwtware.New(jwtware.Config{
			SigningKey: []byte(config.JWTSecret),
			ErrorHandler: func(c *fiber.Ctx, err error) error {
				return c.Status(401).JSON(fiber.Map{
					"error": "Unauthorized",
					"code":  "UNAUTHORIZED",
				})
			},
		})
	}

	// Otherwise, use API key authentication
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{
				"error": "Missing Authorization header",
				"code":  "UNAUTHORIZED",
			})
		}

		// Extract token from "Bearer <token>" format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(401).JSON(fiber.Map{
				"error": "Invalid Authorization header format",
				"code":  "UNAUTHORIZED",
			})
		}

		token := parts[1]

		// Validate API key
		if config.APIKeySecret == "" || token != config.APIKeySecret {
			return c.Status(401).JSON(fiber.Map{
				"error": "Invalid API key",
				"code":  "UNAUTHORIZED",
			})
		}

		// Store API key in locals for handlers
		c.Locals("api_key", token)

		return c.Next()
	}
}

