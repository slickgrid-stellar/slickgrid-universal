import {
  type AutocompleterOption,
  type Column,
  type CompositeEditorModalType,
  type EditCommand,
  Editors,
  EventNamingStyle,
  FieldType,
  Filters,
  type Formatter,
  Formatters,
  type GridOption,
  type LongTextEditorOption,
  type OnCompositeEditorChangeEventArgs,
  SlickGlobalEditorLock,
  type SliderOption,
  SortComparers,
  type VanillaCalendarOption,

  // utilities
  formatNumber,
} from '@slickgrid-universal/common';
import { BindingEventService } from '@slickgrid-universal/binding';
import { ExcelExportService } from '@slickgrid-universal/excel-export';
import { type SlickerGridInstance } from '@slickgrid-universal/vanilla-bundle';
import { Slicker, type VanillaForceGridBundle } from '@slickgrid-universal/vanilla-force-bundle';
import { SlickCompositeEditor, SlickCompositeEditorComponent } from '@slickgrid-universal/composite-editor-component';
import { type MultipleSelectOption } from 'multiple-select-vanilla';

import { ExampleGridOptions } from './example-grid-options.js';
import countriesJson from './data/countries.json?raw';
import './example12.scss';

// you can create custom validator to pass to an inline editor
const myCustomTitleValidator = (value, args) => {
  if ((value === null || value === undefined || !value.length) && (args.compositeEditorOptions && args.compositeEditorOptions.modalType === 'create' || args.compositeEditorOptions.modalType === 'edit')) {
    // we will only check if the field is supplied when it's an inline editing OR a composite editor of type create/edit
    return { valid: false, msg: 'This is a required field.' };
  } else if (!/^(task\s\d+)*$/i.test(value)) {
    return { valid: false, msg: 'Your title is invalid, it must start with "Task" followed by a number.' };
  }
  return { valid: true, msg: '' };
};

/**
 * Check if the current item (cell) is editable or not
 * @param {*} dataContext - item data context object
 * @param {*} columnDef - column definition
 * @param {*} grid - slickgrid grid object
 * @returns {boolean} isEditable
 */
function checkItemIsEditable(dataContext, columnDef, grid) {
  const gridOptions = grid.getOptions();
  const hasEditor = columnDef.editor;
  const isGridEditable = gridOptions.editable;
  let isEditable = (isGridEditable && hasEditor);

  if (dataContext && columnDef && gridOptions?.editable) {
    switch (columnDef.id) {
      case 'finish':
        // case 'percentComplete':
        isEditable = !!dataContext?.completed;
        break;
      // case 'completed':
      // case 'duration':
      // case 'title':
      // case 'product':
      // case 'origin':
      // isEditable = dataContext.percentComplete < 50;
      // break;
    }
  }
  return isEditable;
}

const customEditableInputFormatter: Formatter = (_row, _cell, value, columnDef, dataContext, grid) => {
  const isEditableItem = checkItemIsEditable(dataContext, columnDef, grid);
  value = (value === null || value === undefined) ? '' : value;
  const divElm = document.createElement('div');
  divElm.className = 'editing-field';
  if (value instanceof HTMLElement) {
    divElm.appendChild(value);
  } else {
    divElm.textContent = value;
  }
  return isEditableItem ? divElm : value;
};

export default class Example12 {
  private _bindingEventService: BindingEventService;
  private _darkMode = false;
  compositeEditorInstance: SlickCompositeEditorComponent;
  columnDefinitions: Column[];
  gridOptions: GridOption;
  dataset: any[] = [];
  isGridEditable = true;
  editQueue: Array<{ item, columns: Column[], editCommand; }> = [];
  editedItems = {};
  isCompositeDisabled = false;
  isMassSelectionDisabled = true;
  gridContainerElm: HTMLDivElement;
  cellCssStyleQueue: string[] = [];
  complexityLevelList = [
    { value: 0, label: 'Very Simple' },
    { value: 1, label: 'Simple' },
    { value: 2, label: 'Straightforward' },
    { value: 3, label: 'Complex' },
    { value: 4, label: 'Very Complex' },
  ];

  // you would typically use `SlickVanillaGridBundle` instead, we use `VanillaForceGridBundle` just to test that Salesforce package
  sgb: VanillaForceGridBundle;

  get slickerGridInstance(): SlickerGridInstance | undefined {
    return this.sgb?.instances;
  }

  constructor() {
    this.compositeEditorInstance = new SlickCompositeEditorComponent();
    this._bindingEventService = new BindingEventService();
  }

  attached() {
    this.initializeGrid();
    this.dataset = this.loadData(500);
    this.gridContainerElm = document.querySelector<HTMLDivElement>(`.grid12`) as HTMLDivElement;

    this.sgb = new Slicker.GridBundle(this.gridContainerElm, this.columnDefinitions, { ...ExampleGridOptions, ...this.gridOptions });
    this.sgb.dataset = this.dataset;
    // this.sgb.slickGrid.setActiveCell(0, 0);

    // bind any of the grid events
    this._bindingEventService.bind(this.gridContainerElm, 'onvalidationerror', this.handleValidationError.bind(this));
    this._bindingEventService.bind(this.gridContainerElm, 'onitemdeleted', this.handleItemDeleted.bind(this));
    this._bindingEventService.bind(this.gridContainerElm, 'onbeforeeditcell', this.handleOnBeforeEditCell.bind(this));
    this._bindingEventService.bind(this.gridContainerElm, 'oncellchange', this.handleOnCellChange.bind(this));
    this._bindingEventService.bind(this.gridContainerElm, 'onclick', this.handleOnCellClicked.bind(this));
    this._bindingEventService.bind(this.gridContainerElm, 'ongridstatechanged', this.handleOnGridStateChanged.bind(this));
    this._bindingEventService.bind(this.gridContainerElm, 'ondblclick', () => this.openCompositeModal('edit', 50));
    this._bindingEventService.bind(this.gridContainerElm, 'oncompositeeditorchange', this.handleOnCompositeEditorChange.bind(this));
    this._bindingEventService.bind(this.gridContainerElm, 'onrowsorcountchanged', this.handleReRenderUnsavedStyling.bind(this));
    this._bindingEventService.bind(this.gridContainerElm, 'onselectedrowidschanged', this.handleOnSelectedRowIdsChanged.bind(this));
  }

  dispose() {
    this.sgb?.dispose();
    this._bindingEventService.unbindAll();
    this.gridContainerElm.remove();
    document.querySelector('.demo-container')?.classList.remove('dark-mode');
    document.body.setAttribute('data-theme', 'light');
  }

  initializeGrid() {
    this.columnDefinitions = [
      {
        id: 'title', name: '<span title="Task must always be followed by a number" class="text-color-warning-dark mdi mdi-alert-outline"></span> Title <span title="Title is always rendered as UPPERCASE" class="mdi mdi-information-outline"></span>', field: 'title', sortable: true, type: FieldType.string, minWidth: 75,
        cssClass: 'text-bold text-uppercase',
        filterable: true, columnGroup: 'Common Factor',
        filter: { model: Filters.compoundInputText },
        editor: {
          model: Editors.longText, massUpdate: false, required: true, alwaysSaveOnEnterKey: true,
          maxLength: 12,
          editorOptions: {
            cols: 45,
            rows: 6,
            buttonTexts: {
              cancel: 'Close',
              save: 'Done'
            }
          } as LongTextEditorOption,
          validator: myCustomTitleValidator,
        },
      },
      {
        id: 'duration', name: 'Duration', field: 'duration', sortable: true, filterable: true, minWidth: 75,
        type: FieldType.number, columnGroup: 'Common Factor',
        formatter: (_row, _cell, value) => {
          if (value === null || value === undefined || value === '') {
            return '';
          }
          return value > 1 ? `${value} days` : `${value} day`;
        },
        editor: { model: Editors.float, massUpdate: true, decimal: 2, valueStep: 1, minValue: 0, maxValue: 10000, alwaysSaveOnEnterKey: true, required: true },
      },
      {
        id: 'cost', name: 'Cost', field: 'cost', width: 90, minWidth: 70,
        sortable: true, filterable: true, type: FieldType.number, columnGroup: 'Analysis',
        filter: { model: Filters.compoundInputNumber },
        formatter: Formatters.dollar,
      },
      {
        id: 'percentComplete', name: '% Complete', field: 'percentComplete', minWidth: 100,
        type: FieldType.number,
        sortable: true, filterable: true, columnGroup: 'Analysis',
        filter: { model: Filters.compoundSlider, operator: '>=' },
        editor: {
          model: Editors.slider,
          massUpdate: true, minValue: 0, maxValue: 100,
        },
        customTooltip: { position: 'center' }
      },
      // {
      //   id: 'percentComplete2', name: '% Complete', field: 'analysis.percentComplete', minWidth: 100,
      //   type: FieldType.number,
      //   sortable: true, filterable: true, columnGroup: 'Analysis',
      //   // filter: { model: Filters.compoundSlider, operator: '>=' },
      //   formatter: Formatters.complex,
      //   exportCustomFormatter: Formatters.complex, // without the Editing cell Formatter
      //   editor: {
      //     model: Editors.singleSelect,
      //     serializeComplexValueFormat: 'flat', // if we keep "object" as the default it will apply { value: 2, label: 2 } which is not what we want in this case
      //     collection: Array.from(Array(101).keys()).map(k => ({ value: k, label: k })),
      //     collectionOptions: {
      //       addCustomFirstEntry: { value: '', label: '--none--' }
      //     },
      //     collectionOverride: (_collectionInput, args) => {
      //       const originalCollection = args.originalCollections || [];
      //       const duration = args?.dataContext?.duration ?? args?.compositeEditorOptions?.formValues?.duration;
      //       if (duration === 10) {
      //         return originalCollection.filter(itemCollection => +itemCollection.value !== 1);
      //       }
      //       return originalCollection;
      //     },
      //     massUpdate: true, minValue: 0, maxValue: 100,
      //   },
      // },
      {
        id: 'complexity', name: 'Complexity', field: 'complexity', minWidth: 100,
        type: FieldType.number,
        sortable: true, filterable: true, columnGroup: 'Analysis',
        formatter: (_row, _cell, value) => this.complexityLevelList[value]?.label,
        exportCustomFormatter: (_row, _cell, value) => this.complexityLevelList[value]?.label,
        filter: {
          model: Filters.multipleSelect,
          collection: this.complexityLevelList,
          filterOptions: { showClear: true } as MultipleSelectOption,
        },
        editor: {
          model: Editors.singleSelect,
          collection: this.complexityLevelList,
          massUpdate: true
        },
      },
      {
        id: 'start', name: 'Start', field: 'start', sortable: true, minWidth: 100,
        formatter: Formatters.dateUs, columnGroup: 'Period',
        exportCustomFormatter: Formatters.dateUs,
        type: FieldType.date, outputType: FieldType.dateUs, saveOutputType: FieldType.dateUtc,
        filterable: true, filter: { model: Filters.compoundDate },
        editor: { model: Editors.date, massUpdate: true, editorOptions: { hideClearButton: false } as SliderOption },
      },
      {
        id: 'completed', name: 'Completed', field: 'completed', width: 80, minWidth: 75, maxWidth: 100,
        sortable: true, filterable: true, columnGroup: 'Period', cssClass: 'text-center',
        formatter: Formatters.checkmarkMaterial,
        exportWithFormatter: false,
        filter: {
          collection: [{ value: '', label: '' }, { value: true, label: 'True' }, { value: false, label: 'False' }],
          model: Filters.singleSelect,
          filterOptions: { showClear: true } as MultipleSelectOption,
        },
        editor: { model: Editors.checkbox, massUpdate: true, },
        // editor: { model: Editors.singleSelect, collection: [{ value: true, label: 'Yes' }, { value: false, label: 'No' }], },
      },
      {
        id: 'finish', name: 'Finish', field: 'finish', sortable: true, minWidth: 100,
        formatter: Formatters.dateUs, columnGroup: 'Period',
        type: FieldType.date, outputType: FieldType.dateUs, saveOutputType: FieldType.dateUtc,
        filterable: true, filter: { model: Filters.compoundDate },
        exportCustomFormatter: Formatters.dateUs,
        editor: {
          model: Editors.date,
          editorOptions: {
            displayDateMin: 'today', // set minimum date as today

            // if we want to preload the date picker with a different date,
            // we could do it by assigning `selectedDates: []`
            // NOTE: vanilla-calendar doesn't automatically focus the picker to the year/month and you need to do it yourself
            //  selectedDates: ['2021-06-04'],
            //  selectedMonth: 6 - 1, // Note: JS Date month (only) is zero index based, so June is 6-1 => 5
            //  selectedYear: 2021
          } as VanillaCalendarOption,
          massUpdate: true,
          validator: (value, args) => {
            const dataContext = args && args.item;
            if (dataContext && (dataContext.completed && !value)) {
              return { valid: false, msg: 'You must provide a "Finish" date when "Completed" is checked.' };
            }
            return { valid: true, msg: '' };
          }
        },
      },
      {
        id: 'product', name: 'Product', field: 'product',
        filterable: true, columnGroup: 'Item',
        minWidth: 100,
        exportWithFormatter: true,
        dataKey: 'id',
        labelKey: 'itemName',
        formatter: Formatters.complexObject,
        exportCustomFormatter: Formatters.complex, // without the Editing cell Formatter
        type: FieldType.object,
        sortComparer: SortComparers.objectString,
        editor: {
          model: Editors.autocompleter,
          alwaysSaveOnEnterKey: true,
          massUpdate: true,

          // example with a Remote API call
          editorOptions: {
            minLength: 1,
            fetch: (searchTerm, callback) => {
              const products = this.mockProducts();
              callback(products.filter(product => product.itemName.toLowerCase().includes(searchTerm.toLowerCase())));
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
          // placeholder: '🔎︎ search product',
          type: FieldType.string,
          queryField: 'product.itemName',
        }
      },
      {
        id: 'origin', name: 'Country of Origin', field: 'origin',
        formatter: Formatters.complexObject, columnGroup: 'Item',
        exportCustomFormatter: Formatters.complex, // without the Editing cell Formatter
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
            minLength: 0,
            showOnFocus: false,
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
          queryField: 'origin.name',
        }
      },
      {
        id: 'action', name: 'Action', field: 'action', width: 70, minWidth: 70, maxWidth: 70,
        excludeFromExport: true,
        cssClass: 'justify-center flex',
        formatter: () => `<div class="button-style action-btn"><span class="mdi mdi-dots-vertical mdi-22px text-color-primary"></span></div>`,
        cellMenu: {
          hideCloseButton: false,
          commandTitle: 'Commands',
          commandItems: [
            {
              command: 'edit',
              title: 'Edit Row',
              iconCssClass: 'mdi mdi-square-edit-outline',
              positionOrder: 66,
              action: () => this.openCompositeModal('edit'),
            },
            {
              command: 'clone',
              title: 'Clone Row',
              iconCssClass: 'mdi mdi-content-copy',
              positionOrder: 66,
              action: () => this.openCompositeModal('clone'),
            },
            'divider',
            {
              command: 'delete-row', title: 'Delete Row', positionOrder: 64,
              iconCssClass: 'mdi mdi-close', cssClass: 'has-text-danger', textCssClass: 'text-italic',
              // only show command to 'Delete Row' when the task is not completed
              itemVisibilityOverride: (args) => {
                return !args.dataContext?.completed;
              },
              action: (_event, args) => {
                const dataContext = args.dataContext;
                if (confirm(`Do you really want to delete row (${args.row! + 1}) with "${dataContext.title}"`)) {
                  this.slickerGridInstance?.gridService.deleteItemById(dataContext.id);
                }
              }
            },
          ],
        }
      },
    ];

    this.gridOptions = {
      useSalesforceDefaultGridOptions: true,
      autoFixResizeRequiredGoodCount: 1,
      datasetIdPropertyName: 'id',
      darkMode: this._darkMode,
      eventNamingStyle: EventNamingStyle.lowerCase,
      autoAddCustomEditorFormatter: customEditableInputFormatter,
      enableAddRow: true, // <-- this flag is required to work with the (create & clone) modal types
      enableCellNavigation: true,
      asyncEditorLoading: false,
      autoEdit: true,
      autoCommitEdit: true,
      editable: true,
      autoResize: {
        container: '.demo-container',
      },
      enableAutoSizeColumns: true,
      enableAutoResize: true,
      showCustomFooter: true,
      enablePagination: true,
      pagination: {
        pageSize: 10,
        pageSizes: [10, 200, 500, 5000]
      },
      enableExcelExport: true,
      excelExportOptions: {
        exportWithFormatter: false
      },
      externalResources: [new ExcelExportService(), this.compositeEditorInstance],
      enableFiltering: true,
      rowSelectionOptions: {
        // True (Single Selection), False (Multiple Selections)
        selectActiveRow: false
      },
      createPreHeaderPanel: true,
      showPreHeaderPanel: true,
      preHeaderPanelHeight: 28,
      rowHeight: 33,
      headerRowHeight: 35,
      enableCheckboxSelector: true,
      enableRowSelection: true,
      checkboxSelector: {
        applySelectOnAllPages: true,
        hideInFilterHeaderRow: false,
        hideInColumnTitleRow: true,
      },
      enableCompositeEditor: true,
      editCommandHandler: (item, column, editCommand) => {
        // composite editors values are saved as array, so let's convert to array in any case and we'll loop through these values
        const prevSerializedValues = Array.isArray(editCommand.prevSerializedValue) ? editCommand.prevSerializedValue : [editCommand.prevSerializedValue];
        const serializedValues = Array.isArray(editCommand.serializedValue) ? editCommand.serializedValue : [editCommand.serializedValue];
        const editorColumns = this.columnDefinitions.filter((col) => col.editor !== undefined);

        const modifiedColumns: Column[] = [];
        prevSerializedValues.forEach((_val, index) => {
          const prevSerializedValue = prevSerializedValues[index];
          const serializedValue = serializedValues[index];

          if (prevSerializedValue !== serializedValue || serializedValue === '') {
            const finalColumn = Array.isArray(editCommand.prevSerializedValue) ? editorColumns[index] : column;
            this.editedItems[this.gridOptions.datasetIdPropertyName || 'id'] = item; // keep items by their row indexes, if the row got edited twice then we'll keep only the last change
            this.sgb.slickGrid?.invalidate();
            editCommand.execute();

            this.renderUnsavedCellStyling(item, finalColumn, editCommand);
            modifiedColumns.push(finalColumn);
          }
        });

        // queued editor only keeps 1 item object even when it's a composite editor,
        // so we'll push only 1 change at the end but with all columns modified
        // this way we can undo the entire row change (for example if user changes 3 field in the editor modal, then doing a undo last change will undo all 3 in 1 shot)
        this.editQueue.push({ item, columns: modifiedColumns, editCommand });
      },
      // when using the cellMenu, you can change some of the default options and all use some of the callback methods
      enableCellMenu: true,
      cellMenu: {
        activateCellOnMenuClick: true, // this is important to know which row index to use for Composite Editor
      },
      gridMenu: {
        hideToggleDarkModeCommand: false, // disabled command by default
        onCommand: (_, args) => {
          if (args.command === 'toggle-dark-mode') {
            this._darkMode = !this._darkMode; // keep local toggle var in sync
            this.toggleBodyBackground();
          }
        }
      },
      skipCompoundOperatorFilterWithNullInput: true
    };
  }

  loadData(count: number) {
    // mock data
    const tmpArray: any[] = [];
    for (let i = 0; i < count; i++) {
      const randomItemId = Math.floor(Math.random() * this.mockProducts().length);
      const randomYear = 2000 + Math.floor(Math.random() * 10);
      const randomFinishYear = (new Date().getFullYear()) + Math.floor(Math.random() * 10); // use only years not lower than 3 years ago
      const randomMonth = Math.floor(Math.random() * 11);
      const randomDay = Math.floor((Math.random() * 29));
      const randomTime = Math.floor((Math.random() * 59));
      const randomFinish = new Date(randomFinishYear, (randomMonth + 1), randomDay, randomTime, randomTime, randomTime);
      const randomPercentComplete = Math.floor(Math.random() * 100) + 15; // make it over 15 for E2E testing purposes
      const percentCompletion = randomPercentComplete > 100 ? (i > 5 ? 100 : 88) : randomPercentComplete; // don't use 100 unless it's over index 5, for E2E testing purposes
      const isCompleted = percentCompletion === 100;

      tmpArray[i] = {
        id: i,
        title: 'Task ' + i,
        duration: Math.floor(Math.random() * 100) + 10,
        percentComplete: percentCompletion,
        analysis: {
          percentComplete: percentCompletion,
        },
        complexity: i % 3 ? 0 : 2,
        start: new Date(randomYear, randomMonth, randomDay, randomDay, randomTime, randomTime, randomTime),
        finish: (isCompleted || (i % 3 === 0 && (randomFinish > new Date() && i > 3)) ? (isCompleted ? new Date() : randomFinish) : ''), // make sure the random date is earlier than today and it's index is bigger than 3
        cost: (i % 33 === 0) ? null : Math.round(Math.random() * 10000) / 100,
        completed: (isCompleted || (i % 3 === 0 && (randomFinish > new Date() && i > 3))),
        product: { id: this.mockProducts()[randomItemId]?.id, itemName: this.mockProducts()[randomItemId]?.itemName, },
        origin: (i % 2) ? { code: 'CA', name: 'Canada' } : { code: 'US', name: 'United States' },
      };

      if (!(i % 8)) {
        // also test with undefined properties
        delete tmpArray[i].finish;
        delete tmpArray[i].percentComplete;
        delete tmpArray[i].analysis.percentComplete;
      }
    }
    return tmpArray;
  }

  handleValidationError(event) {
    const args = event.detail?.args;
    console.log('handleValidationError', event.detail);
    if (args.validationResults) {
      let errorMsg = args.validationResults.msg || '';
      if (args?.editor instanceof SlickCompositeEditor) {
        if (args.validationResults.errors) {
          errorMsg += '\n';
          for (const error of args.validationResults.errors) {
            const columnName = error.editor.args.column.name;
            errorMsg += `${columnName.toUpperCase()}: ${error.msg}`;
          }
        }
        // this.compositeEditorInstance.showValidationSummaryText(true, errorMsg);
        console.log(errorMsg);
      }
    } else {
      alert(args.validationResults.msg);
    }
    return false;
  }

  handleItemDeleted(event) {
    const itemId = event?.detail;
    console.log('item deleted with id:', itemId);
  }

  handleOnBeforeEditCell(event) {
    // const eventData = event.detail?.eventData;
    const args = event?.detail?.args;
    const { column, item, grid } = args;

    if (column && item) {
      if (!checkItemIsEditable(item, column, grid)) {
        event.preventDefault(); // OR eventData.preventDefault();
        return false;
      }
    }
    return true;
  }

  handleOnCellChange(event) {
    const args = event?.detail?.args;
    const dataContext = args?.item;
    console.log('cell change', args);

    // when the field "completed" changes to false, we also need to blank out the "finish" date
    if (dataContext && !dataContext.completed) {
      dataContext.finish = null;
      this.sgb.gridService.updateItem(dataContext);
    }
  }

  handleOnCellClicked(event) {
    const args = event?.detail?.args;
    const eventData = event?.detail?.eventData;
    console.log(eventData, args);
    // if (eventData.target.classList.contains('mdi-help-circle-outline')) {
    //   alert('please HELP!!!');
    // } else if (eventData.target.classList.contains('mdi-chevron-down')) {
    //   alert('do something else...');
    // }
  }

  handleOnCompositeEditorChange(event) {
    const args = event.detail.args as OnCompositeEditorChangeEventArgs;
    const columnDef = args.column as Column;
    const formValues = args.formValues;

    // you can dynamically change a select dropdown collection,
    // if you need to re-render the editor for the list to be reflected
    // if (columnDef.id === 'duration') {
    //   const editor = this.compositeEditorInstance.editors['percentComplete2'] as SelectEditor;
    //   const newCollection = editor.finalCollection;
    //   editor.renderDomElement(newCollection);
    // }

    // you can change any other form input values when certain conditions are met
    if (columnDef.id === 'percentComplete' && formValues.percentComplete === 100) {
      this.compositeEditorInstance.changeFormInputValue('completed', true);
      this.compositeEditorInstance.changeFormInputValue('finish', new Date());
      // this.compositeEditorInstance.changeFormInputValue('product', { id: 0, itemName: 'Sleek Metal Computer' });

      // you can even change a value that is not part of the form (but is part of the grid)
      // but you will have to bypass the error thrown by providing `true` as the 3rd argument
      // this.compositeEditorInstance.changeFormInputValue('cost', 9999.99, true);
    }

    // you can also change some editor options
    // not all Editors supports this functionality, so far only these Editors are supported: AutoComplete, Date Single/Multiple Select
    /*
    if (columnDef.id === 'completed') {
      this.compositeEditorInstance.changeFormEditorOption('percentComplete', 'filter', true); // multiple-select.js, show filter in dropdown
      this.compositeEditorInstance.changeFormEditorOption('finish', 'displayDateMin', 'today'); // calendar picker, change minDate to today
    }
    */
  }

  handleReRenderUnsavedStyling() {
    this.removeAllUnsavedStylingFromCell();
    this.renderUnsavedStylingOnAllVisibleCells();
  }

  handleOnGridStateChanged(event) {
    // console.log('handleOnGridStateChanged', event?.detail ?? '');
    const gridState = event?.detail?.gridState;
    if (Array.isArray(gridState?.rowSelection.dataContextIds)) {
      this.isMassSelectionDisabled = gridState.rowSelection.dataContextIds.length === 0;
    }
  }

  handleOnSelectedRowIdsChanged(event) {
    const args = event?.detail?.args;
    // const sortedSelectedIds = args.filteredIds.sort((a, b) => a - b);
    console.log('sortedSelectedIds', args.filteredIds.length, args.selectedRowIds.length);
  }

  removeUnsavedStylingFromCell(_item: any, column: Column, row: number) {
    // remove unsaved css class from that cell
    const cssStyleKey = `unsaved_highlight_${[column.id]}${row}`;
    this.sgb.slickGrid?.removeCellCssStyles(cssStyleKey);
    const foundIdx = this.cellCssStyleQueue.findIndex(styleKey => styleKey === cssStyleKey);
    if (foundIdx >= 0) {
      this.cellCssStyleQueue.splice(foundIdx, 1);
    }
  }

  removeAllUnsavedStylingFromCell() {
    for (const cssStyleKey of this.cellCssStyleQueue) {
      this.sgb.slickGrid?.removeCellCssStyles(cssStyleKey);
    }
    this.cellCssStyleQueue = [];
  }

  renderUnsavedStylingOnAllVisibleCells() {
    for (const lastEdit of this.editQueue) {
      if (lastEdit) {
        const { item, columns, editCommand } = lastEdit;
        if (Array.isArray(columns)) {
          columns.forEach((col) => {
            this.renderUnsavedCellStyling(item, col, editCommand);
          });
        }
      }
    }
  }

  renderUnsavedCellStyling(item: any, column: Column, editCommand: EditCommand) {
    if (editCommand && item && column) {
      const row = this.sgb.dataView?.getRowByItem(item);
      if (row !== undefined && row >= 0) {
        const hash = { [row]: { [column.id]: 'unsaved-editable-field' } };
        const cssStyleKey = `unsaved_highlight_${[column.id]}${row}`;
        this.sgb.slickGrid?.setCellCssStyles(cssStyleKey, hash);
        this.cellCssStyleQueue.push(cssStyleKey);
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
      for (const lastEditColumn of lastEdit.columns) {
        this.removeUnsavedStylingFromCell(lastEdit.item, lastEditColumn, lastEditCommand.row);
      }
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
        for (const lastEditColumn of lastEdit.columns) {
          this.removeUnsavedStylingFromCell(lastEdit.item, lastEditColumn, lastEditCommand.row);
        }
      }
    }
    this.sgb.slickGrid?.invalidate(); // re-render the grid only after every cells got rolled back
    this.editQueue = [];
  }

  toggleGridEditReadonly() {
    // first need undo all edits
    this.undoAllEdits();

    // then change a single grid options to make the grid non-editable (readonly)
    this.isGridEditable = !this.isGridEditable;
    this.sgb.gridOptions = { ...this.sgb.gridOptions, editable: this.isGridEditable };
    this.gridOptions = this.sgb.gridOptions;
    this.isCompositeDisabled = !this.isGridEditable;
    if (!this.isGridEditable) {
      this.isMassSelectionDisabled = true;
    }
  }

  toggleDarkMode() {
    this._darkMode = !this._darkMode;
    this.toggleBodyBackground();
    this.sgb.gridOptions = { ...this.sgb.gridOptions, darkMode: this._darkMode };
    this.sgb.slickGrid?.setOptions({ darkMode: this._darkMode });
  }

  toggleBodyBackground() {
    if (this._darkMode) {
      document.body.setAttribute('data-theme', 'dark');
      document.querySelector('.demo-container')?.classList.add('dark-mode');
    } else {
      document.body.setAttribute('data-theme', 'light');
      document.querySelector('.demo-container')?.classList.remove('dark-mode');
    }
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
        icon: this.getRandomIcon(0)
      },
      {
        id: 1,
        itemName: 'Tasty Granite Table',
        itemNameTranslated: 'an extremely huge and heavy table',
        listPrice: 3200.12,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/Fnm7j6h.jpg',
        icon: this.getRandomIcon(1)
      },
      {
        id: 2,
        itemName: 'Awesome Wooden Mouse',
        itemNameTranslated: 'super old mouse',
        listPrice: 15.00,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/RaVJuLr.jpg',
        icon: this.getRandomIcon(2)
      },
      {
        id: 3,
        itemName: 'Gorgeous Fresh Shirt',
        itemNameTranslated: 'what a gorgeous shirt seriously',
        listPrice: 25.76,
        itemTypeName: 'I',
        image: 'http://i.stack.imgur.com/pC1Tv.jpg',
        icon: this.getRandomIcon(3)
      },
      {
        id: 4,
        itemName: 'Refined Cotton Table',
        itemNameTranslated: 'super light table that will fall apart amazingly fast',
        listPrice: 13.35,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/Fnm7j6h.jpg',
        icon: this.getRandomIcon(4)
      },
      {
        id: 5,
        itemName: 'Intelligent Wooden Pizza',
        itemNameTranslated: 'wood not included',
        listPrice: 23.33,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/RaVJuLr.jpg',
        icon: this.getRandomIcon(5)
      },
      {
        id: 6,
        itemName: 'Licensed Cotton Chips',
        itemNameTranslated: 'not sure what that is',
        listPrice: 71.21,
        itemTypeName: 'I',
        image: 'http://i.stack.imgur.com/pC1Tv.jpg',
        icon: this.getRandomIcon(6)
      },
      {
        id: 7,
        itemName: 'Ergonomic Rubber Soap',
        itemNameTranslated: `so good you'll want to use it every night`,
        listPrice: 2.43,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/Fnm7j6h.jpg',
        icon: this.getRandomIcon(7)
      },
      {
        id: 8,
        itemName: 'Handcrafted Steel Car',
        itemNameTranslated: `aka tesla truck`,
        listPrice: 31288.39,
        itemTypeName: 'I',
        image: 'https://i.imgur.com/RaVJuLr.jpg',
        icon: this.getRandomIcon(8)
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

  openCompositeModal(modalType: CompositeEditorModalType, openDelay = 0) {
    // open the editor modal and we can also provide a header title with optional parsing pulled from the dataContext, via template {{ }}
    // for example {{title}} => display the item title, or even complex object works {{product.itemName}} => display item product name

    let modalTitle = '';
    switch (modalType) {
      case 'create':
        modalTitle = 'Inserting New Task';
        break;
      case 'clone':
        modalTitle = 'Clone - {{title}}';
        break;
      case 'edit':
        modalTitle = 'Editing - {{title}} (<span class="text-color-muted">id:</span> <span class="text-color-primary">{{id}}</span>)'; // 'Editing - {{title}} ({{product.itemName}})'
        break;
      case 'mass-update':
        modalTitle = 'Mass Update All Records';
        break;
      case 'mass-selection':
        modalTitle = 'Update Selected Records';
        break;
    }

    window.setTimeout(() => {
      this.compositeEditorInstance?.openDetails({
        headerTitle: modalTitle,
        modalType,
        insertOptions: { highlightRow: false }, // disable highlight to avoid flaky tests in Cypress
        // showCloseButtonOutside: true,
        // backdrop: null,
        // viewColumnLayout: 2, // responsive layout, choose from 'auto', 1, 2, or 3 (defaults to 'auto')
        showFormResetButton: true,

        // you can validate each row item dataContext before applying a Mass Update/Selection changes via this validation callback (returning false would skip the change)
        // validateMassUpdateChange: (fieldName, dataContext, formValues) => {
        //   const levelComplex = this.complexityLevelList.find(level => level.label === 'Complex');
        //   if (fieldName === 'duration' && (dataContext.complexity === levelComplex?.value || formValues.complexity === levelComplex?.value) && formValues.duration < 5) {
        //     // doesn't pass condition, do not apply the change because when it's "Complex", we assume that the user has to choose at least 5 days of work (duration)
        //     return false;
        //   }
        //   return true;
        // },

        // showResetButtonOnEachEditor: true,
        onClose: () => Promise.resolve(confirm('You have unsaved changes, are you sure you want to close this window?')),
        onError: (error) => alert(error.message),
        // onRendered: (modalElm) => console.log(modalElm),
        onSave: (formValues, _selection, dataContextOrUpdatedDatasetPreview) => {
          const serverResponseDelay = 50;

          // when processing a mass update or mass selection
          if (modalType === 'mass-update' || modalType === 'mass-selection') {
            console.log(`${modalType} dataset preview`, dataContextOrUpdatedDatasetPreview);

            // simulate a backend server call which will reject if the "% Complete" is below 50%
            return new Promise((resolve, reject) => {
              window.setTimeout(
                () => (formValues.percentComplete >= 50) ? resolve(true) : reject('Unfortunately we only accept a minimum of 50% Completion...'),
                serverResponseDelay
              );
            });
          } else {
            // also simulate a server cal for any other modal type (create/clone/edit)
            // we'll just apply the change without any rejection from the server and
            // note that we also have access to the "dataContext" which is only available for these modal
            console.log(`${modalType} item data context`, dataContextOrUpdatedDatasetPreview);
            return new Promise(resolve => window.setTimeout(() => resolve(true), serverResponseDelay));
          }
        }
      });
    }, openDelay);
  }
}
