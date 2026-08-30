import { useParams } from "react-router-dom";

export function ItemFormPage() {
  const { id } = useParams();
  const isEdit = id !== undefined;

  return (
    <div className="page">
      <h1 className="page__title">
        {isEdit ? "Kleidungsstück bearbeiten" : "Neues Kleidungsstück"}
      </h1>
      <p className="page__hint">
        {isEdit
          ? "Das Formular zum Bearbeiten wird in einem späteren Schritt ergänzt."
          : "Das Formular zum Anlegen wird in einem späteren Schritt ergänzt."}
      </p>
    </div>
  );
}

export default ItemFormPage;
