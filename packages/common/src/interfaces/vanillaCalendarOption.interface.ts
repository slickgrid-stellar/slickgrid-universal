import type { Options } from 'vanilla-calendar-pro';

export interface VanillaCalendarOption extends Partial<Options> {
  //-- extra options used by SlickGrid

  /** defaults to false, do we want to hide the clear date button? */
  hideClearButton?: boolean;

  /** defaults to false, should keyboard entries be allowed in input field? */
  allowInput?: boolean;
}
