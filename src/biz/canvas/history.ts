/**
 * @file undo redo 实现
 */

import { base } from "@/domains/base";

export enum CanvasOperationType {
  /** 添加物体 */
  AddThing,
  /** 删除物体 */
  DelThing,
  /** 移动 */
  Drag,
  /** 缩放 */
  Resize,
  /** 旋转 */
  Rotate,
}
/** 支持历史记录管理的画布操作 */
interface CanvasOperator {
  type: CanvasOperationType;
  values: string;
}

type HistoryManageProps = {
  stacks: CanvasOperator[];
  index: number;
  canUndo: boolean;
  canRedo: boolean;
};
export function HistoryManage(props: HistoryManageProps) {
  let _stacks: CanvasOperator[] = [];
  let _index: number = 0;

  const _state = {
    get stacks() {
      return _stacks;
    },
    get index() {
      return _index;
    },
    get canUndo() {
      return _index >= 0;
    },
    get canRedo() {
      return _index < _stacks.length - 1;
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
    /** 历史栈 */
    get stacks() {
      return _stacks;
    },
    /** 当前下标 */
    get index() {
      return _index;
    },
    /** 增加一个操作记录 */
    push(operation: CanvasOperator) {
      //       const { stacks, index } = this.values;
      if (_index === _stacks.length - 1) {
        _stacks.push(operation);
      } else {
        _stacks = _stacks.slice(0, _index + 1).concat(operation);
      }
      _index += 1;
      // console.log("[DOMAIN]HistoryManage - push", operation);
      // console.log("[DOMAIN]HistoryManage - push", this.values);
      //       this.emitValuesChange();
      bus.emit(Events.Change, { ..._state });
    },
    undo() {
      //       const { stacks, index, canUndo } = this.values;
      console.log("[DOMAIN]HistoryManage - undo", _stacks, _index);
      // console.log("[DOMAIN]HistoryManage - undo", canUndo);
      if (!_state.canUndo) {
        return null;
      }
      const operation = _stacks[_index];
      _index -= 1;
      // console.log("[DOMAIN]HistoryManage - undo", this.stacks);
      bus.emit(Events.Change, { ..._state });
      // console.log("[DOMAIN]HistoryManage - undo", operation);
      if (operation === undefined) {
        return null;
      }
      return operation;
    },
    redo() {
      //       const { index, stacks, canRedo } = this.values;
      if (!_state.canRedo) {
        return null;
      }
      const nextIndex = _index + 1;
      _index = nextIndex;
      const next = _stacks[nextIndex];
      console.log("[DOMAIN]HistoryManage - redo", next);
      bus.emit(Events.Change, { ..._state });
      if (next === undefined) {
        return null;
      }
      return next;
    },
  };
}

export type HistoryManage = ReturnType<typeof HistoryManage>;
