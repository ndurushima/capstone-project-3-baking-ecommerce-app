from flask import Blueprint, jsonify, request, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, Order, OrderStatus, User
from .enums import UserRole

admin_orders_bp = Blueprint("admin_orders", __name__)

def _is_admin(user_id: int) -> bool:
    user = User.query.get(user_id)
    return bool(user and user.role == UserRole.admin)


@admin_orders_bp.patch("/<int:order_id>/status")
@jwt_required()
def update_order_status(order_id: int):
    """
    Admin-only: update an order’s status.
    Body: { "status": "complete" | "canceled" }
    """
    user_id = get_jwt_identity()
    if not _is_admin(user_id):
        abort(403, description="Admin access required")

    order = Order.query.get(order_id)
    if not order:
        abort(404, description="Order not found")

    new_status = (request.get_json() or {}).get("status")
    if new_status not in [s.value for s in OrderStatus]:
        return jsonify({"error": "Invalid status"}), 400

    order.status = OrderStatus(new_status)
    db.session.commit()

    return jsonify(order.to_dict()), 200
