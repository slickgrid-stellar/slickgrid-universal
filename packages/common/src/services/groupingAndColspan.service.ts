import {
  Column,
  SlickDataView,
  GridOption,
  SlickEventHandler,
  SlickGrid,
  SlickNamespace,
} from './../interfaces/index';
import { ExtensionUtility } from '../extensions/extensionUtility';

// using external non-typed js libraries
declare let $: any;
declare const Slick: SlickNamespace;

export class GroupingAndColspanService {
  private _eventHandler: SlickEventHandler;
  private _grid: SlickGrid;

  constructor(private extensionUtility: ExtensionUtility) {
    this._eventHandler = new Slick.EventHandler();
  }

  /** Getter of SlickGrid DataView object */
  get _dataView(): SlickDataView {
    return (this._grid?.getData && this._grid.getData()) as SlickDataView;
  }

  /** Getter of the SlickGrid Event Handler */
  get eventHandler(): SlickEventHandler {
    return this._eventHandler;
  }

  /** Getter for the Grid Options pulled through the Grid Object */
  private get _gridOptions(): GridOption {
    return (this._grid?.getOptions) ? this._grid.getOptions() : {};
  }

  /** Getter for the Column Definitions pulled through the Grid Object */
  private get _columnDefinitions(): Column[] {
    return (this._grid && this._grid.getColumns) ? this._grid.getColumns() : [];
  }

  /**
   * Initialize the Service
   * @param {object} grid
   * @param {object} resizerPlugin
   */
  init(grid: SlickGrid) {
    this._grid = grid;
    const resizerPlugin = grid.getPluginByName('Resizer');

    if (grid && this._gridOptions) {
      // When dealing with Pre-Header Grouping colspan, we need to re-create the pre-header in multiple occasions
      // for all these events, we have to trigger a re-create
      if (this._gridOptions.createPreHeaderPanel) {
        this._eventHandler.subscribe(grid.onSort, () => this.renderPreHeaderRowGroupingTitles());
        this._eventHandler.subscribe(grid.onColumnsResized, () => this.renderPreHeaderRowGroupingTitles());
        this._eventHandler.subscribe(grid.onColumnsReordered, () => this.renderPreHeaderRowGroupingTitles());
        this._eventHandler.subscribe(this._dataView.onRowCountChanged, () => this.renderPreHeaderRowGroupingTitles());
        if (resizerPlugin && resizerPlugin.onGridAfterResize) {
          this._eventHandler.subscribe(resizerPlugin.onGridAfterResize, () => this.renderPreHeaderRowGroupingTitles());
        }

        // also not sure why at this point, but it seems that I need to call the 1st create in a delayed execution
        // probably some kind of timing issues and delaying it until the grid is fully ready does help
        setTimeout(() => this.renderPreHeaderRowGroupingTitles(), 75);
      }
    }
  }

  dispose() {
    // unsubscribe all SlickGrid events
    this._eventHandler.unsubscribeAll();
  }

  /** Create or Render the Pre-Header Row Grouping Titles */
  renderPreHeaderRowGroupingTitles() {
    if (this._gridOptions && this._gridOptions.frozenColumn !== undefined && this._gridOptions.frozenColumn >= 0) {
      // Add column groups to left panel
      let $preHeaderPanel = $(this._grid.getPreHeaderPanelLeft());
      this.renderHeaderGroups($preHeaderPanel, 0, this._gridOptions.frozenColumn + 1);

      // Add column groups to right panel
      $preHeaderPanel = $(this._grid.getPreHeaderPanelRight());
      this.renderHeaderGroups($preHeaderPanel, this._gridOptions.frozenColumn + 1, this._columnDefinitions.length);
    } else {
      // regular grid (not a frozen grid)
      const $preHeaderPanel = $(this._grid.getPreHeaderPanel());
      this.renderHeaderGroups($preHeaderPanel, 0, this._columnDefinitions.length);
    }
  }

  renderHeaderGroups(preHeaderPanel: any, start: number, end: number) {
    preHeaderPanel.empty()
      .addClass('slick-header-columns')
      .css('left', '-1000px')
      .width(this._grid.getHeadersWidth());
    preHeaderPanel.parent().addClass('slick-header');

    const headerColumnWidthDiff = this._grid.getHeaderColumnWidthDiff();

    let colDef;
    let header;
    let lastColumnGroup = '';
    let widthTotal = 0;

    for (let i = start; i < end; i++) {
      colDef = this._columnDefinitions[i];
      if (colDef) {
        if (lastColumnGroup === colDef.columnGroup && i > 0) {
          widthTotal += colDef.width || 0;
          if (header && header.width) {
            header.width(widthTotal - headerColumnWidthDiff);
          }
        } else {
          widthTotal = colDef.width || 0;
          header = $(`<div class="ui-state-default slick-header-column" />`)
            .html(`<span class="slick-column-name">${colDef.columnGroup || ''}</span>`)
            .width(widthTotal - headerColumnWidthDiff)
            .appendTo(preHeaderPanel);
        }
        lastColumnGroup = colDef.columnGroup || '';
      }
    }
  }

  /** Translate Column Group texts and re-render them afterward. */
  translateGroupingAndColSpan() {
    const currentColumnDefinitions = this._grid.getColumns();
    this.extensionUtility.translateItems(currentColumnDefinitions, 'columnGroupKey', 'columnGroup');
    this._grid.setColumns(currentColumnDefinitions);
    this.renderPreHeaderRowGroupingTitles();
  }
}
