import { base } from "@/domains/base";

type MultipleInputCoreProps = {};
export function MultipleInputCore<T>(props: MultipleInputCoreProps) {
  let _inputs: Array<T> = [];
  const _state = {
    get inputs() {
      return _inputs;
    },
  };

  enum Events {
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    state: _state,
    get inputs() {
      return _inputs;
    },
    append(v: T) {
      _inputs.push(v);
      bus.emit(Events.Change, { ..._state });
    },
    remove(v: T) {
      _inputs = _inputs.filter((i) => i !== v);
      bus.emit(Events.Change, { ..._state });
    },
    removeByIndex(index: number) {
      _inputs = [..._inputs.slice(0, index), ..._inputs.slice(index + 1)];
      bus.emit(Events.Change, { ..._state });
    },
    SymbolTag: "MultipleInput" as const,
  };
}

export type MultipleInputCore = ReturnType<typeof MultipleInputCore>;
