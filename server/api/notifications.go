package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

// Property IDs
const (
	PropertyDueDate  = "a3zsw7xs8sxy7atj8b6totp3mby"
	PropertyStatus   = "a972dc7a-5f4c-45d2-8044-8c28c69717f1"
	PropertyPriority = "d3d682bf-e074-49d9-8df5-7320921c2d23"
)

// Status IDs for filtering
const (
	StatusCompleted = "adeo5xuwne3qjue83fcozekz8ko" // "Completed 🙌"
	StatusArchived  = "ahpyxfnnrzynsw3im1psxpkgtpe" // "Archived"
)

// Status and Priority mappings
var statusNames = map[string]string{
	"ayz81h9f3dwp7rzzbdebesc7ute": "Not Started",
	"ar6b8m3jxr3asyxhr8iucdbo6yc": "In Progress",
	"afi4o5nhnqc3smtzs1hs3ij34dh": "Blocked",
	"adeo5xuwne3qjue83fcozekz8ko": "Completed 🙌",
	"ahpyxfnnrzynsw3im1psxpkgtpe": "Archived",
}

var priorityNames = map[string]string{
	"d3bfb50f-f569-4bad-8a3a-dd15c3f60101": "1. High 🔥",
	"87f59784-b859-4c24-8ebe-17c766e081dd": "2. Medium",
	"98a57627-0f76-471d-850d-91f3ed9fd213": "3. Low",
}

// HTTP Handler
func (a *API) handleGetNotifications(w http.ResponseWriter, r *http.Request) {
	// Get the connected user
	userID := getUserID(r)
	
	a.logger.Info("📬 Getting notifications for connected user",
		mlog.String("userID", userID))

	notifications, err := a.GetNotifications(userID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytes, err := json.Marshal(notifications)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, jsonBytes)
}

func (a *API) GetNotifications(userID string) (*model.NotificationResponse, error) {
	// Initialize response
	response := &model.NotificationResponse{
		Overdue:   []model.TaskNotification{},
		DueUrgent: []model.TaskNotification{},
		DueSoon:   []model.TaskNotification{},
		Summary:   model.NotificationSummary{},
	}

	// Time thresholds (in milliseconds)
	now := time.Now().Unix() * 1000
	oneHourFromNow := now + (60 * 60 * 1000)
	oneDayFromNow := now + (24 * 60 * 60 * 1000)
	oneWeekFromNow := now + (7 * 24 * 60 * 60 * 1000)

	// Get boards created by this user
	// userBoards, err := a.app.GetBoardsForUserAndTeam(userID, "", false)
	userBoards, err := a.app.GetBoardsForUserAndTeam(userID, "0", false)
	if err != nil {
		a.logger.Error("Failed to get user boards", mlog.Err(err))
		return response, nil
	}

	a.logger.Info("🔍 Scanning user's boards",
		mlog.String("userID", userID),
		mlog.Int("boardCount", len(userBoards)))

	totalCards := 0
	cardsWithDueDate := 0
	skippedCompleted := 0

	// Process each board
	for _, board := range userBoards {
		// Get all blocks (cards) from this board
		blocks, err := a.app.GetBlocksForBoard(board.ID)
		if err != nil {
			a.logger.Warn("Failed to get blocks for board",
				mlog.String("boardID", board.ID),
				mlog.Err(err))
			continue
		}

		// Process each card
		for _, block := range blocks {
			// Only process card type blocks that aren't deleted
			if block.Type != "card" || block.DeleteAt != 0 {
				continue
			}

			totalCards++

			// Extract properties from the fields
properties, ok := block.Fields["properties"].(map[string]interface{})
if !ok {
	continue
}

			// Skip completed or archived cards
			if statusID, ok := properties[PropertyStatus].(string); ok {
				if statusID == StatusCompleted || statusID == StatusArchived {
					skippedCompleted++
					continue
				}
			}

			// Check if card has a due date
			dueDateRaw, hasDueDate := properties[PropertyDueDate]
			if !hasDueDate {
				continue
			}

			// Parse the due date
			dueDate := parseDueDate(dueDateRaw)
			if dueDate == 0 {
				a.logger.Warn("⚠️ Could not parse due date",
					mlog.String("cardID", block.ID),
					mlog.String("cardTitle", block.Title),
					mlog.String("dueDateRaw", fmt.Sprintf("%v", dueDateRaw)))
				continue
			}

			cardsWithDueDate++

			// Get status and priority names
			statusID, _ := properties[PropertyStatus].(string)
			priorityID, _ := properties[PropertyPriority].(string)

			// Create notification
			notification := model.TaskNotification{
				ID:         block.ID,
				Title:      block.Title,
				BoardID:    block.BoardID,
				BoardTitle: board.Title,
				DueDate:    dueDate,
				Status:     getStatusName(statusID),
				Priority:   getPriorityName(priorityID),
				TimeToGo:   formatTimeToGo(dueDate, now),
			}

			// Categorize based on due date
			if dueDate < now {
				// Overdue
				response.Overdue = append(response.Overdue, notification)
				response.Summary.OverdueCount++
			} else if dueDate <= oneHourFromNow {
				// Due within 1 hour
				response.DueUrgent = append(response.DueUrgent, notification)
				response.Summary.DueToday++
			} else if dueDate <= oneDayFromNow {
				// Due within 24 hours
				response.DueSoon = append(response.DueSoon, notification)
				response.Summary.DueToday++
			} else if dueDate <= oneWeekFromNow {
				// Due within 7 days
				response.Summary.DueThisWeek++
			}

			response.Summary.TotalPending++
		}
	}

	a.logger.Info("✅ Notifications generated",
		mlog.String("userID", userID),
		mlog.Int("totalCards", totalCards),
		mlog.Int("cardsWithDueDate", cardsWithDueDate),
		mlog.Int("skippedCompleted", skippedCompleted),
		mlog.Int("overdue", len(response.Overdue)),
		mlog.Int("dueUrgent", len(response.DueUrgent)),
		mlog.Int("dueSoon", len(response.DueSoon)),
		mlog.Int("totalPending", response.Summary.TotalPending))

	return response, nil
}

// parseDueDate extracts the timestamp from the due date field
// Handles format: {"from":1762776000000}
func parseDueDate(raw interface{}) int64 {
	// If it's already a number, return it
	if num, ok := raw.(float64); ok {
		return int64(num)
	}
	if num, ok := raw.(int64); ok {
		return num
	}

	// If it's a string, parse the JSON
	str, ok := raw.(string)
	if !ok {
		return 0
	}

	// Parse the JSON string: {"from":1762776000000}
	if strings.HasPrefix(str, "{") {
		var dateObj struct {
			From interface{} `json:"from"`
		}
		if err := json.Unmarshal([]byte(str), &dateObj); err != nil {
			return 0
		}

		// Handle the "from" value (could be number or string)
		switch v := dateObj.From.(type) {
		case float64:
			return int64(v)
		case int64:
			return v
		case string:
			// Try to parse as int64
			var num int64
			fmt.Sscanf(v, "%d", &num)
			return num
		}
	}

	return 0
}

// getStatusName returns the human-readable status name
func getStatusName(statusID string) string {
	if name, ok := statusNames[statusID]; ok {
		return name
	}
	return statusID
}

// getPriorityName returns the human-readable priority name
func getPriorityName(priorityID string) string {
	if name, ok := priorityNames[priorityID]; ok {
		return name
	}
	return priorityID
}

// formatTimeToGo creates a human-readable time remaining string
func formatTimeToGo(dueDate, now int64) string {
	diff := dueDate - now

	if diff < 0 {
		// Overdue
		diff = -diff
		hours := diff / (60 * 60 * 1000)
		days := hours / 24

		if days > 0 {
			return fmt.Sprintf("%d days overdue", days)
		}
		if hours > 0 {
			return fmt.Sprintf("%d hours overdue", hours)
		}
		return "overdue"
	}

	// Future
	hours := diff / (60 * 60 * 1000)
	days := hours / 24

	if days > 0 {
		return fmt.Sprintf("in %d days", days)
	}
	if hours > 0 {
		return fmt.Sprintf("in %d hours", hours)
	}
	return "less than 1 hour"
}