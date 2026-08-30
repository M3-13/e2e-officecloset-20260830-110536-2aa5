VERDICT: BUGS_FOUND

Kurzer Hinweis: Die angehängten Screenshots kann ich nicht sehen, daher beurteile ich ausschließlich den Textbericht.

**Bug 1: Server-Logout-Request wird beim Abmelden abgebrochen (net::ERR_ABORTED)**

- **Symptom**  
  Beim Abmelden wird der POST an den eigenen Logout-Endpunkt nicht bis zum Server übertragen; in der Browser-Konsole/Netzwerkansicht erscheint ein abgebrochener Fetch. Der lokale Logout funktioniert zwar, aber der Server-Logout-Request schlägt als Netzwerkfehler fehl.

- **Repro**  
  Anmelden, anschließend im Benutzermenü auf „Abmelden" klicken. Der POST `/api/auth/logout` wird als `net::ERR_ABORTED` protokolliert.

- **Evidence**  
  `[net-fail] POST /api/auth/logout -> net::ERR_ABORTED (from http://localhost:5173/login)`

- **Suspected file(s)**  
  `frontend/src/api/auth.ts` (Logout-`fetch` mit `keepalive`) und/oder `frontend/src/components/UserMenu.tsx` (Reihenfolge von `await logout()` und anschließender Navigation). Der Fehler teilt sich nicht mit anderen Endpunkten; es ist der spezifische Logout-Fetch, der während der Weiterleitung abgebrochen wird.

- **Severity**  
  medium