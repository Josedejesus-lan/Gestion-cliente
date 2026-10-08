from contextlib import asynccontextmanager
from datetime import datetime, timezone
from enum import StrEnum

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

DATABASE_URL = "sqlite:///./atencion.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Session = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class EstadoTurno(StrEnum):
    ESPERA = "espera"
    ATENDIENDO = "atendiendo"
    ATENDIDO = "atendido"


class Turno(Base):
    __tablename__ = "turnos"
    id: Mapped[int] = mapped_column(primary_key=True)
    numero: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120))
    estado: Mapped[EstadoTurno] = mapped_column(Enum(EstadoTurno), default=EstadoTurno.ESPERA)
    creado: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class Mesa(Base):
    __tablename__ = "mesas"
    id: Mapped[int] = mapped_column(primary_key=True)
    turno_id: Mapped[int | None] = mapped_column(ForeignKey("turnos.id"), nullable=True)
    turno: Mapped[Turno | None] = relationship()


class NuevoTurno(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    with Session.begin() as db:
        if db.scalar(select(Mesa.id).limit(1)) is None:
            db.add_all(Mesa(id=i) for i in range(1, 5))
    yield


app = FastAPI(title="API de atención a clientes", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serializar_turno(turno: Turno | None):
    if turno is None:
        return None
    return {"id": turno.id, "numero": turno.numero, "nombre": turno.nombre, "estado": turno.estado.value}


@app.get("/api/estado")
def estado():
    with Session() as db:
        espera = db.scalars(select(Turno).where(Turno.estado == EstadoTurno.ESPERA).order_by(Turno.numero)).all()
        mesas = db.scalars(select(Mesa).order_by(Mesa.id)).all()
        atendidos = db.scalar(select(Turno).where(Turno.estado == EstadoTurno.ATENDIDO).order_by(Turno.numero.desc()).limit(1))
        return {
            "espera": [serializar_turno(t) for t in espera],
            "mesas": [{"id": m.id, "turno": serializar_turno(m.turno)} for m in mesas],
            "ultimoAtendido": serializar_turno(atendidos),
        }


@app.post("/api/turnos", status_code=201)
def crear_turno(datos: NuevoTurno):
    nombre = datos.nombre.strip()
    if len(nombre) < 2:
        raise HTTPException(422, "Escribe un nombre válido")
    with Session.begin() as db:
        ultimo = db.scalar(select(Turno.numero).order_by(Turno.numero.desc()).limit(1)) or 0
        turno = Turno(numero=ultimo + 1, nombre=nombre)
        db.add(turno)
        db.flush()
        return serializar_turno(turno)


@app.post("/api/mesas/{mesa_id}/siguiente")
def siguiente(mesa_id: int):
    with Session.begin() as db:
        mesa = db.get(Mesa, mesa_id)
        if not mesa:
            raise HTTPException(404, "Mesa no encontrada")
        if mesa.turno_id:
            db.get(Turno, mesa.turno_id).estado = EstadoTurno.ATENDIDO
            mesa.turno_id = None
        turno = db.scalar(select(Turno).where(Turno.estado == EstadoTurno.ESPERA).order_by(Turno.numero).limit(1))
        if turno:
            turno.estado = EstadoTurno.ATENDIENDO
            mesa.turno_id = turno.id
        return {"mesa": mesa.id, "turno": serializar_turno(turno)}


@app.post("/api/mesas/{mesa_id}/liberar")
def liberar(mesa_id: int):
    with Session.begin() as db:
        mesa = db.get(Mesa, mesa_id)
        if not mesa:
            raise HTTPException(404, "Mesa no encontrada")
        if mesa.turno_id:
            db.get(Turno, mesa.turno_id).estado = EstadoTurno.ATENDIDO
            mesa.turno_id = None
        return {"mesa": mesa.id, "liberada": True}
