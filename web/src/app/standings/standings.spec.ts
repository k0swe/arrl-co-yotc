import { TestBed } from '@angular/core/testing';
import { Standings } from './standings';

describe('Standings', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Standings],
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

  it('should display coming soon message', () => {
    const fixture = TestBed.createComponent(Standings);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const comingSoonMessage = compiled.querySelector('.coming-soon-message');
    expect(comingSoonMessage?.textContent).toContain('Coming Soon!');
  });
});
