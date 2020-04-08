import { SortDirectionNumber } from '../../enums/index';
import { stringSorter } from '../stringSorter';

describe('the String Sorter', () => {
  it('should return original unsorted array when no direction is provided', () => {
    const direction = null;
    const inputArray = ['amazon', 'zebra', 'amazon', 'John', 'Abe', 'abc'];
    inputArray.sort((value1, value2) => stringSorter(value1, value2, direction));
    expect(inputArray).toEqual(['amazon', 'zebra', 'amazon', 'John', 'Abe', 'abc']);
  });

  it('should return original unsorted array when neutral (0) direction is provided', () => {
    const direction = SortDirectionNumber.neutral;
    const inputArray = ['amazon', 'zebra', 'amazon', 'John', 'Abe', 'abc'];
    inputArray.sort((value1, value2) => stringSorter(value1, value2, direction));
    expect(inputArray).toEqual(['amazon', 'zebra', 'amazon', 'John', 'Abe', 'abc']);
  });

  it('should return an array of strings sorted ascending with strings starting with uppercase showing first because of ASCII index', () => {
    const direction = SortDirectionNumber.asc;
    const inputArray = ['amazon', 'zebra', 'amazon', 'John', 'Abe', 'abc'];
    inputArray.sort((value1, value2) => stringSorter(value1, value2, direction));
    expect(inputArray).toEqual(['Abe', 'John', 'abc', 'amazon', 'amazon', 'zebra']);
  });

  it('should return an array of strings sorted descending with strings starting with uppercase showing first because of ASCII index', () => {
    const direction = SortDirectionNumber.desc;
    const inputArray = ['amazon', 'zebra', 'amazon', 'John', 'Abe', 'abc'];
    inputArray.sort((value1, value2) => stringSorter(value1, value2, direction));
    expect(inputArray).toEqual(['zebra', 'amazon', 'amazon', 'abc', 'John', 'Abe']);
  });

  it('should return an array of different type of characters sorted ascending with the sequence of null values, then empty string and finally latin characters', () => {
    const direction = SortDirectionNumber.asc;
    const inputArray = ['amazon', null, 'zebra', null, '', '@at', 'John', 'Abe', 'abc'];
    inputArray.sort((value1, value2) => stringSorter(value1, value2, direction));
    expect(inputArray).toEqual([null, null, '', '@at', 'Abe', 'John', 'abc', 'amazon', 'zebra']);
  });

  it('should return an array of different type of characters sorted descending with the latin characters, then empty string and finally null values', () => {
    const direction = SortDirectionNumber.desc;
    const inputArray = ['amazon', null, 'zebra', '', null, '@at', 'John', 'Abe', 'abc'];
    inputArray.sort((value1, value2) => stringSorter(value1, value2, direction));
    expect(inputArray).toEqual(['zebra', 'amazon', 'abc', 'John', 'Abe', '@at', '', null, null]);
  });
});
