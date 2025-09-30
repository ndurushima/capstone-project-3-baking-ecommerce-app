import os
from dotenv import load_dotenv
from .app import create_app
from .models import db, Product

load_dotenv()                     
app = create_app()

# some sample desserts
SEED_PRODUCTS = [
    {
        "name": "Classic Carrot Cake",
        "description": "Moist carrot cake with cream cheese frosting",
        "price": 24.00,
        "image_url": "https://via.placeholder.com/300x200?text=Carrot+Cake",
        "allergens_csv": "gluten,dairy,nuts",
    },
    {
        "name": "Chocolate Brownie Box",
        "description": "12 decadent chocolate brownies",
        "price": 18.00,
        "image_url": "https://via.placeholder.com/300x200?text=Brownies",
        "allergens_csv": "gluten,dairy,eggs",
    },
    {
        "name": "Macaron Assortment",
        "description": "12 assorted French macarons",
        "price": 22.00,
        "image_url": "https://via.placeholder.com/300x200?text=Macarons",
        "allergens_csv": "nuts,eggs,dairy",
    },
]

def seed():
    with app.app_context():
        db.drop_all()              
        db.create_all()

        for prod in SEED_PRODUCTS:
            p = Product(
                name=prod["name"],
                description=prod["description"],
                price=prod["price"],
                image_url=prod["image_url"],
                allergens_csv=prod["allergens_csv"],
            )
            db.session.add(p)

        db.session.commit()
        print(f"Seeded {len(SEED_PRODUCTS)} products.")

if __name__ == "__main__":
    seed()
