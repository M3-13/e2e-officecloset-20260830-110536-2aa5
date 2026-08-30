import type { CSSProperties, ReactNode } from "react";

interface LegalPageProps {
  kind: "impressum" | "datenschutz";
}

const contentStyle: CSSProperties = {
  maxWidth: 720,
  lineHeight: 1.7,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 20,
  margin: "var(--space-5) 0 var(--space-2)",
};

const mutedStyle: CSSProperties = {
  color: "var(--color-muted)",
  fontSize: 14,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

function Impressum() {
  return (
    <div className="page">
      <h1 className="page__title">Impressum</h1>
      <div style={contentStyle}>
        <p style={mutedStyle}>Angaben gemäß § 5 DDG</p>

        <Section title="Anbieter">
          <p>
            OfficeCloset
            <br />
            Musterstraße 1<br />
            10115 Berlin
            <br />
            Deutschland
          </p>
        </Section>

        <Section title="Kontakt">
          <p>
            E-Mail:{" "}
            <a href="mailto:kontakt@officecloset.example">
              kontakt@officecloset.example
            </a>
          </p>
        </Section>

        <Section title="Verantwortlich für den Inhalt">
          <p>OfficeCloset, Musterstraße 1, 10115 Berlin</p>
        </Section>

        <Section title="Haftungshinweis">
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine
            Haftung für die Inhalte externer Links. Für den Inhalt der
            verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Datenschutz() {
  return (
    <div className="page">
      <h1 className="page__title">Datenschutzerklärung</h1>
      <div style={contentStyle}>
        <p style={mutedStyle}>Stand: August 2026</p>

        <Section title="1. Verantwortlicher">
          <p>
            OfficeCloset, Musterstraße 1, 10115 Berlin, Deutschland, E-Mail:{" "}
            <a href="mailto:kontakt@officecloset.example">
              kontakt@officecloset.example
            </a>
          </p>
        </Section>

        <Section title="2. Überblick">
          <p>
            Diese Datenschutzerklärung erläutert, welche personenbezogenen Daten
            beim Betrieb dieser Anwendung verarbeitet werden, zu welchem Zweck
            und auf welcher Rechtsgrundlage.
          </p>
        </Section>

        <Section title="3. Registrierung und Anmeldung">
          <p>
            Bei der Registrierung verarbeiten wir deine E-Mail-Adresse und ein
            Passwort, das ausschließlich als kryptografischer Hash gespeichert
            wird. Diese Daten verarbeiten wir, um dein Konto bereitzustellen und
            dich anzumelden (Art. 6 Abs. 1 lit. b DSGVO).
          </p>
        </Section>

        <Section title="4. Kleidungsstücke und Bilder">
          <p>
            Die von dir angelegten Kleidungsstücke (Name und Kategorie) sowie
            die hochgeladenen Bilder werden verarbeitet, um deine persönliche
            Garderobe anzuzeigen (Art. 6 Abs. 1 lit. b DSGVO). Diese Inhalte
            sind nur für dich als angemeldeten Benutzer sichtbar.
          </p>
        </Section>

        <Section title="5. Speicherdauer und Löschung">
          <p>
            Wir speichern deine Daten nur so lange, wie sie für die genannten
            Zwecke erforderlich sind. Du kannst dein Konto jederzeit über die
            Kontoseite löschen; dabei werden dein Konto, deine Kleidungsstücke
            und alle hochgeladenen Bilder vollständig entfernt.
          </p>
        </Section>

        <Section title="6. Deine Rechte">
          <p>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung und Datenübertragbarkeit sowie ein
            Widerspruchsrecht (Art. 15–21 DSGVO). Zur Ausübung deiner Rechte
            kontaktiere uns unter der oben genannten E-Mail-Adresse.
          </p>
        </Section>

        <Section title="7. Keine Drittanbieter-Ressourcen">
          <p>
            Diese Anwendung lädt keine Schriften, Skripte oder sonstigen
            Ressourcen von Drittanbietern. Es werden ausschließlich
            System-Schriftarten und lokale Inhalte verwendet.
          </p>
        </Section>

        <Section title="8. Beschwerderecht">
          <p>
            Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu
            beschweren, wenn du der Ansicht bist, dass die Verarbeitung deiner
            Daten gegen die DSGVO verstößt.
          </p>
        </Section>
      </div>
    </div>
  );
}

export function LegalPage({ kind }: LegalPageProps) {
  if (kind === "impressum") {
    return <Impressum />;
  }

  return <Datenschutz />;
}

export default LegalPage;
