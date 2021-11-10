import { RxJsFacade } from '@slickgrid-universal/common';
import { EMPTY, iif, isObservable, firstValueFrom, Observable, ObservableInput, of, OperatorFunction, ObservedValueOf, Subject, switchMap, } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

export class RxJsResource implements RxJsFacade {
  readonly className = 'RxJsResource';

  /**
   * The same Observable instance returned by any call to without a scheduler.
   * This returns the EMPTY constant from RxJS
   */
  get EMPTY(): Observable<never> {
    return EMPTY;
  }

  /** Simple method to create an Observable */
  createObservable<T>(): Observable<T> {
    return new Observable<T>();
  }

  /** Simple method to create a Subject */
  createSubject<T>(): Subject<T> {
    return new Subject<T>();
  }

  /**
   * Returns a result {@link Observable} that emits all values pushed by the source observable if they
   * are distinct in comparison to the last value the result observable emitted.
   */
  distinctUntilChanged<T>(comparator?: (previous: T, current: T) => boolean) {
    return distinctUntilChanged(comparator);
  }

  /**
   * Converts an observable to a promise by subscribing to the observable, and returning a promise that will resolve
   * as soon as the first value arrives from the observable. The subscription will then be closed.
   */
  firstValueFrom<T>(source: Observable<T>): Promise<T> {
    return firstValueFrom(source);
  }

  iif<T = never, F = never>(condition: () => boolean, trueResult?: any, falseResult?: any): Observable<T | F> {
    return iif<T, F>(condition, trueResult, falseResult);
  }

  /** Tests to see if the object is an RxJS Observable */
  isObservable(obj: any): boolean {
    return isObservable(obj);
  }

  /** Converts the arguments to an observable sequence. */
  of(...value: any): Observable<any> {
    return of(...value);
  }

  /** Projects each source value to an Observable which is merged in the output Observable, emitting values only from the most recently projected Observable. */
  switchMap<T, O extends ObservableInput<any>>(project: (value: T, index: number) => O): OperatorFunction<T, ObservedValueOf<O>> {
    return switchMap(project);
  }

  /** Emits the values emitted by the source Observable until a `notifier` Observable emits a value. */
  takeUntil<T>(notifier: Observable<any>): any {
    return takeUntil<T>(notifier);
  }
}