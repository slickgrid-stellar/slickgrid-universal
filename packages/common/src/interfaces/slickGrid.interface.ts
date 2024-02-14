import type { SlickPluginList } from '../enums/index';
import type { CompositeEditorOption } from './compositeEditorOption.interface';
import type {
  Column,
  ColumnSort,
  DragRowMove,
  Editor,
  EditorValidationResult,
  ElementPosition,
  FormatterResultObject,
  GridOption,
  MultiColumnSort,
  PagingInfo,
  SingleColumnSort,
  SlickCompositeEditor,
  SlickDataView,
  SlickEditorLock,
  SlickEvent,
} from './index';
import type {
  SlickCellSelectionModel,
  SlickRowSelectionModel,
} from '../extensions/index';

export interface SlickGrid {
  /**
   * Adds an "overlay" of CSS classes to cell DOM elements. SlickGrid can have many such overlays associated with different keys and they are frequently used by plugins. For example, SlickGrid uses this method internally to decorate selected cells with selectedCellCssClass (see options).
   * @param key A unique key you can use in calls to setCellCssStyles and removeCellCssStyles. If a hash with that key has already been set, an exception will be thrown.
   * @param hash A hash of additional cell CSS classes keyed by row number and then by column id. Multiple CSS classes can be specified and separated by space.
   * @example
   * {
   * 	0:    {
   * 		number_column: SlickEvent;
   * 		title_column: SlickEvent;
   * 	},
   * 	4:    {
   * 		percent_column: SlickEvent;
   * 	}
   * }
   */
  addCellCssStyles(key: string, hash: any): void;

  /** Apply a Formatter Result to a Cell DOM Node */
  applyFormatResultToCellNode(formatterResult?: FormatterResultObject, cellNode?: HTMLDivElement, suppressRemove?: boolean): void;

  /** Proportionally resize a specific column by its name, index or Id */
  autosizeColumn(columnOrIndexOrId: string | number, isInit?: boolean): void;

  /** Proportionately resizes all columns to fill available horizontal space. This does not take the cell contents into consideration. */
  autosizeColumns(autosizeMode?: string, isInit?: boolean): void;

  /**
   * Returns true if you can click on a given cell and make it the active focus.
   * @param {number} row A row index.
   * @param {number} col A column index.
   */
  canCellBeActive(row: number, col: number): boolean;

  /**
   * Returns true if selecting the row causes this particular cell to have the selectedCellCssClass applied to it. A cell can be selected if it exists and if it isn't on an empty / "Add New" row and if it is not marked as "unselectable" in the column definition.
   * @param {number} row A row index.
   * @param {number} col A column index.
   */
  canCellBeSelected(row: number, col: number): boolean;

  /**
   * Destroy (dispose) of SlickGrid
   * @param {boolean} [shouldDestroyAllElements] - do we want to destroy (nullify) all DOM elements as well? This help in avoiding mem leaks
   */
  destroy(shouldDestroyAllElements?: boolean): void;

  /**
   * Attempts to switch the active cell into edit mode. Will throw an error if the cell is set to be not editable. Uses the specified editor, otherwise defaults to any default editor for that given cell.
   * @param {object} editor - A SlickGrid editor (see examples in slick.editors.js).
   * @param {boolean} [preClickModeOn] - Pre-Click Mode is Enabled?
   * @param {object} [event]
   */
  editActiveCell(editor: Editor | SlickCompositeEditor, preClickModeOn?: boolean, event?: Event): void;

  /**
   * Flashes the cell twice by toggling the CSS class 4 times.
   * @param {number} row A row index.
   * @param {number} cell A column index.
   * @param {number} [speed] (optional) - The milliseconds delay between the toggling calls. Defaults to 100 ms.
   */
  flashCell(row: number, cell: number, speed?: number): void;

  /** Set focus */
  focus(): void;

  /** Get the absolute column minimum width */
  getAbsoluteColumnMinWidth(): number;

  /** Get the canvas DOM element */
  getActiveCanvasNode(event?: Event | SlickGridEventData): HTMLElement;

  /**
   * Returns an object representing the coordinates of the currently active cell:
   * @example	`{ row: activeRow, cell: activeCell }`
   */
  getActiveCell(): { row: number; cell: number; };

  /** Returns the DOM element containing the currently active cell. If no cell is active, null is returned. */
  getActiveCellNode(): HTMLDivElement;

  /** Returns an object representing information about the active cell's position. All coordinates are absolute and take into consideration the visibility and scrolling position of all ancestors. */
  getActiveCellPosition(): ElementPosition;

  /** Get the active Viewport DOM node element */
  getActiveViewportNode(event?: Event | SlickGridEventData): HTMLDivElement;

  /** Get the displayed scrollbar dimensions */
  getDisplayedScrollbarDimensions(): { height: number; width: number; };

  /** Get the canvas DOM element */
  getCanvases(): HTMLDivElement;

  /** Get Grid Canvas Node DOM Element */
  getCanvasNode(): HTMLElement;

  /** Get the grid canvas width */
  getCanvasWidth(): number;

  /**
   * Accepts a key name, returns the group of CSS styles defined under that name. See setCellCssStyles for more info.
   * @param key A string.
   */
  getCellCssStyles(key: string): any;

  /** Returns the active cell editor. If there is no actively edited cell, null is returned.   */
  getCellEditor(): Editor | null;

  /**
   * Returns a hash containing row and cell indexes from a standard W3C event.
   * @param e A standard W3C event.
   */
  getCellFromEvent(e: Event): { cell: number; row: number; } | null;

  /**
   * Returns a hash containing row and cell indexes. Coordinates are relative to the top left corner of the grid beginning with the first row (not including the column headers).
   * @param x An x coordinate.
   * @param y A y coordinate.
   */
  getCellFromPoint(x: number, y: number): { cell: number; row: number; };

  /**
   * Returns a DOM element containing a cell at a given row and cell.
   * @param row A row index.
   * @param cell A column index.
   */
  getCellNode(row: number, cell: number): HTMLDivElement;

  /**
   * Returns an object representing information about a cell's position. All coordinates are absolute and take into consideration the visibility and scrolling position of all ancestors.
   * @param row A row index.
   * @param cell A column index.
   */
  getCellNodeBox(row: number, cell: number): ElementPosition;

  /**
   * Returns the index of a column with a given id. Since columns can be reordered by the user, this can be used to get the column definition independent of the order:
   * @param id A column id.
   */
  getColumnIndex(id: string | number): number;

  /** Returns an array of column definitions, containing the option settings for each individual column. */
  getColumns(): Column[];

  /** Get Grid Canvas Node DOM Element */
  getContainerNode(): HTMLDivElement;

  /** Returns an array of every data object, unless you're using DataView in which case it returns a DataView object. */
  getData<T = SlickDataView>(): T;

  /**
   * Returns the databinding item at a given position.
   * @param index Item row index.
   */
  getDataItem<T = any>(rowIndex: number): T;

  /** Returns the size of the databinding source. */
  getDataLength(): number;

  /** Get Editor lock */
  getEditorLock(): SlickEditorLock;

  /** Get Editor Controller */
  getEditController(): {
    /** Commit Current Editor command */
    commitCurrentEdit(): boolean;

    /** Cancel Current Editor command */
    cancelCurrentEdit(): boolean;
  };

  /** Get the Footer DOM element */
  getFooterRow(): HTMLDivElement;

  /** Get the Footer Row Column DOM element */
  getFooterRowColumn(columnIdOrIdx: string | number): HTMLDivElement;

  /** Get frozen (pinned) row offset */
  getFrozenRowOffset(row: number): number;

  /** Get the Grid Position */
  getGridPosition(): ElementPosition;

  /** Get the Header DOM element */
  getHeader(columnDef: Column): HTMLDivElement;

  /** Get a specific Header Column DOM element */
  getHeaderColumn(columnIdOrIdx: string | number): HTMLDivElement;

  /** Get Header Column Width Difference in pixel */
  getHeaderColumnWidthDiff(): number;

  /** Get the Header Row DOM element */
  getHeaderRow(): HTMLDivElement;

  /** Get Header Row Column DOM element by its column Id */
  getHeaderRowColumn(columnId: string | number): HTMLDivElement;

  /** Get the headers width in pixel */
  getHeadersWidth(): number;

  /** Returns an object containing all of the Grid options set on the grid. See a list of Grid Options here.  */
  getOptions(): GridOption;

  /** Get a Plugin (addon) by its name */
  getPluginByName<T = keyof SlickPluginList>(name: string): T;

  /** Get the Pre-Header Panel DOM node element */
  getPreHeaderPanel(): HTMLDivElement;

  /** Get the Pre-Header Panel Left DOM node element */
  getPreHeaderPanelLeft(): HTMLDivElement;

  /** Get the Pre-Header Panel Right DOM node element */
  getPreHeaderPanelRight(): HTMLDivElement;

  /** Get rendered range */
  getRenderedRange(viewportTop?: number, viewportLeft?: number): { top: number; bottom: number; leftPx: number; rightPx: number; };

  /** Get scrollbar dimensions */
  getScrollbarDimensions(): { height: number; width: number; };

  /** Returns an array of row indices corresponding to the currently selected rows. */
  getSelectedRows(): number[];

  /** Returns the current SelectionModel. See here for more information about SelectionModels. */
  getSelectionModel<T = SlickCellSelectionModel | SlickRowSelectionModel>(): T | undefined;

  /** Get sorted columns **/
  getSortColumns(): ColumnSort[];

  /** Get Top Panel DOM element */
  getTopPanel(): HTMLDivElement;

  /** Get Top Panels (left/right) DOM element */
  getTopPanels(): [HTMLDivElement, HTMLDivElement];

  /** Get grid unique identifier */
  getUID(): string;

  /** Get Viewport position */
  getViewport(viewportTop?: number, viewportLeft?: number): { top: number; bottom: number; leftPx: number; rightPx: number; };

  /** Get the Viewport DOM node element */
  getViewportNode(): HTMLDivElement;

  /** Get all the Viewport node elements */
  getViewports(): HTMLDivElement[];

  /**
   * Accepts a row integer and a cell integer, scrolling the view to the row where row is its row index, and cell is its cell index. Optionally accepts a forceEdit boolean which, if true, will attempt to initiate the edit dialogue for the field in the specified cell.
   * Unlike setActiveCell, this scrolls the row into the viewport and sets the keyboard focus.
   * @param row A row index.
   * @param cell A column index.
   * @param forceEdit If true, will attempt to initiate the edit dialogue for the field in the specified cell.
   */
  gotoCell(row: number, cell: number, forceEdit?: boolean): void;

  /** Initializes the grid. Called after plugins are registered. Normally, this is called by the constructor, so you don't need to call it. However, in certain cases you may need to delay the initialization until some other process has finished. In that case, set the explicitInitialization option to true and call the grid.init() manually. */
  init(): void;

  /** Invalidate all rows and re-render the grid rows */
  invalidate(): void;

  /** Invalidate all rows */
  invalidateAllRows(): void;

  /** Invalidate a specific row number */
  invalidateRow(row: number): void;

  /** Invalidate a specific set of row numbers */
  invalidateRows(rows: number[]): void;

  /** Navigate to the bottom of the grid */
  navigateBottom(): void;

  /** Switches the active cell one row down skipping unselectable cells. Returns a boolean saying whether it was able to complete or not. */
  navigateDown(): boolean;

  /** Switches the active cell one cell left skipping unselectable cells. Unline navigatePrev, navigateLeft stops at the first cell of the row. Returns a boolean saying whether it was able to complete or not. */
  navigateLeft(): boolean;

  /** Tabs over active cell to the next selectable cell. Returns a boolean saying whether it was able to complete or not. */
  navigateNext(): boolean;

  /** Navigate (scroll) by a page up */
  navigatePageUp(): void;

  /** Navigate (scroll) by a page down */
  navigatePageDown(): void;

  /**  Tabs over active cell to the previous selectable cell. Returns a boolean saying whether it was able to complete or not. */
  navigatePrev(): boolean;

  /** Switches the active cell one cell right skipping unselectable cells. Unline navigateNext, navigateRight stops at the last cell of the row. Returns a boolean saying whether it was able to complete or not. */
  navigateRight(): boolean;

  /** Navigate to the start row in the grid */
  navigateRowStart(): boolean;

  /** Navigate to the end row in the grid */
  navigateRowEnd(): boolean;

  /** Navigate to the top of the grid */
  navigateTop(): void;

  /** Switches the active cell one row up skipping unselectable cells. Returns a boolean saying whether it was able to complete or not. */
  navigateUp(): boolean;

  /** (re)Render the grid */
  render(): void;

  /** Register an external Plugin (addon) */
  registerPlugin<T = SlickPluginList>(plugin: T): void;

  /**
   * Removes an "overlay" of CSS classes from cell DOM elements. See setCellCssStyles for more.
   * @param key A string key.
   */
  removeCellCssStyles(key: string): void;

  /**
   * Apply Columns Widths in the UI and optionally invalidate & re-render the columns when specified
   * @param {Boolean} shouldReRender - should we invalidate and re-render the grid?
   */
  reRenderColumns(shouldReRender?: boolean): void;

  /** Resets active cell. */
  resetActiveCell(): void;

  /** Execute a Resize of the Canvas */
  resizeCanvas(): void;

  /** Scroll to a specific cell and make it into the view */
  scrollCellIntoView(row: number, cell: number, doPaging?: boolean): void;

  /** Scroll to a specific column and show it into the viewport */
  scrollColumnIntoView(cell: number): void;

  /** Scroll to a specific row and make it into the view */
  scrollRowIntoView(row: number, doPaging?: boolean): void;

  /** Scroll to the top row and make it into the view */
  scrollRowToTop(row: number): void;

  /** Scroll to an Y position in the grid */
  scrollTo(yPos: number): void;

  /**
   * Sets an active cell.
   * @param {number} row - A row index.
   * @param {number} cell - A column index.
   * @param {boolean} optionEditMode Option Edit Mode is Auto-Edit?
   * @param {boolean} preClickModeOn Pre-Click Mode is Enabled?
   * @param {boolean} suppressActiveCellChangedEvent Are we suppressing Active Cell Changed Event (defaults to false)
   */
  setActiveCell(row: number, cell: number, optionEditMode?: boolean, preClickModeOn?: boolean, suppressActiveCellChangedEvent?: boolean): void;

  /**
   * Sets an active cell.
   * @param {number} row - A row index.
   * @param {number} cell - A column index.
   * @param {boolean} suppressScrollIntoView - optionally suppress the ScrollIntoView that happens by default (defaults to false)
   */
  setActiveRow(row: number, cell?: number, suppressScrollIntoView?: boolean): void;

  /** Sets an active viewport node */
  setActiveViewportNode(element: HTMLDivElement): void;

  /**
   * Sets CSS classes to specific grid cells by calling removeCellCssStyles(key) followed by addCellCssStyles(key, hash). key is name for this set of styles so you can reference it later - to modify it or remove it, for example. hash is a per-row-index, per-column-name nested hash of CSS classes to apply.
   * Suppose you have a grid with columns:
   * ["login", "name", "birthday", "age", "likes_icecream", "favorite_cake"]
   * ...and you'd like to highlight the "birthday" and "age" columns for people whose birthday is today, in this case, rows at index 0 and 9. (The first and tenth row in the grid).
   * @param key A string key. Will overwrite any data already associated with this key.
   * @param hash A hash of additional cell CSS classes keyed by row number and then by column id. Multiple CSS classes can be specified and separated by space.
   */
  setCellCssStyles(key: string, hash: any): void;

  /** Set the Column Header Visibility and optionally enable/disable animation (enabled by default) */
  setColumnHeaderVisibility(visible: boolean, animate?: boolean): void;

  /**
   * Sets grid columns. Column headers will be recreated and all rendered rows will be removed. To rerender the grid (if necessary), call render().
   * @param columnDefinitions An array of column definitions.
   */
  setColumns(columnDefinitions: Column[]): void;

  /**
   * Sets a new source for databinding and removes all rendered rows. Note that this doesn't render the new rows - you can follow it with a call to render() to do that.
   * @param newData New databinding source using a regular JavaScript array.. or a custom object exposing getItem(index) and getLength() functions.
   * @param scrollToTop If true, the grid will reset the vertical scroll position to the top of the grid.
   */
  setData<T = any>(newData: T | T[], scrollToTop?: boolean): void;

  /** Set the Footer Visibility and optionally enable/disable animation (enabled by default) */
  setFooterRowVisibility(visible: boolean, animate?: boolean): void;

  /** Set the Header Row Visibility and optionally enable/disable animation (enabled by default) */
  setHeaderRowVisibility(visible: boolean, animate?: boolean): void;

  /**
   * Extends grid options with a given hash. If an there is an active edit, the grid will attempt to commit the changes and only continue if the attempt succeeds.
   * @param {Object} options - an object with configuration options.
   * @param {Boolean} suppressRender - do we want to supress the grid re-rendering? (defaults to false)
   * @param {Boolean} suppressColumnSet - do we want to supress the columns set, via "setColumns()" method? (defaults to false)
   * @param {Boolean} suppressSetOverflow - do we want to suppress the call to `setOverflow`
   */
  setOptions(options: GridOption, suppressRender?: boolean, suppressColumnSet?: boolean, suppressSetOverflow?: boolean): void;

  /** Set the Pre-Header Visibility and optionally enable/disable animation (enabled by default) */
  setPreHeaderPanelVisibility(visible: boolean, animate?: boolean): void;

  /**
   * Accepts an array of row indices and applies the current selectedCellCssClass to the cells in the row, respecting whether cells have been flagged as selectable.
   * @param {Array<number>} rowsArray - an array of row numbers.
   * @param {String} caller - an optional string to identify who called the method
   */
  setSelectedRows(rowsArray: number[], caller?: string): void;

  /**
   * Unregisters a current selection model and registers a new one. See the definition of SelectionModel for more information.
   * @selectionModel A SelectionModel.
   */
  setSelectionModel(selectionModel: SlickCellSelectionModel | SlickRowSelectionModel): void;

  /**
   * Accepts a columnId string and an ascending boolean. Applies a sort glyph in either ascending or descending form to the header of the column. Note that this does not actually sort the column. It only adds the sort glyph to the header.
   * @param columnId
   * @param ascending
   */
  setSortColumn(columnId: string | number, ascending: boolean): void;

  /**
   * Accepts an array of objects in the form [ { columnId: [string], sortAsc: [boolean] }, ... ]. When called, this will apply a sort glyph in either ascending or descending form to the header of each column specified in the array. Note that this does not actually sort the column. It only adds the sort glyph to the header
   * @param cols
   */
  setSortColumns(cols: Array<{ columnId: string | number; sortAsc: boolean; }>): void;

  /** Set the Top Panel Visibility and optionally enable/disable animation (enabled by default) */
  setTopPanelVisibility(visible: boolean, animate?: boolean): void;

  /** Unregister an external Plugin (addon) */
  unregisterPlugin(plugin: SlickPluginList): void;

  /** Update a specific cell by its row and column index */
  updateCell(row: number, cell: number): void;

  /**
   * Updates an existing column definition and a corresponding header DOM element with the new title and tooltip.
   * @param columnId Column id.
   * @param title New column name.
   * @param toolTip New column tooltip.
   */
  updateColumnHeader(columnId: string | number, title?: string, toolTip?: string): void;

  /** Update columns for when a hidden property has changed but the column list itself has not changed. */
  updateColumns(): void;

  /** Update paging information status from the View */
  updatePagingStatusFromView(pagingInfo: PagingInfo): void;

  /** Update a specific row by its row index */
  updateRow(row: number): void;

  /** Update the dataset row count */
  updateRowCount(): void;

  // -----------------------------
  // Available Slick Grid Events
  // -----------------------------

  onActiveCellChanged: SlickEvent<OnActiveCellChangedEventArgs>;
  onActiveCellPositionChanged: SlickEvent<SlickGridEventData>;
  onAddNewRow: SlickEvent<OnAddNewRowEventArgs>;
  onAutosizeColumns: SlickEvent<OnAutosizeColumnsEventArgs>;
  onBeforeAppendCell: SlickEvent<OnBeforeAppendCellEventArgs>;
  onBeforeCellEditorDestroy: SlickEvent<OnBeforeCellEditorDestroyEventArgs>;
  onBeforeColumnsResize: SlickEvent<OnBeforeColumnsResizeEventArgs>;
  onBeforeDestroy: SlickEvent<SlickGridEventData>;
  onBeforeEditCell: SlickEvent<OnBeforeEditCellEventArgs>;
  onBeforeHeaderCellDestroy: SlickEvent<OnBeforeHeaderCellDestroyEventArgs>;
  onBeforeHeaderRowCellDestroy: SlickEvent<OnBeforeHeaderRowCellDestroyEventArgs>;
  onBeforeFooterRowCellDestroy: SlickEvent<OnBeforeFooterRowCellDestroyEventArgs>;
  onBeforeSetColumns: SlickEvent<OnBeforeSetColumnsEventArgs>;
  onBeforeSort: SlickEvent<SingleColumnSort | MultiColumnSort>;
  onCellChange: SlickEvent<OnCellChangeEventArgs>;
  onCellCssStylesChanged: SlickEvent<OnCellCssStylesChangedEventArgs>;
  onClick: SlickEvent<OnClickEventArgs>;
  onColumnsDrag: SlickEvent<OnColumnsDragEventArgs>;
  onColumnsReordered: SlickEvent<OnColumnsReorderedEventArgs>;
  onColumnsResized: SlickEvent<OnColumnsResizedEventArgs>;
  onColumnsResizeDblClick: SlickEvent<OnColumnsResizeDblClickEventArgs>;
  onCompositeEditorChange: SlickEvent<OnCompositeEditorChangeEventArgs>;
  onContextMenu: SlickEvent<SlickGridEventData>;
  onDrag: SlickEvent<DragRowMove>;
  onDragEnd: SlickEvent<DragRowMove>;
  onDragInit: SlickEvent<DragRowMove>;
  onDragStart: SlickEvent<DragRowMove>;
  onDblClick: SlickEvent<OnDblClickEventArgs>;
  onFooterContextMenu: SlickEvent<OnFooterContextMenuEventArgs>;
  onFooterRowCellRendered: SlickEvent<OnFooterRowCellRenderedEventArgs>;
  onHeaderCellRendered: SlickEvent<OnHeaderCellRenderedEventArgs>;
  onFooterClick: SlickEvent<OnFooterClickEventArgs>;
  onHeaderClick: SlickEvent<OnHeaderClickEventArgs>;
  onHeaderContextMenu: SlickEvent<OnHeaderContextMenuEventArgs>;
  onHeaderMouseEnter: SlickEvent<OnHeaderMouseEventArgs>;
  onHeaderMouseLeave: SlickEvent<OnHeaderMouseEventArgs>;
  onHeaderRowCellRendered: SlickEvent<OnHeaderRowCellRenderedEventArgs>;
  onHeaderRowMouseEnter: SlickEvent<OnHeaderMouseEventArgs>;
  onHeaderRowMouseLeave: SlickEvent<OnHeaderMouseEventArgs>;
  onKeyDown: SlickEvent<OnKeyDownEventArgs>;
  onMouseEnter: SlickEvent<SlickGridEventData>;
  onMouseLeave: SlickEvent<SlickGridEventData>;
  onValidationError: SlickEvent<OnValidationErrorEventArgs>;
  onViewportChanged: SlickEvent<SlickGridEventData>;
  onRendered: SlickEvent<OnRenderedEventArgs>;
  onSelectedRowsChanged: SlickEvent<OnSelectedRowsChangedEventArgs>;
  onSetOptions: SlickEvent<OnSetOptionsEventArgs>;
  onScroll: SlickEvent<OnScrollEventArgs>;
  onSort: SlickEvent<SingleColumnSort | MultiColumnSort>;
}

export interface SlickGridEventData { grid: SlickGrid; }
export interface OnActiveCellChangedEventArgs extends SlickGridEventData { cell: number; row: number; }
export interface OnAddNewRowEventArgs extends SlickGridEventData { item: any; column: Column; }
export interface OnAutosizeColumnsEventArgs extends SlickGridEventData { columns: Column[]; }
export interface OnBeforeAppendCellEventArgs extends SlickGridEventData { row: number; cell: number; value: any; dataContext: any; }
export interface OnBeforeCellEditorDestroyEventArgs extends SlickGridEventData { editor: Editor; }
export interface OnBeforeColumnsResizeEventArgs extends SlickGridEventData { triggeredByColumn: string; }
export interface OnBeforeEditCellEventArgs extends SlickGridEventData { row: number; cell: number; item: any; column: Column; target?: 'grid' | 'composite'; compositeEditorOptions?: CompositeEditorOption; }
export interface OnBeforeHeaderCellDestroyEventArgs extends SlickGridEventData { node: HTMLElement; column: Column; }
export interface OnBeforeHeaderRowCellDestroyEventArgs extends SlickGridEventData { node: HTMLElement; column: Column; }
export interface OnBeforeFooterRowCellDestroyEventArgs extends SlickGridEventData { node: HTMLElement; column: Column; }
export interface OnBeforeSetColumnsEventArgs extends SlickGridEventData { previousColumns: Column[]; newColumns: Column[]; }
export interface OnCellChangeEventArgs extends SlickGridEventData { row: number; cell: number; item: any; column: Column; }
export interface OnCellCssStylesChangedEventArgs extends SlickGridEventData { key: string; hash: string; }
export interface OnColumnsDragEventArgs extends SlickGridEventData { triggeredByColumn: string; resizeHandle: HTMLDivElement; }
export interface OnColumnsReorderedEventArgs extends SlickGridEventData { impactedColumns: Column[]; }
export interface OnColumnsResizedEventArgs extends SlickGridEventData { triggeredByColumn: string; }
export interface OnColumnsResizeDblClickEventArgs extends SlickGridEventData { triggeredByColumn: string; }
export interface OnCompositeEditorChangeEventArgs extends SlickGridEventData { row: number; cell: number; item: any; column: Column; formValues: any; editors: { [columnId: string]: Editor; }; triggeredBy?: 'user' | 'system'; }
export interface OnClickEventArgs extends SlickGridEventData { row: number; cell: number; }
export interface OnDblClickEventArgs extends SlickGridEventData { row: number; cell: number; }
export interface OnFooterContextMenuEventArgs extends SlickGridEventData { column: Column; }
export interface OnFooterRowCellRenderedEventArgs extends SlickGridEventData { node: HTMLDivElement; column: Column; }
export interface OnHeaderCellRenderedEventArgs extends SlickGridEventData { node: HTMLDivElement; column: Column; }
export interface OnFooterClickEventArgs extends SlickGridEventData { column: Column; }
export interface OnHeaderClickEventArgs extends SlickGridEventData { column: Column; }
export interface OnHeaderContextMenuEventArgs extends SlickGridEventData { column: Column; }
export interface OnHeaderMouseEventArgs extends SlickGridEventData { column: Column; }
export interface OnHeaderRowCellRenderedEventArgs extends SlickGridEventData { node: HTMLDivElement; column: Column; }
export interface OnKeyDownEventArgs extends SlickGridEventData { row: number; cell: number; }
export interface OnValidationErrorEventArgs extends SlickGridEventData { row: number; cell: number; validationResults: EditorValidationResult; column: Column; editor: Editor; cellNode: HTMLDivElement; }
export interface OnRenderedEventArgs extends SlickGridEventData { startRow: number; endRow: number; }
export interface OnSelectedRowsChangedEventArgs extends SlickGridEventData { rows: number[]; previousSelectedRows: number[]; changedSelectedRows: number[]; changedUnselectedRows: number[]; caller: string; }
export interface OnSetOptionsEventArgs extends SlickGridEventData { optionsBefore: GridOption; optionsAfter: GridOption; }

export interface OnScrollEventArgs extends SlickGridEventData { scrollLeft: number; scrollTop: number; }
export interface OnDragEventArgs extends SlickGridEventData {
  count: number; deltaX: number; deltaY: number; offsetX: number; offsetY: number; originalX: number; originalY: number;
  available: HTMLDivElement | HTMLDivElement[]; drag: HTMLDivElement; drop: HTMLDivElement | HTMLDivElement[]; helper: HTMLDivElement;
  proxy: HTMLDivElement; target: HTMLDivElement; mode: string;
  row: number; rows: number[]; startX: number; startY: number;
}
