package model

type Badge struct {
	Name   string `json:"name"`
	Icon   string `json:"icon"`
	Points int    `json:"points"`
	Color  string `json:"color"`
}

type TaskGamification struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	BoardID         string `json:"board_id"`
	BoardTitle      string `json:"board_title"`
	Priority        string `json:"priority"`
	Points          int    `json:"points"`
	CompletedAt     int64  `json:"completed_at,omitempty"`
	DueDate         int64  `json:"due_date,omitempty"`
	EarlyCompletion bool   `json:"early_completion"`
	OnTime          bool   `json:"on_time"`
}

type GamificationSummary struct {
	TotalCompleted int            `json:"total_completed"`
	ByPriority     map[string]int `json:"by_priority"`
	TotalPoints    int            `json:"total_points"`
	CurrentBadge   Badge          `json:"current_badge"`
}

type GamificationResponse struct {
	Completed []TaskGamification  `json:"completed"`
	Summary   GamificationSummary `json:"summary"`
}