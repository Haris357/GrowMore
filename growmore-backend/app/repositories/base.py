from typing import Any, Dict, Generic, List, Optional, TypeVar
from uuid import UUID

from supabase import Client

T = TypeVar("T")


class BaseRepository(Generic[T]):
    def __init__(self, client: Client, table_name: str):
        self.client = client
        self.table_name = table_name

    async def get_by_id(self, id: UUID) -> Optional[Dict[str, Any]]:
        result = self.client.table(self.table_name).select("*").eq("id", str(id)).execute()
        return result.data[0] if result.data else None

    async def get_all(
        self,
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
    ) -> Dict[str, Any]:
        query = self.client.table(self.table_name).select("*", count="exact")

        if filters:
            for key, value in filters.items():
                if value is not None:
                    if isinstance(value, list):
                        query = query.in_(key, value)
                    else:
                        query = query.eq(key, value)

        if sort_by:
            query = query.order(sort_by, desc=(sort_order == "desc"))

        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)

        result = query.execute()

        total = result.count or 0
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "items": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        }

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        result = self.client.table(self.table_name).insert(data).execute()
        return result.data[0] if result.data else None

    async def update(self, id: UUID, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = self.client.table(self.table_name).update(data).eq("id", str(id)).execute()
        return result.data[0] if result.data else None

    async def delete(self, id: UUID) -> bool:
        result = self.client.table(self.table_name).delete().eq("id", str(id)).execute()
        return len(result.data) > 0 if result.data else False

    async def exists(self, id: UUID) -> bool:
        result = self.client.table(self.table_name).select("id").eq("id", str(id)).execute()
        return len(result.data) > 0 if result.data else False

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        query = self.client.table(self.table_name).select("*", count="exact", head=True)

        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, value)

        result = query.execute()
        return result.count or 0

    async def bulk_create(self, data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        result = self.client.table(self.table_name).insert(data_list).execute()
        return result.data or []

    async def bulk_update(
        self, ids: List[UUID], data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        str_ids = [str(id) for id in ids]
        result = self.client.table(self.table_name).update(data).in_("id", str_ids).execute()
        return result.data or []

    async def search(
        self,
        search_column: str,
        search_term: str,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        query = self.client.table(self.table_name).select("*", count="exact").ilike(
            search_column, f"%{search_term}%"
        )

        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)

        result = query.execute()

        total = result.count or 0
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "items": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        }
