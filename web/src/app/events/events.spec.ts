import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Events } from './events';
import { provideFirebaseTestServices } from '../firebase-test.providers';

describe('Events', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Events],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        ...provideFirebaseTestServices('events', { auth: true, firestore: true }),

      ],
    }).compileComponents();
  });

  it('should create the events component', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should have loading signal', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    expect(component['loading']).toBeDefined();
    expect(typeof component['loading']()).toBe('boolean');
  });

  it('should have events signal', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    expect(component['events']).toBeDefined();
    expect(Array.isArray(component['events']())).toBe(true);
  });

  it('should have upcomingEvents computed signal', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    expect(component['upcomingEvents']).toBeDefined();
    expect(Array.isArray(component['upcomingEvents']())).toBe(true);
  });

  it('should have pastEvents computed signal', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    expect(component['pastEvents']).toBeDefined();
    expect(Array.isArray(component['pastEvents']())).toBe(true);
  });

  it('should correctly separate upcoming and past events', () => {
    const fixture = TestBed.createComponent(Events);
    const component = fixture.componentInstance;
    const futureDate = new Date(Date.now() + 86400000);
    const pastDate = new Date(Date.now() - 86400000);
    const threeWeeksAgo = new Date(Date.now() - 21 * 86400000);
    const baseEvent = {
      id: '1',
      clubId: 'c1',
      name: 'Test',
      description: '',
      createdAt: pastDate,
      updatedAt: pastDate,
      createdBy: 'u1',
    };
    component['events'].set([
      // Upcoming: future end, recent start
      { ...baseEvent, id: '1', startTime: pastDate, endTime: futureDate },
      // Past: already ended
      { ...baseEvent, id: '2', startTime: pastDate, endTime: pastDate },
      // Past: started more than 2 weeks ago even though end is in future
      { ...baseEvent, id: '3', startTime: threeWeeksAgo, endTime: futureDate },
    ]);
    expect(component['upcomingEvents']().length).toBe(1);
    expect(component['upcomingEvents']()[0].id).toBe('1');
    expect(component['pastEvents']().length).toBe(2);
    expect(component['pastEvents']().map((e) => e.id)).toContain('2');
    expect(component['pastEvents']().map((e) => e.id)).toContain('3');
  });

  it('should render header', async () => {
    const fixture = TestBed.createComponent(Events);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('.page-header h1');
    expect(header).toBeTruthy();
    expect(header?.textContent).toContain('Events');
  });
});
