import { ExtensionName } from '../enums/extensionName.enum';
import { Column, Extension, GridOption, SlickCheckboxSelectColumn, SlickNamespace, SlickRowSelectionModel } from '../interfaces/index';
import { ExtensionUtility } from './extensionUtility';
import { SharedService } from '../services/shared.service';

// using external non-typed js libraries
declare const Slick: SlickNamespace;

export class CheckboxSelectorExtension implements Extension {
  private _addon: SlickCheckboxSelectColumn;

  constructor(private extensionUtility: ExtensionUtility, private sharedService: SharedService) { }

  dispose() {
    if (this._addon && this._addon.destroy) {
      this._addon.destroy();
    }
  }

  /**
   * Create the plugin before the Grid creation to avoid having odd behaviors.
   * Mostly because the column definitions might change after the grid creation, so we want to make sure to add it before then
   */
  create(columnDefinitions: Column[], gridOptions: GridOption): SlickCheckboxSelectColumn | null {
    if (Array.isArray(columnDefinitions) && gridOptions) {
      // dynamically import the SlickGrid plugin (addon) with RequireJS
      this.extensionUtility.loadExtensionDynamically(ExtensionName.checkboxSelector);
      if (!this._addon) {
        this._addon = new Slick.CheckboxSelectColumn(gridOptions.checkboxSelector);
      }
      const selectionColumn: Column = this._addon.getColumnDefinition();
      if (typeof selectionColumn === 'object') {
        selectionColumn.excludeFromExport = true;
        selectionColumn.excludeFromColumnPicker = true;
        selectionColumn.excludeFromGridMenu = true;
        selectionColumn.excludeFromQuery = true;
        selectionColumn.excludeFromHeaderMenu = true;

        // column index position in the grid
        const columnPosition = gridOptions?.checkboxSelector?.columnIndexPosition || 0;
        if (columnPosition > 0) {
          columnDefinitions.splice(columnPosition, 0, selectionColumn);
        } else {
          columnDefinitions.unshift(selectionColumn);
        }
      }
      return this._addon;
    }
    return null;
  }

  /** Get the instance of the SlickGrid addon (control or plugin). */
  getAddonInstance(): SlickCheckboxSelectColumn | null {
    return this._addon;
  }

  /** Register the 3rd party addon (plugin) */
  register(rowSelectionPlugin?: SlickRowSelectionModel): SlickRowSelectionModel | null {
    if (this.sharedService && this.sharedService.grid && this.sharedService.gridOptions) {
      // the plugin has to be created BEFORE the grid (else it behaves oddly), but we can only watch grid events AFTER the grid is created
      this.sharedService.grid.registerPlugin(this._addon);

      // this also requires the Row Selection Model to be registered as well
      if (!rowSelectionPlugin || !this.sharedService.grid.getSelectionModel()) {
        this.extensionUtility.loadExtensionDynamically(ExtensionName.rowSelection);
        rowSelectionPlugin = new Slick.RowSelectionModel(this.sharedService.gridOptions.rowSelectionOptions);
        this.sharedService.grid.setSelectionModel(rowSelectionPlugin);
      }

      // user might want to pre-select some rows
      // the setTimeout is because of timing issue with styling (row selection happen but rows aren't highlighted properly)
      if (this.sharedService.gridOptions.preselectedRows && rowSelectionPlugin && this.sharedService.grid.getSelectionModel()) {
        setTimeout(() => this._addon.selectRows(this.sharedService.gridOptions.preselectedRows || []));
      }

      return rowSelectionPlugin;
    }
    return null;
  }
}
