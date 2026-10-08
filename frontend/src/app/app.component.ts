import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Turno { id: number; numero: number; nombre: string; estado: string; }
interface Estado { espera: Turno[]; mesas: { id: number; turno: Turno | null }[]; ultimoAtendido: Turno | null; }

@Component({
  selector: 'app-root', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <main class="shell">
      <header><div class="brand"><span class="brand-mark">A</span><div><strong>Atención</strong><small>GESTIÓN DE TURNOS</small></div></div><span class="live"><i></i> Sistema en línea</span></header>
      <section class="intro"><div><p class="eyebrow">PANEL DE CONTROL</p><h1>Atención a clientes</h1><p class="sub">Organiza la fila y mantén cada mesa en movimiento.</p></div><div class="date">{{ hoy | date:'EEEE, d MMMM' }}</div></section>
      <section class="stats"><article><span>En espera</span><b>{{ estado?.espera?.length ?? 0 }}</b><small>clientes en la fila</small></article><article><span>Mesas activas</span><b>{{ mesasOcupadas }}</b><small>de 4 mesas disponibles</small></article><article><span>Último atendido</span><b class="last">{{ estado?.ultimoAtendido ? ('#' + estado?.ultimoAtendido?.numero) : '—' }}</b><small>{{ estado?.ultimoAtendido?.nombre || 'Aún sin turnos' }}</small></article></section>
      <section class="content">
        <div class="panel queue-panel"><div class="panel-heading"><div><h2>Fila de espera</h2><p>Los clientes se atienden en orden</p></div><span class="count">{{ estado?.espera?.length ?? 0 }}</span></div>
          <form (ngSubmit)="agregar()"><label for="nombre">Agregar cliente</label><div class="form-row"><input id="nombre" name="nombre" [(ngModel)]="nombre" placeholder="Nombre del cliente" required minlength="2"><button class="primary" [disabled]="cargando || nombre.trim().length < 2">＋ Tomar turno</button></div><p class="error" *ngIf="error">{{ error }}</p></form>
          <div class="queue-list" *ngIf="estado?.espera?.length; else vacio"><div class="queue-item" *ngFor="let t of estado?.espera"><span class="ticket">{{ t.numero | number:'3.0' }}</span><div class="person"><b>{{ t.nombre }}</b><small>Esperando atención</small></div><span class="waiting">En fila</span></div></div><ng-template #vacio><div class="empty"><span>✓</span><b>La fila está vacía</b><small>Agrega un cliente para comenzar.</small></div></ng-template>
        </div>
        <div class="panel desks-panel"><div class="panel-heading"><div><h2>Mesas de atención</h2><p>Asigna el siguiente turno o libera la mesa</p></div></div><div class="desks"><article class="desk" *ngFor="let m of estado?.mesas"><div class="desk-top"><span class="desk-icon">▦</span><span class="desk-state" [class.busy]="!!m.turno">{{ m.turno ? 'Atendiendo' : 'Disponible' }}</span></div><h3>Mesa {{ m.id }}</h3><ng-container *ngIf="m.turno; else libre"><div class="active-ticket">#{{ m.turno.numero | number:'3.0' }}</div><p class="customer">{{ m.turno.nombre }}</p><button class="secondary" (click)="liberar(m.id)">Finalizar atención</button></ng-container><ng-template #libre><p class="no-customer">Lista para recibir un cliente</p><button class="primary full" (click)="siguiente(m.id)" [disabled]="!estado?.espera?.length">Llamar siguiente →</button></ng-template></article></div></div>
      </section><footer><span>Atención al cliente</span><span>Los datos se guardan localmente en el servidor.</span></footer>
    </main>`
})
export class AppComponent implements OnInit {
  private http = inject(HttpClient); private api = 'http://localhost:8000/api';
  estado: Estado | null = null; nombre = ''; error = ''; cargando = false; hoy = new Date();
  get mesasOcupadas(): number { return this.estado?.mesas.filter(m => !!m.turno).length ?? 0; }
  ngOnInit(): void { this.cargar(); }
  cargar(): void { this.http.get<Estado>(`${this.api}/estado`).subscribe({ next: d => { this.estado = d; this.error = ''; }, error: () => this.error = 'No se pudo conectar con la API. Verifica que el backend esté activo.' }); }
  agregar(): void { const nombre = this.nombre.trim(); if (nombre.length < 2) return; this.cargando = true; this.http.post(`${this.api}/turnos`, { nombre }).subscribe({ next: () => { this.nombre = ''; this.cargando = false; this.cargar(); }, error: () => { this.cargando = false; this.error = 'No se pudo registrar el turno.'; } }); }
  siguiente(id: number): void { this.http.post(`${this.api}/mesas/${id}/siguiente`, {}).subscribe({ next: () => this.cargar(), error: () => this.error = 'No se pudo asignar el turno.' }); }
  liberar(id: number): void { this.http.post(`${this.api}/mesas/${id}/liberar`, {}).subscribe({ next: () => this.cargar(), error: () => this.error = 'No se pudo liberar la mesa.' }); }
}
