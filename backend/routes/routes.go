package routes

import (
	"github.com/gin-gonic/gin"
	"pengaduan/controllers"
	"pengaduan/middleware"
)

func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api")

	// Public
	api.GET("/health", controllers.Health)
	api.POST("/auth/login", controllers.Login)
	api.POST("/auth/register", controllers.Register)
	api.GET("/provinces", controllers.GetProvinces)
	api.GET("/regencies", controllers.GetRegencies)
	api.GET("/districts", controllers.GetDistricts)
	api.GET("/villages", controllers.GetVillages)
	api.GET("/kelurahan", controllers.GetKelurahanInfo)
	api.GET("/jenis-layanan", controllers.GetJenisLayanan)
	api.GET("/public/statistik", controllers.GetStatistikPublik)
	api.POST("/public/lupa-password", controllers.AjukanLupaPassword) // ← BARU

	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		protected.GET("/auth/me", controllers.Me)
		protected.PUT("/auth/change-password", controllers.ChangePassword)

		// Aspirasi
		protected.GET("/aspirasi", controllers.GetPengaduan)
		protected.GET("/aspirasi/:id", controllers.GetPengaduanByID)
		protected.POST("/aspirasi", controllers.CreatePengaduan)
		protected.PUT("/aspirasi/:id", controllers.UpdatePengaduan)
		protected.DELETE("/aspirasi/:id", controllers.DeletePengaduan)

		// Permohonan
		protected.GET("/permohonan", controllers.GetPermohonan)
		protected.GET("/permohonan/:id", controllers.GetPermohonanByID)
		protected.POST("/permohonan", controllers.CreatePermohonan)
		protected.DELETE("/permohonan/:id", controllers.DeletePermohonan)

		// Admin / Petugas
		admin := protected.Group("/")
		admin.Use(middleware.AdminOnly())
		{
			admin.GET("/dashboard", controllers.GetDashboard)
			admin.GET("/debug/counts", controllers.DebugCounts)
			admin.POST("/tanggapan", controllers.CreateTanggapan)
			admin.PUT("/tanggapan/:id", controllers.UpdateTanggapan)
			admin.DELETE("/tanggapan/:id", controllers.DeleteTanggapan)
			admin.PUT("/permohonan/:id/proses", controllers.ProsesPermohonan)
			admin.PUT("/kelurahan", controllers.UpdateKelurahanInfo)
			admin.GET("/masyarakat", controllers.GetMasyarakat)
			admin.GET("/petugas", controllers.GetPetugas)
			admin.POST("/petugas", controllers.CreatePetugas)
			admin.DELETE("/petugas/:id", controllers.DeletePetugas)
			admin.PUT("/reset-password/masyarakat/:nik", controllers.ResetPasswordMasyarakat)
			admin.PUT("/reset-password/petugas/:id", controllers.ResetPasswordPetugas)
			admin.DELETE("/admin/aspirasi/:id", controllers.AdminDeleteAspirasi)
			admin.DELETE("/admin/permohonan/:id", controllers.AdminDeletePermohonan)

			// Lupa password notifikasi
			admin.GET("/lupa-password", controllers.GetPermintaanReset)
			admin.GET("/lupa-password/count", controllers.GetJumlahNotifReset)
			admin.PUT("/lupa-password/:id/baca", controllers.TandaiBaca)
			admin.PUT("/lupa-password/:id/selesai", controllers.SelesaikanPermintaanReset)
		}

		adminMaster := protected.Group("/")
		adminMaster.Use(middleware.AdminRoleOnly())
		{
			adminMaster.POST("/jenis-layanan", controllers.CreateJenisLayanan)
			adminMaster.PUT("/jenis-layanan/:id", controllers.UpdateJenisLayanan)
		}
	}
}
