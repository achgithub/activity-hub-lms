package main

import (
	"database/sql"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"

	authlib "github.com/achgithub/activity-hub-auth"
	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
)

var db *sql.DB

const APP_NAME = "LMS Manager"

func main() {
	log.Printf("🎯 %s Backend Starting", APP_NAME)

	// Get socket path from environment or use default
	socketPath := os.Getenv("SOCKET_PATH")
	if socketPath == "" {
		socketPath = "/tmp/activity-hub-lms.sock"
	}

	// Remove existing socket if it exists
	if err := os.RemoveAll(socketPath); err != nil {
		log.Fatalf("Failed to remove existing socket: %v", err)
	}

	// Get database configuration from environment
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASS", "")
	dbName := getEnv("DB_NAME", "activity_hub") // All LMS tables are in activity_hub DB

	// Initialize database connection (single DB - activity_hub contains all tables)
	var err error
	db, err = sql.Open("postgres", fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName,
	))
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Printf("✅ Connected to PostgreSQL database: %s", dbName)

	// Build auth middleware using activity-hub-auth SDK
	authMiddleware := authlib.Middleware(db)

	// Setup router
	r := mux.NewRouter()

	// Public endpoints
	r.HandleFunc("/api/config", HandleConfig).Methods("GET")

	// Report endpoint (auth-only, no external access)
	r.Handle("/api/report/{gameId}", authMiddleware(http.HandlerFunc(HandleGetReport))).Methods("GET")

	// Setup endpoints (groups, teams, players)
	r.Handle("/api/groups", authMiddleware(http.HandlerFunc(HandleListGroups))).Methods("GET")
	r.Handle("/api/groups", authMiddleware(http.HandlerFunc(HandleCreateGroup))).Methods("POST")
	r.Handle("/api/groups/{id}", authMiddleware(http.HandlerFunc(HandleDeleteGroup))).Methods("DELETE")

	r.Handle("/api/groups/{id}/teams", authMiddleware(http.HandlerFunc(HandleListTeams))).Methods("GET")
	r.Handle("/api/groups/{id}/teams", authMiddleware(http.HandlerFunc(HandleCreateTeam))).Methods("POST")
	r.Handle("/api/teams/{id}", authMiddleware(http.HandlerFunc(HandleUpdateTeam))).Methods("PUT")
	r.Handle("/api/teams/{id}", authMiddleware(http.HandlerFunc(HandleDeleteTeam))).Methods("DELETE")

	r.Handle("/api/players", authMiddleware(http.HandlerFunc(HandleListPlayers))).Methods("GET")
	r.Handle("/api/players", authMiddleware(http.HandlerFunc(HandleCreatePlayer))).Methods("POST")
	r.Handle("/api/players/{id}", authMiddleware(http.HandlerFunc(HandleDeletePlayer))).Methods("DELETE")

	// Game endpoints
	r.Handle("/api/games", authMiddleware(http.HandlerFunc(HandleListGames))).Methods("GET")
	r.Handle("/api/games", authMiddleware(http.HandlerFunc(HandleCreateGame))).Methods("POST")
	r.Handle("/api/games/{id}", authMiddleware(http.HandlerFunc(HandleGetGame))).Methods("GET")
	r.Handle("/api/games/{id}", authMiddleware(http.HandlerFunc(HandleDeleteGame))).Methods("DELETE")
	r.Handle("/api/games/{id}/advance", authMiddleware(http.HandlerFunc(HandleAdvanceRound))).Methods("POST")
	r.Handle("/api/games/{id}/used-teams", authMiddleware(http.HandlerFunc(HandleGetUsedTeams))).Methods("GET")
	r.Handle("/api/games/{id}/participants", authMiddleware(http.HandlerFunc(HandleAddParticipants))).Methods("POST")

	// Round/Pick endpoints
	r.Handle("/api/rounds/{roundId}/picks", authMiddleware(http.HandlerFunc(HandleGetRoundPicks))).Methods("GET")
	r.Handle("/api/rounds/{roundId}/picks", authMiddleware(http.HandlerFunc(HandleSavePicks))).Methods("POST")
	r.Handle("/api/rounds/{roundId}/finalize-picks", authMiddleware(http.HandlerFunc(HandleFinalizePicks))).Methods("POST")
	r.Handle("/api/rounds/{roundId}/results", authMiddleware(http.HandlerFunc(HandleSaveResults))).Methods("POST")
	r.Handle("/api/rounds/{roundId}/close", authMiddleware(http.HandlerFunc(HandleCloseRound))).Methods("POST")
	r.Handle("/api/rounds/{roundId}/reopen", authMiddleware(http.HandlerFunc(HandleReopenRound))).Methods("POST")

	// Serve static files (React build)
	staticPath := getEnv("STATIC_PATH", "./static")
	if _, err := os.Stat(staticPath); os.IsNotExist(err) {
		log.Printf("Warning: Static directory not found at %s", staticPath)
	} else {
		r.PathPrefix("/").Handler(http.FileServer(http.Dir(staticPath)))
		log.Printf("📁 Serving static files from: %s", staticPath)
	}

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	// Create Unix socket listener
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		log.Fatalf("Failed to create Unix socket: %v", err)
	}
	defer listener.Close()

	// Set socket permissions
	if err := os.Chmod(socketPath, 0777); err != nil {
		log.Fatalf("Failed to set socket permissions: %v", err)
	}

	// Start server on Unix socket
	log.Printf("🎯 %s server starting on Unix socket: %s", APP_NAME, socketPath)
	log.Fatal(http.Serve(listener, handler))
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
