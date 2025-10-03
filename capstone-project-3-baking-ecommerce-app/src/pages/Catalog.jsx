import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

const FALLBACK_IMG = "/placeholder-dessert.jpg";

export default function Catalog() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/products/") // ✅ load local products only
      .then((res) => setItems(res.data))
      .catch(() => setItems([]));
  }, []);

  async function addToCart(productId) {
    try {
      await api.post("/cart/items", { product_id: productId, qty: 1 });
      alert("Added to cart!");
    } catch (err) {
      console.error("Add to cart failed:", err);
      alert(err?.response?.data?.error || err?.response?.data?.msg || "Add to cart failed");
    }
  }

  return (
    <Container sx={{ py: 3 }}>
      <Grid container spacing={2}>
        {items.map((p) => (
          <Grid key={p.id} xs={12} sm={6} md={4}>
            <Card>
              <img
                src={p.image_url || FALLBACK_IMG}
                alt={p.name}
                onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
              />
              <CardContent>
                <Typography variant="subtitle1">{p.name}</Typography>
                <Typography variant="body2">${Number(p.price ?? 0).toFixed(2)}</Typography>
                <Stack direction="row" sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={!token}
                    onClick={() => addToCart(p.id)}
                  >
                    Add to Cart
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
