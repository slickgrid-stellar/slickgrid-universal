import {
  type AutocompleterOption,
  type DOMEvent,
  type Column,
  type CurrentColumn,
  type CurrentFilter,
  type CurrentPinning,
  type CurrentSorter,
  type EditCommand,
  Editors,
  FieldType,
  Filters,
  type Formatter,
  Formatters,
  type GridOption,
  OperatorType,
  SlickGlobalEditorLock,
  type SliderOption,
  SortComparers,
  type VanillaCalendarOption,

  // utilities
  deepCopy,
  formatNumber,
} from '@slickgrid-universal/common';
import { BindingEventService } from '@slickgrid-universal/binding';
import { SlickCustomTooltip } from '@slickgrid-universal/custom-tooltip-plugin';
import { ExcelExportService } from '@slickgrid-universal/excel-export';
import { Slicker, type SlickVanillaGridBundle } from '@slickgrid-universal/vanilla-bundle';
import { format as tempoFormat, addDay } from '@formkit/tempo';
import { type MultipleSelectOption } from 'multiple-select-vanilla';

import exampleModal from './example11-modal.html?raw';
import Example11Modal from './example11-modal.js';
import countriesJson from './data/countries.json?raw';
import { ExampleGridOptions } from './example-grid-options.js';
import { loadComponent } from './utilities.js';
import './example11.scss';

const LOCAL_STORAGE_KEY = 'gridViewPreset';

// you can create custom validator to pass to an inline editor
const myCustomTitleValidator = (value) => {
  if (value === null || value === undefined || !value.length) {
    return { valid: false, msg: 'This is a required field' };
  } else if (!/^task\s\d+$/i.test(value)) {
    return { valid: false, msg: 'Your title is invalid, it must start with "Task" followed by a number' };
  }
  return { valid: true, msg: '' };
};

const customEditableInputFormatter = (_row, _cell, value, columnDef, _dataContext, grid) => {
  const gridOptions = grid.getOptions();
  const isEditableItem = gridOptions.editable && columnDef.editor;
  value = (value === null || value === undefined) ? '' : value;
  return isEditableItem ? { html: value, addClasses: 'editable-field', toolTip: 'Click to Edit' } : value;
};

export interface ViewDefinition {
  label: string;
  value: string;
  isSelected?: boolean;
  isUserDefined?: boolean;
  columns?: CurrentColumn[];
  filters: CurrentFilter[];
  sorters?: CurrentSorter[];
  pinning?: CurrentPinning;
}

export default class Example11 {
  private _bindingEventService: BindingEventService;
  allColumnIds = ['title', 'duration', 'cost', 'percentComplete', 'start', 'finish', 'completed', 'product', 'countryOfOrigin', 'action'];
  columnDefinitions: Column[];
  gridOptions: GridOption;
  dataset: any[] = [];
  currentSelectedViewPreset?: ViewDefinition;
  isGridEditable = true;
  dropdownDeleteViewClass = 'dropdown-item dropdown-item-disabled';
  dropdownUpdateViewClass = 'dropdown-item dropdown-item-disabled';
  editQueue: Array<{ item: any; column: Column; editCommand: EditCommand; }> = [];
  editedItems = {};
  sgb: SlickVanillaGridBundle;
  gridContainerElm: HTMLDivElement;
  viewSelectElm: HTMLSelectElement;
  currentYear = new Date().getFullYear();
  defaultPredefinedPresets = [
    {
      label: 'Tasks Finished in Previous Years (wo/Product,Country)',
      value: 'previousYears',
      isSelected: false,
      isUserDefined: false,
      columns: [...this.allColumnIds].map(colId => ({ columnId: `${colId}` })).filter(col => col.columnId !== 'product' && col.columnId !== 'countryOfOrigin'), // remove "Product", "Country of Origin"
      filters: [
        { columnId: 'finish', operator: OperatorType.lessThanOrEqual, searchTerms: [`${this.currentYear}-01-01`] },
        { columnId: 'completed', operator: OperatorType.equal, searchTerms: [true], },
        { columnId: 'percentComplete', operator: OperatorType.greaterThan, searchTerms: [50] },
      ] as CurrentFilter[],
      sorters: [{ columnId: 'finish', direction: 'desc' }] as CurrentSorter[]
    },
    {
      label: 'Tasks Finishing in Future Years (wo/Cost)',
      value: 'greaterCurrentYear',
      isSelected: false,
      isUserDefined: false,
      columns: [...this.allColumnIds].map(colId => ({ columnId: `${colId}` })).filter(col => col.columnId !== 'cost'), // remove "Cost"
      filters: [{ columnId: 'finish', operator: '>=', searchTerms: [`${this.currentYear + 1}-01-01`] }],
      sorters: [{ columnId: 'finish', direction: 'asc' }] as CurrentSorter[]
    }
  ] as ViewDefinition[];
  predefinedViews = [...this.defaultPredefinedPresets];

  get slickerGridInstance() {
    return this.sgb?.instances;
  }

  constructor() {
    this._bindingEventService = new BindingEventService();
  }

  attached() {
    this.initializeGrid();
    this.dataset = this.loadData(1000);
    this.gridContainerElm = document.querySelector(`.grid11`) as HTMLDivElement;
    this.viewSelectElm = document.querySelector('.selected-view') as HTMLSelectElement;

    this.sgb = new Slicker.GridBundle(this.gridContainerElm, this.columnDefinitions, { ...ExampleGridOptions, ...this.gridOptions }, this.dataset);

    // bind any of the grid events
    this._bindingEventService.bind(this.gridContainerElm, 'onvalidationerror', this.handleValidationError.bind(this));
    this._bindingEventService.bind(this.gridContainerElm, 'onitemdeleted', this.handleItemDeleted.bind(this));
    this.recreatePredefinedViews();
  }

  dispose() {
    this._bindingEventService.unbindAll();
    this.sgb?.dispose();
    this.viewSelectElm?.remove();
    this.gridContainerElm.remove();
  }

  initializeGrid() {
    this.columnDefinitions = [
      {
        id: 'title', name: 'Title', field: 'title', sortable: true, minWidth: 80,
        cssClass: 'text-bold text-uppercase',
        editor: { model: Editors.text, massUpdate: true, required: true, alwaysSaveOnEnterKey: true, validator: myCustomTitleValidator, },
        filterable: true,
      },
      {
        id: 'duration', name: 'Duration', field: 'duration', sortable: true, filterable: true, minWidth: 80,
        editor: { model: Editors.float, massUpdate: true, decimal: 2, valueStep: 1, maxValue: 10000, alwaysSaveOnEnterKey: true, },
        formatter: (_row, _cell, value) => {
          if (value === null || value === undefined) {
            return '';
          }
          return value > 1 ? `${value} days` : `${value} day`;
        },
        type: FieldType.number,
      },
      {
        id: 'cost', name: 'Cost', field: 'cost', minWidth: 80, width: 90,
        sortable: true, filterable: true, type: FieldType.number,
        filter: { model: Filters.compoundInputNumber },
        formatter: Formatters.dollar,
      },
      {
        id: 'percentComplete', name: '% Complete', field: 'percentComplete', type: FieldType.number, minWidth: 80,
        editor: { model: Editors.slider, massUpdate: true, minValue: 0, maxValue: 100, editorOptions: { hideSliderNumber: true } as SliderOption },
        sortable: true, filterable: true,
        filter: { model: Filters.slider, operator: '>=' },
      },
      {
        id: 'start', name: 'Start', field: 'start', sortable: true, minWidth: 80,
        formatter: Formatters.dateIso,
        type: FieldType.date, outputType: FieldType.dateIso,
        filterable: true,
        filter: { model: Filters.compoundDate },
        editor: { model: Editors.date, massUpdate: true, editorOptions: { allowInput: true } },
      },
      {
        id: 'finish', name: 'Finish', field: 'finish', sortable: true, minWidth: 80,
        editor: { model: Editors.date, massUpdate: true, editorOptions: { displayDateMin: 'today' } as VanillaCalendarOption },
        formatter: Formatters.dateIso,
        type: FieldType.date, outputType: FieldType.dateIso,
        filterable: true,
        filter: {
          model: Filters.compoundDate,
          filterShortcuts: [
            { title: 'Until Now', searchTerms: [tempoFormat(new Date(), 'YYYY-MM-DD')], operator: '<=', iconCssClass: 'mdi mdi-calendar', },
            { title: 'In the Future', searchTerms: [tempoFormat(addDay(new Date(), 1), 'YYYY-MM-DD')], operator: '>=', iconCssClass: 'mdi mdi-calendar-clock', },
          ]
        },
      },
      {
        id: 'completed', name: 'Completed', field: 'completed', width: 80, minWidth: 80, maxWidth: 100,
        sortable: true, filterable: true,
        editor: {
          model: Editors.singleSelect,
          collection: [{ value: true, label: 'True' }, { value: false, label: 'False' }],
          massUpdate: true,
          editorOptions: { showClear: true } as MultipleSelectOption
        },
        filter: {
          model: Filters.singleSelect,
          collection: [{ value: '', label: '' }, { value: true, label: 'True' }, { value: false, label: 'False' }],
          filterOptions: { showClear: true } as MultipleSelectOption
        },
        exportWithFormatter: false,
        formatter: Formatters.checkmarkMaterial,
      },
      {
        id: 'product', name: 'Product', field: 'product',
        filterable: true,
        minWidth: 100,
        exportWithFormatter: true,
        dataKey: 'id',
        labelKey: 'itemName',
        formatter: Formatters.complexObject,
        type: FieldType.object,
        sortComparer: SortComparers.objectString,
        editor: {
          model: Editors.autocompleter,
          alwaysSaveOnEnterKey: true,
          massUpdate: true,
          // example with a Remote API call
          editorOptions: {
            showOnFocus: true,
            minLength: 1,
            fetch: (searchText, updateCallback) => {
              const products = this.mockProducts();
              updateCallback(products.filter(product => product.itemName.toLowerCase().includes(searchText.toLowerCase())));
            },
            renderItem: {
              // layout: 'twoRows',
              // templateCallback: (item: any) => this.renderItemCallbackWith2Rows(item),

              layout: 'fourCorners',
              templateCallback: (item: any) => this.renderItemCallbackWith4Corners(item),
            },
          } as AutocompleterOption,
        },
        filter: {
          model: Filters.inputText,
          // placeholder: '🔎︎ search city',
          type: FieldType.string,
          queryField: 'product.itemName',
        }
      },
      {
        id: 'countryOfOrigin', name: 'Country of Origin', field: 'countryOfOrigin',
        formatter: Formatters.complexObject,
        exportWithFormatter: true,
        dataKey: 'code',
        labelKey: 'name',
        type: FieldType.object,
        sortComparer: SortComparers.objectString,
        filterable: true,
        sortable: true,
        minWidth: 100,
        editor: {
          model: Editors.autocompleter,
          alwaysSaveOnEnterKey: true,
          massUpdate: true,
          editorOptions: {
            minLength: 1,
            fetch: (searchText, updateCallback) => {
              const countries: any[] = JSON.parse(countriesJson);
              const foundCountries = countries.filter((country) => country.name.toLowerCase().includes(searchText.toLowerCase()));
              updateCallback(foundCountries.map(item => ({ label: item.name, value: item.code, })));
            },
          } as AutocompleterOption,
        },
        filter: {
          model: Filters.inputText,
          type: 'string',
          queryField: 'countryOfOrigin.name',
          filterShortcuts: [
            { title: 'Blank Values', searchTerms: ['< A'], iconCssClass: 'mdi mdi-filter-minus-outline', },
            { title: 'Non-Blank Values', searchTerms: ['> A'], iconCssClass: 'mdi mdi-filter-plus-outline', },
          ]
        },
      },
      {
        id: 'action', name: 'Action', field: 'action', minWidth: 70, width: 75, maxWidth: 75,
        excludeFromExport: true,
        formatter: () => `<span class="button-style padding-1px action-btns"title"Delete the Row"><span class="mdi mdi-close text-color-danger" title="Delete Current Row"></span></span>
        &nbsp;<span class="button-style padding-1px action-btns" title="Mark as Completed"><span class="mdi mdi-check-underline"></span></span>`,
        onCellClick: (event: Event, args) => {
          const dataContext = args.dataContext;
          if ((event.target as HTMLElement).classList.contains('mdi-close')) {
            if (confirm(`Do you really want to delete row (${args.row + 1}) with "${dataContext.title}"`)) {
              this.slickerGridInstance?.gridService.deleteItemById(dataContext.id);
            }
          } else if ((event.target as HTMLElement).classList.contains('mdi-check-underline')) {
            this.slickerGridInstance?.gridService.updateItem({ ...dataContext, completed: true });
            alert(`The "${dataContext.title}" is now Completed`);
          }
        }
      },
    ];

    // automatically add a Custom Formatter with blue background for any Editable Fields
    this.autoAddCustomEditorFormatter(this.columnDefinitions, customEditableInputFormatter);

    this.gridOptions = {
      autoEdit: true, // true single click (false for double-click)
      autoCommitEdit: true,
      editable: true,
      autoResize: {
        container: '.demo-container',
      },
      enableAutoSizeColumns: true,
      enableAutoResize: true,
      enableCellNavigation: true,
      showCustomFooter: true,
      enableExcelExport: true,
      excelExportOptions: {
        exportWithFormatter: true
      },
      externalResources: [new ExcelExportService(), new SlickCustomTooltip()],
      enableFiltering: true,
      rowSelectionOptions: {
        // True (Single Selection), False (Multiple Selections)
        selectActiveRow: false
      },
      rowHeight: 33,
      headerRowHeight: 35,
      enableCheckboxSelector: true,
      enableRowSelection: true,
      checkboxSelector: {
        hideInFilterHeaderRow: false,
        hideInColumnTitleRow: true,
      },
      editCommandHandler: (item, column, editCommand) => {
        if (editCommand.prevSerializedValue !== editCommand.serializedValue) {
          this.editQueue.push({ item, column, editCommand });
          this.editedItems[editCommand.row] = item; // keep items by their row indexes, if the row got edited twice then we'll keep only the last change
          this.sgb.slickGrid?.invalidate();
          editCommand.execute();

          const hash = { [editCommand.row]: { [column.id]: 'unsaved-editable-field' } };
          this.sgb.slickGrid?.setCellCssStyles(`unsaved_highlight_${[column.id]}${editCommand.row}`, hash);
        }
      },
      enableContextMenu: true,
      contextMenu: {
        hideCloseButton: false,
        commandItems: [
          {
            command: 'modal',
            title: 'Mass Update',
            iconCssClass: 'mdi mdi-table-edit',
          },
        ],
        onCommand: (e, args) => this.executeCommand(e, args)
      },
      headerMenu: {
        hideFreezeColumnsCommand: false,
        subItemChevronClass: 'mdi mdi-chevron-down mdi-rotate-270',
      },
      gridMenu: {
        hideClearFrozenColumnsCommand: false,
        commandItems: [
          {
            command: 'modal',
            title: 'Mass Update',
            iconCssClass: 'mdi mdi-table-edit',
            positionOrder: 66,
          },
        ],
        onCommand: (e, args) => this.executeCommand(e, args)
      }
    };

    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    const definedPresets = storedData ? JSON.parse(storedData) : null;
    if (definedPresets) {
      const presetSelection = definedPresets.find(presetSelect => presetSelect.isSelected);
      this.predefinedViews = definedPresets;

      if (presetSelection?.filters) {
        this.currentSelectedViewPreset = presetSelection;
        this.dropdownDeleteViewClass = presetSelection.isUserDefined ? 'dropdown-item' : 'dropdown-item dropdown-item-disabled';
        this.dropdownUpdateViewClass = this.dropdownDeleteViewClass;
        this.gridOptions.presets = {
          filters: presetSelection.filters
        };
        if (presetSelection.columns) {
          this.gridOptions.presets.columns = presetSelection.columns;
        }
        if (presetSelection.sorters) {
          this.gridOptions.presets.sorters = presetSelection.sorters;
        }
        if (presetSelection.pinning) {
          this.gridOptions.presets.pinning = presetSelection.pinning;
        }
      }
    }
  }

  loadData(count: number) {
    // mock data
    const tmpArray: any[] = [];
    for (let i = 0; i < count; i++) {
      const randomItemId = Math.floor(Math.random() * this.mockProducts().length);
      const randomYear = 2000 + Math.floor(Math.random() * 10);
      const randomFinishYear = (new Date().getFullYear() - 3) + Math.floor(Math.random() * 10); // use only years not lower than 3 years ago
      const randomMonth = Math.floor(Math.random() * 11);
      const randomDay = Math.floor((Math.random() * 29));
      const randomFinish = new Date(randomFinishYear, (randomMonth + 1), randomDay);
      const randomPercentComplete = Math.floor(Math.random() * 100) + 15; // make it over 15 for E2E testing purposes

      tmpArray[i] = {
        id: i,
        title: 'Task ' + i,
        duration: Math.floor(Math.random() * 100) + 10,
        percentComplete: randomPercentComplete > 100 ? 100 : randomPercentComplete,
        start: new Date(randomYear, randomMonth, randomDay),
        finish: (i < 3) ? '' : randomFinish, // make sure the random date is earlier than today and it's index is bigger than 3
        cost: (i % 33 === 0) ? null : Math.round(Math.random() * 10000) / 100,
        completed: (randomFinish < new Date()),
        product: { id: this.mockProducts()[randomItemId]?.id, itemName: this.mockProducts()[randomItemId]?.itemName, },
        countryOfOrigin: i % 33
          ? (i % 2) ? { code: 'CA', name: 'Canada' } : { code: 'US', name: 'United States' }
          : null
      };

      if (!(i % 8)) {
        delete tmpArray[i].finish; // also test with undefined properties
      }
    }
    return tmpArray;
  }

  handleValidationError(event) {
    console.log('handleValidationError', event.detail);
    const args = event.detail && event.detail.args;
    if (args.validationResults) {
      alert(args.validationResults.msg);
    }
    return false;
  }

  handleItemDeleted(event) {
    const itemId = event && event.detail;
    console.log('item deleted with id:', itemId);
  }

  async executeCommand(_e, args) {
    const command = args.command;
    const dataContext = args.dataContext;

    switch (command) {
      case 'help':
        alert('Please help!');
        break;
      case 'delete-row':
        if (confirm(`Do you really want to delete row (${args.row + 1}) with "${dataContext.title}"`)) {
          this.slickerGridInstance?.gridService.deleteItemById(dataContext.id);
        }
        break;
      case 'modal':
        this.sgb.slickGrid?.getSelectedRows() || [];
        const modalContainerElm = document.querySelector('.modal-container') as HTMLDivElement;
        const columnDefinitionsClone = deepCopy(this.columnDefinitions);
        const massUpdateColumnDefinitions = columnDefinitionsClone?.filter((col: Column) => col.editor?.massUpdate) || [];
        const selectedItems = this.sgb.gridService.getSelectedRowsDataItem();
        const selectedIds = selectedItems.map(selectedItem => selectedItem.id);
        loadComponent(modalContainerElm, exampleModal, Example11Modal, { columnDefinitions: massUpdateColumnDefinitions, selectedIds, remoteCallback: this.remoteCallbackFn.bind(this) });
        break;
    }
  }

  /**
   * Instead of manually adding a Custom Formatter on every column definition that is editable, let's do it in an automated way
   * We'll loop through all column definitions and add a Formatter (blue background) when necessary
   * Note however that if there's already a Formatter on that column definition, we need to turn it into a Formatters.multiple
   */
  autoAddCustomEditorFormatter(columnDefinitions: Column[], customFormatter: Formatter) {
    if (Array.isArray(columnDefinitions)) {
      for (const columnDef of columnDefinitions) {
        if (columnDef.editor) {
          if (columnDef.formatter && columnDef.formatter !== Formatters.multiple) {
            const prevFormatter = columnDef.formatter;
            columnDef.formatter = Formatters.multiple;
            columnDef.params = { ...columnDef.params, formatters: [prevFormatter, customFormatter] };
          } else if (columnDef.formatter && columnDef.formatter === Formatters.multiple) {
            if (!columnDef.params) {
              columnDef.params = {};
            }
            columnDef.params.formatters = [...columnDef.params.formatters, customFormatter];
          } else {
            columnDef.formatter = customFormatter;
          }
        }
      }
    }
  }

  remoteCallbackFn(args: { item: any, selectedIds: string[], updateType: 'selection' | 'mass'; }) {
    const fields: Array<{ fieldName: string; value: any; }> = [];
    for (const key in args.item) {
      if (args.item.hasOwnProperty(key)) {
        fields.push({ fieldName: key, value: args.item[key] });
      }
    }
    console.log('Remote Callback', args, fields);

    if (args.updateType === 'selection' && Array.isArray(args.selectedIds) && args.selectedIds.length > 0) {
      // update only the selected rows
      const updatedItems: any[] = [];
      for (const itemId of args.selectedIds) {
        const dataContext = this.sgb.dataView?.getItemById(itemId);
        for (const itemProp in args.item) {
          if (args.item.hasOwnProperty(itemProp)) {
            const newValue = args.item[itemProp];
            dataContext[itemProp] = newValue;
          }
        }
        updatedItems.push(dataContext);
      }
      this.sgb.gridService.updateItems(updatedItems);
    } else if (args.updateType === 'mass') {
      // update every rows (full mass update)
      for (const itemProp in args.item) {
        if (args.item.hasOwnProperty(itemProp)) {
          this.dataset.forEach(item => item[itemProp] = args.item[itemProp]);
        }
      }
      this.sgb.dataset = this.dataset;
    } else {
      alert('There was nothing to update, have you selected any rows?');
    }
  }

  toggleGridEditReadonly() {
    // first need undo all edits
    this.undoAllEdits();

    // then change a single grid options to make the grid non-editable (readonly)
    this.isGridEditable = !this.isGridEditable;
    this.sgb.gridOptions = { editable: this.isGridEditable };
    this.gridOptions = this.sgb.gridOptions;
  }

  removeUnsavedStylingFromCell(_item: any, column: Column, row: number) {
    // remove unsaved css class from that cell
    this.sgb.slickGrid?.removeCellCssStyles(`unsaved_highlight_${[column.field]}${row}`);
  }

  removeAllUnsavedStylingFromCell() {
    for (const lastEdit of this.editQueue) {
      const lastEditCommand = lastEdit?.editCommand;
      if (lastEditCommand) {
        // remove unsaved css class from that cell
        this.removeUnsavedStylingFromCell(lastEdit.item, lastEdit.column, lastEditCommand.row);
      }
    }
  }

  saveAll() {
    // Edit Queue (array increases every time a cell is changed, regardless of item object)
    console.log(this.editQueue);

    // Edit Items only keeps the merged data (an object with row index as the row properties)
    // if you change 2 different cells on 2 different cells then this editedItems will only contain 1 property
    // example: editedItems = { 0: { title: task 0, duration: 50, ... }}
    // ...means that row index 0 got changed and the final merged object is { title: task 0, duration: 50, ... }
    console.log(this.editedItems);
    // console.log(`We changed ${Object.keys(this.editedItems).length} rows`);

    // since we saved, we can now remove all the unsaved color styling and reset our array/object
    this.removeAllUnsavedStylingFromCell();
    this.editQueue = [];
    this.editedItems = {};
  }

  undoLastEdit(showLastEditor = false) {
    const lastEdit = this.editQueue.pop();
    const lastEditCommand = lastEdit?.editCommand;
    if (lastEdit && lastEditCommand && SlickGlobalEditorLock.cancelCurrentEdit()) {
      lastEditCommand.undo();

      // remove unsaved css class from that cell
      this.removeUnsavedStylingFromCell(lastEdit.item, lastEdit.column, lastEditCommand.row);
      this.sgb.slickGrid?.invalidate();


      // optionally open the last cell editor associated
      if (showLastEditor) {
        this.sgb?.slickGrid?.gotoCell(lastEditCommand.row, lastEditCommand.cell, false);
      }
    }
  }

  undoAllEdits() {
    for (const lastEdit of this.editQueue) {
      const lastEditCommand = lastEdit?.editCommand;
      if (lastEditCommand && SlickGlobalEditorLock.cancelCurrentEdit()) {
        lastEditCommand.undo();

        // remove unsaved css class from that cell
        this.removeUnsavedStylingFromCell(lastEdit.item, lastEdit.column, lastEditCommand.row);
      }
    }
    this.sgb.slickGrid?.invalidate(); // re-render the grid only after every cells got rolled back
    this.editQueue = [];
  }

  // --
  // PreDefined View Methods
  // -----------------------------

  pushNewViewToViewsList(predefinedViews: ViewDefinition | ViewDefinition[], isOptionSelected = false) {
    if (isOptionSelected) {
      this.predefinedViews.forEach(viewSelect => viewSelect.isSelected = false); // reset selection
    }
    const presetViews: ViewDefinition[] = Array.isArray(predefinedViews) ? predefinedViews : [predefinedViews];

    // empty an empty <option> when populating the array on page load
    if (Array.isArray(predefinedViews)) {
      this.viewSelectElm.appendChild(document.createElement('option'));
    }

    for (const preset of presetViews) {
      const selectOption = document.createElement('option');
      selectOption.value = preset.value;
      selectOption.label = preset.label;
      selectOption.selected = isOptionSelected || preset.isSelected || false;
      this.viewSelectElm.appendChild(selectOption);
    }
  }

  clearLocalStorage() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    this.resetFiltersSortingAndColumns();
    this.predefinedViews = this.defaultPredefinedPresets;
    this.recreatePredefinedViews();
    this.dropdownDeleteViewClass = 'dropdown-item dropdown-item-disabled';
    this.dropdownUpdateViewClass = 'dropdown-item dropdown-item-disabled';
  }

  recreatePredefinedViews() {
    // empty the Select dropdown element and re-populate it
    if (this.viewSelectElm) {
      this.viewSelectElm.textContent = '';
    }
    this.pushNewViewToViewsList(this.predefinedViews);
  }

  async createView(event) {
    if (event.target.disabled) {
      event.stopPropagation();
      return;
    }

    this.predefinedViews.forEach(viewSelect => viewSelect.isSelected = false); // reset selection
    const currentGridState = this.sgb.gridStateService.getCurrentGridState();
    const { columns, filters, sorters, pinning } = currentGridState;

    const viewName = await prompt('Please provide a name for the new View.');
    if (viewName) {
      const newPredefinedView = {
        label: viewName,
        value: viewName.replace(/\s/g, ''),
        isSelected: true,
        isUserDefined: true,

        // create a copy to avoid changing the original one
        columns: deepCopy(columns),
        filters: deepCopy(filters),
        sorters: deepCopy(sorters),
        pinning: deepCopy(pinning),
      };

      this.dropdownDeleteViewClass = 'dropdown-item';
      this.dropdownUpdateViewClass = 'dropdown-item';
      this.pushNewViewToViewsList(newPredefinedView, true);
      this.predefinedViews.push(newPredefinedView);
      this.currentSelectedViewPreset = newPredefinedView;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.predefinedViews));
  }

  deleteView(event) {
    if (event.target.disabled) {
      event.stopPropagation();
      return;
    }
    if (this.currentSelectedViewPreset) {
      const selectedViewIndex = this.predefinedViews.findIndex(preset => preset.value === this.currentSelectedViewPreset?.value);
      this.predefinedViews.splice(selectedViewIndex, 1);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.predefinedViews));
    this.resetFiltersSortingAndColumns();
    this.recreatePredefinedViews();
    this.dropdownDeleteViewClass = 'dropdown-item dropdown-item-disabled';
    this.dropdownUpdateViewClass = 'dropdown-item dropdown-item-disabled';
  }

  resetFiltersSortingAndColumns() {
    this.sgb.gridStateService.resetToOriginalColumns();
    this.sgb.filterService.clearFilters();
    this.sgb.sortService.clearSorting();
    this.sgb.gridService.clearPinning();
  }

  async updateView(event: DOMEvent<HTMLInputElement>) {
    if (event.target.disabled) {
      event.stopPropagation();
      return;
    }
    const currentGridState = this.sgb.gridStateService.getCurrentGridState();
    const { columns, filters, sorters, pinning } = currentGridState;

    if (this.currentSelectedViewPreset && filters) {
      const filterName = await prompt(`Update View name or click on OK to continue.`, this.currentSelectedViewPreset.label) as string;
      this.currentSelectedViewPreset.label = filterName;
      this.currentSelectedViewPreset.value = filterName.replace(/\s/g, '');
      this.currentSelectedViewPreset.columns = columns || [];
      this.currentSelectedViewPreset.filters = filters || [];
      this.currentSelectedViewPreset.sorters = sorters || [];
      this.currentSelectedViewPreset.pinning = pinning || {};
      this.recreatePredefinedViews();
      localStorage.setItem('gridViewPreset', JSON.stringify(this.predefinedViews));
    }
  }

  usePredefinedView(viewName: string) {
    this.predefinedViews.forEach(view => view.isSelected = false); // reset selection
    const selectedView = this.predefinedViews.find(view => view.value === viewName);
    if (selectedView) {
      selectedView.isSelected = true;
      this.dropdownDeleteViewClass = selectedView.isUserDefined ? 'dropdown-item' : 'dropdown-item dropdown-item-disabled';
      this.dropdownUpdateViewClass = this.dropdownDeleteViewClass;

      const columns = selectedView?.columns ?? [];
      const filters = selectedView?.filters ?? [];
      const sorters = selectedView?.sorters ?? [];
      const pinning = selectedView?.pinning ?? { frozenBottom: false, frozenColumn: -1, frozenRow: -1 };
      this.sgb.filterService.updateFilters(filters as CurrentFilter[]);
      this.sgb.sortService.updateSorting(sorters as CurrentSorter[]);
      this.sgb.gridService.setPinning(pinning);
      this.sgb.gridStateService.changeColumnsArrangement(columns);
    } else {
      this.sgb.gridService.clearPinning();
      this.sgb.filterService.clearFilters();
      this.sgb.sortService.clearSorting();
      this.sgb.gridStateService.changeColumnsArrangement([...this.columnDefinitions].map(col => ({ columnId: `${col.id}` })));
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.predefinedViews));
    this.currentSelectedViewPreset = selectedView;
    this.sgb.slickGrid?.scrollColumnIntoView(0);
  }

  mockProducts() {
    return [
      {
        id: 0,
        itemName: 'Sleek Metal Computer',
        itemNameTranslated: 'some fantastic sleek metal computer description',
        listPrice: 2100.23,
        itemTypeName: 'I',
        image: 'http://i.stack.imgur.com/pC1Tv.jpg',
        icon: `mdi ${this.getRandomIcon(0)}`,
      },
      {
        id: 1,
        itemName: 'Tasty Granite Table',
        itemNameTranslated: 'an extremely huge and heavy table',
        listPrice: 3200.12,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/Fnm7j6h.jpg',
        icon: `mdi ${this.getRandomIcon(1)}`,
      },
      {
        id: 2,
        itemName: 'Awesome Wooden Mouse',
        itemNameTranslated: 'super old mouse',
        listPrice: 15.00,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/RaVJuLr.jpg',
        icon: `mdi ${this.getRandomIcon(2)}`,
      },
      {
        id: 3,
        itemName: 'Gorgeous Fresh Shirt',
        itemNameTranslated: 'what a gorgeous shirt seriously',
        listPrice: 25.76,
        itemTypeName: 'I',
        image: 'http://i.stack.imgur.com/pC1Tv.jpg',
        icon: `mdi ${this.getRandomIcon(3)}`,
      },
      {
        id: 4,
        itemName: 'Refined Cotton Table',
        itemNameTranslated: 'super light table that will fall apart amazingly fast',
        listPrice: 13.35,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/Fnm7j6h.jpg',
        icon: `mdi ${this.getRandomIcon(4)}`,
      },
      {
        id: 5,
        itemName: 'Intelligent Wooden Pizza',
        itemNameTranslated: 'wood not included',
        listPrice: 23.33,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/RaVJuLr.jpg',
        icon: `mdi ${this.getRandomIcon(5)}`,
      },
      {
        id: 6,
        itemName: 'Licensed Cotton Chips',
        itemNameTranslated: 'not sure what that is',
        listPrice: 71.21,
        itemTypeName: 'I',
        image: 'http://i.stack.imgur.com/pC1Tv.jpg',
        icon: `mdi ${this.getRandomIcon(6)}`,
      },
      {
        id: 7,
        itemName: 'Ergonomic Rubber Soap',
        itemNameTranslated: `so good you'll want to use it every night`,
        listPrice: 2.43,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/Fnm7j6h.jpg',
        icon: `mdi ${this.getRandomIcon(7)}`,
      },
      {
        id: 8,
        itemName: 'Handcrafted Steel Car',
        itemNameTranslated: `aka tesla truck`,
        listPrice: 31288.39,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/RaVJuLr.jpg',
        icon: `mdi ${this.getRandomIcon(8)}`,
      },
    ];
  }

  /** List of icons that are supported in this lib Material Design Icons */
  getRandomIcon(iconIndex?: number) {
    const icons = [
      'mdi-arrow-collapse',
      'mdi-arrow-expand',
      'mdi-cancel',
      'mdi-check',
      'mdi-checkbox-blank-outline',
      'mdi-check-box-outline',
      'mdi-checkbox-marked',
      'mdi-close',
      'mdi-close-circle',
      'mdi-close-circle-outline',
      'mdi-close-thick',
      'mdi-content-copy',
      'mdi-database-refresh',
      'mdi-download',
      'mdi-file-document-outline',
      'mdi-file-excel-outline',
      'mdi-file-music-outline',
      'mdi-file-pdf-outline',
      'mdi-filter-remove-outline',
      'mdi-flip-vertical',
      'mdi-folder',
      'mdi-folder-open',
      'mdi-help-circle',
      'mdi-help-circle-outline',
      'mdi-history',
      'mdi-information',
      'mdi-information-outline',
      'mdi-link',
      'mdi-link-variant',
      'mdi-menu',
      'mdi-microsoft-excel',
      'mdi-minus',
      'mdi-page-first',
      'mdi-page-last',
      'mdi-paperclip',
      'mdi-pin-off-outline',
      'mdi-pin-outline',
      'mdi-playlist-plus',
      'mdi-playlist-remove',
      'mdi-plus',
      'mdi-redo',
      'mdi-refresh',
      'mdi-shape-square-plus',
      'mdi-sort-ascending',
      'mdi-sort-descending',
      'mdi-swap-horizontal',
      'mdi-swap-vertical',
      'mdi-sync',
      'mdi-table-edit',
      'mdi-table-refresh',
      'mdi-undo',
    ];
    const randomNumber = Math.floor((Math.random() * icons.length - 1));
    return icons[iconIndex ?? randomNumber];
  }

  renderItemCallbackWith2Rows(item: any): string {
    return `<div class="autocomplete-container-list">
      <div class="autocomplete-left">
        <!--<img src="http://i.stack.imgur.com/pC1Tv.jpg" width="50" />-->
        <span class="mdi ${item.icon} mdi-26px"></span>
      </div>
      <div>
        <span class="autocomplete-top-left">
          <span class="mdi ${item.itemTypeName === 'I' ? 'mdi-information-outline' : 'mdi-content-copy'} mdi-14px"></span>
          ${item.itemName}
        </span>
      <div>
    </div>
    <div>
      <div class="autocomplete-bottom-left">${item.itemNameTranslated}</div>
    </div>`;
  }

  renderItemCallbackWith4Corners(item: any): string {
    return `<div class="autocomplete-container-list">
          <div class="autocomplete-left">
            <!--<img src="http://i.stack.imgur.com/pC1Tv.jpg" width="50" />-->
            <span class="mdi ${item.icon} mdi-26px"></span>
          </div>
          <div>
            <span class="autocomplete-top-left">
              <span class="mdi ${item.itemTypeName === 'I' ? 'mdi-information-outline' : 'mdi-content-copy'} mdi-14px"></span>
              ${item.itemName}
            </span>
            <span class="autocomplete-top-right">${formatNumber(item.listPrice, 2, 2, false, '$')}</span>
          <div>
        </div>
        <div>
          <div class="autocomplete-bottom-left">${item.itemNameTranslated}</div>
          <span class="autocomplete-bottom-right">Type: <b>${item.itemTypeName === 'I' ? 'Item' : item.itemTypeName === 'C' ? 'PdCat' : 'Cat'}</b></span>
        </div>`;
  }
}