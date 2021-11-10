import { EmitterType } from '../enums/emitterType.enum';
import { BackendServiceApi, GridOption } from '../interfaces/index';
import { Observable, RxJsFacade, Subject, Subscription } from './rxjsFacade';

export interface BackendCallbacks {
  emitActionChangedCallback?: (type: EmitterType) => void;
  errorCallback?: (args: any) => void;
  successCallback?: (args: any) => void;
  httpCancelRequestSubject?: Subject<void>;
}

export class BackendUtilityService {
  protected _observable$?: Subscription;

  constructor(protected rxjs?: RxJsFacade) { }

  addRxJsResource(rxjs: RxJsFacade) {
    this.rxjs = rxjs;
  }

  dispose() {
    this._observable$?.unsubscribe();
  }

  /** Execute the Backend Processes Callback, that could come from an Observable or a Promise callback */
  executeBackendProcessesCallback(startTime: Date, processResult: any, backendApi: BackendServiceApi, totalItems: number): any {
    const endTime = new Date();

    // define what our internal Post Process callback, only available for GraphQL Service for now
    // it will basically refresh the Dataset & Pagination removing the need for the user to always create his own PostProcess every time
    if (processResult && backendApi?.internalPostProcess) {
      backendApi.internalPostProcess(processResult);
    }

    // send the response process to the postProcess callback
    if (backendApi.postProcess !== undefined) {
      if (processResult instanceof Object) {
        processResult.metrics = {
          startTime,
          endTime,
          executionTime: endTime.valueOf() - startTime.valueOf(),
          itemCount: totalItems,
          totalItemCount: totalItems,
        };
      }
      backendApi.postProcess(processResult);
    }
  }

  /** On a backend service api error, we will run the "onError" if there is 1 provided or just throw back the error when nothing is provided */
  onBackendError(e: any, backendApi: BackendServiceApi) {
    if (typeof backendApi?.onError === 'function') {
      backendApi.onError(e);
    } else {
      throw e;
    }
  }

  /**
   * Execute the backend callback, which are mainly the "process" & "postProcess" methods.
   * Also note that "preProcess" was executed prior to this callback
   */
  executeBackendCallback(backendServiceApi: BackendServiceApi, query: string, args: any, startTime: Date, totalItems: number, extraCallbacks?: BackendCallbacks) {
    if (backendServiceApi) {
      // emit an onFilterChanged event when it's not called by a clear filter
      if (args && !args.clearFilterTriggered && !args.clearSortTriggered && extraCallbacks?.emitActionChangedCallback) {
        extraCallbacks.emitActionChangedCallback.call(this, EmitterType.remote);
      }

      // the processes can be a Promise or an Observable (like HttpClient)
      const process = backendServiceApi.process(query);
      if (process instanceof Promise && process.then) {
        process
          .then((processResult: any) => {
            this.executeBackendProcessesCallback(startTime, processResult, backendServiceApi, totalItems);
            extraCallbacks?.successCallback?.call(this, args);
          })
          .catch((error: any) => {
            extraCallbacks?.errorCallback?.call(this, args);
            this.onBackendError(error, backendServiceApi);
          });
      } else if (this.rxjs?.isObservable(process)) {
        const rxjs = this.rxjs as RxJsFacade;

        this._observable$ = (process as unknown as Observable<any>)
          .pipe(
            rxjs.distinctUntilChanged(),
            // use `switchMap` so that it cancels any previous subscription, it must return an observable so we can use `of` for that, and then finally we can subscribe to the new observable
            rxjs.switchMap((asyncResult) => rxjs.of(asyncResult))
          ).subscribe(
            (processResult: any) => {
              this.executeBackendProcessesCallback(startTime, processResult, backendServiceApi, totalItems);
              extraCallbacks?.successCallback?.call(this, args);
            },
            (error: any) => {
              extraCallbacks?.errorCallback?.call(this, args);
              this.onBackendError(error, backendServiceApi);
            }
          );

        // // this will abort any previous HTTP requests, that were previously hooked in the takeUntil, before sending a new request
        // if (rxjs.isObservable(extraCallbacks?.httpCancelRequestSubject)) {
        //   extraCallbacks?.httpCancelRequestSubject!.next();
        // }

        // (process as unknown as Observable<any>)
        //   // the following takeUntil, will potentially be used later to cancel any pending http request (takeUntil another rx, that would be httpCancelRequests$, completes)
        //   // but make sure the observable is actually defined with the iif condition check before piping it to the takeUntil
        //   .pipe(rxjs.takeUntil(rxjs.iif(() => rxjs.isObservable(extraCallbacks?.httpCancelRequestSubject), extraCallbacks?.httpCancelRequestSubject, rxjs.EMPTY)))
        //   .subscribe(
        //     (processResult: any) => {
        //       console.log('processResult', processResult)
        //       this.executeBackendProcessesCallback(startTime, processResult, backendServiceApi, totalItems);
        //       extraCallbacks?.successCallback?.call(this, args);
        //     },
        //     (error: any) => {
        //       extraCallbacks?.errorCallback?.call(this, args);
        //       this.onBackendError(error, backendServiceApi);
        //     }
        //   );
      }
    }
  }

  /** Refresh the dataset through the Backend Service */
  refreshBackendDataset(gridOptions: GridOption) {
    let query = '';
    const backendApi = gridOptions?.backendServiceApi;

    if (!backendApi || !backendApi.service || !backendApi.process) {
      throw new Error(`BackendServiceApi requires at least a "process" function and a "service" defined`);
    }

    if (backendApi.service) {
      query = backendApi.service.buildQuery();
    }

    if (query && query !== '') {
      // keep start time & end timestamps & return it after process execution
      const startTime = new Date();

      if (backendApi.preProcess) {
        backendApi.preProcess();
      }

      const totalItems = gridOptions?.pagination?.totalItems ?? 0;
      this.executeBackendCallback(backendApi, query, null, startTime, totalItems);
    }
  }
}
