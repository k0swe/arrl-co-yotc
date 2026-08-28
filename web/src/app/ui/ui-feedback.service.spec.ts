import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';
import { standardDialogConfig } from './dialog-config';
import { UiFeedback } from './ui-feedback.service';

describe('UiFeedback', () => {
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    snackBar.open.mockReset();
    TestBed.configureTestingModule({
      providers: [UiFeedback, { provide: MatSnackBar, useValue: snackBar }],
    });
  });

  it('announces errors assertively', () => {
    TestBed.inject(UiFeedback).error('Unable to save the club');

    expect(snackBar.open).toHaveBeenCalledWith('Unable to save the club', 'Close', {
      duration: 3000,
      politeness: 'assertive',
    });
  });

  it('uses an accessible standard dialog configuration', () => {
    expect(standardDialogConfig({ clubId: 'club-1' })).toEqual({
      width: '600px',
      maxWidth: 'calc(100vw - 32px)',
      data: { clubId: 'club-1' },
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
  });
});
