package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

// ErrorHandler is a centralized error handler middleware
func ErrorHandler(c *fiber.Ctx, err error) error {
	// Default error
	code := fiber.StatusInternalServerError
	message := "Internal server error"

	// Check if it's a Fiber error
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	// Check for database errors
	if err == pgx.ErrNoRows {
		code = fiber.StatusNotFound
		message = "Resource not found"
	}

	// Return error response
	return c.Status(code).JSON(fiber.Map{
		"error": message,
		"code":  getErrorCode(code),
	})
}

func getErrorCode(statusCode int) string {
	switch statusCode {
	case 400:
		return "BAD_REQUEST"
	case 401:
		return "UNAUTHORIZED"
	case 403:
		return "FORBIDDEN"
	case 404:
		return "NOT_FOUND"
	case 500:
		return "INTERNAL_SERVER_ERROR"
	case 503:
		return "SERVICE_UNAVAILABLE"
	default:
		return "UNKNOWN_ERROR"
	}
}

