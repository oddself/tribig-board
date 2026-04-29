"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveBoardScene } from "@/lib/actions/board";
import { createClient } from "@/lib/supabase/browser";
import type { BoardScene } from "@/lib/types/domain";
import type { AppState, BinaryFiles, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const Excalidraw = dynamic(() => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading board...</div>
});

export function ExcalidrawBoard({
  projectId,
  initialScene,
  canEdit
}: {
  projectId: string;
  initialScene: BoardScene;
  canEdit: boolean;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSignature = useRef(sceneSignature(initialScene));
  const lastQueuedSignature = useRef<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-board-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_boards",
          filter: `project_id=eq.${projectId}`
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  const initialData = useMemo<ExcalidrawInitialDataState>(
    () => ({
      elements: (initialScene?.elements ?? []) as unknown as readonly OrderedExcalidrawElement[],
      appState: {
        viewBackgroundColor: "#ffffff",
        ...(initialScene?.appState ?? {})
      },
      files: (initialScene?.files ?? {}) as unknown as BinaryFiles
    }),
    [initialScene]
  );

  const scheduleSave = useCallback(
    (elements: readonly OrderedExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (!canEdit) {
        return;
      }

      const scene: BoardScene = {
        elements: [...elements],
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
          theme: appState.theme,
          name: appState.name
        },
        files: files as unknown as Record<string, unknown>
      };
      const nextSignature = sceneSignature(scene);

      if (nextSignature === lastSavedSignature.current || nextSignature === lastQueuedSignature.current) {
        return;
      }

      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }

      lastQueuedSignature.current = nextSignature;
      setSaveState("saving");
      saveTimer.current = setTimeout(() => {
        saveBoardScene(projectId, scene)
          .then(() => {
            lastSavedSignature.current = nextSignature;
            lastQueuedSignature.current = null;
            setSaveState("saved");
          })
          .catch(() => setSaveState("error"));
      }, 900);
    },
    [canEdit, projectId]
  );

  useEffect(() => {
    lastSavedSignature.current = sceneSignature(initialScene);
    lastQueuedSignature.current = null;

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [initialScene, projectId]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-12 items-center justify-between border-b border-slate-200 px-4 py-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Visual board</h2>
          <p className="text-xs text-slate-500">{canEdit ? "Autosaves after changes" : "Read-only view"}</p>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : ""}
        </span>
      </div>
      <div className="h-[calc(100vh-15rem)] min-h-[34rem]">
        <Excalidraw
          initialData={initialData}
          viewModeEnabled={!canEdit}
          onChange={(elements, appState, files) => scheduleSave(elements, appState, files)}
        />
      </div>
    </div>
  );
}

function sceneSignature(scene: BoardScene) {
  return JSON.stringify({
    elements: scene.elements ?? [],
    appState: scene.appState ?? {},
    files: scene.files ?? {}
  });
}
