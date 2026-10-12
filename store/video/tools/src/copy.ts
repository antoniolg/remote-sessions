export type Lang = 'es' | 'en';
export type Platform = 'ios' | 'android';

/** Headlines use "\n" for line breaks and *word* for the accent colour. */
export const copy = {
  es: {
    problemA: 'Claude Code\nestá a mitad\nde una *tarea*…',
    problemB: '…y tú te\ntienes que *ir*.',
    terminalPrompt: 'Añade un test para el caso de token caducado',
    terminalWorking: 'Ejecutando los tests…',
    terminalPassed: '42 tests pasan',
    notificationApp: 'Calendario',
    notificationTitle: 'Salir hacia el aeropuerto',
    notificationBody: 'Ahora',
    list: 'Todas tus\nconversaciones,\n*en el móvil*.',
    states: ['Remote Control', 'Abierta en el ordenador'],
    connectA: 'Mira en qué\npunto está…',
    connectB: '…y toca\n*Conectar*.',
    claude: 'Y sigue en la\n*app de Claude*.',
    createA: '¿Algo *nuevo*?',
    createB: 'Empieza en\n*cualquier\ncarpeta*.',
    platforms: 'iPhone\ny *Android*.',
    platformChips: ['Se empareja con un QR', 'Sin cuentas ni nube', 'macOS · Linux · Windows'],
    pairing: 'Se empareja\ncon un *QR*.',
    pairingChips: ['Sin cuentas ni nube', 'macOS · Linux · Windows'],
    tagline: ['Gratis', 'Open source', 'Sin cuentas'],
    url: 'antonioleiva.com/proyectos/remote-sessions',
    disclaimer:
      'Remote Sessions no es un producto oficial de Anthropic. Claude y Claude Code son marcas de Anthropic.',
    chat: {
      reply: 'Responder…',
      remote: 'Remote Control',
      user: 'Perfecto. Haz commit y abre una PR',
      answer: 'Hecho. He subido la rama `fix/expired-token` y he abierto la PR #128.',
      tools: 'Bash ×3',
      ios: {
        title: 'Arreglar el login con Google',
        history: [
          'El login con Google falla cuando el token ha caducado. ¿Lo miras?',
          'He encontrado el problema: `refreshToken()` no se llama antes de reintentar. Lo he corregido en `AuthService` y ahora la sesión se renueva sola.',
          'Añade un test para el caso de token caducado',
          'Hecho: `AuthServiceTests.testRefreshesExpiredToken` cubre el caso y pasa junto al resto de la suite.',
        ],
      },
      android: {
        title: 'Arreglar el inicio de sesión con Google',
        history: [
          'El inicio de sesión con Google falla en producción con un 401. ¿Le echas un vistazo?',
          'Lo encontré: el refresh token se guardaba sin su fecha de caducidad, así que `AuthService.refresh()` nunca lo renovaba.',
          'Genial. Ahora añade un test para el caso del token caducado',
          'Hecho. He añadido `refreshesExpiredToken()` a `AuthServiceTest` y pasan los 42 tests.',
        ],
      },
    },
    appStore: {
      list: 'Tus conversaciones\nde Claude Code,\n*en el móvil*',
      connect: 'Retoma cualquiera\ncon *un toque*',
      create: 'O empieza una nueva\nen *cualquier carpeta*',
      install: 'Instala el servidor\ncon *un comando*',
      end: 'Gratis · Open source\n*Sin cuentas*',
    },
  },
  en: {
    problemA: 'Claude Code is\nhalfway through\na *task*…',
    problemB: '…and you have\nto *go*.',
    terminalPrompt: 'Add a test for the expired token case',
    terminalWorking: 'Running the tests…',
    terminalPassed: '42 tests pass',
    notificationApp: 'Calendar',
    notificationTitle: 'Leave for the airport',
    notificationBody: 'Now',
    list: 'All your\nconversations,\n*on your phone*.',
    states: ['Remote Control', 'Open on the computer'],
    connectA: 'See where\nit’s at…',
    connectB: '…and tap\n*Connect*.',
    claude: 'Keep going in\nthe *Claude app*.',
    createA: 'Something *new*?',
    createB: 'Start in\n*any folder*.',
    platforms: 'iPhone\nand *Android*.',
    platformChips: ['Pairs with a QR code', 'No accounts, no cloud', 'macOS · Linux · Windows'],
    pairing: 'Pairs with\na *QR code*.',
    pairingChips: ['No accounts, no cloud', 'macOS · Linux · Windows'],
    tagline: ['Free', 'Open source', 'No accounts'],
    url: 'antonioleiva.com/en/projects/remote-sessions',
    disclaimer:
      'Remote Sessions is not an official Anthropic product. Claude and Claude Code are trademarks of Anthropic.',
    chat: {
      reply: 'Reply…',
      remote: 'Remote Control',
      user: 'Perfect. Commit it and open a PR',
      answer: 'Done. I pushed `fix/expired-token` and opened PR #128.',
      tools: 'Bash ×3',
      ios: {
        title: 'Fix Google sign-in',
        history: [
          'Google sign-in fails when the token has expired. Can you take a look?',
          'I found the problem: `refreshToken()` isn\u2019t called before retrying. I fixed it in `AuthService` and now the session renews itself.',
          'Add a test for the expired token case',
          'Done: `AuthServiceTests.testRefreshesExpiredToken` covers the case and passes along with the rest of the suite.',
        ],
      },
      android: {
        title: 'Fix Google sign-in',
        history: [
          'Google sign-in fails in production with a 401. Can you take a look?',
          'Found it: the refresh token was saved without its expiry date, so `AuthService.refresh()` never renewed it.',
          'Great. Now add a test for the expired token case',
          'Done. I added `refreshesExpiredToken()` to `AuthServiceTest` and all 42 tests pass.',
        ],
      },
    },
    appStore: {
      list: 'Your Claude Code\nconversations,\n*on your phone*',
      connect: 'Pick any of them up\nwith *one tap*',
      create: 'Or start a new one\nin *any folder*',
      install: 'Install the server\nwith *one command*',
      end: 'Free · Open source\n*No accounts*',
    },
  },
} as const;

export const installCommand = 'brew install antoniolg/tap/remote-sessions && remote-sessions setup';
