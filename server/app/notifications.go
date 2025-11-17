package app

import (
	"encoding/json" 
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

func (a *App) GetNotifications(userID string) (*model.NotificationResponse, error) {
	a.logger.Error("🚨 NOTIFICATIONS API CALLED 🚨", 
		mlog.String("userID", userID))

	// Initialize response
	response := &model.NotificationResponse{
		Overdue:   []model.TaskNotification{},
		DueUrgent: []model.TaskNotification{},
		DueSoon:   []model.TaskNotification{},
		Summary:   model.NotificationSummary{},
	}

	// Time thresholds in milliseconds
	now := time.Now().Unix() * 1000
	oneHourFromNow := now + (60 * 60 * 1000)
	oneDayFromNow := now + (24 * 60 * 60 * 1000)
	oneWeekFromNow := now + (7 * 24 * 60 * 60 * 1000)

	// Get ALL boards (not just user's boards) to find assigned tasks
	allBoards, err := a.GetBoardsForUserAndTeam("", "", false) // Empty userID = all boards
	if err != nil {
		a.logger.Error("Failed to get boards", mlog.Err(err))
		return response, nil // Return empty instead of error
	}

	a.logger.Error("🔍 Found boards to scan",
		mlog.Int("count", len(allBoards)))

	totalCardsChecked := 0
	cardsAssignedToUser := 0

	// Process each board
	for _, board := range allBoards {
		// Find property IDs for this board
		var assigneePropertyID, dueDatePropertyID, statusPropertyID, priorityPropertyID string
		
		for _, propMap := range board.CardProperties {
			propType, _ := propMap["type"].(string)
			propName, _ := propMap["name"].(string)
			propID, _ := propMap["id"].(string)
			
			switch propType {
			case "person":
				if strings.Contains(strings.ToLower(propName), "assign") {
					assigneePropertyID = propID
				}
			case "date":
				if strings.Contains(strings.ToLower(propName), "due") {
					dueDatePropertyID = propID
				}
			case "select":
				if strings.Contains(strings.ToLower(propName), "status") {
					statusPropertyID = propID
				}
				if strings.Contains(strings.ToLower(propName), "priority") {
					priorityPropertyID = propID
				}
			}
		}

		// Skip board if no assignee or due date property
		if assigneePropertyID == "" || dueDatePropertyID == "" {
			continue
		}

		// Get all cards from this board
		blocks, err := a.GetBlocksForBoard(board.ID)
		if err != nil {
			continue
		}

		// Process each card
		for _, block := range blocks {
			// Only process card type blocks
			if block.Type != "card" || block.DeleteAt != 0 {
				continue
			}

			totalCardsChecked++

			// Extract properties
			properties, ok := block.Fields["properties"].(map[string]interface{})
			if !ok {
				continue
			}

			// Check if assigned to current user
			assigneeVal, hasAssignee := properties[assigneePropertyID]
			if !hasAssignee {
				continue
			}

			assigneeID, ok := assigneeVal.(string)
			if !ok || assigneeID != userID {
				continue
			}

			cardsAssignedToUser++

			// Get due date
			dueDateVal, hasDueDate := properties[dueDatePropertyID]
			if !hasDueDate {
				continue
			}

			// Parse due date
var dueDate int64
switch v := dueDateVal.(type) {
case float64:
	dueDate = int64(v)
case int64:
	dueDate = v
case string:
	// Handle {"from": timestamp} format - THIS IS THE KEY PART
	if strings.HasPrefix(v, "{") {
		var dateObj struct {
			From interface{} `json:"from"`
		}
		if err := json.Unmarshal([]byte(v), &dateObj); err == nil {
			// Handle both string and numeric timestamps
			switch fromVal := dateObj.From.(type) {
			case float64:
				dueDate = int64(fromVal)
			case string:
				if parsed, err := strconv.ParseInt(fromVal, 10, 64); err == nil {
					dueDate = parsed
				}
			}
		}
	} else if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
		dueDate = parsed
	}
}

if dueDate == 0 {
	a.logger.Debug("⚠️ Could not parse due date", 
		mlog.String("cardID", block.ID),
		mlog.String("dueDateVal", fmt.Sprintf("%v", dueDateVal)))
	continue
}

			// Check status - skip completed/archived
			if statusPropertyID != "" {
				statusID := extractStringProperty(properties, statusPropertyID)
				statusName := getStatusName(board.CardProperties, statusPropertyID, statusID)
				statusLower := strings.ToLower(statusName)
				if strings.Contains(statusLower, "complete") || 
				   strings.Contains(statusLower, "done") ||
				   strings.Contains(statusLower, "archive") {
					continue
				}
			}

			// Get status and priority names
			var statusName, priorityName string
			if statusPropertyID != "" {
				statusID := extractStringProperty(properties, statusPropertyID)
				statusName = getStatusName(board.CardProperties, statusPropertyID, statusID)
			}
			if priorityPropertyID != "" {
				priorityID := extractStringProperty(properties, priorityPropertyID)
				priorityName = getPriorityName(board.CardProperties, priorityPropertyID, priorityID)
			}

			// Create notification
			notification := model.TaskNotification{
				ID:         block.ID,
				Title:      block.Title,
				BoardID:    block.BoardID,
				BoardTitle: board.Title,
				DueDate:    dueDate,
				Priority:   priorityName,
				Status:     statusName,
				TimeToGo:   getTimeToGo(dueDate, now),
			}

			// Categorize
			if dueDate < now {
				response.Overdue = append(response.Overdue, notification)
				response.Summary.OverdueCount++
			} else if dueDate <= oneHourFromNow {
				response.DueUrgent = append(response.DueUrgent, notification)
				response.Summary.DueToday++
			} else if dueDate <= oneDayFromNow {
				response.DueSoon = append(response.DueSoon, notification)
				response.Summary.DueToday++
			} else if dueDate <= oneWeekFromNow {
				response.Summary.DueThisWeek++
			}

			response.Summary.TotalPending++
		}
	}

	a.logger.Error("📊 Final summary",
		mlog.Int("totalCardsChecked", totalCardsChecked),
		mlog.Int("cardsAssignedToUser", cardsAssignedToUser),
		mlog.Int("overdueCount", len(response.Overdue)),
		mlog.Int("dueUrgentCount", len(response.DueUrgent)),
		mlog.Int("dueSoonCount", len(response.DueSoon)))

	return response, nil
}

// extractStringProperty safely extracts a string property
func extractStringProperty(properties map[string]interface{}, propertyID string) string {
	if val, ok := properties[propertyID]; ok {
		if strVal, ok := val.(string); ok {
			return strVal
		}
	}
	return ""
}

// getStatusName gets the human-readable status name from board properties
func getStatusName(cardProperties []map[string]interface{}, propertyID, optionID string) string {
	if propertyID == "" || optionID == "" {
		return ""
	}
	
	for _, propMap := range cardProperties {
		propID, _ := propMap["id"].(string)
		if propID == propertyID {
			if options, ok := propMap["options"].([]interface{}); ok {
				for _, opt := range options {
					if optMap, ok := opt.(map[string]interface{}); ok {
						if id, _ := optMap["id"].(string); id == optionID {
							if value, _ := optMap["value"].(string); value != "" {
								return value
							}
						}
					}
				}
			}
		}
	}
	
	return optionID
}

// getPriorityName gets the human-readable priority name from board properties
func getPriorityName(cardProperties []map[string]interface{}, propertyID, optionID string) string {
	if propertyID == "" || optionID == "" {
		return ""
	}
	
	for _, propMap := range cardProperties {
		propID, _ := propMap["id"].(string)
		if propID == propertyID {
			if options, ok := propMap["options"].([]interface{}); ok {
				for _, opt := range options {
					if optMap, ok := opt.(map[string]interface{}); ok {
						if id, _ := optMap["id"].(string); id == optionID {
							if value, _ := optMap["value"].(string); value != "" {
								return value
							}
						}
					}
				}
			}
		}
	}
	
	return optionID
}

// getTimeToGo calculates human-readable time remaining
func getTimeToGo(dueDate, now int64) string {
	diff := dueDate - now
	
	if diff < 0 {
		// Overdue
		diff = -diff
		hours := diff / (60 * 60 * 1000)
		days := hours / 24
		
		if days > 0 {
			return fmt.Sprintf("%d days overdue", days)
		}
		return fmt.Sprintf("%d hours overdue", hours)
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