from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, Cart, CartItem, Product, CartStatus


cart_bp = Blueprint("cart", __name__)


def _get_or_create_draft_cart(user_id: int) -> Cart:
    cart = Cart.query.filter_by(user_id=user_id, status=CartStatus.draft).first()
    if not cart:
        cart = Cart(user_id=user_id, status=CartStatus.draft)
        db.session.add(cart)
        db.session.commit()
    return cart


@cart_bp.get("/")
@jwt_required()
def get_cart():
    user_id = get_jwt_identity()
    cart = _get_or_create_draft_cart(user_id)
    return jsonify(cart.to_dict()), 200


@cart_bp.post("/items")
@jwt_required()
def add_or_update_item():
    """
    Body: { "product_id": <int>, "qty": <int> }
    - Adds or updates a line in the draft cart
    - qty <= 0 will remove the item (quality-of-life)
    """
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    product_id = data.get("product_id")
    qty = int(data.get("qty", 1))

    if not product_id:
        return jsonify({"error": "product_id is required"}), 400

    product = Product.query.get(product_id)
    if not product or not product.is_active:
        return jsonify({"error": "product not found or inactive"}), 404

    cart = _get_or_create_draft_cart(user_id)
    item = next((i for i in cart.items if i.product_id == product_id), None)

    if qty <= 0:
        if item:
            db.session.delete(item)
            db.session.commit()
        return jsonify(cart.to_dict()), 200

    if item:
        item.qty = qty
    else:
        item = CartItem(cart_id=cart.id, product_id=product_id, qty=qty)
        db.session.add(item)

    db.session.commit()
    # refresh totals/relationships
    db.session.refresh(cart)
    return jsonify(cart.to_dict()), 200


@cart_bp.delete("/items/<int:product_id>")
@jwt_required()
def remove_item(product_id: int):
    user_id = get_jwt_identity()
    cart = _get_or_create_draft_cart(user_id)
    item = next((i for i in cart.items if i.product_id == product_id), None)
    if not item:
        return jsonify({"error": "item not in cart"}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify(cart.to_dict()), 200
