import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Column, FilterArguments, GridOption } from '../../interfaces/index.js';
import { Filters } from '../index.js';
import { CompoundInputPasswordFilter } from '../compoundInputPasswordFilter.js';
import { TranslateServiceStub } from '../../../../../test/translateServiceStub.js';
import type { SlickGrid } from '../../core/index.js';

const containerId = 'demo-container';

// define a <div> container to simulate the grid container
const template = `<div id="${containerId}"></div>`;

const gridOptionMock = {
  enableFiltering: true,
  enableFilterTrimWhiteSpace: true,
} as GridOption;

const gridStub = {
  applyHtmlCode: (elm, val) => (elm.innerHTML = val || ''),
  getOptions: () => gridOptionMock,
  getColumns: vi.fn(),
  getHeaderRowColumn: vi.fn(),
  render: vi.fn(),
} as unknown as SlickGrid;

describe('CompoundInputPasswordFilter', () => {
  let translateService: TranslateServiceStub;
  let divContainer: HTMLDivElement;
  let filter: CompoundInputPasswordFilter;
  let filterArguments: FilterArguments;
  let spyGetHeaderRow;
  let mockColumn: Column;

  beforeEach(() => {
    translateService = new TranslateServiceStub();

    divContainer = document.createElement('div');
    divContainer.innerHTML = template;
    document.body.appendChild(divContainer);
    spyGetHeaderRow = vi.spyOn(gridStub, 'getHeaderRowColumn').mockReturnValue(divContainer);

    mockColumn = { id: 'duration', field: 'duration', filterable: true, filter: { model: Filters.input, operator: 'EQ' } };
    filterArguments = {
      grid: gridStub,
      columnDef: mockColumn,
      callback: vi.fn(),
      filterContainerElm: gridStub.getHeaderRowColumn(mockColumn.id),
    };

    filter = new CompoundInputPasswordFilter(translateService);
  });

  afterEach(() => {
    filter.destroy();
  });

  it('should throw an error when trying to call init without any arguments', () => {
    expect(() => filter.init(null as any)).toThrow('[Slickgrid-Universal] A filter must always have an "init()" with valid arguments.');
  });

  it('should have an aria-label when creating the filter', () => {
    filter.init(filterArguments);
    const filterInputElm = divContainer.querySelector('.search-filter.filter-duration input') as HTMLInputElement;

    expect(filterInputElm.ariaLabel).toBe('Duration Search Filter');
  });

  it('should initialize the filter and expect an input of type password', () => {
    filter.init(filterArguments);
    const filterCount = divContainer.querySelectorAll('.search-filter.filter-duration').length;

    expect(spyGetHeaderRow).toHaveBeenCalled();
    expect(filterCount).toBe(1);
    expect(filter.inputType).toBe('password');
  });
});
