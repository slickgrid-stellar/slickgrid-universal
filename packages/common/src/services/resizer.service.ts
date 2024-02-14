import type { BasePubSubService, EventSubscription } from '@slickgrid-universal/event-pub-sub';

import { FieldType, } from '../enums/index';
import type {
  AutoResizeOption,
  Column,
  GridOption,
  GridSize,
  ResizeByContentOption,
  SlickDataView,
  SlickEventHandler,
  SlickGrid,
  SlickNamespace,
} from '../interfaces/index';
import { BindingEventService, getInnerSize, getHtmlElementOffset, sanitizeHtmlToText, } from '../services/index';
import { parseFormatterWhenExist } from '../formatters/formatterUtilities';

// using external non-typed js libraries
declare const Slick: SlickNamespace;
const DATAGRID_BOTTOM_PADDING = 20;
const DATAGRID_FOOTER_HEIGHT = 25;
const DATAGRID_PAGINATION_HEIGHT = 35;
const DATAGRID_MIN_HEIGHT = 180;
const DATAGRID_MIN_WIDTH = 300;
const DEFAULT_INTERVAL_RETRY_DELAY = 200;

export class ResizerService {
  protected _autoResizeOptions!: AutoResizeOption;
  protected _bindingEventService: BindingEventService;
  protected _grid!: SlickGrid;
  protected _eventHandler: SlickEventHandler;
  protected _fixedHeight?: number | string;
  protected _fixedWidth?: number | string;
  protected _gridDomElm!: HTMLElement;
  protected _gridContainerElm!: HTMLElement;
  protected _pageContainerElm!: HTMLElement;
  protected _intervalId!: NodeJS.Timeout;
  protected _intervalRetryDelay = DEFAULT_INTERVAL_RETRY_DELAY;
  protected _isStopResizeIntervalRequested = false;
  protected _hasResizedByContentAtLeastOnce = false;
  protected _lastDimensions?: GridSize;
  protected _totalColumnsWidthByContent = 0;
  protected _timer!: NodeJS.Timeout;
  protected _resizePaused = false;
  protected _resizeObserver!: ResizeObserver;
  protected _subscriptions: EventSubscription[] = [];

  get eventHandler(): SlickEventHandler {
    return this._eventHandler;
  }

  /** Getter for the Grid Options pulled through the Grid Object */
  get gridOptions(): GridOption {
    return this._grid?.getOptions?.() ?? {};
  }

  /** Getter for the SlickGrid DataView */
  get dataView(): SlickDataView {
    return this._grid?.getData() as SlickDataView;
  }

  /** Getter for the grid uid */
  get gridUid(): string {
    return this._grid?.getUID() ?? '';
  }
  get gridUidSelector(): string {
    return this.gridUid ? `.${this.gridUid}` : '';
  }

  get intervalRetryDelay(): number {
    return this._intervalRetryDelay;
  }
  set intervalRetryDelay(delay: number) {
    this._intervalRetryDelay = delay;
  }

  get resizeByContentOptions(): ResizeByContentOption {
    return this.gridOptions?.resizeByContentOptions ?? {};
  }

  constructor(protected readonly pubSubService: BasePubSubService) {
    this._eventHandler = new Slick.EventHandler();
    this._bindingEventService = new BindingEventService();
  }

  /** Dispose function when service is destroyed */
  dispose() {
    // unsubscribe all SlickGrid events
    this._eventHandler?.unsubscribeAll();
    this.pubSubService.unsubscribeAll(this._subscriptions);
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }
    clearTimeout(this._timer);

    if (this.gridOptions.autoResize?.resizeDetection === 'container' && this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    this._bindingEventService.unbindAll();
  }

  init(grid: SlickGrid, gridParentContainerElm: HTMLElement) {
    if (!grid || !this.gridOptions || !gridParentContainerElm) {
      throw new Error(`
      [Slickgrid-Universal] Resizer Service requires a valid Grid object and DOM Element Container to be provided.
      You can fix this by setting your gridOption to use "enableAutoResize" or create an instance of the ResizerService by calling bindAutoResizeDataGrid() once.`);
    }

    this._grid = grid;
    this._gridContainerElm = gridParentContainerElm;
    const fixedGridSizes = (this.gridOptions?.gridHeight || this.gridOptions?.gridWidth) ? { height: this.gridOptions?.gridHeight, width: this.gridOptions?.gridWidth } : undefined;
    this._autoResizeOptions = this.gridOptions?.autoResize ?? { container: 'grid1', bottomPadding: 0 };

    if (fixedGridSizes?.width && gridParentContainerElm?.style) {
      gridParentContainerElm.style.width = typeof fixedGridSizes.width === 'string' ? fixedGridSizes.width : `${fixedGridSizes.width}px`;
    }

    this._gridDomElm = grid?.getContainerNode?.() as HTMLDivElement;

    if (typeof this._autoResizeOptions.container === 'string') {
      this._pageContainerElm = typeof this._autoResizeOptions.container === 'string' ? document.querySelector(this._autoResizeOptions.container) as HTMLElement : this._autoResizeOptions.container;
    } else {
      this._pageContainerElm = this._autoResizeOptions.container!;
    }


    if (fixedGridSizes) {
      this._fixedHeight = fixedGridSizes.height;
      this._fixedWidth = fixedGridSizes.width;
    }

    if (this.gridOptions && this.gridOptions.enableAutoResize) {
      this.bindAutoResizeDataGrid();
    }

    // Events
    if (this.gridOptions.autoResize) {
      // resize by content could be called from the outside by other services via pub/sub event
      this._subscriptions.push(
        this.pubSubService.subscribe('onFullResizeByContentRequested', () => this.resizeColumnsByCellContent(true))
      );
    }

    // on double-click resize, should we resize the cell by its cell content?
    // the same action can be called from a double-click and/or from column header menu
    if (this.gridOptions?.enableColumnResizeOnDoubleClick) {
      this._subscriptions.push(
        this.pubSubService.subscribe('onHeaderMenuColumnResizeByContent', (data => {
          this.handleSingleColumnResizeByContent(data.columnId);
        }))
      );

      this._eventHandler.subscribe(this._grid.onColumnsResizeDblClick, (_e, args) => {
        this.handleSingleColumnResizeByContent(args.triggeredByColumn);
      });
    }
  }

  /** Bind an auto resize trigger on the datagrid, if that is enable then it will resize itself to the available space
   * Options: we could also provide a % factor to resize on each height/width independently
   */
  bindAutoResizeDataGrid(newSizes?: GridSize): null | void {
    if (this.gridOptions.autoResize?.resizeDetection === 'container') {
      if (!this._pageContainerElm || !this._pageContainerElm) {
        throw new Error(`
          [Slickgrid-Universal] Resizer Service requires a container when gridOption.autoResize.resizeDetection="container"
          You can fix this by setting your gridOption.autoResize.container`);
      }
      if (!this._resizeObserver) {
        this._resizeObserver = new ResizeObserver(() => this.resizeObserverCallback());
      }
      this._resizeObserver.observe(this._pageContainerElm);
    } else {
      // if we can't find the grid to resize, return without binding anything
      if (this._gridDomElm === undefined || getHtmlElementOffset(this._gridDomElm) === undefined) {
        return null;
      }

      // -- 1st resize the datagrid size at first load (we need this because the .on event is not triggered on first load)
      this.resizeGrid()
        .then(() => this.resizeGridWhenStylingIsBrokenUntilCorrected())
        .catch((rejection: any) => console.log('Error:', rejection));

      // -- do a 2nd resize with a slight delay (in ms) so that we resize after the grid render is done
      this.resizeGrid(10, newSizes);

      // -- 2nd bind a trigger on the Window DOM element, so that it happens also when resizing after first load
      // -- bind auto-resize to Window object only if it exist
      this._bindingEventService.bind(window, 'resize', this.handleResizeGrid.bind(this, newSizes));
    }
  }

  handleResizeGrid(newSizes?: GridSize) {
    this.pubSubService.publish('onGridBeforeResize');
    if (!this._resizePaused) {
      // for some yet unknown reason, calling the resize twice removes any stuttering/flickering
      // when changing the height and makes it much smoother experience
      this.resizeGrid(0, newSizes);
      this.resizeGrid(0, newSizes);
    }
  }

  resizeObserverCallback(): void {
    if (!this._resizePaused) {
      this.resizeGrid();
    }
  }

  /**
   * Calculate the datagrid new height/width from the available space, also consider that a % factor might be applied to calculation
   * object gridOptions
   */
  calculateGridNewDimensions(gridOptions: GridOption): GridSize | null {
    const autoResizeOptions = gridOptions?.autoResize ?? {};
    const gridElmOffset = getHtmlElementOffset(this._gridDomElm);

    if (!window || gridElmOffset === undefined) {
      return null;
    }

    // calculate bottom padding
    // if using pagination, we need to add the pagination height to this bottom padding
    let bottomPadding = (autoResizeOptions?.bottomPadding !== undefined) ? autoResizeOptions.bottomPadding : DATAGRID_BOTTOM_PADDING;
    if (bottomPadding && gridOptions.enablePagination) {
      bottomPadding += DATAGRID_PAGINATION_HEIGHT;
    }

    // optionally show a custom footer with the data metrics(dataset length and last updated timestamp)
    if (bottomPadding && gridOptions.showCustomFooter) {
      const footerHeight: string | number = this.gridOptions?.customFooterOptions?.footerHeight ?? DATAGRID_FOOTER_HEIGHT;
      bottomPadding += parseInt(`${footerHeight}`, 10);
    }

    let gridHeight = 0;
    let gridOffsetTop = 0;

    // which DOM element are we using to calculate the available size for the grid?
    if (autoResizeOptions.calculateAvailableSizeBy === 'container') {
      // uses the container's height to calculate grid height without any top offset
      gridHeight = getInnerSize(this._pageContainerElm, 'height') || 0;
    } else {
      // uses the browser's window height with its top offset to calculate grid height
      gridHeight = window.innerHeight || 0;
      gridOffsetTop = gridElmOffset?.top ?? 0;
    }

    const availableHeight = gridHeight - gridOffsetTop - bottomPadding;
    const availableWidth = getInnerSize(this._pageContainerElm, 'width') || window.innerWidth || 0;
    const maxHeight = autoResizeOptions?.maxHeight;
    const minHeight = autoResizeOptions?.minHeight ?? DATAGRID_MIN_HEIGHT;
    const maxWidth = autoResizeOptions?.maxWidth;
    const minWidth = autoResizeOptions?.minWidth ?? DATAGRID_MIN_WIDTH;

    let newHeight = availableHeight;
    let newWidth = (autoResizeOptions?.rightPadding) ? availableWidth - autoResizeOptions.rightPadding : availableWidth;

    // optionally (when defined), make sure that grid height & width are within their thresholds
    if (newHeight < minHeight) {
      newHeight = minHeight;
    }
    if (maxHeight && newHeight > maxHeight) {
      newHeight = maxHeight;
    }
    if (newWidth < minWidth) {
      newWidth = minWidth;
    }
    if (maxWidth && newWidth > maxWidth) {
      newWidth = maxWidth;
    }

    // return the new dimensions unless a fixed height/width was defined
    return {
      height: this._fixedHeight || newHeight,
      width: this._fixedWidth || newWidth
    };
  }

  /**
   * Return the last resize dimensions used by the service
   * @return {object} last dimensions (height, width)
   */
  getLastResizeDimensions(): GridSize | undefined {
    return this._lastDimensions;
  }

  /**
   * Provide the possibility to pause the resizer for some time, until user decides to re-enabled it later if he wish to.
   * @param {boolean} isResizePaused are we pausing the resizer?
   */
  pauseResizer(isResizePaused: boolean) {
    this._resizePaused = isResizePaused;
  }

  /**
   * Resize the datagrid to fit the browser height & width.
   * @param {number} delay to wait before resizing, defaults to 0 (in milliseconds)
   * @param {object} newSizes can optionally be passed (height, width)
   * @param {object} event that triggered the resize, defaults to null
   * @return If the browser supports it, we can return a Promise that would resolve with the new dimensions
   */
  resizeGrid(delay?: number, newSizes?: GridSize): Promise<GridSize | undefined> {
    return new Promise(resolve => {
      // because of the javascript async nature, we might want to delay the resize a little bit
      delay = delay || 0;

      if (delay > 0) {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => resolve(this.resizeGridCallback(newSizes)), delay);
      } else {
        resolve(this.resizeGridCallback(newSizes));
      }
    });
  }

  resizeGridCallback(newSizes?: GridSize): GridSize | undefined {
    const dimensions = this.resizeGridWithDimensions(newSizes);
    this.pubSubService.publish('onGridAfterResize', dimensions);

    // we can call our resize by content here (when enabled)
    // since the core Slick.Resizer plugin only supports the "autosizeColumns"
    if (this.gridOptions.enableAutoResizeColumnsByCellContent && (!this._lastDimensions?.width || dimensions?.width !== this._lastDimensions?.width)) {
      this.resizeColumnsByCellContent(false);
    }
    this._lastDimensions = dimensions;

    return dimensions;
  }

  resizeGridWithDimensions(newSizes?: GridSize): GridSize | undefined {
    // calculate the available sizes with minimum height defined as a constant
    const availableDimensions = this.calculateGridNewDimensions(this.gridOptions);

    if ((newSizes || availableDimensions) && this._gridDomElm) {
      // get the new sizes, if new sizes are passed (not 0), we will use them else use available space
      // basically if user passes 1 of the dimension, let say he passes just the height,
      // we will use the height as a fixed height but the width will be resized by it's available space
      const newHeight = (newSizes?.height) ? newSizes.height : availableDimensions?.height;
      const newWidth = (newSizes?.width) ? newSizes.width : availableDimensions?.width;

      // apply these new height/width to the datagrid
      if (!this.gridOptions.autoHeight) {
        this._gridDomElm.style.height = `${newHeight}px`;
      }
      this._gridDomElm.style.width = `${newWidth}px`;
      if (this._gridContainerElm) {
        this._gridContainerElm.style.width = `${newWidth}px`;
      }

      // resize the slickgrid canvas on all browser
      if (this._grid?.resizeCanvas && this._gridContainerElm) {
        this._grid.resizeCanvas();
      }

      // also call the grid auto-size columns so that it takes available space when going bigger
      if (this.gridOptions?.enableAutoSizeColumns && this._grid.autosizeColumns) {
        // make sure that the grid still exist (by looking if the Grid UID is found in the DOM tree) to avoid SlickGrid error "missing stylesheet"
        if (this.gridUid && document.querySelector(this.gridUidSelector)) {
          this._grid.autosizeColumns();
        }
      } else if (this.gridOptions.enableAutoResizeColumnsByCellContent && (!this._lastDimensions?.width || newWidth !== this._lastDimensions?.width)) {
        // we can call our resize by content here (when enabled)
        // since the core Slick.Resizer plugin only supports the "autosizeColumns"
        this.resizeColumnsByCellContent(false);
      }

      // keep last resized dimensions & resolve them to the Promise
      this._lastDimensions = {
        height: newHeight || 0,
        width: newWidth || 0
      };
    }

    return this._lastDimensions;
  }

  requestStopOfAutoFixResizeGrid(isStopRequired = true) {
    this._isStopResizeIntervalRequested = isStopRequired;
  }

  /**
   * Resize each column width by their cell text/value content (this could potentially go wider than the viewport and end up showing an horizontal scroll).
   * This operation requires to loop through each dataset item to inspect each cell content width and has a performance cost associated to this process.
   *
   * NOTE: please that for performance reasons we will only inspect the first 1000 rows,
   * however user could override it by using the grid option `resizeMaxItemToInspectCellContentWidth` to increase/decrease how many items to inspect.
   * @param {Boolean} recalculateColumnsTotalWidth - defaults to false, do we want to recalculate the necessary total columns width even if it was already calculated?
   */
  resizeColumnsByCellContent(recalculateColumnsTotalWidth = false) {
    const columnDefinitions = this._grid.getColumns();
    const dataset = this.dataView.getItems() as any[];
    const columnWidths: { [columnId in string | number]: number; } = {};
    let reRender = false;
    let readItemCount = 0;
    const viewportWidth = this._gridContainerElm?.offsetWidth ?? 0;

    // if our columns total width is smaller than the grid viewport, we can call the column autosize directly without the need to recalculate all column widths
    if ((!Array.isArray(dataset) || dataset.length === 0) || (!recalculateColumnsTotalWidth && this._totalColumnsWidthByContent > 0 && this._totalColumnsWidthByContent < viewportWidth)) {
      this._grid.autosizeColumns();
      return;
    }

    if ((this._hasResizedByContentAtLeastOnce && this.gridOptions?.resizeByContentOnlyOnFirstLoad && !recalculateColumnsTotalWidth)) {
      return;
    }

    this.pubSubService.publish('onBeforeResizeByContent', undefined, 0);

    // calculate total width necessary by each cell content
    // we won't re-evaluate if we already had calculated the total
    if (this._totalColumnsWidthByContent === 0 || recalculateColumnsTotalWidth) {
      // loop through all columns to get their minWidth or width for later usage
      for (const columnDef of columnDefinitions) {
        columnWidths[columnDef.id] = columnDef.originalWidth ?? columnDef.minWidth ?? 0;
      }

      // calculate cell width by reading all data from dataset and also parse through any Formatter(s) when exist
      readItemCount = this.calculateCellWidthByReadingDataset(columnDefinitions, columnWidths, this.resizeByContentOptions.maxItemToInspectCellContentWidth);

      // finally loop through all column definitions one last time to apply new calculated `width` on each elligible column
      let totalColsWidth = 0;
      for (const column of columnDefinitions) {
        const resizeAlwaysRecalculateWidth = column.resizeAlwaysRecalculateWidth ?? this.resizeByContentOptions.alwaysRecalculateColumnWidth ?? false;

        if (column.originalWidth && !resizeAlwaysRecalculateWidth) {
          column.width = column.originalWidth;
        } else if (columnWidths[column.id] !== undefined) {
          if (column.rerenderOnResize) {
            reRender = true;
          }

          // let's start with column width found in previous column & data analysis
          this.applyNewCalculatedColumnWidthByReference(column, columnWidths[column.id]);
        }

        // add the new column width to the total width which we'll use later to compare against viewport width
        totalColsWidth += column.width || 0;
        this._totalColumnsWidthByContent = totalColsWidth;
      }
    }

    // send updated column definitions widths to SlickGrid
    this._grid.setColumns(columnDefinitions);
    this._hasResizedByContentAtLeastOnce = true;

    const calculateColumnWidths: { [columnId in string | number]: number | undefined; } = {};
    for (const columnDef of columnDefinitions) {
      calculateColumnWidths[columnDef.id] = columnDef.width;
    }

    // get the grid container viewport width and if our viewport calculated total columns is greater than the viewport width
    // then we'll call reRenderColumns() when getting wider than viewport or else the default autosizeColumns() when we know we have plenty of space to shrink the columns
    this._totalColumnsWidthByContent > viewportWidth ? this._grid.reRenderColumns(reRender) : this._grid.autosizeColumns();
    this.pubSubService.publish('onAfterResizeByContent', { readItemCount, calculateColumnWidths });
  }

  // --
  // protected functions
  // ------------------

  /**
   * Step 1 - The first step will read through the entire dataset (unless max item count is reached),
   * it will analyze each cell of the grid and calculate its max width via its content and column definition info (it will do so by calling step 2 method while looping through each cell).
   * @param columnOrColumns - single or array of column definition(s)
   * @param columnWidths - column width object that will be updated by reference pointers
   * @param columnIndexOverride - an optional column index, if provided it will override the column index position
   * @returns - count of items that was read
   */
  protected calculateCellWidthByReadingDataset(columnOrColumns: Column | Column[], columnWidths: { [columnId in string | number]: number; }, maxItemToInspect = 1000, columnIndexOverride?: number) {
    const columnDefinitions = Array.isArray(columnOrColumns) ? columnOrColumns : [columnOrColumns];

    // const columnDefinitions = this._grid.getColumns();
    const dataset = this.dataView.getItems() as any[];

    let readItemCount = 0;
    for (const [rowIdx, item] of dataset.entries()) {
      if (rowIdx > maxItemToInspect) {
        break;
      }
      if (Array.isArray(columnDefinitions)) {
        if (typeof columnWidths === 'object') {
          columnDefinitions.forEach((columnDef, colIdx) => {
            const newColumnWidth = this.calculateCellWidthByContent(item, columnDef, rowIdx, columnIndexOverride ?? colIdx, columnWidths[columnDef.id]);
            if (newColumnWidth !== undefined) {
              columnWidths[columnDef.id] = newColumnWidth;
            }
          });
        }
      }
      readItemCount = rowIdx + 1;
    }

    return readItemCount;
  }

  /**
   * Step 2 - This step will parse any Formatter(s) if defined, it will then sanitize any HTML tags and calculate the max width from that cell content.
   * This function will be executed on every cell of the grid data.
   * @param {Object} item - item data context object
   * @param {Object} columnDef - column definition
   * @param {Number} rowIdx - row index
   * @param {Number} colIdx - column (cell) index
   * @param {Number} initialMininalColumnWidth - initial width, could be coming from `minWidth` or a default `width`
   * @returns - column width
   */
  protected calculateCellWidthByContent(item: any, columnDef: Column, rowIdx: number, colIdx: number, initialMininalColumnWidth?: number): number | undefined {
    const resizeCellCharWidthInPx = this.resizeByContentOptions.cellCharWidthInPx ?? 7; // width in pixels of a string character, this can vary depending on which font family/size is used & cell padding

    if (!columnDef.originalWidth) {
      const charWidthPx = columnDef?.resizeCharWidthInPx ?? resizeCellCharWidthInPx;
      const formattedData = parseFormatterWhenExist(columnDef?.formatter, rowIdx, colIdx, columnDef, item, this._grid);
      const formattedDataSanitized = sanitizeHtmlToText(formattedData);
      const formattedTextWidthInPx = Math.ceil(formattedDataSanitized.length * charWidthPx);
      const resizeMaxWidthThreshold = columnDef.resizeMaxWidthThreshold;
      if (columnDef && (initialMininalColumnWidth === undefined || formattedTextWidthInPx > initialMininalColumnWidth)) {
        initialMininalColumnWidth = (resizeMaxWidthThreshold !== undefined && formattedTextWidthInPx > resizeMaxWidthThreshold)
          ? resizeMaxWidthThreshold
          : (columnDef.maxWidth !== undefined && formattedTextWidthInPx > columnDef.maxWidth) ? columnDef.maxWidth : formattedTextWidthInPx;
      }
    }
    return initialMininalColumnWidth;
  }

  /**
   * Step 3 - Apply the new calculated width, it might or might not use this calculated width depending on a few conditions.
   * One of those condition will be to check that the new width doesn't go over a maxWidth and/or a maxWidthThreshold
   * @param {Object} column - column definition to apply the width
   * @param {Number} calculatedColumnWidth - new calculated column width to possibly apply
   */
  protected applyNewCalculatedColumnWidthByReference(column: Column<any>, calculatedColumnWidth: number) {
    // read a few optional resize by content grid options
    const resizeCellPaddingWidthInPx = this.resizeByContentOptions.cellPaddingWidthInPx ?? 6;
    const resizeFormatterPaddingWidthInPx = this.resizeByContentOptions.formatterPaddingWidthInPx ?? 6;
    const fieldType = column?.filter?.type ?? column?.type ?? FieldType.string;

    // let's start with column width found in previous column & data analysis
    let newColWidth = calculatedColumnWidth;

    // apply optional ratio which is typically 1, except for string where we use a ratio of around ~0.9 since we have more various thinner characters like (i, l, t, ...)
    const stringWidthRatio = column?.resizeCalcWidthRatio ?? this.resizeByContentOptions.defaultRatioForStringType ?? 0.9;
    newColWidth *= fieldType === 'string' ? stringWidthRatio : 1;

    // apply extra cell padding, custom padding & editor formatter padding
    // --
    newColWidth += resizeCellPaddingWidthInPx;
    if (column.resizeExtraWidthPadding) {
      newColWidth += column.resizeExtraWidthPadding;
    }
    if (column.editor && this.gridOptions.editable) {
      newColWidth += resizeFormatterPaddingWidthInPx;
    }

    // make sure we're not over a column max width and/or optional custom max width threshold
    if (column.maxWidth !== undefined && newColWidth > column.maxWidth) {
      newColWidth = column.maxWidth;
    }
    if (column.resizeMaxWidthThreshold !== undefined && newColWidth > column.resizeMaxWidthThreshold) {
      newColWidth = column.resizeMaxWidthThreshold;
    }

    // make the value the closest bottom integer
    newColWidth = Math.ceil(newColWidth);

    // finally only apply the new width if user didn't yet provide one and/or if user really wants to specifically ask for a recalculate
    if (column.originalWidth === undefined || column.resizeAlwaysRecalculateWidth === true || this.resizeByContentOptions.alwaysRecalculateColumnWidth === true) {
      column.width = this.readjustNewColumnWidthWhenOverLimit(column, newColWidth);
    }
  }

  protected handleSingleColumnResizeByContent(columnId: string) {
    const columnDefinitions = this._grid.getColumns();
    const columnDefIdx = columnDefinitions.findIndex(col => col.id === columnId);

    if (columnDefIdx >= 0) {
      // provide the initial column width by reference to the calculation and the result will also be returned by reference
      const columnDef = columnDefinitions[columnDefIdx];
      const columnWidths = { [columnId]: columnDef.originalWidth ?? columnDef.minWidth ?? 0 };
      columnDef.originalWidth = undefined; // reset original width since we want to recalculate it
      this.calculateCellWidthByReadingDataset(columnDef, columnWidths, this.resizeByContentOptions.maxItemToInspectSingleColumnWidthByContent, columnDefIdx);
      this.applyNewCalculatedColumnWidthByReference(columnDef, columnWidths[columnId]);

      // finally call the re-render for the UI to render the new column width
      this._grid.reRenderColumns(columnDef?.rerenderOnResize ?? false);
    }
  }

  /**
   * Checks wether the new calculated column width is valid or not, if it's not then return a lower and acceptable width.
   * When using frozen (pinned) column, we cannot make our column wider than the grid viewport because it would become unusable/unscrollable
   * and so if we do reach that threshold then our calculated column width becomes officially invalid
   * @param {Object} column - column definition
   * @param {Number} newColumnWidth - calculated column width input
   * @returns boolean
   */
  protected readjustNewColumnWidthWhenOverLimit(column: Column, newColumnWidth: number): number {
    const frozenColumnIdx = this.gridOptions.frozenColumn ?? -1;
    const columnIdx = this._grid.getColumns().findIndex(col => col.id === column.id) ?? 0;
    let adjustedWidth = newColumnWidth;

    if (frozenColumnIdx >= 0 && columnIdx <= frozenColumnIdx) {
      const allViewports = Array.from(this._grid.getViewports() as HTMLElement[]);
      if (allViewports) {
        const leftViewportWidth = allViewports.find(viewport => viewport.classList.contains('slick-viewport-left'))?.clientWidth ?? 0;
        const rightViewportWidth = allViewports.find(viewport => viewport.classList.contains('slick-viewport-right'))?.clientWidth ?? 0;
        const viewportFullWidth = leftViewportWidth + rightViewportWidth;
        const leftViewportWidthMinusCurrentCol = leftViewportWidth - (column.width ?? 0);
        const isGreaterThanFullViewportWidth = (leftViewportWidthMinusCurrentCol + newColumnWidth) > viewportFullWidth;

        if (isGreaterThanFullViewportWidth) {
          const resizeWidthToRemoveFromExceededWidthReadjustment = this.resizeByContentOptions.widthToRemoveFromExceededWidthReadjustment ?? 50;
          adjustedWidth = (leftViewportWidth - leftViewportWidthMinusCurrentCol + rightViewportWidth - resizeWidthToRemoveFromExceededWidthReadjustment);
        }
      }
    }
    return Math.ceil(adjustedWidth);
  }

  /**
   * Just check if the grid is still shown in the DOM
   * @returns is grid shown
   */
  protected checkIsGridShown(): boolean {
    return !!(document.querySelector<HTMLDivElement>(`${this.gridUidSelector}`)?.offsetParent ?? false);
  }

  /**
   * Patch for SalesForce, some issues arise when having a grid inside a Tab and user clicks in a different Tab without waiting for the grid to be rendered
   * in ideal world, we would simply call a resize when user comes back to the Tab with the grid (tab focused) but this is an extra step and we might not always have this event available.
   * The grid seems broken, the header titles seems to be showing up behind the grid data and the rendering seems broken.
   * Why it happens? Because SlickGrid can resize problem when the DOM element is hidden and that happens when user doesn't wait for the grid to be fully rendered and go in a different Tab.
   *
   * So the patch is to call a grid resize if the following 2 conditions are met
   *   1- header row is Y coordinate 0 (happens when user is not in current Tab)
   *   2- header titles are lower than the viewport of dataset (this can happen when user change Tab and DOM is not shown),
   * for these cases we'll resize until it's no longer true or until we reach a max time limit (70min)
   */
  protected resizeGridWhenStylingIsBrokenUntilCorrected() {
    // how many time we want to check before really stopping the resize check?
    // We do this because user might be switching to another tab too quickly for the resize be really finished, so better recheck few times to make sure
    const autoFixResizeTimeout = this.gridOptions?.autoFixResizeTimeout ?? (5 * 60 * 60); // interval is 200ms, so 4x is 1sec, so (4 * 60 * 60 = 60min)
    const autoFixResizeRequiredGoodCount = this.gridOptions?.autoFixResizeRequiredGoodCount ?? 5;

    const headerElm = this._gridContainerElm.querySelector<HTMLDivElement>(`${this.gridUidSelector} .slick-header`);
    const viewportElm = this._gridContainerElm.querySelector<HTMLDivElement>(`${this.gridUidSelector} .slick-viewport`);
    let intervalExecutionCounter = 0;
    let resizeGoodCount = 0;

    if (headerElm && viewportElm && this.gridOptions.autoFixResizeWhenBrokenStyleDetected) {
      const dataLn = this.dataView.getItemCount();
      const columns = this._grid.getColumns() || [];

      this._intervalId = setInterval(async () => {
        const headerTitleRowHeight = 44; // this one is set by SASS/CSS so let's hard code it
        const headerPos = getHtmlElementOffset(headerElm);
        let headerOffsetTop = headerPos?.top ?? 0;
        if (this.gridOptions && this.gridOptions.enableFiltering && this.gridOptions.headerRowHeight) {
          headerOffsetTop += this.gridOptions.headerRowHeight; // filter row height
        }
        if (this.gridOptions && this.gridOptions.createPreHeaderPanel && this.gridOptions.showPreHeaderPanel && this.gridOptions.preHeaderPanelHeight) {
          headerOffsetTop += this.gridOptions.preHeaderPanelHeight; // header grouping titles row height
        }
        headerOffsetTop += headerTitleRowHeight; // header title row height

        const viewportPos = getHtmlElementOffset(viewportElm);
        const viewportOffsetTop = viewportPos?.top ?? 0;

        // if header row is Y coordinate 0 (happens when user is not in current Tab) or when header titles are lower than the viewport of dataset (this can happen when user change Tab and DOM is not shown)
        // another resize condition could be that if the grid location is at coordinate x/y 0/0, we assume that it's in a hidden tab and we'll need to resize whenever that tab becomes active
        // for these cases we'll resize until it's no longer true or until we reach a max time limit (70min)
        const containerElmOffset = getHtmlElementOffset(this._gridContainerElm);
        let isResizeRequired = (headerPos?.top === 0 || ((headerOffsetTop - viewportOffsetTop) > 2) || (containerElmOffset?.left === 0 && containerElmOffset?.top === 0)) ? true : false;

        // another condition for a required resize is when the grid is hidden (not in current tab) then its "rightPx" rendered range will be 0px
        // if that's the case then we know the grid is still hidden and we need to resize it whenever it becomes visible (when its "rightPx" becomes greater than 0 then it's visible)
        const renderedRangeRightPx = this._grid.getRenderedRange?.()?.rightPx ?? 0;
        if (!isResizeRequired && dataLn > 0 && renderedRangeRightPx === 0 && columns.length > 1) {
          isResizeRequired = true;
        }

        // user could choose to manually stop the looped of auto resize fix
        if (this._isStopResizeIntervalRequested) {
          isResizeRequired = false;
          intervalExecutionCounter = autoFixResizeTimeout;
        }

        // visible grid (shown to the user and not hidden in another Tab will have an offsetParent defined)
        if (this.checkIsGridShown() && (isResizeRequired || containerElmOffset?.left === 0 || containerElmOffset?.top === 0)) {
          await this.resizeGrid();
          if (resizeGoodCount < 5) {
            this._grid.updateColumns(); // also refresh header titles after grid becomes visible in new tab, this fixes an issue observed in Salesforce
          }

          // make sure the grid is still visible after doing the resize
          if (this.checkIsGridShown()) {
            isResizeRequired = false;
          }
        }

        // make sure the grid is still visible after optionally doing a resize
        // if it visible then we can consider it a good resize (it might not be visible if user quickly switch to another Tab)
        if (this.checkIsGridShown()) {
          resizeGoodCount++;
        }

        if (this.checkIsGridShown() && !isResizeRequired && (resizeGoodCount >= autoFixResizeRequiredGoodCount || intervalExecutionCounter++ >= autoFixResizeTimeout)) {
          clearInterval(this._intervalId); // stop the interval if we don't need resize or if we passed let say 70min
        }
      }, this.intervalRetryDelay);
    }
  }
}
