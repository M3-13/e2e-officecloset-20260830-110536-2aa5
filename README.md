# Glamouröser Kleiderschrank-Manager

Ein glamouröser Garderoben-Manager mit Web-GUI im Hollywood-/Red-Carpet-Stil.
Benutzer registrieren sich und melden sich an, legen Kleidungsstücke mit Bildern
und Kategorien an und durchstöbern ihre persönliche Garderobe mit Filterung und
Suche. Der Outfit-Creator folgt in einer späteren Ausbaustufe.

## Tech Stack

- **Backend**: Python 3.12+, FastAPI, SQLAlchemy, SQLite
- **Auth**: JWT (PyJWT), Passwort-Hashing mit bcrypt
- **Frontend**: Vite, React, TypeScript, React Router
- **Storage**: lokaler Dateispeicher für hochgeladene Bilder
- **Tests**: pytest

## Installation

```bash
cd backend
py -m pip install -r requirements.txt
```

## Start (Entwicklung)

Das Backend benötigt ein `JWT_SECRET` zum Signieren der JWTs. Kopieren Sie dazu
`backend/.env.example` nach `backend/.env` und tragen Sie dort einen Wert ein
(oder exportieren Sie die Variable wie unten gezeigt):

```bash
cd backend
# JWT_SECRET erzeugen (einmalig):
py -c "import secrets; print(secrets.token_hex(32))"
# Wert kopieren und als Umgebungsvariable setzen, z. B. unter PowerShell:
#   $env:JWT_SECRET = "<erzeugter Wert>"
py -m uvicorn app.main:app --port 8000
```

Der Health-Endpoint ist danach unter `http://localhost:8000/api/health` erreichbar.

Alternativ startet `RUN.json` im Repo-Root den Dienst automatisch mit allen
erforderlichen Umgebungsvariablen (inkl. eines pro Start generierten `JWT_SECRET`).

## Umgebungsvariablen

| Variable | Beschreibung | Default |
| --- | --- | --- |
| `JWT_SECRET` | Signatur-Geheimnis für JWTs (wird beim Start generiert, nie im Code) | – (via `backend/.env.example` nach `backend/.env` kopieren; in `RUN.json` als `generate` deklariert) |
| `DATABASE_URL` | SQLAlchemy-Datenbank-URL | `sqlite:///./wardrobe.db` |
| `UPLOAD_DIR` | Verzeichnis für hochgeladene Bilder | `./uploads` |
| `FRONTEND_ORIGIN` | Erlaubte CORS-Origin des Frontends | `http://localhost:5173` |

## API-Endpunkte

Fehlerantworten sind immer JSON in der Form `{"detail": "..."}`.

### Health

- `GET /api/health` → `200 {"status": "ok"}`

### Auth (JWT im Header `Authorization: Bearer <token>`, Claims `sub=user_id:int`, `exp` 24h)

- `POST /api/auth/register` — Body `{"email", "password"}` → `201 {"access_token", "token_type":"bearer"}` | `409`
- `POST /api/auth/login` — Body `{"email", "password"}` → `200 {"access_token", "token_type":"bearer"}` | `401`
- `POST /api/auth/logout` → `204`
- `GET /api/auth/me` → `200 {"id", "email"}` | `401`
- `DELETE /api/auth/account` → `204` (löscht Konto samt Items und Bildern) | `401`

### Garderobe

- `GET /api/wardrobe` → `200 [WardrobeItem]`
- `POST /api/wardrobe` — Body `{"name", "category"}` → `201 WardrobeItem` | `422`
- `GET /api/wardrobe/{id}` → `200 WardrobeItem` | `403|404`
- `PUT /api/wardrobe/{id}` — Body `{"name", "category"}` → `200 WardrobeItem` | `403|404`
- `DELETE /api/wardrobe/{id}` → `204` | `403|404`
- `POST /api/wardrobe/{id}/image` — multipart `file` → `201 WardrobeItem` | `413|415|403|404`
- `GET /api/wardrobe/{id}/image` → `200 image/jpeg|png|webp` | `401|403|404`

`WardrobeItem` = `{"id": int, "name": str, "category": str, "image_filename": str|null}`.
Kategorien: `Oberteile`, `Hosen`, `Kleider`, `Schuhe`, `Accessoires`.

## Features

- Registrierung und Anmeldung mit JWT-basierter Sitzung
- Kleidungsstücke anlegen (Name, Kategorie, Bild-Upload), bearbeiten und löschen
- Persönliche Garderobe mit Filterung und Suche
- Geschützter Bildzugriff nur für den jeweiligen Besitzer
- Kontolöschung mit vollständiger Datenlöschung
