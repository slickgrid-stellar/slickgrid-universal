import { format, parse } from '@formkit/tempo';
import { BindingEventService } from '@slickgrid-universal/binding';
import { createDomElement, emptyElement, extend, isDefined, } from '@slickgrid-universal/utils';
import { Calendar, type Options } from 'vanilla-calendar-pro';

import {
  FieldType,
  OperatorType,
  type OperatorString,
  type SearchTerm,
} from '../enums/index.js';
import type {
  Column,
  ColumnFilter,
  Filter,
  FilterArguments,
  FilterCallback,
  GridOption,
  OperatorDetail,
} from '../interfaces/index.js';
import { applyOperatorAltTextWhenExists, buildSelectOperator, compoundOperatorNumeric } from './filterUtilities.js';
import { formatDateByFieldType, mapTempoDateFormatWithFieldType } from '../services/dateUtils.js';
import { mapOperatorToShorthandDesignation } from '../services/utilities.js';
import type { TranslaterService } from '../services/translater.service.js';
import type { SlickGrid } from '../core/slickGrid.js';
import { resetDatePicker, setPickerDates } from '../commonEditorFilter/commonEditorFilterUtils.js';

export class DateFilter implements Filter {
  protected _bindEventService: BindingEventService;
  protected _clearFilterTriggered = false;
  protected _currentValue?: string;
  protected _currentDateOrDates?: Date | Date[] | string | string[];
  protected _currentDateStrings?: string[];
  protected _lastClickIsDate = false;
  protected _lastSearchValue?: string;
  protected _pickerOptions!: Options;
  protected _filterElm!: HTMLDivElement;
  protected _dateInputElm!: HTMLInputElement;
  protected _operator!: OperatorType | OperatorString;
  protected _selectOperatorElm?: HTMLSelectElement;
  protected _shouldTriggerQuery = true;
  hasTimePicker = false;
  inputFilterType: 'compound' | 'range' = 'range';
  calendarInstance?: Calendar;
  grid!: SlickGrid;
  searchTerms: SearchTerm[] = [];
  columnDef!: Column;
  callback!: FilterCallback;
  filterContainerElm!: HTMLElement;

  constructor(protected readonly translaterService?: TranslaterService | undefined) {
    this._bindEventService = new BindingEventService();
  }

  /** Getter for the Grid Options pulled through the Grid Object */
  protected get gridOptions(): GridOption {
    return this.grid?.getOptions() ?? {};
  }

  /** Getter for the Column Filter */
  get columnFilter(): ColumnFilter {
    return this.columnDef?.filter || {} as ColumnFilter;
  }

  /** Getter for the Current Date(s) selected */
  get currentDateOrDates(): string | Date | string[] | Date[] | undefined {
    return this._currentDateOrDates;
  }

  /** Getter to know what would be the default operator when none is specified */
  get defaultOperator(): OperatorType | OperatorString {
    return this.inputFilterType === 'compound'
      ? OperatorType.empty
      : (this.gridOptions.defaultFilterRangeOperator || OperatorType.rangeInclusive);
  }

  /** Getter for the date picker options */
  get pickerOptions(): Options {
    return this._pickerOptions || {};
  }

  get filterOptions(): Options {
    return { ...this.gridOptions.defaultFilterOptions?.date, ...this.columnFilter?.filterOptions };
  }

  /** Getter for the Filter Operator */
  get operator(): OperatorType | OperatorString {
    if (this.inputFilterType === 'compound') {
      return this._operator || this.columnFilter.operator || this.defaultOperator;
    }
    return this.columnFilter?.operator ?? this.defaultOperator;
  }

  /** Setter for the filter operator */
  set operator(operator: OperatorType | OperatorString) {
    if (this.inputFilterType === 'compound') {
      this._operator = operator;
    } else if (this.columnFilter) {
      this.columnFilter.operator = operator;
    }
  }

  /** Initialize the Filter */
  init(args: FilterArguments): void {
    if (!args) {
      throw new Error('[Slickgrid-Universal] A filter must always have an "init()" with valid arguments.');
    }

    this.grid = args.grid;
    this.callback = args.callback;
    this.columnDef = args.columnDef;
    if (this.inputFilterType === 'compound') {
      this.operator = args.operator || '';
    }
    this.searchTerms = args?.searchTerms ?? [];
    this.filterContainerElm = args.filterContainerElm;

    // date input can only have 1 search term, so we will use the 1st array index if it exist
    const searchValues = this.inputFilterType === 'compound'
      ? (Array.isArray(this.searchTerms) && this.searchTerms.length >= 0) ? this.searchTerms[0] : ''
      : this.searchTerms;

    // step 1, create the DOM Element of the filter which contain the compound Operator+Input
    this._filterElm = this.createDomFilterElement(searchValues);

    // if there's a search term, we will add the "filled" class for styling purposes
    this.updateFilterStyle(this.searchTerms.length > 0);

    // step 3, subscribe to the keyup event and run the callback when that happens
    // also add/remove "filled" class for styling purposes
    if (this._selectOperatorElm) {
      this._bindEventService.bind(this._selectOperatorElm, 'change', this.onTriggerEvent.bind(this));
    }

    // close picker on Esc/Tab keys
    this._bindEventService.bind(document.body, 'keydown', ((e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Tab') {
        this.hide();
      }
    }) as EventListener);

    // clear date picker + compound operator when Backspace is pressed
    this._bindEventService.bind(this._dateInputElm, 'keydown', ((e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        this.clear(true, false); // clear value but trigger a value change event
      }
    }) as EventListener);
  }

  /** Clear the filter value */
  clear(shouldTriggerQuery = true, shouldTriggerClearEvent = true): void {
    if (this.calendarInstance) {
      // in some cases we don't want to trigger a Clear event, like a Backspace, we want to clear the value but trigger a value change instead
      this._clearFilterTriggered = shouldTriggerClearEvent;
      this._shouldTriggerQuery = shouldTriggerQuery;
      this._currentValue = '';
      this.searchTerms = [];
      this._currentDateStrings = [];
      if (this._selectOperatorElm) {
        this._selectOperatorElm.selectedIndex = 0;
      }

      if (this.calendarInstance) {
        resetDatePicker(this.calendarInstance);
      }
    }
    this.onTriggerEvent(new Event('keyup'));
    this.updateFilterStyle(false);
  }

  /** Destroy the filter */
  destroy(): void {
    this._bindEventService.unbindAll();
    this.calendarInstance?.destroy();

    emptyElement(this.filterContainerElm);
    this.filterContainerElm?.remove();
    this._selectOperatorElm?.remove();
    this._filterElm?.remove();
  }

  hide(): void {
    if (typeof this.calendarInstance?.hide === 'function') {
      this.calendarInstance.hide();
    }
  }

  show(): void {
    if (typeof this.calendarInstance?.show === 'function') {
      this.calendarInstance.show();
    }
  }

  getValues(): string | Date | string[] | Date[] | undefined {
    return this._currentDateOrDates;
  }

  /**
   * Set value(s) on the DOM element
   * @params searchTerms
   */
  setValues(values?: SearchTerm[] | SearchTerm, operator?: OperatorType | OperatorString, triggerChange = false): void {
    let pickerValues: any | any[];

    if (this.inputFilterType === 'compound') {
      pickerValues = Array.isArray(values) ? values[0] : values;
    } else {
      // get the picker values, if it's a string with the "..", we'll do the split else we'll use the array of search terms
      if (typeof values === 'string' || (Array.isArray(values) && typeof values[0] === 'string') && (values[0] as string).indexOf('..') > 0) {
        pickerValues = (typeof values === 'string') ? [(values as string)] : (values[0] as string).split('..');
      } else if (Array.isArray(values)) {
        pickerValues = values;
      }
    }

    if (this.calendarInstance && pickerValues !== undefined) {
      setPickerDates(this.columnFilter, this._dateInputElm, this.calendarInstance, {
        columnDef: this.columnDef,
        newVal: pickerValues,
      });
      this._currentDateOrDates = (values && pickerValues) ? pickerValues : undefined;
    }

    const currentValueOrValues = this.getValues() || [];
    const searchTerms = Array.isArray(currentValueOrValues) ? currentValueOrValues : [currentValueOrValues];

    // set the operator when defined
    this.updateFilterStyle(searchTerms.length > 0);

    // set the operator when defined
    this.operator = operator || this.defaultOperator;
    if (operator && this._selectOperatorElm) {
      const operatorShorthand = mapOperatorToShorthandDesignation(this.operator);
      this._selectOperatorElm.value = operatorShorthand;
    }

    if (triggerChange) {
      this.callback(undefined, { columnDef: this.columnDef, searchTerms, operator: this.operator, shouldTriggerQuery: true });
    }
  }

  //
  // protected functions
  // ------------------
  protected buildDatePickerInput(searchTerms?: SearchTerm | SearchTerm[]): void {
    const columnId = this.columnDef?.id ?? '';
    const columnFieldType = this.columnFilter.type || this.columnDef.type || FieldType.dateIso;
    const outputFieldType = this.columnDef.outputType || this.columnFilter.type || this.columnDef.type || FieldType.dateUtc;
    const outputFormat = mapTempoDateFormatWithFieldType(outputFieldType);
    const inputFieldType = this.columnFilter.type || this.columnDef.type || FieldType.dateIso;

    // add the time picker when format is UTC (TZ - ISO8601) or has the 'h' (meaning hours)
    if (outputFormat && this.inputFilterType !== 'range' && (outputFormat === 'ISO8601' || outputFormat.toLowerCase().includes('h'))) {
      this.hasTimePicker = true;
    }
    const pickerFormat = mapTempoDateFormatWithFieldType(this.hasTimePicker ? FieldType.dateTimeIsoAM_PM : FieldType.dateIso);

    // get current locale, if user defined a custom locale just use or get it the Translate Service if it exist else just use English
    const currentLocale = ((this.filterOptions?.locale ?? this.translaterService?.getCurrentLanguage?.()) || this.gridOptions.locale || 'en') as string;

    let pickerValues: any | any[];

    if (this.inputFilterType === 'compound') {
      if (searchTerms) {
        pickerValues = searchTerms;
        this._currentDateOrDates = searchTerms as Date;
      }
    } else {
      // get the picker values, if it's a string with the "..", we'll do the split else we'll use the array of search terms
      if (typeof searchTerms === 'string' || (Array.isArray(searchTerms) && typeof searchTerms[0] === 'string') && (searchTerms[0] as string).indexOf('..') > 0) {
        pickerValues = (typeof searchTerms === 'string') ? [(searchTerms as string)] : (searchTerms[0] as string).split('..');
      } else if (Array.isArray(searchTerms)) {
        pickerValues = searchTerms;
      }

      // if we are preloading searchTerms, we'll keep them for reference
      if (Array.isArray(pickerValues)) {
        this._currentDateOrDates = pickerValues as Date[];
        this._currentDateStrings = pickerValues.map(date => formatDateByFieldType(date, undefined, inputFieldType));
      }
    }

    const pickerOptions: Options = {
      inputMode: true,
      enableJumpToSelectedDate: true,
      firstWeekday: 0,
      enableDateToggle: true,
      locale: currentLocale,
      selectedTheme: this.gridOptions?.darkMode ? 'dark' : 'light',
      positionToInput: 'auto',
      sanitizerHTML: (dirtyHtml) => this.grid.sanitizeHtmlString(dirtyHtml),
      selectedWeekends: [],
      type: this.inputFilterType === 'range' ? 'multiple' : 'default',
      onClickDate: () => {
        this._lastClickIsDate = true;
      },
      onChangeToInput: (self) => {
        if (self.context.inputElement) {
          let outDates: Array<Date | string> = [];
          let firstDate: string | number | Date = '';
          let lastDate = ''; // when using date range

          if (self.context.selectedDates[1]) {
            self.context.selectedDates.sort((a, b) => +new Date(a) - +new Date(b));
            firstDate = self.context.selectedDates[0];
            lastDate = self.context.selectedDates[self.context.selectedDates.length - 1];
            const firstDisplayDate = format(self.context.selectedDates[0], outputFormat, 'en-US');
            const lastDisplayDate = format(lastDate, outputFormat, 'en-US');
            self.context.inputElement.value = `${firstDisplayDate} — ${lastDisplayDate}`;
            outDates = [firstDate, lastDate];
          } else if (self.context.selectedDates[0]) {
            firstDate = self.context.selectedDates[0];
            self.context.inputElement.value = formatDateByFieldType(firstDate, FieldType.dateIso, outputFieldType);
            outDates = self.context.selectedDates;
          } else {
            self.context.inputElement.value = '';
          }

          if (this.hasTimePicker && firstDate) {
            const tempoDate = parse(firstDate, pickerFormat);
            tempoDate.setHours(+(self.context.selectedHours || 0));
            tempoDate.setMinutes(+(self.context.selectedMinutes || 0));
            self.context.inputElement.value = formatDateByFieldType(tempoDate, undefined, outputFieldType);
            outDates = [tempoDate];
          }

          if (this.inputFilterType === 'compound') {
            this._currentValue = formatDateByFieldType(outDates[0], undefined, columnFieldType);
          } else {
            if (Array.isArray(outDates)) {
              this._currentDateStrings = outDates.map(date => formatDateByFieldType(date, undefined, columnFieldType));
              this._currentValue = this._currentDateStrings.join('..');
            }
          }

          this._currentDateOrDates = outDates.map(d => d instanceof Date ? d : parse(d, pickerFormat));

          // when using the time picker, we can simulate a keyup event to avoid multiple backend request
          // since backend request are only executed after user start typing, changing the time should be treated the same way
          if (this._currentValue) {
            const newEvent = this.hasTimePicker ? new Event('keyup') : undefined;
            this.onTriggerEvent(newEvent);
          }

          // when using date range and we're not yet having 2 dates, then don't close picker just yet
          if (this.inputFilterType === 'range' && self.context.selectedDates.length < 2) {
            this._lastClickIsDate = false;
          }
          // if you want to hide the calendar after picking a date
          if (this._lastClickIsDate) {
            self.hide();
            this._lastClickIsDate = false;
          }
        }
      },
    };

    if (this.inputFilterType === 'range') {
      pickerOptions.type = 'multiple';
      pickerOptions.displayMonthsCount = 2;
      pickerOptions.monthsToSwitch = 2;
      pickerOptions.enableEdgeDatesOnly = true;
      pickerOptions.selectionDatesMode = 'multiple-ranged';
      pickerOptions.displayDatesOutside = false;
    }

    // add the time picker when format includes time (hours/minutes)
    if (this.hasTimePicker) {
      pickerOptions.selectionTimeMode = 24;
    }

    // merge options with optional user's custom options
    this._pickerOptions = extend(true, {}, pickerOptions, this.filterOptions);

    let placeholder = this.gridOptions?.defaultFilterPlaceholder ?? '';
    if (this.columnFilter?.placeholder) {
      placeholder = this.columnFilter.placeholder;
    }

    this._dateInputElm = createDomElement('input', {
      type: 'text', className: 'form-control date-picker',
      placeholder,
      readOnly: true,
      dataset: { input: '', columnid: `${columnId}` }
    });

    this.calendarInstance = new Calendar(this._dateInputElm, this._pickerOptions);
    this.calendarInstance.init();

    if (this._pickerOptions?.selectedDates) {
      pickerValues = this._pickerOptions.selectedDates;
    }

    if (pickerValues) {
      setPickerDates(this.columnFilter, this._dateInputElm, this.calendarInstance, {
        columnDef: this.columnDef,
        oldVal: undefined,
        newVal: pickerValues,
        updatePickerUI: false
      });
    }
  }

  /** Get the available operator option values to populate the operator select dropdown list */
  protected getOperatorOptionValues(): OperatorDetail[] {
    let operatorList: OperatorDetail[];
    if (this.columnFilter?.compoundOperatorList) {
      operatorList = this.columnFilter.compoundOperatorList;
    } else {
      operatorList = compoundOperatorNumeric(this.gridOptions, this.translaterService);
    }

    // add alternate texts when provided
    applyOperatorAltTextWhenExists(this.gridOptions, operatorList, 'numeric');

    return operatorList;
  }

  /**
   * Create the DOM element
   * @params searchTerms
   */
  protected createDomFilterElement(searchTerms?: SearchTerm | SearchTerm[]): HTMLDivElement {
    const columnId = this.columnDef?.id ?? '';
    emptyElement(this.filterContainerElm);

    // create the DOM element filter container
    this.buildDatePickerInput(searchTerms);

    if (this.inputFilterType === 'range') {
      // if there's a search term, we will add the "filled" class for styling purposes
      const inputContainerElm = createDomElement('div', { className: `date-picker form-group search-filter filter-${columnId}` });

      if (Array.isArray(searchTerms) && searchTerms.length > 0 && searchTerms[0] !== '') {
        this._currentDateOrDates = searchTerms as Date[];
        this._currentValue = searchTerms[0] as string;
      }
      inputContainerElm.appendChild(this._dateInputElm);

      // append the new DOM element to the header row
      if (inputContainerElm) {
        this.filterContainerElm.appendChild(inputContainerElm);
      }

      return inputContainerElm;
    } else {
      this._selectOperatorElm = buildSelectOperator(this.getOperatorOptionValues(), this.grid);
      const filterContainerElm = createDomElement('div', { className: `date-picker form-group search-filter filter-${columnId}` });
      const containerInputGroupElm = createDomElement('div', { className: 'input-group date-picker' }, filterContainerElm);
      const operatorInputGroupAddonElm = createDomElement('div', { className: 'input-group-addon input-group-prepend operator' }, containerInputGroupElm);

      operatorInputGroupAddonElm.appendChild(this._selectOperatorElm);
      containerInputGroupElm.appendChild(this._dateInputElm);

      if (this.operator) {
        const operatorShorthand = mapOperatorToShorthandDesignation(this.operator);
        this._selectOperatorElm.value = operatorShorthand;
      }

      this._currentDateOrDates = searchTerms as Date;
      this._currentValue = searchTerms as string;

      // append the new DOM element to the header row
      if (filterContainerElm) {
        this.filterContainerElm.appendChild(filterContainerElm);
      }

      return filterContainerElm;
    }
  }

  protected onTriggerEvent(e: Event | undefined): void {
    if (this._clearFilterTriggered) {
      this.callback(e, { columnDef: this.columnDef, clearFilterTriggered: this._clearFilterTriggered, shouldTriggerQuery: this._shouldTriggerQuery });
      this.updateFilterStyle(false);
    } else {
      if (this.inputFilterType === 'range') {
        const searchTerms = (this._currentDateStrings ? this._currentDateStrings : [this._currentValue as string]);
        this.updateFilterStyle(searchTerms.length > 0);
        this.callback(e, { columnDef: this.columnDef, searchTerms, operator: this.operator || '', shouldTriggerQuery: this._shouldTriggerQuery });
      } else if (this.inputFilterType === 'compound' && this._selectOperatorElm) {
        const selectedOperator = this._selectOperatorElm.value as OperatorString;
        this.updateFilterStyle(!!this._currentValue);

        // when changing compound operator, we don't want to trigger the filter callback unless the date input is also provided
        const skipNullInput = this.columnFilter.skipCompoundOperatorFilterWithNullInput ?? this.gridOptions.skipCompoundOperatorFilterWithNullInput ?? this.gridOptions.skipCompoundOperatorFilterWithNullInput === undefined;
        const hasSkipNullValChanged = (skipNullInput && isDefined(this._currentDateOrDates)) || (this._currentDateOrDates === '' && isDefined(this._lastSearchValue));

        if (!skipNullInput || !skipNullInput || hasSkipNullValChanged) {
          this.callback(e, { columnDef: this.columnDef, searchTerms: (this._currentValue ? [this._currentValue] : null), operator: selectedOperator || '', shouldTriggerQuery: this._shouldTriggerQuery });
        }
      }
    }

    // reset both flags for next use
    this._clearFilterTriggered = false;
    this._shouldTriggerQuery = true;
    this._lastSearchValue = this._currentValue;
  }

  /** add/remove "filled" CSS class */
  protected updateFilterStyle(isFilled: boolean): void {
    if (isFilled) {
      this._filterElm.classList.add('filled');
    } else {
      this._filterElm.classList.remove('filled');
    }
  }
}
