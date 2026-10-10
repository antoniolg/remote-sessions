package transcripts

import "strings"

const (
	messagesTailBytes = 3 << 20
	messageTextMax    = 4000
)

// Message is a typed prompt or one of Claude's replies (consecutive assistant records merged).
type Message struct {
	ID        string   `json:"id"`
	Role      string   `json:"role"`
	Text      string   `json:"text"`
	Tools     []string `json:"tools"`
	Timestamp *string  `json:"timestamp"`
}

func clipText(text string) string {
	runes := []rune(text)
	if len(runes) <= messageTextMax {
		return text
	}
	return string(runes[:messageTextMax]) + "…"
}

func optional(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

// ParseMessages returns the latest `limit` messages of transcript data. Exported for tests.
func ParseMessages(data []byte, limit int) []Message {
	var messages []Message
	eachRecord(data, func(r record) {
		if r.IsSidechain {
			return
		}
		switch r.Type {
		case "user":
			if typed := typedText(r); typed != "" {
				messages = append(messages, Message{ID: r.UUID, Role: "user", Text: clipText(typed), Tools: []string{}, Timestamp: optional(r.Timestamp)})
			}
		case "assistant":
			var texts, tools []string
			for _, part := range r.Message.parts() {
				switch part.Type {
				case "text":
					if text := strings.TrimSpace(part.Text); text != "" {
						texts = append(texts, text)
					}
				case "tool_use":
					if part.Name != "" {
						tools = append(tools, part.Name)
					}
				}
			}
			if len(texts) == 0 && len(tools) == 0 {
				return
			}
			if n := len(messages); n > 0 && messages[n-1].Role == "assistant" {
				last := &messages[n-1]
				if len(texts) > 0 {
					parts := append([]string{}, texts...)
					if last.Text != "" {
						parts = append([]string{last.Text}, texts...)
					}
					last.Text = clipText(strings.Join(parts, "\n\n"))
				}
				last.Tools = append(last.Tools, tools...)
				if r.Timestamp != "" {
					last.Timestamp = optional(r.Timestamp)
				}
				return
			}
			if tools == nil {
				tools = []string{}
			}
			messages = append(messages, Message{ID: r.UUID, Role: "assistant", Text: clipText(strings.Join(texts, "\n\n")), Tools: tools, Timestamp: optional(r.Timestamp)})
		}
	})
	if len(messages) > limit {
		messages = messages[len(messages)-limit:]
	}
	if messages == nil {
		messages = []Message{}
	}
	return messages
}

// RecentMessages reads the end of a transcript and returns its latest messages.
func RecentMessages(path string, limit int) ([]Message, error) {
	data, err := ReadTail(path, messagesTailBytes)
	if err != nil {
		return nil, err
	}
	return ParseMessages(data, limit), nil
}
