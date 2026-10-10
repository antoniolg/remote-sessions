package i18n

import "testing"

func TestPick(t *testing.T) {
	cases := []struct {
		candidates []string
		want       string
	}{
		{[]string{"es_ES.UTF-8"}, "es"},
		{[]string{"C", "es-419"}, "es"},
		{[]string{"fr-FR", "es"}, "en"}, // first real preference untranslated → English, not the second choice
		{nil, "en"},
	}
	for _, c := range cases {
		if got := pick(c.candidates); got != c.want {
			t.Errorf("pick(%v) = %s, want %s", c.candidates, got, c.want)
		}
	}
}

func TestCatalogsHaveTheSameKeys(t *testing.T) {
	for lang, catalog := range catalogs {
		for key := range catalogs["en"] {
			if _, ok := catalog[key]; !ok {
				t.Errorf("%s misses %s", lang, key)
			}
		}
	}
}
