package api

import (
	"encoding/json"
	"net/http"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

// HTTP handler
func (a *API) handleGetGamification(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)

	a.logger.Info("🎮 Getting gamification data for connected user",
		mlog.String("userID", userID))

	resp, err := a.app.GetGamification(userID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	b, err := json.Marshal(resp)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, b)
}