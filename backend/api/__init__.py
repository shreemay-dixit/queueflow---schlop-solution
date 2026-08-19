from fastapi import APIRouter
from .triage import router as triage_router
from .queue import router as queue_router
from .consent import router as consent_router
from .tenants import router as tenants_router

api_router = APIRouter(prefix="/api")
api_router.include_router(triage_router)
api_router.include_router(queue_router)
api_router.include_router(consent_router)
api_router.include_router(tenants_router)

__all__ = ["api_router"]
