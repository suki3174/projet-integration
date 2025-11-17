package model

// NotificationResponse represents the complete notification data returned by the API
// swagger:model
type NotificationResponse struct {
	// Tasks that are overdue (past due date)
	Overdue []TaskNotification `json:"overdue"`

	// Tasks due within 1 hour
	DueUrgent []TaskNotification `json:"dueUrgent"`

	// Tasks due within 24 hours
	DueSoon []TaskNotification `json:"dueSoon"`

	// Summary statistics
	Summary NotificationSummary `json:"summary"`
}

// TaskNotification represents a single task notification
// swagger:model
type TaskNotification struct {
	// The task/card ID
	ID string `json:"id"`

	// The task title
	Title string `json:"title"`

	// The board ID this task belongs to
	BoardID string `json:"boardId"`

	// The board title
	BoardTitle string `json:"boardTitle"`

	// Due date timestamp in milliseconds
	DueDate int64 `json:"dueDate"`

	// Priority level (e.g., "High 🔥", "Medium", "Low")
	Priority string `json:"priority"`

	// Status (e.g., "Not Started", "In Progress", "Blocked")
	Status string `json:"status"`

	// Human-readable time remaining (e.g., "2 hours", "3 days overdue")
	TimeToGo string `json:"timeToGo"`
}

// NotificationSummary represents summary statistics for notifications
// swagger:model
type NotificationSummary struct {
	// Total number of pending (non-completed) tasks
	TotalPending int `json:"totalPending"`

	// Number of tasks due today
	DueToday int `json:"dueToday"`

	// Number of tasks due this week
	DueThisWeek int `json:"dueThisWeek"`

	// Number of overdue tasks
	OverdueCount int `json:"overdueCount"`
}