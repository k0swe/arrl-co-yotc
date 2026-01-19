import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-arrl-info-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './arrl-info-dialog.html',
  styleUrl: './arrl-info-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArrlInfoDialog {
  private dialogRef = inject(MatDialogRef<ArrlInfoDialog>);

  protected onClose(): void {
    this.dialogRef.close();
  }
}
