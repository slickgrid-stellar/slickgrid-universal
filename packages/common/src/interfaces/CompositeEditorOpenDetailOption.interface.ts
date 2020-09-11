import { CompositeEditorModalType } from '../enums/compositeEditorModalType.type';
import { GridServiceInsertOption } from './gridServiceInsertOption.interface';

export type OnErrorOption = {
  /** Error code (typically an uppercase error code key like: "NO_RECORD_FOUND") */
  code?: string;

  /** Error Message */
  message: string;

  /** Error Type (info, error, warning) */
  type: 'error' | 'info' | 'warning';
};

export interface CompositeEditorSelection {
  gridRowIndexes: number[];
  dataContextIds: Array<number | string>;
}

export interface CompositeEditorOpenDetailOption {
  /**
   * Composite Editor modal header title with support to optional parsing and HTML rendering of any item property pulled from the dataContext, via template {{ }}
   * for example:
   * - {{title}} => would display the item title, or you could even parse complex object like {{product.name}} => displays the item product name
   * - Editing (id: <i>{{id}}</i>) => would display the "Editing (id: 123)" where the Id has italic font style
   */
  headerTitle?: string;

  /** Override the header title of the "mass-update" modal type, mostly used in combo when passing modal type as "modal" (auto-detect type), it will automatically detect the modal type ("mass-update" or "mass-selection")  */
  headerTitleMassUpdate?: string;

  /** Override the header title of the "mass-selection" modal type, mostly used in combo when passing modal type as "modal" (auto-detect type), it will automatically detect the modal type ("mass-selection" or "mass-selection")  */
  headerTitleMassSelection?: string;

  /** Defaults to "static", when backdrop is set to "static", the modal will not close when clicking outside of it. */
  backdrop?: 'static' | null;

  /** Defaults to true, do we want the close button outside the modal (true) or inside the header modal (false)?  */
  showCloseButtonOutside?: boolean;

  /** Optional insert options, for example what position in the grid do we want to insert (top/bottom), do we want to highlight, etc... */
  insertOptions?: GridServiceInsertOption;

  /** Defaults to (dataset length + 1), what is the default insert Id to use when creating a new item? */
  insertNewId?: number;

  labels?: {
    /** Defaults to "Cancel", override the Cancel button label */
    cancelButton?: string;

    /** Defaults to "CANCEL", translation key used for the Cancel button label. */
    cancelButtonKey?: string;

    /** Defaults to "Apply to Selection", override the Mass Selection button label */
    massSelectionButton?: string;

    /** Defaults to "APPLY_TO_SELECTION", translation key used for the Mass Selection button label. */
    massSelectionButtonKey?: string;

    /** Defaults to "{{selectedRowCount}} of {{totalItems}} selected", override the Mass Selection status text on the footer left side */
    massSelectionStatus?: string;

    /** Defaults to "X_OF_Y_MASS_SELECTED", translation key used for the Mass Selection status text on the footer left side */
    massSelectionStatusKey?: string;

    /** Defaults to "Mass Update", override the Mass Update button label */
    massUpdateButton?: string;

    /** Defaults to "APPLY_MASS_UPDATE", translation key used for the Mass Update button label. */
    massUpdateButtonKey?: string;

    /** Defaults to "all {{totalItems}} items", override the Mass Update status text on the footer left side */
    massUpdateStatus?: string;

    /** Defaults to "ALL_X_RECORDS_SELECTED", translation key used for the Mass Update status text on the footer left side */
    massUpdateStatusKey?: string;

    /** Defaults to "Save", override the Save button label used by a modal type of "create" or "edit" */
    saveButton?: string;

    /** Defaults to "SAVE", translation key used for the Save button label used by a modal type of "create" or "edit" */
    saveButtonKey?: string;
  };

  /**
   * Defaults to "edit", Composite Editor modal type (create, edit, mass, mass-update, mass-selection).
   *
   * NOTE that the type "mass" is an auto-detect type, it will automatically detect if it should use "mass-update" or "mass-selection",
   * it does this by detecting if there's any row selected in the grid (if so the type will be "mass-selection" or "mass-update")
   */
  modalType?: CompositeEditorModalType;

  /**
   * Defaults to 1, how many columns do we want to show in the view layout?
   * For example if you wish to see your form split in a 2 columns layout (split view)
   */
  viewColumnLayout?: 1 | 2 | 3 | 'auto';

  /** onClose callback allows user to add a confirm dialog or any other code before closing the modal window, returning false will cancel the modal closing. */
  onClose?: () => Promise<boolean>;

  /** onError callback allows user to override what the system does when an error (error message & type) is thrown, defaults to console.log */
  onError?: (error: OnErrorOption) => void;

  /** The "onSave" callback will be triggered after user clicked saved button, user can execute his own code and possibly apply the changes if he wishes to. */
  onSave?: (formValues: any, selection: CompositeEditorSelection, applyChangesCallback: (formValues: any, selection: CompositeEditorSelection) => void) => Promise<boolean>;
}
