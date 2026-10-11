package i18n

import "os"

func envOverride() string {
	return os.Getenv("REMOTE_SESSIONS_LANG")
}

var catalogs = map[string]map[string]string{
	"en": {
		"usage": `Remote Sessions: use your Claude Code sessions from your phone.

Usage:
  remote-sessions setup              Install the background service and show the QR code
  remote-sessions pair [--rotate]    Show the QR code to pair a phone (--rotate revokes the previous ones)
  remote-sessions doctor             Check that everything is ready
  remote-sessions serve [--log]      Run the server in the foreground
  remote-sessions service install|uninstall|restart
  remote-sessions version
`,
		"unknown_command":    "Unknown command: %s",
		"error":              "Error:",
		"claude_not_found":   "the claude command was not found; install Claude Code or pass its path with --claude",
		"installing":         "Installing the background service…",
		"service_not_ready":  "the service did not start: %v (see %s)",
		"ready":              "Done: the server will start by itself every time you log in.",
		"macos_access":       "If macOS asks whether remote-sessions can access Documents, Desktop or Downloads, allow it: that's where some of your conversations live. For Full Disk Access, add ~/Library/Application Support/remote-sessions/bin/remote-sessions (⌘⇧G in the file picker).",
		"scan":               "Scan this code with the Remote Sessions app:",
		"cannot_scan":        "Can't scan it? Open this link on your phone or paste it into the app:",
		"keep_secret":        "It contains the key to your conversations: don't share it.",
		"rotated":            "New key created: phones paired before will need to scan again.",
		"service_usage":      "usage: remote-sessions service install|uninstall|restart",
		"unknown_action":     "unknown action: %s",
		"other_server":       "another server is answering on that port",
		"doctor_claude":      "Claude Code",
		"doctor_version":     "Claude Code version",
		"doctor_sessions":    "Conversations",
		"doctor_sessions_in": "(%d in %s)",
		"doctor_service":     "Service",
		"doctor_running":     "running on port %d",
		"doctor_no_service":  "not installed; run remote-sessions setup",
		"doctor_hosts":       "Addresses for the phone",
		"doctor_config":      "Configuration:",
		"doctor_failed":      "some checks failed",
		"flag_log":           "also write the log to the configuration directory",
		"flag_claude":        "path of the claude command",
		"flag_rotate":        "create a new key and unpair previous phones",
	},
	"es": {
		"usage": `Remote Sessions: usa tus sesiones de Claude Code desde el móvil.

Uso:
  remote-sessions setup              Instala el servicio en segundo plano y muestra el código QR
  remote-sessions pair [--rotate]    Muestra el código QR para emparejar un móvil (--rotate invalida los anteriores)
  remote-sessions doctor             Comprueba que todo está listo
  remote-sessions serve [--log]      Arranca el servidor en primer plano
  remote-sessions service install|uninstall|restart
  remote-sessions version
`,
		"unknown_command":    "Comando desconocido: %s",
		"error":              "Error:",
		"claude_not_found":   "no se encontró el comando claude; instala Claude Code o indica su ruta con --claude",
		"installing":         "Instalando el servicio en segundo plano…",
		"service_not_ready":  "el servicio no arrancó: %v (mira %s)",
		"ready":              "Listo: el servidor arrancará solo cada vez que inicies sesión.",
		"macos_access":       "Si macOS pregunta si remote-sessions puede acceder a Documentos, Escritorio o Descargas, permítelo: ahí están algunas de tus conversaciones. Para el acceso total al disco, añade ~/Library/Application Support/remote-sessions/bin/remote-sessions (⌘⇧G en el selector de archivos).",
		"scan":               "Escanea este código con la app Remote Sessions:",
		"cannot_scan":        "¿No puedes escanearlo? Abre este enlace en el móvil o pégalo en la app:",
		"keep_secret":        "Contiene la clave de acceso a tus conversaciones: no lo compartas.",
		"rotated":            "Clave renovada: los móviles emparejados antes tendrán que volver a escanear.",
		"service_usage":      "uso: remote-sessions service install|uninstall|restart",
		"unknown_action":     "acción desconocida: %s",
		"other_server":       "en el puerto responde otro servidor",
		"doctor_claude":      "Claude Code",
		"doctor_version":     "Versión de Claude Code",
		"doctor_sessions":    "Conversaciones",
		"doctor_sessions_in": "(%d en %s)",
		"doctor_service":     "Servicio",
		"doctor_running":     "en marcha en el puerto %d",
		"doctor_no_service":  "no instalado; ejecuta remote-sessions setup",
		"doctor_hosts":       "Direcciones para el móvil",
		"doctor_config":      "Configuración:",
		"doctor_failed":      "hay comprobaciones que fallan",
		"flag_log":           "escribe también el registro en el directorio de configuración",
		"flag_claude":        "ruta del comando claude",
		"flag_rotate":        "genera una clave nueva y desempareja los móviles anteriores",
	},
}
