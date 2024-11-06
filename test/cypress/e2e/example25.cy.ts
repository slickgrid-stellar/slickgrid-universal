import { addDay, format, isAfter, isBefore, isEqual } from '@formkit/tempo';

const presetMinComplete = 5;
const presetMaxComplete = 80;
const presetMinDuration = 4;
const presetMaxDuration = 88;
const today = new Date();
const presetLowestDay = format(addDay(new Date(), -2), 'YYYY-MM-DD');
const presetHighestDay = format(addDay(new Date(), today.getDate() < 14 ? 28 : 25), 'YYYY-MM-DD');

function isBetween(inputDate: Date | string, minDate: Date | string, maxDate: Date | string, isInclusive = false) {
  let valid = false;
  if (isInclusive) {
    valid = isEqual(inputDate, minDate) || isEqual(inputDate, maxDate);
  }
  if (!valid) {
    valid = isAfter(inputDate, minDate) && isBefore(inputDate, maxDate);
  }
  return valid;
}

function isSmallerOrEqual(inputDate: Date | string, maxDate: Date | string) {
  return isBefore(inputDate, maxDate) || isEqual(inputDate, maxDate);
}

describe('Example 25 - Range Filters', () => {
  it('should display Example title', () => {
    cy.visit(`${Cypress.config('baseUrl')}/example25`);
    cy.get('h3').should('contain', 'Example 25 - Range Filters');
  });

  it('should expect the grid to be sorted by "% Complete" descending and then by "Duration" ascending', () => {
    cy.get('.grid25')
      .get('.slick-header-column:nth(2)')
      .find('.slick-sort-indicator-desc')
      .should('have.length', 1)
      .siblings('.slick-sort-indicator-numbered')
      .contains('1');

    cy.get('.grid25')
      .get('.slick-header-column:nth(5)')
      .find('.slick-sort-indicator-asc')
      .should('have.length', 1)
      .siblings('.slick-sort-indicator-numbered')
      .contains('2');
  });

  it('should have "% Complete" fields within the range (inclusive) of the filters presets', () => {
    cy.get('.grid25')
      .find('.slick-row')
      .each(($row) => {
        cy.wrap($row)
          .children('.slick-cell:nth(2)')
          .each(($cell) => {
            const value = parseInt($cell.text().trim(), 10);
            if (!isNaN(value)) {
              expect(value >= presetMinComplete).to.eq(true);
              expect(value <= presetMaxComplete).to.eq(true);
            }
          });
      });
  });

  it('should have Finish Dates within the range (inclusive) of the filters presets', () => {
    cy.get('.grid25')
      .find('.slick-row')
      .each(($row) => {
        cy.wrap($row)
          .children('.slick-cell:nth(4)')
          .each(($cell) => {
            const isDateBetween = isBetween($cell.text(), presetLowestDay, presetHighestDay, true);
            expect(isDateBetween).to.eq(true);
          });
      });
  });

  it('should have "Duration" fields within the range (exclusive by default) of the filters presets', () => {
    cy.get('.grid25')
      .find('.slick-row')
      .each(($row) => {
        cy.wrap($row)
          .children('.slick-cell:nth(5)')
          .each(($cell) => {
            const value = parseInt($cell.text().trim(), 10);
            if (!isNaN(value)) {
              expect(value >= presetMinDuration).to.eq(true);
              expect(value <= presetMaxDuration).to.eq(true);
            }
          });
      });
  });

  it('should change "% Complete" filter range by using the slider left handle (min value) to make it a higher min value and expect all rows to be within new range', () => {
    let newLowest = presetMinComplete;
    let newHighest = presetMaxComplete;
    const allowedBuffer = 0.8;

    // first input is the lowest range
    cy.get('.slider-filter-input:nth(0)')
      .as('range').invoke('val', 10).trigger('change', { force: true });

    cy.get('.lowest-range-percentComplete')
      .then(($lowest) => {
        newLowest = parseInt($lowest.text(), 10);
      });

    cy.get('.highest-range-percentComplete')
      .then(($highest) => {
        newHighest = parseInt($highest.text(), 10);
      });

    cy.wait(5);

    cy.get('.grid25')
      .find('.slick-row')
      .each(($row, idx) => {
        if (idx > 6) {
          return;
        }
        cy.wrap($row)
          .children('.slick-cell:nth(2)')
          .each(($cell) => {
            const value = parseInt($cell.text().trim(), 10);
            if (!isNaN(value) && $cell.text() !== '') {
              expect(value >= (newLowest - allowedBuffer)).to.eq(true);
              expect(value <= (newHighest + allowedBuffer)).to.eq(true);
            }
          });
      });
  });

  it('should change the "Finish" date in the picker and expect all rows to be within new dates range', () => {
    cy.get('.date-picker.search-filter.filter-finish')
      .click();

    cy.get('[data-vc-date-selected="first"]')
      .should('exist');

    cy.get('[data-vc-date-selected="middle"]')
      .should('have.length.gte', 2);

    cy.get('[data-vc-date-selected="last"]')
      .should('exist');
  });

  it('should change the "Duration" input filter and expect all rows to be within new range', () => {
    const newMin = 10;
    const newMax = 40;

    cy.get('[data-test=clear-filters]')
      .click({ force: true });

    cy.get('.search-filter.filter-duration')
      .focus()
      .type(`${newMin}..${newMax}`);

    cy.get('.grid25')
      .find('.slick-row')
      .each(($row, idx) => {
        cy.wrap($row)
          .children('.slick-cell:nth(5)')
          .each(($cell) => {
            if (idx > 8) {
              return;
            }
            const value = parseInt($cell.text().trim(), 10);
            if (!isNaN(value)) {
              expect(value >= newMin).to.eq(true);
              expect(value <= newMax).to.eq(true);
            }
          });
      });
  });

  describe('Set Dymamic Filters', () => {
    const dynamicMinComplete = 15;
    const dynamicMaxComplete = 85;
    const dynamicMinDuration = 14;
    const dynamicMaxDuration = 78;
    const dynamicLowestDay = format(addDay(new Date(), -5), 'YYYY-MM-DD');
    const dynamicHighestDay = format(addDay(new Date(), 25), 'YYYY-MM-DD');

    it('should click on Set Dynamic Filters', () => {
      cy.get('[data-test=set-dynamic-filter]')
        .click();
    });

    it('should have "% Complete" fields within the exclusive range of the filters presets', () => {
      cy.get('.grid25')
        .find('.slick-row')
        .each(($row) => {
          cy.wrap($row)
            .children('.slick-cell:nth(2)')
            .each(($cell) => {
              const value = parseInt($cell.text().trim(), 10);
              if (!isNaN(value)) {
                expect(value >= dynamicMinComplete).to.eq(true);
                expect(value <= dynamicMaxComplete).to.eq(true);
              }
            });
        });
    });

    it('should have "Duration" fields within the inclusive range of the dynamic filters', () => {
      cy.get('.grid25')
        .find('.slick-row')
        .each(($row) => {
          cy.wrap($row)
            .children('.slick-cell:nth(5)')
            .each(($cell) => {
              const value = parseInt($cell.text().trim(), 10);
              if (!isNaN(value)) {
                expect(value >= dynamicMinDuration).to.eq(true);
                expect(value <= dynamicMaxDuration).to.eq(true);
              }
            });
        });
    });

    it('should have Start Dates smaller or equal to the dynamic filter', () => {
      cy.get('.search-filter.filter-start')
        .find('input')
        .invoke('val')
        .then(text => expect(text).to.eq(dynamicHighestDay));

      cy.get('.grid25')
        .find('.slick-row')
        .each(($row) => {
          cy.wrap($row)
            .children('.slick-cell:nth(3)')
            .each(($cell) => {
              const isDateBetween = isSmallerOrEqual($cell.text(), dynamicHighestDay);
              expect(isDateBetween).to.eq(true);
            });
        });
    });

    it('should have Finish Dates within the range (inclusive) of the dynamic filters', () => {
      cy.get('.search-filter.filter-finish')
        .find('input')
        .invoke('val')
        .then(text => expect(text).to.eq(`${dynamicLowestDay} — ${dynamicHighestDay}`));

      cy.get('.grid25')
        .find('.slick-row')
        .each(($row) => {
          cy.wrap($row)
            .children('.slick-cell:nth(4)')
            .each(($cell) => {
              const isDateBetween = isBetween($cell.text(), dynamicLowestDay, dynamicHighestDay, true);
              expect(isDateBetween).to.eq(true);
            });
        });
    });
  });

  describe('Set Dynamic Sorting', () => {
    it('should click on "Clear Filters" then "Set Dynamic Sorting" buttons', () => {
      cy.get('[data-test=clear-filters]')
        .click();

      cy.get('[data-test=set-dynamic-sorting]')
        .click();
    });

    it('should expect the grid to be sorted by "Duration" ascending and "Start" descending', () => {
      cy.get('.grid25')
        .get('.slick-header-column:nth(2)')
        .find('.slick-sort-indicator-asc')
        .should('have.length', 1)
        .siblings('.slick-sort-indicator-numbered')
        .contains('2');

      cy.get('.grid25')
        .get('.slick-header-column:nth(4)')
        .find('.slick-sort-indicator-desc')
        .should('have.length', 1)
        .siblings('.slick-sort-indicator-numbered')
        .contains('1');
    });
  });
});
