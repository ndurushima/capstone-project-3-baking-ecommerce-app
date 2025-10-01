from __future__ import annotations

from datetime import datetime, date, time
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_
from .models import (db, Cart, CartItem, CartStatus, Order, OrderItem, OrderStatus, FulfillmentMethod, Product)

checkout_bp = Blueprint("checkout", __name__)

# -------- helpers --------

def _parse_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()

def _parse_time(s: str | None) -> time | None:
    if not s:
        return None
    return datetime.strptime(s, "%H:%M").time()

def _get_draft_cart(user_id: int) -> Cart | None:
    return Cart.query.filter_by(user_id=user_id, status=CartStatus.draft).first()

def _active_order_exists_for(fulfillment_date: date) -> bool:
    return db.session.query(
        db.exists().where(
            and_(
                Order.fulfillment_date == fulfillment_date,
                Order.status.in_([OrderStatus.placed, OrderStatus.complete])
            )
        )
    ).scalar()

def _validate_delivery_payload(payload: dict) -> tuple[bool, str | None]:
    need = ["name", "line1", "city", "state", "zip"]
    delivery = payload.get("delivery") or {}
    missing = [k for k in need if not (delivery.get(k) or "").strip()]
    if missing:
        return False, f"Missing delivery fields: {', '.join(missing)}"
    return True, None


@checkout_bp.post("/")
@jwt_required()
def checkout():
    """
    Body:
    {
      "fulfillment_date": "YYYY-MM-DD",
      "requested_time": "HH:MM",                 # optional
      "fulfillment_method": "pickup"|"delivery",
      "delivery": { "name": "...", "line1": "...", "line2": "", "city":"", "state":"", "zip":"" }  # if delivery
    }
    """
    user_id = int(get_jwt_identity())
    payload = request.get_json() or {}


    fd_str = payload.get("fulfillment_date")
    if not fd_str:
        return jsonify({"error": "fulfillment_date is required (YYYY-MM-DD)"}), 400

    try:
        fdate = _parse_date(fd_str)
    except ValueError:
        return jsonify({"error": "fulfillment_date must be YYYY-MM-DD"}), 400

    try:
        rtime = _parse_time(payload.get("requested_time"))
    except ValueError:
        return jsonify({"error": "requested_time must be HH:MM (24h)"}), 400

    try:
        method = FulfillmentMethod(payload.get("fulfillment_method", "pickup"))
    except ValueError:
        return jsonify({"error": "fulfillment_method must be 'pickup' or 'delivery'"}), 400



    if method == FulfillmentMethod.delivery:
        ok, msg = _validate_delivery_payload(payload)
        if not ok:
            return jsonify({"error": msg}), 400

    # --- ensure a draft cart with items ---
    cart = _get_draft_cart(user_id)
    if not cart or not cart.items:
        return jsonify({"error": "Your cart is empty"}), 400

    # --- enforce one active order per day ---
    if _active_order_exists_for(fdate):
        return jsonify({"error": "That date is already booked"}), 409

    # --- create order + order items with price_snapshot ---
    order = Order(
        user_id=user_id,
        fulfillment_date=fdate,
        requested_time=rtime,
        fulfillment_method=method,
        status=OrderStatus.placed,
    )
    if method == FulfillmentMethod.delivery:
        d = payload.get("delivery") or {}
        order.delivery_name = d.get("name")
        order.delivery_line1 = d.get("line1")
        order.delivery_line2 = d.get("line2")
        order.delivery_city = d.get("city")
        order.delivery_state = d.get("state")
        order.delivery_zip = d.get("zip")

    db.session.add(order)
    db.session.flush()  


    total = 0
    for ci in cart.items:
        product: Product = Product.query.get(ci.product_id)
        if not product or not product.is_active:
            return jsonify({"error": f"Product {ci.product_id} not found or inactive"}), 400

        oi = OrderItem(
            order_id=order.id,
            product_id=ci.product_id,
            qty=ci.qty,
            price_snapshot=product.price,  
        )
        total += ci.qty * float(product.price)
        db.session.add(oi)

    order.total = total

    # mark cart checked_out
    cart.status = CartStatus.checked_out

    db.session.commit()

    new_cart = Cart(user_id=user_id, status=CartStatus.draft)
    db.session.add(new_cart)
    db.session.commit()

    return jsonify(order.to_dict()), 201
