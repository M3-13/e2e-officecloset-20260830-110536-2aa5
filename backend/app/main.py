from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.config import get_settings
from app.db import engine
from app.routers import account, auth, images, wardrobe

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="OfficeCloset API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(account.router)
app.include_router(wardrobe.router)
app.include_router(images.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
