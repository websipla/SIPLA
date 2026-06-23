package main

import (
	"log"
	"os"
	"strings"
	"time"

	"pengaduan/config"
	"pengaduan/internal/upload"
	"pengaduan/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	if err := config.ValidateRequiredEnv(); err != nil {
		log.Fatal(err)
	}
	if err := config.InitDB(); err != nil {
		log.Fatal("Gagal menginisialisasi database: ", err)
	}
	if err := upload.EnsureBaseDir(); err != nil {
		log.Fatal("Gagal menyiapkan direktori upload: ", err)
	}

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins(),
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))
	r.MaxMultipartMemory = 10 << 20
	r.Static("/assets", upload.BaseDir())
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	routes.SetupRoutes(r)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server berjalan di port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func allowedOrigins() []string {
	seen := make(map[string]bool)
	var origins []string
	add := func(origin string) {
		origin = strings.TrimSpace(strings.TrimRight(origin, "/"))
		if origin != "" && !seen[origin] {
			seen[origin] = true
			origins = append(origins, origin)
		}
	}

	for _, origin := range strings.Split(os.Getenv("FRONTEND_URL"), ",") {
		add(origin)
	}
	if os.Getenv("APP_ENV") != "production" {
		add("http://localhost:5173")
		add("http://127.0.0.1:5173")
	}

	return origins
}
