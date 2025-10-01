import os
import requests
from flask import Blueprint, jsonify, abort, request
from .models import db, Product

products_bp = Blueprint("products", __name__)

# ---------- Local DB (seeded) ----------
@products_bp.get("/")
def list_local_products():
    """List active products from local DB (seeded)."""
    products = Product.query.filter_by(is_active=True).order_by(Product.name).all()
    return jsonify([p.to_dict() for p in products]), 200


@products_bp.get("/<int:product_id>")
def get_local_product(product_id: int):
    """Get a single local product by id."""
    product = Product.query.get(product_id)
    if not product or not product.is_active:
        abort(404, description="Product not found or inactive")
    return jsonify(product.to_dict()), 200


# ---------- Spoonacular (external) ----------
SPOONACULAR_KEY = os.getenv("SPOONACULAR_API_KEY")
BASE_URL = "https://api.spoonacular.com/recipes/"
SPOONACULAR_PRICES = {
    1095742: 24.00,   # Carrot Cake (example)
    782622: 16.00,    # Brownies (example)
    "default": 14.00,
}


def _ensure_key():
    if not SPOONACULAR_KEY:
        abort(500, description="Missing SPOONACULAR_API_KEY")


@products_bp.get("/spoonacular")
def list_spoonacular_desserts():
    """
    List desserts via Spoonacular.
    Optional query params:
      - q: search term (default 'dessert')
      - number: how many to return (default 20)
    """
    _ensure_key()

    query = request.args.get("q", "dessert")
    number = int(request.args.get("number", 20))

    resp = requests.get(
        f"{BASE_URL}complexSearch",
        params={
            "query": query,
            "type": "dessert",
            "number": number,
            "addRecipeNutrition": False,
            "apiKey": SPOONACULAR_KEY,
        },
        timeout=10,
    )
    if resp.status_code != 200:
        abort(502, description="Spoonacular API unavailable")

    results = resp.json().get("results", [])
    desserts = [{
        "id": r["id"],
        "name": r["title"],
        "image_url": r.get("image"),
        "price": float(SPOONACULAR_PRICES.get(r["id"], SPOONACULAR_PRICES["default"])),
        "is_active": True,
    } for r in results]

    return jsonify(desserts), 200


@products_bp.get("/spoonacular/<int:recipe_id>")
def get_spoonacular_dessert(recipe_id: int):
    """Get dessert details via Spoonacular + your injected price & simple allergen flags."""
    _ensure_key()

    resp = requests.get(
        f"{BASE_URL}{recipe_id}/information",
        params={"includeNutrition": False, "apiKey": SPOONACULAR_KEY},
        timeout=10,
    )
    if resp.status_code != 200:
        abort(502, description="Dessert not found")

    data = resp.json()
    allergens = []
    if data.get("glutenFree") is False:
        allergens.append("contains-gluten")
    if data.get("dairyFree") is False:
        allergens.append("contains-dairy")
    if data.get("vegan") is False and data.get("vegetarian") is True:
        pass

    return jsonify({
        "id": data["id"],
        "name": data["title"],
        "image_url": data.get("image"),
        "price": float(SPOONACULAR_PRICES.get(data["id"], SPOONACULAR_PRICES["default"])),
        "allergens": allergens,
        "instructions": data.get("instructions"),
        "is_active": True,
    }), 200


# ... keep your existing imports and routes above ...

@products_bp.post("/ingest/spoonacular/<int:recipe_id>")
def ingest_spoonacular(recipe_id: int):
    """
    Create (or reuse) a local Product for a Spoonacular recipe ID
    so it can be added to the cart.
    Optional JSON body: { "price": 16.00 }
    Returns: { "product_id": <local_id>, "product": {...} }
    """
    if not SPOONACULAR_KEY:
        abort(500, description="Missing SPOONACULAR_API_KEY")

    # fetch details from Spoonacular
    resp = requests.get(
        f"{BASE_URL}{recipe_id}/information",
        params={"includeNutrition": False, "apiKey": SPOONACULAR_KEY},
        timeout=10,
    )
    if resp.status_code != 200:
        abort(502, description="Dessert not found")

    data = resp.json()
    name = (data.get("title") or f"Spoonacular #{recipe_id}").strip()
    image_url = data.get("image")

    # allow client to override price, otherwise use default mapping
    body = request.get_json(silent=True) or {}
    price = body.get("price")
    if not isinstance(price, (int, float)):
        price = float(SPOONACULAR_PRICES.get(recipe_id, SPOONACULAR_PRICES["default"]))

    # very light allergen mapping
    allergens = []
    if data.get("glutenFree") is False:
        allergens.append("contains-gluten")
    if data.get("dairyFree") is False:
        allergens.append("contains-dairy")

    # reuse existing local product if we’ve already ingested the same recipe
    existing = Product.query.filter_by(name=name, image_url=image_url).first()
    if existing:
        return jsonify({"product_id": existing.id, "product": existing.to_dict()}), 200

    # otherwise create a new local Product
    p = Product(
        name=name,
        description=data.get("summary") or data.get("title"),
        price=price,
        image_url=image_url,
        allergens_csv=",".join(allergens),
        is_active=True,
    )
    db.session.add(p)
    db.session.commit()

    return jsonify({"product_id": p.id, "product": p.to_dict()}), 201

