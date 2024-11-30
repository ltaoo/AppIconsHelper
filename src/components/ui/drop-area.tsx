import { createSignal, JSX, Show } from "solid-js";
import i18next from "i18next";

import { DragZoneCore } from "@/domains/ui/drag-zone";

export function DropArea(props: { store: DragZoneCore } & JSX.HTMLAttributes<HTMLDivElement>) {
  const { store } = props;

  const [state, setState] = createSignal(store.state);

  store.onStateChange((v) => setState(v));

  return (
    <div
      classList={{
        "overflow-hidden absolute inset-0 rounded-sm outline-slate-600 outline-4": true,
        outline: state().hovering,
        "outline-dashed": !state().hovering,
      }}
      onDragOver={(event) => {
        event.preventDefault();
        store.handleDragover();
      }}
      onDragLeave={() => {
        store.handleDragleave();
      }}
      onDrop={(event) => {
        event.preventDefault();
        store.handleDrop(Array.from(event.dataTransfer?.files || []));
      }}
    >
      <div
        class="absolute inset-0 flex items-center justify-center cursor-pointer"
        style={{ display: state().selected ? "none" : "block" }}
      >
        <div class="p-4 text-center">
          <p>{i18next.t("drop_file_here")}</p>
          <input type="file" class="absolute inset-0 opacity-0 cursor-pointer" />
        </div>
      </div>
      {props.children}
    </div>
  );
}
