import { TestBed } from '@angular/core/testing';
import { ClubService } from './club.service';
import { provideFirebaseTestServices } from '../firebase-test.providers';

describe('ClubService', () => {
  let service: ClubService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideFirebaseTestServices('club-service', { firestore: true }),

      ],
    });
    service = TestBed.inject(ClubService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getActiveClubs method', () => {
    expect(service.getActiveClubs).toBeDefined();
    expect(typeof service.getActiveClubs).toBe('function');
  });

  it('should have getAllClubs method', () => {
    expect(service.getAllClubs).toBeDefined();
    expect(typeof service.getAllClubs).toBe('function');
  });

  it('should have getPendingClubs method', () => {
    expect(service.getPendingClubs).toBeDefined();
    expect(typeof service.getPendingClubs).toBe('function');
  });

  it('should have approveClub method', () => {
    expect(service.approveClub).toBeDefined();
    expect(typeof service.approveClub).toBe('function');
  });

  it('should have rejectClub method', () => {
    expect(service.rejectClub).toBeDefined();
    expect(typeof service.rejectClub).toBe('function');
  });

  it('should return an observable from getActiveClubs', () => {
    const result = service.getActiveClubs();
    expect(result).toBeDefined();
    expect(result.subscribe).toBeDefined();
  });

  it('should return an observable from getAllClubs', () => {
    const result = service.getAllClubs();
    expect(result).toBeDefined();
    expect(result.subscribe).toBeDefined();
  });

  it('should return an observable from getPendingClubs', () => {
    const result = service.getPendingClubs();
    expect(result).toBeDefined();
    expect(result.subscribe).toBeDefined();
  });
});
