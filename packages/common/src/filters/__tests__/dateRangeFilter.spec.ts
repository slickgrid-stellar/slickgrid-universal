import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Calendar } from 'vanilla-calendar-pro';

import { FieldType } from '../../enums/index.js';
import type { Column, FilterArguments, GridOption } from '../../interfaces/index.js';
import { Filters } from '../filters.index.js';
import { DateRangeFilter } from '../dateRangeFilter.js';
import { TranslateServiceStub } from '../../../../../test/translateServiceStub.js';
import type { SlickGrid } from '../../core/index.js';

const containerId = 'demo-container';

// define a <div> container to simulate the grid container
const template = `<div id="${containerId}"></div>`;

let gridOptionMock = {
  enableFiltering: true,
  enableFilterTrimWhiteSpace: true,
} as GridOption;

const gridStub = {
  getOptions: () => gridOptionMock,
  getColumns: vi.fn(),
  getHeaderRowColumn: vi.fn(),
  render: vi.fn(),
  sanitizeHtmlString: (str) => str,
} as unknown as SlickGrid;

describe('DateRangeFilter', () => {
  let divContainer: HTMLDivElement;
  let filter: DateRangeFilter;
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

    mockColumn = { id: 'finish', field: 'finish', type: FieldType.dateIso, filterable: true, filter: { model: Filters.dateRange, operator: 'RangeInclusive' } };
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

    filter = new DateRangeFilter(translateService);
  });

  afterEach(() => {
    filter.destroy();
  });

  it('should throw an error when trying to call init without any arguments', () => {
    expect(() => filter.init(null as any)).toThrow('[Slickgrid-Universal] A filter must always have an "init()" with valid arguments.');
  });

  it('should initialize the filter', () => {
    filter.init(filterArguments);
    const filterCount = divContainer.querySelectorAll('.date-picker.search-filter.filter-finish').length;

    expect(spyGetHeaderRow).toHaveBeenCalled();
    expect(filterCount).toBe(1);
  });

  it('should have a placeholder when defined in its column definition', () => {
    const testValue = 'test placeholder';
    mockColumn.filter!.placeholder = testValue;

    filter.init(filterArguments);
    const filterElm = divContainer.querySelector('.date-picker.search-filter.filter-finish input') as HTMLInputElement;

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

  it('should be able to retrieve default date picker options through the Getter', () => {
    filter.init(filterArguments);

    expect(filter.calendarInstance).toBeTruthy();
    expect(filter.pickerOptions).toEqual({
      displayDatesOutside: false,
      displayMonthsCount: 2,
      enableDateToggle: true,
      enableEdgeDatesOnly: true,
      enableJumpToSelectedDate: true,
      firstWeekday: 0,
      inputMode: true,
      locale: 'en',
      monthsToSwitch: 2,
      onChangeToInput: expect.any(Function),
      onClickDate: expect.any(Function),
      positionToInput: 'auto',
      sanitizerHTML: expect.any(Function),
      selectionDatesMode: 'multiple-ranged',
      selectedTheme: 'light',
      selectedWeekends: [],
      type: 'multiple',
    });
  });

  it('should be able to call "setValues" and have them set in the picker', () => {
    const mockDates = ['2001-01-02T16:02:02.239Z', '2001-01-31T16:02:02.239Z'];
    filter.init(filterArguments);
    filter.setValues(mockDates);
    expect(filter.currentDateOrDates).toEqual(mockDates);
  });

  it('should be able to call "setValues" with 2 dots (..) notation and have them set in the picker', () => {
    const mockDate = '2001-01-02T16:02:02.239Z..2001-01-31T16:02:02.239Z';
    filter.init(filterArguments);
    filter.setValues([mockDate]);
    expect(filter.currentDateOrDates).toEqual(mockDate.split('..'));
  });

  it('should trigger input change event and expect the callback to be called with the date provided in the input', () => {
    mockColumn.filter!.operator = 'RangeInclusive';
    const spyCallback = vi.spyOn(filterArguments, 'callback');
    const selectedDates = ['2001-01-02', '2001-01-13'];

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('div.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    filter.calendarInstance!.onChangeToInput!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    filter.calendarInstance!.onClickDate!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.date-picker.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(filterInputElm.value).toBe('2001-01-02 — 2001-01-13');
    expect(spyCallback).toHaveBeenCalledWith(undefined, { columnDef: mockColumn, operator: 'RangeInclusive', searchTerms: ['2001-01-02', '2001-01-13'], shouldTriggerQuery: true });
  });

  it('should trigger input change event with empty value and still expect the callback to be called with the date provided in the input', () => {
    mockColumn.filter!.operator = 'RangeInclusive';

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    filterInputElm.value = '2001-01-02T16:02:02.239Z';
    filter.calendarInstance!.onClickDate!({ context: { inputElement: filterInputElm, selectedDates: [] }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    filter.calendarInstance!.onChangeToInput!({ context: { inputElement: filterInputElm, selectedDates: [] }, hide: vi.fn() } as unknown as Calendar, new Event('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.form-group.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(0);
    expect(filterInputElm.value).toBe('');
  });

  it('should pass a different operator then trigger an input change event and expect the callback to be called with the date provided in the input', () => {
    mockColumn.filter!.operator = 'RangeExclusive';
    const spyCallback = vi.spyOn(filterArguments, 'callback');
    const selectedDates = ['2001-01-02', '2001-01-13'];

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    filter.calendarInstance!.onChangeToInput!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    filter.calendarInstance!.onClickDate!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.date-picker.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(filterInputElm.value).toBe('2001-01-02 — 2001-01-13');
    expect(spyCallback).toHaveBeenCalledWith(undefined, { columnDef: mockColumn, operator: 'RangeExclusive', searchTerms: ['2001-01-02', '2001-01-13'], shouldTriggerQuery: true });
  });

  it('should clear picker when pressing Backspace key', () => {
    filterArguments.searchTerms = ['2001-01-02', '2001-01-13'];
    mockColumn.filter!.operator = 'RangeInclusive';
    const clearSpy = vi.spyOn(filter, 'clear');
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    filter.show();
    const filterInputElm = divContainer.querySelector('.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const calendarElm = document.body.querySelector('.vc') as HTMLDivElement;

    expect(calendarElm).toBeTruthy();
    expect(filterInputElm.value).toBe('2001-01-02 — 2001-01-13');

    filterInputElm.dispatchEvent(new (window.window as any).KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
    expect(clearSpy).toHaveBeenCalled();
    expect(filterInputElm.value).toBe('');
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, operator: 'RangeInclusive', searchTerms: [], shouldTriggerQuery: true });
  });

  it('should create the input filter with a default search terms when passed as a filter argument', () => {
    const selectedDates = ['2001-01-02', '2001-01-13'];
    filterArguments.searchTerms = ['2001-01-02', '2001-01-13'];
    mockColumn.filter!.operator = 'RangeInclusive';
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;

    filterInputElm.focus();
    filter.calendarInstance!.onChangeToInput!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    filter.calendarInstance!.onClickDate!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.date-picker.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(filterInputElm.value).toBe('2001-01-02 — 2001-01-13');
    expect(spyCallback).toHaveBeenCalledWith(undefined, { columnDef: mockColumn, operator: 'RangeInclusive', searchTerms: ['2001-01-02', '2001-01-13'], shouldTriggerQuery: true });
  });

  it('should create the input filter with a default search term when passed as a filter argument with 2 dots (..) notation', () => {
    const selectedDates = ['2001-01-01', '2001-01-02', '2001-01-03'];
    filterArguments.searchTerms = ['2001-01-01..2001-01-03'];
    mockColumn.filter!.operator = 'RangeInclusive';
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;

    filterInputElm.focus();
    filter.calendarInstance!.onClickDate!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    filter.calendarInstance!.onChangeToInput!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));

    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.date-picker.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(filterInputElm.value).toBe('2001-01-01 — 2001-01-03');
    expect(spyCallback).toHaveBeenCalledWith(undefined, { columnDef: mockColumn, operator: 'RangeInclusive', searchTerms: ['2001-01-01', '2001-01-03'], shouldTriggerQuery: true });
  });

  it('should be able to call "setValues" and set empty values and the picker input to not have the "filled" css class', () => {
    const mockDates = ['2001-01-02T05:00:00.000Z', '2001-01-13T05:00:00.000Z'];
    filter.init(filterArguments);
    filter.setValues(mockDates);
    let filledInputElm = divContainer.querySelector('.search-filter.filter-finish.filled') as HTMLInputElement;

    expect(filter.currentDateOrDates).toEqual(mockDates);
    expect(filledInputElm).toBeTruthy();

    filter.setValues('');
    filledInputElm = divContainer.querySelector('.search-filter.filter-finish.filled') as HTMLInputElement;
    expect(filledInputElm).toBeFalsy();
  });

  it('should work with different locale when locale is changed', async () => {
    translateService.use('fr');
    const selectedDates = ['2001-01-01', '2001-01-02', '2001-01-03'];
    filterArguments.searchTerms = ['2001-01-01', '2001-01-03'];
    mockColumn.filter!.operator = 'RangeInclusive';
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    filter.show();
    const filterInputElm = divContainer.querySelector('.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const calendarElm = document.body.querySelector('.vc') as HTMLDivElement;
    const monthElm = calendarElm.querySelector('[data-vc="month"]') as HTMLButtonElement;

    filter.show();

    filterInputElm.focus();
    filter.calendarInstance!.onClickDate!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    filter.calendarInstance!.onChangeToInput!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.date-picker.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(filterInputElm.value).toBe('2001-01-01 — 2001-01-03');
    expect(spyCallback).toHaveBeenCalledWith(undefined, { columnDef: mockColumn, operator: 'RangeInclusive', searchTerms: ['2001-01-01', '2001-01-03'], shouldTriggerQuery: true });
    expect(calendarElm).toBeTruthy();
    expect(monthElm).toBeTruthy();
    // expect(monthElm.textContent).toBe('janvier');
  });

  it('should trigger a callback with the clear filter set when calling the "clear" method', () => {
    filterArguments.searchTerms = ['2001-01-01', '2001-01-03'];
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    filter.clear();
    const filterInputElm = divContainer.querySelector('.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.date-picker.search-filter.filter-finish.filled');

    expect(filterInputElm.value).toBe('');
    expect(filterFilledElms.length).toBe(0);
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, clearFilterTriggered: true, shouldTriggerQuery: true });
  });

  it('should trigger a callback with the clear filter but without querying when when calling the "clear" method with False as argument', () => {
    filterArguments.searchTerms = ['2001-01-01', '2001-01-31'];
    const spyCallback = vi.spyOn(filterArguments, 'callback');

    filter.init(filterArguments);
    filter.clear(false);
    const filterInputElm = divContainer.querySelector('.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.date-picker.search-filter.filter-finish.filled');

    expect(filterInputElm.value).toBe('');
    expect(filterFilledElms.length).toBe(0);
    expect(spyCallback).toHaveBeenCalledWith(expect.anything(), { columnDef: mockColumn, clearFilterTriggered: true, shouldTriggerQuery: false });
  });

  it('should have a value with date & time in the picker when "enableTime" option is set and we trigger a change', () => {
    mockColumn.outputType = FieldType.dateTimeIsoAmPm;
    mockColumn.filter!.operator = '>';
    const spyCallback = vi.spyOn(filterArguments, 'callback');
    const selectedDates = ['2001-01-02', '2001-01-13'];

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    filterInputElm.value = '2001-01-02 — 2001-01-13';
    filter.calendarInstance!.onChangeToInput!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    filter.calendarInstance!.onClickDate!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));

    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.date-picker.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    // expect(filter.currentDateOrDates.map((date) => date.toISOString())).toEqual(['2001-01-01T05:00:00.000Z', '2001-01-31T05:00:00.000Z']);
    expect(filterInputElm.value).toBe('2001-01-02 12:00:00 am — 2001-01-13 12:00:00 am');
    expect(spyCallback).toHaveBeenCalledWith(undefined, {
      columnDef: mockColumn, operator: '>', searchTerms: ['2001-01-02', '2001-01-13'], shouldTriggerQuery: true
    });
  });

  it('should have a value with date & time in the picker when "enableTime" option is set as a global default filter option and we trigger a change', () => {
    gridOptionMock.defaultFilterOptions = {
    };
    mockColumn.outputType = FieldType.dateTimeIsoAmPm;
    mockColumn.filter!.operator = '>';
    const spyCallback = vi.spyOn(filterArguments, 'callback');
    const selectedDates = ['2001-01-02', '2001-01-13'];

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('div.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;
    filterInputElm.value = '2001-01-02 — 2001-01-13';
    filter.calendarInstance!.onChangeToInput!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    filter.calendarInstance!.onClickDate!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.date-picker.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    // expect(filter.currentDateOrDates.map((date) => date.toISOString())).toEqual(['2000-01-01T05:00:00.000Z', '2000-01-31T05:00:00.000Z']);
    expect(filterInputElm.value).toBe('2001-01-02 12:00:00 am — 2001-01-13 12:00:00 am');
    expect(spyCallback).toHaveBeenCalledWith(undefined, {
      columnDef: mockColumn, operator: '>', searchTerms: ['2001-01-02', '2001-01-13'], shouldTriggerQuery: true
    });
  });

  it('should have a value with date & time in the picker when using no "outputType" which will default to UTC date', () => {
    mockColumn.outputType = null as any;
    filterArguments.searchTerms = ['2000-01-01T05:00:00.000Z', '2000-01-31T05:00:00.000Z'];
    mockColumn.filter!.operator = '<=';
    const spyCallback = vi.spyOn(filterArguments, 'callback');
    const selectedDates = ['2001-01-02', '2001-01-13'];

    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('div.date-picker.search-filter.filter-finish input.date-picker') as HTMLInputElement;

    filterInputElm.focus();
    filterInputElm.value = '2001-01-02 — 2001-01-13';
    filter.calendarInstance!.onChangeToInput!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    filter.calendarInstance!.onClickDate!({ context: { inputElement: filterInputElm, selectedDates }, hide: vi.fn() } as unknown as Calendar, new MouseEvent('click'));
    const filterFilledElms = divContainer.querySelectorAll<HTMLInputElement>('.date-picker.search-filter.filter-finish.filled');

    expect(filterFilledElms.length).toBe(1);
    expect(filterInputElm.value).toBe('2001-01-02 — 2001-01-13');
    expect(spyCallback).toHaveBeenCalledWith(undefined, { columnDef: mockColumn, operator: '<=', searchTerms: ['2001-01-02', '2001-01-13'], shouldTriggerQuery: true });
  });
});
