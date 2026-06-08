import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Standings } from './standings';
import { provideFirebaseTestServices } from '../firebase-test.providers';

describe('Standings', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Standings],
      providers: [
        provideAnimationsAsync(),
        ...provideFirebaseTestServices('standings', { firestore: true }),

      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Standings);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render heading', () => {
    const fixture = TestBed.createComponent(Standings);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading?.textContent).toContain('Standings');
  });

  it('should show loading spinner initially', () => {
    const fixture = TestBed.createComponent(Standings);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-spinner')).toBeTruthy();
  });
});
