import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";

const FALLBACK_IMG = "/placeholder-dessert.jpg";

export default function Cart() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function loadCart() {
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/cart/");
      setCart(data);
    } catch (e) {
      setErr(e.response?.data?.error || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, [token]);

  const subtotal = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, it) => sum + (it.line_total || 0), 0);
  }, [cart]);

  async function updateQty(product_id, qty) {
    try {
      const { data } = await api.post("/cart/items", { product_id, qty });
      setCart(data);
    } catch (e) {
      setErr(e.response?.data?.error || "Could not update item");
    }
  }

  async function removeItem(product_id) {
    try {
      const { data } = await api.delete(`/cart/items/${product_id}`);
      setCart(data);
    } catch (e) {
      setErr(e.response?.data?.error || "Could not remove item");
    }
  }

  function onQtyChange(product_id, value) {
    const n = Number(value);
    if (Number.isNaN(n)) return;
    updateQty(product_id, Math.max(0, Math.min(999, n)));
  }

  if (!token) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">Please log in to view your cart.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Your Cart</Typography>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {loading && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      )}

      {!loading && (!cart || cart.items.length === 0) && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1">Your cart is empty.</Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate("/")}>
            Browse Desserts
          </Button>
        </Paper>
      )}

      {!loading && cart && cart.items.length > 0 && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack spacing={2} divider={<Divider flexItem />}>
              {cart.items.map((it) => (
                <Stack key={it.id} direction="row" spacing={2} alignItems="center">
                  <img
                    src={it.product?.image_url || FALLBACK_IMG}
                    alt={it.product?.name || "Dessert"}
                    onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                    style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8 }}
                  />
                  <Stack sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">
                      {it.product?.name ?? `Product #${it.product_id}`}
                    </Typography>
                    <Typography variant="body2">
                      ${Number(it.product?.price ?? 0).toFixed(2)} each
                    </Typography>
                  </Stack>

                  <TextField
                    label="Qty"
                    type="number"
                    size="small"
                    inputProps={{ min: 0, max: 999, inputMode: "numeric", pattern: "[0-9]*" }}
                    value={it.qty}
                    onChange={(e) => onQtyChange(it.product_id, e.target.value)}
                    sx={{ width: 96 }}
                  />

                  <Typography sx={{ width: 100, textAlign: "right" }}>
                    ${Number(it.line_total || 0).toFixed(2)}
                  </Typography>

                  <IconButton
                    aria-label="remove"
                    onClick={() => removeItem(it.product_id)}
                    edge="end"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1">Subtotal</Typography>
              <Typography variant="h6">${subtotal.toFixed(2)}</Typography>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }} justifyContent="flex-end">
              <Button variant="outlined" onClick={() => navigate("/")}>Continue Shopping</Button>
              <Button
                variant="contained"
                onClick={() => navigate("/checkout")}
              >
                Go to Checkout
              </Button>
            </Stack>
          </Paper>
        </>
      )}
    </Container>
  );
}
