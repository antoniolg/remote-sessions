package launcher

import (
	"bytes"
	"fmt"
	"io"
	"regexp"
)

// Claude Code's interface waits for the terminal to answer a few queries before it draws
// (and before Remote Control starts). A real terminal or tmux answers them; our bare PTY
// has to, or the session stays blank forever.
var queries = []struct {
	pattern *regexp.Regexp
	reply   func(cols, rows int) string
}{
	// Cursor position report (DSR 6).
	{regexp.MustCompile(`\x1b\[\??6n`), func(_, _ int) string { return "\x1b[1;1R" }},
	// Device status (DSR 5).
	{regexp.MustCompile(`\x1b\[5n`), func(_, _ int) string { return "\x1b[0n" }},
	// Primary device attributes (DA1).
	{regexp.MustCompile(`\x1b\[0?c`), func(_, _ int) string { return "\x1b[?62;22c" }},
	// Secondary device attributes (DA2).
	{regexp.MustCompile(`\x1b\[>0?c`), func(_, _ int) string { return "\x1b[>0;10;1c" }},
	// Terminal name and version (XTVERSION).
	{regexp.MustCompile(`\x1b\[>0?q`), func(_, _ int) string { return "\x1bP>|xterm(370)\x1b\\" }},
	// Kitty keyboard protocol flags: none.
	{regexp.MustCompile(`\x1b\[\?u`), func(_, _ int) string { return "\x1b[?0u" }},
	// DEC private mode queries (DECRQM): report "not recognized".
	{regexp.MustCompile(`\x1b\[\?(\d+)\$p`), nil},
	// Window size in characters and pixels.
	{regexp.MustCompile(`\x1b\[18t`), func(cols, rows int) string { return fmt.Sprintf("\x1b[8;%d;%dt", rows, cols) }},
	{regexp.MustCompile(`\x1b\[14t`), func(cols, rows int) string { return fmt.Sprintf("\x1b[4;%d;%dt", rows*20, cols*10) }},
	{regexp.MustCompile(`\x1b\[16t`), func(_, _ int) string { return "\x1b[6;20;10t" }},
	// Foreground and background colours (OSC 10/11): a dark theme.
	{regexp.MustCompile(`\x1b\]10;\?(\x07|\x1b\\)`), func(_, _ int) string { return "\x1b]10;rgb:ffff/ffff/ffff\x1b\\" }},
	{regexp.MustCompile(`\x1b\]11;\?(\x07|\x1b\\)`), func(_, _ int) string { return "\x1b]11;rgb:0000/0000/0000\x1b\\" }},
}

var decrqm = regexp.MustCompile(`\x1b\[\?(\d+)\$p`)

// replies returns the answers to every query found in data, in order, and where the last query ends.
func replies(data []byte, cols, rows int) ([]byte, int) {
	type found struct {
		at, end int
		reply   string
	}
	var all []found
	for _, q := range queries {
		for _, loc := range q.pattern.FindAllSubmatchIndex(data, -1) {
			reply := ""
			if q.reply != nil {
				reply = q.reply(cols, rows)
			} else if m := decrqm.FindSubmatch(data[loc[0]:loc[1]]); m != nil {
				reply = fmt.Sprintf("\x1b[?%s;0$y", m[1])
			}
			all = append(all, found{loc[0], loc[1], reply})
		}
	}
	// Answer in the order the queries were sent.
	for i := 1; i < len(all); i++ {
		for j := i; j > 0 && all[j].at < all[j-1].at; j-- {
			all[j], all[j-1] = all[j-1], all[j]
		}
	}
	var out bytes.Buffer
	end := 0
	for _, f := range all {
		out.WriteString(f.reply)
		end = max(end, f.end)
	}
	return out.Bytes(), end
}

// tailKeep holds back the end of a chunk so a query split across two reads is still seen whole.
const tailKeep = 32

// answerQueries copies the terminal output to screen and writes the replies back to the terminal.
func answerQueries(terminal io.ReadWriter, screen io.Writer, cols, rows int) {
	buf := make([]byte, 32<<10)
	var carry []byte
	for {
		n, err := terminal.Read(buf)
		if n > 0 {
			_, _ = screen.Write(buf[:n])
			data := append(carry, buf[:n]...)
			reply, end := replies(data, cols, rows)
			if len(reply) > 0 {
				_, _ = terminal.Write(reply)
			}
			// Keep the unanswered tail: it may be the start of a query that ends in the next read.
			carry = append([]byte{}, data[max(end, len(data)-tailKeep):]...)
		}
		if err != nil {
			return
		}
	}
}
