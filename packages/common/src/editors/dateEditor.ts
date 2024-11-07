import { parse } from '@formkit/tempo';
import { BindingEventService } from '@slickgrid-universal/binding';
import { createDomElement, emptyElement, extend, setDeepValue } from '@slickgrid-universal/utils';
import { Calendar, type FormatDateString, type Options } from 'vanilla-calendar-pro';

import { Constants } from './../constants.js';
import { FieldType } from '../enums/index.js';
import type {
  Column,
  ColumnEditor,
  CompositeEditorOption,
  Editor,
  EditorArguments,
  EditorValidator,
  EditorValidationResult,
  GridOption,
} from './../interfaces/index.js';
import { getDescendantProperty, } from './../services/utilities.js';
import type { TranslaterService } from '../services/translater.service.js';
import { SlickEventData, type SlickGrid } from '../core/index.js';
import { resetDatePicker, setPickerDates } from '../commonEditorFilter/commonEditorFilterUtils.js';
import { formatDateByFieldType, mapTempoDateFormatWithFieldType } from '../services/dateUtils.js';

/*
 * An example of a date picker editor using Vanilla-Calendar-Pro
 */
export class DateEditor implements Editor {
  protected _bindEventService: BindingEventService;
  protected _clearButtonElm!: HTMLButtonElement;
  protected _editorInputGroupElm!: HTMLDivElement;
  protected _inputElm!: HTMLInputElement;
  protected _isValueTouched = false;
  protected _lastClickIsDate = false;
  protected _lastTriggeredByClearDate = false;
  protected _originalDate?: string;
  protected _pickerMergedOptions!: Options;
  protected _lastInputKeyEvent?: KeyboardEvent;
  calendarInstance?: Calendar;
  defaultDate?: string;
  hasTimePicker = false;

  /** is the Editor disabled? */
  disabled = false;

  /** SlickGrid Grid object */
  grid: SlickGrid;

  /** Grid options */
  gridOptions: GridOption;

  /** The translate library */
  protected _translaterService: TranslaterService | undefined;

  constructor(protected readonly args: EditorArguments) {
    if (!args) {
      throw new Error('[Slickgrid-Universal] Something is wrong with this grid, an Editor must always have valid arguments.');
    }
    this.grid = args.grid;
    this.gridOptions = (this.grid.getOptions() || {}) as GridOption;
    if (this.gridOptions?.translater) {
      this._translaterService = this.gridOptions.translater;
    }
    this._bindEventService = new BindingEventService();
    this.init();
  }

  /** Get Column Definition object */
  get columnDef(): Column {
    return this.args.column;
  }

  /** Get Column Editor object */
  get columnEditor(): ColumnEditor {
    return this.columnDef?.editor || {} as ColumnEditor;
  }

  /** Getter for the item data context object */
  get dataContext(): any {
    return this.args.item;
  }

  /** Getter for the Editor DOM Element */
  get editorDomElement(): HTMLInputElement {
    return this._inputElm;
  }

  /** Get options passed to the editor by the user */
  get editorOptions(): Options {
    return { ...this.gridOptions.defaultEditorOptions?.date, ...this.columnEditor?.editorOptions };
  }

  get hasAutoCommitEdit(): boolean {
    return this.gridOptions.autoCommitEdit ?? false;
  }

  get pickerOptions(): Options {
    return this._pickerMergedOptions;
  }

  /** Get the Validator function, can be passed in Editor property or Column Definition */
  get validator(): EditorValidator | undefined {
    return this.columnEditor?.validator ?? this.columnDef?.validator;
  }

  async init(): Promise<void> {
    if (this.args && this.columnDef) {
      const compositeEditorOptions = this.args.compositeEditorOptions;
      const columnId = this.columnDef?.id ?? '';
      const gridOptions: GridOption = this.args.grid.getOptions() || {};
      this.defaultDate = this.args.item?.[this.columnDef.field];
      const outputFieldType = this.columnDef.outputType || this.columnEditor.type || this.columnDef.type || FieldType.dateUtc;
      const outputFormat = mapTempoDateFormatWithFieldType(outputFieldType);
      const currentLocale = this._translaterService?.getCurrentLanguage?.() || gridOptions.locale || 'en';

      // add the time picker when format is UTC (TZ - ISO8601) or has the 'h' (meaning hours)
      if (outputFormat && (outputFormat === 'ISO8601' || outputFormat.toLowerCase().includes('h'))) {
        this.hasTimePicker = true;
      }
      const pickerFormat = mapTempoDateFormatWithFieldType(this.hasTimePicker ? FieldType.dateTimeIsoAM_PM : FieldType.dateIso);

      const pickerOptions: Options = {
        inputMode: true,
        enableJumpToSelectedDate: true,
        firstWeekday: 0,
        enableDateToggle: false,
        locale: currentLocale,
        selectedTheme: this.gridOptions?.darkMode ? 'dark' : 'light',
        positionToInput: 'auto',
        sanitizerHTML: (dirtyHtml) => this.grid.sanitizeHtmlString(dirtyHtml),
        selectedWeekends: [],
        onClickDate: () => {
          this._lastClickIsDate = true;
        },
        onChangeToInput: (self) => {
          if (self.context.inputElement) {
            let selectedDate = '';
            if (self.context.selectedDates[0]) {
              selectedDate = self.context.selectedDates[0];
              self.context.inputElement.value = formatDateByFieldType(self.context.selectedDates[0], undefined, outputFieldType);
            } else {
              self.context.inputElement.value = '';
            }

            if (selectedDate && this.hasTimePicker) {
              const tempoDate = parse(selectedDate, pickerFormat);
              tempoDate.setHours(+(self.context.selectedHours || 0));
              tempoDate.setMinutes(+(self.context.selectedMinutes || 0));
              self.context.inputElement.value = formatDateByFieldType(tempoDate, undefined, outputFieldType);
            }

            if (this._lastClickIsDate) {
              this.handleOnDateChange();
              self.hide();
            }
          }
        },

      };

      // add the time picker when format includes time (hours/minutes)
      if (this.hasTimePicker) {
        pickerOptions.selectionTimeMode = 24;
      }

      // merge options with optional user's custom options
      this._pickerMergedOptions = extend(true, {}, pickerOptions, this.editorOptions, { type: 'default' });

      const inputCssClasses = `.editor-text.date-picker.editor-${columnId}.form-control.input-group-editor`;
      this._editorInputGroupElm = createDomElement('div', { className: 'vanilla-picker input-group' });
      const closeButtonGroupElm = createDomElement('span', { className: 'input-group-btn input-group-append', dataset: { clear: '' } });
      this._clearButtonElm = createDomElement('button', { type: 'button', className: 'btn btn-default btn-clear' });
      this._clearButtonElm.appendChild(createDomElement('i', { className: 'icon-clear' }));
      this._inputElm = createDomElement(
        'input',
        {
          placeholder: this.columnEditor?.placeholder ?? '',
          title: this.columnEditor && this.columnEditor.title || '',
          className: inputCssClasses.replace(/\./g, ' '),
          dataset: { input: '', defaultdate: this.defaultDate },
          readOnly: this.columnEditor.editorOptions?.allowInput === true ? false : true,
        },
        this._editorInputGroupElm
      );

      this.args.container.appendChild(this._editorInputGroupElm);

      // show clear date button (unless user specifically doesn't want it)
      if (!(this.columnEditor.editorOptions as any)?.hideClearButton) {
        closeButtonGroupElm.appendChild(this._clearButtonElm);
        this._editorInputGroupElm.appendChild(closeButtonGroupElm);
        this._bindEventService.bind(this._clearButtonElm, 'click', () => {
          this.clear();
          this.handleOnDateChange();
        });
      }

      this._bindEventService.bind(this._inputElm, 'keydown', ((event: KeyboardEvent) => {
        if (this.columnEditor.editorOptions?.allowInput !== true) {
          return;
        }

        this._isValueTouched = true;
        this._lastInputKeyEvent = event;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === "Home" || event.key === "End") {
          event.stopImmediatePropagation();
        }
      }) as EventListener);

      queueMicrotask(() => {
        this.calendarInstance = new Calendar(this._inputElm, this._pickerMergedOptions);
        this.calendarInstance.init();
        if (!compositeEditorOptions) {
          this.show();
          this.focus();
        }
        if (this.calendarInstance) {
          setPickerDates(this.columnEditor, this._inputElm, this.calendarInstance, {
            columnDef: this.columnDef,
            newVal: this.defaultDate,
          });
        }
      });
    }
  }

  destroy(): void {
    queueMicrotask(() => {
      this.hide();
      this.calendarInstance?.destroy();
      emptyElement(this._editorInputGroupElm);
      emptyElement(this._inputElm);
      this._editorInputGroupElm?.remove();
      this._inputElm?.remove();
    });

    this._bindEventService.unbindAll();
  }

  clear(): void {
    this._lastTriggeredByClearDate = true;
    if (this.calendarInstance) {
      resetDatePicker(this.calendarInstance);
    }
  }

  disable(isDisabled = true): void {
    const prevIsDisabled = this.disabled;
    this.disabled = isDisabled;

    if (this._inputElm) {
      if (isDisabled) {
        this._inputElm.setAttribute('disabled', 'disabled');
        this._clearButtonElm.disabled = true;

        // clear picker when it's newly disabled and not empty
        const currentValue = this.getValue();
        if (prevIsDisabled !== isDisabled && this.args?.compositeEditorOptions && currentValue !== '') {
          this.reset('', true, true);
        }
      } else {
        this._inputElm.removeAttribute('disabled');
        this._clearButtonElm.disabled = false;
      }
    }
  }

  /**
   * Dynamically change an Editor option, this is especially useful with Composite Editor
   * since this is the only way to change option after the Editor is created (for example dynamically change "minDate" or another Editor)
   * @param {string} optionName
   * @param {newValue} newValue
   */
  changeEditorOption<T extends keyof Options, K extends Options[T]>(optionName: T, newValue: K): void {
    if (!this.columnEditor.editorOptions) {
      this.columnEditor.editorOptions = {};
    }
    this.columnEditor.editorOptions[optionName] = newValue;
    this._pickerMergedOptions = extend(true, {}, this._pickerMergedOptions, { [optionName]: newValue });
    if (this.calendarInstance) {
      (this.calendarInstance as any)[optionName as T] = newValue as K;
    }
  }

  focus(): void {
    // always set focus on grid first so that plugin to copy range (SlickCellExternalCopyManager) would still be able to paste at that position
    this.grid.focus();

    this.show();
    this._inputElm?.focus();
  }

  hide(): void {
    this.calendarInstance?.hide();
  }

  show(): void {
    const isCompositeEditor = !!this.args?.compositeEditorOptions;
    if (!isCompositeEditor && this.calendarInstance) {
      this.calendarInstance.show();
    } else if (isCompositeEditor) {
      // when it's a Composite Editor, we'll check if the Editor is editable (by checking onBeforeEditCell) and if not Editable we'll disable the Editor
      this.applyInputUsabilityState();
    }
  }

  getValue(): string {
    return this._inputElm.value;
  }

  setValue(val: string, isApplyingValue = false, triggerOnCompositeEditorChange = true): void {
    if (this.calendarInstance) {
      setPickerDates(this.columnEditor, this._inputElm, this.calendarInstance, {
        columnDef: this.columnDef,
        newVal: val,
      });
    }

    if (isApplyingValue) {
      this.applyValue(this.args.item, this.serializeValue());

      // if it's set by a Composite Editor, then also trigger a change for it
      const compositeEditorOptions = this.args.compositeEditorOptions;
      if (compositeEditorOptions && triggerOnCompositeEditorChange) {
        this.handleChangeOnCompositeEditor(compositeEditorOptions, 'system');
      }
    }
  }

  applyValue(item: any, state: any): void {
    const fieldName = this.columnDef?.field;
    if (this.columnDef && fieldName !== undefined) {
      const saveFieldType = this.columnDef.saveOutputType || this.columnDef.outputType || this.columnEditor.type || this.columnDef.type || FieldType.dateUtc;
      const outputFieldType = this.columnDef.outputType || this.columnEditor.type || this.columnDef.type || FieldType.dateUtc;
      const isComplexObject = fieldName.indexOf('.') > 0; // is the field a complex object, "address.streetNumber"

      // validate the value before applying it (if not valid we'll set an empty string)
      const validation = this.validate(null, state);
      const newValue = (state && validation?.valid) ? formatDateByFieldType(state, outputFieldType, saveFieldType) : '';

      // set the new value to the item datacontext
      if (isComplexObject) {
        // when it's a complex object, user could override the object path (where the editable object is located)
        // else we use the path provided in the Field Column Definition
        const objectPath = this.columnEditor?.complexObjectPath ?? fieldName;
        setDeepValue(item, objectPath, newValue);
      } else {
        item[fieldName] = newValue;
      }
    }
  }

  isValueChanged(): boolean {
    let isChanged = false;
    const elmDateStr = this.getValue();

    const lastEventKey = this._lastInputKeyEvent?.key;
    if (this.columnEditor.editorOptions?.allowInput === true &&
      this.columnEditor?.alwaysSaveOnEnterKey && lastEventKey === 'Enter') {
      return true;
    }

    if (this.columnDef) {
      isChanged = this._lastTriggeredByClearDate || (!(elmDateStr === '' && this._originalDate === '')) && (elmDateStr !== this._originalDate);
    }

    return isChanged;
  }

  isValueTouched(): boolean {
    return this._isValueTouched;
  }

  loadValue(item: any): void {
    const fieldName = this.columnDef?.field;

    if (item && this.columnDef && fieldName !== undefined) {
      // is the field a complex object, "address.streetNumber"
      const isComplexObject = fieldName?.indexOf('.') > 0;
      const value = isComplexObject ? getDescendantProperty(item, fieldName) : item[fieldName];
      const inputFieldType = this.columnEditor.type || this.columnDef?.type || FieldType.dateIso;
      const outputFieldType = this.columnDef.outputType || this.columnEditor.type || this.columnDef.type || FieldType.dateIso;

      this._originalDate = formatDateByFieldType(value, inputFieldType, outputFieldType);
      this._inputElm.value = this._originalDate;
    }
  }

  /**
   * You can reset or clear the input value,
   * when no value is provided it will use the original value to reset (could be useful with Composite Editor Modal with edit/clone)
   */
  reset(value?: string, triggerCompositeEventWhenExist = true, clearByDisableCommand = false): void {
    const inputValue = value ?? this._originalDate ?? '';
    if (this.calendarInstance) {
      this._originalDate = inputValue;
      this.calendarInstance.selectedDates = [inputValue as FormatDateString];
      if (inputValue) {
        setPickerDates(this.columnEditor, this._inputElm, this.calendarInstance, {
          columnDef: this.columnDef,
          newVal: inputValue,
        });
      } else {
        resetDatePicker(this.calendarInstance);
      }
    }
    this._isValueTouched = false;

    const compositeEditorOptions = this.args.compositeEditorOptions;
    if (compositeEditorOptions && triggerCompositeEventWhenExist) {
      const shouldDeleteFormValue = !clearByDisableCommand;
      this.handleChangeOnCompositeEditor(compositeEditorOptions, 'user', shouldDeleteFormValue);
    }
  }

  save(): void {
    const validation = this.validate();
    const isValid = validation?.valid ?? false;

    if (this.hasAutoCommitEdit && isValid) {
      // do not use args.commitChanges() as this sets the focus to the next row.
      // also the select list will stay shown when clicking off the grid
      this.grid.getEditorLock().commitCurrentEdit();
    } else {
      this.args.commitChanges();
    }
  }

  serializeValue(): string {
    const domValue = this.getValue();
    if (!domValue) {
      return '';
    }

    return domValue;
  }

  validate(_targetElm?: any, inputValue?: any): EditorValidationResult {
    const isRequired = this.args?.compositeEditorOptions ? false : this.columnEditor.required;
    const elmValue = inputValue ?? this._inputElm?.value;
    const errorMsg = this.columnEditor.errorMessage;

    // when using Composite Editor, we also want to recheck if the field if disabled/enabled since it might change depending on other inputs on the composite form
    if (this.args.compositeEditorOptions) {
      this.applyInputUsabilityState();
    }

    // when field is disabled, we can assume it's valid
    if (this.disabled) {
      return { valid: true, msg: '' };
    }

    if (this.validator) {
      return this.validator(elmValue, this.args);
    }

    // by default the editor is almost always valid (except when it's required but not provided)
    if (isRequired && elmValue === '') {
      return { valid: false, msg: errorMsg || Constants.VALIDATION_REQUIRED_FIELD };
    }

    return { valid: true, msg: null };
  }

  //
  // protected functions
  // ------------------

  /** when it's a Composite Editor, we'll check if the Editor is editable (by checking onBeforeEditCell) and if not Editable we'll disable the Editor */
  protected applyInputUsabilityState(): void {
    const activeCell = this.grid.getActiveCell();
    const isCellEditable = this.grid.onBeforeEditCell.notify({
      ...activeCell, item: this.dataContext, column: this.args.column, grid: this.grid, target: 'composite', compositeEditorOptions: this.args.compositeEditorOptions
    }).getReturnValue();
    this.disable(isCellEditable === false);
  }

  protected handleOnDateChange(): void {
    this._isValueTouched = true;

    if (this.args) {
      const compositeEditorOptions = this.args.compositeEditorOptions;
      if (compositeEditorOptions) {
        this.handleChangeOnCompositeEditor(compositeEditorOptions);
      } else {
        this.save();
      }
    }
    window.setTimeout(() => this._lastTriggeredByClearDate = false); // reset flag after a cycle
  }

  protected handleChangeOnCompositeEditor(compositeEditorOptions: CompositeEditorOption, triggeredBy: 'user' | 'system' = 'user', isCalledByClearValue = false): void {
    const activeCell = this.grid.getActiveCell();
    const column = this.args.column;
    const columnId = this.columnDef?.id ?? '';
    const item = this.dataContext;
    const grid = this.grid;
    const newValue = this.serializeValue();

    // when valid, we'll also apply the new value to the dataContext item object
    if (this.validate().valid) {
      this.applyValue(this.dataContext, newValue);
    }
    this.applyValue(compositeEditorOptions.formValues, newValue);

    const isExcludeDisabledFieldFormValues = this.gridOptions?.compositeEditorOptions?.excludeDisabledFieldFormValues ?? false;
    if (isCalledByClearValue || (this.disabled && isExcludeDisabledFieldFormValues && compositeEditorOptions.formValues.hasOwnProperty(columnId))) {
      delete compositeEditorOptions.formValues[columnId]; // when the input is disabled we won't include it in the form result object
    }
    grid.onCompositeEditorChange.notify(
      { ...activeCell, item, grid, column, formValues: compositeEditorOptions.formValues, editors: compositeEditorOptions.editors, triggeredBy },
      new SlickEventData()
    );
  }
}