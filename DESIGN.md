# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Dunkle, glamouröse Red-Carpet-/Hollywood-Optik: tiefes warmes Anthrazit, Champagner-Gold als Akzent, serifenbetonte Display-Headlines und eine ruhige, galerieartige Bühne für die Kleidungsstücke.

## Colors

- `--color-bg`: **#16120E**
- `--color-surface`: **#211B15**
- `--color-surface_elevated`: **#2A231B**
- `--color-fg`: **#F3EBDA**
- `--color-muted`: **#9C8F7A**
- `--color-accent`: **#D4AF37**
- `--color-accent_hover`: **#E2C455**
- `--color-accent_active`: **#B8942E**
- `--color-border`: **#3D342A**
- `--color-danger`: **#E06666**
- `--color-success`: **#7FB87F**
- `--color-overlay`: **rgba(0,0,0,0.62)**

## Typography

- `font_family`: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
- `heading_font_family`: Georgia, 'Times New Roman', 'Didot', serif
- `heading_weight`: 600
- `body_weight`: 400
- `size_scale`: 12px / 14px / 16px / 20px / 28px / 40px

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px

## Border-Radii

- `--radius-sm`: 6px
- `--radius-md`: 10px
- `--radius-lg`: 16px
- `--radius-pill`: 999px

## Components

### Button

Primär: bg=accent #D4AF37, text=#16120E, font-weight 600, padding 12px 24px, radius md 10px, min-height 44px (Mobile-Tap-Ziel), border none; hover bg=accent_hover #E2C455; active bg=accent_active #B8942E + 1px nach unten versetzt; disabled opacity 0.45 + cursor not-allowed. Sekundär: bg transparent, 1px border #3D342A, text fg #F3EBDA; hover bg=surface #211B15; active bg=surface_elevated #2A231B; disabled wie primär.

### Card (Garderoben-Kachel)

bg=surface #211B15, 1px border #3D342A, radius lg 16px, padding 12px, hover border=accent #D4AF37 + leichte Anhebung (transform translateY(-2px), shadow 0 8px 20px rgba(0,0,0,0.35)). Bild: aspect-ratio 3/4, object-fit cover, radius md 10px. Name in heading_font 20px fg, Kategorie als kleinere KAPITÄLCHEN in muted #9C8F7A.

### Input

bg #12100C, 1px border #3D342A, radius md 10px, padding 12px 14px, min-height 44px, text fg, placeholder muted; focus border=accent #D4AF37 + box-shadow 0 0 0 3px rgba(212,175,55,0.22); disabled opacity 0.5.

### Header/Nav

Sticky oben, bg rgba(22,18,14,0.92) mit backdrop-filter blur(8px), border-bottom 1px #3D342A, Höhe 64px. Logo/Markenname in heading_font 28px gold #D4AF37; Links muted #9C8F7A, hover fg #F3EBDA, aktiver Link gold unterstrichen.

### Modal

Overlay rgba(0,0,0,0.62); Panel bg=surface_elevated #2A231B, 1px border #3D342A, radius lg 16px, padding 24px, max-width 480px, zentriert; Titel heading_font 28px, Body muted, Aktionen rechtsbündig mit Sekundär- + Primär-Button.

### FilterChip

Pill radius 999px, padding 6px 14px, 1px border #3D342A, bg transparent, text muted; hover border=accent; selected bg=accent #D4AF37, text #16120E, font-weight 600. Min-Höhe 32px, horizontal scrollbar auf Mobile.

### EmptyState

Zentriert, padding 48px 24px, Icon/Initiale in muted, Überschrift heading_font 28px fg, Beschreibung muted 14px, Primär-Button als Handlungsaufruf darunter.

### Alert/Formularfehler

bg rgba(224,102,102,0.12), 1px border danger #E06666, text #F3EBDA mit danger-Icon, radius md 10px, padding 12px 16px, margin-bottom 16px.

## Layout Principles

- Container max-width 1200px, horizontal zentriert; Seiten-Padding 16px (Mobile) / 32px (Desktop).
- Breakpoints: <640px Mobile, 640–1024px Tablet, ≥1024px Desktop.
- Garderoben-Galerie als CSS-Grid: grid-template-columns repeat(auto-fill, minmax(220px, 1fr)), gap 24px.
- Formulare (Login/Registrierung/Anlegen/Bearbeiten) max-width 480px, zentriert, vertikaler Abstand zwischen Feldern 16px.
- Abstand zwischen Sektionen 48px, zwischen Überschrift und Inhalt 24px.
- Keine Drittanbieter-Schriften oder -Skripte laden: ausschließlich System-Font-Stack und lokale Assets (DSGVO-konform, AC-15).
- Kontrastregel: Fließtext fg auf bg, gedämpfte Texte nur für sekundäre Infos; Gold nur als Akzent, nicht für lange Textpassagen.
