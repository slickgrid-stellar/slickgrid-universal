import {
  exportWithFormatterWhenDefined,
  FieldType,
  getHtmlElementOffset,
  GetSlickEventType,
  GridOption,
  GridSize,
  PubSubService,
  sanitizeHtmlToText,
  SlickDataView,
  SlickEventData,
  SlickEventHandler,
  SlickGrid,
  SlickNamespace,
  SlickResizer,
} from '@slickgrid-universal/common';

// using external non-typed js libraries
declare const Slick: SlickNamespace;
const DATAGRID_FOOTER_HEIGHT = 25;
const DATAGRID_PAGINATION_HEIGHT = 35;
const DEFAULT_INTERVAL_MAX_RETRIES = 70;
const DEFAULT_INTERVAL_RETRY_DELAY = 250;

export class ResizerService {
  private _grid!: SlickGrid;
  private _addon!: SlickResizer;
  private _eventHandler: SlickEventHandler;
  private _gridParentContainerElm!: HTMLElement;
  private _intervalId!: NodeJS.Timeout;
  private _intervalExecutionCounter = 0;
  private _intervalRetryDelay = DEFAULT_INTERVAL_RETRY_DELAY;
  private _isStopResizeIntervalRequested = false;
  private _lastDimensions?: GridSize;
  private _totalColumnsWidthByContent = 0;

  get eventHandler(): SlickEventHandler {
    return this._eventHandler;
  }

  /** Getter for the Grid Options pulled through the Grid Object */
  get gridOptions(): GridOption {
    return (this._grid && this._grid.getOptions) ? this._grid.getOptions() : {};
  }

  /** Getter for the SlickGrid DataView */
  get dataView(): SlickDataView {
    return this._grid?.getData() as SlickDataView;
  }

  /** Getter for the grid uid */
  get gridUid(): string {
    return this._grid?.getUID() ?? '';
  }

  get intervalRetryDelay(): number {
    return this._intervalRetryDelay;
  }
  set intervalRetryDelay(delay: number) {
    this._intervalRetryDelay = delay;
  }

  constructor(private eventPubSubService: PubSubService) {
    this._eventHandler = new Slick.EventHandler();
  }

  /** Get the instance of the SlickGrid addon (control or plugin). */
  getAddonInstance(): SlickResizer | null {
    return this._addon;
  }

  /** dispose (destroy) the 3rd party plugin */
  dispose() {
    this._addon?.destroy();
    this._eventHandler?.unsubscribeAll();
  }

  init(grid: SlickGrid, gridParentContainerElm: HTMLElement) {
    this._grid = grid;
    this._gridParentContainerElm = gridParentContainerElm;
    const fixedGridDimensions = (this.gridOptions?.gridHeight || this.gridOptions?.gridWidth) ? { height: this.gridOptions?.gridHeight, width: this.gridOptions?.gridWidth } : undefined;
    const autoResizeOptions = this.gridOptions?.autoResize ?? { bottomPadding: 0 };
    if (autoResizeOptions?.bottomPadding !== undefined && this.gridOptions.showCustomFooter) {
      const footerHeight: string | number = this.gridOptions?.customFooterOptions?.footerHeight ?? DATAGRID_FOOTER_HEIGHT;
      autoResizeOptions.bottomPadding += parseInt(`${footerHeight}`, 10);
    }
    if (autoResizeOptions?.bottomPadding !== undefined && this.gridOptions.enablePagination) {
      autoResizeOptions.bottomPadding += DATAGRID_PAGINATION_HEIGHT;
    }
    if (fixedGridDimensions?.width && gridParentContainerElm?.style) {
      gridParentContainerElm.style.width = typeof fixedGridDimensions.width === 'string' ? fixedGridDimensions.width : `${fixedGridDimensions.width}px`;
    }

    this._addon = new Slick.Plugins.Resizer({ ...autoResizeOptions, gridContainer: gridParentContainerElm }, fixedGridDimensions);
    this._grid.registerPlugin<SlickResizer>(this._addon);
    if (this.gridOptions.enableAutoResize && this._addon?.resizeGrid() instanceof Promise) {
      this._addon.resizeGrid()
        .then(() => this.resizeGridWhenStylingIsBrokenUntilCorrected())
        .catch((rejection: any) => console.log('Error:', rejection));
    }

    // Events
    if (this.gridOptions.autoResize) {
      if (this._addon && this._addon.onGridAfterResize) {
        const onGridAfterResizeHandler = this._addon.onGridAfterResize;
        (this._eventHandler as SlickEventHandler<GetSlickEventType<typeof onGridAfterResizeHandler>>).subscribe(onGridAfterResizeHandler, (_e, args) => {
          this.eventPubSubService.publish('onGridAfterResize', args);

          // we can call our resize by content here (when enabled)
          // since the core Slick.Resizer plugin only supports the "autosizeColumns"
          if (this.gridOptions.enableAutoResizeColumnsByCellContent && this._lastDimensions?.width && args.dimensions.width !== this._lastDimensions?.width) {
            this.resizeColumnsByCellContent();
          }
          this._lastDimensions = args.dimensions;
        });
      }
      if (this._addon && this._addon.onGridBeforeResize) {
        const onGridBeforeResizeHandler = this._addon.onGridBeforeResize;
        (this._eventHandler as SlickEventHandler<GetSlickEventType<typeof onGridBeforeResizeHandler>>).subscribe(onGridBeforeResizeHandler, (_e, args) => {
          this.eventPubSubService.publish('onGridBeforeResize', args);
        });
      }
    }
  }

  /**
   * Return the last resize dimensions used by the service
   * @return {object} last dimensions (height, width)
   */
  getLastResizeDimensions(): GridSize {
    return this._addon?.getLastResizeDimensions();
  }

  /**
   * Provide the possibility to pause the resizer for some time, until user decides to re-enabled it later if he wish to.
   * @param {boolean} isResizePaused are we pausing the resizer?
   */
  pauseResizer(isResizePaused: boolean) {
    this._addon.pauseResizer(isResizePaused);
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
  resizeColumnsByCellContent(recalculateColumnsTotalWidth = false, dataset?: any[]) {
    const columnDefinitions = this._grid.getColumns();
    dataset = dataset || this.dataView.getItems() as any[];
    const columnWidths: { [columnId in string | number]: number; } = {};
    let reRender = false;

    if (!Array.isArray(dataset) || dataset.length === 0) {
      return;
    }

    // read a few optional resize by content grid options
    const resizeCellCharWidthInPx = this.gridOptions.resizeCellCharWidthInPx || 7; // width in pixels of a string character, this can vary depending on which font family/size is used & cell padding
    const resizeCellPaddingWidthInPx = this.gridOptions.resizeCellPaddingWidthInPx || 6;
    const resizeFormatterPaddingWidthInPx = this.gridOptions.resizeFormatterPaddingWidthInPx || 6;
    const resizeMaxItemToInspectCellContentWidth = this.gridOptions.resizeMaxItemToInspectCellContentWidth || 1000; // how many items do we want to analyze cell content with widest width

    // calculate total width necessary by each cell content
    // we won't re-evaluate if we already had calculated the total
    if (this._totalColumnsWidthByContent === 0 || recalculateColumnsTotalWidth) {
      // loop through all columns to get their minWidth or width for later usage
      for (const columnDef of columnDefinitions) {
        columnWidths[columnDef.id] = columnDef.minWidth || columnDef.width || 0;
      }

      // loop through the entire dataset (limit to first 1000 rows), and evaluate the width by its content
      // if we have a Formatter, we will also potentially add padding
      for (const [rowIdx, item] of dataset.entries()) {
        if (rowIdx > resizeMaxItemToInspectCellContentWidth) {
          break;
        }
        columnDefinitions.forEach((columnDef, colIdx) => {
          const charWidthPx = columnDef?.resizeCharWidthInPx ?? resizeCellCharWidthInPx;
          const exportOptions = this.gridOptions.enableTextExport ? this.gridOptions.exportOptions || this.gridOptions.textExportOptions : this.gridOptions.excelExportOptions;
          const formattedData = exportWithFormatterWhenDefined(rowIdx, colIdx, item, columnDef, this._grid, exportOptions);
          const formattedDataSanitized = sanitizeHtmlToText(formattedData);
          const formattedTextWidthInPx = Math.ceil(formattedDataSanitized.length * charWidthPx);
          const resizeMaxWidthThreshold = columnDef.resizeMaxWidthThreshold;

          if (columnDef && columnWidths[columnDef.id] === undefined || formattedTextWidthInPx > columnWidths[columnDef.id]) {
            columnWidths[columnDef.id] = (resizeMaxWidthThreshold !== undefined && formattedTextWidthInPx < resizeMaxWidthThreshold)
              ? resizeMaxWidthThreshold
              : (columnDef.maxWidth !== undefined && formattedTextWidthInPx < columnDef.maxWidth) ? columnDef.maxWidth : formattedTextWidthInPx;
          }
        });
      }

      // finally loop through all column definitions again and apply calculated `width` to each column
      let totalColsWidth = 0;
      for (const column of columnDefinitions) {
        const fieldType = column?.filter?.type ?? column?.type ?? FieldType.string;

        if (columnWidths[column.id] !== undefined) {
          if (column.rerenderOnResize) {
            reRender = true;
          }
          let newColWidth = columnWidths[column.id] + resizeCellPaddingWidthInPx;
          let resizeCalcWidthRatio = column.resizeCalcWidthRatio || 1;

          if (column.editor && this.gridOptions.editable) {
            newColWidth += resizeFormatterPaddingWidthInPx;
          }
          if (fieldType === 'string') {
            resizeCalcWidthRatio = 0.9; // the default ratio is 1, except for string where we use a ratio of 0.9 since we have more various thinner characters like (i, l, t, ...)
          }
          if (resizeCalcWidthRatio) {
            newColWidth *= resizeCalcWidthRatio;
          }
          if (column.resizeExtraWidthPadding) {
            newColWidth += column.resizeExtraWidthPadding;
          }
          if ((column.resizeMaxWidthThreshold !== undefined && newColWidth > column.resizeMaxWidthThreshold) || (column.maxWidth !== undefined && newColWidth > column.maxWidth)) {
            newColWidth = column.resizeMaxWidthThreshold || column.maxWidth || 0;
          }
          newColWidth = Math.ceil(newColWidth); // make the value the closest bottom integer

          // only apply new width if user didn't yet provide one and/or if user really wants to specifically ask for a recalculate
          if (column.originalWidth === undefined || column.resizeAlwaysRecalculateWidth === true || this.gridOptions?.resizeAlwaysRecalculateColumnWidth === true) {
            column.width = Math.ceil(newColWidth);
          }
        }
        totalColsWidth += column.width || 0;
        this._totalColumnsWidthByContent = totalColsWidth;
      }
    }

    // get the grid container viewport width
    const viewportWidth = this._gridParentContainerElm?.offsetWidth ?? 0;

    // depending if our viewport calculated total columns is greater than the viewport size we'll call reRenderColumns() or else the default autosizeColumns()
    this._totalColumnsWidthByContent > viewportWidth ? this._grid.reRenderColumns(reRender) : this._grid.autosizeColumns();
  }

  /**
   * Resize the datagrid to fit the browser height & width.
   * @param {number} delay to wait before resizing, defaults to 0 (in milliseconds)
   * @param {object} newSizes can optionally be passed (height, width)
   * @param {object} event that triggered the resize, defaults to null
   * @return If the browser supports it, we can return a Promise that would resolve with the new dimensions
   */
  resizeGrid(delay?: number, newSizes?: GridSize, event?: SlickEventData): Promise<GridSize> | null {
    return this._addon?.resizeGrid(delay, newSizes, event);
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
  private resizeGridWhenStylingIsBrokenUntilCorrected() {
    const headerElm = document.querySelector<HTMLDivElement>(`.${this.gridUid} .slick-header`);
    const viewportElm = document.querySelector<HTMLDivElement>(`.${this.gridUid} .slick-viewport`);

    if (headerElm && viewportElm) {
      this._intervalId = setInterval(() => {
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
        // for these cases we'll resize until it's no longer true or until we reach a max time limit (70min)
        let isResizeRequired = (headerPos?.top === 0 || (headerOffsetTop - viewportOffsetTop) > 40) ? true : false;

        // user could choose to manually stop the looped of auto resize fix
        if (this._isStopResizeIntervalRequested) {
          isResizeRequired = false;
        }

        if (isResizeRequired && this._addon?.resizeGrid) {
          this._addon.resizeGrid();
        } else if ((!isResizeRequired && !this.gridOptions.useSalesforceDefaultGridOptions) || (this._intervalExecutionCounter++ > (4 * 60 * DEFAULT_INTERVAL_MAX_RETRIES))) { // interval is 250ms, so 4x is 1sec, so (4 * 60 * intervalMaxTimeInMin) shoud be 70min
          clearInterval(this._intervalId); // stop the interval if we don't need resize or if we passed let say 70min
        }
      }, this.intervalRetryDelay);
    }
  }
}
