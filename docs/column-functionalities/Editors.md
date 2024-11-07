#### index
- [Inline Editors](#how-to-use-inline-editors)
   - [Demo with Float Editor & Dollar Formatter](#demo-with-float-editor-and-dollar-currency-formatter)
   - [Editor `outputType` and `saveOutputType`](#editor-output-type--save-output-type)
   - [Custom Editor](#custom-inline-editor)
- [Perform an Action after Inline Edit](#perform-an-action-after-inline-edit)
- [How to prevent Editor from going to the next bottom cell](#how-to-prevent-editor-from-going-to-the-next-bottom-cell)
- [onClick Action Editor (icon click)](#onclick-action-editor-icon-click)
- [AutoComplete Editor](editors/AutoComplete-Editor.md)
- [Select (single/multi) Editors](editors/Select-Dropdown-Editor-(single,multiple).md)
- [Editor Options](#editor-options)
- [Validators](#validators)
   - [Custom Validator](#custom-validator)
- [Disabling specific cell Edit](#disabling-specific-cell-edit)
- [Editors on Mobile Phone](#editors-on-mobile-phone)
- [Dynamically Change Column Editor](#dynamically-change-column-editor)

## Description
`Slickgrid-Universal` ships with a few default inline editors (checkbox, dateEditor, float, integer, text, longText).

**Note:** For the Float Editor, you can provide decimal places with `params: { decimals: 2 }` to your column definition else it will be 0 decimal places by default.

### Required Grid Option
Editors won't work without these 2 flags `enableCellNavigation: true` and `editable: true` enabled in your Grid Options, so make sure to always to always defined them. Also note that you can toggle the grid to read only (not editable) via the `editable` grid option flag.

### How to use Inline Editors
Simply call the editor in your column definition with the `Editors` you want, as for example (`editor: { model: Editors.text }`). Here is an example with a full column definition:
```ts
this.columnDefinitions = [
  { id: 'title', name: 'Title', field: 'title', type: FieldType.string, editor: { model: Editors.longText } },
  { id: 'duration', name: 'Duration (days)', field: 'duration', type: FieldType.number, editor: { model: Editors.text } },
  { id: 'complete', name: '% Complete', field: 'percentComplete', type: FieldType.number, editor: { model: Editors.integer } },
  { id: 'start', name: 'Start', field: 'start', type: FieldType.date, editor: { model: Editors.date } },
  {
    id: 'finish', name: 'Finish', field: 'finish', type: FieldType.date,
    editor: {
      model: Editors.date,

      // you can also add an optional placeholder
      placeholder: 'choose a date'
    }
  },
  {
    id: 'effort-driven', name: 'Effort Driven', field: 'effortDriven', formatter: Formatters.checkmark,
    type: FieldType.number, editor: { model: Editors.checkbox }
  }
];

this.gridOptions {
  enableCellNavigation: true, // <<-- VERY IMPORTANT, it won't work without this flag enabled
  editable: true,
};
```

#### SalesForce (ES6)
For SalesForce the code is nearly the same, the only difference is to add the `Slicker` prefix, so instead of `Editors.abc` we need to use `Slicker.Editors.abc`, `Slicker.FieldType.abc`, ...

```ts
this.columnDefinitions = [
  { id: 'title', name: 'Title', field: 'title', type: Slicker.FieldType.string, editor: { model: Slicker.Editors.longText } },
  { id: 'duration', name: 'Duration (days)', field: 'duration', type: Slicker.FieldType.number, editor: { model: Slicker.Editors.text } },
  { id: 'complete', name: '% Complete', field: 'percentComplete', type: Slicker.FieldType.number, editor: { model: Slicker.Editors.integer } },
  { id: 'start', name: 'Start', field: 'start', type: Slicker.FieldType.date, editor: { model: Slicker.Editors.date } },
  {
    id: 'finish', name: 'Finish', field: 'finish', type: Slicker.FieldType.date,
    editor: {
      model: Slicker.Editors.date,

      // you can also add an optional placeholder
      placeholder: 'choose a date'
    }
  },
  {
    id: 'effort-driven', name: 'Effort Driven', field: 'effortDriven', formatter: Slicker.Formatters.checkmark,
    type: Slicker.FieldType.number, editor: { model: Slicker.Editors.checkbox }
  }
];
```

#### Demo with Float Editor and Dollar Currency Formatter
This probably comes often, so here's all the setting you would need for displaying & editing a dollar currency value with 2 decimal places.
```ts
this.columnDefinitions = [
  {
    id: 'cost', name: 'Cost', field: 'cost',
    type: FieldType.float,
    formatter: Formatters.dollar, // the Dollar Formatter will default to 2 decimals unless you provide a minDecimal/maxDecimal
    // params: { minDecimal: 2, maxDecimal: 4, }, // optionally provide different decimal places

    // the float editor has its own settings, `decimal` that will be used only in the editor
    // note: that it has nothing to do with the Dollar Formatter
    editor: { model: Editors.float, decimal: 2 },
  },
];
```

#### Editor Output Type & Save Output Type
You could also define an `outputType` and a `saveOutputType` to an inline editor. There is only 1 built-in Editor with this functionality for now which is the `dateEditor`. For example, on a date field, we can call this `outputType: FieldType.dateIso` (by default it uses `dateUtc` as the output):
```typescript
this.columnDefinitions = [
 {
   id: 'start', name: 'Start', field: 'start',
   type: FieldType.date,
   editor: { model: Editors.date },
   type: FieldType.date,              // dataset cell input format
   // outputType: FieldType.dateUs,   // date picker format
   saveOutputType: FieldType.dateUtc, // save output date format
  }
];
```

So to make it more clear, the `saveOutputType` is the format that will be sent to the `onCellChange` event, then the `outputType` is how the date will show up in the date picker (Vanilla-Calendar) and finally the `type` is basically the input format (coming from your dataset). Note however that each property are cascading, if 1 property is missing it will go to the next one until 1 is found... for example, on the `onCellChange` if you aren't defining `saveOutputType`, it will try to use `outputType`, if again none is provided it will try to use `type` and finally if none is provided it will use `FieldType.dateIso` as the default.

## Perform an action After Inline Edit
#### Recommended way
What is ideal is to bind to a SlickGrid Event, for that you can take a look at this [Wiki - On Events](../events/Grid-&-DataView-Events)

#### Not recommended
You could also, perform an action after the item changed event with `onCellChange`. However, this is not the recommended way, since it would require to add a `onCellChange` on every every single column definition.

## Custom Inline Editor
To create a Custom Editor, you need to create a `class` that will extend the [`Editors` interface](https://github.com/ghiscoding/slickgrid-universal/blob/master/packages/common/src/interfaces/editor.interface.ts) and then use it in your grid with `editor: { model: myCustomEditor }` and that should be it.

Once you are done with the class, just reference it's class name as the `editor`, for example:

##### Class implementing Editor
```typescript
export class IntegerEditor implements Editor {
  constructor(private args: any) {
    this.init();
  }

  init(): void {}
  destroy() {}
  focus() {}
  loadValue(item: any) {}
  serializeValue() {}
  applyValue(item: any, state: any) {}
  isValueChanged() {}
  validate() {}
}
```

##### Use it in your Column Definition

```ts
this.columnDefinitions = [
  {
    id: 'title2', name: 'Title, Custom Editor', field: 'title',
    type: FieldType.string,
    editor: {
      model: CustomInputEditor // reference your custom editor class
    },
  }
];
```

## How to prevent Editor from going to the next bottom cell?
The default behavior or SlickGrid is to go to the next cell at the bottom of the current cell that you are editing. You can change and remove this behavior by enabling `autoCommitEdit` which will save current editor and remain in the same cell

```ts
this.gridOptions = {
  autoCommitEdit: true,
  editable: true,
}
```

## OnClick Action Editor (icon click)
Instead of an inline editor, you might want to simply click on an edit icon that could call a modal window, or a redirect URL, or whatever you wish to do. For that you can use the inline `onCellClick` event and define a callback function for the action (you could also create your own [Custom Formatter](../column-functionalities/Formatters.md)).
- The `Formatters.editIcon` will give you a pen icon, while a `Formatters.deleteIcon` is an "x" icon
```typescript
this.columnDefinitions = [
  {
    id: 'edit', field: 'id',
    formatter: Formatters.editIcon,
    maxWidth: 30,
    onCellClick: (args: OnEventArgs) => {
      console.log(args);
    }
  },
  // ...
];
```
The `args` returned to the `onCellClick` callback is of type `OnEventArgs` which is the following:
```typescript
export interface OnEventArgs {
  row: number;
  cell: number;
  columnDef: Column;
  dataContext: any;
  dataView: any;
  grid: any;
  gridDefinition: GridOption;
}
```

## Editor Options

#### Column Editor `editorOptions`
Some of the Editors could receive extra options, which is mostly the case for Editors using external dependencies (e.g. `autocompleter`, `date`, `multipleSelect`, ...) you can provide options via the `editorOptions`, for example

```ts
this.columnDefinitions = [{
  id: 'start', name: 'Start Date', field: 'start',
  editor: {
    model: Editors.date,
    editorOptions: { displayDateMin: 'today' } as VanillaCalendarOption
  }
}];
```

#### Grid Option `defaultEditorOptions
You could also define certain options as a global level (for the entire grid or even all grids) by taking advantage of the `defaultEditorOptions` Grid Option. Note that they are set via the editor type as a key name (`autocompleter`, `date`, ...) and then the content is the same as `editorOptions` (also note that each key is already typed with the correct editor option interface), for example

```ts
this.gridOptions = {
  defaultEditorOptions: {
    autocompleter: { debounceWaitMs: 150 }, // typed as AutocompleterOption
    date: { range: { min: 'today' } },
    longText: { cols: 50, rows: 5 }
  }
}
```

## Validators
Each Editor needs to implement the `validate()` method which will be executed and validated before calling the `save()` method. Most Editor will simply validate that the value passed is correctly formed. The Float Editor is one of the more complex one and will first check if the number is a valid float then also check if `minValue` or `maxValue` was passed and if so validate against them. If any errors is found it will return an object of type `EditorValidatorOutput` (see the signature on top).

### Custom Validator
If you want more complex validation then you can implement your own Custom Validator as long as it implements the following  signature.
```ts
export type EditorValidator = (value: any, args?: EditorArgs) => EditorValidatorOutput;
```
So the `value` can be anything but the `args` is interesting since it provides multiple properties that you can hook into, which are the following
```ts
export interface EditorArgs {
  column: Column;
  container: any;
  grid: any;
  gridPosition: ElementPosition;
  item: any;
  position: ElementPosition;
  cancelChanges?: () => void;
  commitChanges?: () => void;
}
```
And finally the Validator Output has the following signature
```ts
export interface EditorValidatorOutput {
  valid: boolean;
  msg?: string | null;
}
```

So if we take all of these informations and we want to create our own Custom Editor to validate a Title field, we could create something like this:
```ts
const myCustomTitleValidator: EditorValidator = (value: any, args: EditorArgs) => {
  // you can get the Editor Args which can be helpful, e.g. we can get the Translate Service from it
  const grid = args?.grid;
  const gridOptions = (grid && grid.getOptions) ? grid.getOptions() : {};
  const i18n = gridOptions.i18n;

  if (value == null || value === undefined || !value.length) {
    return { valid: false, msg: 'This is a required field' };
  } else if (!/^Task\s\d+$/.test(value)) {
    return { valid: false, msg: 'Your title is invalid, it must start with "Task" followed by a number' };
    // OR use the Translate Service with your custom message
    // return { valid: false, msg: i18n.tr('YOUR_ERROR', { x: value }) };
  } else {
    return { valid: true, msg: '' };
  }
};
```
and use it in our Columns Definition like this:
```ts
this.columnDefinition = [
  {
    id: 'title', name: 'Title', field: 'title',
    editor: {
      model: Editors.longText,
      validator: myCustomTitleValidator, // use our custom validator
    },
    onCellChange: (e: Event, args: OnEventArgs) => {
      // do something
      console.log(args.dataContext.title);
    }
  }
];
```

## Disabling specific cell edit
This can be answered by searching on Stack Overflow Stack Overflow and this is the best [answer](https://stackoverflow.com/questions/10491676/disabling-specific-cell-edit-in-slick-grid) found.

#### View
```html
<div id="grid1">
</div>
```

#### Component
```ts
  attached() {
    const dataset = this.initializeGrid();
    const gridContainerElm = document.querySelector<HTMLDivElement>(`.grid4`);

    // gridContainerElm.addEventListener('onclick', handleOnClick);
    gridContainerElm.addEventListener('onbeforeeditcell', this.handleOnBeforeEditVerifyCellIsEditable.bind(this));
    this.slickgridLwc = new Slicker.GridBundle(gridContainerElm, this.columnDefinitions, { ...ExampleGridOptions, ...this.gridOptions }, dataset);
  }

  handleOnBeforeEditVerifyCellIsEditable(event) {
    const eventData = event?.detail?.eventData;
    const args = event?.detail?.args;
    const { column, item, grid } = args;

    if (column && item) {
      if (!checkItemIsEditable(item, column, grid)) {
        event.preventDefault(); // OR eventData.preventDefault();
        return false;
      }
    }
    return false;
  }

  checkItemIsEditable(dataContext, columnDef, grid) {
    const gridOptions = grid?.getOptions();
    const hasEditor = columnDef.editor;
    const isGridEditable = gridOptions.editable;
    let isEditable = (isGridEditable && hasEditor);

    if (dataContext && columnDef && gridOptions && gridOptions.editable) {
      switch (columnDef.id) {
        case 'finish':
          isEditable = !!dataContext?.completed;
          break;
       // ... some other cases
      }
    }

    return isEditable;
  }
```

#### SalesForce (ES6)
For SalesForce it's nearly the same, the only difference is that we add our events in the View instead of in the ViewModel

#### View (SF)
```html
<div class="grid-container slds-p-horizontal" style="padding: 10px">
    <div class="grid1"
         onvalidationerror={handleOnValidationError}
         onbeforeeditcell={handleOnBeforeEditVerifyCellIsEditable}
         onslickergridcreated={handleOnSlickerGridCreated}>
    </div>
</div>
```

### Editors on Mobile Phone
If your grid uses the `autoResize` and you use Editors in your grid on a mobile phone, Android for example, you might have undesired behaviors. It might call a grid resize (and lose input focus) since the touch keyboard appears. This in term, is a bad user experience to your user, but there is a way to avoid this, you could use the `pauseResizer`

##### View
```html
<div id="grid1">
</div>
```
##### Component
```ts
  attached() {
    const dataset = this.initializeGrid();
    const gridContainerElm = document.querySelector<HTMLDivElement>(`.grid4`);

    gridContainerElm.addEventListener('onslickergridcreated', this.handleOnSlickerGridCreated.bind(this));
    this.slickgridLwc = new Slicker.GridBundle(gridContainerElm, this.columnDefinitions, this.gridOptions, dataset);
  }

  handleOnSlickerGridCreated(event) {
    this.slickerGridInstance = event && event.detail;
    this.gridObj = this.slickerGridInstance && this.slickerGridInstance.slickGrid;
    this.dataViewObj = this.slickerGridInstance && this.slickerGridInstance.dataView;
  }

  onAfterEditCell($event) {
    // resume autoResize feature,  and after leaving cell editing mode
    // force a resize to make sure the grid fits the current dimensions
    this.slickerGridInstance.resizerService.pauseResizer(false);
    this.slickerGridInstance.resizerService.resizeGrid();
  }

  onBeforeEditCell($event) {
    this.slickerGridInstance.resizerService.pauseResizer(true);
  }
```

#### SalesForce (ES6)
For SalesForce it's nearly the same, the only difference is that we add our events in the View instead of in the ViewModel

#### View (SF)
```html
<div class="grid-container slds-p-horizontal">
    <div class="grid1" onslickergridcreated={handleOnSlickerGridCreated}>
    </div>
</div>
```

## Turning individual rows into edit mode
Using the [Row Based Editing Plugin](../grid-functionalities/Row-based-edit.md) you can let the user toggle either one or multiple rows into edit mode, keep track of cell changes and either discard or save them on an individual basis using a custom `onBeforeRowUpdated` hook.

## Dynamically change Column Editor

You can dynamically change a column editor by taking advantage of the `onBeforeEditCell` event and change the editor just before the cell editor opens. However please note that the library keeps 2 references and you need to update both references as shown below.

With the code sample shown below, we are using an input checkbox to toggle the Editor between `Editors.longText` to `Editors.text` and vice/versa

```ts
changeToInputTextEditor(checked: boolean) {
    this.isInputTextEditor = checked;
}

handleOnBeforeEditCell(args: CustomEvent<OnBeforeEditCellEventArgs>) {
  const args = event?.detail?.args;
  const { grid, column } = args;
  column.editor.model = this.isInputTextEditor ? Editors.text : Editors.longText;
  column.editorClass = column.editor.model;
  return true;
}
```
