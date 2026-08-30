VERDICT: BUGS_FOUND

Die beigefügten Screenshots kann ich nicht sehen, daher beurteile ich ausschließlich den Text-Report. Bis auf einen einzelnen Netzwerkfehler ist der Lauf grün: 50 Backend-Tests bestanden, Backend-Smoke erfolgreich (`/api/health` HTTP 200), Playwright 10/10 bestanden, Registrierung/Login und alle Haupt-Routen inklusive Impressum/Datenschutz funktionieren. Nicht übergehen kann ich jedoch den beobachteten Netzwerkabbruch beim Abmelden gegen die eigene API.

**Bug-Liste**

- **Title:** Logout-Request wird abgebrochen (net::ERR_ABORTED)
- **Symptom:** Beim Abmelden endet der POST auf `/api/auth/logout` in einem Netzwerkabbruch. Der Logout-Endpunkt wird dadurch nicht regulär zugestellt; die server-seitige Abmeldung wird unterbrochen. Die lokale Sitzung wird zwar beendet, aber der Abmelde-Request gegen die eigene API schlägt fehl.
- **Repro:** Angemeldet den „Abmelden“-Button im Header auslösen. Im Smoke-/Playwright-Lauf des Browsers wurde genau dieser Ablauf ausgeführt.
- **Evidence:** `[net-fail] POST /api/auth/logout -> net::ERR_ABORTED (from http://localhost:5173/login)`
- **Suspected file(s):**
  - `frontend/src/auth/AuthContext.tsx` (Logout-Workflow)
  - `frontend/src/components/UserMenu.tsx` (`handleLogout`, Navigation direkt nach dem Logout)
  - `frontend/src/api/auth.ts` (`logout`, initiiert den POST)
  Da nur dieser eine Endpoint betroffen ist, liegt der Verdacht beim Client-Logout-Workflow, nicht beim Backend.
- **Severity:** high