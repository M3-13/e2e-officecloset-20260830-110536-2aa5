interface LegalPageProps {
  kind: "impressum" | "datenschutz";
}

export function LegalPage({ kind }: LegalPageProps) {
  if (kind === "impressum") {
    return (
      <div className="page">
        <h1 className="page__title">Impressum</h1>
        <p className="page__hint">Die rechtlichen Angaben werden hier ergänzt.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page__title">Datenschutz</h1>
      <p className="page__hint">Die Datenschutzerklärung wird hier ergänzt.</p>
    </div>
  );
}

export default LegalPage;
