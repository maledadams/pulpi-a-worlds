import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminButton, AdminField, AdminInput, AdminSelect } from "@/components/admin/AdminControls";
import { AdminPanel } from "@/components/admin/AdminShell";
import {
  SURVEY_DEVICE_LABEL,
  SURVEY_MAX_QUESTIONS,
  type SurveyDevice,
  type SurveyEditInput,
  type SurveyQuestion,
  type SurveyQuestionKind,
  type SurveySummary,
} from "@/lib/order-feedback-shared";

type DraftQuestion = { key: string; id?: string; kind: SurveyQuestionKind; label: string };

// endsAt is stored as the last instant of a Santo Domingo day (UTC-4);
// the date input wants that calendar day back as YYYY-MM-DD.
function endsAtToDay(endsAt: string | null) {
  if (!endsAt) return "";
  return new Date(Date.parse(endsAt) - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

let keySeed = 0;
const nextKey = () => `q${(keySeed += 1)}`;

export function SurveyBuilder({
  survey,
  questions,
  saving,
  onSave,
  onCancel,
}: {
  survey: SurveySummary | null;
  questions: SurveyQuestion[];
  saving: boolean;
  onSave: (input: SurveyEditInput) => void;
  onCancel: () => void;
}) {
  // Questions are frozen once an encuesta has been opened or answered, so old
  // answers keep their meaning; "Duplicar" makes an editable copy.
  const locked = Boolean(survey && (survey.status !== "draft" || survey.answerCount > 0));
  const [title, setTitle] = useState(survey?.title ?? "");
  const [device, setDevice] = useState<SurveyDevice>(survey?.device ?? "all");
  const [endsOn, setEndsOn] = useState(endsAtToDay(survey?.endsAt ?? null));
  const [items, setItems] = useState<DraftQuestion[]>(() =>
    questions.length > 0
      ? questions.map((question) => ({ ...question, key: nextKey() }))
      : [{ key: nextKey(), kind: "rating", label: "" }],
  );

  const ratings = items.filter((item) => item.kind === "rating");
  const texts = items.filter((item) => item.kind === "text");
  const canAdd = items.length < SURVEY_MAX_QUESTIONS;
  const valid = title.trim().length > 0 && items.length > 0 && items.every((item) => item.label.trim().length > 0);

  const update = (key: string, label: string) =>
    setItems((current) => current.map((item) => (item.key === key ? { ...item, label } : item)));
  const remove = (key: string) => setItems((current) => current.filter((item) => item.key !== key));
  const add = (kind: SurveyQuestionKind) => setItems((current) => [...current, { key: nextKey(), kind, label: "" }]);
  // Moves within its own group (categorías or preguntas).
  const move = (key: string, direction: -1 | 1) =>
    setItems((current) => {
      const item = current.find((entry) => entry.key === key);
      if (!item) return current;
      const group = current.filter((entry) => entry.kind === item.kind);
      const index = group.findIndex((entry) => entry.key === key);
      const target = group[index + direction];
      if (!target) return current;
      return current.map((entry) => (entry.key === key ? target : entry.key === target.key ? item : entry));
    });

  const save = () =>
    onSave({
      id: survey?.id,
      title: title.trim(),
      device,
      endsOn: endsOn || null,
      // Categorías first, then preguntas: the order customers see them in.
      questions: [...ratings, ...texts].map(({ id, kind, label }) => ({ id, kind, label: label.trim() })),
    });

  const renderGroup = (group: DraftQuestion[], kind: SurveyQuestionKind) => (
    <div className="grid gap-2">
      {group.map((item, index) => (
        <div key={item.key} className="flex items-center gap-2">
          <AdminInput
            value={item.label}
            disabled={locked}
            maxLength={120}
            placeholder={kind === "rating" ? "Ej. Rapidez de la página" : "Ej. ¿Algo más que quieras contarnos?"}
            aria-label={kind === "rating" ? `Categoría ${index + 1}` : `Pregunta ${index + 1}`}
            onChange={(event) => update(item.key, event.target.value)}
          />
          {!locked ? (
            <div className="flex shrink-0 items-center gap-1 text-[#5f4941]">
              <button
                type="button"
                aria-label="Subir"
                disabled={index === 0}
                onClick={() => move(item.key, -1)}
                className="rounded-lg p-1.5 hover:bg-[#f2ede7] disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Bajar"
                disabled={index === group.length - 1}
                onClick={() => move(item.key, 1)}
                className="rounded-lg p-1.5 hover:bg-[#f2ede7] disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => remove(item.key)}
                className="rounded-lg p-1.5 text-[#9a3423] hover:bg-[#f4d5cf]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      ))}
      {!locked ? (
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => add(kind)}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#5f4941] hover:bg-[#f2ede7] disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          {kind === "rating" ? "Agregar categoría" : "Agregar pregunta"}
        </button>
      ) : null}
    </div>
  );

  return (
    <AdminPanel
      eyebrow={survey ? "Editar encuesta" : "Nueva encuesta"}
      title={survey ? survey.title : "Crear encuesta"}
      actions={
        <>
          <AdminButton tone="ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </AdminButton>
          <AdminButton tone="primary" onClick={save} disabled={!valid || saving}>
            {saving ? "Guardando..." : "Guardar"}
          </AdminButton>
        </>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <AdminField label="Título (solo lo ves tú)">
            <AdminInput value={title} maxLength={80} placeholder="Ej. Navidad 2026" onChange={(event) => setTitle(event.target.value)} />
          </AdminField>
          <AdminField label="Dispositivo">
            <AdminSelect value={device} onChange={(event) => setDevice(event.target.value as SurveyDevice)}>
              {(Object.keys(SURVEY_DEVICE_LABEL) as SurveyDevice[]).map((key) => (
                <option key={key} value={key}>
                  {SURVEY_DEVICE_LABEL[key]}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField label="Cierra el (opcional)" hint="Se cierra sola al final de ese día.">
            <AdminInput type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
          </AdminField>
        </div>

        {locked ? (
          <p className="rounded-xl bg-[#f3eadf] px-3 py-2 text-xs font-semibold text-[#5f4941]">
            Esta encuesta ya se abrió, así que sus preguntas no se pueden cambiar. Usa "Duplicar" para hacer una copia editable.
          </p>
        ) : null}

        <div className="grid gap-2">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7c665f]">Categorías · estrellas</div>
          {renderGroup(ratings, "rating")}
        </div>
        <div className="grid gap-2">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7c665f]">Preguntas · texto libre</div>
          {renderGroup(texts, "text")}
        </div>
      </div>
    </AdminPanel>
  );
}
