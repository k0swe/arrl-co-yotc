import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { NgOptimizedImage } from '@angular/common';
import { Club } from '@arrl-co-yotc/shared/build/app/models/club.model';

@Component({
  selector: 'app-club-card',
  imports: [MatCardModule, MatIconModule, NgOptimizedImage],
  templateUrl: './club-card.html',
  styleUrl: './club-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubCard {
  /**
   * The club data to display
   */
  club = input.required<Club>();
}
