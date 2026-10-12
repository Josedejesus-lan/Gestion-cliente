# Gestión de atención a clientes

Aplicación web para administrar una fila de clientes y cuatro mesas de atención. El frontend está hecho con Angular y consume una API REST en Python (FastAPI); los turnos se guardan en SQLite.

## Funcionalidad inicial

- Registrar clientes y asignarles un turno consecutivo.
- Ver la fila ordenada por turno.
- Llamar al siguiente cliente desde cualquiera de las cuatro mesas.
- Finalizar la atención para dejar libre la mesa.
- Consultar cuántos clientes esperan, mesas ocupadas y el último turno atendido.

## Requisitos

- Python 3.11 o posterior.
- Node.js 20.11 o posterior y npm.

## Ejecutar en desarrollo

### API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload
```

La API queda en `http://localhost:8000` y su documentación interactiva en `http://localhost:8000/docs`. La base SQLite se crea automáticamente como `backend/atencion.db`.

### Angular

En otra terminal, desde la carpeta del proyecto:

```powershell
cd frontend
npm install
npm start
```

Abre `http://localhost:4200`. La API permite solicitudes de desarrollo desde ese origen.

## Desplegar frontend y API en Vercel

El archivo `vercel.json` configura dos servicios en un mismo proyecto: Angular para `/` y FastAPI para `/api/*`. Vercel publica el frontend en su CDN y ejecuta la API como función Python.

1. En Vercel, importa el repositorio `Josedejesus-lan/Gestion-cliente` y deja la raíz del proyecto en `./` para que lea `vercel.json`.
2. Agrega una integración de PostgreSQL desde Vercel Marketplace (por ejemplo, Neon) al proyecto.
3. Confirma que la integración agregue `DATABASE_URL` al entorno de producción. La API convierte las URL habituales `postgres://` o `postgresql://` para usar el controlador Psycopg instalado.
4. Despliega el proyecto. La aplicación web y las rutas `/api/estado`, `/api/turnos` y `/api/mesas/...` compartirán el mismo dominio.

Vercel no conserva el archivo SQLite de una función entre ejecuciones. Por eso el backend requiere una base PostgreSQL persistente en producción; si falta `DATABASE_URL`, la API muestra un error de configuración en lugar de crear una base temporal que pueda perder turnos.

## Publicar en GitHub

Inicializa Git en esta carpeta y crea un repositorio vacío en tu cuenta de GitHub. Después conecta la URL que GitHub te proporcione:

```powershell
git init
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git add .
git commit -m "Crear MVP de gestión de atención a clientes"
git branch -M main
git push -u origin main
```

No subas la base local `atencion.db`, entornos virtuales ni `node_modules`; están excluidos por `.gitignore`.

## Endpoints principales

- `GET /api/estado`: fila, mesas y último turno atendido.
- `POST /api/turnos` con `{ "nombre": "Ana" }`: registrar un cliente.
- `POST /api/mesas/{id}/siguiente`: finalizar el turno actual de esa mesa (si tiene uno) y llamar al siguiente.
- `POST /api/mesas/{id}/liberar`: finalizar el turno de la mesa.
