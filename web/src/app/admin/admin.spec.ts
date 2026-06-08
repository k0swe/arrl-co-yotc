import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Admin } from './admin';
import { provideFirebaseTestServices } from '../firebase-test.providers';

describe('Admin', () => {
  let component: Admin;
  let fixture: ComponentFixture<Admin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Admin, NoopAnimationsModule],
      providers: [
        ...provideFirebaseTestServices('admin', { firestore: true, storage: true }),

      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Admin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the admin heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Admin Dashboard');
  });

  it('should render the pending clubs section heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const headings = compiled.querySelectorAll('h2');
    const headingTexts = Array.from(headings).map((h) => h.textContent ?? '');
    expect(headingTexts.some((t) => t.includes('Pending Club Suggestions'))).toBe(true);
  });

  it('should render the standings upload section heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const headings = compiled.querySelectorAll('h2');
    const headingTexts = Array.from(headings).map((h) => h.textContent ?? '');
    expect(headingTexts.some((t) => t.includes('Upload Standings'))).toBe(true);
  });

  it('should render the recent uploads section heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const headings = compiled.querySelectorAll('h2');
    const headingTexts = Array.from(headings).map((h) => h.textContent ?? '');
    expect(headingTexts.some((t) => t.includes('Recent Document Uploads'))).toBe(true);
  });

  it('should render the search uploads button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent ?? '');
    expect(buttonTexts.some((t) => t.includes('Search Uploads'))).toBe(true);
  });
});
