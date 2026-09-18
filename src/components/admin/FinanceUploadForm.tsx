"use client";

import { useState, useTransition } from "react";

import { uploadFinanceCsvAction } from "@/actions/admin/finance.action";
import { CURRENCY_CODES } from "@/lib/i18n/catalog";

export function FinanceUploadForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-head">
        <div>
          <div className="cmd-panel-title">Upload Leah finance CSV</div>
          <div className="cmd-panel-sub">
            Columns: date,category,subcategory,description,amount,currency,account,business_line.
            Currency must be one of: {CURRENCY_CODES.join(", ")}.
          </div>
        </div>
      </div>
      <div className="cmd-panel-body">
        {result ? <div className="cmd-section-note">{result}</div> : null}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const csv = String(new FormData(event.currentTarget).get("csv") ?? "");
            startTransition(async () => {
              const res = await uploadFinanceCsvAction({ csv });
              if (res?.data && "ok" in res.data && res.data.ok) {
                setResult(`Uploaded batch ${res.data.batchId} (${res.data.rows} rows)`);
              } else if (res?.data && "errors" in res.data && res.data.errors) {
                setResult(
                  res.data.errors
                    .map((e) => `Row ${e.row}: ${e.reason}`)
                    .join(" · "),
                );
              } else {
                setResult(res?.serverError ?? "Upload failed");
              }
            });
          }}
        >
          <div className="cmd-field">
            <label htmlFor="csv">CSV</label>
            <textarea id="csv" name="csv" rows={8} required />
          </div>
          <button className="cmd-btn cmd-btn-primary" disabled={pending} type="submit">
            Validate and import
          </button>
        </form>
      </div>
    </div>
  );
}
