import { addDay, format } from '@formkit/tempo';

// eslint-disable-next-line n/file-extension-in-import
import { changeTimezone, zeroPadding } from '../plugins/utilities';

describe('Example 11 - Batch Editing', () => {
  const LOCAL_STORAGE_KEY = 'gridViewPreset';
  const GRID_ROW_HEIGHT = 33;
  const EDITABLE_CELL_RGB_COLOR = 'rgba(227, 240, 251, 0.57)';
  const UNSAVED_RGB_COLOR = 'rgb(251, 253, 209)';
  const fullTitles = ['', 'Title', 'Duration', 'Cost', '% Complete', 'Start', 'Finish', 'Completed', 'Product', 'Country of Origin', 'Action'];
  const currentYear = new Date().getFullYear();

  beforeEach(() => {
    // create a console.log spy for later use
    cy.window().then((win) => {
      cy.spy(win.console, 'log');
    });
  });

  it('should display Example title', () => {
    cy.visit(`${Cypress.config('baseUrl')}/example11`);
    cy.get('h3').should('contain', 'Example 11 - Batch Editing');
  });

  describe('built-in operators', () => {
    it('should click on "Clear Local Storage" and expect to be back to original grid with all the columns', () => {
      cy.get('[data-test="clear-storage-btn"]')
        .click({ force: true });

      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.eq(1000);
        });
    });

    it('should return no rows when product filter is set to "<> " (not contain empty string)', () => {
      cy.get('.filter-countryOfOrigin.search-filter')
        .clear()
        .type('<> ');

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.eq(0);
        });
    });

    it('should return rows without a product defined when using "!= " (not equal empty string)', () => {
      cy.get('.filter-countryOfOrigin.search-filter')
        .clear()
        .type('!= ');

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.lt(1000);
        });
    });

    it('should return 515 rows when product filter is set to "<> nada" (not containing "nada" substring)', () => {
      cy.get('.filter-countryOfOrigin.search-filter')
        .clear()
        .type('<> nada');

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.eq(515);
        });
    });

    it('should return no rows when product filter is set to "!= nada" (not equal to "nada" text)', () => {
      cy.get('.filter-countryOfOrigin.search-filter')
        .clear()
        .type('!= nada');

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.eq(1000);
        });
    });

    it('should return 485 rows when Country filter is set to "Ca*" (starts with)', () => {
      cy.get('.filter-countryOfOrigin.search-filter')
        .clear()
        .type('Ca*');

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.eq(485);
        });
    });

    it('should return 485 rows when Country filter is set to "*states" (starts with)', () => {
      cy.get('.filter-countryOfOrigin.search-filter')
        .clear()
        .type('*states');

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.eq(484);
        });
    });

    it('should open header menu of "Country of Origin" and choose "Filter Shortcuts -> Blanks Values" and expect 31 rows', () => {
      cy.get('.grid11')
        .find('.slick-header-column:nth-of-type(10)')
        .trigger('mouseover')
        .children('.slick-header-menu-button')
        .invoke('show')
        .click();

      cy.get('[data-command=filter-shortcuts-root-menu]')
        .should('contain', 'Filter Shortcuts')
        .trigger('mouseover');

      cy.get('.slick-header-menu.slick-menu-level-1')
        .find('[data-command=blank-values]')
        .click();

      cy.get('.search-filter.filter-countryOfOrigin')
        .invoke('val')
        .should('equal', '< A');

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.eq(31);
        });
    });

    it('should open header menu of "Country of Origin" again then choose "Filter Shortcuts -> Non-Blanks Values" and expect 969 rows', () => {
      cy.get('.grid11')
        .find('.slick-header-column:nth-of-type(10)')
        .trigger('mouseover')
        .children('.slick-header-menu-button')
        .invoke('show')
        .click();

      cy.get('[data-command=filter-shortcuts-root-menu]')
        .should('contain', 'Filter Shortcuts')
        .trigger('mouseover');

      cy.get('.slick-header-menu.slick-menu-level-1')
        .find('[data-command=non-blank-values]')
        .click();

      cy.get('.search-filter.filter-countryOfOrigin')
        .invoke('val')
        .should('equal', '> A');

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.eq(969);
        });
    });

    it('should open header menu of "Finish" and choose "Filter Shortcuts -> Until Now" and expect below 969 rows', () => {
      cy.get('.grid11')
        .find('.slick-header-column:nth-of-type(7)')
        .trigger('mouseover')
        .children('.slick-header-menu-button')
        .invoke('show')
        .click();

      cy.get('[data-command=filter-shortcuts-root-menu]')
        .should('contain', 'Filter Shortcuts')
        .trigger('mouseover');

      cy.get('.slick-header-menu.slick-menu-level-1')
        .find('[data-command=until-now]')
        .click();

      cy.get('.search-filter.filter-finish .input-group-prepend.operator select')
        .contains('<=');

      cy.get('.search-filter.filter-finish input.date-picker')
        .invoke('val')
        .should('equal', format(new Date(), 'YYYY-MM-DD'));

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.lt(969);
        });
    });

    it('should open header menu of "Finish" again then choose "Filter Shortcuts -> In the Future" and expect below 969 rows', () => {
      cy.get('.grid11')
        .find('.slick-header-column:nth-of-type(7)')
        .trigger('mouseover')
        .children('.slick-header-menu-button')
        .invoke('show')
        .click();

      cy.get('[data-command=filter-shortcuts-root-menu]')
        .should('contain', 'Filter Shortcuts')
        .trigger('mouseover');

      cy.get('.slick-header-menu.slick-menu-level-1')
        .find('[data-command=in-the-future]')
        .click();

      cy.get('.search-filter.filter-finish .input-group-prepend.operator select')
        .contains('>=');

      cy.get('.search-filter.filter-finish input.date-picker')
        .invoke('val')
        .should('equal', format(addDay(new Date(), 1), 'YYYY-MM-DD'));

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.lt(969);
        });
    });
  });

  describe('Local Storage', () => {
    it('should click on "Clear Local Storage" and expect to be back to original grid with all the columns', () => {
      cy.get('[data-test="clear-storage-btn"]')
        .click({ force: true });

      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
    });

    it('should have exact Column Titles in the grid', () => {
      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
    });

    it('should have "TASK 0" (uppercase) incremented by 1 after each row', () => {
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(1)`)
        .contains('TASK 0', { matchCase: false })
        .should('have.css', 'text-transform', 'uppercase');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(1)`).contains('TASK 1', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(1)`).contains('TASK 2', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(1)`).contains('TASK 3', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 4}px;"] > .slick-cell:nth(1)`).contains('TASK 4', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 5}px;"] > .slick-cell:nth(1)`).contains('TASK 5', { matchCase: false });
    });

    it('should be able to change "Duration" values of first 4 rows', () => {
      // change duration
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(2)`).should('contain', 'days').click();
      cy.get('.editor-duration').type('0').type('{enter}', { force: true });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(2)`)
        .should('contain', '0 day')
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(2)`).click().type('1{enter}');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(2)`).should('contain', '1 day')
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(2)`).click().type('2{enter}');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(2)`).should('contain', '2 days')
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(2)`).click().type('3{enter}');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(2)`).should('contain', '3 days')
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(2)`).click().type('{esc}');
      cy.get('.editor-duration').should('not.exist');
    });

    it('should be able to change "Title" values of row indexes 1-3', () => {
      // change title
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(1)`).contains('TASK 1', { matchCase: false }).click();
      cy.get('.editor-title').type('task 1111').type('{enter}');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(1)`).contains('TASK 1111', { matchCase: false })
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(1)`).click()
        .type('task 2222{enter}');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(1)`).contains('TASK 2222', { matchCase: false })
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(1)`).click()
        .type('task 3333').type('{enter}');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(1)`).contains('TASK 3333', { matchCase: false })
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(1)`).click()
        .type('{esc}');
      cy.get('.editor-title').should('not.exist');

      cy.get('.slick-viewport.slick-viewport-top.slick-viewport-left')
        .scrollTo('top');
    });

    it('should be able to change "% Complete" values of row indexes 2-4', () => {
      // change % complete
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(4)`).click();
      cy.get('.slider-editor input[type=range]').as('range').invoke('val', 5).trigger('change', { force: true });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(4)`).should('contain', '5')
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(4)`).click();
      cy.get('.slider-editor input[type=range]').as('range').invoke('val', 6).trigger('change', { force: true });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(4)`).should('contain', '6')
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 4}px;"] > .slick-cell:nth(4)`).click();
      cy.get('.slider-editor input[type=range]').as('range').invoke('val', 7).trigger('change', { force: true });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 4}px;"] > .slick-cell:nth(4)`).should('contain', '7')
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get('.slick-viewport.slick-viewport-top.slick-viewport-left')
        .scrollTo('top');
    });

    it('should be able to change "Finish" values of row indexes 0-2', () => {
      const now = new Date();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const today = changeTimezone(now, tz);

      const currentDate = today.getDate();
      let currentMonth: number | string = today.getMonth() + 1; // month is zero based, let's add 1 to it
      if (currentMonth < 10) {
        currentMonth = `0${currentMonth}`; // add zero padding
      }

      // change Finish date to today's date
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(6)`).should('contain', '').click(); // this date should also always be initially empty
      cy.get('[data-vc-date-today]:visible button')
        .click('bottom', { force: true });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(6)`).should('contain', `${currentYear}-${zeroPadding(currentMonth)}-${zeroPadding(currentDate)}`)
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(6)`).click();
      cy.get('[data-vc-date-today]:visible button').click('bottom', { force: true });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(6)`).should('contain', `${currentYear}-${zeroPadding(currentMonth)}-${zeroPadding(currentDate)}`)
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(6)`).click();
      cy.get('[data-vc-date-today]:visible button').click('bottom', { force: true });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(6)`).should('contain', `${currentYear}-${zeroPadding(currentMonth)}-${zeroPadding(currentDate)}`)
        .should('have.css', 'background-color').and('eq', UNSAVED_RGB_COLOR);

      cy.get('.unsaved-editable-field')
        .should('have.length', 13);

      cy.get('.slick-viewport.slick-viewport-top.slick-viewport-left')
        .scrollTo('top');
    });

    it('should undo last edit and expect the date editor to be opened as well when clicking the associated last undo with editor button', () => {
      cy.get('[data-test=undo-open-editor-btn]').click();

      cy.get('.vc')
        .should('exist');

      cy.get('.unsaved-editable-field')
        .should('have.length', 12);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(6)`).should('contain', '')
        .should('have.css', 'background-color').and('eq', EDITABLE_CELL_RGB_COLOR);
    });

    it('should undo last edit and expect the date editor to NOT be opened when clicking undo last edit button', () => {
      cy.get('[data-test=undo-last-edit-btn]').click();

      cy.get('.vc')
        .should('not.be.visible');

      cy.get('.unsaved-editable-field')
        .should('have.length', 11);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(6)`).should('contain', '')
        .should('have.css', 'background-color').and('eq', EDITABLE_CELL_RGB_COLOR);
    });

    it('should click on the "Save" button and expect 2 console log calls with the queued items & also expect no more unsaved cells', () => {
      cy.get('[data-test=save-all-btn]').click();

      cy.get('.unsaved-editable-field')
        .should('have.length', 0);

      cy.window().then((win) => {
        expect(win.console.log).to.have.callCount(2);
        // expect(win.console.log).to.be.calledWith(Array[11]);
      });
    });

    it('should be able to toggle the grid to readonly', () => {
      cy.get('[data-test=toggle-readonly-btn]').click();

      cy.get('.editable-field')
        .should('have.length', 0);
    });

    it('should be able to toggle back the grid to editable', () => {
      cy.get('[data-test=toggle-readonly-btn]').click();

      cy.get('.editable-field')
        .should('not.have.length', 0);
    });

    it('should not have filters set', () => {
      cy.get('.selected-view').should('contain', '');

      cy.get('input.slider-filter-input')
        .invoke('val')
        .then(text => expect(text).to.eq('0'));

      cy.get('.search-filter.filter-finish .date-picker input')
        .invoke('val')
        .then(text => expect(text).to.eq(''));

      cy.get('.search-filter.filter-completed .ms-choice').should('contain', '');
    });

    it('should change pre-defined view to "Tasks Finished in Previous Years" and expect data to be filtered/sorted accordingly with "Cost" column shown as well', () => {
      const expectedTitles = ['', 'Title', 'Duration', 'Cost', '% Complete', 'Start', 'Finish', 'Completed', 'Action'];
      cy.get('.selected-view').select('previousYears');
      cy.get('.selected-view').should('have.value', 'previousYears');

      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(expectedTitles[index]));

      cy.get('input.slider-filter-input')
        .invoke('val')
        .then(text => expect(text).to.eq('50'));

      cy.get('.search-filter.filter-finish .operator .form-control')
        .should('have.value', '<=');

      cy.get('.search-filter.filter-finish .date-picker input')
        .invoke('val')
        .then(text => expect(text).to.eq(`${currentYear}-01-01`));

      cy.get('.slick-column-name')
        .contains('Finish')
        .find('~ .slick-sort-indicator.slick-sort-indicator-desc')
        .should('have.length', 1);

      cy.get('.search-filter.filter-completed .ms-choice').should('contain', 'True');

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(4)`).should($elm => expect(+$elm.text()).to.be.greaterThan(50));
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(4)`).should($elm => expect(+$elm.text()).to.be.greaterThan(50));
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(4)`).should($elm => expect(+$elm.text()).to.be.greaterThan(50));

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(7)`).find('.checkmark-icon').should('have.length', 1);
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(7)`).find('.checkmark-icon').should('have.length', 1);
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(7)`).find('.checkmark-icon').should('have.length', 1);
    });

    it('should have 3 filters with "filled" css class when having values', () => {
      cy.get('.filter-percentComplete.filled').should('exist');
      cy.get('.filter-finish.filled').should('exist');
      cy.get('.filter-completed.filled').should('exist');
    });

    it('should show Column Picker and expect 2 columns to be hidden', () => {
      cy.get('.grid11')
        .find('.slick-header-column')
        .first()
        .trigger('mouseover')
        .trigger('contextmenu')
        .invoke('show');

      cy.get('.slick-column-picker-list')
        .find('input[type="checkbox"]:checked')
        .should('have.length', 11 - 2);

      cy.get('.slick-column-picker > button.close')
        .click();
    });

    it('should create a new View based on "Tasks Finished in Previous Years" that was already selected', () => {
      const filterName = 'Custom View Test';
      const winPromptStub = () => filterName;

      cy.window().then(win => {
        (cy.stub(win, 'prompt').callsFake(winPromptStub) as any).as('winPromptStubReturnNonNull');
      });

      cy.get('input.search-filter.filter-title')
        .type('*0');

      cy.get('.action.dropdown')
        .click();

      cy.get('.action.dropdown .dropdown-item')
        .contains('Create New View')
        .click({ force: true });

      cy.get('@winPromptStubReturnNonNull').should('be.calledOnce')
        .and('be.calledWith', 'Please provide a name for the new View.');

      cy.should(() => {
        const savedDefinedFilters = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) as string);
        expect(Object.keys(savedDefinedFilters)).to.have.lengthOf(3);
      });

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(1)`).should('contain', '0');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(1)`).should('contain', '0');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(1)`).should('contain', '0');

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(4)`).should($elm => expect(+$elm.text()).to.be.greaterThan(50));
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(4)`).should($elm => expect(+$elm.text()).to.be.greaterThan(50));
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(4)`).should($elm => expect(+$elm.text()).to.be.greaterThan(50));

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(7)`).click();
      cy.get('[data-name="editor-completed"]')
        .find('li.selected')
        .find('input[data-name=selectItemeditor-completed][value=true]')
        .should('exist');

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(7)`).click();

      cy.get('.selected-view').should('have.value', 'CustomViewTest');
    });

    it('should change pre-defined view to "Tasks Finishing in Future Years" and expect data to be filtered accordingly', () => {
      const expectedTitles = ['', 'Title', 'Duration', '% Complete', 'Start', 'Finish', 'Completed', 'Product', 'Country of Origin', 'Action'];

      cy.get('.selected-view').select('greaterCurrentYear');
      cy.get('.selected-view').should('have.value', 'greaterCurrentYear');

      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(expectedTitles[index]));

      cy.get('input.slider-filter-input')
        .invoke('val')
        .then(text => expect(text).to.eq('0'));

      cy.get('.search-filter.filter-finish .operator .form-control')
        .should('have.value', '>=');

      cy.get('.search-filter.filter-finish .date-picker input')
        .invoke('val')
        .then(text => expect(text).to.eq(`${currentYear + 1}-01-01`));

      cy.get('.search-filter.filter-finish.filled input')
        .click({ force: true });

      cy.get('.vc:visible');

      cy.get('[data-vc-date-selected]')
        .should('have.length', 1);

      cy.get('[data-vc-date-selected]')
        .should('have.text', '1');

      cy.get('.slick-column-name')
        .contains('Finish')
        .find('~ .slick-sort-indicator.slick-sort-indicator-asc')
        .should('have.length', 1);

      cy.get('.search-filter.filter-completed .ms-choice').should('contain', '');

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(6)`).should('not.equal', '');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(6)`).should('not.contain', currentYear);
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(6)`).should('not.equal', '');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(6)`).should('not.contain', currentYear);
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(6)`).should('not.equal', '');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(6)`).should('not.contain', currentYear);
    });

    it('should NOT be able to Delete/Update a System Defined View', () => {
      cy.get('.action.dropdown')
        .click();

      cy.get('.action.dropdown .dropdown-item:nth(1)')
        .then($elm => {
          expect($elm.text()).to.contain('Update Current View');
          expect($elm.hasClass('dropdown-item-disabled')).to.be.true;
        });

      cy.get('.action.dropdown .dropdown-item:nth(2)')
        .then($elm => {
          expect($elm.text()).to.contain('Delete Current View');
          expect($elm.hasClass('dropdown-item-disabled')).to.be.true;
        });

      cy.get('.selected-view').should('have.value', 'greaterCurrentYear');
    });

    it('should reload the page and expect the Custom View to be reloaded from Local Storage and expect filtered data as well', () => {
      cy.get('.selected-view').select('CustomViewTest');

      cy.reload();
      cy.wait(50);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(1)`).should('contain', '0');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(1)`).should('contain', '0');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(1)`).should('contain', '0');

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(4)`).should($elm => expect(+$elm.text()).to.be.greaterThan(50));
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(4)`).should($elm => expect(+$elm.text()).to.be.greaterThan(50));
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(4)`).should($elm => expect(+$elm.text()).to.be.greaterThan(50));

      cy.should(() => {
        const savedDefinedFilters = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) as string);
        expect(Object.keys(savedDefinedFilters)).to.have.lengthOf(3);
      });

      cy.get('.selected-view').should('have.value', 'CustomViewTest');
      cy.get('.filter-title.filled').should('exist');
    });

    it('should be able to Update the Custom View that we created earlier with a new name', () => {
      const filterName = 'Custom Updated View Test';
      const winPromptStub = () => filterName;

      cy.window().then(win => {
        (cy.stub(win, 'prompt').callsFake(winPromptStub) as any).as('winPromptStubReturnNonNull');
      });

      cy.get('.selected-view').select('CustomViewTest');

      cy.get('.action.dropdown')
        .click();

      cy.get('.action.dropdown .dropdown-item')
        .contains('Update Current View')
        .click({ force: true });

      cy.get('.action.dropdown .dropdown-item:nth(1)')
        .then($elm => {
          expect($elm.text()).to.contain('Update Current View');
          expect($elm.hasClass('dropdown-item-disabled')).to.be.false;
        });

      cy.get('.action.dropdown')
        .click();

      cy.get('@winPromptStubReturnNonNull').should('be.calledOnce')
        .and('be.calledWith', 'Update View name or click on OK to continue.', 'Custom View Test');

      cy.should(() => {
        const savedDefinedFilters = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) as string);
        expect(Object.keys(savedDefinedFilters)).to.have.lengthOf(3);
      });

      // select should have new name
      cy.get('.selected-view').should('have.value', 'CustomUpdatedViewTest');
    });

    it('should be able to Delete the Custom Filter that we created earlier', () => {
      cy.get('.selected-view').select('CustomUpdatedViewTest');

      cy.get('.action.dropdown')
        .click();

      cy.get('.action.dropdown .dropdown-item:nth(2)')
        .then($elm => {
          expect($elm.text()).to.contain('Delete Current View');
          expect($elm.hasClass('dropdown-item-disabled')).to.be.false;
        });

      cy.get('.action.dropdown .dropdown-item')
        .contains('Delete Current View')
        .click({ force: true });
    });

    it('should expect all Filters & Sorting to be cleared and also expect all columns be back to original', () => {
      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));

      cy.get('.selected-view').should('not.have.value', 'CustomUpdatedViewTest');

      cy.get('.slick-sort-indicator.slick-sort-indicator-desc')
        .should('have.length', 0);

      cy.get('input.slider-filter-input')
        .invoke('val')
        .then(text => expect(text).to.eq('0'));

      cy.get('.search-filter.filter-finish .date-picker input')
        .invoke('val')
        .then(text => expect(text).to.eq(''));

      cy.get('.search-filter.filter-finish')
        .should('not.have.class', 'filled')
        .click();

      cy.get('[data-vc-date-selected]')
        .should('have.length', 0);

      cy.get('.search-filter.filter-completed .ms-choice').should('contain', '');

      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
    });

    it('should change pre-defined view to "Tasks Finished in Previous Years" and expect 2 columns less than original list', () => {
      const expectedTitles = ['', 'Title', 'Duration', 'Cost', '% Complete', 'Start', 'Finish', 'Completed', 'Action'];
      cy.get('.selected-view').select('previousYears');
      cy.get('.selected-view').should('have.value', 'previousYears');

      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(expectedTitles[index]));
    });

    it('should "Clear Local Storage" and expect to be back to original grid with all the columns', () => {
      cy.get('[data-test="clear-storage-btn"]')
        .click({ force: true });

      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));
    });

    it('should also expect all Filters & Sorting to be cleared', () => {
      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(fullTitles[index]));

      cy.get('.selected-view').should('not.have.value', 'CustomUpdatedViewTest');

      cy.get('.slick-sort-indicator.slick-sort-indicator-desc')
        .should('have.length', 0);

      cy.get('input.slider-filter-input')
        .invoke('val')
        .then(text => expect(text).to.eq('0'));

      cy.get('.search-filter.filter-finish .date-picker input')
        .invoke('val')
        .then(text => expect(text).to.eq(''));

      cy.get('.search-filter.filter-completed .ms-choice').should('contain', '');
      cy.get('.filled').should('have.length', 0);
    });

    it('should have all columns shown (checkbox is checked) in the Column Picker', () => {
      cy.get('.grid11')
        .find('.slick-header-column')
        .first()
        .trigger('mouseover')
        .trigger('contextmenu')
        .invoke('show');

      cy.get('.slick-column-picker-list')
        .find('input[type="checkbox"]:checked')
        .should('have.length', 11);

      cy.get('.slick-column-picker > button.close')
        .click();
    });

    it('should be able to click on the delete button from the "Action" column of the 2nd row and expect "Task 1" to be delete', () => {
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(1)`).contains('TASK 0', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(1)`).contains('TASK 1', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(1)`).contains('TASK 2', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(1)`).contains('TASK 3', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 4}px;"] > .slick-cell:nth(1)`).contains('TASK 4', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 5}px;"] > .slick-cell:nth(1)`).contains('TASK 5', { matchCase: false });

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(10)`)
        .find('.mdi-close')
        .click();

      cy.on('window:confirm', () => true);

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(1)`).contains('TASK 0', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(1)`).contains('TASK 2', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(1)`).contains('TASK 3', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(1)`).contains('TASK 4', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 4}px;"] > .slick-cell:nth(1)`).contains('TASK 5', { matchCase: false });
    });

    it('should be able to click on the checked 2nd button from the "Action" column of the 2nd row and expect "Task 2" to be completed', () => {
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(1)`).contains('TASK 0', { matchCase: false });
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(1)`).contains('TASK 2', { matchCase: false });

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(10)`)
        .find('.mdi-check-underline')
        .click();

      cy.on('window:alert', (str) => {
        expect(str).to.equal('The "Task 2" is now Completed');
      });

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(7)`).find('.checkmark-icon').should('have.length', 1);
    });

    it('should be able to filter "Country of Origin" with a text range filter "b..e" and expect to see only Canada showing up', () => {
      cy.get('.slick-header-columns .slick-header-column:nth(9)').trigger('mouseover'); // mouseover column headers to get rid of cell tooltip
      cy.get('input.search-filter.filter-countryOfOrigin').type('b..e');
      cy.get('input.search-filter.filter-countryOfOrigin.filled').should('exist');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(9)`).should('contain', 'Canada');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(9)`).should('contain', 'Canada');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(9)`).should('contain', 'Canada');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(9)`).should('contain', 'Canada');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 4}px;"] > .slick-cell:nth(9)`).should('contain', 'Canada');
    });

    it('should be able to filter "Duration" with greater than symbol ">8"', () => {
      cy.get('input.search-filter.filter-duration').type('>8');

      cy.get('.grid11')
        .find('.slick-cell:nth(2)')
        .each(($cell, index) => {
          if (index < 10) {
            const [number] = $cell.text().split(' ');
            expect(+number).to.be.greaterThan(8);
          }
        });
    });

    it('should be able to filter "Title" with Task finishing by 5', () => {
      cy.get('input.search-filter.filter-title').type('*5');

      cy.get('.grid11')
        .find('.slick-cell:nth(1)')
        .each(($cell, index) => {
          if (index < 10) {
            const [_taskString, taskNumber] = $cell.text().split(' ');
            expect(taskNumber).to.be.eq('5');
          }
        });
    });

    it('should be able to freeze "Duration" column', () => {
      cy.get('.grid11')
        .find('.slick-header-columns')
        .find('.slick-header-column:nth(2)')
        .trigger('mouseover')
        .children('.slick-header-menu-button')
        .invoke('show')
        .click();

      cy.get('.slick-header-menu .slick-menu-command-list')
        .should('be.visible')
        .children('.slick-menu-item:nth-of-type(1)')
        .children('.slick-menu-content')
        .should('contain', 'Freeze Column')
        .click();
    });

    it('should have a frozen grid with 4 containers on page load with 3 columns on the left and 8 columns on the right', () => {
      cy.get('[style="top: 0px;"]').should('have.length', 2);
      cy.get('.grid-canvas-left > [style="top: 0px;"]').children().should('have.length', 3);
      cy.get('.grid-canvas-right > [style="top: 0px;"]').children().should('have.length', 8);

      cy.get('.grid-canvas-left > [style="top: 0px;"] > .slick-cell:nth(0)').should('contain', '');
      cy.get('.grid-canvas-left > [style="top: 0px;"] > .slick-cell:nth(1)').contains(/^TASK [0-9]*$/i);
      cy.get('.grid-canvas-left > [style="top: 0px;"] > .slick-cell:nth(2)').contains(/^[0-9]*\sday[s]?$/);

      cy.get('.grid-canvas-right > [style="top: 0px;"] > .slick-cell:nth(0)').contains(/\$[0-9.]*/);

      cy.get('.slick-pane-left')
        .find('.slick-grid-menu-button')
        .should('not.exist');

      cy.get('.slick-pane-right')
        .find('.slick-grid-menu-button')
        .should('exist');
    });

    it('should create a new View with current pinning & filters', () => {
      const filterName = 'Custom View Test';
      const winPromptStub = () => filterName;

      cy.window().then(win => {
        (cy.stub(win, 'prompt').callsFake(winPromptStub) as any).as('winPromptStubReturnNonNull');
      });

      cy.get('.action.dropdown')
        .click();

      cy.get('.action.dropdown .dropdown-item')
        .contains('Create New View')
        .click();

      cy.get('@winPromptStubReturnNonNull').should('be.calledOnce')
        .and('be.calledWith', 'Please provide a name for the new View.');

      cy.should(() => {
        const savedDefinedFilters = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) as string);
        expect(Object.keys(savedDefinedFilters)).to.have.lengthOf(3);
      });

      cy.get('.selected-view').should('have.value', 'CustomViewTest');
    });

    it('should change pre-defined view to "Tasks Finished in Previous Years" and expect different filters and no pinning', () => {
      const expectedTitles = ['', 'Title', 'Duration', 'Cost', '% Complete', 'Start', 'Finish', 'Completed', 'Action'];
      cy.get('.selected-view').select('previousYears');
      cy.get('.selected-view').should('have.value', 'previousYears');

      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(expectedTitles[index]));

      cy.get('input.slider-filter-input')
        .invoke('val')
        .then(text => expect(text).to.eq('50'));

      cy.get('.search-filter.filter-finish .operator .form-control')
        .should('have.value', '<=');

      cy.get('.search-filter.filter-finish .date-picker input')
        .invoke('val')
        .then(text => expect(text).to.eq(`${currentYear}-01-01`));

      cy.get('[style="top: 0px;"]').should('have.length', 1);
      cy.get('.grid-canvas-left > [style="top: 0px;"]').children().should('have.length', 9);

      cy.get('.slick-pane-left')
        .find('.slick-grid-menu-button')
        .should('exist');

      cy.get('.slick-pane-right')
        .find('.slick-grid-menu-button')
        .should('not.exist');
    });

    it('should change pre-defined view back to the Custom View Test', () => {
      const expectedTitles = ['', 'Title', 'Duration', 'Cost', '% Complete', 'Start', 'Finish', 'Completed', 'Product', 'Country of Origin', 'Action'];
      cy.get('.selected-view').select('CustomViewTest');
      cy.get('.selected-view').should('have.value', 'CustomViewTest');

      cy.get('.grid11')
        .find('.slick-header-columns')
        .children()
        .each(($child, index) => expect($child.text()).to.eq(expectedTitles[index]));
    });

    it('should expect 3 filters with "filled" css class when having values', () => {
      cy.get('.filter-title.filled').should('exist');
      cy.get('.filter-duration.filled').should('exist');
      cy.get('.filter-countryOfOrigin.filled').should('exist');
    });

    it('should have back the frozen columns from CustomViewTest on the right side of the "Duration" column', () => {
      cy.get('[style="top: 0px;"]').should('have.length', 2);
      cy.get('.grid-canvas-left > [style="top: 0px;"]').children().should('have.length', 3);
      cy.get('.grid-canvas-right > [style="top: 0px;"]').children().should('have.length', 8);

      cy.get('.grid-canvas-left > [style="top: 0px;"] > .slick-cell:nth(0)').should('contain', '');
      cy.get('.grid-canvas-left > [style="top: 0px;"] > .slick-cell:nth(1)').contains(/^TASK [0-9]*$/i);
      cy.get('.grid-canvas-left > [style="top: 0px;"] > .slick-cell:nth(2)').contains(/^[0-9]*\sday[s]?$/);

      cy.get('.grid-canvas-right > [style="top: 0px;"] > .slick-cell:nth(0)').contains(/\$?[0-9.]*/);

      cy.get('.slick-pane-left')
        .find('.slick-grid-menu-button')
        .should('not.exist');

      cy.get('.slick-pane-right')
        .find('.slick-grid-menu-button')
        .should('exist');
    });

    it('should have the same 3 filters defined in the CustomViewTest', () => {
      cy.get('input.search-filter.filter-title').invoke('val').then(text => expect(text).to.eq('*5'));
      cy.get('input.search-filter.filter-duration').invoke('val').then(text => expect(text).to.eq('>8'));

      cy.get('.grid11')
        .find('.slick-cell:nth(1)')
        .each(($cell, index) => {
          if (index < 10) {
            const [_taskString, taskNumber] = $cell.text().split(' ');
            expect(taskNumber).to.include('5');
          }
        });

      cy.get('.grid11')
        .find('.slick-cell:nth(2)')
        .each(($cell, index) => {
          if (index < 10) {
            const [number] = $cell.text().split(' ');
            expect(+number).to.be.greaterThan(8);
          }
        });

      cy.get('input.search-filter.filter-countryOfOrigin').invoke('val').then(text => expect(text).to.eq('b..e'));
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(9)`).should('contain', 'Canada');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 1}px;"] > .slick-cell:nth(9)`).should('contain', 'Canada');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 2}px;"] > .slick-cell:nth(9)`).should('contain', 'Canada');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 3}px;"] > .slick-cell:nth(9)`).should('contain', 'Canada');
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 4}px;"] > .slick-cell:nth(9)`).should('contain', 'Canada');
    });

    it('should clear pinning from Grid Menu & expect to no longer have any columns freezed', () => {
      cy.get('.grid11')
        .find('button.slick-grid-menu-button')
        .click({ force: true });

      cy.contains('Unfreeze Columns/Rows')
        .click({ force: true });

      cy.get('[style="top: 0px;"]').should('have.length', 1);
      cy.get('.grid-canvas-left > [style="top: 0px;"]').children().should('have.length', 11);
    });

    it('should filter the "Completed" column to True and expect only completed rows to be displayed', () => {
      cy.get('div.ms-filter.filter-completed')
        .trigger('click');

      cy.get('.ms-drop')
        .find('li:nth(1)')
        .click();

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.lt(50);
        });
    });

    it('should filter the "Completed" column to the null option and expect 50 rows displayed', () => {
      cy.get('div.ms-filter.filter-completed')
        .trigger('click');

      cy.get('.ms-drop')
        .find('li:nth(0)')
        .click();

      cy.get('.filter-title.filled').should('exist');
      cy.get('.filter-countryOfOrigin.filled').should('exist');
      cy.get('.filter-completed.filled').should('not.exist');
      cy.get('.search-filter.filter-completed .ms-choice').should('contain', '');

      cy.get('.grid11')
        .find('.slick-custom-footer')
        .find('.right-footer .item-count')
        .should($span => {
          expect(Number($span.text())).to.eq(100 - 3); // 3x of them have no country defined
        });
    });

    it('should display 2 different tooltips when hovering icons from "Action" column', () => {
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(10)`).as('first-row-action-cell');
      cy.get('@first-row-action-cell').find('.action-btns .mdi-close').as('delete-row-btn');
      cy.get('@first-row-action-cell').find('.action-btns .mdi-check-underline').as('mark-completed-btn');

      cy.get('@delete-row-btn')
        .trigger('mouseover');

      cy.get('.slick-custom-tooltip').should('be.visible');
      cy.get('.slick-custom-tooltip .tooltip-body').contains('Delete Current Row');

      cy.get('@mark-completed-btn')
        .trigger('mouseover');

      cy.get('.slick-custom-tooltip').should('be.visible');
      cy.get('.slick-custom-tooltip .tooltip-body').contains('Mark as Completed');
    });

    it('should clear local storage before leaving', () => {
      cy.get('[data-test="clear-storage-btn"]')
        .click({ force: true });
    });
  });

  describe('with Date Editor', () => {
    it('should input values directly in input of datepicker', () => {
      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(5)`)
        .click();

      cy.get(`.input-group-editor`)
        .focus()
        .type('{backspace}'.repeat(10))
        .type('1970-01-01')
        .type('{enter}');

      cy.get(`[style="top: ${GRID_ROW_HEIGHT * 0}px;"] > .slick-cell:nth(5)`)
        .should('contain', '1970-01-01');
    });
  });
});
