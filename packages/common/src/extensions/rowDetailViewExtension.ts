import { Column, Extension, GridOption, SlickRowDetailView, SlickRowSelectionModel } from '../interfaces/index';

export class RowDetailViewExtension implements Extension {
  constructor() { }

  /** Dispose of the RowDetailView Extension */
  dispose() {
    throw new Error('[Slickgrid-Universal] Row Detail "dispose" method is not yet implemented');
  }

  /**
   * Create the plugin before the Grid creation, else it will behave oddly.
   * Mostly because the column definitions might change after the grid creation
   */
  create(_columnDefinitions: Column[], _gridOptions: GridOption) {
    throw new Error('[Slickgrid-Universal] Row Detail "create" method is not yet implemented');
  }

  /** Get the instance of the SlickGrid addon (control or plugin). */
  getAddonInstance() {
    throw new Error('[Slickgrid-Universal] Row Detail "getAddonInstance" method is not yet implemented');
  }

  register(_rowSelectionPlugin?: SlickRowSelectionModel): SlickRowDetailView | null {
    throw new Error('[Slickgrid-Universal] Row Detail "register" method is not yet implemented');
  }
}
