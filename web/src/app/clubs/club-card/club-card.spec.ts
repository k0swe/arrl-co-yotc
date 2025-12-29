import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ClubCard } from './club-card';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('ClubCard', () => {
  let component: ClubCard;
  let fixture: ComponentFixture<ClubCard>;

  const mockClub: Club = {
    id: 'test-club-1',
    name: 'Test Amateur Radio Club',
    description: 'A test club for unit testing',
    callsign: 'W0TEST',
    location: 'Denver, CO',
    website: 'https://example.com',
    slug: 'test-club-1',
    isActive: true,
    leaderIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClubCard],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(ClubCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('club', mockClub);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display club name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('mat-card-title');
    expect(title?.textContent).toContain('Test Amateur Radio Club');
  });

  it('should display club location', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const subtitle = compiled.querySelector('mat-card-subtitle');
    expect(subtitle?.textContent).toContain('Denver, CO');
  });

  it('should display club callsign', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const callsign = compiled.querySelector('.club-callsign');
    expect(callsign?.textContent).toContain('W0TEST');
  });

  it('should display club description', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const description = compiled.querySelector('.club-description');
    expect(description?.textContent).toContain('A test club for unit testing');
  });

  it('should display website when club has one', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const website = compiled.querySelector('.club-website');
    expect(website).toBeTruthy();
    const link = website?.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://example.com');
  });

  it('should not display website section when club has no website', () => {
    const clubWithoutWebsite = { ...mockClub, website: undefined };
    fixture.componentRef.setInput('club', clubWithoutWebsite);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const website = compiled.querySelector('.club-website');
    expect(website).toBeFalsy();
  });
});
