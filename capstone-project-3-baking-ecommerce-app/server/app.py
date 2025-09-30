from flask import Flask
from flask_migrate import Migrate
from flask_cors import CORS
from .models import db
from .config import Config
from .auth import auth_bp, jwt  
from .products import products_bp
from .cart import cart_bp
from .checkout import checkout_bp
from .orders import orders_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    Migrate(app, db)
    CORS(app, supports_credentials=True)

    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(products_bp, url_prefix="/products")
    app.register_blueprint(cart_bp, url_prefix="/cart")
    app.register_blueprint(checkout_bp, url_prefix="/checkout")
    app.register_blueprint(orders_bp, url_prefix="/orders")

    @app.get("/health")
    def health():
        return {"ok": True}

    return app

app = create_app()
