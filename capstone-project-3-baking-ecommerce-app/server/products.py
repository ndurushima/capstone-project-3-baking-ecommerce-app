from flask import Blueprint, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import db, Product

products_bp = Blueprint("products", __name__)


@products_bp.get("/")
def list_products():
    products = Product.query.filter_by(is_active=True).order_by(Product.name).all()
    return jsonify([p.to_dict() for p in products]), 200


@products_bp.get("/<int:product_id>")
def get_product(product_id):
    product = Product.query.get(product_id)
    if not product or not product.is_active:
        return abort(404, description="Product not found or inactive")
    return jsonify(product.to_dict()), 200