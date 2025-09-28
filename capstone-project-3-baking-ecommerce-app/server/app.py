from flask import Flask
from flask_migrate import Migrate
from .models import db

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:///app.db"  # Postgres URI later... maybe
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    Migrate(app, db)

    @app.get("/health")
    def health():
        return {"ok": True}

    return app

app = create_app()
