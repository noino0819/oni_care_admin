# ============================================
# 어드민 메뉴 API 라우터
# ============================================
# 메뉴 CRUD

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.config.database import query, query_one, execute_returning, execute
from app.models.common import ApiResponse
from app.middleware.auth import get_current_user
from app.core.logger import logger


router = APIRouter(prefix="/api/v1/admin/menus", tags=["Menus"])


def build_menu_tree(menus: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """메뉴를 트리 구조로 변환"""
    menu_map = {}
    roots = []
    
    # 모든 메뉴를 맵에 저장
    for menu in menus:
        menu_map[menu["id"]] = {**menu, "children": []}
    
    # 트리 구조 생성
    for menu in menus:
        menu_node = menu_map[menu["id"]]
        if menu["parent_id"] is None:
            roots.append(menu_node)
        else:
            parent = menu_map.get(menu["parent_id"])
            if parent:
                parent["children"].append(menu_node)
    
    return roots


@router.get("")
async def get_menus(
    parent_id: Optional[str] = Query(None, description="상위 메뉴 ID"),
    depth: Optional[int] = Query(None, description="메뉴 깊이"),
    flat: bool = Query(False, description="플랫 구조로 반환"),
    is_active: Optional[str] = Query(None, description="활성 여부"),
    current_user=Depends(get_current_user)
):
    """
    메뉴 목록 조회
    """
    try:
        conditions = []
        params = {}
        
        if parent_id is not None and parent_id != '':
            if parent_id == 'null':
                conditions.append("parent_id IS NULL")
            else:
                conditions.append("parent_id = %(parent_id)s")
                params["parent_id"] = int(parent_id)
        
        if depth is not None:
            conditions.append("depth = %(depth)s")
            params["depth"] = depth
        
        if is_active is not None and is_active != '':
            conditions.append("is_active = %(is_active)s")
            params["is_active"] = is_active in ('Y', 'true', 'True')
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        data_sql = f"""
            SELECT id, menu_name, menu_path, parent_id, depth, sort_order, icon, is_active, created_at, updated_at
            FROM public.admin_menus
            {where_clause}
            ORDER BY depth, sort_order, id
        """
        
        data = await query(data_sql, params)
        
        # flat 파라미터가 없으면 트리 구조로 반환
        response_data = data if flat else build_menu_tree(data)
        
        return {"success": True, "data": response_data}
    except Exception as e:
        logger.error(f"메뉴 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "메뉴 조회 중 오류가 발생했습니다."}
        )


@router.get("/{menu_id}")
async def get_menu(
    menu_id: int,
    current_user=Depends(get_current_user)
):
    """
    메뉴 상세 조회
    """
    try:
        menu = await query_one(
            "SELECT * FROM public.admin_menus WHERE id = %(menu_id)s",
            {"menu_id": menu_id}
        )
        
        if not menu:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "메뉴를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=menu)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"메뉴 조회 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "FETCH_ERROR", "message": "메뉴 조회 중 오류가 발생했습니다."}
        )


@router.post("")
async def create_menu(
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    메뉴 등록
    """
    try:
        menu_name = body.get("menu_name")
        menu_path = body.get("menu_path")
        parent_id = body.get("parent_id")
        sort_order = body.get("sort_order")
        icon = body.get("icon")
        is_active = body.get("is_active", True)
        
        if not menu_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "VALIDATION_ERROR", "message": "메뉴명은 필수입니다."}
            )
        
        # depth 계산
        depth = 1
        if parent_id:
            parent = await query_one(
                "SELECT depth FROM public.admin_menus WHERE id = %(parent_id)s",
                {"parent_id": parent_id}
            )
            if parent:
                depth = parent["depth"] + 1
        
        # sort_order 자동 계산
        if sort_order is None:
            if parent_id:
                max_order = await query_one(
                    """
                    SELECT MAX(sort_order) as max_order 
                    FROM public.admin_menus 
                    WHERE parent_id = %(parent_id)s AND depth = %(depth)s
                    """,
                    {"parent_id": parent_id, "depth": depth}
                )
            else:
                max_order = await query_one(
                    """
                    SELECT MAX(sort_order) as max_order 
                    FROM public.admin_menus 
                    WHERE parent_id IS NULL AND depth = %(depth)s
                    """,
                    {"depth": depth}
                )
            sort_order = (max_order.get("max_order") or 0) + 1 if max_order else 1
        
        result = await execute_returning(
            """
            INSERT INTO public.admin_menus (menu_name, menu_path, parent_id, depth, sort_order, icon, is_active)
            VALUES (%(menu_name)s, %(menu_path)s, %(parent_id)s, %(depth)s, %(sort_order)s, %(icon)s, %(is_active)s)
            RETURNING *
            """,
            {
                "menu_name": menu_name,
                "menu_path": menu_path,
                "parent_id": parent_id,
                "depth": depth,
                "sort_order": sort_order,
                "icon": icon,
                "is_active": is_active
            }
        )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"메뉴 등록 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CREATE_ERROR", "message": "메뉴 등록 중 오류가 발생했습니다."}
        )


@router.put("/{menu_id}")
async def update_menu(
    menu_id: int,
    body: dict,
    current_user=Depends(get_current_user)
):
    """
    메뉴 수정
    """
    try:
        update_fields = []
        params = {"menu_id": menu_id}
        
        if "menu_name" in body:
            update_fields.append("menu_name = %(menu_name)s")
            params["menu_name"] = body["menu_name"]
        
        if "menu_path" in body:
            update_fields.append("menu_path = %(menu_path)s")
            params["menu_path"] = body["menu_path"]
        
        if "sort_order" in body:
            update_fields.append("sort_order = %(sort_order)s")
            params["sort_order"] = body["sort_order"]
        
        if "icon" in body:
            update_fields.append("icon = %(icon)s")
            params["icon"] = body["icon"]
        
        if "is_active" in body:
            update_fields.append("is_active = %(is_active)s")
            params["is_active"] = body["is_active"]
        
        if not update_fields:
            existing = await query_one(
                "SELECT * FROM public.admin_menus WHERE id = %(menu_id)s",
                {"menu_id": menu_id}
            )
            return ApiResponse(success=True, data=existing)
        
        update_fields.append("updated_at = NOW()")
        
        result = await execute_returning(
            f"""
            UPDATE public.admin_menus
            SET {', '.join(update_fields)}
            WHERE id = %(menu_id)s
            RETURNING *
            """,
            params
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "메뉴를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"메뉴 수정 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "UPDATE_ERROR", "message": "메뉴 수정 중 오류가 발생했습니다."}
        )


@router.delete("/{menu_id}")
async def delete_menu(
    menu_id: int,
    current_user=Depends(get_current_user)
):
    """
    메뉴 삭제
    """
    try:
        affected = await execute(
            "DELETE FROM public.admin_menus WHERE id = %(menu_id)s",
            {"menu_id": menu_id}
        )
        
        if affected == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "NOT_FOUND", "message": "메뉴를 찾을 수 없습니다."}
            )
        
        return ApiResponse(success=True, data={"message": "삭제되었습니다."})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"메뉴 삭제 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "DELETE_ERROR", "message": "메뉴 삭제 중 오류가 발생했습니다."}
        )

