package auth

// ValidateAPIKey validates an API key against a secret
func ValidateAPIKey(apiKey, secret string) bool {
	return apiKey != "" && secret != "" && apiKey == secret
}

