import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useRef, useState, type ReactNode } from "react";
import { getAdminButtonClassName } from "@/components/admin/AdminControls";
import { cn } from "@/lib/utils";

// The theme editor's two pop-ups (Lucia, 2026-11-20): naming a version when it is saved,
// and asking what to do with unsaved changes before going to another version. Each opener
// returns a promise with the answer, so the editor's flows read top to bottom.

type Unsaved = "save" | "discard" | "cancel";
type Open =
  | { kind: "name"; defaultName: string; resolve: (name: string | null) => void }
  | { kind: "unsaved"; resolve: (answer: Unsaved) => void };

const CONTENT =
  "admin-shell fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border border-[var(--admin-edge)] bg-[var(--admin-surface)] p-5 text-[var(--admin-ink)] shadow-[0_24px_48px_-28px_rgb(19_8_8/0.45)] focus:outline-none";

export function useVersionDialogs() {
  const [open, setOpen] = useState<Open | null>(null);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const askName = (defaultName: string) =>
    new Promise<string | null>((resolve) => {
      setName(defaultName);
      setOpen({ kind: "name", defaultName, resolve });
    });
  const askUnsaved = () =>
    new Promise<Unsaved>((resolve) => setOpen({ kind: "unsaved", resolve }));

  const finish = (answer: string | null | Unsaved) => {
    if (!open) return;
    if (open.kind === "name") open.resolve(answer as string | null);
    else open.resolve(answer as Unsaved);
    setOpen(null);
  };

  const dialogs: ReactNode = (
    <AlertDialog.Root
      open={open !== null}
      onOpenChange={(next) => {
        if (!next) finish(open?.kind === "name" ? null : "cancel");
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-[#130808]/40" />
        {open?.kind === "name" ? (
          <AlertDialog.Content
            className={CONTENT}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              inputRef.current?.select();
            }}
          >
            <AlertDialog.Title className="text-base font-semibold">
              Ponle nombre a esta versión
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-1 text-sm text-[var(--admin-muted)]">
              Así la encuentras en el historial. Puedes dejar el nombre que trae.
            </AlertDialog.Description>
            <form
              className="mt-4 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                finish(name.trim() || open.defaultName);
              }}
            >
              <input
                ref={inputRef}
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                aria-label="Nombre de la versión"
                className="w-full border border-[var(--admin-line-strong)] bg-[var(--admin-field)] px-3 py-2.5 text-sm text-[var(--admin-ink)] outline-none focus:border-[var(--admin-select)]"
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AlertDialog.Cancel className={getAdminButtonClassName("secondary")}>
                  Cancelar
                </AlertDialog.Cancel>
                <button type="submit" className={getAdminButtonClassName("save")}>
                  Guardar versión
                </button>
              </div>
            </form>
          </AlertDialog.Content>
        ) : null}
        {open?.kind === "unsaved" ? (
          <AlertDialog.Content className={CONTENT}>
            <AlertDialog.Title className="text-base font-semibold">
              Tienes cambios sin guardar
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">
              ¿Los guardas como una versión antes de cambiar? Si los descartas, se pierden.
            </AlertDialog.Description>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel className={getAdminButtonClassName("secondary")}>
                Cancelar
              </AlertDialog.Cancel>
              <button
                type="button"
                className={cn(getAdminButtonClassName("danger"))}
                onClick={() => finish("discard")}
              >
                Descartar cambios
              </button>
              <button
                type="button"
                className={getAdminButtonClassName("save")}
                onClick={() => finish("save")}
              >
                Guardar y cambiar
              </button>
            </div>
          </AlertDialog.Content>
        ) : null}
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );

  return { askName, askUnsaved, dialogs };
}
