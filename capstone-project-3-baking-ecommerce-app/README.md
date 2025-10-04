Nathan’s Good Eats App

Nathan’s Good Eats is a dessert-ordering web application designed for both customers and bakery staff.
Customers can browse available desserts, add them to a cart, schedule a pickup or delivery time, and place an order.
Bakery staff can manage products, view all orders, and keep daily production organized.


Features
    Customer signup/login with JWT authentication
    Browse desserts with images and allergen info
    Add desserts to cart and adjust quantities
    Place orders with pickup or delivery option (one order per day)
    “My Orders” page for customers to review past orders
    Admin dashboard to view all orders and order details
    Simple mobile-friendly Material-UI interface
    Flask backend with REST API and Postgres/SQLite database


Technologies Used
    Frontend: React (Vite), Material-UI
    Backend: Python, Flask, Flask-JWT-Extended, SQLAlchemy, Flask-Migrate
    Database: SQLite (local) / Postgres (for deployment)

    Other Tools: Axios, Alembic, Git LFS (for images)


Getting Started
    1. Clone the repository
        git clone <repo-url>
        cd capstone-project-3-baking-ecommerce-app

    2. Backend setup
        cd server
        pipenv install
        pipenv shell
        flask db upgrade
        python -m server.seed
        flask --app server.app run

    3. Frontend setup
        cd ../
        npm install
        npm run dev


The app runs at http://localhost:5173 and communicates with the backend at http://127.0.0.1:5000.


Core Functionality

    Customers: Sign up, log in, browse desserts, manage cart, place orders.

    Admin: Log in, view all orders with customer info, manage inventory and fulfillment.

    Order Flow: Cart → Checkout → Order Confirmation → My Orders / Admin Orders.


Deployment

    For production, you can deploy:

    Backend: Render or another Flask-friendly host (set FLASK_ENV=production, configure database URL, and CORS).

    Frontend: Deploy the React build folder on Netlify, Vercel, or as static files served by Flask.
