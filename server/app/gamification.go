package app

import (
	"sort"
	

	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

// Points by priority (high -> low)
var priorityPoints = map[string]int{
	"d3bfb50f-f569-4bad-8a3a-dd15c3f60101": 3, // High
	"87f59784-b859-4c24-8ebe-17c766e081dd": 2, // Medium
	"98a57627-0f76-471d-850d-91f3ed9fd213": 1, // Low
}

// Bonus points for completing early
const (
	EarlyCompletionBonus = 2  // Completed before deadline
	OnTimeBonus          = 1  // Completed on deadline day
)

// Badge thresholds
type Badge struct {
	Name   string
	Icon   string
	Points int
	Color  string
}

var badges = []Badge{
	{Name: "Beginner", Icon: "🌱", Points: 0, Color: "#28a745"},
	{Name: "Achiever", Icon: "⭐", Points: 10, Color: "#ffc107"},
	{Name: "Expert", Icon: "🏅", Points: 25, Color: "#fd7e14"},
	{Name: "Master", Icon: "💎", Points: 50, Color: "#6f42c1"},
	{Name: "Legend", Icon: "👑", Points: 100, Color: "#dc3545"},
}

// GetGamification collects completed tasks and calculates points with bonuses
func (a *App) GetGamification(userID string) (*model.GamificationResponse, error) {
	a.logger.Info("🎮 Getting gamification data for user",
		mlog.String("userID", userID))

	resp := &model.GamificationResponse{
		Completed: []model.TaskGamification{},
		Summary: model.GamificationSummary{
			ByPriority: map[string]int{},
		},
	}

	// Get boards for user
	userBoards, err := a.GetBoardsForUserAndTeam(userID, "0", false)
	if err != nil {
		a.logger.Error("Failed to get user boards for gamification", mlog.Err(err))
		return resp, nil
	}

	for _, board := range userBoards {
		blocks, err := a.GetBlocksForBoard(board.ID)
		if err != nil {
			a.logger.Warn("Failed to get blocks for board (gamification)",
				mlog.String("boardID", board.ID),
				mlog.Err(err))
			continue
		}

		for _, block := range blocks {
			if block.Type != "card" || block.DeleteAt != 0 {
				continue
			}

			properties, ok := block.Fields["properties"].(map[string]interface{})
			if !ok {
				continue
			}

			statusID, _ := properties["a972dc7a-5f4c-45d2-8044-8c28c69717f1"].(string)
			priorityID, _ := properties["d3d682bf-e074-49d9-8df5-7320921c2d23"].(string)
			dueDateRaw, _ := properties["a3zsw7xs8sxy7atj8b6totp3mby"]

			// Only interested in completed tasks
			if statusID != "adeo5xuwne3qjue83fcozekz8ko" {
				continue
			}

			// Get priority name from board properties
			priorityName := getPriorityNameFromBoard(board.CardProperties, "d3d682bf-e074-49d9-8df5-7320921c2d23", priorityID)
			
			// Base points from priority
			points := 0
			if p, ok := priorityPoints[priorityID]; ok {
				points = p
			}

			// Parse due date if exists
			dueDate := parseDueDate(dueDateRaw)
			completedAt := block.UpdateAt // Assuming UpdateAt is completion time
			earlyCompletion := false
			onTime := false

			if dueDate > 0 && completedAt > 0 {
				// Check if completed before deadline
				if completedAt < dueDate {
					points += EarlyCompletionBonus
					earlyCompletion = true
				} else if completedAt-dueDate < 86400000 { // Within 24 hours
					points += OnTimeBonus
					onTime = true
				}
			}

			task := model.TaskGamification{
				ID:              block.ID,
				Title:           block.Title,
				BoardID:         block.BoardID,
				BoardTitle:      board.Title,
				Priority:        priorityName,
				Points:          points,
				CompletedAt:     completedAt,
				DueDate:         dueDate,
				EarlyCompletion: earlyCompletion,
				OnTime:          onTime,
			}

			resp.Completed = append(resp.Completed, task)
			resp.Summary.TotalCompleted++
			resp.Summary.TotalPoints += points
			resp.Summary.ByPriority[priorityName]++
		}
	}

	// Calculate current badge
	resp.Summary.CurrentBadge = calculateBadge(resp.Summary.TotalPoints)

	// Sort completed by points desc
	sort.Slice(resp.Completed, func(i, j int) bool {
		if resp.Completed[i].Points == resp.Completed[j].Points {
			return resp.Completed[i].Title < resp.Completed[j].Title
		}
		return resp.Completed[i].Points > resp.Completed[j].Points
	})

	a.logger.Info("✅ Gamification data generated",
		mlog.String("userID", userID),
		mlog.Int("completed", len(resp.Completed)),
		mlog.Int("totalPoints", resp.Summary.TotalPoints),
		mlog.String("badge", resp.Summary.CurrentBadge.Name))

	return resp, nil
}

func calculateBadge(points int) model.Badge {
	currentBadge := model.Badge{Name: badges[0].Name, Icon: badges[0].Icon, Points: badges[0].Points, Color: badges[0].Color}
	
	for _, badge := range badges {
		if points >= badge.Points {
			currentBadge = model.Badge{
				Name:   badge.Name,
				Icon:   badge.Icon,
				Points: badge.Points,
				Color:  badge.Color,
			}
		}
	}
	
	return currentBadge
}

func parseDueDate(raw interface{}) int64 {
	// Similar to your notifications parsing logic
	if num, ok := raw.(float64); ok {
		return int64(num)
	}
	if num, ok := raw.(int64); ok {
		return num
	}
	// Add JSON parsing if needed
	return 0
}

func getPriorityNameFromBoard(cardProperties []map[string]interface{}, propertyID, optionID string) string {
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