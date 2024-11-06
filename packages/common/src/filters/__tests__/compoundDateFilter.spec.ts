import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VanillaCalendarPro } from 'vanilla-calendar-pro';
import { format } from '@formkit/tempo';

import { Filters } from '../filters.index.js';
import { FieldType, OperatorType } from '../../enums/index.js';
import type { Column, FilterArguments, GridOption } from '../../interfaces/index.js';
import { CompoundDateFilter } from '../compoundDateFilter.js';
import { TranslateServiceStub } from '../../../../../test/translateServiceStub.js';
import type { SlickGrid } from '../../core/index.js';
import { mapTempoDateFormatWithFieldType } from '../../services/dateUtils.js';

const containerId = 'demo-container';

// define a <div> container to simulate the grid container
const template = `<div id="${containerId}"></div>`;

function removeExtraSpaces(text: string) {
  return `${text}`.replace(/\s+/g, ' ');
}

let gridOptionMock = {
  enableFiltering: true,
  enableFilterTrimWhiteSpace: true,
} as GridOption;

const gridStub = {
  applyHtmlCode: (elm, val) => elm.innerHTML = val || '',
  getOptions: vi.fn(),
  getColumns: vi.fn(),
  getHeaderRowColumn: vi.fn(),
  render: vi.fn(),
  sanitizeHtmlString: (str) => str,
} as unknown as SlickGrid;

vi.useFakeTimers();

describe('CompoundDateFilter', () => {
  let divContainer: HTMLDivElement;
  let filter: CompoundDateFilter;
  let filterArguments: FilterArguments;
  let spyGetHeaderRow;
  let mockColumn: Column;
  let translateService: TranslateServiceStub;

  beforeEach(() => {
    translateService = new TranslateServiceStub();

    divContainer = document.createElement('div');
    divContainer.innerHTML = template;
    document.body.appendChild(divContainer);
    spyGetHeaderRow = vi.spyOn(gridStub, 'getHeaderRowColumn').mockReturnValue(divContainer);

    mockColumn = { id: 'finish', field: 'finish', filterable: true, outputType: FieldType.dateIso, filter: { model: Filters.compoundDate, operator: '>' } };

    filterArguments = {
      grid: gridStub,
      columnDef: mockColumn,
      callback: vi.fn(),
      filterContainerElm: gridStub.getHeaderRowColumn(mockColumn.id)
    };
    gridOptionMock = {
      enableFiltering: true,
      enableFilterTrimWhiteSpace: true,
    };
    vi.spyOn(gridStub, 'getOptions').mockReturnValue(gridOptionMock);

    filter = new CompoundDateFilter(translateService);
  });

  afterEach(() => {
    filter.destroy();
    vi.clearAllMocks();
  });

  it('should throw an error when trying to call init without any arguments', () => {
    expect(() => filter.init(null as any)).toThrow('[Slickgrid-Universal] A filter must always have an "init()" with valid arguments.');
  });

  it('should initialize the filter', () => {
    filter.init(filterArguments);
    const filterCount = divContainer.querySelectorAll('.form-group.search-filter.filter-finish').length;

    expect(spyGetHeaderRow).toHaveBeenCalled();
    expect(filterCount).toBe(1);
  });

  it('should have a placeholder when defined in its column definition', () => {
    const testValue = 'test placeholder';
    mockColumn.filter!.placeholder = testValue;

    filter.init(filterArguments);
    const filterElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;

    expect(filterElm.placeholder).toBe(testValue);
  });

  it('should hide the DOM element when the "hide" method is called', () => {
    filter.init(filterArguments);
    const spy = vi.spyOn(filter.calendarInstance!, 'hide');
    const inputElm = document.body.querySelector('input.date-picker') as HTMLInputElement;
    inputElm.dispatchEvent(new MouseEvent('click'));
    const calendarElm = document.body.querySelector('.vc') as HTMLDivElement;
    filter.hide();

    expect(calendarElm).toBeTruthy();
    expect(spy).toHaveBeenCalled();
  });

  it('should show the DOM element when the "show" method is called', () => {
    filter.init(filterArguments);
    const spy = vi.spyOn(filter.calendarInstance!, 'show');
    filter.show();
    const calendarElm = document.body.querySelector('.vc') as HTMLDivElement;

    expect(calendarElm).toBeTruthy();
    expect(spy).toHaveBeenCalled();
  });

  it('should be able to retrieve default picker options through the Getter', () => {
    filter.init(filterArguments);

    expect(filter.calendarInstance).toBeTruthy();
    expect(filter.pickerOptions).toEqual({
      enableDateToggle: true,
      enableJumpToSelectedDate: true,
      firstWeekday: 0,
      isInput: true,
      locale: 'en',
      onChangeToInput: expect.any(Function),
      onClickDate: expect.any(Function),
      positionToInput: 'auto',
      sanitizerHTML: expect.any(Function),
      selectedTheme: 'light',
      selectedWeekends: [],
      viewType: 'default',
      settings: {},
    });
  });

  it('should be able to call "setValues" and have that value set in the picker', () => {
    const mockDate = '2001-01-02T16:02:02.239Z';
    filter.init(filterArguments);
    filter.setValues(mockDate);
    expect(filter.currentDateOrDates).toEqual(mockDate);
  });

  it('should be able to call "setValues" as an array and have that value set in the picker', () => {
    const mockDate = '2001-01-02T16:02:02.239Z';
    filter.init(filterArguments);
    filter.setValues([mockDate]);
    expect(filter.currentDateOrDates).toEqual(mockDate);
  });

  it('should be able to call "setValues" with a value and an extra operator and expect it to be set as new operator', () => {
    const mockDate = '2001-01-02T16:02:02.239Z';
    filter.init(filterArguments);
    filter.setValues([mockDate], OperatorType.greaterThanOrEqual);

    const filterOperatorElm = divContainer.querySelector('.input-group-prepend.operator select') as HTMLInputElement;

    expect(filter.currentDateOrDates).toEqual(mockDate);
    expect(filterOperatorElm.value).toBe('>=');
  });

  it('should be able to call "setValues" and call an event trigger', () => {
    const spyCallback = vi.spyOn(filterArguments, 'callback');
    const mockDate = '2001-01-02T16:02:02.239Z';
    filter.init(filterArguments);
    filter.setValues([mockDate], '>=', true);
    const filterOperatorElm = divContainer.querySelector('.input-group-prepend.operator select') as HTMLInputElement;

    expect(filter.currentDateOrDates).toEqual(mockDate);
    expect(filterOperatorElm.value).toBe('>=');
    expect(spyCallback).toHaveBeenCalledWith(undefined, { columnDef: mockColumn, operator: '>=', searchTerms: [mockDate], shouldTriggerQuery: true });
  });

  it('should trigger input change event and expect the callback to be called with the date provided in the input', () => {
    mockColumn.filter!.operator = '>';
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    filterInputElm.value = '2001-01-02T16:02:02.239Z';
    filter.calendarInstance!.onClickDate!({ private: { inputElement: filterInputElm, selectedDates: ['2001-01-02'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    filter.calendarInstance!.onChangeToInput!({ private: { inputElement: filterInputElm, selectedDates: ['2001-01-02'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(spyCallback).toHaveBeenCalledWith(undefined, {
      columnDef: mockColumn, operator: '>', searchTerms: ['2001-01-02'], shouldTriggerQuery: true
    });
  });

  it('should trigger input change event with empty value and still expect the callback to be called with the date provided in the input', () => {
    mockColumn.filter!.operator = '>';

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    filterInputElm.value = '2001-01-02T16:02:02.239Z';
    filter.calendarInstance!.onClickDate!({ private: { inputElement: filterInputElm, selectedDates: [] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    filter.calendarInstance!.onChangeToInput!({ private: { inputElement: filterInputElm, selectedDates: [] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(0);
    expect(filterInputElm.value).toBe('');
  });

  it('should pass a different operator then trigger an input change event and expect the callback to be called with the date provided in the input', () => {
    mockColumn.filter!.operator = '>';
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    filterInputElm.value = '2001-01-02T16:02:02.239Z';
    filter.calendarInstance!.onClickDate!({ private: { inputElement: filterInputElm, selectedDates: ['2001-01-02'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    filter.calendarInstance!.onChangeToInput!({ private: { inputElement: filterInputElm, selectedDates: ['2001-01-02'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(spyCallback).toHaveBeenCalledWith(undefined, { columnDef: mockColumn, operator: '>', searchTerms: ['2001-01-02'], shouldTriggerQuery: true });
  });

  it('should change operator dropdown without a date entered and not expect the callback to be called', () => {
    mockColumn.filter!.operator = '>';
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const filterSelectElm = divContainer.querySelector('.search-filter.filter-finish select') as HTMLInputElement;
    filterInputElm.value = undefined as any;
    filterSelectElm.value = '<=';
    filterSelectElm.dispatchEvent(new Event('change'));

    expect(spyCallback).not.toHaveBeenCalled();
  });

  it('should change operator dropdown without a value entered and not expect the callback to be called when "skipCompoundOperatorFilterWithNullInput" is defined as True and value is undefined', () => {
    mockColumn.filter!.operator = '>';
    mockColumn.filter!.skipCompoundOperatorFilterWithNullInput = true;
    const callbackSpy = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    filter.setValues(['']);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const filterSelectElm = divContainer.querySelector('.search-filter.filter-finish select') as HTMLInputElement;

    filterInputElm.value = undefined as any;
    filterSelectElm.value = '<=';
    filterSelectElm.dispatchEvent(new Event('change'));

    expect(callbackSpy).not.toHaveBeenCalled();
  });

  it('should change operator dropdown without a value entered and not expect the callback to be called when "skipCompoundOperatorFilterWithNullInput" is defined as True and value is empty string', () => {
    mockColumn.filter!.operator = '>';
    mockColumn.filter!.skipCompoundOperatorFilterWithNullInput = true;
    const callbackSpy = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    filter.setValues(['']);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const filterSelectElm = divContainer.querySelector('.search-filter.filter-finish select') as HTMLInputElement;

    filterInputElm.value = '';
    filterSelectElm.value = '<=';
    filterSelectElm.dispatchEvent(new Event('change'));

    expect(callbackSpy).not.toHaveBeenCalled();
  });

  it('should change operator dropdown without a date entered and expect the callback to be called when "skipCompoundOperatorFilterWithNullInput" is defined as False', () => {
    mockColumn.filter!.operator = '>';
    mockColumn.filter!.skipCompoundOperatorFilterWithNullInput = false;
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const filterSelectElm = divContainer.querySelector('.search-filter.filter-finish select') as HTMLInputElement;
    filterInputElm.value = undefined as any;
    filterSelectElm.value = '<=';
    filterSelectElm.dispatchEvent(new Event('change'));

    expect(spyCallback).toHaveBeenCalled();
  });

  it('should hide picker when pressing Escape key', () => {
    const hideSpy = vi.spyOn(filter, 'hide');

    filter.init(filterArguments);
    filter.show();
    const calendarElm = document.body.querySelector('.vc') as HTMLDivElement;

    expect(calendarElm).toBeTruthy();

    calendarElm.dispatchEvent(new (window.window as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(hideSpy).toHaveBeenCalled();
  });

  it('should hide picker when pressing Tab key', () => {
    const hideSpy = vi.spyOn(filter, 'hide');

    filter.init(filterArguments);
    filter.show();
    const calendarElm = document.body.querySelector('.vc') as HTMLDivElement;

    expect(calendarElm).toBeTruthy();

    calendarElm.dispatchEvent(new (window.window as any).KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(hideSpy).toHaveBeenCalled();
  });

  it('should clear picker when pressing Backspace key', () => {
    filterArguments.searchTerms = ['2000-01-01'];
    mockColumn.filter!.operator = '<=';
    const clearSpy = vi.spyOn(filter, 'clear');
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    filter.show();
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const calendarElm = document.body.querySelector('.vc') as HTMLDivElement;

    expect(calendarElm).toBeTruthy();
    expect(filterInputElm.value).toBe('2000-01-01');

    filterInputElm.dispatchEvent(new (window.window as any).KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    expect(clearSpy).toHaveBeenCalled();
    expect(filterInputElm.value).toBe('');
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, operator: '', searchTerms: null, shouldTriggerQuery: true });
  });

  it('should create the input filter with a default search terms when passed as a filter argument', () => {
    filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z'];
    mockColumn.filter!.operator = '<=';
    mockColumn.type = FieldType.dateUtc;
    mockColumn.outputType = FieldType.dateUtc;
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;

    filterInputElm.focus();
    filter.calendarInstance!.onClickDate!({ private: { inputElement: filterInputElm, selectedDates: ['2000-01-01T05:00:00.000Z'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    filter.calendarInstance!.onChangeToInput!({ private: { inputElement: filterInputElm, selectedDates: ['2000-01-01T05:00:00.000Z'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(filter.currentDateOrDates![0].toISOString()).toBe('2000-01-01T05:00:00.000Z');
    expect(filterInputElm.value).toBe('2000-01-01T05:00:00.000Z');
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, operator: '<=', searchTerms: ['2000-01-01T05:00:00.000Z'], shouldTriggerQuery: true });
  });

  it('should create the input filter with a default input dates when passed as a filter options', () => {
    mockColumn.filter!.operator = '<=';
    mockColumn.filter!.filterOptions = {
      selected: { dates: ['2001-01-02'] }
    };
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;

    filterInputElm.focus();
    filter.calendarInstance!.onChangeToInput!({ private: { inputElement: filterInputElm, selectedDates: ['2000-01-02'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(format(filter.currentDateOrDates![0], mapTempoDateFormatWithFieldType(FieldType.dateTimeIso))).toBe('2000-01-02 00:00:00');
    expect(filterInputElm.value).toBe('2000-01-02');
    expect(spyCallback).toHaveBeenCalledWith(undefined, { columnDef: mockColumn, operator: '<=', searchTerms: ['2000-01-02'], shouldTriggerQuery: true });
  });

  it('should have a value with date & time in the picker when "enableTime" option is set as a global default filter option and we trigger a change', () => {
    gridOptionMock.defaultFilterOptions = {
      date: { selectedDates: ['2001-01-02'] }
    };
    mockColumn.filter!.operator = '<=';
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;

    filterInputElm.focus();
    filter.calendarInstance!.onChangeToInput!({ private: { inputElement: filterInputElm, selectedDates: ['2000-01-02'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(format(filter.currentDateOrDates![0], mapTempoDateFormatWithFieldType(FieldType.dateTimeIso))).toBe('2000-01-02 00:00:00');
    expect(filterInputElm.value).toBe('2000-01-02');
    expect(spyCallback).toHaveBeenCalledWith(undefined, { columnDef: mockColumn, operator: '<=', searchTerms: ['2000-01-02'], shouldTriggerQuery: true });
  });

  it('should trigger an operator change event and expect the callback to be called with the searchTerms and operator defined', () => {
    filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z'];
    mockColumn.filter!.operator = '>';
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterSelectElm = divContainer.querySelector('.search-filter.filter-finish select') as HTMLInputElement;

    filterSelectElm.value = '<=';
    filterSelectElm.dispatchEvent(new CustomEvent('change'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, operator: '<=', searchTerms: ['2000-01-01T05:00:00.000Z'], shouldTriggerQuery: true });
  });

  it('should be able to call "setValues" and set empty values and the picker input to not have the "filled" css class', () => {
    const mockDate = '2001-01-02T16:02:02.239Z';
    filter.init(filterArguments);
    filter.setValues(mockDate);
    let filledInputElm = divContainer.querySelector('.search-filter.filter-finish.filled') as HTMLInputElement;

    expect(filter.currentDateOrDates).toEqual(mockDate);
    expect(filledInputElm).toBeTruthy();

    filter.setValues('');
    filledInputElm = divContainer.querySelector('.search-filter.filter-finish.filled') as HTMLInputElement;
    expect(filledInputElm).toBeFalsy();
  });

  it('should work with different locale when locale is changed', async () => {
    translateService.use('fr');
    filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z'];
    mockColumn.filter!.operator = '<=';
    mockColumn.type = FieldType.dateUtc;
    mockColumn.outputType = FieldType.dateUtc;
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    filter.show();
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const calendarElm = document.body.querySelector('.vc') as HTMLDivElement;
    const monthElm = calendarElm.querySelector('[data-vc="month"]') as HTMLButtonElement;

    filter.show();

    filterInputElm.focus();

    filter.calendarInstance!.onClickDate!({ private: { inputElement: filterInputElm, selectedDates: ['2000-01-01T05:00:00.000Z'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    filter.calendarInstance!.onChangeToInput!({ private: { inputElement: filterInputElm, selectedDates: ['2000-01-01T05:00:00.000Z'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(filter.currentDateOrDates![0].toISOString()).toBe('2000-01-01T05:00:00.000Z');
    expect(filterInputElm.value).toBe('2000-01-01T05:00:00.000Z');
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, operator: '<=', searchTerms: ['2000-01-01T05:00:00.000Z'], shouldTriggerQuery: true });
    expect(calendarElm).toBeTruthy();
    expect(monthElm).toBeTruthy();
    // expect(monthElm.textContent).toBe('janvier');
  });

  it('should trigger a callback with the clear filter set when calling the "clear" method', () => {
    filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z'];
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    filter.show();
    filter.clear();
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterInputElm.value).toBe('');
    expect(filterFilledElms.length).toBe(0);
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, clearFilterTriggered: true, shouldTriggerQuery: true });
  });

  it('should trigger a callback with the clear filter but without querying when when calling the "clear" method with False as argument', () => {
    filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z'];
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    filter.clear(false);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterInputElm.value).toBe('');
    expect(filterFilledElms.length).toBe(0);
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, clearFilterTriggered: true, shouldTriggerQuery: false });
  });

  it('should have a value with date & time in the picker when "enableTime" option is set and we trigger a change', () => {
    mockColumn.outputType = FieldType.dateTimeShortEuro;
    mockColumn.filter!.operator = '>';
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    filterInputElm.value = '2001-01-02T16:02:00.000Z';
    filter.calendarInstance!.onClickDate!({ private: { inputElement: filterInputElm, selectedDates: ['2001-01-02'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    filter.calendarInstance!.onChangeToInput!({ private: { inputElement: filterInputElm, selectedDates: ['2001-01-02'], selectedHours: 16, selectedMinutes: 2 }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(filterInputElm.value).toBe('2/1/2001 16:02');
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, operator: '>', searchTerms: ['2001-01-02'], shouldTriggerQuery: true });
  });

  it('should have a value with date & time in the picker when using no "outputType" which will default to UTC date', () => {
    mockColumn.type = FieldType.dateUtc;
    mockColumn.outputType = null as any;
    filterArguments.searchTerms = ['2000-01-01T05:00'];
    mockColumn.filter!.operator = '<=';
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;

    filterInputElm.focus();
    filter.calendarInstance!.onClickDate!({ private: { inputElement: filterInputElm, selectedDates: ['2000-01-01'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    filter.calendarInstance!.onChangeToInput!({ private: { inputElement: filterInputElm, selectedDates: ['2000-01-01'] }, hide: vi.fn() } as unknown as VanillaCalendarPro, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(filter.currentDateOrDates![0].toISOString()).toBe('2000-01-01T05:00:00.000Z');
    expect(filterInputElm.value).toBe('2000-01-01T05:00:00.000Z');
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, operator: '<=', searchTerms: ['2000-01-01T05:00:00.000Z'], shouldTriggerQuery: true });
  });

  it('should have default English text with operator dropdown options related to dates', () => {
    mockColumn.outputType = null as any;
    filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z'];

    filter.init(filterArguments);
    const filterOperatorElm = divContainer.querySelectorAll<HTMLSelectElement>('.input-group-prepend.operator select');

    expect(filterOperatorElm[0][0].title).toBe('');
    expect(removeExtraSpaces(filterOperatorElm[0][1].textContent!)).toBe('= Equal to');
    expect(removeExtraSpaces(filterOperatorElm[0][2].textContent!)).toBe('< Less than');
    expect(removeExtraSpaces(filterOperatorElm[0][3].textContent!)).toBe('<= Less than or equal to');
    expect(removeExtraSpaces(filterOperatorElm[0][4].textContent!)).toBe('> Greater than');
    expect(removeExtraSpaces(filterOperatorElm[0][5].textContent!)).toBe('>= Greater than or equal to');
    expect(removeExtraSpaces(filterOperatorElm[0][6].textContent!)).toBe('<> Not equal to');
  });

  it('should have custom compound operator list showing up in the operator select dropdown options list', () => {
    mockColumn.outputType = null as any;
    filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z'];
    mockColumn.filter!.compoundOperatorList = [
      { operator: '', desc: '' },
      { operator: '=', desc: 'Equal to' },
      { operator: '<', desc: 'Less than' },
      { operator: '>', desc: 'Greater than' },
    ];

    filter.init(filterArguments);
    const filterOperatorElm = divContainer.querySelectorAll<HTMLSelectElement>('.input-group-prepend.operator select');

    expect(filterOperatorElm[0][0].title).toBe('');
    expect(removeExtraSpaces(filterOperatorElm[0][1].textContent!)).toBe('= Equal to');
    expect(removeExtraSpaces(filterOperatorElm[0][2].textContent!)).toBe('< Less than');
    expect(removeExtraSpaces(filterOperatorElm[0][3].textContent!)).toBe('> Greater than');
  });

  it('should be able to change compound operator & description with alternate texts for the operator list showing up in the operator select dropdown options list', () => {
    mockColumn.outputType = null as any;
    filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z'];
    gridOptionMock.compoundOperatorAltTexts = {
      numeric: { '=': { operatorAlt: 'eq', descAlt: 'alternate numeric equal description' } },
    };

    filter.init(filterArguments);
    const filterOperatorElm = divContainer.querySelectorAll<HTMLSelectElement>('.input-group-prepend.operator select');

    expect(filterOperatorElm[0][0].title).toBe('');
    expect(removeExtraSpaces(filterOperatorElm[0][1].textContent!)).toBe('eq alternate numeric equal description');
    expect(removeExtraSpaces(filterOperatorElm[0][2].textContent!)).toBe('< Less than');
    expect(removeExtraSpaces(filterOperatorElm[0][3].textContent!)).toBe('<= Less than or equal to');
    expect(removeExtraSpaces(filterOperatorElm[0][4].textContent!)).toBe('> Greater than');
    expect(removeExtraSpaces(filterOperatorElm[0][5].textContent!)).toBe('>= Greater than or equal to');
    expect(removeExtraSpaces(filterOperatorElm[0][6].textContent!)).toBe('<> Not equal to');
  });

  it('should have custom compound operator list including alternate texts and show up in the operator select dropdown options list', () => {
    mockColumn.outputType = null as any;
    filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z'];
    mockColumn.filter!.compoundOperatorList = [
      { operator: '', desc: '' },
      { operator: '=', desc: 'Equal to' },
      { operator: '<', desc: 'Less than' },
      { operator: '>', desc: 'Greater than' },
      { operator: 'Custom', desc: 'SQL LIKE' },
    ];
    gridOptionMock.compoundOperatorAltTexts = {
      numeric: {
        '=': { operatorAlt: 'eq', descAlt: 'alternate numeric equal description' },
        'Custom': { operatorAlt: '%', descAlt: 'alternate SQL LIKE' }
      }
    };

    filter.init(filterArguments);
    const filterOperatorElm = divContainer.querySelectorAll<HTMLSelectElement>('.input-group-prepend.operator select');

    expect(filterOperatorElm[0][0].title).toBe('');
    expect(removeExtraSpaces(filterOperatorElm[0][1].textContent!)).toBe('eq alternate numeric equal description');
    expect(removeExtraSpaces(filterOperatorElm[0][2].textContent!)).toBe('< Less than');
    expect(removeExtraSpaces(filterOperatorElm[0][3].textContent!)).toBe('> Greater than');
    expect(removeExtraSpaces(filterOperatorElm[0][4].textContent!)).toBe('% alternate SQL LIKE');
  });

  describe('with French I18N translations', () => {
    beforeEach(() => {
      gridOptionMock.enableTranslate = true;
      translateService.use('fr');
    });

    it('should have French text translated with operator dropdown options related to dates', () => {
      mockColumn.outputType = null as any;
      filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z'];

      filter.init(filterArguments);
      const filterOperatorElm = divContainer.querySelectorAll<HTMLSelectElement>('.input-group-prepend.operator select');

      expect(filterOperatorElm[0][0].title).toBe('');
      expect(removeExtraSpaces(filterOperatorElm[0][1].textContent!)).toBe('= Égal à');
      expect(removeExtraSpaces(filterOperatorElm[0][2].textContent!)).toBe('< Plus petit que');
      expect(removeExtraSpaces(filterOperatorElm[0][3].textContent!)).toBe('<= Plus petit ou égal à');
      expect(removeExtraSpaces(filterOperatorElm[0][4].textContent!)).toBe('> Plus grand que');
      expect(removeExtraSpaces(filterOperatorElm[0][5].textContent!)).toBe('>= Plus grand ou égal à');
      expect(removeExtraSpaces(filterOperatorElm[0][6].textContent!)).toBe('<> Non égal à');
    });
  });
});
