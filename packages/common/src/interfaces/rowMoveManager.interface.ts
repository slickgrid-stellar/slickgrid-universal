import type { RowMoveManagerOption } from './index.js';
import type { SlickRowMoveManager } from '../extensions/slickRowMoveManager.js';
import type { SlickGrid } from '../core/index.js';

export interface RowMoveManager extends RowMoveManagerOption {
  //
  // SlickGrid Events

  /** Fired after extension (plugin) is registered by SlickGrid */
  onExtensionRegistered?: (plugin: SlickRowMoveManager) => void;

  /** SlickGrid Event fired before the row is moved. */
  onBeforeMoveRows?: (e: MouseEvent | TouchEvent, args: { grid: SlickGrid; rows: number[]; insertBefore: number }) => boolean | void;

  /** SlickGrid Event fired while the row is moved. */
  onMoveRows?: (e: MouseEvent | TouchEvent, args: { grid: SlickGrid; rows: number[]; insertBefore: number }) => void;
}
