import { MatDialogConfig } from '@angular/material/dialog';

const STANDARD_DIALOG_DIMENSIONS = {
  width: '600px',
  maxWidth: 'calc(100vw - 32px)',
} as const;

export function standardDialogConfig<D>(data?: D): MatDialogConfig<D> {
  return {
    ...STANDARD_DIALOG_DIMENSIONS,
    data,
    autoFocus: 'first-tabbable',
    restoreFocus: true,
  };
}
