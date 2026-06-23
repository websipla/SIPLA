package middleware

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"` // "masyarakat", "admin", "petugas"
	jwt.RegisteredClaims
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak ditemukan"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
			if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak valid"})
			c.Abort()
			return
		}

		c.Set("user_id", claims.ID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		log.Printf("authenticated_request method=%s path=%s user_id=%s role=%s",
			c.Request.Method, c.FullPath(), maskIdentifier(claims.ID), claims.Role)
		c.Next()
	}
}

func maskIdentifier(value string) string {
	if len(value) <= 4 {
		return value
	}
	return strings.Repeat("*", len(value)-4) + value[len(value)-4:]
}

func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role != "admin" && role != "petugas" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func AdminRoleOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("role") != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya administrator yang dapat melakukan tindakan ini"})
			c.Abort()
			return
		}
		c.Next()
	}
}
