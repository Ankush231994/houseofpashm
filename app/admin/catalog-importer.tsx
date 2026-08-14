"use client";

import { useState } from "react";

type ImportIssue = {
  file: string;
  row: number;
  field?: string;
  message: string;
};

type ImportResponse = {
  productRows?: number;
  uniqueProducts?: number;
  imageRows?: number;
  issues?: ImportIssue[];
  error?: string;
  result?: { importId: string; products: number; variants: number; images: number };
};

export default function CatalogImporter({ databaseEnabled }: { databaseEnabled: boolean }) {
  const [productsCsv, setProductsCsv] = useState("");
  const [imagesCsv, setImagesCsv] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function readFile(
    file: File | undefined,
    setter: (value: string) => void,
  ) {
    setter(file ? await file.text() : "");
    setResult(null);
  }

  async function submit(commit: boolean) {
    if (!productsCsv || !imagesCsv) return;
    if (commit && !window.confirm("Import these validated rows into the catalogue database?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/catalog/import", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productsCsv, imagesCsv, commit }),
      });
      const body = (await response.json()) as ImportResponse;
      setResult(body);
    } catch {
      setResult({ error: "The catalogue request could not be completed." });
    } finally {
      setBusy(false);
    }
  }

  const canCommit =
    databaseEnabled &&
    result &&
    !result.error &&
    result.issues?.length === 0;

  return (
    <section className="admin-importer">
      <div className="admin-upload-grid">
        <label>
          <strong>Products CSV</strong>
          <span>Use catalog/products.csv with one row per variant.</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => readFile(event.target.files?.[0], setProductsCsv)}
          />
        </label>
        <label>
          <strong>Product images CSV</strong>
          <span>Use catalog/product-images.csv with one row per image.</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => readFile(event.target.files?.[0], setImagesCsv)}
          />
        </label>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          disabled={busy || !productsCsv || !imagesCsv}
          onClick={() => submit(false)}
        >
          {busy ? "WORKING…" : "VALIDATE FILES"}
        </button>
        <button
          className="primary"
          type="button"
          disabled={busy || !canCommit}
          onClick={() => submit(true)}
        >
          IMPORT TO DATABASE
        </button>
      </div>

      {!databaseEnabled && (
        <p className="admin-notice">
          Validation is available. Database import remains disabled until
          CATALOG_SOURCE=database and the D1 binding are configured.
        </p>
      )}

      {result && (
        <div className="admin-result" aria-live="polite">
          {result.error ? (
            <p className="admin-error">{result.error}</p>
          ) : (
            <>
              <div className="admin-stats">
                <span><b>{result.uniqueProducts ?? 0}</b> products</span>
                <span><b>{result.productRows ?? 0}</b> variants</span>
                <span><b>{result.imageRows ?? 0}</b> images</span>
              </div>
              {result.result && (
                <p className="admin-success">
                  Import {result.result.importId} completed successfully.
                </p>
              )}
              {result.issues?.length ? (
                <div className="admin-issues">
                  <h2>{result.issues.length} validation issue(s)</h2>
                  <table>
                    <thead><tr><th>File</th><th>Row</th><th>Field</th><th>Issue</th></tr></thead>
                    <tbody>
                      {result.issues.map((issue, index) => (
                        <tr key={`${issue.file}-${issue.row}-${issue.field}-${index}`}>
                          <td>{issue.file}</td><td>{issue.row}</td>
                          <td>{issue.field ?? "—"}</td><td>{issue.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                !result.result && <p className="admin-success">Validation passed. No rows were written.</p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
