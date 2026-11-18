import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AdminButton,
  AdminEmptyState,
  AdminToast,
  type AdminToastTone,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import { SurveyBuilder } from "@/components/admin/surveys/SurveyBuilder";
import { SurveyResults } from "@/components/admin/surveys/SurveyResults";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import {
  closeAdminSurvey,
  deleteAdminSurvey,
  duplicateAdminSurvey,
  getAdminSurveyDetail,
  listAdminSurveys,
  openAdminSurvey,
  saveAdminSurvey,
} from "@/lib/order-feedback";
import { SURVEY_DEVICE_LABEL, type SurveyEditInput, type SurveySummary, surveyDateLabel } from "@/lib/order-feedback-shared";
import { cn } from "@/lib/utils";

type EncuestasSearch = { survey?: string; editar?: "nueva" | "1" };

export const Route = createFileRoute("/admin/encuestas")({
  validateSearch: (search: Record<string, unknown>): EncuestasSearch => ({
    survey: typeof search.survey === "string" && search.survey.trim() ? search.survey.trim() : undefined,
    editar: search.editar === "nueva" || search.editar === "1" ? search.editar : undefined,
  }),
  beforeLoad: () => enforceAdminAccess(),
  loaderDeps: ({ search }) => ({ survey: search.survey }),
  loader: async ({ deps }) => {
    const surveys = await listAdminSurveys();
    const selectedId = deps.survey ?? surveys[0]?.id;
    const detail = selectedId ? await getAdminSurveyDetail({ data: { id: selectedId } }) : null;
    return { surveys, detail };
  },
  head: () => ({ meta: [{ title: "Admin - Encuestas" }] }),
  component: AdminSurveysPage,
});

const GROUPS: Array<{ status: SurveySummary["status"]; label: string }> = [
  { status: "open", label: "Abiertas" },
  { status: "draft", label: "Borradores" },
  { status: "closed", label: "Archivo" },
];

function questionCounts(questions: Array<{ kind: string }>) {
  const ratings = questions.filter((question) => question.kind === "rating").length;
  const texts = questions.length - ratings;
  return `${ratings} ${ratings === 1 ? "categoría" : "categorías"} · ${texts} ${texts === 1 ? "pregunta" : "preguntas"}`;
}

function eyebrowFor(survey: SurveySummary) {
  return `${SURVEY_DEVICE_LABEL[survey.device]} · ${surveyDateLabel(survey)}`;
}

function SurveyCard({ survey, selected }: { survey: SurveySummary; selected: boolean }) {
  return (
    <Link
      to="/admin/encuestas"
      search={{ survey: survey.id }}
      className={cn(
        "block rounded-xl border px-3 py-2.5 transition",
        selected ? "border-transparent bg-[var(--admin-accent-soft)]" : "border-[var(--admin-edge)] bg-[var(--admin-surface)] hover:bg-[var(--admin-accent-soft)]",
      )}
    >
      <div className="text-xs font-medium text-[var(--admin-faint)]">{eyebrowFor(survey)}</div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-semibold">{survey.title}</span>
        <span className="shrink-0 text-xs tabular-nums text-[var(--admin-muted)]">
          {survey.answerCount} resp.
        </span>
      </div>
    </Link>
  );
}

function AdminSurveysPage() {
  const { surveys, detail } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<AdminToastTone>("info");

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const show = (text: string, nextTone: AdminToastTone) => {
    setTone(nextTone);
    setMessage(text);
  };

  const run = async (action: () => Promise<unknown>, success: string, after?: (result: unknown) => EncuestasSearch) => {
    setBusy(true);
    try {
      const result = await action();
      show(success, "success");
      if (after) await navigate({ to: "/admin/encuestas", search: after(result) });
      await router.invalidate();
    } catch (error) {
      show(getAdminErrorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const selected = detail?.survey ?? null;
  const editingNew = search.editar === "nueva";
  const editingSelected = search.editar === "1" && selected !== null;

  const save = (input: SurveyEditInput) =>
    run(
      () => saveAdminSurvey({ data: input }),
      "Encuesta guardada.",
      (result) => ({ survey: (result as { id: string }).id }),
    );

  const remove = async (survey: SurveySummary) => {
    const answers =
      survey.answerCount === 0
        ? "No tiene respuestas."
        : `Se borrarán para siempre sus ${survey.answerCount} ${survey.answerCount === 1 ? "respuesta" : "respuestas"}.`;
    if (
      !(await confirmAdminDestructiveAction(
        `Vas a borrar la encuesta "${survey.title}". ${answers} Los pedidos no se borran. Esto no se puede deshacer. ¿Continuar?`,
      ))
    ) {
      return;
    }
    void run(() => deleteAdminSurvey({ data: { id: survey.id } }), "Encuesta borrada.", () => ({}));
  };

  const close = async (survey: SurveySummary) => {
    if (!(await confirmAdminDestructiveAction(`¿Cerrar "${survey.title}"? Dejará de mostrarse y pasará al archivo con sus respuestas.`))) return;
    void run(() => closeAdminSurvey({ data: { id: survey.id } }), "Encuesta cerrada.");
  };

  const actionsFor = (survey: SurveySummary) => (
    <>
      <AdminButton tone="danger" disabled={busy} onClick={() => remove(survey)}>
        Eliminar
      </AdminButton>
      {survey.status !== "closed" ? (
        <AdminButton tone="ghost" disabled={busy} onClick={() => void navigate({ to: "/admin/encuestas", search: { survey: survey.id, editar: "1" } })}>
          Editar
        </AdminButton>
      ) : null}
      {survey.status === "draft" ? (
        <AdminButton tone="save" disabled={busy} onClick={() => void run(() => openAdminSurvey({ data: { id: survey.id } }), "Encuesta abierta.")}>
          Abrir
        </AdminButton>
      ) : null}
      {survey.status === "open" ? (
        <AdminButton tone="warning" disabled={busy} onClick={() => close(survey)}>
          Cerrar
        </AdminButton>
      ) : null}
      <AdminButton
        tone="secondary"
        disabled={busy}
        onClick={() =>
          void run(
            () => duplicateAdminSurvey({ data: { id: survey.id } }),
            "Copia creada como borrador.",
            (result) => ({ survey: (result as { id: string }).id, editar: "1" }),
          )
        }
      >
        Duplicar
      </AdminButton>
    </>
  );

  return (
    <AdminShell
      section="encuestas"
      title="Encuestas"
      subtitle="Crea encuestas para después del pedido, ábrelas por dispositivo y revisa lo que responden."
      actions={
        <AdminButton tone="create" disabled={busy} onClick={() => void navigate({ to: "/admin/encuestas", search: { editar: "nueva" } })}>
          <span className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Nueva encuesta
          </span>
        </AdminButton>
      }
    >
      {message ? <AdminToast message={message} tone={tone} /> : null}
      <div className="grid items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="grid gap-4">
          {surveys.length === 0 ? (
            <p className="text-sm text-[var(--admin-on-bg-muted)]">Todavía no hay encuestas.</p>
          ) : (
            GROUPS.map((group) => {
              const items = surveys.filter((survey) => survey.status === group.status);
              if (items.length === 0) return null;
              return (
                <div key={group.status} className="grid gap-2">
                  <div className="px-1 text-xs font-medium text-[var(--admin-on-bg-muted)]">{group.label}</div>
                  {items.map((survey) => (
                    <SurveyCard key={survey.id} survey={survey} selected={!editingNew && survey.id === selected?.id} />
                  ))}
                </div>
              );
            })
          )}
        </aside>

        <div className="grid min-w-0 gap-4">
          {editingNew || editingSelected ? (
            <SurveyBuilder
              key={editingNew ? "new" : selected?.id}
              survey={editingNew ? null : selected}
              questions={editingNew ? [] : (detail?.questions ?? [])}
              saving={busy}
              onSave={(input) => void save(input)}
              onCancel={() => void navigate({ to: "/admin/encuestas", search: selected && !editingNew ? { survey: selected.id } : {} })}
            />
          ) : detail && selected ? (
            <>
              <AdminPanel eyebrow={eyebrowFor(selected)} title={selected.title} actions={actionsFor(selected)}>
                <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--admin-muted)]">
                  {/* Same tones as the rest of the admin: live = dark ("Activo", "Publica"),
                      not shown yet = warn ("Oculta"), finished = success (Pedidos "Cerrada"). */}
                  <AdminTag tone={selected.status === "open" ? "dark" : selected.status === "draft" ? "warn" : "cocoa"}>
                    {selected.status === "open" ? "Abierta" : selected.status === "draft" ? "Borrador" : "Cerrada"}
                  </AdminTag>
                  <span>{questionCounts(detail.questions)}</span>
                </div>
              </AdminPanel>
              <SurveyResults survey={selected} questions={detail.questions} answers={detail.answers} unanswered={detail.unanswered} />
            </>
          ) : (
            <AdminEmptyState
              title="Crea tu primera encuesta"
              body="Elige sus categorías de estrellas y preguntas, para qué dispositivo es, y ábrela cuando quieras que los clientes la vean."
            />
          )}
        </div>
      </div>
    </AdminShell>
  );
}
