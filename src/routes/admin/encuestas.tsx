import { Link, createFileRoute } from "@tanstack/react-router";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import { AdminEmptyState } from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import {
  FEEDBACK_QUESTIONS,
  type AdminOrderFeedbackRow,
  type FeedbackDevice,
  type FeedbackQuestionId,
  getAdminOrderFeedback,
} from "@/lib/order-feedback";

export const Route = createFileRoute("/admin/encuestas")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => getAdminOrderFeedback(),
  head: () => ({ meta: [{ title: "Admin - Encuestas" }] }),
  component: AdminSurveysPage,
});

const DEVICE_LABEL: Record<FeedbackDevice, string> = {
  phone: "Telefono",
  tablet: "Tablet",
  desktop: "Computadora",
};

function average(rows: AdminOrderFeedbackRow[], id: FeedbackQuestionId) {
  const values = rows.map((row) => row.ratings[id]).filter((value): value is number => typeof value === "number");
  if (values.length === 0) return null;
  return { value: values.reduce((sum, value) => sum + value, 0) / values.length, count: values.length };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santo_Domingo" });
}

function AverageCell({ rows, id }: { rows: AdminOrderFeedbackRow[]; id: FeedbackQuestionId }) {
  const result = average(rows, id);
  if (!result) return <span className="text-[#6b5a55]">-</span>;
  return (
    <span>
      <span className="font-black">{result.value.toFixed(1)}</span>
      <span className="text-xs text-[#6b5a55]"> / 5 ({result.count})</span>
    </span>
  );
}

function AdminSurveysPage() {
  const { answers, unanswered } = Route.useLoaderData();
  const phone = answers.filter((row) => row.device === "phone");
  const desktop = answers.filter((row) => row.device !== "phone");

  return (
    <AdminShell section="encuestas" title="Encuestas" subtitle="Opiniones opcionales que dejan los clientes despues de hacer un pedido.">
      <AdminPanel title="Promedios">
        {answers.length === 0 ? (
          <AdminEmptyState
            title="Todavia no hay respuestas"
            body="Cuando un cliente complete la encuesta despues de su pedido, aparecera aqui."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[#231717]/10">
                  <th className="py-2 pr-4 font-bold">Pregunta</th>
                  <th className="py-2 pr-4 font-bold">Telefono ({phone.length})</th>
                  <th className="py-2 pr-4 font-bold">Tablet y computadora ({desktop.length})</th>
                  <th className="py-2 font-bold">Todos ({answers.length})</th>
                </tr>
              </thead>
              <tbody>
                {FEEDBACK_QUESTIONS.map((question) => (
                  <tr key={question.id} className="border-b border-[#231717]/5">
                    <td className="py-2 pr-4">{question.label}</td>
                    <td className="py-2 pr-4"><AverageCell rows={phone} id={question.id} /></td>
                    <td className="py-2 pr-4"><AverageCell rows={desktop} id={question.id} /></td>
                    <td className="py-2"><AverageCell rows={answers} id={question.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {answers.length > 0 ? (
        <AdminPanel title={`Respuestas (${answers.length})`}>
          <ul className="grid gap-3">
            {answers.map((row) => (
              <li key={row.id} className="rounded-2xl border border-[#231717]/10 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Link
                    to="/admin/pedidos"
                    search={{ order: row.orderId }}
                    className="font-black underline underline-offset-4"
                  >
                    Pedido {row.requestNumber}
                  </Link>
                  {row.customerName ? <span>{row.customerName}</span> : null}
                  <AdminTag>{DEVICE_LABEL[row.device]}</AdminTag>
                  <span className="text-xs text-[#6b5a55]">{formatDate(row.createdAt)}</span>
                </div>
                <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                  {FEEDBACK_QUESTIONS.map((question) =>
                    row.ratings[question.id] ? (
                      <div key={question.id} className="flex justify-between gap-3">
                        <dt className="text-[#6b5a55]">{question.label}</dt>
                        <dd className="font-bold">{row.ratings[question.id]} / 5</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
                {row.note ? (
                  <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#faf6f0] p-3 text-sm">{row.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </AdminPanel>
      ) : null}

      <AdminPanel title={`Pedidos recientes sin encuesta (${unanswered.length})`}>
        {unanswered.length === 0 ? (
          <p className="text-sm text-[#6b5a55]">Todos los pedidos recientes tienen respuesta.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {unanswered.map((row) => (
              <li key={row.orderId} className="flex flex-wrap items-center gap-3">
                <Link
                  to="/admin/pedidos"
                  search={{ order: row.orderId }}
                  className="font-black underline underline-offset-4"
                >
                  Pedido {row.requestNumber}
                </Link>
                {row.customerName ? <span>{row.customerName}</span> : null}
                {row.customerPhone ? <span className="text-[#6b5a55]">{row.customerPhone}</span> : null}
                <span className="text-xs text-[#6b5a55]">{formatDate(row.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
