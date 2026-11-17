import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminEmptyState, AdminInput, AdminPagination } from "@/components/admin/AdminControls";
import { AdminPanel, AdminTag } from "@/components/admin/AdminShell";
import { RatingFigure, StarMeter } from "@/components/admin/surveys/StarMeter";
import type { AdminUnansweredOrderRow } from "@/lib/order-feedback";
import {
  type AdminSurveyAnswer,
  type AnswerDevice,
  type SurveyQuestion,
  type SurveySummary,
  averageRating,
  filterAnswersByDate,
  paginate,
} from "@/lib/order-feedback-shared";

const ANSWERS_PER_PAGE = 5;
const DEVICE_SHORT: Record<AnswerDevice, string> = { phone: "Teléfono", desktop: "Computadora" };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santo_Domingo",
  });
}

function OrderLink({ orderId, requestNumber, exists }: { orderId: string; requestNumber: string; exists: boolean }) {
  if (!exists) return <span className="font-semibold text-[var(--admin-muted)]">{requestNumber}</span>;
  return (
    <Link to="/admin/pedidos" search={{ order: orderId }} className="font-semibold underline underline-offset-4">
      {requestNumber}
    </Link>
  );
}

function AverageCell({ answers, questionId, device }: { answers: AdminSurveyAnswer[]; questionId: string; device?: AnswerDevice }) {
  const result = averageRating(answers, questionId, device);
  if (!result) return <span className="text-[var(--admin-faint)]">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <StarMeter value={result.value} size="sm" />
      <RatingFigure value={result.value} count={result.count} />
    </span>
  );
}

export function SurveyResults({
  survey,
  questions,
  answers,
  unanswered,
}: {
  survey: SurveySummary;
  questions: SurveyQuestion[];
  answers: AdminSurveyAnswer[];
  unanswered: AdminUnansweredOrderRow[];
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => filterAnswersByDate(answers, from, to), [answers, from, to]);
  const pageData = paginate(filtered, page, ANSWERS_PER_PAGE);
  const ratingQuestions = questions.filter((question) => question.kind === "rating");
  const textQuestions = questions.filter((question) => question.kind === "text");
  const phoneCount = filtered.filter((answer) => answer.device === "phone").length;

  useEffect(() => setPage(0), [from, to, survey.id]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-3">
        <label className="grid gap-1 text-xs font-medium text-[var(--admin-muted)]">
          Desde
          <AdminInput type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="py-2" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-[var(--admin-muted)]">
          Hasta
          <AdminInput type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="py-2" />
        </label>
        {from || to ? (
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="pb-2 text-xs font-semibold text-[var(--admin-muted)] underline underline-offset-4"
          >
            Quitar fechas
          </button>
        ) : null}
        <span className="ml-auto pb-2 text-xs text-[var(--admin-faint)]">
          {filtered.length} {filtered.length === 1 ? "respuesta" : "respuestas"}
        </span>
      </div>

      {ratingQuestions.length > 0 ? (
        <AdminPanel title="Promedios">
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">Sin respuestas en estas fechas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--admin-line)] text-xs font-medium text-[var(--admin-faint)]">
                    <th className="py-2 pr-4 font-semibold">Categoría</th>
                    <th className="py-2 pr-4 font-semibold">Teléfono ({phoneCount})</th>
                    <th className="py-2 pr-4 font-semibold">Computadora ({filtered.length - phoneCount})</th>
                    <th className="py-2 font-semibold">Todos ({filtered.length})</th>
                  </tr>
                </thead>
                <tbody>
                  {ratingQuestions.map((question) => (
                    <tr key={question.id} className="border-b border-[var(--admin-line)] last:border-0">
                      <td className="py-2.5 pr-4 font-semibold">{question.label}</td>
                      <td className="py-2.5 pr-4"><AverageCell answers={filtered} questionId={question.id} device="phone" /></td>
                      <td className="py-2.5 pr-4"><AverageCell answers={filtered} questionId={question.id} device="desktop" /></td>
                      <td className="py-2.5"><AverageCell answers={filtered} questionId={question.id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      ) : null}

      <AdminPanel title={`Respuestas (${filtered.length})`}>
        {filtered.length === 0 ? (
          <AdminEmptyState
            title={answers.length === 0 ? "Todavía no hay respuestas" : "Nada en estas fechas"}
            body={
              answers.length === 0
                ? "Cuando un cliente complete esta encuesta después de su pedido, aparecerá aquí."
                : "Cambia o quita el filtro de fechas para ver más respuestas."
            }
          />
        ) : (
          <div className="grid gap-3">
            <ul className="divide-y divide-[var(--admin-line)]">
              {pageData.items.map((answer) => (
                <li key={answer.id} className="py-3 first:pt-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <OrderLink orderId={answer.orderId} requestNumber={answer.requestNumber} exists={answer.orderExists} />
                    {answer.customerName ? <span className="text-[var(--admin-ink)]">{answer.customerName}</span> : null}
                    {/* Descriptive label: info tone, like "Código" / "Promoción" in Promociones. */}
                    <AdminTag tone="info">{DEVICE_SHORT[answer.device]}</AdminTag>
                    <span className="ml-auto text-xs text-[var(--admin-muted)]">{formatDateTime(answer.createdAt)}</span>
                  </div>
                  {ratingQuestions.some((question) => typeof answer.answers[question.id] === "number") ? (
                    <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                      {ratingQuestions.map((question) => {
                        const value = answer.answers[question.id];
                        if (typeof value !== "number") return null;
                        return (
                          <div key={question.id} className="flex items-center justify-between gap-3 text-sm">
                            <dt className="truncate text-[var(--admin-muted)]">{question.label}</dt>
                            <dd className="flex shrink-0 items-center gap-1.5">
                              <StarMeter value={value} size="sm" />
                              <span className="text-xs font-semibold tabular-nums">{value}/5</span>
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  ) : null}
                  {textQuestions.map((question) => {
                    const value = answer.answers[question.id];
                    if (typeof value !== "string" || !value) return null;
                    return (
                      <div key={question.id} className="mt-2 rounded-lg bg-[var(--admin-soft)] px-3 py-2 text-sm">
                        <div className="text-xs font-medium text-[var(--admin-faint)]">{question.label}</div>
                        <p className="mt-0.5 whitespace-pre-wrap">{value}</p>
                      </div>
                    );
                  })}
                </li>
              ))}
            </ul>
            <AdminPagination page={pageData.page} pages={pageData.pages} onChange={setPage} />
          </div>
        )}
      </AdminPanel>

      {survey.status === "open" ? (
        <AdminPanel title={`Pedidos recientes sin encuesta (${unanswered.length})`}>
          {unanswered.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">Todos los pedidos recientes tienen respuesta.</p>
          ) : (
            <ul className="divide-y divide-[var(--admin-line)] text-sm">
              {unanswered.map((row) => (
                <li key={row.orderId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0">
                  <OrderLink orderId={row.orderId} requestNumber={row.requestNumber} exists />
                  {row.customerName ? <span>{row.customerName}</span> : null}
                  {row.customerPhone ? <span className="text-[var(--admin-muted)]">{row.customerPhone}</span> : null}
                  <span className="ml-auto text-xs text-[var(--admin-muted)]">{formatDateTime(row.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      ) : null}
    </div>
  );
}
