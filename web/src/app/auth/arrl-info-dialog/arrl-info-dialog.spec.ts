import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ArrlInfoDialog } from './arrl-info-dialog';

describe('ArrlInfoDialog', () => {
  let mockDialogRef: Partial<MatDialogRef<ArrlInfoDialog>>;

  beforeEach(async () => {
    mockDialogRef = {
      close: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ArrlInfoDialog],
      providers: [provideAnimationsAsync(), { provide: MatDialogRef, useValue: mockDialogRef }],
    }).compileComponents();
  });

  it('should create the dialog component', () => {
    const fixture = TestBed.createComponent(ArrlInfoDialog);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should close dialog when onClose is called', () => {
    const fixture = TestBed.createComponent(ArrlInfoDialog);
    const component = fixture.componentInstance;
    component['onClose']();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should render the dialog title', async () => {
    const fixture = TestBed.createComponent(ArrlInfoDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h2');
    expect(title?.textContent).toContain('Sign in with ARRL');
  });

  it('should render the close button', async () => {
    const fixture = TestBed.createComponent(ArrlInfoDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button');
    expect(button?.textContent?.trim()).toBe('Got it');
  });
});
