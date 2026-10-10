package launcher

import (
	"bytes"
	"io"
	"testing"
)

func TestRepliesInOrder(t *testing.T) {
	reply, end := replies([]byte("hello\x1b[c\x1b[6n\x1b]11;?\x07\x1b[?2026$p tail"), 200, 50)
	want := "\x1b[?62;22c\x1b[1;1R\x1b]11;rgb:0000/0000/0000\x1b\\\x1b[?2026;0$y"
	if string(reply) != want {
		t.Fatalf("got %q", reply)
	}
	if end != len("hello\x1b[c\x1b[6n\x1b]11;?\x07\x1b[?2026$p") {
		t.Fatalf("end %d", end)
	}
	if reply, _ := replies([]byte("plain text \x1b[31mred"), 200, 50); len(reply) != 0 {
		t.Fatalf("unexpected reply %q", reply)
	}
}

// fakeTerminal returns the given reads, then EOF, and records what is written back.
type fakeTerminal struct {
	reads   [][]byte
	written bytes.Buffer
}

func (f *fakeTerminal) Read(p []byte) (int, error) {
	if len(f.reads) == 0 {
		return 0, io.EOF
	}
	n := copy(p, f.reads[0])
	f.reads = f.reads[1:]
	return n, nil
}

func (f *fakeTerminal) Write(p []byte) (int, error) { return f.written.Write(p) }

func TestAnswersQueriesSplitAcrossReadsOnce(t *testing.T) {
	terminal := &fakeTerminal{reads: [][]byte{[]byte("start\x1b["), []byte("6n more"), []byte(" text")}}
	var screen bytes.Buffer
	answerQueries(terminal, &screen, 200, 50)
	if terminal.written.String() != "\x1b[1;1R" {
		t.Fatalf("written %q", terminal.written.String())
	}
	if screen.String() != "start\x1b[6n more text" {
		t.Fatalf("screen %q", screen.String())
	}
}
