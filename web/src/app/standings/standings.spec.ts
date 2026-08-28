import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, Subject, throwError } from 'rxjs';
import { Standings } from './standings';
import { StandingsService } from '../services/standings.service';
import {
  StandingEntry,
  StandingsColumns,
} from '@arrl-co-yotc/shared/build/app/models/standing.model';

describe('Standings', () => {
  const getStandings = vi.fn();
  const getStandingsColumns = vi.fn();

  beforeEach(async () => {
    getStandings.mockReset();
    getStandingsColumns.mockReset();

    await TestBed.configureTestingModule({
      imports: [Standings],
      providers: [
        provideAnimationsAsync(),
        {
          provide: StandingsService,
          useValue: {
            getStandings,
            getStandingsColumns,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    getStandings.mockReturnValue(new Subject<StandingEntry[]>());
    getStandingsColumns.mockReturnValue(new Subject<StandingsColumns | undefined>());
    const fixture = TestBed.createComponent(Standings);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render heading', () => {
    getStandings.mockReturnValue(of([]));
    getStandingsColumns.mockReturnValue(of(undefined));
    const fixture = TestBed.createComponent(Standings);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('h1');
    expect(heading?.textContent).toContain('Standings');
  });

  it('should show loading spinner initially', () => {
    getStandings.mockReturnValue(new Subject<StandingEntry[]>());
    getStandingsColumns.mockReturnValue(new Subject<StandingsColumns | undefined>());
    const fixture = TestBed.createComponent(Standings);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-spinner')).toBeTruthy();
  });

  it('should show an explicit error state when loading fails', async () => {
    getStandingsColumns.mockReturnValue(of(undefined));
    getStandings.mockReturnValue(throwError(() => new Error('boom')));

    const fixture = TestBed.createComponent(Standings);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Unable to Load Standings');
    expect(compiled.textContent).toContain('Please try again');
    expect(compiled.textContent).toContain('Try Again');
  });

  it('should refresh by reloading standings streams', () => {
    getStandings.mockReturnValue(of([]));
    getStandingsColumns.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(Standings);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(getStandings).toHaveBeenCalledTimes(1);
    expect(getStandingsColumns).toHaveBeenCalledTimes(1);

    component['refreshStandings']();
    fixture.detectChanges();

    expect(getStandings).toHaveBeenCalledTimes(2);
    expect(getStandingsColumns).toHaveBeenCalledTimes(2);
  });
});
