from functools import lru_cache
from typing import Optional

from supabase import create_client, Client

from app.config.settings import settings


class SupabaseClient:
    _instance: Optional[Client] = None
    _service_instance: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        if cls._instance is None:
            cls._instance = create_client(
                settings.supabase_url,
                settings.supabase_key,
            )
        return cls._instance

    @classmethod
    def get_service_client(cls) -> Client:
        if cls._service_instance is None:
            cls._service_instance = create_client(
                settings.supabase_url,
                settings.supabase_service_key,
            )
        return cls._service_instance


@lru_cache()
def get_supabase_client() -> Client:
    return SupabaseClient.get_client()


@lru_cache()
def get_supabase_service_client() -> Client:
    return SupabaseClient.get_service_client()


supabase_client = get_supabase_client()
