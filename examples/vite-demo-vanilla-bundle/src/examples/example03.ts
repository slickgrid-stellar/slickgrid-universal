import {
  Aggregators,
  type Column,
  type EditCommand,
  Editors,
  FieldType,
  FileType,
  Filters,
  Formatters,
  type GridOption,
  type Grouping,
  type GroupingGetterFunction,
  GroupTotalFormatters,
  type SlickDraggableGrouping,
  SlickGlobalEditorLock,
  SortComparers,
  SortDirectionNumber,
  type VanillaCalendarOption,
} from '@slickgrid-universal/common';
import { BindingEventService } from '@slickgrid-universal/binding';
import { ExcelExportService } from '@slickgrid-universal/excel-export';
import { TextExportService } from '@slickgrid-universal/text-export';
import { Slicker, type SlickVanillaGridBundle } from '@slickgrid-universal/vanilla-bundle';

import { ExampleGridOptions } from './example-grid-options.js';

interface ReportItem {
  title: string;
  duration: number;
  cost: number;
  percentComplete: number;
  start: Date;
  finish: Date;
  effortDriven: boolean;
}

export default class Example03 {
  private _bindingEventService: BindingEventService;
  private _darkMode = false;
  columnDefinitions: Column<ReportItem & { action: string; }>[];
  gridOptions: GridOption;
  dataset: any[];
  editCommandQueue: EditCommand[] = [];
  excelExportService: ExcelExportService;
  sgb: SlickVanillaGridBundle<ReportItem & { action: string; }>;
  durationOrderByCount = false;
  draggableGroupingPlugin: SlickDraggableGrouping;
  loadingClass = '';
  selectedGroupingFields: Array<string | GroupingGetterFunction> = ['', '', ''];

  constructor() {
    this._bindingEventService = new BindingEventService();
    this.excelExportService = new ExcelExportService();
  }

  attached() {
    this.initializeGrid();
    this.dataset = this.loadData(500);
    const gridContainerElm = document.querySelector(`.grid3`) as HTMLDivElement;

    this._bindingEventService.bind(gridContainerElm, 'onclick', this.handleOnClick.bind(this));
    this._bindingEventService.bind(gridContainerElm, 'oncellchange', this.handleOnCellChange.bind(this));
    this._bindingEventService.bind(gridContainerElm, 'onvalidationerror', this.handleValidationError.bind(this));
    this._bindingEventService.bind(gridContainerElm, 'onitemdeleted', this.handleItemDeleted.bind(this));
    this._bindingEventService.bind(gridContainerElm, 'onbeforeexporttoexcel', () => this.loadingClass = 'mdi mdi-load mdi-spin-1s mdi-22px');
    this._bindingEventService.bind(gridContainerElm, 'onafterexporttoexcel', () => this.loadingClass = '');
    this.sgb = new Slicker.GridBundle(gridContainerElm, this.columnDefinitions, { ...ExampleGridOptions, ...this.gridOptions }, this.dataset);
  }

  dispose() {
    this.sgb?.dispose();
    this._bindingEventService.unbindAll();
    document.querySelector('.demo-container')?.classList.remove('dark-mode');
    document.body.setAttribute('data-theme', 'light');
  }

  initializeGrid() {
    this.columnDefinitions = [
      {
        id: 'title', name: 'Title', field: 'title', columnGroup: 'Common Factor',
        sortable: true, type: FieldType.string,
        editor: {
          model: Editors.longText,
          required: true,
          alwaysSaveOnEnterKey: true,
          minLength: 5,
          maxLength: 255,
        },
        filterable: true,
        grouping: {
          getter: 'title',
          formatter: (g) => `Title: ${g.value} <span class="text-color-primary">(${g.count} items)</span>`,
          aggregators: [new Aggregators.Sum('cost')],
          aggregateCollapsed: false,
          collapsed: false
        }
      },
      {
        id: 'duration', name: 'Duration', field: 'duration', columnGroup: 'Common Factor',
        sortable: true, filterable: true,
        editor: {
          model: Editors.float,
          // required: true,
          decimal: 2,
          valueStep: 1,
          maxValue: 10000,
          alwaysSaveOnEnterKey: true,
        },
        type: FieldType.number,
        groupTotalsFormatter: GroupTotalFormatters.sumTotals,
        grouping: {
          getter: 'duration',
          formatter: (g) => `Duration: ${g.value} <span class="text-color-primary">(${g.count} items)</span>`,
          comparer: (a, b) => {
            return this.durationOrderByCount ? (a.count - b.count) : SortComparers.numeric(a.value, b.value, SortDirectionNumber.asc);
          },
          aggregators: [new Aggregators.Sum('duration'), new Aggregators.Sum('cost')],
          aggregateCollapsed: false,
          collapsed: false
        }
      },
      {
        id: 'start', name: 'Start', field: 'start', sortable: true, columnGroup: 'Period',
        // formatter: Formatters.dateIso,
        type: FieldType.date, outputType: FieldType.dateIso,
        filterable: true, filter: { model: Filters.compoundDate },
        formatter: Formatters.dateIso,
        editor: { model: Editors.date },
        grouping: {
          getter: 'start',
          formatter: (g) => `Start: ${g.value} <span class="text-color-primary">(${g.count} items)</span>`,
          aggregators: [
            new Aggregators.Sum('cost')
          ],
          aggregateCollapsed: false,
          collapsed: false
        }
      },
      {
        id: 'finish', name: 'Finish', field: 'finish', columnGroup: 'Period',
        sortable: true,
        editor: {
          model: Editors.date,
          editorOptions: { displayDateMin: 'today' } as VanillaCalendarOption
        },
        // formatter: Formatters.dateIso,
        type: FieldType.date, outputType: FieldType.dateIso,
        formatter: Formatters.dateIso,
        filterable: true, filter: { model: Filters.dateRange },
        grouping: {
          getter: 'finish',
          formatter: (g) => `Finish: ${g.value} <span class="text-color-primary">(${g.count} items)</span>`,
          aggregators: [
            new Aggregators.Sum('cost')
          ],
          aggregateCollapsed: false,
          collapsed: false
        }
      },
      {
        id: 'cost', name: 'Cost', field: 'cost', columnGroup: 'Analysis',
        width: 90,
        sortable: true,
        filterable: true,
        // filter: { model: Filters.compoundInput },
        formatter: Formatters.dollar,
        exportWithFormatter: true,
        groupTotalsFormatter: GroupTotalFormatters.sumTotalsDollar,
        type: FieldType.number,
        grouping: {
          getter: 'cost',
          formatter: (g) => `Cost: ${g.value} <span class="text-color-primary">(${g.count} items)</span>`,
          aggregators: [
            new Aggregators.Sum('cost')
          ],
          aggregateCollapsed: true,
          collapsed: true
        }
      },
      {
        id: 'percentComplete', name: '% Complete', field: 'percentComplete', columnGroup: 'Analysis',
        type: FieldType.number,
        editor: {
          model: Editors.slider,
          minValue: 0,
          maxValue: 100,
          // editorOptions: { hideSliderNumber: true } as SliderOption,
        },
        sortable: true, filterable: true,
        filter: { model: Filters.slider, operator: '>=' },
        groupTotalsFormatter: GroupTotalFormatters.avgTotalsPercentage,
        grouping: {
          getter: 'percentComplete',
          formatter: (g) => `% Complete:  ${g.value} <span class="text-color-primary">(${g.count} items)</span>`,
          aggregators: [
            new Aggregators.Sum('cost')
          ],
          aggregateCollapsed: false,
          collapsed: false
        },
        params: { groupFormatterPrefix: '<i>Avg</i>: ' },
      },
      {
        id: 'effortDriven', name: 'Effort-Driven', field: 'effortDriven', columnGroup: 'Analysis',
        width: 80, minWidth: 20, maxWidth: 100,
        cssClass: 'cell-effort-driven',
        sortable: true,
        filterable: true,
        filter: {
          collection: [{ value: '', label: '' }, { value: true, label: 'True' }, { value: false, label: 'False' }],
          model: Filters.singleSelect
        },
        exportWithFormatter: false,
        formatter: Formatters.checkmarkMaterial,
        grouping: {
          getter: 'effortDriven',
          formatter: (g) => `Effort-Driven: ${g.value ? 'True' : 'False'} <span class="text-color-primary">(${g.count} items)</span>`,
          aggregators: [
            new Aggregators.Sum('duration'),
            new Aggregators.Sum('cost')
          ],
          collapsed: false
        }
      },
      {
        id: 'action', name: 'Action', field: 'action', width: 90, maxWidth: 90,
        excludeFromExport: true,
        formatter: () => {
          return `<div class="fake-hyperlink text-color-primary flex justify-center">Action <i class="mdi mdi-chevron-down"></i></div>`;
        },
        cellMenu: {
          hideCloseButton: false,
          // you can override the logic of when the menu is usable
          // for example say that we want to show a menu only when then Priority is set to 'High'.
          // Note that this ONLY overrides the usability itself NOT the text displayed in the cell,
          // if you wish to change the cell text (or hide it)
          // then you SHOULD use it in combination with a custom formatter (actionFormatter) and use the same logic in that formatter
          // menuUsabilityOverride: (args) => {
          //   return (args.dataContext.priority === 3); // option 3 is High
          // },

          commandTitle: 'Commands',
          commandItems: [
            // array of command item objects, you can also use the "positionOrder" that will be used to sort the items in the list
            {
              command: 'command2', title: 'Command 2', positionOrder: 62,
              // you can use the "action" callback and/or use "onCallback" callback from the grid options, they both have the same arguments
              action: (_e, args) => {
                console.log(args.dataContext, args.column);
                // action callback.. do something
              },
              // only enable command when the task is not completed
              itemUsabilityOverride: (args) => {
                return !args.dataContext.completed;
              }
            },
            { command: 'command1', title: 'Command 1', cssClass: 'orange', positionOrder: 61 },
            {
              command: 'delete-row', title: 'Delete Row', positionOrder: 64,
              iconCssClass: 'mdi mdi-close', cssClass: 'red', textCssClass: 'bold',
              // only show command to 'Delete Row' when the task is not completed
              itemVisibilityOverride: (args) => {
                return !args.dataContext.completed;
              }
            },
            // you can pass divider as a string or an object with a boolean (if sorting by position, then use the object)
            // note you should use the "divider" string only when items array is already sorted and positionOrder are not specified
            { divider: true, command: '', positionOrder: 63 },
            // 'divider',

            {
              command: 'help',
              title: 'Help',
              iconCssClass: 'mdi mdi-help-circle-outline',
              positionOrder: 66,
            },
            { command: 'something', title: 'Disabled Command', disabled: true, positionOrder: 67, }
          ],
          optionTitle: 'Change Effort-Driven Flag',
          optionItems: [
            { option: true, title: 'True', iconCssClass: 'mdi mdi-check-box-outline' },
            { option: false, title: 'False', iconCssClass: 'mdi mdi-checkbox-blank-outline' },
          ]
        }
      },
    ];

    this.gridOptions = {
      autoEdit: true, // true single click (false for double-click)
      autoCommitEdit: true,
      editable: true,
      autoResize: {
        container: '.demo-container',
      },
      dataView: {
        useCSPSafeFilter: true
      },
      headerMenu: {
        hideFreezeColumnsCommand: false,
      },
      gridMenu: {
        hideClearFrozenColumnsCommand: false
      },
      enableAutoSizeColumns: true,
      enableAutoResize: true,
      enableCellNavigation: true,
      enableTextExport: true,
      enableExcelExport: true,
      excelExportOptions: {
        exportWithFormatter: true
      },
      externalResources: [new TextExportService(), this.excelExportService],
      enableFiltering: true,
      rowSelectionOptions: {
        // True (Single Selection), False (Multiple Selections)
        selectActiveRow: false
      },
      showCustomFooter: true,

      // pre-header will include our Header Grouping (i.e. "Common Factor")
      // Draggable Grouping could be located in either the Pre-Header OR the new Top-Header
      createPreHeaderPanel: true,
      showPreHeaderPanel: true,
      preHeaderPanelHeight: 26,

      // when Top-Header is created, it will be used by the Draggable Grouping (otherwise the Pre-Header will be used)
      createTopHeaderPanel: true,
      showTopHeaderPanel: true,
      topHeaderPanelHeight: 35,

      rowHeight: 33,
      headerRowHeight: 35,
      enableDraggableGrouping: true,
      // frozenColumn: 2,
      draggableGrouping: {
        dropPlaceHolderText: 'Drop a column header here to group by the column',
        // hideGroupSortIcons: true,
        deleteIconCssClass: 'mdi mdi-close text-color-danger',
        sortAscIconCssClass: 'mdi mdi-arrow-up',
        sortDescIconCssClass: 'mdi mdi-arrow-down',
        onGroupChanged: (_e, args) => this.onGroupChanged(args),
        onExtensionRegistered: (extension) => this.draggableGroupingPlugin = extension,
        // groupIconCssClass: 'mdi mdi-drag-vertical',
      },
      enableCheckboxSelector: true,
      enableRowSelection: true,
      checkboxSelector: {
        hideInFilterHeaderRow: false,
        hideInColumnTitleRow: true,
      },
      editCommandHandler: (_item, _column, editCommand) => {
        this.editCommandQueue.push(editCommand);
        editCommand.execute();
      },
      // when using the cellMenu, you can change some of the default options and all use some of the callback methods
      enableCellMenu: true,
      cellMenu: {
        // all the Cell Menu callback methods (except the action callback)
        // are available under the grid options as shown below
        onCommand: (e, args) => this.executeCommand(e, args),
        onOptionSelected: (_e, args) => {
          // change "Effort-Driven" property with new option selected from the Cell Menu
          const dataContext = args && args.dataContext;
          if (dataContext && dataContext.hasOwnProperty('effortDriven')) {
            dataContext.effortDriven = args.item.option;
            this.sgb.gridService.updateItem(dataContext);
          }
        },
      },
    };
  }

  loadData(count: number) {
    // mock data
    const tmpArray: any[] = [];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < count; i++) {
      const randomFinishYear = (new Date().getFullYear() - 3) + Math.floor(Math.random() * 10); // use only years not lower than 3 years ago
      const randomMonth = Math.floor(Math.random() * 11);
      const randomDay = Math.floor((Math.random() * 29));
      const randomFinish = new Date(randomFinishYear, (randomMonth + 1), randomDay);
      const randomCost = Math.round(Math.random() * 10000) / 100;

      tmpArray[i] = {
        id: i,
        title: 'Task ' + i,
        duration: Math.round(Math.random() * 100) + '',
        percentComplete: Math.round(Math.random() * 100),
        start: new Date(currentYear - 2, randomMonth, randomDay),
        finish: randomFinish < new Date() ? '' : randomFinish, // make sure the random date is earlier than today
        cost: (i % 33 === 0) ? -randomCost : randomCost,
        effortDriven: (i % 5 === 0)
      };

      // if (i % 8) {
      //   delete tmpArray[i].duration; // test with undefined properties
      // }
    }
    if (this.sgb) {
      this.sgb.dataset = tmpArray;
    }
    // const item = this.sgb.dataView?.getItemById<ReportItem & { myAction: string; }>(0);
    // const item = this.sgb?.dataView?.getItemById(0);
    // console.log('item', item);
    return tmpArray;
  }

  clearGroupsAndSelects() {
    this.clearGroupingSelects();
    this.clearGrouping();
  }

  clearGroupingSelects() {
    this.selectedGroupingFields.forEach((_g, i) => this.selectedGroupingFields[i] = '');
    this.selectedGroupingFields = [...this.selectedGroupingFields]; // force dirty checking
  }

  clearGrouping(invalidateRows = true) {
    this.draggableGroupingPlugin?.clearDroppedGroups();
    if (invalidateRows) {
      this.sgb?.slickGrid?.invalidate(); // invalidate all rows and re-render
    }
  }

  collapseAllGroups() {
    this.sgb?.dataView?.collapseAllGroups();
  }

  expandAllGroups() {
    this.sgb?.dataView?.expandAllGroups();
  }

  exportToExcel() {
    this.excelExportService.exportToExcel({
      filename: 'Export',
      format: FileType.xlsx
    });
  }

  groupByDurationOrderByCount(sortedByCount = false) {
    this.durationOrderByCount = sortedByCount;
    this.clearGrouping(false);

    if (this.draggableGroupingPlugin?.setDroppedGroups) {
      this.showTopHeader();
      this.draggableGroupingPlugin.setDroppedGroups('duration');

      // you need to manually add the sort icon(s) in UI
      const sortColumns = sortedByCount ? [] : [{ columnId: 'duration', sortAsc: true }];
      this.sgb?.slickGrid?.setSortColumns(sortColumns);
      this.sgb?.slickGrid?.invalidate(); // invalidate all rows and re-render
    }
  }

  groupByDurationEffortDriven() {
    this.clearGrouping(false);
    if (this.draggableGroupingPlugin?.setDroppedGroups) {
      this.showTopHeader();
      this.draggableGroupingPlugin.setDroppedGroups(['duration', 'effortDriven']);
      this.sgb?.slickGrid?.invalidate(); // invalidate all rows and re-render
    }
  }

  showTopHeader() {
    this.sgb?.slickGrid?.setTopHeaderPanelVisibility(true);
  }

  toggleDarkMode() {
    this._darkMode = !this._darkMode;
    if (this._darkMode) {
      document.body.setAttribute('data-theme', 'dark');
      document.querySelector('.demo-container')?.classList.add('dark-mode');
    } else {
      document.body.setAttribute('data-theme', 'light');
      document.querySelector('.demo-container')?.classList.remove('dark-mode');
    }
    this.sgb.slickGrid?.setOptions({ darkMode: this._darkMode });
  }

  toggleDraggableGroupingRow() {
    this.clearGroupsAndSelects();
    this.sgb?.slickGrid?.setTopHeaderPanelVisibility(!this.sgb?.slickGrid?.getOptions().showTopHeaderPanel);
  }

  onGroupChanged(change: { caller?: string; groupColumns: Grouping[]; }) {
    const caller = change && change.caller || [];
    const groups = change && change.groupColumns || [];

    if (Array.isArray(this.selectedGroupingFields) && Array.isArray(groups) && groups.length > 0) {
      // update all Group By select dropdown
      this.selectedGroupingFields.forEach((_g, i) => this.selectedGroupingFields[i] = groups[i] && groups[i].getter || '');
      this.selectedGroupingFields = [...this.selectedGroupingFields]; // force dirty checking
    } else if (groups.length === 0 && caller === 'remove-group') {
      this.clearGroupingSelects();
    }
  }

  handleOnClick(event) {
    console.log('onClick', event.detail);
  }

  handleOnCellChange(event) {
    this.sgb.dataView?.refresh();
    console.log('onCellChanged', event.detail);
  }

  handleValidationError(event) {
    console.log('handleValidationError', event.detail);
    const args = event.detail && event.detail.args;
    if (args.validationResults) {
      alert(args.validationResults.msg);
    }
  }

  handleItemDeleted(event) {
    const itemId = event && event.detail;
    console.log('item deleted with id:', itemId);
  }

  executeCommand(_e, args) {
    // const columnDef = args.column;
    const command = args.command;
    const dataContext = args.dataContext;

    switch (command) {
      case 'command1':
        alert('Command 1');
        break;
      case 'command2':
        alert('Command 2');
        break;
      case 'help':
        alert('Please help!');
        break;
      case 'delete-row':
        if (confirm(`Do you really want to delete row (${args.row + 1}) with "${dataContext.title}"`)) {
          this.sgb?.gridService.deleteItemById(dataContext.id);
        }
        break;
    }
  }

  undo() {
    const command = this.editCommandQueue.pop();
    if (command && SlickGlobalEditorLock.cancelCurrentEdit()) {
      command.undo();
      this.sgb?.slickGrid?.gotoCell(command.row, command.cell, false);
    }
  }
}
