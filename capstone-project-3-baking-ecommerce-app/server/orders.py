from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, Order, OrderStatus, User
from .enums import UserRole

orders_bp = Blueprint("orders", __name__)

def _is_admin(user_id: int) -> bool:
    user = User.query.get(user_id)
    return bool(user and user.role == UserRole.admin)

@orders_bp.get("/")
@jwt_required()
def list_orders():
    """
    List orders for the current user (admin can see everyone’s).
    Query params (optional):
      - status: placed|complete|canceled
      - page: int (default 1)
      - per_page: int (default 10, max 50)
    """
    user_id = int(get_jwt_identity())
    is_admin = _is_admin(user_id)

    status_param = request.args.get("status")
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 10)), 1), 50)

    q = Order.query
    if not is_admin:
        q = q.filter(Order.user_id == user_id)

    if status_param:
        try:
            status = OrderStatus(status_param)
        except ValueError:
            return jsonify({"error": "invalid status"}), 400
        q = q.filter(Order.status == status)

    q = q.order_by(Order.created_at.desc())

    paged = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "page": page,
        "per_page": per_page,
        "total": paged.total,
        "items": [o.to_dict() for o in paged.items],
    }), 200


@orders_bp.get("/<int:order_id>")
@jwt_required()
def get_order(order_id: int):
    """
    Get a single order. Non-admin users can only access their own orders.
    Admins can read any order.
    """
    user_id = int(get_jwt_identity())
    is_admin = _is_admin(user_id)

    order = Order.query.get(order_id)
    if not order:
        abort(404, description="Order not found")

    if not is_admin and order.user_id != user_id:
        abort(403, description="Forbidden")

    return jsonify(order.to_dict()), 200
