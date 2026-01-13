# ============================================
# 라우터 모듈
# ============================================
from .auth import router as auth_router
from .admin_users import router as admin_users_router
from .contents import router as contents_router
from .roles import router as roles_router
from .menus import router as menus_router
from .companies import router as companies_router
from .security_groups import router as security_groups_router
from .logs import router as logs_router
from .content_categories import router as content_categories_router
from .content_subcategories import router as content_subcategories_router
from .common_codes import router as common_codes_router
from .system_settings import router as system_settings_router
from .notices import router as notices_router
from .store_customers import router as store_customers_router
from .members import router as members_router
from .greating_x import router as greating_x_router
from .upload import router as upload_router
from .departments import router as departments_router
from .apis import router as apis_router
from .dashboard import router as dashboard_router
from .points import router as points_router
from .challenges import router as challenges_router
from .supplements import router as supplements_router
from .functional_ingredients import router as functional_ingredients_router
from .functionality_contents import router as functionality_contents_router
from .units import router as units_router
from .consents import router as consents_router
from .push_notifications import router as push_notifications_router
from .health_goal_types import router as health_goal_types_router
from .supplement_corners import router as supplement_corners_router
from .meal_records import router as meal_records_router
from .coupons import router as coupons_router

__all__ = [
    'auth_router', 
    'admin_users_router', 
    'contents_router',
    'roles_router',
    'menus_router',
    'companies_router',
    'security_groups_router',
    'logs_router',
    'content_categories_router',
    'content_subcategories_router',
    'common_codes_router',
    'system_settings_router',
    'notices_router',
    'store_customers_router',
    'members_router',
    'greating_x_router',
    'upload_router',
    'departments_router',
    'apis_router',
    'dashboard_router',
    'points_router',
    'challenges_router',
    'supplements_router',
    'functional_ingredients_router',
    'functionality_contents_router',
    'units_router',
    'consents_router',
    'push_notifications_router',
    'health_goal_types_router',
    'supplement_corners_router',
    'meal_records_router',
    'coupons_router',
]

