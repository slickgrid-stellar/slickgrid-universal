import type {
  BackendService,
  ExtensionService,
  ExtensionUtility,
  FilterService,
  GridEventService,
  GridService,
  GridStateService,
  GroupingAndColspanService,
  PaginationService,
  ResizerService,
  SlickDataView,
  SlickGrid,
  SortService,
  TreeDataService,
} from '@slickgrid-universal/common';
import type { EventPubSubService } from '@slickgrid-universal/event-pub-sub';

export interface SlickerGridInstance<TData = any> {
  /** Slick DataView object */
  dataView: SlickDataView<TData>;

  /** Slick Grid object */
  slickGrid: SlickGrid;

  // --
  // Methods

  /** Dispose of the grid and optionally empty the DOM element grid container as well */
  dispose: (emptyDomElementContainer?: boolean) => void;

  // --
  // Services

  /** Backend Service, when available */
  backendService?: BackendService;

  /** EventPubSub Service instance that is used internal by the lib and could be used externally to subscribe to Slickgrid-Universal events */
  eventPubSubService?: EventPubSubService;

  /** Extension (Controls & Plugins) Service */
  extensionService: ExtensionService;

  /** Extension Utilities */
  extensionUtility: ExtensionUtility;

  /** Filter Service */
  filterService: FilterService;

  /** Grid Service (grid extra functionalities) */
  gridService: GridService;

  /** Grid Events Service */
  gridEventService: GridEventService;

  /** Grid State Service */
  gridStateService: GridStateService;

  /** Grouping (and colspan) Service */
  groupingService: GroupingAndColspanService;

  /** Pagination Service (allows you to programmatically go to first/last page, etc...) */
  paginationService: PaginationService;

  /** Resizer Service (including auto-resize) */
  resizerService: ResizerService;

  /** Sort Service */
  sortService: SortService;

  /** Tree Data View Service */
  treeDataService: TreeDataService;
}
