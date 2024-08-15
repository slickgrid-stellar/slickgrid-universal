import { type Column, Editors, Formatters, type GridOption, SlickGlobalEditorLock } from '@slickgrid-universal/common';
import { Slicker, type SlickVanillaGridBundle } from '@slickgrid-universal/vanilla-bundle';
import { ExampleGridOptions } from './example-grid-options';

import './example29.scss';
import { BindingEventService } from '@slickgrid-universal/binding';

export default class Example29 {
  private _bindingEventService: BindingEventService;
  gridOptions!: GridOption;
  columnDefinitions!: Column[];
  dataset!: any[];
  sgb!: SlickVanillaGridBundle;
  dragHelper;
  dragRows: number[];
  dragMode = '';

  constructor() {
    this._bindingEventService = new BindingEventService();
  }

  attached() {
    this.defineGrids();
    const gridContainer1Elm = document.querySelector(`.grid29-1`) as HTMLDivElement;

    // mock some data (different in each dataset)
    this.dataset = this.mockData();

    this.sgb = new Slicker.GridBundle(gridContainer1Elm, this.columnDefinitions, { ...ExampleGridOptions, ...this.gridOptions }, this.dataset);

    // bind any of the grid events
    this._bindingEventService.bind(gridContainer1Elm, 'ondraginit', this.handleOnDragInit.bind(this) as EventListener);
    this._bindingEventService.bind(gridContainer1Elm, 'ondragstart', this.handleOnDragStart.bind(this) as EventListener);
    this._bindingEventService.bind(gridContainer1Elm, 'ondrag', this.handleOnDrag.bind(this) as EventListener);
    this._bindingEventService.bind(gridContainer1Elm, 'ondragend', this.handleOnDragEnd.bind(this) as EventListener);
  }

  dispose() {
    this.sgb?.dispose();
  }

  isBrowserDarkModeEnabled() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  /* Define grid Options and Columns */
  defineGrids() {
    this.columnDefinitions = [
      { id: 'name', name: 'Name', field: 'name', width: 300, cssClass: 'cell-title', editor: { model: Editors.Text, }, validator: this.requiredFieldValidator },
      { id: 'complete', name: 'Complete', width: 60, cssClass: 'cell-effort-driven', field: 'complete', cannotTriggerInsert: true, formatter: Formatters.checkmarkMaterial, editor: { model: Editors.Checkbox }, }
    ];
    this.gridOptions = {
      enableAutoResize: false,
      gridHeight: 225,
      gridWidth: 800,
      rowHeight: 33,
      enableCellNavigation: true,
      enableRowSelection: true,
      enableRowMoveManager: true,
      rowSelectionOptions: {
        // True (Single Selection), False (Multiple Selections)
        selectActiveRow: false
      },
      rowMoveManager: {
        columnIndexPosition: 0,
        cancelEditOnDrag: true,
        disableRowSelection: true,
        hideRowMoveShadow: false,
        onBeforeMoveRows: this.onBeforeMoveRows.bind(this),
        onMoveRows: this.onMoveRows.bind(this),

        // you can also override the usability of the rows, for example make every 2nd row the only moveable rows,
        // usabilityOverride: (row, dataContext, grid) => dataContext.id % 2 === 1
      },
    };
  }

  mockData() {
    return [
      { id: 0, name: 'Make a list', complete: true },
      { id: 1, name: 'Check it twice', complete: false },
      { id: 2, name: `Find out who's naughty`, complete: false },
      { id: 3, name: `Find out who's nice`, complete: false }
    ];
  }

  onBeforeMoveRows(e: MouseEvent | TouchEvent, data: { rows: number[]; insertBefore: number; }) {
    for (let i = 0; i < data.rows.length; i++) {
      // no point in moving before or after itself
      if (data.rows[i] == data.insertBefore || data.rows[i] == data.insertBefore - 1) {
        e.stopPropagation();
        return false;
      }
    }
    return true;
  }

  onMoveRows(_e: MouseEvent | TouchEvent, args: { rows: number[]; insertBefore: number; }) {
    const extractedRows: any[] = [];
    const rows = args.rows;
    const insertBefore = args.insertBefore;
    const left = this.sgb.dataset.slice(0, insertBefore);
    const right = this.sgb.dataset.slice(insertBefore, this.sgb.dataset.length);

    rows.sort((a, b) => a - b);

    for (let i = 0; i < rows.length; i++) {
      extractedRows.push(this.sgb.dataset[rows[i]]);
    }

    rows.reverse();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row < insertBefore) {
        left.splice(row, 1);
      } else {
        right.splice(row - insertBefore, 1);
      }
    }

    this.dataset = left.concat(extractedRows.concat(right));

    const selectedRows: number[] = [];
    for (let i = 0; i < rows.length; i++)
      selectedRows.push(left.length + i);

    this.sgb.slickGrid?.resetActiveCell();
    this.sgb.dataset = this.dataset; // update dataset and re-render the grid
  }

  handleOnDragInit(e: CustomEvent) {
    // prevent the grid from cancelling drag'n'drop by default
    const { eventData } = e.detail;
    eventData.stopImmediatePropagation();
  }

  handleOnDragStart(e: CustomEvent) {
    const { eventData } = e.detail;
    const cell = this.sgb.slickGrid?.getCellFromEvent(eventData);

    if (!cell || cell.cell === 0) {
      this.dragMode = '';
      return;
    }

    const row = cell.row;
    if (!this.dataset[row]) {
      return;
    }

    if (SlickGlobalEditorLock.isActive()) {
      return;
    }

    eventData.stopImmediatePropagation();
    this.dragMode = 'recycle';

    let selectedRows: number[] = this.sgb.slickGrid?.getSelectedRows() || [];

    if (!selectedRows.length || selectedRows.findIndex(row => row === row) === -1) {
      selectedRows = [row];
      this.sgb.slickGrid?.setSelectedRows(selectedRows);
    }

    this.dragRows = selectedRows;
    const dragCount = selectedRows.length;

    const proxy = document.createElement('span');
    proxy.style.position = 'absolute';
    proxy.style.display = 'inline-block';
    proxy.style.padding = '4px 10px';
    proxy.style.background = '#e0e0e0';
    proxy.style.border = '1px solid gray';
    proxy.style.zIndex = '99999';
    proxy.style.borderRadius = '8px';
    proxy.style.boxShadow = '2px 2px 6px silver';
    proxy.textContent = `Drag to Recycle Bin to delete ${dragCount} selected row(s)`;
    document.body.appendChild(proxy);

    this.dragHelper = proxy;

    return proxy;
  }

  handleOnDrag(e: CustomEvent) {
    const { args, eventData } = e.detail;
    if (this.dragMode !== 'recycle') {
      return;
    }
    const targetEvent = eventData.touches ? eventData.touches[0] : eventData;
    if (this.dragHelper instanceof HTMLElement) {
      this.dragHelper.style.top = `${targetEvent.pageY + 5}px`;
      this.dragHelper.style.left = `${targetEvent.pageX + 5}px`;
    }

    // add/remove pink background color when hovering recycle bin
    const dropzoneElm = document.querySelector<HTMLDivElement>('#dropzone')!;
    if (args.target instanceof HTMLElement && (args.target.id === 'dropzone' || args.target === dropzoneElm)) {
      dropzoneElm.style.background = 'pink'; // OR: dd.target.style.background = 'pink';
      dropzoneElm.style.cursor = 'crosshair';

    } else {
      dropzoneElm.style.cursor = 'default';
      dropzoneElm.style.background = '';
    }
  }

  handleOnDragEnd(e: CustomEvent) {
    const args = e.detail?.args;
    if (this.dragMode != 'recycle') {
      return;
    }
    this.dragHelper.remove();

    if (this.dragMode != 'recycle' || args.target.id !== 'dropzone') {
      return;
    }

    // reaching here means that we'll remove the row that we started dragging from the dataset
    const rowsToDelete = this.dragRows.sort().reverse();
    for (let i = 0; i < rowsToDelete.length; i++) {
      this.dataset.splice(rowsToDelete[i], 1);
    }
    this.sgb.dataset = this.dataset;
    this.sgb.slickGrid?.invalidate();
    this.sgb.slickGrid?.setSelectedRows([]);

    const dropzoneElm = document.querySelector<HTMLDivElement>('#dropzone')!;
    dropzoneElm.style.background = '';
  }

  requiredFieldValidator(value: any) {
    if (value == null || value == undefined || !value.length) {
      return { valid: false, msg: 'This is a required field' };
    } else {
      return { valid: true, msg: null };
    }
  }
}
