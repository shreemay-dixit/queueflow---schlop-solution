from fastapi import APIRouter, HTTPException
from backend.models.schemas import BusinessConfig, TenantId
from database.db import db

router = APIRouter(prefix="/tenants", tags=["Tenants"])

@router.get("")
async def get_tenants():
    return {"tenants": [c.dict() for c in db.configs.values()]}

@router.get("/{tenant_id}")
async def get_tenant(tenant_id: TenantId):
    config = db.configs.get(tenant_id)
    if not config:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {"tenant": config.dict()}

@router.put("/{tenant_id}")
async def update_tenant(tenant_id: TenantId, updated_config: BusinessConfig):
    db.configs[tenant_id] = updated_config
    return {"success": True, "tenant": updated_config.dict()}
