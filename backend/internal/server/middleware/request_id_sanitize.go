package middleware

import "strings"

const maxRequestIDLength = 128

func sanitizeRequestID(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}

	var b strings.Builder
	b.Grow(min(len(value), maxRequestIDLength))
	for i := 0; i < len(value) && b.Len() < maxRequestIDLength; i++ {
		ch := value[i]
		if ch < 33 || ch > 126 {
			continue
		}
		b.WriteByte(ch)
	}
	return b.String()
}
