import { ExportOption, SlickGrid } from '../interfaces/index';
import { SharedService } from '../services/shared.service';

export abstract class ExportService {
  /**
   * Initialize the Export Service
   * @param grid
   */
  init(grid: SlickGrid, sharedService: SharedService): void {
    throw new Error('ExportService the "init" method must be implemented');
  }

  /**
   * Method to return the current locale used by the App
   * @return {string} current locale
   */
  exportToFile(options: ExportOption): Promise<boolean> {
    throw new Error('ExportService the "exportToFile" method must be implemented');
  }
}
