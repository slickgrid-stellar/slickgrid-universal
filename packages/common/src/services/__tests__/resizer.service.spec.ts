import { EventPubSubService } from '@slickgrid-universal/event-pub-sub';

import { Editors } from '../../editors/index';
import { FieldType, } from '../../enums/index';
import { Column, GridOption, SlickGrid, SlickNamespace, } from '../../interfaces/index';
import { ResizerService } from '../resizer.service';

declare const Slick: SlickNamespace;
const DATAGRID_MIN_HEIGHT = 180;
const DATAGRID_MIN_WIDTH = 300;
const DATAGRID_BOTTOM_PADDING = 20;
const DATAGRID_FOOTER_HEIGHT = 25;
const DATAGRID_PAGINATION_HEIGHT = 35;
const GRID_UID = 'slickgrid_12345';
const GRID_ID = 'grid1';
const CONTAINER_ID = 'demo-container';

const template =
  `<div id="${CONTAINER_ID}" style="height: 800px; width: 600px; overflow: hidden; display: block;">
    <div id="slickGridContainer-${GRID_ID}" class="gridPane" style="width: 100%;">
      <div id="${GRID_ID}" class="${GRID_UID}" style="width: 100%">
        <div class="slick-viewport">
          <div class="slick-header"></div>
        </div>
      </div>
    </div>
  </div>`;

const mockDataView = {
  constructor: jest.fn(),
  init: jest.fn(),
  destroy: jest.fn(),
  getItemMetadata: jest.fn(),
  getItemCount: jest.fn(),
  getItems: jest.fn(),
};

const gridStub = {
  autosizeColumns: jest.fn(),
  getContainerNode: jest.fn(),
  getColumnIndex: jest.fn(),
  getColumns: jest.fn(),
  getOptions: jest.fn(),
  getRenderedRange: jest.fn(),
  getViewports: jest.fn(),
  getData: () => mockDataView,
  getUID: () => GRID_UID,
  reRenderColumns: jest.fn(),
  registerPlugin: jest.fn(),
  resizeCanvas: jest.fn(),
  setColumns: jest.fn(),
  setHeaderRowVisibility: jest.fn(),
  setTopPanelVisibility: jest.fn(),
  setPreHeaderPanelVisibility: jest.fn(),
  setOptions: jest.fn(),
  setSortColumns: jest.fn(),
  updateColumns: jest.fn(),
  onColumnsResizeDblClick: new Slick.Event(),
  onSort: new Slick.Event(),
} as unknown as SlickGrid;

describe('Resizer Service', () => {
  let eventPubSubService: EventPubSubService;
  let service: ResizerService;
  let divContainer: HTMLDivElement;
  let mockGridOptions: GridOption;
  let resizeObserverMock: jest.Mock<ResizeObserver, [callback: ResizeObserverCallback]>;

  beforeEach(() => {
    divContainer = document.createElement('div');
    divContainer.innerHTML = template;
    document.body.appendChild(divContainer);

    resizeObserverMock = jest.fn(function (callback: ResizeObserverCallback): ResizeObserver {
      this.observe = jest.fn().mockImplementation(() => {
        callback([], this); // Execute the callback on observe, similar to the window.ResizeObserver.
      });
      this.unobserve = jest.fn();
      this.disconnect = jest.fn();
      return this;
    });

    global.ResizeObserver = resizeObserverMock;

    eventPubSubService = new EventPubSubService();
    service = new ResizerService(eventPubSubService);
    service.intervalRetryDelay = 1;
    mockGridOptions = {
      autoFixResizeWhenBrokenStyleDetected: false,
      enableAutoResize: true,
      autoResize: {
        container: '.grid1',
        maxHeight: 800,
        maxWidth: 1200,
        rightPadding: 10,
      },
      enableFiltering: true,
      headerRowHeight: 30,
      createPreHeaderPanel: true,
      showPreHeaderPanel: true,
      preHeaderPanelHeight: 20,
      resizeByContentOptions: {},
    } as GridOption;
    jest.spyOn(gridStub, 'getOptions').mockReturnValue(mockGridOptions);
    jest.spyOn(gridStub, 'getContainerNode').mockReturnValue(divContainer.querySelector(`#${GRID_ID}`) as HTMLDivElement);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.dispose();
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  describe('init method', () => {
    it('should throw an error when there is no grid object defined', () => {
      expect(() => service.init(null as any, divContainer)).toThrowError('[Slickgrid-Universal] Resizer Service requires a valid Grid object and DOM Element Container to be provided.');
    });

    it('should call "bindAutoResizeDataGrid" when autoResize is enabled', () => {
      mockGridOptions.enableAutoResize = true;
      jest.spyOn(gridStub, 'getContainerNode').mockReturnValue(null as any);
      const bindAutoResizeDataGridSpy = jest.spyOn(service, 'bindAutoResizeDataGrid').mockImplementation();

      service.init(gridStub, divContainer);

      expect(bindAutoResizeDataGridSpy).toHaveBeenCalled();
    });

    it('should not call "bindAutoResizeDataGrid" when autoResize is not enabled', () => {
      mockGridOptions.enableAutoResize = false;
      jest.spyOn(gridStub, 'getContainerNode').mockReturnValue(null as any);
      const bindAutoResizeDataGridSpy = jest.spyOn(service, 'bindAutoResizeDataGrid').mockImplementation();

      service.init(gridStub, divContainer);

      expect(bindAutoResizeDataGridSpy).not.toHaveBeenCalled();
    });

    it('should observe resize events on the container element when "resizeDetection" is "container"', () => {
      mockGridOptions.enableAutoResize = true;
      mockGridOptions.autoResize!.resizeDetection = 'container';
      const resizeContainer = document.createElement('div');
      mockGridOptions.autoResize!.container = resizeContainer;

      service.init(gridStub, divContainer);

      expect(resizeObserverMock.mock.instances.length).toBe(1);
      const observerInstance = resizeObserverMock.mock.instances[0];

      expect(observerInstance.observe).toHaveBeenCalledTimes(1);
      expect(observerInstance.observe).toHaveBeenCalledWith(resizeContainer);
    });

    it('should throw an error when container element is not valid and "resizeDetection" is "container"', () => {
      mockGridOptions.enableAutoResize = true;
      mockGridOptions.autoResize!.resizeDetection = 'container';
      mockGridOptions.autoResize!.container = '#doesnotexist';

      expect(() => service.init(gridStub, divContainer)).toThrowError('[Slickgrid-Universal] Resizer Service requires a container when gridOption.autoResize.resizeDetection="container"');
    });

    it('should execute "resizeGrid" when "resizeDetection" is "container"', () => {
      mockGridOptions.enableAutoResize = true;
      mockGridOptions.autoResize!.resizeDetection = "container";
      const resizeContainer = document.createElement('div');
      mockGridOptions.autoResize!.container = resizeContainer;

      const resizeGridSpy = jest.spyOn(service, 'resizeGrid');

      service.init(gridStub, divContainer);

      expect(resizeGridSpy).toHaveBeenCalledWith();
    });

    it('should not execute "resizeGrid" when "resizeDetection" is "container" and the resizer is paused', () => {
      mockGridOptions.enableAutoResize = true;
      mockGridOptions.autoResize!.resizeDetection = "container";
      const resizeContainer = document.createElement('div');
      mockGridOptions.autoResize!.container = resizeContainer;

      const resizeGridSpy = jest.spyOn(service, 'resizeGrid');

      service.pauseResizer(true);

      service.init(gridStub, divContainer);

      expect(resizeGridSpy).not.toHaveBeenCalled();
    });
  });

  describe('dispose method', () => {
    it('should clear resizeGrid timeout', (done) => {
      service.init(gridStub, divContainer);

      const resizeGridWithDimensionsSpy = jest.spyOn(service, 'resizeGridWithDimensions');
      service.resizeGrid(1);
      service.dispose();

      setTimeout(() => {
        expect(resizeGridWithDimensionsSpy).not.toHaveBeenCalled();
        done();
      }, 2);
    });

    it('should disconnect from resize events on the container element when "resizeDetection" is "container"', () => {
      mockGridOptions.enableAutoResize = true;
      mockGridOptions.autoResize!.resizeDetection = "container";
      const resizeContainer = document.createElement('div');
      mockGridOptions.autoResize!.container = resizeContainer;

      service.init(gridStub, divContainer);

      service.dispose();

      expect(resizeObserverMock.mock.instances.length).toBe(1);
      const observerInstance = resizeObserverMock.mock.instances[0];

      expect(observerInstance.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('resizeGrid method', () => {
    beforeEach(() => {
      // @ts-ignore
      navigator.__defineGetter__('userAgent', () => 'Netscape');
      mockGridOptions.gridId = 'grid1';
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return null when calling "bindAutoResizeDataGrid" method with a gridId that is not found in the DOM', () => {
      jest.spyOn(gridStub, 'getContainerNode').mockReturnValue(null as any);
      service.init(gridStub, divContainer);
      const output = service.bindAutoResizeDataGrid();

      expect(output).toBe(null as any);
      expect(service.eventHandler).toBeTruthy();
    });

    it('should return null when calling "calculateGridNewDimensions" method with a gridId that is not found in the DOM', () => {
      jest.spyOn(gridStub, 'getContainerNode').mockReturnValue(null as any);
      service.init(gridStub, divContainer);
      const output = service.calculateGridNewDimensions(mockGridOptions);
      expect(output).toBe(null as any);
    });

    it('should trigger a grid resize when a window resize event occurs', () => {
      // arrange
      const newHeight = 500;
      const fixedWidth = 800;
      mockGridOptions.gridWidth = fixedWidth;
      service.init(gridStub, divContainer);
      const previousHeight = window.innerHeight;
      const pubSubSpy = jest.spyOn(eventPubSubService, 'publish');
      const gridSpy = jest.spyOn(gridStub, 'getOptions');
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');
      const serviceResizeSpy = jest.spyOn(service, 'resizeGrid');

      // act
      // bind window resize & call a viewport resize
      service.bindAutoResizeDataGrid();
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));
      const lastDimensions = service.getLastResizeDimensions();

      // so the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight" while the width it uses the container width
      // for that reason, we can only verify the height, while the width should be set as the minimum width from the constant because 0 is override by the constant
      const dimensionResult = { height: newHeight - DATAGRID_BOTTOM_PADDING, width: fixedWidth };

      // assert
      expect(gridSpy).toHaveBeenCalled();
      expect(serviceResizeSpy).toHaveBeenCalled();
      expect(window.innerHeight).not.toEqual(previousHeight);
      expect(serviceCalculateSpy).toReturnWith(dimensionResult);
      expect(lastDimensions).toEqual(dimensionResult);
      expect(pubSubSpy).toHaveBeenCalledWith(`onGridBeforeResize`);
      expect(pubSubSpy).toHaveBeenCalledWith(`onGridAfterResize`, dimensionResult);
    });

    it('should resize grid to a defined height and width when fixed dimensions are provided to the init method', () => {
      const fixedHeight = 330;
      const fixedWidth = 412;
      const windowHeight = 840;
      mockGridOptions.gridHeight = fixedHeight;
      mockGridOptions.gridWidth = fixedWidth;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: windowHeight });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions(mockGridOptions);

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      expect(serviceCalculateSpy).toReturnWith({ height: fixedHeight, width: fixedWidth });
    });

    it('should calculate new dimensions even when no container element is defined', () => {
      const newHeight = 440;
      const fixedWidth = 800;
      mockGridOptions.gridWidth = fixedWidth;
      mockGridOptions.autoResize!.container = undefined;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions(mockGridOptions);

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      expect(serviceCalculateSpy).toReturnWith({ height: (newHeight - DATAGRID_BOTTOM_PADDING), width: fixedWidth });
    });

    it('should calculate new dimensions when calculateGridNewDimensions is called', () => {
      const newHeight = 440;
      const fixedWidth = 800;
      mockGridOptions.gridWidth = fixedWidth;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions(mockGridOptions);

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      expect(serviceCalculateSpy).toReturnWith({ height: (newHeight - DATAGRID_BOTTOM_PADDING), width: fixedWidth });
    });

    it('should calculate new dimensions, minus the custom footer height, when calculateGridNewDimensions is called', () => {
      const newHeight = 440;
      const fixedWidth = 800;
      const newOptions = { ...mockGridOptions, enablePagination: false, showCustomFooter: true } as GridOption;
      mockGridOptions.gridWidth = fixedWidth;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions(newOptions);

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      expect(serviceCalculateSpy).toReturnWith({ height: (newHeight - DATAGRID_BOTTOM_PADDING - DATAGRID_FOOTER_HEIGHT), width: fixedWidth });
    });

    it('should calculate new dimensions, minus the custom footer height passed in grid options, when calculateGridNewDimensions is called', () => {
      const newHeight = 440;
      const fixedWidth = 800;
      const footerHeight = 25;
      const newOptions = { ...mockGridOptions, enablePagination: false, showCustomFooter: true, customFooterOptions: { footerHeight } } as GridOption;
      mockGridOptions.gridWidth = fixedWidth;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions(newOptions);

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      expect(serviceCalculateSpy).toReturnWith({ height: (newHeight - DATAGRID_BOTTOM_PADDING - footerHeight), width: fixedWidth });
    });

    it('should use maxHeight when new dimensions are higher than maximum defined', () => {
      const newHeight = 1000;
      const fixedWidth = 800;
      mockGridOptions.gridWidth = fixedWidth;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions(mockGridOptions);

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      expect(serviceCalculateSpy).toReturnWith({ height: mockGridOptions.autoResize!.maxHeight, width: fixedWidth });
    });

    it('should use maxWidth when new dimensions are higher than maximum defined', () => {
      const newWidth = 2000;
      const fixedHeight = 500;
      mockGridOptions.gridHeight = fixedHeight;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: newWidth });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions(mockGridOptions);

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      expect(serviceCalculateSpy).toReturnWith({ height: fixedHeight, width: mockGridOptions.autoResize!.maxWidth });
    });

    it('should use minWidth constant when new dimensions are lower than minimum defined', () => {
      const newWidth = 20;
      const fixedHeight = 500;
      mockGridOptions.gridHeight = fixedHeight;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: newWidth });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions(mockGridOptions);

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      expect(serviceCalculateSpy).toReturnWith({ height: fixedHeight, width: DATAGRID_MIN_WIDTH });
    });

    it('should calculate new width dimensions minus a padding when "rightPadding" is defined', () => {
      const newWidth = 800;
      const fixedHeight = 500;
      mockGridOptions.gridHeight = fixedHeight;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: newWidth });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions(mockGridOptions);

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      expect(serviceCalculateSpy).toReturnWith({ height: fixedHeight, width: newWidth - mockGridOptions.autoResize!.rightPadding! });
    });

    it('should calculate new dimensions minus a padding when "bottomPadding" is defined in "autoResize" and calculateGridNewDimensions is called', () => {
      const newHeight = 422;
      const fixedWidth = 800;
      const inputBottomPadding = 13;
      mockGridOptions.gridWidth = fixedWidth;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions({ ...mockGridOptions, autoResize: { bottomPadding: inputBottomPadding } });

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      expect(serviceCalculateSpy).toReturnWith({ height: (newHeight - inputBottomPadding), width: fixedWidth });
    });

    it('should use new dimensions when passed as argument to the "resizeGrid" method', (done) => {
      const newHeight = 422;
      const newWidth = 804;
      service.init(gridStub, divContainer);

      service.resizeGrid(0, { height: newHeight, width: newWidth }).then((newDimensions) => {
        expect(newDimensions).toEqual({ height: newHeight, width: newWidth });
        done();
      });
    });

    it('should calculate new dimensions minus the pagination height when pagination is enabled and resizeGrid is called with a delay', async () => {
      const pubSubSpy = jest.spyOn(eventPubSubService, 'publish');

      const newHeight = 440;
      const fixedWidth = 800;
      mockGridOptions.gridWidth = fixedWidth;
      mockGridOptions.enablePagination = true;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');

      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));
      const newGridDimensions = await service.resizeGrid(2);

      // same comment as previous test, the height dimension will work because calculateGridNewDimensions() uses "window.innerHeight"
      const calculatedDimensions = { height: (newHeight - DATAGRID_BOTTOM_PADDING - DATAGRID_PAGINATION_HEIGHT), width: fixedWidth };
      expect(serviceCalculateSpy).toReturnWith(calculatedDimensions);
      expect(newGridDimensions).toEqual(calculatedDimensions);
      expect(pubSubSpy).toHaveBeenCalledWith('onGridBeforeResize');
      expect(pubSubSpy).toHaveBeenCalledWith('onGridAfterResize', newGridDimensions);
    });

    it('should calculate new dimensions by using the container dimensions (instead of the window dimensions) when calculateAvailableSizeBy is set to container', () => {
      const newHeight = 500;
      const fixedWidth = 800;
      const calculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');
      mockGridOptions.gridWidth = fixedWidth;
      service.init(gridStub, divContainer);
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));
      service.calculateGridNewDimensions({ ...mockGridOptions, autoResize: { calculateAvailableSizeBy: 'container' } });

      // with JSDOM the height is always 0 so we can assume that the height will be the minimum height (without the padding)
      expect(calculateSpy).toReturnWith({ height: DATAGRID_MIN_HEIGHT, width: fixedWidth });
    });

    it('should call the autosizeColumns from the core lib when "enableAutoSizeColumns" is set and the new width is wider than prior width', () => {
      const newHeight = 500;
      mockGridOptions.enableAutoSizeColumns = true;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');
      const gridAutosizeSpy = jest.spyOn(gridStub, 'autosizeColumns');

      service.bindAutoResizeDataGrid();
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));

      // with JSDOM the height is always 0 so we can assume that the height will be the minimum height (without the padding)
      expect(serviceCalculateSpy).toHaveBeenCalled();
      expect(gridAutosizeSpy).toHaveBeenCalled();
    });

    it('should call "resizeGridWithDimensions" method and expect "resizeColumnsByCellContent" to be called when "enableAutoResizeColumnsByCellContent" is set', () => {
      const resizeContentSpy = jest.spyOn(service, 'resizeColumnsByCellContent');

      mockGridOptions.enableAutoResizeColumnsByCellContent = true;
      service.init(gridStub, divContainer);

      service.resizeGridWithDimensions({ height: 200, width: 800 });

      expect(resizeContentSpy).toHaveBeenCalledWith(false);
    });

    it('should expect "resizeColumnsByCellContent" to be called when "enableAutoResizeColumnsByCellContent" is set and "onGridAfterResize" event is called after "resizeGrid"', (done) => {
      jest.spyOn(service, 'resizeGridWithDimensions').mockReturnValue({ height: 200, width: 800 });
      const resizeContentSpy = jest.spyOn(service, 'resizeColumnsByCellContent');

      mockGridOptions.enableAutoResizeColumnsByCellContent = true;
      service.init(gridStub, divContainer);

      service.resizeGrid(0);

      setTimeout(() => {
        expect(resizeContentSpy).toHaveBeenCalledWith(false);
        done();
      });
    });

    it('should stop resizing when user called "pauseResizer" with true', () => {
      service.bindAutoResizeDataGrid();
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 450 });
      window.dispatchEvent(new Event('resize'));

      service.pauseResizer(true);
      const spy = jest.spyOn(service, 'resizeGrid');

      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 550 });
      window.dispatchEvent(new Event('resize'));

      expect(spy).not.toHaveBeenCalled();
    });

    it('should call a grid "resizeCanvas" when size changes', () => {
      const newHeight = 500;
      service.init(gridStub, divContainer);
      const serviceCalculateSpy = jest.spyOn(service, 'calculateGridNewDimensions');
      const resizeCanvasSpy = jest.spyOn(gridStub, 'resizeCanvas');

      service.bindAutoResizeDataGrid();
      Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: newHeight });
      window.dispatchEvent(new Event('resize'));

      // with JSDOM the height is always 0 so we can assume that the height will be the minimum height (without the padding)
      expect(serviceCalculateSpy).toHaveBeenCalled();
      expect(resizeCanvasSpy).toHaveBeenCalled();
    });

    describe('resizeColumnsByCellContent method', () => {
      let mockColDefs: Column[];
      let mockData: any[];

      afterEach(() => {
        service.dispose();
        jest.clearAllMocks();
      });

      beforeEach(() => {
        mockGridOptions.resizeByContentOptions!.cellCharWidthInPx = 7;
        mockGridOptions.resizeByContentOptions!.cellPaddingWidthInPx = 6;
        mockGridOptions.resizeByContentOptions!.formatterPaddingWidthInPx = 5;
        mockGridOptions.resizeByContentOptions!.defaultRatioForStringType = 0.88;
        mockGridOptions.resizeByContentOptions!.alwaysRecalculateColumnWidth = false;
        mockGridOptions.resizeByContentOptions!.maxItemToInspectCellContentWidth = 4;
        mockColDefs = [
          // typically the `originalWidth` is set by the columnDefinitiosn setter in vanilla grid bundle but we can mock it for our test
          { id: 'userId', field: 'userId', width: 30, originalWidth: 30 },
          { id: 'firstName', field: 'firstName', editor: { model: Editors.text }, minWidth: 50 },
          { id: 'lastName', field: 'lastName', editor: { model: Editors.text }, minWidth: 50 },
          { id: 'gender', field: 'gender', resizeCalcWidthRatio: 1.2 },
          { id: 'age', field: 'age', type: FieldType.number, resizeExtraWidthPadding: 2 },
          { id: 'street', field: 'street', maxWidth: 15 },
          { id: 'country', field: 'country', maxWidth: 15, resizeMaxWidthThreshold: 14, rerenderOnResize: true },
          { id: 'zip', field: 'zip', width: 20, type: 'number' },
        ] as Column[];
        mockData = [
          { userId: 1, firstName: 'John', lastName: 'Doe', gender: 'male', age: 20, street: '478 Kunze Land', country: 'United States of America', zip: 123456 },
          { userId: 2, firstName: 'Destinee', lastName: 'Shanahan', gender: 'female', age: 25, street: '20519 Watson Lodge', country: 'Australia', zip: 223344 },
          { userId: 3, firstName: 'Sarai', lastName: 'Altenwerth', gender: 'female', age: 30, street: '184 Preston Pine', country: 'United States of America', zip: 334433 },
          { userId: 4, firstName: 'Tyshawn', lastName: 'Hyatt', gender: 'male', age: 35, street: '541 Senger Drives', country: 'Canada', zip: 444455 },
          { userId: 5, firstName: 'Alvina', lastName: 'Franecki', gender: 'female', age: 100, street: '20229 Tia Turnpike', country: 'United States of America', zip: 777555 },
          { userId: 6, firstName: 'Therese', lastName: 'Brakus', gender: 'female', age: 99, street: '34767 Lindgren Dam', country: 'Bosnia', zip: 654321 },
        ];

        jest.spyOn(gridStub, 'getColumns').mockReturnValue(mockColDefs);
        jest.spyOn(mockDataView, 'getItems').mockReturnValue(mockData);
      });

      it('should call handleSingleColumnResizeByContent when "onHeaderMenuColumnResizeByContent" gets triggered', () => {
        const reRenderSpy = jest.spyOn(gridStub, 'reRenderColumns');

        mockGridOptions.enableColumnResizeOnDoubleClick = true;
        service.init(gridStub, divContainer);
        eventPubSubService.publish('onHeaderMenuColumnResizeByContent', { columnId: 'firstName' });

        expect(reRenderSpy).toHaveBeenCalledWith(false);
        expect(mockColDefs[1].width).toBe(56); // longest word "Destinee" (length 8 * charWidth(7) * ratio(0.88)) + cellPadding(6) = 55.28 ceil to => 56
      });

      it('should call handleSingleColumnResizeByContent when "onHeaderMenuColumnResizeByContent" gets triggered but expect a resized column width when left section width becomes greater than full viewport width', () => {
        const viewportLeft = document.createElement('div');
        viewportLeft.className = 'slick-viewport-left';
        Object.defineProperty(viewportLeft, 'clientWidth', { writable: true, configurable: true, value: 250 });

        const viewportRight = document.createElement('div');
        viewportRight.className = 'slick-viewport-right';
        Object.defineProperty(viewportRight, 'clientWidth', { writable: true, configurable: true, value: 27 });

        jest.spyOn(gridStub, 'getViewports').mockReturnValue([viewportLeft, viewportRight]);
        const reRenderSpy = jest.spyOn(gridStub, 'reRenderColumns');

        mockGridOptions.frozenColumn = 7;
        mockGridOptions.enableColumnResizeOnDoubleClick = true;
        mockGridOptions.resizeByContentOptions!.widthToRemoveFromExceededWidthReadjustment = 20;
        service.init(gridStub, divContainer);
        gridStub.onColumnsResizeDblClick.notify({ triggeredByColumn: 'zip', grid: gridStub });

        expect(reRenderSpy).toHaveBeenCalledWith(false);
        expect(mockColDefs[7].width).toBeLessThan(30);
      });

      it('should call the resize and expect to call "autosizeColumns" when total column widths is smaller than the grid viewport', () => {
        Object.defineProperty(divContainer, 'offsetWidth', { writable: true, configurable: true, value: 2500 });

        service.init(gridStub, divContainer);
        service.resizeColumnsByCellContent(true);

        const autosizeSpy = jest.spyOn(gridStub, 'autosizeColumns');
        service.resizeColumnsByCellContent(false);

        expect(autosizeSpy).toHaveBeenCalled();
      });

      it('should call the resize and expect first column have a fixed width while other will have a calculated width when resizing by their content', () => {
        const setColumnsSpy = jest.spyOn(gridStub, 'setColumns');
        const reRenderColumnsSpy = jest.spyOn(gridStub, 'reRenderColumns');

        service.init(gridStub, divContainer);
        service.resizeColumnsByCellContent(true);

        expect(setColumnsSpy).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'userId', width: 30 }),
            expect.objectContaining({ id: 'firstName', width: 56 }), // longest word "Destinee" (length 8 * charWidth(7) * ratio(0.88)) + cellPadding(6) = 55.28 ceil to => 56
            expect.objectContaining({ id: 'lastName', width: 68 }), // longest word "Altenwerth" (length 10 * charWidth(7) * ratio(0.88)) + cellPadding(6) = 67.6 ceil to => 68
            expect.objectContaining({ id: 'gender', width: 57 }), // longest word "female" (length 6 * charWidth(7) * customRatio(1.2)) + cellPadding(6) = 56.4 ceil to 57
            expect.objectContaining({ id: 'age', width: 29 }), // longest number 100 (length 3 * charWidth(7) * ratio(1)) + cellPadding(6) + extraPadding(2) = 44.96 ceil to 45
            expect.objectContaining({ id: 'street', width: 15 }), // longest text "20229 Tia Turnpike" goes over maxWidth so we fallback to it
            expect.objectContaining({ id: 'country', width: 14 }), // longest text "United States of America" goes over resizeMaxWidthThreshold so we fallback to it
            expect.objectContaining({ id: 'zip', width: 48 }), // longest number "777555"
          ]));
        expect(reRenderColumnsSpy).toHaveBeenCalledWith(true);
      });

      it('should not return without resizing if "resizeByContentOnlyOnFirstLoad" is set to True and we already resized once', () => {
        const setColumnsSpy = jest.spyOn(gridStub, 'setColumns');
        const reRenderColumnsSpy = jest.spyOn(gridStub, 'reRenderColumns');
        const pubSubSpy = jest.spyOn(eventPubSubService, 'publish');

        service.init(gridStub, divContainer);
        service.resizeColumnsByCellContent(true);

        expect(setColumnsSpy).toHaveBeenCalled();
        expect(reRenderColumnsSpy).toHaveBeenCalledWith(true);
        expect(pubSubSpy).toHaveBeenCalledWith('onBeforeResizeByContent', undefined, 0);

        // calling a 2nd time should cancel any resize
        // so we shouldn't expect the grid.setColumns to be called again
        mockGridOptions.resizeByContentOnlyOnFirstLoad = true;
        service.resizeColumnsByCellContent(false);
        expect(setColumnsSpy).toHaveBeenCalledTimes(1);
      });

      it('should call the resize and expect first column have a fixed width while other will have a calculated width when resizing by their content and grid is editable', () => {
        const setColumnsSpy = jest.spyOn(gridStub, 'setColumns');
        const reRenderColumnsSpy = jest.spyOn(gridStub, 'reRenderColumns');

        mockGridOptions.editable = true;
        service.init(gridStub, divContainer);
        service.resizeColumnsByCellContent(true);

        // same as previous except firstName/lastName have editors with padding of 5px
        expect(setColumnsSpy).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'userId', width: 30 }),
            expect.objectContaining({ id: 'firstName', width: 61 }), // longest word "Destinee" (length 8 * charWidth(7) * ratio(0.88)) + cellPadding(6) + editorPadding(5) = 60.28 ceil to => 61
            expect.objectContaining({ id: 'lastName', width: 73 }), // longest word "Altenwerth" (length 10 * charWidth(7) * ratio(0.88)) + cellPadding(6) + editorPadding(5) = 72.6 ceil to => 73
            expect.objectContaining({ id: 'gender', width: 57 }), // longest word "female" (length 6 * charWidth(7) * customRatio(1.2)) + cellPadding(6) = 56.4 ceil to 57
            expect.objectContaining({ id: 'age', width: 29 }), // longest number 100 (length 3 * charWidth(7) * ratio(1)) + cellPadding(6) + extraPadding(2) = 44.96 ceil to 45
            expect.objectContaining({ id: 'street', width: 15 }), // longest text "20229 Tia Turnpike" goes over maxWidth so we fallback to it
            expect.objectContaining({ id: 'country', width: 14 }), // longest text "United States of America" goes over resizeMaxWidthThreshold so we fallback to it
            expect.objectContaining({ id: 'zip', width: 48 }), // longest number "777555"
          ]));
        expect(reRenderColumnsSpy).toHaveBeenCalledWith(true);
      });

      it('should call "resizeColumnsByCellContent" when "onFullResizeByContentRequested" pubsub event is triggered', () => {
        const resizeSpy = jest.spyOn(service, 'resizeColumnsByCellContent');

        service.init(gridStub, divContainer);
        eventPubSubService.publish('onFullResizeByContentRequested', { caller: 'GridStateService' });

        expect(resizeSpy).toHaveBeenCalledWith(true);
      });
    });

    describe('AutoFix broken resize styling UI', () => {
      afterEach(() => {
        jest.clearAllMocks();
        service.dispose();
        service.intervalRetryDelay = 1;
        service.requestStopOfAutoFixResizeGrid(true);
      });

      it('should try to resize grid when its UI is deemed broken and expect "resizeGridWhenStylingIsBrokenUntilCorrected" to be called on interval', (done) => {
        const resizeSpy = jest.spyOn(service, 'resizeGrid').mockReturnValue(Promise.resolve({ height: 150, width: 350 }));
        Object.defineProperty(document.querySelector(`.${GRID_UID}`), 'offsetParent', { writable: true, configurable: true, value: 55 });

        mockGridOptions.autoFixResizeTimeout = 10;
        mockGridOptions.autoFixResizeRequiredGoodCount = 5;
        mockGridOptions.autoFixResizeWhenBrokenStyleDetected = true;
        service.intervalRetryDelay = 1;
        service.init(gridStub, divContainer);

        const divHeaderElm = divContainer.querySelector('.slick-header') as HTMLDivElement;
        jest.spyOn(divContainer, 'getBoundingClientRect').mockReturnValue({ top: 10, left: 20 } as unknown as DOMRect);
        jest.spyOn(divHeaderElm, 'getBoundingClientRect').mockReturnValue({ top: 30, left: 25 } as unknown as DOMRect);
        divHeaderElm.style.top = '30px';
        divHeaderElm.style.left = '25px';
        divContainer.style.top = '10px';
        divContainer.style.left = '20px';

        setTimeout(() => {
          expect(divContainer.outerHTML).toBeTruthy();
          expect(resizeSpy).toHaveBeenCalled();
          expect(resizeSpy).toHaveBeenNthCalledWith(2, 10, undefined);
          expect(resizeSpy).toHaveBeenNthCalledWith(3);
          done();
        }, 25);
      });

      it('should try to resize grid when its UI is deemed broken and expect "resizeGridWhenStylingIsBrokenUntilCorrected" but it should stop whenever we force it', (done) => {
        const resizeSpy = jest.spyOn(service, 'resizeGrid').mockReturnValue(Promise.resolve({ height: 150, width: 350 }));

        mockGridOptions.autoFixResizeWhenBrokenStyleDetected = true;
        service.intervalRetryDelay = 1;
        service.init(gridStub, divContainer);

        const divHeaderElm = divContainer.querySelector('.slick-header') as HTMLDivElement;
        jest.spyOn(divContainer, 'getBoundingClientRect').mockReturnValue({ top: 10, left: 20 } as unknown as DOMRect);
        jest.spyOn(divHeaderElm, 'getBoundingClientRect').mockReturnValue({ top: 30, left: 25 } as unknown as DOMRect);
        divHeaderElm.style.top = '30px';
        divHeaderElm.style.left = '25px';
        divContainer.style.top = '10px';
        divContainer.style.left = '20px';

        service.requestStopOfAutoFixResizeGrid();
        // expect(divContainer.outerHTML).toBeTruthy();
        expect(resizeSpy).toHaveBeenCalled();

        setTimeout(() => {
          expect(divContainer.outerHTML).toBeTruthy();
          expect(resizeSpy).toHaveBeenCalled();
          done();
        }, 10);
      });

      it('should try to resize grid when its UI is deemed broken and expect "resizeGridWhenStylingIsBrokenUntilCorrected" and then stops after manually requesting a stop', (done) => {
        const resizeSpy = jest.spyOn(service, 'resizeGrid').mockReturnValue(Promise.resolve({ height: 150, width: 350 }));

        mockGridOptions.autoFixResizeWhenBrokenStyleDetected = true;
        service.intervalRetryDelay = 1;
        service.init(gridStub, divContainer);

        const divHeaderElm = divContainer.querySelector('.slick-header') as HTMLDivElement;
        jest.spyOn(divHeaderElm, 'getBoundingClientRect').mockReturnValue({ top: 30, left: 25 } as unknown as DOMRect);
        jest.spyOn(divContainer, 'getBoundingClientRect').mockReturnValue({ top: 4, left: 0 } as unknown as DOMRect);
        divHeaderElm.style.top = '30px';
        divHeaderElm.style.left = '25px';

        expect(divContainer.outerHTML).toBeTruthy();
        expect(resizeSpy).toHaveBeenCalled();

        setTimeout(() => {
          service.requestStopOfAutoFixResizeGrid();

          expect(divContainer.outerHTML).toBeTruthy();
          expect(resizeSpy).toHaveBeenCalled();
          done();
        }, 15);
      });

      it('should try to resize grid when its UI is deemed broken by the 2nd condition check of "getRenderedRange"', (done) => {
        const resizeSpy = jest.spyOn(service, 'resizeGrid').mockReturnValue(Promise.resolve({ height: 150, width: 350 }));
        Object.defineProperty(document.querySelector(`.${GRID_UID}`), 'offsetParent', { writable: true, configurable: true, value: 55 });
        jest.spyOn(mockDataView, 'getItemCount').mockReturnValue(99);
        jest.spyOn(gridStub, 'getRenderedRange').mockReturnValue({ top: 0, bottom: 0, leftPx: 0, rightPx: 0 });

        mockGridOptions.autoFixResizeTimeout = 10;
        mockGridOptions.autoFixResizeRequiredGoodCount = 5;
        mockGridOptions.autoFixResizeWhenBrokenStyleDetected = true;
        service.intervalRetryDelay = 1;

        const divHeaderElm = divContainer.querySelector('.slick-header') as HTMLDivElement;
        const divViewportElm = divContainer.querySelector('.slick-viewport') as HTMLDivElement;
        jest.spyOn(divContainer, 'getBoundingClientRect').mockReturnValue({ top: 10, left: 20 } as unknown as DOMRect);
        jest.spyOn(divHeaderElm, 'getBoundingClientRect').mockReturnValue({ top: 5, left: 25 } as unknown as DOMRect);
        jest.spyOn(divViewportElm, 'getBoundingClientRect').mockReturnValue({ top: 98, left: 25 } as unknown as DOMRect);
        divHeaderElm.style.top = '5px';
        divHeaderElm.style.left = '25px';
        divContainer.style.top = '10px';
        divContainer.style.left = '20px';
        service.init(gridStub, divContainer);

        setTimeout(() => {
          expect(divContainer.outerHTML).toBeTruthy();
          expect(resizeSpy).toHaveBeenCalled();
          expect(resizeSpy).toHaveBeenNthCalledWith(2, 10, undefined);
          expect(resizeSpy).toHaveBeenNthCalledWith(3);
          expect(resizeSpy).toHaveBeenNthCalledWith(4);
          done();
          service.requestStopOfAutoFixResizeGrid();
        }, 25);
      });

      it('should try to resize grid when its UI is deemed broken but expect an error shown in the console when "resizeGrid" throws an error', (done) => {
        const consoleSpy = jest.spyOn(global.console, 'log').mockReturnValue();
        const promise = new Promise((_resolve, reject) => setTimeout(() => reject('some error'), 0));
        jest.spyOn(service, 'resizeGrid').mockReturnValue(promise as any);

        service.init(gridStub, divContainer);

        setTimeout(() => {
          expect(consoleSpy).toHaveBeenCalledWith('Error:', 'some error');
          done();
        }, 1);
      });
    });
  });
});
